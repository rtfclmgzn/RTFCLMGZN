from __future__ import annotations

import copy
import unittest

from newsroom.quality.article_score import (
    EMERGENCY_FLOOR,
    PUBLISH_THRESHOLD,
    WEIGHTS,
    score_article,
    xp_multiplier,
)

SRC_A = "https://example.com/official/filing"
SRC_B = "https://wire.example.net/report/story"


def story(section: str = "Compute", lane: str = "synthesis") -> dict:
    return {"id": "s1", "section": section, "lane": lane, "persona_id": "jin-park"}


def artifacts(over: dict | None = None) -> list[dict]:
    claim = {
        "claim_id": "c1",
        "text": "The company opened a new compute facility.",
        "material": True,
        "status": "supported",
        "source_urls": [SRC_A, SRC_B],
        "confidence": 0.97,
    }
    body = [
        {"type": "p", "text": "The company confirmed a new compute facility. " * 30, "citation_urls": [SRC_A]},
        {"type": "h2", "text": "What the filing shows", "citation_urls": []},
        {"type": "p", "text": "Independent reporting corroborates the capacity figure. " * 30, "citation_urls": [SRC_B]},
        {"type": "h2", "text": "What is not established", "citation_urls": []},
        {"type": "p", "text": "The timeline is not confirmed against the registry. " * 30, "citation_urls": [SRC_A]},
    ]
    base = {
        3: {
            "sources": [
                {"label": "Filing", "url": SRC_A, "publisher": "Example Corp", "source_class": "primary", "published_at": "2026-07-13T09:00:00Z"},
                {"label": "Wire", "url": SRC_B, "publisher": "Example Wire", "source_class": "credible-secondary", "published_at": "2026-07-13T10:00:00Z"},
            ]
        },
        4: {"claims": [copy.deepcopy(claim)], "contradictions": []},
        5: {
            "article": {
                "slug": "compute-facility",
                "title": "The company just opened a compute facility it cannot yet power",
                "dek": "A primary filing confirms the build, while the grid connection remains unresolved.",
                "body": body,
                "sources": [{"label": "Filing", "url": SRC_A}, {"label": "Wire", "url": SRC_B}],
                "tldr": [
                    "The company confirmed a new compute facility in a primary filing.",
                    "Independent reporting corroborates the stated capacity figure.",
                    "Grid interconnection is the binding constraint on the timeline.",
                    "Caveat: the completion date is not independently confirmed.",
                ],
                "disclaimer": "none",
                "apply": [{"label": "Watch the interconnect queue.", "text": "Capacity is gated by power, not chips."}],
                "persona": "jin-park",
            }
        },
        6: {"decision": "approve", "score": 0.93},
        7: {"decision": "approve", "verification_score": 0.97, "unsupported_material_claims": [], "contradictions": []},
        8: {"decision": "approve", "risk_level": "R1", "auto_publish_blockers": []},
    }
    base.update(over or {})
    return [{"checkpoint": k, "content": v} for k, v in sorted(base.items())]


class ArticleScoreTests(unittest.TestCase):
    def test_weights_sum_to_one(self) -> None:
        self.assertAlmostEqual(1.0, sum(WEIGHTS.values()), places=6)

    def test_clean_article_publishes_above_threshold(self) -> None:
        result = score_article(story=story(), artifacts=artifacts())
        self.assertEqual((), result.hard_fails)
        self.assertGreaterEqual(result.total, PUBLISH_THRESHOLD)
        self.assertTrue(result.publishable)
        self.assertEqual(result.total, round(sum(c.score * c.weight for c in result.categories), 2))

    def test_score_is_deterministic(self) -> None:
        a = score_article(story=story(), artifacts=artifacts())
        b = score_article(story=story(), artifacts=artifacts())
        self.assertEqual(a.total, b.total)
        self.assertEqual(a.by_name, b.by_name)

    def test_unresolved_contradiction_is_a_hard_fail(self) -> None:
        result = score_article(
            story=story(),
            artifacts=artifacts({7: {
                "decision": "approve", "verification_score": 0.97,
                "unsupported_material_claims": [],
                "contradictions": [{"resolved": False, "resolution": None}],
            }}),
        )
        self.assertIn("unresolved-contradictions", result.hard_fails)
        self.assertFalse(result.publishable)
        self.assertFalse(result.emergency_eligible)

    def test_fabricated_citation_is_a_hard_fail(self) -> None:
        art = artifacts()
        draft = next(a for a in art if a["checkpoint"] == 5)
        draft["content"]["article"]["body"][0]["citation_urls"] = ["https://invented.example/not-in-dossier"]
        result = score_article(story=story(), artifacts=art)
        self.assertIn("fabricated-citations", result.hard_fails)
        self.assertFalse(result.publishable)

    def test_missing_required_health_disclaimer_hard_fails(self) -> None:
        result = score_article(story=story(section="Health"), artifacts=artifacts())
        self.assertIn("missing-required-disclaimer", result.hard_fails)
        self.assertFalse(result.publishable)

    def test_correct_health_disclaimer_passes(self) -> None:
        art = artifacts()
        next(a for a in art if a["checkpoint"] == 5)["content"]["article"]["disclaimer"] = "not-medical-advice"
        result = score_article(story=story(section="Health"), artifacts=art)
        self.assertNotIn("missing-required-disclaimer", result.hard_fails)

    def test_wrong_author_identity_hard_fails(self) -> None:
        art = artifacts()
        next(a for a in art if a["checkpoint"] == 5)["content"]["article"]["persona"] = "nova-reyes"
        result = score_article(story=story(), artifacts=art)
        self.assertIn("wrong-author-identity", result.hard_fails)

    def test_self_referential_prose_lowers_writing_score(self) -> None:
        art = artifacts()
        clean = score_article(story=story(), artifacts=art).by_name["writing"]
        body = next(a for a in art if a["checkpoint"] == 5)["content"]["article"]["body"]
        body[0]["text"] = "This is a story RTFCLMGZN covered separately. " + body[0]["text"]
        dirty = score_article(story=story(), artifacts=art).by_name["writing"]
        self.assertLess(dirty, clean)

    def test_unsupported_claims_destroy_accuracy(self) -> None:
        result = score_article(
            story=story(),
            artifacts=artifacts({7: {
                "decision": "approve", "verification_score": 0.55,
                "unsupported_material_claims": [{"claim_id": "c1"}, {"claim_id": "c2"}],
                "contradictions": [],
            }}),
        )
        self.assertIn("unsupported-material-claims", result.hard_fails)
        self.assertLess(result.by_name["accuracy"], 6.0)

    def test_single_domain_sourcing_scores_below_independent(self) -> None:
        art = artifacts()
        ev = next(a for a in art if a["checkpoint"] == 3)["content"]
        ev["sources"][1]["url"] = "https://example.com/second-piece"  # same domain as SRC_A
        weak = score_article(story=story(), artifacts=art).by_name["sources"]
        strong = score_article(story=story(), artifacts=artifacts()).by_name["sources"]
        self.assertLess(weak, strong)

    def test_source_count_alone_is_not_rewarded(self) -> None:
        art = artifacts()
        ev = next(a for a in art if a["checkpoint"] == 3)["content"]
        # Ten extra same-domain, undated, non-primary sources must not raise the score.
        for i in range(10):
            ev["sources"].append({
                "label": f"Filler {i}", "url": f"https://example.com/filler-{i}",
                "publisher": "Example Corp", "source_class": "secondary", "published_at": "unknown",
            })
        padded = score_article(story=story(), artifacts=art).by_name["sources"]
        lean = score_article(story=story(), artifacts=artifacts()).by_name["sources"]
        self.assertLessEqual(padded, lean)

    def test_missing_tldr_and_takeaway_lowers_insight(self) -> None:
        art = artifacts()
        article = next(a for a in art if a["checkpoint"] == 5)["content"]["article"]
        article.pop("tldr"); article.pop("apply")
        result = score_article(story=story(), artifacts=art)
        self.assertLess(result.by_name["insight"], 6.0)

    def test_band_names_track_thresholds(self) -> None:
        self.assertTrue(score_article(story=story(), artifacts=artifacts()).band)
        result = score_article(
            story=story(),
            artifacts=artifacts({6: {"decision": "approve", "score": 0.1}}),
        )
        self.assertIsInstance(result.band, str)

    def test_hard_fail_band_overrides_numeric_band(self) -> None:
        art = artifacts()
        next(a for a in art if a["checkpoint"] == 5)["content"]["article"]["persona"] = "someone-else"
        result = score_article(story=story(), artifacts=art)
        self.assertEqual("Rejected — hard fail", result.band)

    def test_emergency_eligibility_requires_strong_accuracy_and_sources(self) -> None:
        # A hard-failing article can never be emergency eligible.
        art = artifacts()
        next(a for a in art if a["checkpoint"] == 5)["content"]["article"]["persona"] = "someone-else"
        self.assertFalse(score_article(story=story(), artifacts=art).emergency_eligible)

    def test_record_round_trips_all_inputs(self) -> None:
        rec = score_article(story=story(), artifacts=artifacts()).to_record()
        self.assertEqual(set(rec["categories"]), set(WEIGHTS))
        self.assertIn("evaluator_version", rec)
        self.assertIn("support_ratio", rec["categories"]["accuracy"]["signals"])

    def test_xp_multiplier_ladder(self) -> None:
        self.assertEqual(0.0, xp_multiplier(7.99))
        self.assertEqual(0.90, xp_multiplier(8.00))
        self.assertEqual(1.00, xp_multiplier(8.25))
        self.assertEqual(1.10, xp_multiplier(8.50))
        self.assertEqual(1.20, xp_multiplier(8.75))
        self.assertEqual(1.35, xp_multiplier(9.00))
        self.assertEqual(1.50, xp_multiplier(9.50))
        self.assertEqual(1.50, xp_multiplier(10.00))

    def test_empty_artifacts_do_not_crash_and_never_publish(self) -> None:
        result = score_article(story={}, artifacts=[])
        self.assertFalse(result.publishable)
        self.assertLess(result.total, PUBLISH_THRESHOLD)

    def test_threshold_constants_match_handover(self) -> None:
        self.assertEqual(8.00, PUBLISH_THRESHOLD)
        self.assertEqual(7.75, EMERGENCY_FLOOR)


if __name__ == "__main__":
    unittest.main()
