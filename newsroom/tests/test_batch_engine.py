from __future__ import annotations

import json
import tempfile
import unittest
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from unittest.mock import patch

from newsroom.autonomy.config import default_config_path, validate_config
from newsroom.autonomy.controller import AutonomyController
from newsroom.autonomy.discovery import Candidate
from newsroom.autonomy.dedupe import canonical_url, source_fingerprint
from newsroom.autonomy.repository import AutonomyRepository
from newsroom.autonomy.source_cache import SourceCache, SourceDocument
from newsroom.core.service import NewsroomService
from newsroom.providers.batch_agentic import BatchAgenticProvider, BatchPlanner
from newsroom.providers.structured import StructuredResponse
from newsroom.tests.helpers import make_repo


SOURCE_A = {
    "label": "Official release",
    "url": "https://official.example/ai-release",
    "publisher": "Official Example",
    "source_class": "primary",
    "published_at": "2026-07-14T00:15:00Z",
    "supports": ["The organization announced a new AI system."],
    "notes": "Official announcement with product details and timing.",
}
SOURCE_B = {
    "label": "Independent report",
    "url": "https://wire.example/ai-release-report",
    "publisher": "Wire Example",
    "source_class": "credible-secondary",
    "published_at": "2026-07-14T00:45:00Z",
    "supports": ["Independent reporting corroborates the announcement."],
    "notes": "Independent coverage confirms the main facts.",
}


def _candidate(index: int, lane: str = "brief", score: float = 0.9) -> Candidate:
    sources = (deepcopy(SOURCE_A), deepcopy(SOURCE_B))
    title = f"AI release {index} changes the operating timeline"
    return Candidate(
        title=title,
        slug=f"ai-release-{index}-operating-timeline",
        dek="The announcement is real, but execution milestones determine its practical importance.",
        why_now="Two current sources document the development.",
        section="Frontier",
        lane=lane,
        persona_id="sage-okafor",
        priority_score=score,
        novelty_score=score,
        impact_score=score,
        risk_level="R1",
        source_leads=sources,
        topic_tags=("models", "products"),
        fingerprint=source_fingerprint(source["url"] for source in sources),
    )


def _config() -> dict[str, Any]:
    config = json.loads(default_config_path().read_text("utf-8"))
    config["mode"] = "draft_only"
    config["schedule"]["enabled"] = False
    config["limits"]["minimum_cycle_spacing_minutes"] = 0
    config["limits"]["daily_budget_usd"] = 1.0
    config["limits"]["monthly_budget_usd"] = 30.0
    config["distribution"]["dispatch_after_publish"] = False
    return validate_config(config)


class FakeVault:
    def available(self) -> dict[str, bool]:
        return {"openai_api_key": True, "gemini_api_key": False}

    def get(self, name: str, default: str | None = None) -> str | None:
        return "fixture" if name == "openai_api_key" else default


class FakeSourceCache:
    def fetch_many(self, sources):
        result = {}
        for source in sources:
            url = str(source["url"])
            key = canonical_url(url)
            result[key] = SourceDocument(
                url=url,
                canonical_url=key,
                title=str(source["label"]),
                publisher=str(source["publisher"]),
                source_class=str(source["source_class"]),
                published_at=str(source["published_at"]),
                excerpt=(str(source["notes"]) + " " + " ".join(source["supports"])) * 2,
                fetched_at="2026-07-14T01:00:00Z",
                content_sha256="a" * 64,
                fetch_status="fetched",
                cache_hit=False,
            )
        return result


class FakeFallbackSourceCache(FakeSourceCache):
    def fetch_many(self, sources):
        result = super().fetch_many(sources)
        return {
            key: SourceDocument(
                url=value.url,
                canonical_url=value.canonical_url,
                title=value.title,
                publisher=value.publisher,
                source_class=value.source_class,
                published_at=value.published_at,
                excerpt=value.excerpt,
                fetched_at=value.fetched_at,
                content_sha256=value.content_sha256,
                fetch_status="fallback",
                cache_hit=False,
                error="fixture fetch failure",
            )
            for key, value in result.items()
        }


class FakeDiscovery:
    def __init__(self, candidates: list[Candidate]):
        self.candidates = candidates

    def discover(self):
        return self.candidates, {
            "provider": "openai",
            "model": "gpt-5.6-luna",
            "input_tokens": 100,
            "output_tokens": 200,
            "search_calls": 1,
            "response_id": "discovery-1",
        }


class FakeBatchRouter:
    def __init__(self):
        self.calls: list[str] = []

    def available_providers(self) -> list[str]:
        return ["openai"]

    def generate(self, **kwargs) -> StructuredResponse:
        schema_name = str(kwargs["schema_name"])
        self.calls.append(schema_name)
        marker = "BATCH INPUT:\n" if schema_name.endswith("compose") else "REVIEW INPUT:\n"
        payload = json.loads(str(kwargs["prompt"]).split(marker, 1)[1])
        if schema_name.endswith("compose"):
            candidates = payload
            stories = [self._compose_story(row) for row in candidates]
        else:
            candidates = payload["source_material"]
            drafts = {row["candidate_key"]: row for row in payload["drafts"]}
            stories = [self._review_story(row, drafts[row["candidate_key"]]) for row in candidates]
        return StructuredResponse(
            data={"summary": "fixture batch", "stories": stories},
            provider="openai",
            model="gpt-5.6-luna" if "brief" in schema_name else "gpt-5.6-terra",
            usage={"input_tokens": 500, "output_tokens": 600, "search_calls": 0},
            citations=(),
            response_id=schema_name + "-response",
        )

    @staticmethod
    def _compose_story(candidate: dict[str, Any]) -> dict[str, Any]:
        sources = candidate["sources"]
        urls = [source["url"] for source in sources]
        claims = [
            {
                "claim_id": "claim-1",
                "text": "The organization announced a new AI system.",
                "material": True,
                "status": "supported",
                "source_urls": urls,
                "confidence": 0.98,
                "notes": "Supported by official and independent sources.",
            }
        ]
        article_sources = [{"label": source["label"], "url": source["url"]} for source in sources]
        return {
            "candidate_key": candidate["candidate_key"],
            "evidence": {
                "summary": "Two sources establish the core facts.",
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
                "search_notes": ["Shared source cache used."],
                "publishable": True,
            },
            "claim_map": {
                "summary": "One material claim mapped.",
                "claims": claims,
                "material_claim_count": 1,
                "supported_material_claim_count": 1,
                "coverage_score": 1.0,
                "contradictions": [],
                "publishable": True,
            },
            "draft": {
                "summary": "Concise evidence-led brief.",
                "article": {
                    "slug": candidate["candidate_key"],
                    "title": candidate["title"],
                    "dek": candidate["dek"],
                    "persona": candidate["persona_id"],
                    "section": candidate["section"],
                    "format": candidate["lane"],
                    "disclaimer": "none",
                    "body": [
                        {"type": "p", "text": "The organization announced a new AI system.", "citation_urls": urls},
                        {"type": "h2", "text": "What changed", "citation_urls": []},
                        {"type": "p", "text": "The official release provides the timing and product details.", "citation_urls": [urls[0]]},
                        {"type": "p", "text": "Independent reporting corroborates the central announcement.", "citation_urls": [urls[1]]},
                    ],
                    "apply": [{"label": "Watch execution", "text": "Track delivery milestones rather than the announcement alone."}],
                    "links": [],
                    "sources": article_sources,
                },
                "publishable": True,
            },
        }

    @staticmethod
    def _review_story(candidate: dict[str, Any], composed: dict[str, Any]) -> dict[str, Any]:
        claim = composed["claim_map"]["claims"][0]
        return {
            "candidate_key": candidate["candidate_key"],
            "editorial_review": {
                "summary": "The brief is accurate and structured clearly.",
                "decision": "approve",
                "score": 0.97,
                "headline_accuracy_score": 0.98,
                "structure_score": 0.96,
                "originality_score": 0.94,
                "source_transparency_score": 1.0,
                "issues": [],
                "publishable": True,
            },
            "verification": {
                "summary": "All material claims are supported.",
                "decision": "approve",
                "verification_score": 0.98,
                "claims": [claim],
                "unsupported_material_claims": [],
                "contradictions": [],
                "source_count": 2,
                "independent_source_count": 2,
                "primary_source_count": 1,
                "publishable": True,
            },
            "compliance": {
                "summary": "Routine low-risk product reporting.",
                "decision": "approve",
                "risk_level": "R1",
                "risk_flags": [],
                "privacy_flags": [],
                "legal_flags": [],
                "financial_flags": [],
                "health_flags": [],
                "auto_publish_blockers": [],
                "required_disclaimer": "none",
                "publishable": True,
            },
        }


class BatchPlannerTests(unittest.TestCase):
    def test_selects_brief_dominant_mix_and_respects_budget(self) -> None:
        planner = BatchPlanner(_config())
        candidates = [
            _candidate(1, "brief", 0.95),
            _candidate(2, "brief", 0.94),
            _candidate(3, "synthesis", 0.93),
            _candidate(4, "research", 0.92),
        ]
        plan = planner.select(
            candidates,
            3,
            daily_counts={"brief": 0, "synthesis": 0, "research": 0},
            weekly_research_count=2,
            remaining_daily_budget=1.0,
            now=datetime(2026, 7, 15, tzinfo=timezone.utc),
        )
        self.assertEqual(3, len(plan.selected))
        self.assertEqual({"brief": 2, "synthesis": 1, "research": 0}, plan.lane_counts)
        self.assertLess(plan.estimated_cost_usd, 0.2)

    def test_returns_zero_when_budget_is_reserved(self) -> None:
        planner = BatchPlanner(_config())
        plan = planner.select(
            [_candidate(1)],
            3,
            remaining_daily_budget=0.05,
            now=datetime(2026, 7, 15, tzinfo=timezone.utc),
        )
        self.assertEqual(0, len(plan.selected))


class SourceCacheTests(unittest.TestCase):
    def test_private_url_fails_closed_to_metadata_fallback(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            cache = SourceCache(Path(temp), _config())
            raw = {
                "label": "unsafe",
                "url": "http://127.0.0.1/private",
                "publisher": "none",
                "source_class": "other",
                "published_at": "2026-07-14T00:00:00Z",
                "supports": ["nothing"],
                "notes": "Rejected local target.",
            }
            # Private and localhost-style URLs are dropped before any network request.
            self.assertEqual({}, cache.fetch_many([raw]))


class BatchControllerTests(unittest.TestCase):
    def test_three_stories_use_shared_calls_and_reach_owner_gate(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            repo = make_repo(Path(temp) / "repo")
            config = _config()
            router = FakeBatchRouter()
            service = NewsroomService(repo)
            provider = BatchAgenticProvider(
                repo,
                service.registry,
                config,
                router,
                source_cache=FakeSourceCache(),
            )
            candidates = [
                _candidate(1, "brief", 0.95),
                _candidate(2, "brief", 0.94),
                _candidate(3, "synthesis", 0.93),
            ]
            controller = AutonomyController(
                service,
                config=config,
                router=router,
                agent_provider=provider,
                discovery_engine=FakeDiscovery(candidates),
                vault=FakeVault(),
            )
            result = controller.run_cycle(force=True)
            self.assertEqual("succeeded", result["status"])
            self.assertEqual(3, result["selected_count"])
            self.assertEqual(0, result["published_count"])
            self.assertEqual(4, len(router.calls))  # compose + review for two lane groups
            self.assertEqual(3, len(controller.service.list_stories()))
            self.assertTrue(all(item["outcome"] == "awaiting-owner-approval" for item in result["stories"]))
            # Discovery + four actual shared model calls + deterministic distribution calls.
            calls = controller.service.database.fetch_all(
                "SELECT provider, model FROM provider_calls ORDER BY started_at"
            )
            self.assertLessEqual(len(calls), 8)
            self.assertFalse(any(row["provider"] == "batch-cache" for row in calls))
            for story in controller.service.list_stories():
                full = controller.service.get_story(story["id"])
                checkpoints = {int(item["checkpoint"]) for item in full["artifacts"]}
                self.assertTrue(set(range(1, 9)).issubset(checkpoints))
                self.assertIn(12, checkpoints)


    def test_unfetched_sources_block_release_without_stopping_draft_creation(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            repo = make_repo(Path(temp) / "repo")
            config = _config()
            router = FakeBatchRouter()
            service = NewsroomService(repo)
            provider = BatchAgenticProvider(
                repo,
                service.registry,
                config,
                router,
                source_cache=FakeFallbackSourceCache(),
            )
            controller = AutonomyController(
                service,
                config=config,
                router=router,
                agent_provider=provider,
                discovery_engine=FakeDiscovery([_candidate(11)]),
                vault=FakeVault(),
            )
            result = controller.run_cycle(force=True)
            self.assertEqual("succeeded", result["status"])
            self.assertEqual(1, result["selected_count"])
            self.assertEqual("blocked", result["stories"][0]["outcome"])
            story = controller.service.get_story(controller.service.list_stories()[0]["id"])
            draft = next(item for item in story["artifacts"] if int(item["checkpoint"]) == 5)
            self.assertFalse(draft["content"]["publishable"])


if __name__ == "__main__":
    unittest.main()
