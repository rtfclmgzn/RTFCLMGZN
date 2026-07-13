from __future__ import annotations

import base64
import ctypes
import json
import os
import secrets
import subprocess
import sys
from ctypes import wintypes
from pathlib import Path
from typing import Mapping


class VaultError(RuntimeError):
    pass


ENV_ALIASES: dict[str, tuple[str, ...]] = {
    "openai_api_key": ("OPENAI_API_KEY",),
    "gemini_api_key": ("GEMINI_API_KEY", "GOOGLE_API_KEY"),
    "meta_access_token": ("META_ACCESS_TOKEN",),
    "meta_page_id": ("META_PAGE_ID",),
    "instagram_user_id": ("INSTAGRAM_USER_ID",),
    "x_access_token": ("X_ACCESS_TOKEN",),
}


def default_vault_path() -> Path:
    if os.name == "nt":
        base = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local"))
    elif sys.platform == "darwin":
        base = Path.home() / "Library" / "Application Support"
    else:
        base = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))
    path = base / "RTFCLMGZN" / "credentials.vault"
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


class _DataBlob(ctypes.Structure):
    _fields_ = [("cbData", wintypes.DWORD), ("pbData", ctypes.POINTER(ctypes.c_ubyte))]


def _blob_from_bytes(value: bytes) -> tuple[_DataBlob, ctypes.Array[ctypes.c_char]]:
    buffer = ctypes.create_string_buffer(value)
    blob = _DataBlob(len(value), ctypes.cast(buffer, ctypes.POINTER(ctypes.c_ubyte)))
    return blob, buffer


def _dpapi_protect(value: bytes) -> bytes:
    if os.name != "nt":
        raise VaultError("Persistent credential storage requires Windows DPAPI")
    crypt32 = ctypes.windll.crypt32
    kernel32 = ctypes.windll.kernel32
    in_blob, _buffer = _blob_from_bytes(value)
    out_blob = _DataBlob()
    description = "RTFCLMGZN local credential vault"
    if not crypt32.CryptProtectData(
        ctypes.byref(in_blob),
        description,
        None,
        None,
        None,
        0x01,  # CRYPTPROTECT_UI_FORBIDDEN
        ctypes.byref(out_blob),
    ):
        raise VaultError(f"Windows DPAPI encryption failed ({ctypes.GetLastError()})")
    try:
        return ctypes.string_at(out_blob.pbData, out_blob.cbData)
    finally:
        kernel32.LocalFree(out_blob.pbData)


def _dpapi_unprotect(value: bytes) -> bytes:
    if os.name != "nt":
        raise VaultError("Persistent credential storage requires Windows DPAPI")
    crypt32 = ctypes.windll.crypt32
    kernel32 = ctypes.windll.kernel32
    in_blob, _buffer = _blob_from_bytes(value)
    out_blob = _DataBlob()
    if not crypt32.CryptUnprotectData(
        ctypes.byref(in_blob),
        None,
        None,
        None,
        None,
        0x01,
        ctypes.byref(out_blob),
    ):
        raise VaultError(
            "Windows could not decrypt the credential vault for the current user account"
        )
    try:
        return ctypes.string_at(out_blob.pbData, out_blob.cbData)
    finally:
        kernel32.LocalFree(out_blob.pbData)


def _restrict_windows_acl(path: Path) -> None:
    if os.name != "nt" or not path.exists():
        return
    username = os.environ.get("USERNAME")
    if not username:
        return
    # Best-effort hardening. DPAPI already binds ciphertext to the Windows user.
    subprocess.run(
        [
            "icacls",
            str(path),
            "/inheritance:r",
            "/grant:r",
            f"{username}:(R,W)",
        ],
        capture_output=True,
        text=True,
        check=False,
    )


class CredentialVault:
    """Small local credential store backed by Windows DPAPI.

    Environment variables always override stored values. The encrypted vault lives
    outside the Git repository and can only be decrypted by the same Windows user.
    """

    def __init__(self, path: Path | None = None):
        self.path = (path or default_vault_path()).expanduser().resolve()

    def _read_persistent(self) -> dict[str, str]:
        if not self.path.exists():
            return {}
        if os.name != "nt":
            raise VaultError(
                "A persistent vault exists, but this platform only decrypts it with Windows DPAPI"
            )
        try:
            wrapper = json.loads(self.path.read_text("utf-8"))
            if wrapper.get("schema_version") != 1:
                raise VaultError("Unsupported credential vault schema")
            ciphertext = base64.b64decode(wrapper["ciphertext"], validate=True)
            plaintext = _dpapi_unprotect(ciphertext)
            values = json.loads(plaintext.decode("utf-8"))
        except VaultError:
            raise
        except Exception as exc:
            raise VaultError(f"Credential vault is corrupt or unreadable: {exc}") from exc
        if not isinstance(values, dict) or not all(
            isinstance(k, str) and isinstance(v, str) for k, v in values.items()
        ):
            raise VaultError("Credential vault content is invalid")
        return values

    def _write_persistent(self, values: Mapping[str, str]) -> None:
        if os.name != "nt":
            raise VaultError(
                "Persistent credential storage is only enabled on Windows. Use environment variables."
            )
        sanitized = {
            str(key): str(value)
            for key, value in values.items()
            if str(key).strip() and str(value).strip()
        }
        plaintext = json.dumps(
            sanitized, sort_keys=True, ensure_ascii=False, separators=(",", ":")
        ).encode("utf-8")
        ciphertext = _dpapi_protect(plaintext)
        wrapper = {
            "schema_version": 1,
            "nonce": secrets.token_hex(8),
            "ciphertext": base64.b64encode(ciphertext).decode("ascii"),
        }
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.path.with_name(f".{self.path.name}.{secrets.token_hex(5)}.tmp")
        try:
            temporary.write_text(json.dumps(wrapper, indent=2) + "\n", "utf-8")
            os.replace(temporary, self.path)
        finally:
            temporary.unlink(missing_ok=True)
        _restrict_windows_acl(self.path)

    def get(self, name: str, default: str | None = None) -> str | None:
        for env_name in ENV_ALIASES.get(name, (name.upper(),)):
            value = os.environ.get(env_name)
            if value:
                return value.strip()
        values = self._read_persistent() if self.path.exists() else {}
        value = values.get(name)
        return value.strip() if value and value.strip() else default

    def set(self, name: str, value: str) -> None:
        name = name.strip()
        value = value.strip()
        if not name:
            raise VaultError("Credential name is required")
        if not value:
            raise VaultError("Credential value cannot be empty")
        values = self._read_persistent() if self.path.exists() else {}
        values[name] = value
        self._write_persistent(values)

    def delete(self, name: str) -> None:
        values = self._read_persistent() if self.path.exists() else {}
        if name in values:
            del values[name]
            self._write_persistent(values)

    def available(self) -> dict[str, bool]:
        return {name: bool(self.get(name)) for name in ENV_ALIASES}

    def clear(self) -> None:
        self.path.unlink(missing_ok=True)
