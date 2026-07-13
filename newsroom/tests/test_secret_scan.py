from __future__ import annotations

import re
import unittest
from pathlib import Path


class PayloadSecretScanTests(unittest.TestCase):
    def test_platform_managed_files_have_no_secrets_or_secret_containers(self) -> None:
        repo_root = Path(__file__).resolve().parents[2]
        managed_roots = [
            repo_root / "newsroom",
            repo_root / "platform",
            repo_root / "tools" / "release_manager",
            repo_root / "docs" / "architecture",
            repo_root / "docs" / "adr",
            repo_root / "docs" / "operations",
        ]
        managed_files = {
            repo_root / "web" / "data" / "newsroom-articles.js",
            *repo_root.glob("RTFCLMGZN_*.bat"),
            *repo_root.glob("CONFIGURE_RTFCLMGZN_*.bat"),
            *repo_root.glob("RUN_RTFCLMGZN_*.bat"),
            *repo_root.glob("ENABLE_RTFCLMGZN_*.bat"),
            *repo_root.glob("DISABLE_RTFCLMGZN_*.bat"),
        }
        for root in managed_roots:
            if root.is_dir():
                managed_files.update(path for path in root.rglob("*") if path.is_file())

        forbidden_names = {
            ".env",
            ".secrets.json",
            "secrets.json",
            "credentials.json",
            "credentials.vault",
            "autonomy.json",
        }
        forbidden_suffixes = {".pem", ".p12", ".pfx", ".key", ".vault"}
        token_patterns = [
            re.compile(r"\b" + "s" + r"k-[A-Za-z0-9_-]{24,}\b"),
            re.compile(r"\b" + "AI" + r"za[0-9A-Za-z_-]{30,}\b"),
            re.compile(r"\b" + "gh" + r"[pousr]_[A-Za-z0-9]{30,}\b"),
            re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
        ]
        findings: list[str] = []
        for path in sorted(managed_files):
            if not path.is_file() or "__pycache__" in path.parts or path.suffix == ".pyc":
                continue
            if path.name.lower() in forbidden_names or path.suffix.lower() in forbidden_suffixes:
                findings.append(str(path.relative_to(repo_root)))
                continue
            if path.suffix.lower() in {
                ".png",
                ".jpg",
                ".jpeg",
                ".gif",
                ".webp",
                ".pdf",
                ".zip",
            }:
                continue
            try:
                text = path.read_text("utf-8")
            except (UnicodeDecodeError, OSError):
                continue
            if any(pattern.search(text) for pattern in token_patterns):
                findings.append(str(path.relative_to(repo_root)))
        self.assertEqual([], findings)


if __name__ == "__main__":
    unittest.main()
