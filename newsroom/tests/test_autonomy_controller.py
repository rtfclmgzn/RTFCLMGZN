from __future__ import annotations

import json
import tempfile
import unittest
from copy import deepcopy
from pathlib import Path
from typing import Any

from newsroom.autonomy.config import default_config_path, validate_config
from newsroom.autonomy.controller import AutonomyController
from newsroom.autonomy.discovery import Candidate
from newsroom.autonomy.dedupe import source_fingerprint
from newsroom.autonomy.repository import AutonomyRepository
from newsroom.core.service import NewsroomService
from newsroom.providers.base import ProviderResult
from newsroom.tests.helpers import make_repo


SOURCE_ONE = {
    "label": "Primary filing",
    "url": "https://company.example/reports/ai-capacity",
    "publisher": "Company Example",
    "source_class": "primary",
    "published_at": "2026-07-13T01:00:00Z",
    "supports": ["capacity investment"],
    "notes": "Official release.",
}
SOURCE_TWO = {
    "label": "Independent reporting",
    "url": "https://wire.example/technology/ai-capacity",
    "publisher": "Wire Example",
    "source_class": "credible-secondary",
    "published_at": "2026-07-13T02:00:00Z",
    "supports": ["capacity investment"],
    "notes": "Independent corroboration.",
}


def _config(mode: str = "approval_required") -> dict[str, Any]:
    config = json.loads(default_config_path().read_text("utf-8"))
    config["mode"] = mode
    config["schedule"]["enabled"] = False
    config["limits"]["minimum_cycle_spacing_minutes"] = 0
    config["publication"]["auto_publish_enabled"] = False
    config["distribution"]["dispatch_after_publish"] = False
    return validate_config(config)


class FakeVault:
    def available(self) -> dict[str, bool]:
        return {"openai_api_key": True, "gemini_api_key": False}

    def get(self, _name: str, default: str | None = None) -> str | None:
        return "fixture" if _name == "openai_api_key" else default


class FakeRouter:
    def available_providers(self) -> list[str]:
        return ["fixture"]


class FakeDiscovery:
    def __init__(self, candidate: Candidate):
        self.candidate = candidate

    def discover(self) -> tuple[list[Candidate], dict[str, Any]]:
        return [self.candidate], {
            "provider": "fixture",
            "model": "fixture-discovery",
            "input_tokens": 20,
            "output_tokens": 30,
            "search_calls": 1,
            "response_id": "fixture-discovery-response",
        }


class FakeCheckpointProvider:
    name = "fixture-agentic"

    def execute(
        self,
        *,
        checkpoint: int,
        agent_id: str,
        story: dict[str, Any],
        context: dict[str, Any],
    ) -> ProviderResult:
        del agent_id, context
        sources = [deepcopy(SOURCE_ONE), deepcopy(SOURCE_TWO)]
        claim = {
            "claim_id": "claim-1",
            "text": "The organization announced a new AI capacity investment.",
            "material": True,
            "status": "supported",
            "source_urls": [SOURCE_ONE["url"], SOURCE_TWO["url"]],
            "confidence": 0.98,
            "notes": "Supported by primary and independent sources.",
        }
        outputs: dict[int, dict[str, Any]] = {
            1: {
                "summary": "A verified signal was identified.",
                "why_now": "The announcement was published today.",
                "novelty": "New capacity timeline.",
                "public_interest": "Material infrastructure change.",
                "source_leads": sources,
                "risk_flags": [],
                "publishable": True,
            },
            2: {
                "summary": "Assigned to the Frontier desk.",
                "angle": "Separate announced investment from delivered capacity.",
                "lane": "synthesis",
                "section": "Frontier",
                "persona_id": "sage-okafor",
                "deliverables": ["verified synthesis"],
                "questions": ["What is live versus planned?"],
                "risk_level": "R1",
                "publishable": True,
            },
            3: {
                "summary": "Evidence set collected.",
                "sources": sources,
                "facts": [
                    {
                        "text": claim["text"],
                        "source_urls": claim["source_urls"],
                        "confidence": 0.98,
                        "is_primary_supported": True,
                    }
                ],
                "contradictions": [],
                "open_questions": [],
                "search_notes": ["Primary and independent sources checked."],
                "publishable": True,
            },
            4: {
                "summary": "Material claims mapped.",
                "claims": [claim],
                "contradictions": [],
                "open_questions": [],
                "coverage_score": 1.0,
                "publishable": True,
            },
            5: {
                "summary": "Structured article drafted.",
                "article": {
                    "slug": story["slug"],
                    "title": "AI capacity is becoming a delivery schedule",
                    "dek": "The new investment matters, but qualification and delivery remain the real constraint.",
                    "brief": "A governed fixture article for end-to-end testing.",
                    "persona": story["persona_id"],
                    "section": story["section"],
                    "format": story["format"],
                    "disclaimer": "none",
                    "body": [
                        {
                            "type": "p",
                            "text": "The organization announced a new AI capacity investment.",
                            "citation_urls": [SOURCE_ONE["url"], SOURCE_TWO["url"]],
                        },
                        {"type": "h2", "text": "Delivery is the constraint", "citation_urls": []},
                        {
                            "type": "p",
                            "text": "Announced capital is not the same as qualified production capacity.",
                            "citation_urls": [SOURCE_ONE["url"]],
                        },
                        {
                            "type": "p",
                            "text": "Readers should track milestones rather than headline totals.",
                            "citation_urls": [SOURCE_TWO["url"]],
                        },
                    ],
                    "apply": [
                        {
                            "label": "Track delivery milestones.",
                            "text": "Separate announcements, construction, qualification, and production.",
                        }
                    ],
                    "sources": [
                        {
                            "label": source["label"],
                            "url": source["url"],
                            "publisher": source["publisher"],
                            "source_class": source["source_class"],
                        }
                        for source in sources
                    ],
                    "links": [],
                    "corrections": [],
                },
                "publishable": True,
            },
            6: {
                "summary": "Editorial review passed.",
                "decision": "approve",
                "score": 0.97,
                "headline_accuracy_score": 0.98,
                "structure_score": 0.96,
                "originality_score": 0.95,
                "source_transparency_score": 1.0,
                "issues": [],
                "publishable": True,
            },
            7: {
                "summary": "All material claims verified.",
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
            8: {
                "summary": "Low-risk factual synthesis.",
                "decision": "approve",
                "risk_level": "R1",
                "risk_flags": [],
                "auto_publish_blockers": [],
                "required_disclosures": [],
                "publishable": True,
            },
        }
        return ProviderResult(
            content=outputs[checkpoint],
            provider="fixture",
            model=f"fixture-checkpoint-{checkpoint}",
            usage={"input_tokens": 10, "output_tokens": 20, "search_calls": 0},
            publishable=True,
        )


class FakeDistribution:
    def __init__(self, repository: AutonomyRepository):
        self.repository = repository

    def generate_bundle(self, story: dict[str, Any], article: dict[str, Any]) -> dict[str, Any]:
        del story, article
        return {
            "summary": "Distribution drafts generated.",
            "x": {"text": "Fixture post", "alt_text": "Fixture"},
            "instagram": {"caption": "Fixture caption", "alt_text": "Fixture"},
            "facebook": {"text": "Fixture post", "alt_text": "Fixture"},
            "newsletter": {
                "subject": "Fixture subject",
                "preview": "Fixture preview",
                "body": "Fixture body",
            },
            "publishable": True,
            "_provenance": {
                "provider": "fixture",
                "model": "fixture-distribution",
                "response_id": "fixture-distribution-response",
                "usage": {"input_tokens": 5, "output_tokens": 10, "search_calls": 0},
            },
        }

    def queue_bundle(
        self,
        *,
        story_id: str,
        release_id: str | None,
        bundle: dict[str, Any],
        held: bool = True,
    ) -> list[str]:
        status = "held" if held else "queued"
        return [
            self.repository.queue_distribution(
                story_id=story_id,
                release_id=release_id,
                channel=channel,
                payload=bundle[channel],
                status=status,
            )
            for channel in ("x", "instagram", "facebook", "newsletter")
        ]

    def activate_after_publish(self, story_id: str, release_id: str) -> int:
        return self.repository.activate_distribution(story_id, release_id)

    def dispatch_ready(self, limit: int = 10) -> dict[str, Any]:
        return {"sent": 0, "manual": 0, "failed": 0, "limit": limit}


class AutonomyControllerTests(unittest.TestCase):
    def _candidate(self) -> Candidate:
        sources = (deepcopy(SOURCE_ONE), deepcopy(SOURCE_TWO))
        return Candidate(
            title="AI capacity becomes a delivery schedule",
            slug="ai-capacity-delivery-schedule",
            dek="Capital announcements are turning into execution milestones.",
            why_now="Two current sources document the new capacity plan.",
            section="Frontier",
            lane="synthesis",
            persona_id="sage-okafor",
            priority_score=0.95,
            novelty_score=0.9,
            impact_score=0.92,
            risk_level="R1",
            source_leads=sources,
            topic_tags=("infrastructure", "compute"),
            fingerprint=source_fingerprint(source["url"] for source in sources),
        )

    def _controller(self, repo: Path) -> AutonomyController:
        service = NewsroomService(repo)
        repository = AutonomyRepository(service.database)
        candidate = self._candidate()
        return AutonomyController(
            service,
            config=_config(),
            router=FakeRouter(),
            agent_provider=FakeCheckpointProvider(),
            discovery_engine=FakeDiscovery(candidate),
            distribution_engine=FakeDistribution(repository),
            vault=FakeVault(),
        )

    def test_end_to_end_cycle_reaches_owner_gate_without_publication(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            repo = make_repo(Path(temp) / "repo")
            controller = self._controller(repo)
            result = controller.run_cycle(force=True)
            self.assertEqual("succeeded", result["status"])
            self.assertEqual(1, result["selected_count"])
            self.assertEqual(0, result["published_count"])
            outcome = result["stories"][0]
            self.assertEqual("awaiting-owner-approval", outcome["outcome"])
            self.assertEqual("owner-review", outcome["policy_decision"])
            self.assertFalse(outcome["packaged"])
            self.assertFalse(outcome["published"])

            story = controller.service.get_story(outcome["story_id"])
            self.assertEqual("awaiting-approval", story["status"])
            self.assertEqual(9, story["current_checkpoint"])
            checkpoints = {int(item["checkpoint"]) for item in story["artifacts"]}
            self.assertTrue(set(range(1, 9)).issubset(checkpoints))
            self.assertIn(12, checkpoints)
            self.assertEqual(1, len(story["policy_decisions"]))
            self.assertEqual({"held": 4}, controller.repository.distribution_counts())
            self.assertEqual([], story["releases"])
            self.assertTrue(
                controller.service.database.fetch_one(
                    "SELECT story_id FROM dedupe_keys WHERE story_id=?", (story["id"],)
                )
            )

            second = controller.run_cycle(force=True)
            self.assertEqual(0, second["selected_count"])
            self.assertEqual(1, len(controller.service.list_stories()))

    def test_dry_run_does_not_consume_the_candidate_dedupe_key(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            repo = make_repo(Path(temp) / "repo")
            controller = self._controller(repo)
            preview = controller.run_cycle(force=True, dry_run=True)
            self.assertEqual(1, preview["selected_count"])
            self.assertEqual(0, len(controller.service.list_stories()))
            self.assertEqual(0, len(controller.service.database.fetch_all("SELECT * FROM dedupe_keys")))

            real = controller.run_cycle(force=True)
            self.assertEqual(1, real["selected_count"])
            self.assertEqual("awaiting-owner-approval", real["stories"][0]["outcome"])


class PublishSurfaceTests(unittest.TestCase):
    def test_porcelain_paths_extracts_and_handles_renames(self) -> None:
        from newsroom.core.service import _porcelain_paths

        text = (
            " M rtfclmgzn-todo.txt\n"
            "?? web/data/newsroom-articles.js\n"
            "R  old/name.txt -> web/index.html\n"
        )
        self.assertEqual(
            ["rtfclmgzn-todo.txt", "web/data/newsroom-articles.js", "web/index.html"],
            _porcelain_paths(text),
        )

    def test_only_publish_surface_paths_are_blocking(self) -> None:
        from newsroom.autonomy.controller import _within_publish_surface

        # Unrelated working-tree edits must never block autonomous publishing.
        self.assertFalse(_within_publish_surface("rtfclmgzn-todo.txt"))
        self.assertFalse(_within_publish_surface("docs/notes.md"))
        self.assertFalse(_within_publish_surface("newsroom/autonomy/controller.py"))
        # The deploy surface and release records are the real conflict risk.
        self.assertTrue(_within_publish_surface("web/data/newsroom-articles.js"))
        self.assertTrue(_within_publish_surface("web/index.html"))
        self.assertTrue(_within_publish_surface("docs/operations/releases/r-1.json"))

    def test_precondition_ignores_dirty_file_outside_publish_surface(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            repo = make_repo(Path(temp) / "repo")
            service = NewsroomService(repo)
            config = _config()
            config["publication"]["require_clean_git_worktree"] = True
            controller = AutonomyController(service, config=config, vault=FakeVault())
            service.repository_status = lambda: {  # type: ignore[method-assign]
                "ok": True,
                "branch": "main",
                "dirty": True,
                "dirty_paths": ["rtfclmgzn-todo.txt"],
            }
            # A stray note at the repo root must not raise.
            controller._assert_publication_preconditions()

            service.repository_status = lambda: {  # type: ignore[method-assign]
                "ok": True,
                "branch": "main",
                "dirty": True,
                "dirty_paths": ["web/data/newsroom-articles.js"],
            }
            with self.assertRaisesRegex(Exception, "publish surface"):
                controller._assert_publication_preconditions()


if __name__ == "__main__":
    unittest.main()
