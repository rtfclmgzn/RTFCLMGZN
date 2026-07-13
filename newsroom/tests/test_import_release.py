from __future__ import annotations

import json
import tempfile
import unittest
import zipfile
from pathlib import Path

from newsroom.core.service import NewsroomError, NewsroomService
from newsroom.tests.helpers import make_repo, valid_story_package


class ImportReleaseTests(unittest.TestCase):
    def test_import_approval_and_release_package(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            repo = make_repo(Path(temp))
            service = NewsroomService(repo)
            payload = json.dumps(valid_story_package()).encode("utf-8")
            imported = service.import_package(payload, "story.json")
            self.assertEqual("awaiting-approval", imported["status"])
            self.assertEqual(9, len(imported["artifacts"]))
            approved = service.approve_story(imported["id"], "0baak", "Reviewed exact draft")
            self.assertEqual("packaging", approved["status"])
            self.assertEqual(
                approved["approvals"][0]["artifact_sha256"],
                [a for a in approved["artifacts"] if a["checkpoint"] == 5][0]["sha256"],
            )
            packaged = service.package_story(imported["id"])
            self.assertEqual("release-validation", packaged["status"])
            release = packaged["releases"][0]
            archive_path = Path(release["package_path"])
            self.assertTrue(archive_path.is_file())
            with zipfile.ZipFile(archive_path, "r") as archive:
                names = set(archive.namelist())
                manifest = json.loads(archive.read("release.json"))
                self.assertIn("payload/web/data/newsroom-articles.js", names)
                self.assertIn("payload/web/rss.xml", names)
                self.assertEqual("governed-story-test", manifest["articles"][0]["slug"])
                self.assertEqual(3, len(manifest["files"]))
                generated = archive.read("payload/web/data/newsroom-articles.js").decode("utf-8")
                self.assertIn("governed-story-test", generated)

    def test_missing_checkpoint_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            repo = make_repo(Path(temp))
            service = NewsroomService(repo)
            package = valid_story_package("missing-stage-test")
            package["workflow"]["artifacts"] = package["workflow"]["artifacts"][:-1]
            with self.assertRaises(NewsroomError):
                service.import_package(json.dumps(package).encode("utf-8"), "story.json")

    def test_duplicate_slug_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            repo = make_repo(Path(temp))
            service = NewsroomService(repo)
            package = valid_story_package("duplicate-slug-test")
            raw = json.dumps(package).encode("utf-8")
            service.import_package(raw, "first.json")
            with self.assertRaises(NewsroomError):
                service.import_package(raw, "second.json")


if __name__ == "__main__":
    unittest.main()
