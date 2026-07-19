from __future__ import annotations

import copy
import json
import unittest
from datetime import datetime, timezone

from newsroom.autonomy.config import default_config_path, validate_config
from newsroom.autonomy.policy import POLICY_VERSION, PublicationPolicy


SOURCE_A = "https://example.com/official/filing"
SOURCE_B = "https://example.net/report/story"


def config_for(mode: str = "approval_required") -> dict:
    value = json.loads(default_config_path().read_text("utf-8"))
    value["mode"] = mode
    if mode == "bounded_autopublish":
        value["publication"]["auto_publish_enabled"] = True
        value["publication"]["owner_preauthorization"].update(
            {
                "enabled": True,
                "owner": "0baak",
                "acknowledged_at": datetime.now(timezone.utc).isoformat(),
                "policy_version": POLICY_VERSION,
            }
        )
    return validate_config(value)


def valid_story() -> dict:
    return {
        "id": "story-1",
        "slug": "verified-compute-story",
        "title": "A verified compute infrastructure story",
        "dek": "A carefully sourced account of a material infrastructure development.",
        "section": "Compute",
        "risk_level": "R1",
        "story": {"topic_tags": ["compute", "data centers"]},
    }


def valid_artifacts() -> list[dict]:
    claim = {
        "claim_id": "claim-1",
        "text": "The company announced a new compute facility.",
        "material": True,
        "status": "supported",
        "source_urls": [SOURCE_A, SOURCE_B],
        "confidence": 0.98,
        "notes": "Matched across an official filing and independent reporting.",
    }
    return [
        {
            "checkpoint": 3,
            "content": {
                "sources": [
                    {
                        "label": "Official filing",
                        "url": SOURCE_A,
                        "publisher": "Example Corp",
                        "source_class": "primary",
                        "published_at": "2026-07-13T09:00:00Z",
                        "supports": ["claim-1"],
                        "notes": "Primary announcement",
                    },
                    {
                        "label": "Independent report",
                        "url": SOURCE_B,
                        "publisher": "Example Wire",
                        "source_class": "credible-secondary",
                        "published_at": "2026-07-13T10:00:00Z",
                        "supports": ["claim-1"],
                        "notes": "Independent corroboration",
                    },
                ],
                "publishable": True,
            },
        },
        {
            "checkpoint": 4,
            "content": {
                "claims": [copy.deepcopy(claim)],
                "contradictions": [],
                "publishable": True,
            },
        },
        {
            "checkpoint": 5,
            "content": {
                "article": {
                    "slug": "verified-compute-story",
                    "title": "A verified compute infrastructure story",
                    "dek": "A carefully sourced account of a material infrastructure development.",
                    "body": [
                        {
                            "type": "p",
                            "text": "The company announced a new compute facility.",
                            "citation_urls": [SOURCE_A, SOURCE_B],
                        }
                    ],
                    "sources": [
                        {"label": "Official filing", "url": SOURCE_A + "?utm_source=test"},
                        {"label": "Independent report", "url": SOURCE_B},
                    ],
                },
                "publishable": True,
            },
        },
        {
            "checkpoint": 6,
            "content": {
                "decision": "approve",
                "score": 0.95,
                "publishable": True,
            },
        },
        {
            "checkpoint": 7,
            "content": {
                "decision": "approve",
                "verification_score": 0.98,
                "claims": [copy.deepcopy(claim)],
                "unsupported_material_claims": [],
                "contradictions": [],
                "publishable": True,
            },
        },
        {
            "checkpoint": 8,
            "content": {
                "decision": "approve",
                "risk_level": "R1",
                "auto_publish_blockers": [],
                "publishable": True,
            },
        },
    ]


class PublicationPolicyTests(unittest.TestCase):
    def test_approval_mode_routes_clean_story_to_owner(self) -> None:
        decision = PublicationPolicy(config_for()).decide(
            story=valid_story(), artifacts=valid_artifacts(), publishes_today=0
        )
        self.assertEqual("owner-review", decision.decision)
        self.assertTrue(decision.release_ready)
        self.assertEqual(0, decision.metrics["hard_blocker_count"])
        self.assertEqual(2, decision.metrics["source_count"])
        self.assertEqual(1.0, decision.metrics["deterministic_claim_coverage"])

    def test_bounded_mode_auto_publishes_only_clean_preauthorized_r1_story(self) -> None:
        decision = PublicationPolicy(config_for("bounded_autopublish")).decide(
            story=valid_story(),
            artifacts=valid_artifacts(),
            publishes_today=0,
            owner_approved_release_count=1,
        )
        self.assertEqual("auto-publish", decision.decision)
        self.assertTrue(decision.auto_publish)

    def test_nested_topic_tag_can_force_owner_review(self) -> None:
        story = valid_story()
        story["story"]["topic_tags"] = ["investment advice"]
        decision = PublicationPolicy(config_for("bounded_autopublish")).decide(
            story=story, artifacts=valid_artifacts(), publishes_today=0
        )
        self.assertEqual("owner-review", decision.decision)
        self.assertIn("topic-requires-owner-review", decision.reason_codes)

    def test_valid_preauthorization_waives_first_release_acceptance_history(self) -> None:
        # A standing owner_preauthorization exists precisely to cover judgment-call
        # workflow gates like "no acceptance history yet" without a live human
        # click -- that's what "preauthorized" means. The reason code still rides
        # along in reason_codes for the audit trail even though it no longer blocks.
        decision = PublicationPolicy(config_for("bounded_autopublish")).decide(
            story=valid_story(),
            artifacts=valid_artifacts(),
            publishes_today=0,
            owner_approved_release_count=0,
        )
        self.assertEqual("auto-publish", decision.decision)
        self.assertIn(
            "autopublish-acceptance-history-insufficient", decision.reason_codes
        )

    def test_expired_preauthorization_routes_to_owner_review(self) -> None:
        config = config_for("bounded_autopublish")
        config["publication"]["owner_preauthorization"]["acknowledged_at"] = (
            "2020-01-01T00:00:00Z"
        )
        decision = PublicationPolicy(config).decide(
            story=valid_story(),
            artifacts=valid_artifacts(),
            publishes_today=0,
            owner_approved_release_count=1,
        )
        self.assertEqual("owner-review", decision.decision)
        self.assertIn(
            "owner-preauthorization-expired-or-invalid", decision.reason_codes
        )

    def test_unverified_url_and_unsupported_claim_fail_closed(self) -> None:
        artifacts = valid_artifacts()
        artifacts[2]["content"]["article"]["sources"].append(
            {"label": "Unknown", "url": "https://unknown.invalid/story"}
        )
        artifacts[4]["content"]["claims"][0]["status"] = "uncertain"
        decision = PublicationPolicy(config_for("bounded_autopublish")).decide(
            story=valid_story(), artifacts=artifacts, publishes_today=0
        )
        self.assertEqual("blocked", decision.decision)
        self.assertIn("draft-contains-unverified-urls", decision.reason_codes)
        self.assertIn("unsupported-material-claims", decision.reason_codes)

    def test_missing_source_date_and_empty_claim_map_are_blockers(self) -> None:
        artifacts = valid_artifacts()
        artifacts[0]["content"]["sources"][1]["published_at"] = "unknown"
        artifacts[1]["content"]["claims"] = []
        artifacts[4]["content"]["claims"] = []
        decision = PublicationPolicy(config_for()).decide(
            story=valid_story(), artifacts=artifacts, publishes_today=0
        )
        self.assertEqual("blocked", decision.decision)
        self.assertIn("source-publication-date-missing", decision.reason_codes)
        self.assertIn("material-claim-map-empty", decision.reason_codes)


class ArticleScoreGateTests(unittest.TestCase):
    """The Article Score gate is a staged-rollout flag: measured always, enforced on demand."""

    def test_score_is_always_reported_even_when_gate_is_off(self) -> None:
        decision = PublicationPolicy(config_for()).decide(
            story=valid_story(), artifacts=valid_artifacts(), publishes_today=0
        )
        self.assertIn("article_score", decision.metrics)
        self.assertIsInstance(decision.metrics["article_score"], float)
        self.assertIn("article_score_band", decision.metrics)
        # observe mode must not add a blocker
        self.assertNotIn("article-score-below-threshold", decision.reason_codes)

    def test_enabling_the_gate_blocks_a_thin_article(self) -> None:
        config = config_for()
        config["publication"]["article_score_gate_enabled"] = True
        decision = PublicationPolicy(config).decide(
            story=valid_story(), artifacts=valid_artifacts(), publishes_today=0
        )
        # the minimal fixture is deliberately thin: no tldr, no takeaway, short body
        self.assertLess(decision.metrics["article_score"], 8.00)
        self.assertEqual("blocked", decision.decision)
        self.assertIn("article-score-below-threshold", decision.reason_codes)


if __name__ == "__main__":
    unittest.main()
