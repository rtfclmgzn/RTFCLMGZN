from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from newsroom.security.vault import CredentialVault, VaultError


class CredentialVaultTests(unittest.TestCase):
    def test_environment_overrides_need_no_persistent_vault(self) -> None:
        with tempfile.TemporaryDirectory() as temp, patch.dict(
            os.environ,
            {"OPENAI_API_KEY": "environment-test-key", "GEMINI_API_KEY": ""},
            clear=False,
        ):
            vault = CredentialVault(Path(temp) / "credentials.vault")
            self.assertEqual("environment-test-key", vault.get("openai_api_key"))
            available = vault.available()
            self.assertTrue(available["openai_api_key"])
            self.assertFalse(available["gemini_api_key"])
            self.assertTrue(all(isinstance(value, bool) for value in available.values()))
            self.assertFalse(vault.path.exists())

    def test_persistent_storage_fails_closed_without_windows_dpapi(self) -> None:
        if os.name == "nt":
            self.skipTest("Non-Windows fail-closed behavior")
        with tempfile.TemporaryDirectory() as temp:
            vault = CredentialVault(Path(temp) / "credentials.vault")
            with self.assertRaisesRegex(VaultError, "Windows"):
                vault.set("openai_api_key", "not-a-real-key")
            self.assertFalse(vault.path.exists())


if __name__ == "__main__":
    unittest.main()
