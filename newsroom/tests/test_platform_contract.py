from __future__ import annotations

import json
import threading
import unittest
from pathlib import Path
from types import SimpleNamespace

from tools.release_manager.release_manager import ReleaseManagerApplication, ReleaseManagerError


class PlatformContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.root = Path(__file__).resolve().parents[2]

    def test_platform_contract_is_canonical_and_contains_no_editorial_release(self) -> None:
        contract = json.loads((self.root / "platform" / "platform.json").read_text("utf-8"))
        self.assertEqual("0.3.2", contract["platform_version"])
        self.assertEqual(26, contract["canonical_agent_count"])
        self.assertEqual(9, contract["persona_count"])
        self.assertEqual(12, contract["checkpoint_count"])
        self.assertEqual("0.3.2", contract["newsroom_studio_version"])
        self.assertTrue(contract["external_model_provider_included"])
        self.assertFalse(contract["external_model_credentials_included"])
        self.assertFalse(contract["schedule_enabled_by_default"])
        self.assertFalse(contract["auto_publish_enabled_by_default"])
        self.assertFalse(contract["editorial_release_included"])

    def test_payload_newsroom_article_store_is_an_empty_integration_point(self) -> None:
        content = (self.root / "web" / "data" / "newsroom-articles.js").read_text("utf-8")
        compact = "".join(content.split())
        self.assertIn("window.RTFC_NEWSROOM_ARTICLES=[];", compact)
        self.assertNotIn("slug:", content)
        self.assertNotIn('"slug"', content)

    def test_release_manager_requires_exact_typed_release_id(self) -> None:
        script = (self.root / "tools" / "release_manager" / "ui" / "app.js").read_text("utf-8")
        html = (self.root / "tools" / "release_manager" / "ui" / "index.html").read_text("utf-8")
        self.assertIn("const confirmedReleaseId = els.confirmReleaseInput.value.trim()", script)
        self.assertIn("confirmedReleaseId !== state.package.release_id", script)
        self.assertIn("confirm_release_id: confirmedReleaseId", script)
        self.assertIn("The release ID does not match. Nothing was published.", script)
        self.assertIn('id="confirmReleaseInput"', html)


    def test_release_manager_server_rejects_a_mismatched_release_id(self) -> None:
        app = object.__new__(ReleaseManagerApplication)
        app.packages = {
            "package-1": SimpleNamespace(manifest={"release_id": "release-2026-07-13"})
        }
        app.tasks = {}
        app.lock = threading.Lock()
        with self.assertRaisesRegex(ReleaseManagerError, "exact release ID"):
            app.start_publish("package-1", "wrong-release")
        self.assertEqual({}, app.tasks)

    def test_studio_can_open_but_not_bypass_the_release_manager(self) -> None:
        app = (self.root / "newsroom" / "app.py").read_text("utf-8")
        self.assertIn('path == "/api/tools/release-manager"', app)
        self.assertNotIn("/api/tools/release-manager/publish", app)


if __name__ == "__main__":
    unittest.main()
