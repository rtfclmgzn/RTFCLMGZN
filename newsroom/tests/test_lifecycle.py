from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from newsroom.core.service import NewsroomError, NewsroomService
from newsroom.tests.helpers import make_repo


class LifecycleTests(unittest.TestCase):
    def test_demo_reaches_owner_gate_but_cannot_publish(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            repo = make_repo(Path(temp))
            service = NewsroomService(repo)
            story = service.create_demo()
            self.assertEqual(9, story["current_checkpoint"])
            self.assertEqual("awaiting-approval", story["status"])
            self.assertFalse(story["publishable"])
            self.assertEqual(8, len(story["artifacts"]))
            with self.assertRaises(NewsroomError):
                service.approve_story(story["id"], "owner")

    def test_restart_preserves_story_and_event_state(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            repo = make_repo(Path(temp))
            first = NewsroomService(repo)
            created = first.create_story(
                {
                    "title": "Persistent candidate",
                    "slug": "persistent-candidate",
                    "brief": "Prove SQLite state survives a process restart.",
                    "persona_id": "jin-park",
                    "section": "Compute",
                    "format": "brief",
                    "lane": "brief",
                }
            )
            second = NewsroomService(repo)
            restored = second.get_story(created["id"])
            self.assertEqual("persistent-candidate", restored["slug"])
            self.assertGreaterEqual(len(restored["events"]), 1)


if __name__ == "__main__":
    unittest.main()
