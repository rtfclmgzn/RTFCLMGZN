from __future__ import annotations

import json
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path

from newsroom.app import Handler, NewsroomServer
from newsroom.core.service import NewsroomService
from newsroom.tests.helpers import make_repo


class HttpSecurityTests(unittest.TestCase):
    def test_api_requires_session_token(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            repo = make_repo(Path(temp))
            service = NewsroomService(repo)
            ui_root = Path(__file__).resolve().parents[1] / "ui"
            server = NewsroomServer(("127.0.0.1", 0), Handler, service, "secret-token", ui_root)
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            port = server.server_address[1]
            try:
                with self.assertRaises(urllib.error.HTTPError) as caught:
                    urllib.request.urlopen(f"http://127.0.0.1:{port}/api/health", timeout=3)
                self.assertEqual(403, caught.exception.code)
                request = urllib.request.Request(
                    f"http://127.0.0.1:{port}/api/health",
                    headers={"X-RTFCL-Token": "secret-token"},
                )
                with urllib.request.urlopen(request, timeout=3) as response:
                    payload = json.loads(response.read())
                self.assertTrue(payload["ok"])
                self.assertEqual(26, payload["agent_count"])
            finally:
                server.shutdown()
                server.server_close()
                thread.join(timeout=3)


if __name__ == "__main__":
    unittest.main()
