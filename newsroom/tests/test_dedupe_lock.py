from __future__ import annotations

import json
import socket
import tempfile
import time
import unittest
from pathlib import Path

from newsroom.autonomy.dedupe import (
    canonical_url,
    is_public_http_url,
    source_fingerprint,
    story_key,
    title_similarity,
)
from newsroom.autonomy.lock import CycleFileLock, CycleLockError


class DedupeAndLockTests(unittest.TestCase):
    def test_url_canonicalization_and_story_key_are_stable(self) -> None:
        left = canonical_url(
            "HTTPS://WWW.Example.com:443//news/item/?utm_source=x&b=2&a=1#fragment"
        )
        right = canonical_url("https://www.example.com/news/item?a=1&b=2")
        self.assertEqual("https://www.example.com/news/item?b=2&a=1", left)
        # Query ordering is intentionally preserved, but tracking/default-port/
        # fragment differences disappear. Exact source sets remain deterministic.
        self.assertEqual(
            source_fingerprint([left, right]),
            source_fingerprint([right, left, left]),
        )
        self.assertEqual(
            story_key("A New AI Chip", [left, right]),
            story_key("A New AI Chip", [right, left]),
        )
        self.assertGreater(title_similarity("A new AI chip arrives", "A New AI-Chip Arrives"), 0.9)

    def test_public_url_guard_rejects_local_private_and_credentialed_targets(self) -> None:
        self.assertTrue(is_public_http_url("https://example.com/report"))
        self.assertFalse(is_public_http_url("file:///etc/passwd"))
        self.assertFalse(is_public_http_url("http://localhost/admin"))
        self.assertFalse(is_public_http_url("http://127.0.0.1/admin"))
        self.assertFalse(is_public_http_url("http://192.168.1.10/report"))
        self.assertFalse(is_public_http_url("https://user:pass@example.com/report"))
        self.assertFalse(is_public_http_url("https://example.com:8443/report"))

    def test_live_lock_rejects_overlap_and_release_is_owned(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "cycle.lock"
            first = CycleFileLock(path).acquire()
            try:
                with self.assertRaisesRegex(CycleLockError, "already running"):
                    CycleFileLock(path).acquire()
                self.assertTrue(path.exists())
            finally:
                first.release()
            self.assertFalse(path.exists())

    def test_stale_dead_lock_is_reclaimed(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "cycle.lock"
            path.write_text(
                json.dumps(
                    {
                        "pid": 2_000_000_000,
                        "host": socket.gethostname(),
                        "created_at": "2000-01-01T00:00:00Z",
                        "created_unix": time.time() - 1000,
                        "command": "old-cycle",
                    }
                ),
                "utf-8",
            )
            lock = CycleFileLock(path, stale_after_seconds=300).acquire()
            try:
                owner = json.loads(path.read_text("utf-8"))
                self.assertNotEqual(2_000_000_000, owner["pid"])
            finally:
                lock.release()
            self.assertFalse(path.exists())


if __name__ == "__main__":
    unittest.main()
