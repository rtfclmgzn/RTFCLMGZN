from __future__ import annotations

import json
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

from newsroom.core.service import NewsroomService
from newsroom.tests.helpers import make_repo, valid_story_package


class ReleaseManagerIntegrationTests(unittest.TestCase):
    def test_approved_story_commits_through_release_manager_without_push(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            temp_root = Path(temp)
            repo = make_repo(temp_root / "work")
            shutil.rmtree(repo / ".git")
            (repo / "tools").mkdir(parents=True, exist_ok=True)
            source_tools = Path(__file__).resolve().parents[2] / "tools" / "release_manager"
            shutil.copytree(source_tools, repo / "tools" / "release_manager")
            (repo / ".gitignore").write_text(
                "newsroom/data/*.db*\nnewsroom/data/uploads/\nnewsroom/releases/*.zip\n",
                "utf-8",
            )
            remote = temp_root / "github.com" / "rtfclmgzn" / "RTFCLMGZN.git"
            remote.parent.mkdir(parents=True, exist_ok=True)
            self._run(["git", "init", "--bare", str(remote)], temp_root)
            self._run(["git", "init", "-b", "main"], repo)
            self._run(["git", "config", "user.name", "test"], repo)
            self._run(["git", "config", "user.email", "test@example.com"], repo)
            self._run(["git", "remote", "add", "origin", str(remote)], repo)
            self._run(["git", "add", "."], repo)
            self._run(["git", "commit", "-m", "baseline"], repo)
            self._run(["git", "push", "-u", "origin", "main"], repo)

            old_localappdata = os.environ.get("LOCALAPPDATA")
            os.environ["LOCALAPPDATA"] = str(temp_root / "appdata")
            try:
                service = NewsroomService(repo)
                package = valid_story_package("release-manager-newsroom-test")
                story = service.import_package(json.dumps(package).encode("utf-8"), "story.json")
                service.approve_story(story["id"], "owner")
                service.package_story(story["id"])
                result = service.publish_story(story["id"], push=False, verify=False)
            finally:
                if old_localappdata is None:
                    os.environ.pop("LOCALAPPDATA", None)
                else:
                    os.environ["LOCALAPPDATA"] = old_localappdata

            self.assertEqual("published", result["status"])
            generated = (repo / "web" / "data" / "newsroom-articles.js").read_text("utf-8")
            self.assertIn("release-manager-newsroom-test", generated)
            log = self._run(["git", "log", "-1", "--pretty=%s"], repo).stdout.strip()
            self.assertIn("Publish newsroom story", log)

    @staticmethod
    def _run(command: list[str], cwd: Path) -> subprocess.CompletedProcess[str]:
        result = subprocess.run(
            command,
            cwd=cwd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=60,
        )
        if result.returncode != 0:
            raise AssertionError(
                f"Command failed: {' '.join(command)}\nSTDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
            )
        return result


if __name__ == "__main__":
    unittest.main()
