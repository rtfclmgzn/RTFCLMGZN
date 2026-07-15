from __future__ import annotations

import json
import unittest
from pathlib import Path

from newsroom.autonomy.review_gate import split_contradictions

SCHEMA_ROOT = Path(__file__).resolve().parents[1] / "schemas"

# Verbatim output from newsroom-core cycle 8e1f7740 (2026-07-14). The verification
# model recorded a source discrepancy it had already settled by attributing each
# outlet's figure separately. The pre-fix gate rejected on any non-empty
# contradictions list, so correctly handling the discrepancy blocked the story.
SETTLED_DISCREPANCY_LEGACY = [
    "Reuters via Investing.com describes more than $1 billion in compute capacity, "
    "while TechCrunch describes a $1 billion deal. The revised article uses the "
    "latter figure and notes the former only with attribution."
]


class SplitContradictionsTests(unittest.TestCase):
    def test_legacy_plain_strings_fail_closed(self) -> None:
        """Legacy entries carry no resolution status, so they must stay blocking."""
        unresolved, resolved = split_contradictions(SETTLED_DISCREPANCY_LEGACY)
        self.assertEqual(1, len(unresolved))
        self.assertEqual([], resolved)

    def test_resolved_contradiction_does_not_block(self) -> None:
        unresolved, resolved = split_contradictions(
            [
                {
                    "description": "Reuters says 'more than $1B'; TechCrunch says '$1B'.",
                    "resolved": True,
                    "resolution": "Each outlet's figure is attributed separately.",
                }
            ]
        )
        self.assertEqual([], unresolved)
        self.assertEqual(1, len(resolved))

    def test_unresolved_contradiction_still_blocks(self) -> None:
        unresolved, resolved = split_contradictions(
            [{"description": "Source A says 50MW, Source B says 500MW.", "resolved": False}]
        )
        self.assertEqual(1, len(unresolved))
        self.assertEqual([], resolved)

    def test_mixed_blocks_on_the_unresolved_entry(self) -> None:
        unresolved, resolved = split_contradictions(
            [
                {"description": "settled figure discrepancy", "resolved": True},
                {"description": "unexplained date conflict", "resolved": False},
            ]
        )
        self.assertEqual(["unexplained date conflict"], unresolved)
        self.assertEqual(["settled figure discrepancy"], resolved)

    def test_missing_resolved_flag_is_treated_as_unresolved(self) -> None:
        unresolved, _ = split_contradictions([{"description": "conflict of unknown status"}])
        self.assertEqual(1, len(unresolved))

    def test_empty_and_malformed_entries_are_dropped(self) -> None:
        unresolved, resolved = split_contradictions(
            [{"description": "", "resolved": True}, None, "", {"resolved": False}]
        )
        self.assertEqual([], unresolved)
        self.assertEqual([], resolved)


class DisclaimerSchemaTests(unittest.TestCase):
    def test_disclaimer_is_constrained_to_the_values_the_site_renders(self) -> None:
        """app.js renders `disclaimer` as an enum; free text silently renders nothing.

        The unbounded maxLength:100 string previously truncated the model's prose
        mid-sentence, which meant a Markets story could ship with no financial
        disclaimer at all.
        """
        schema = json.loads((SCHEMA_ROOT / "article-draft.json").read_text("utf-8"))
        disclaimer = schema["properties"]["article"]["properties"]["disclaimer"]
        self.assertEqual(
            ["none", "not-financial-advice", "not-medical-advice"],
            disclaimer["enum"],
        )
        self.assertNotIn("maxLength", disclaimer)


class ContradictionSchemaTests(unittest.TestCase):
    def test_contradictions_carry_an_explicit_resolution_flag(self) -> None:
        for name in ("verification-report.json", "claim-map.json"):
            with self.subTest(schema=name):
                schema = json.loads((SCHEMA_ROOT / name).read_text("utf-8"))
                item = schema["properties"]["contradictions"]["items"]
                self.assertEqual("object", item["type"])
                self.assertIn("resolved", item["required"])
                self.assertIn("description", item["required"])


if __name__ == "__main__":
    unittest.main()
