from __future__ import annotations

import os
import unittest
from pathlib import Path

from newsroom.autonomy.scheduler import TASK_NAME, SchedulerError, enable_schedule, schedule_status


class SchedulerTests(unittest.TestCase):
    def test_non_windows_status_is_safe_and_side_effect_free(self) -> None:
        if os.name == "nt":
            self.skipTest("Non-Windows status path")
        status = schedule_status()
        self.assertFalse(status["supported"])
        self.assertEqual(TASK_NAME, status["task_name"])
        with self.assertRaisesRegex(SchedulerError, "Windows"):
            enable_schedule(Path.cwd(), 60)

    def test_scheduled_launcher_is_bounded_and_contains_no_credentials(self) -> None:
        payload = Path(__file__).resolve().parents[2]
        launcher = (payload / "RTFCLMGZN_AUTOPILOT_TASK.bat").read_text("utf-8")
        self.assertIn("--scheduled", launcher)
        self.assertIn("--allow-publish-if-authorized", launcher)
        self.assertNotIn("OPENAI_API_KEY=", launcher)
        self.assertNotIn("GEMINI_API_KEY=", launcher)

    def test_buzz_launcher_is_bounded_and_contains_no_credentials(self) -> None:
        payload = Path(__file__).resolve().parents[2]
        launcher = (payload / "RTFCLMGZN_BUZZ_TASK.bat").read_text("utf-8")
        self.assertIn("buzz-cycle", launcher)
        self.assertNotIn("OPENAI_API_KEY=", launcher)
        self.assertNotIn("GEMINI_API_KEY=", launcher)


if __name__ == "__main__":
    unittest.main()
