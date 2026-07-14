from __future__ import annotations

import json
import math
import unittest
from pathlib import Path

from newsroom.app import _json_safe


class StoryViewerRepairTests(unittest.TestCase):
    def setUp(self) -> None:
        self.root = Path(__file__).resolve().parents[2]

    def test_non_finite_values_are_strict_json_safe(self) -> None:
        value = _json_safe({"nan": math.nan, "pos": math.inf, "neg": -math.inf})
        self.assertEqual({"nan": None, "pos": None, "neg": None}, value)
        json.dumps(value, allow_nan=False)

    def test_story_viewer_has_delegated_selection_and_recovery(self) -> None:
        script = (self.root / "newsroom" / "ui" / "app.js").read_text("utf-8")
        self.assertIn("_storyClickBound", script)
        self.assertIn("renderStoryLoading", script)
        self.assertIn("renderStoryError", script)
        self.assertIn("Retry story", script)
        self.assertIn("safeStringify", script)

    def test_platform_contract_records_viewer_repair(self) -> None:
        contract = json.loads((self.root / "platform" / "platform.json").read_text("utf-8"))
        self.assertEqual("0.3.3", contract["story_viewer_hotfix_version"])
        self.assertTrue(contract["strict_json_api_responses"])
        self.assertTrue(contract["story_detail_error_recovery"])


if __name__ == "__main__":
    unittest.main()
