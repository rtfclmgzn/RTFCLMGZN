from __future__ import annotations

import json
import tempfile
import unittest
from copy import deepcopy
from dataclasses import replace
from pathlib import Path
from typing import Any
from types import SimpleNamespace

from newsroom.autonomy.config import default_config_path, validate_config
from newsroom.autonomy.controller import AutonomyController
from newsroom.autonomy.discovery import DiscoveryEngine
from newsroom.autonomy.policy import PublicationPolicy
from newsroom.autonomy.review_gate import (
    classify_compliance_blockers,
    normalize_review_bundle,
)
from newsroom.core.service import NewsroomService
from newsroom.providers.batch_agentic import BatchAgenticProvider, BatchPlanner
from newsroom.providers.structured import StructuredResponse
from newsroom.tests.helpers import make_repo
from newsroom.tests.test_batch_engine import (
    FakeDiscovery,
    FakeSourceCache,
    FakeVault,
    SOURCE_A,
    SOURCE_B,
    _candidate,
    _config,
)
from newsroom.tests.test_policy import valid_artifacts, valid_story


class RepairingRouter:
    def __init__(self) -> None:
        self.calls: list[str] = []

    def available_providers(self) -> list[str]:
        return ["openai"]

    def generate(self, **kwargs: Any) -> StructuredResponse:
        schema_name = str(kwargs["schema_name"])
        self.calls.append(schema_name)
        prompt = str(kwargs["prompt"])
        if schema_name.endswith("compose"):
            payload = json.loads(prompt.split("BATCH INPUT:\n", 1)[1])
            stories = [self._compose(row) for row in payload]
        elif schema_name.endswith("review"):
            payload = json.loads(prompt.split("REVIEW INPUT:\n", 1)[1])
            stories = [self._failing_review(row) for row in payload["source_material"]]
        elif schema_name.endswith("repair"):
            payload = json.loads(prompt.split("REPAIR INPUT:\n", 1)[1])
            by_key = {row["candidate_key"]: row for row in payload["stories"]}
            stories = [self._repaired(row, by_key[row["candidate_key"]]) for row in payload["source_material"]]
        else:
            raise AssertionError(schema_name)
        return StructuredResponse(
            data={"summary": "fixture", "stories": stories},
            provider="openai",
            model="gpt-5.6-terra" if schema_name.endswith("repair") else "gpt-5.6-luna",
            usage={"input_tokens": 400, "output_tokens": 500, "search_calls": 0},
            citations=(),
            response_id=schema_name + "-response",
        )

    @staticmethod
    def _compose(candidate: dict[str, Any]) -> dict[str, Any]:
        sources = candidate["sources"]
        urls = [source["url"] for source in sources]
        claim = {
            "claim_id": "claim-1",
            "text": "The organization announced a new AI system with a guaranteed launch date.",
            "material": True,
            "status": "supported",
            "source_urls": urls,
            "confidence": 0.95,
            "notes": "The guarantee wording is too strong and needs repair.",
        }
        return {
            "candidate_key": candidate["candidate_key"],
            "evidence": {
                "summary": "Two sources establish an announcement.",
                "sources": [
                    {
                        "label": source["label"],
                        "url": source["url"],
                        "publisher": source["publisher"],
                        "source_class": source["source_class"],
                        "published_at": source["published_at"],
                        "supports": source["supports"],
                        "notes": source["notes"],
                    }
                    for source in sources
                ],
                "facts": [
                    {
                        "text": "The organization announced a new AI system.",
                        "source_urls": urls,
                        "confidence": 0.98,
                        "is_primary_supported": True,
                    }
                ],
                "contradictions": [],
                "open_questions": [],
                "search_notes": [],
                "publishable": True,
            },
            "claim_map": {
                "summary": "One claim needs wording repair.",
                "claims": [claim],
                "material_claim_count": 1,
                "supported_material_claim_count": 1,
                "coverage_score": 1.0,
                "contradictions": [],
                "publishable": True,
            },
            "draft": {
                "summary": "Draft with overstrong language.",
                "article": {
                    "slug": candidate["candidate_key"],
                    "title": candidate["title"],
                    "dek": candidate["dek"],
                    "persona": candidate["persona_id"],
                    "section": candidate["section"],
                    "format": candidate["lane"],
                    "disclaimer": "none",
                    "body": [
                        {"type": "p", "text": claim["text"], "citation_urls": urls},
                        {"type": "h2", "text": "What changed", "citation_urls": []},
                        {"type": "p", "text": "The official source confirms the announcement.", "citation_urls": [urls[0]]},
                        {"type": "p", "text": "Independent reporting confirms the central facts.", "citation_urls": [urls[1]]},
                    ],
                    "apply": [{"label": "Watch delivery", "text": "Track the announced milestones."}],
                    "links": [],
                    "sources": [{"label": s["label"], "url": s["url"]} for s in sources],
                },
                "publishable": True,
            },
        }

    @staticmethod
    def _failing_review(candidate: dict[str, Any]) -> dict[str, Any]:
        urls = [source["url"] for source in candidate["sources"]]
        claim = {
            "claim_id": "claim-1",
            "text": "The organization announced a new AI system with a guaranteed launch date.",
            "material": True,
            "status": "partially-supported",
            "source_urls": urls,
            "confidence": 0.82,
            "notes": "Announcement is supported; guarantee is not.",
        }
        return {
            "candidate_key": candidate["candidate_key"],
            "editorial_review": {
                "summary": "The headline and lead overstate the evidence.",
                "decision": "revise",
                "score": 0.78,
                "headline_accuracy_score": 0.7,
                "structure_score": 0.94,
                "originality_score": 0.9,
                "source_transparency_score": 0.95,
                "issues": [{"severity": "major", "message": "Remove guarantee language.", "suggested_fix": "Use announced instead."}],
                "publishable": False,
            },
            "verification": {
                "summary": "One material phrase is only partially supported.",
                "decision": "revise",
                "verification_score": 0.82,
                "claims": [claim],
                "unsupported_material_claims": [claim["text"]],
                "contradictions": [],
                "source_count": 2,
                "independent_source_count": 2,
                "primary_source_count": 1,
                "publishable": False,
            },
            "compliance": {
                "summary": "Safe after factual repair.",
                "decision": "revise",
                "risk_level": "R1",
                "risk_flags": [],
                "privacy_flags": [],
                "legal_flags": [],
                "financial_flags": [],
                "health_flags": [],
                "auto_publish_blockers": ["owner-review-required-during-acceptance"],
                "required_disclaimer": "none",
                "publishable": False,
            },
        }

    @staticmethod
    def _repaired(candidate: dict[str, Any], prior: dict[str, Any]) -> dict[str, Any]:
        del prior
        sources = candidate["sources"]
        urls = [source["url"] for source in sources]
        claim = {
            "claim_id": "claim-1",
            "text": "The organization announced a new AI system.",
            "material": True,
            "status": "supported",
            "source_urls": urls,
            "confidence": 0.98,
            "notes": "Supported by official and independent sources.",
        }
        draft = RepairingRouter._compose(candidate)["draft"]
        draft["summary"] = "Evidence-aligned repaired brief."
        draft["article"]["body"][0]["text"] = claim["text"]
        return {
            "candidate_key": candidate["candidate_key"],
            "claim_map": {
                "summary": "Repaired claim map.",
                "claims": [claim],
                "material_claim_count": 1,
                "supported_material_claim_count": 1,
                "coverage_score": 1.0,
                "contradictions": [],
                "publishable": True,
            },
            "draft": draft,
            "editorial_review": {
                "summary": "The revised brief is accurate and clear.",
                "decision": "approve",
                "score": 0.96,
                "headline_accuracy_score": 0.97,
                "structure_score": 0.95,
                "originality_score": 0.92,
                "source_transparency_score": 1.0,
                "issues": [],
                "publishable": True,
            },
            "verification": {
                "summary": "All material claims are supported.",
                "decision": "approve",
                "verification_score": 0.98,
                "claims": [claim],
                "unsupported_material_claims": ["stale prior-version warning"],
                "contradictions": [],
                "source_count": 2,
                "independent_source_count": 2,
                "primary_source_count": 1,
                "publishable": True,
            },
            "compliance": {
                "summary": "Safe content; acceptance still requires owner review.",
                "decision": "revise",
                "risk_level": "R1",
                "risk_flags": [],
                "privacy_flags": [],
                "legal_flags": [],
                "financial_flags": [],
                "health_flags": [],
                "auto_publish_blockers": ["owner-review-required-during-acceptance"],
                "required_disclaimer": "none",
                "publishable": True,
            },
        }


class ReviewGateRepairTests(unittest.TestCase):
    def test_owner_review_compliance_blocker_is_not_a_hard_blocker(self) -> None:
        artifacts = valid_artifacts()
        artifacts[-1]["content"]["auto_publish_blockers"] = [
            "section-requires-owner-review"
        ]
        decision = PublicationPolicy(_approval_config()).decide(
            story=valid_story(), artifacts=artifacts, publishes_today=0
        )
        self.assertEqual("owner-review", decision.decision)
        self.assertTrue(decision.release_ready)
        self.assertEqual(0, decision.metrics["compliance_hard_blocker_count"])
        self.assertEqual(1, decision.metrics["compliance_owner_review_blocker_count"])

    def test_stale_free_text_unsupported_note_does_not_override_supported_rows(self) -> None:
        artifacts = valid_artifacts()
        artifacts[4]["content"]["unsupported_material_claims"] = [
            "A warning from an earlier draft version"
        ]
        decision = PublicationPolicy(_approval_config()).decide(
            story=valid_story(), artifacts=artifacts, publishes_today=0
        )
        self.assertEqual("owner-review", decision.decision)
        self.assertNotIn("unsupported-material-claims", decision.reason_codes)

    def test_review_normalization_separates_owner_review_from_safety(self) -> None:
        compose = {
            "claim_map": {"claims": [{
                "claim_id": "claim-1",
                "text": "Supported fact",
                "material": True,
                "status": "supported",
                "source_urls": [SOURCE_A, SOURCE_B],
                "confidence": 0.98,
                "notes": "",
            }]},
            "draft": {"publishable": True},
        }
        review = {
            "editorial_review": {
                "decision": "approve", "score": 0.95, "headline_accuracy_score": 0.95,
                "structure_score": 0.95, "originality_score": 0.95,
                "source_transparency_score": 0.95, "issues": [], "publishable": True,
            },
            "verification": {
                "decision": "approve", "verification_score": 0.98,
                "claims": deepcopy(compose["claim_map"]["claims"]),
                "unsupported_material_claims": ["stale note"], "contradictions": [],
                "publishable": True,
            },
            "compliance": {
                "decision": "revise", "risk_level": "R2", "auto_publish_blockers": [
                    "risk-level-requires-owner-review"
                ], "publishable": True,
            },
        }
        candidate = SimpleNamespace(
            slug="test-story",
            risk_level="R2",
            source_leads=(
                {"url": SOURCE_A},
                {"url": SOURCE_B},
            ),
        )
        normalized = normalize_review_bundle(
            candidate=candidate,
            compose_row=compose,
            review_row=review,
            config=_approval_config(),
        )
        self.assertEqual("approve", normalized["compliance"]["decision"])
        self.assertEqual([], normalized["verification"]["unsupported_material_claims"])

    def test_failed_review_triggers_one_shared_repair_and_reaches_owner_gate(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            repo = make_repo(Path(temp) / "repo")
            config = _config()
            router = RepairingRouter()
            service = NewsroomService(repo)
            provider = BatchAgenticProvider(
                repo, service.registry, config, router, source_cache=FakeSourceCache()
            )
            controller = AutonomyController(
                service,
                config=config,
                router=router,
                agent_provider=provider,
                discovery_engine=FakeDiscovery([_candidate(1)]),
                vault=FakeVault(),
            )
            result = controller.run_cycle(force=True)
            self.assertEqual("succeeded", result["status"])
            self.assertEqual("awaiting-owner-approval", result["stories"][0]["outcome"])
            self.assertEqual(
                ["batch_brief_compose", "batch_brief_review", "batch_brief_repair"],
                router.calls,
            )
            story = service.get_story(service.list_stories()[0]["id"])
            final_draft = next(
                item for item in story["artifacts"] if int(item["checkpoint"]) == 5
            )
            self.assertNotIn(
                "guaranteed launch date",
                json.dumps(final_draft["content"], ensure_ascii=False),
            )

    def test_discovery_uses_canonical_persona_for_section(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            repo = make_repo(Path(temp) / "repo")
            service = NewsroomService(repo)
            config = _config()

            class WrongPersonaRouter:
                def generate(self, **_kwargs: Any) -> StructuredResponse:
                    return StructuredResponse(
                        data={
                            "summary": "one candidate",
                            "candidates": [{
                                "title": "New data center investment expands AI compute capacity",
                                "dek": "A large investment adds capacity and changes the infrastructure outlook.",
                                "why_now": "The investment was announced today.",
                                "section": "Compute",
                                "lane": "brief",
                                "persona_id": "sage-okafor",
                                "priority_score": 0.9,
                                "novelty_score": 0.9,
                                "impact_score": 0.9,
                                "risk_level": "R1",
                                "source_leads": [deepcopy(SOURCE_A), deepcopy(SOURCE_B)],
                                "topic_tags": ["compute", "data centers"],
                            }],
                        },
                        provider="openai",
                        model="gpt-5.6-luna",
                        usage={"input_tokens": 10, "output_tokens": 10, "search_calls": 1},
                        citations=(),
                        response_id="discovery",
                    )

            candidates, _usage = DiscoveryEngine(
                repo, config, service.registry, WrongPersonaRouter()
            ).discover()
            self.assertEqual(1, len(candidates))
            self.assertEqual("jin-park", candidates[0].persona_id)

    def test_planner_prefers_routine_r1_story_over_policy_hold(self) -> None:
        config = _config()
        policy_story = replace(
            _candidate(1, score=0.99),
            section="Policy",
            persona_id="evelyn-zhao",
            risk_level="R2",
        )
        routine_story = replace(
            _candidate(2, score=0.82),
            section="Compute",
            persona_id="jin-park",
            risk_level="R1",
        )
        plan = BatchPlanner(config).select(
            [policy_story, routine_story],
            1,
            remaining_daily_budget=1.0,
        )
        self.assertEqual(1, len(plan.selected))
        self.assertEqual(routine_story.slug, plan.selected[0].slug)

    def test_blocker_classifier_fails_closed_on_unknown_values(self) -> None:
        hard, owner = classify_compliance_blockers(
            ["owner-review-required", "unrecognized-external-risk"]
        )
        self.assertEqual(["unrecognized-external-risk"], hard)
        self.assertEqual(["owner-review-required"], owner)


def _approval_config() -> dict[str, Any]:
    config = json.loads(default_config_path().read_text("utf-8"))
    config["mode"] = "approval_required"
    return validate_config(config)


if __name__ == "__main__":
    unittest.main()
