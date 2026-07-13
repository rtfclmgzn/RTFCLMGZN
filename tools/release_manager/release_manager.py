#!/usr/bin/env python3
"""RTFCLMGZN Editorial Release Manager.

A dependency-free local application for validating, installing, committing, pushing,
and confirming editorial release packages. The HTTP interface binds only to
127.0.0.1 and requires a per-launch token for every API request.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import secrets
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request
import webbrowser
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path, PurePosixPath
from typing import Any, Callable, Iterable
from urllib.parse import parse_qs, quote, urlparse
from xml.etree import ElementTree

APP_NAME = "RTFCLMGZN Editorial Release Manager"
APP_VERSION = "1.2.0"
DEFAULT_SITE_URL = "https://rtfclmgzn.com"
DEFAULT_PORT = 8765
MAX_UPLOAD_BYTES = 250 * 1024 * 1024
ALLOWED_EXACT_PATHS = {
    "web/rss.xml",
    "web/sitemap.xml",
    "web/robots.txt",
    "web/manifest.json",
}
ALLOWED_PREFIXES = {
    "web/data/": {".js", ".json"},
    "web/assets/img/": {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg"},
    "web/assets/audio/": {".mp3", ".m4a", ".ogg", ".wav"},
    "web/magazine/": {".pdf"},
}
CONTENT_JS_ASSIGNMENT = re.compile(r"window\.RTFC_[A-Z0-9_]+\s*=", re.MULTILINE)
BANNED_JS_TOKENS = (
    "eval(",
    "new Function(",
    "XMLHttpRequest",
    "document.cookie",
    "window.location=",
    "window.location =",
    "localStorage.setItem",
    "sessionStorage.setItem",
    "navigator.sendBeacon",
    "fetch(",
    "WebSocket(",
    "import(",
    "require(",
)


class ReleaseManagerError(RuntimeError):
    """Expected operational error that can be shown to the user."""


@dataclass(frozen=True)
class PackageFile:
    path: str
    sha256: str
    size: int


@dataclass
class InspectedPackage:
    package_id: str
    archive_path: Path
    manifest: dict[str, Any]
    files: list[PackageFile]
    extracted_root: Path

    def summary(self) -> dict[str, Any]:
        articles = self.manifest.get("articles") or []
        return {
            "package_id": self.package_id,
            "schema_version": self.manifest.get("schema_version"),
            "release_id": self.manifest.get("release_id"),
            "title": self.manifest.get("title"),
            "created_at": self.manifest.get("created_at"),
            "commit_message": self.manifest.get("commit_message"),
            "article_count": len(articles),
            "articles": articles,
            "file_count": len(self.files),
            "files": [f.path for f in self.files],
            "total_bytes": sum(f.size for f in self.files),
        }


@dataclass
class PublishResult:
    release_id: str
    cache_version: int
    commit: str | None
    pushed: bool
    deployed: bool
    live_url: str
    backup_path: str
    staged_files: list[str]

    def to_dict(self) -> dict[str, Any]:
        return {
            "release_id": self.release_id,
            "cache_version": self.cache_version,
            "commit": self.commit,
            "pushed": self.pushed,
            "deployed": self.deployed,
            "live_url": self.live_url,
            "backup_path": self.backup_path,
            "staged_files": self.staged_files,
        }


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso_now() -> str:
    return utc_now().replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def atomic_write_bytes(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_name(f".{path.name}.{secrets.token_hex(5)}.rtfctmp")
    try:
        temp_path.write_bytes(data)
        os.replace(temp_path, path)
    finally:
        if temp_path.exists():
            temp_path.unlink(missing_ok=True)


def atomic_write_text(path: Path, text: str) -> None:
    atomic_write_bytes(path, text.encode("utf-8"))


def app_data_root() -> Path:
    if os.name == "nt":
        base = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local"))
    elif sys.platform == "darwin":
        base = Path.home() / "Library" / "Application Support"
    else:
        base = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))
    path = base / "RTFCLMGZN" / "release-manager"
    path.mkdir(parents=True, exist_ok=True)
    return path


def find_repo_root(script_path: Path) -> Path:
    configured = os.environ.get("RTFCLMGZN_PROJECT")
    if configured:
        candidate = Path(configured).expanduser().resolve()
        if (candidate / ".git").exists() and (candidate / "web" / "index.html").exists():
            return candidate
        raise ReleaseManagerError(
            f"RTFCLMGZN_PROJECT points to an invalid project directory: {candidate}"
        )

    resolved = script_path.resolve()
    for parent in [resolved.parent, *resolved.parents]:
        if (parent / ".git").exists() and (parent / "web" / "index.html").exists():
            return parent

    default = Path(r"D:\BUSINESS\RTFCLMGZN")
    if (default / ".git").exists() and (default / "web" / "index.html").exists():
        return default.resolve()

    raise ReleaseManagerError(
        "Could not locate the RTFCLMGZN repository. Place the Release Manager "
        "inside the project or set RTFCLMGZN_PROJECT to the repository path."
    )


def normalize_release_path(raw_path: str) -> str:
    if not isinstance(raw_path, str):
        raise ReleaseManagerError("Every release file path must be a string.")
    candidate = raw_path.replace("\\", "/").strip()
    pure = PurePosixPath(candidate)
    if not candidate or pure.is_absolute() or ".." in pure.parts or ":" in candidate:
        raise ReleaseManagerError(f"Unsafe release path: {raw_path!r}")
    normalized = str(pure)
    if normalized.startswith("./"):
        normalized = normalized[2:]
    return normalized


def is_allowed_release_path(path: str) -> bool:
    if path in ALLOWED_EXACT_PATHS:
        return True
    suffix = PurePosixPath(path).suffix.lower()
    for prefix, suffixes in ALLOWED_PREFIXES.items():
        if path.startswith(prefix) and suffix in suffixes:
            return True
    return False


def is_symlink_zipinfo(info: zipfile.ZipInfo) -> bool:
    mode = (info.external_attr >> 16) & 0xFFFF
    return (mode & 0o170000) == 0o120000


def validate_iso_timestamp(value: Any, field: str) -> None:
    if not isinstance(value, str) or not value.strip():
        raise ReleaseManagerError(f"Manifest field {field!r} is required.")
    normalized = value.replace("Z", "+00:00")
    try:
        datetime.fromisoformat(normalized)
    except ValueError as exc:
        raise ReleaseManagerError(f"Manifest field {field!r} must be ISO-8601.") from exc


def validate_manifest(manifest: dict[str, Any]) -> list[PackageFile]:
    if not isinstance(manifest, dict):
        raise ReleaseManagerError("release.json must contain a JSON object.")
    if manifest.get("schema_version") != 1:
        raise ReleaseManagerError("Unsupported release package schema. Expected schema_version 1.")

    release_id = manifest.get("release_id")
    if not isinstance(release_id, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{3,79}", release_id):
        raise ReleaseManagerError(
            "release_id must be 4-80 characters using letters, numbers, dots, underscores, or hyphens."
        )
    for field in ("title", "commit_message"):
        value = manifest.get(field)
        if not isinstance(value, str) or not value.strip():
            raise ReleaseManagerError(f"Manifest field {field!r} is required.")
        if len(value) > 180:
            raise ReleaseManagerError(f"Manifest field {field!r} is too long.")
        if "\n" in value or "\r" in value:
            raise ReleaseManagerError(f"Manifest field {field!r} must be a single line.")
    validate_iso_timestamp(manifest.get("created_at"), "created_at")

    articles = manifest.get("articles")
    if not isinstance(articles, list) or not articles:
        raise ReleaseManagerError("An editorial release must include at least one article summary.")
    article_ids: set[str] = set()
    article_slugs: set[str] = set()
    for article in articles:
        if not isinstance(article, dict):
            raise ReleaseManagerError("Each article summary must be an object.")
        for field in ("id", "slug", "title", "image"):
            if not isinstance(article.get(field), str) or not article[field].strip():
                raise ReleaseManagerError(f"Article summary is missing {field!r}.")
        article_id = article["id"].strip()
        article_slug = article["slug"].strip()
        article_title = article["title"].strip()
        article_image = normalize_release_path(article["image"])
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{2,79}", article_id):
            raise ReleaseManagerError(f"Unsafe article id: {article_id!r}")
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", article_slug):
            raise ReleaseManagerError(f"Unsafe article slug: {article_slug!r}")
        if len(article_title) > 240 or "\n" in article_title or "\r" in article_title:
            raise ReleaseManagerError("Article titles must be one line and no longer than 240 characters.")
        if not article_image.startswith("assets/img/"):
            raise ReleaseManagerError(f"Article images must live under assets/img/: {article_image}")
        if article["id"] in article_ids:
            raise ReleaseManagerError(f"Duplicate article id in package: {article['id']}")
        if article["slug"] in article_slugs:
            raise ReleaseManagerError(f"Duplicate article slug in package: {article['slug']}")
        article_ids.add(article["id"])
        article_slugs.add(article["slug"])

    raw_files = manifest.get("files")
    if not isinstance(raw_files, list) or not raw_files:
        raise ReleaseManagerError("Manifest must include a non-empty files list.")
    files: list[PackageFile] = []
    seen_paths: set[str] = set()
    for raw_file in raw_files:
        if not isinstance(raw_file, dict):
            raise ReleaseManagerError("Each files entry must be an object.")
        path = normalize_release_path(raw_file.get("path", ""))
        if path in seen_paths:
            raise ReleaseManagerError(f"Duplicate file in manifest: {path}")
        if not is_allowed_release_path(path):
            raise ReleaseManagerError(
                f"Release package cannot modify {path}. Editorial packages are limited to content and media files."
            )
        digest = raw_file.get("sha256")
        if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-fA-F]{64}", digest):
            raise ReleaseManagerError(f"Invalid SHA-256 for {path}.")
        size = raw_file.get("size")
        if not isinstance(size, int) or size < 0 or size > MAX_UPLOAD_BYTES:
            raise ReleaseManagerError(f"Invalid size for {path}.")
        files.append(PackageFile(path=path, sha256=digest.lower(), size=size))
        seen_paths.add(path)

    if "web/rss.xml" not in seen_paths:
        raise ReleaseManagerError("Article releases must include: web/rss.xml")
    article_stores = {"web/data/live-articles.js", "web/data/newsroom-articles.js"}
    if not article_stores.intersection(seen_paths):
        raise ReleaseManagerError(
            "Article releases must include one article store: "
            "web/data/live-articles.js or web/data/newsroom-articles.js"
        )
    return files


def validate_image_magic(path: Path) -> None:
    suffix = path.suffix.lower()
    head = path.read_bytes()[:32]
    valid = True
    if suffix in {".jpg", ".jpeg"}:
        valid = head.startswith(b"\xff\xd8\xff")
    elif suffix == ".png":
        valid = head.startswith(b"\x89PNG\r\n\x1a\n")
    elif suffix == ".gif":
        valid = head.startswith((b"GIF87a", b"GIF89a"))
    elif suffix == ".webp":
        valid = len(head) >= 12 and head[:4] == b"RIFF" and head[8:12] == b"WEBP"
    elif suffix == ".pdf":
        valid = head.startswith(b"%PDF-")
    elif suffix == ".svg":
        text = path.read_text("utf-8", errors="ignore").lstrip()
        valid = text.startswith("<svg") or text.startswith("<?xml")
    if not valid:
        raise ReleaseManagerError(f"File content does not match extension: {path.name}")


def validate_js_balance(text: str, label: str) -> None:
    stack: list[tuple[str, int]] = []
    pairs = {")": "(", "]": "[", "}": "{"}
    state = "code"
    escaped = False
    i = 0
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if state in {"single", "double", "template"}:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif (state == "single" and ch == "'") or (state == "double" and ch == '"') or (
                state == "template" and ch == "`"
            ):
                state = "code"
        elif state == "line_comment":
            if ch in "\r\n":
                state = "code"
        elif state == "block_comment":
            if ch == "*" and nxt == "/":
                state = "code"
                i += 1
        else:
            if ch == "/" and nxt == "/":
                state = "line_comment"
                i += 1
            elif ch == "/" and nxt == "*":
                state = "block_comment"
                i += 1
            elif ch == "'":
                state = "single"
            elif ch == '"':
                state = "double"
            elif ch == "`":
                state = "template"
            elif ch in "([{":
                stack.append((ch, i))
            elif ch in ")]} ":
                if ch in pairs:
                    if not stack or stack[-1][0] != pairs[ch]:
                        raise ReleaseManagerError(f"Unbalanced JavaScript in {label} near character {i}.")
                    stack.pop()
        i += 1
    if state in {"single", "double", "template", "block_comment"}:
        raise ReleaseManagerError(f"Unclosed string or comment in {label}.")
    if stack:
        raise ReleaseManagerError(f"Unclosed bracket in {label} near character {stack[-1][1]}.")


def strip_js_strings_and_comments(text: str) -> str:
    """Return JavaScript code with string/comment contents replaced by spaces."""
    out: list[str] = []
    state = "code"
    escaped = False
    i = 0
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if state in {"single", "double", "template"}:
            if escaped:
                escaped = False
                out.append(" ")
            elif ch == "\\":
                escaped = True
                out.append(" ")
            elif (state == "single" and ch == "'") or (state == "double" and ch == '"') or (
                state == "template" and ch == "`"
            ):
                state = "code"
                out.append(ch)
            else:
                out.append("\n" if ch == "\n" else " ")
        elif state == "line_comment":
            if ch in "\r\n":
                state = "code"
                out.append(ch)
            else:
                out.append(" ")
        elif state == "block_comment":
            if ch == "*" and nxt == "/":
                out.extend([" ", " "])
                state = "code"
                i += 1
            else:
                out.append("\n" if ch == "\n" else " ")
        else:
            if ch == "/" and nxt == "/":
                out.extend([" ", " "])
                state = "line_comment"
                i += 1
            elif ch == "/" and nxt == "*":
                out.extend([" ", " "])
                state = "block_comment"
                i += 1
            elif ch == "'":
                state = "single"
                out.append(ch)
            elif ch == '"':
                state = "double"
                out.append(ch)
            elif ch == "`":
                state = "template"
                out.append(ch)
            else:
                out.append(ch)
        i += 1
    return "".join(out)


def validate_content_js(path: Path) -> None:
    try:
        text = path.read_text("utf-8")
    except UnicodeDecodeError as exc:
        raise ReleaseManagerError(f"Content file is not valid UTF-8: {path.name}") from exc
    if "\x00" in text:
        raise ReleaseManagerError(f"Content file contains a NUL byte: {path.name}")
    code_only = strip_js_strings_and_comments(text)
    if not CONTENT_JS_ASSIGNMENT.search(code_only):
        raise ReleaseManagerError(
            f"Content JavaScript must assign a window.RTFC_* data object: {path.name}"
        )
    lowered = code_only.lower()
    for token in BANNED_JS_TOKENS:
        if token.lower() in lowered:
            raise ReleaseManagerError(
                f"Content package contains executable browser behavior ({token}) in {path.name}."
            )
    validate_js_balance(text, path.name)


def run_process(
    args: list[str],
    cwd: Path,
    *,
    check: bool = True,
    timeout: int = 180,
) -> subprocess.CompletedProcess[str]:
    try:
        completed = subprocess.run(
            args,
            cwd=str(cwd),
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=timeout,
            encoding="utf-8",
            errors="replace",
            creationflags=(subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0),
        )
    except FileNotFoundError as exc:
        raise ReleaseManagerError(f"Required command not found: {args[0]}") from exc
    except subprocess.TimeoutExpired as exc:
        raise ReleaseManagerError(f"Command timed out: {' '.join(args)}") from exc
    if check and completed.returncode != 0:
        output = completed.stdout.strip()
        raise ReleaseManagerError(
            f"Command failed ({completed.returncode}): {' '.join(args)}\n{output}"
        )
    return completed


class GitRepository:
    def __init__(self, root: Path):
        self.root = root
        if not (root / ".git").exists():
            raise ReleaseManagerError(f"Not a Git repository: {root}")

    def git(self, *args: str, check: bool = True, timeout: int = 180) -> str:
        result = run_process(["git", *args], self.root, check=check, timeout=timeout)
        return result.stdout.strip()

    def status_porcelain(self) -> str:
        return self.git("status", "--porcelain")

    def branch(self) -> str:
        return self.git("branch", "--show-current")

    def remote_url(self) -> str:
        return self.git("config", "--get", "remote.origin.url")

    def head(self) -> str:
        return self.git("rev-parse", "--short=12", "HEAD")

    def upstream_counts(self) -> tuple[int, int] | None:
        result = self.git(
            "rev-list",
            "--left-right",
            "--count",
            "HEAD...@{upstream}",
            check=False,
        )
        if not result or "fatal:" in result.lower():
            return None
        parts = result.replace("\t", " ").split()
        if len(parts) != 2:
            return None
        return int(parts[0]), int(parts[1])  # ahead, behind

    def ensure_clean_and_current(self, log: Callable[[str], None]) -> None:
        dirty = self.status_porcelain()
        if dirty:
            raise ReleaseManagerError(
                "The project has uncommitted changes. The Release Manager will not mix an editorial "
                "release with unrelated work. Commit, stash, or discard those changes first.\n\n" + dirty
            )
        branch = self.branch()
        if branch != "main":
            raise ReleaseManagerError(f"Publishing is allowed only from the main branch; current branch is {branch!r}.")
        remote = self.remote_url()
        if "github.com" not in remote.lower():
            raise ReleaseManagerError(f"The origin remote is not a GitHub repository: {remote}")
        log("Fetching the latest GitHub state…")
        self.git("fetch", "origin", timeout=240)
        counts = self.upstream_counts()
        if counts:
            ahead, behind = counts
            if behind and not ahead:
                log(f"Local main is {behind} commit(s) behind. Fast-forwarding…")
                self.git("pull", "--ff-only", "origin", "main", timeout=240)
            elif ahead and not behind:
                raise ReleaseManagerError(
                    f"Local main has {ahead} unpushed commit(s). Push them before publishing a release."
                )
            elif ahead and behind:
                raise ReleaseManagerError(
                    "Local main and origin/main have diverged. Resolve the Git history before publishing."
                )


class ReleasePackageInspector:
    def __init__(self, storage_root: Path):
        self.storage_root = storage_root
        (self.storage_root / "packages").mkdir(parents=True, exist_ok=True)

    def inspect_bytes(self, filename: str, data: bytes) -> InspectedPackage:
        if not filename.lower().endswith(".zip"):
            raise ReleaseManagerError("Release packages must be ZIP files.")
        if not data:
            raise ReleaseManagerError("The selected package is empty.")
        if len(data) > MAX_UPLOAD_BYTES:
            raise ReleaseManagerError("Release package exceeds the 250 MB safety limit.")
        package_id = secrets.token_urlsafe(18)
        package_dir = self.storage_root / "packages" / package_id
        package_dir.mkdir(parents=True, exist_ok=False)
        archive_path = package_dir / "release.zip"
        archive_path.write_bytes(data)
        extracted = package_dir / "payload"
        extracted.mkdir()
        try:
            return self._inspect_archive(package_id, archive_path, extracted)
        except Exception:
            shutil.rmtree(package_dir, ignore_errors=True)
            raise

    def inspect_path(self, archive_path: Path) -> InspectedPackage:
        data = archive_path.read_bytes()
        return self.inspect_bytes(archive_path.name, data)

    def _inspect_archive(self, package_id: str, archive_path: Path, extracted: Path) -> InspectedPackage:
        try:
            archive = zipfile.ZipFile(archive_path, "r")
        except zipfile.BadZipFile as exc:
            raise ReleaseManagerError("The selected file is not a valid ZIP archive.") from exc
        with archive:
            infos = {info.filename.replace("\\", "/"): info for info in archive.infolist()}
            if "release.json" not in infos:
                raise ReleaseManagerError(
                    "This is not an RTFCLMGZN release package: release.json is missing."
                )
            if is_symlink_zipinfo(infos["release.json"]):
                raise ReleaseManagerError("Release package contains a symbolic link.")
            try:
                manifest = json.loads(archive.read(infos["release.json"]).decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                raise ReleaseManagerError("release.json is not valid UTF-8 JSON.") from exc
            files = validate_manifest(manifest)
            declared_entries = {f"payload/{item.path}" for item in files}
            actual_payload_entries = {
                name for name, info in infos.items() if name.startswith("payload/") and not info.is_dir()
            }
            undeclared = sorted(actual_payload_entries - declared_entries)
            missing = sorted(declared_entries - actual_payload_entries)
            if undeclared:
                raise ReleaseManagerError(
                    "Package contains undeclared payload files: " + ", ".join(undeclared[:8])
                )
            if missing:
                raise ReleaseManagerError(
                    "Package is missing declared payload files: " + ", ".join(missing[:8])
                )
            for item in files:
                entry_name = f"payload/{item.path}"
                info = infos[entry_name]
                if is_symlink_zipinfo(info):
                    raise ReleaseManagerError(f"Package contains a symbolic link: {item.path}")
                if info.file_size != item.size:
                    raise ReleaseManagerError(
                        f"Size mismatch for {item.path}: manifest={item.size}, archive={info.file_size}"
                    )
                payload = archive.read(info)
                if sha256_bytes(payload) != item.sha256:
                    raise ReleaseManagerError(f"SHA-256 mismatch for {item.path}.")
                target = extracted / item.path
                atomic_write_bytes(target, payload)

        for item in files:
            path = extracted / item.path
            if path.suffix.lower() == ".js":
                validate_content_js(path)
            elif path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".pdf"}:
                validate_image_magic(path)
            elif item.path == "web/rss.xml" or item.path == "web/sitemap.xml":
                try:
                    ElementTree.parse(path)
                except ElementTree.ParseError as exc:
                    raise ReleaseManagerError(f"Invalid XML in {item.path}: {exc}") from exc

        return InspectedPackage(
            package_id=package_id,
            archive_path=archive_path,
            manifest=manifest,
            files=files,
            extracted_root=extracted,
        )


class Publisher:
    def __init__(self, repo_root: Path, site_url: str = DEFAULT_SITE_URL):
        self.repo_root = repo_root.resolve()
        self.repo = GitRepository(self.repo_root)
        self.site_url = site_url.rstrip("/")
        self.storage_root = app_data_root()

    def repository_status(self) -> dict[str, Any]:
        try:
            branch = self.repo.branch()
            remote = self.repo.remote_url()
            dirty = bool(self.repo.status_porcelain())
            head = self.repo.head()
            counts = self.repo.upstream_counts()
            return {
                "ok": True,
                "root": str(self.repo_root),
                "branch": branch,
                "remote": remote,
                "dirty": dirty,
                "head": head,
                "ahead": counts[0] if counts else None,
                "behind": counts[1] if counts else None,
            }
        except Exception as exc:  # status must never crash the UI
            return {"ok": False, "root": str(self.repo_root), "error": str(exc)}

    def publish(
        self,
        package: InspectedPackage,
        log: Callable[[str], None],
        *,
        push: bool = True,
        verify_deployment: bool = True,
    ) -> PublishResult:
        manifest = package.manifest
        release_id = manifest["release_id"]
        log(f"Preflight: {release_id}")
        self.repo.ensure_clean_and_current(log)
        existing_record = self.repo_root / "docs" / "operations" / "releases" / f"{release_id}.json"
        if existing_record.exists():
            raise ReleaseManagerError(
                f"Release ID {release_id!r} has already been published. Build a new package with a new release_id."
            )
        log("Git preflight passed. Creating a rollback backup…")

        package_paths = [item.path for item in package.files]
        managed_paths = package_paths + ["web/index.html", "web/release.json"]
        backup_path = self._create_backup(release_id, managed_paths)
        log(f"Backup saved outside Git: {backup_path}")

        new_files_before = {path for path in managed_paths if not (self.repo_root / path).exists()}
        applied_paths: list[str] = []
        release_record_path = ""
        try:
            for item in package.files:
                source = package.extracted_root / item.path
                target = self.repo_root / item.path
                atomic_write_bytes(target, source.read_bytes())
                applied_paths.append(item.path)
            log(f"Installed {len(package.files)} content and media file(s).")

            cache_version = self._bump_cache_version()
            applied_paths.append("web/index.html")
            log(f"Bumped browser cache version to {cache_version}.")

            release_marker = {
                "release_id": release_id,
                "title": manifest["title"],
                "published_at": iso_now(),
                "cache_version": cache_version,
                "articles": manifest["articles"],
                "manager_version": APP_VERSION,
            }
            atomic_write_text(
                self.repo_root / "web" / "release.json",
                json.dumps(release_marker, indent=2, ensure_ascii=False) + "\n",
            )
            applied_paths.append("web/release.json")

            release_record_path = f"docs/operations/releases/{release_id}.json"
            record = {
                **manifest,
                "validated_at": iso_now(),
                "cache_version": cache_version,
                "manager_version": APP_VERSION,
                "backup_path": str(backup_path),
            }
            atomic_write_text(
                self.repo_root / release_record_path,
                json.dumps(record, indent=2, ensure_ascii=False) + "\n",
            )
            applied_paths.append(release_record_path)

            log("Running route, asset, feed, and syntax checks…")
            self._validate_applied_release(package, cache_version)
            log("All release checks passed.")

            expected = sorted(set(applied_paths))
            self.repo.git("add", "--", *expected)
            staged = [
                line.strip()
                for line in self.repo.git("diff", "--cached", "--name-only").splitlines()
                if line.strip()
            ]
            unexpected = sorted(set(staged) - set(expected))
            missing_staged = sorted(set(expected) - set(staged))
            if unexpected:
                raise ReleaseManagerError(
                    "Unexpected files were staged; release stopped: " + ", ".join(unexpected)
                )
            if missing_staged:
                # Unchanged package files are legitimate, but index/release marker must change.
                required = {"web/index.html", "web/release.json", release_record_path}
                missing_required = sorted(required.intersection(missing_staged))
                if missing_required:
                    raise ReleaseManagerError(
                        "Required release files did not stage: " + ", ".join(missing_required)
                    )
            log(f"Staged {len(staged)} file(s) for the release commit.")

            commit_message = manifest["commit_message"].strip()
            self.repo.git("commit", "-m", commit_message, timeout=240)
            commit = self.repo.git("rev-parse", "--short=12", "HEAD")
            log(f"Created commit {commit}: {commit_message}")

            pushed = False
            deployed = False
            if push:
                log("Pushing the approved release to GitHub…")
                self.repo.git("push", "origin", "main", timeout=300)
                pushed = True
                log("GitHub accepted the release. Cloudflare deployment has started.")
                if verify_deployment:
                    deployed = self._wait_for_deployment(release_id, log)
            else:
                log("Push skipped by command-line option.")

            live_url = f"{self.site_url}/?release={cache_version}#/article/{quote(manifest['articles'][0]['slug'])}"
            return PublishResult(
                release_id=release_id,
                cache_version=cache_version,
                commit=commit,
                pushed=pushed,
                deployed=deployed,
                live_url=live_url,
                backup_path=str(backup_path),
                staged_files=staged,
            )
        except Exception:
            # If no commit exists yet for this release, restore the working tree atomically.
            status = self.repo.status_porcelain()
            if status:
                try:
                    self.repo.git("reset", "--mixed", "HEAD", check=False)
                    self._restore_backup(backup_path, managed_paths, new_files_before)
                    if release_record_path:
                        (self.repo_root / release_record_path).unlink(missing_ok=True)
                    log("Release failed before publication. Local files were restored from backup.")
                except Exception as restore_exc:
                    log(f"WARNING: automatic restore failed: {restore_exc}")
            raise

    def _create_backup(self, release_id: str, paths: Iterable[str]) -> Path:
        timestamp = utc_now().strftime("%Y%m%dT%H%M%SZ")
        safe_id = re.sub(r"[^A-Za-z0-9._-]+", "-", release_id)
        backup_dir = self.storage_root / "backups"
        backup_dir.mkdir(parents=True, exist_ok=True)
        backup_path = backup_dir / f"{timestamp}-{safe_id}.zip"
        manifest: dict[str, Any] = {"created_at": iso_now(), "files": []}
        with zipfile.ZipFile(backup_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for rel in sorted(set(paths)):
                source = self.repo_root / rel
                exists = source.is_file()
                manifest["files"].append({"path": rel, "existed": exists})
                if exists:
                    archive.write(source, f"files/{rel}")
            archive.writestr("backup.json", json.dumps(manifest, indent=2))
        return backup_path

    def _restore_backup(self, backup_path: Path, managed_paths: list[str], new_files_before: set[str]) -> None:
        with zipfile.ZipFile(backup_path, "r") as archive:
            backup_manifest = json.loads(archive.read("backup.json").decode("utf-8"))
            backed_up = {entry["path"]: entry["existed"] for entry in backup_manifest["files"]}
            for rel in managed_paths:
                target = self.repo_root / rel
                if backed_up.get(rel):
                    data = archive.read(f"files/{rel}")
                    atomic_write_bytes(target, data)
                elif rel in new_files_before or rel in backed_up:
                    target.unlink(missing_ok=True)

    def _bump_cache_version(self) -> int:
        index_path = self.repo_root / "web" / "index.html"
        text = index_path.read_text("utf-8")
        versions = [int(value) for value in re.findall(r"[?&]b=(\d+)", text)]
        if not versions:
            raise ReleaseManagerError(
                "web/index.html has no ?b=N cache markers. Release Manager cannot guarantee fresh content."
            )
        new_version = max(versions) + 1
        updated = re.sub(r"([?&]b=)\d+", lambda match: f"{match.group(1)}{new_version}", text)
        atomic_write_text(index_path, updated)
        return new_version

    def _validate_applied_release(self, package: InspectedPackage, cache_version: int) -> None:
        # Exact file integrity after installation.
        for item in package.files:
            target = self.repo_root / item.path
            if not target.is_file():
                raise ReleaseManagerError(f"Installed release file is missing: {item.path}")
            if sha256_file(target) != item.sha256:
                raise ReleaseManagerError(f"Installed release file failed checksum: {item.path}")
            if target.suffix.lower() == ".js":
                validate_content_js(target)
            elif target.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".pdf"}:
                validate_image_magic(target)

        # Every cache marker must agree; mixed versions can recreate the stale-content bug.
        index_text = (self.repo_root / "web" / "index.html").read_text("utf-8")
        versions = {int(value) for value in re.findall(r"[?&]b=(\d+)", index_text)}
        if versions != {cache_version}:
            raise ReleaseManagerError(
                f"Cache markers are inconsistent after update: {sorted(versions)}"
            )

        # RSS and sitemap should remain valid XML whenever they exist.
        for rel in ("web/rss.xml", "web/sitemap.xml"):
            path = self.repo_root / rel
            if path.exists():
                try:
                    ElementTree.parse(path)
                except ElementTree.ParseError as exc:
                    raise ReleaseManagerError(f"Invalid XML in {rel}: {exc}") from exc

        # Article routes and images must be discoverable in one of the deployed article stores.
        article_data_paths = (
            "web/data/articles.js",
            "web/data/live-articles.js",
            "web/data/research.js",
            "web/data/newsroom-articles.js",
        )
        article_data_text = "\n".join(
            (self.repo_root / rel).read_text("utf-8")
            for rel in article_data_paths
            if (self.repo_root / rel).exists()
        )
        for article in package.manifest["articles"]:
            for field in ("id", "slug"):
                if article[field] not in article_data_text:
                    raise ReleaseManagerError(
                        f"Article {field} is absent from deployed article data: {article[field]}"
                    )
            image = normalize_release_path(article["image"])
            if not image.startswith("assets/"):
                raise ReleaseManagerError(
                    f"Article image must be web-relative under assets/: {article['image']}"
                )
            image_path = self.repo_root / "web" / image
            if not image_path.is_file():
                raise ReleaseManagerError(
                    f"Article image is missing from the site: web/{article['image']}"
                )

        # Duplicate slug scan across all public article data sources.
        slug_locations: dict[str, list[str]] = {}
        slug_pattern = re.compile(r"(?:[\"']?slug[\"']?)\s*:\s*[\"']([^\"']+)[\"']")
        for rel in (
            "web/data/articles.js",
            "web/data/live-articles.js",
            "web/data/research.js",
            "web/data/newsroom-articles.js",
        ):
            path = self.repo_root / rel
            if not path.exists():
                continue
            for slug in slug_pattern.findall(path.read_text("utf-8")):
                slug_locations.setdefault(slug, []).append(rel)
        duplicates = {slug: locs for slug, locs in slug_locations.items() if len(locs) > 1}
        if duplicates:
            details = "; ".join(f"{slug} ({', '.join(locs)})" for slug, locs in duplicates.items())
            raise ReleaseManagerError(f"Duplicate article slugs detected: {details}")

        # Use Node for a real syntax check when available; remain dependency-free otherwise.
        node = shutil.which("node")
        if node:
            for item in package.files:
                if item.path.endswith(".js"):
                    run_process([node, "--check", str(self.repo_root / item.path)], self.repo_root)

    def _wait_for_deployment(self, release_id: str, log: Callable[[str], None]) -> bool:
        marker_url = f"{self.site_url}/release.json?probe={int(time.time())}"
        deadline = time.monotonic() + 240
        attempt = 0
        while time.monotonic() < deadline:
            attempt += 1
            try:
                request = urllib.request.Request(
                    marker_url,
                    headers={
                        "User-Agent": f"RTFCLMGZN-Release-Manager/{APP_VERSION}",
                        "Cache-Control": "no-cache",
                        "Pragma": "no-cache",
                    },
                )
                with urllib.request.urlopen(request, timeout=12) as response:
                    payload = json.loads(response.read().decode("utf-8"))
                if payload.get("release_id") == release_id:
                    log("Cloudflare is serving the new release on rtfclmgzn.com.")
                    return True
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError):
                pass
            if attempt == 1 or attempt % 4 == 0:
                log("Waiting for Cloudflare to publish the release…")
            time.sleep(5)
        log(
            "GitHub push succeeded, but live-site confirmation timed out after four minutes. "
            "The deployment may still be completing; use Open live site to check."
        )
        return False


class TaskState:
    def __init__(self, task_id: str):
        self.task_id = task_id
        self.status = "running"
        self.logs: list[str] = []
        self.result: dict[str, Any] | None = None
        self.error: str | None = None
        self.lock = threading.Lock()

    def log(self, message: str) -> None:
        stamp = datetime.now().strftime("%H:%M:%S")
        with self.lock:
            self.logs.append(f"[{stamp}] {message}")

    def snapshot(self) -> dict[str, Any]:
        with self.lock:
            return {
                "task_id": self.task_id,
                "status": self.status,
                "logs": list(self.logs),
                "result": self.result,
                "error": self.error,
            }


class ReleaseManagerApplication:
    def __init__(self, repo_root: Path, site_url: str):
        self.repo_root = repo_root
        self.site_url = site_url
        self.storage_root = app_data_root()
        self.inspector = ReleasePackageInspector(self.storage_root)
        self.publisher = Publisher(repo_root, site_url)
        self.packages: dict[str, InspectedPackage] = {}
        self.tasks: dict[str, TaskState] = {}
        self.lock = threading.Lock()

    def inspect_upload(self, filename: str, data: bytes) -> dict[str, Any]:
        package = self.inspector.inspect_bytes(filename, data)
        with self.lock:
            self.packages[package.package_id] = package
        return package.summary()

    def start_publish(self, package_id: str, confirm_release_id: str) -> str:
        with self.lock:
            package = self.packages.get(package_id)
            if not package:
                raise ReleaseManagerError("The selected package is no longer available. Upload it again.")
            expected_release_id = str(package.manifest.get("release_id") or "")
            if not secrets.compare_digest(str(confirm_release_id or ""), expected_release_id):
                raise ReleaseManagerError("Owner confirmation did not match the exact release ID. Nothing was published.")
            task_id = secrets.token_urlsafe(16)
            task = TaskState(task_id)
            self.tasks[task_id] = task

        def worker() -> None:
            try:
                result = self.publisher.publish(package, task.log)
                with task.lock:
                    task.result = result.to_dict()
                    task.status = "succeeded"
            except Exception as exc:
                with task.lock:
                    task.error = str(exc)
                    task.status = "failed"
                task.log(f"ERROR: {exc}")

        threading.Thread(target=worker, name=f"publish-{task_id}", daemon=True).start()
        return task_id

    def task_status(self, task_id: str) -> dict[str, Any]:
        with self.lock:
            task = self.tasks.get(task_id)
        if not task:
            raise ReleaseManagerError("Unknown publish task.")
        return task.snapshot()


class ReleaseManagerHandler(BaseHTTPRequestHandler):
    server_version = "RTFCLReleaseManager/1.2"

    @property
    def app(self) -> ReleaseManagerApplication:
        return self.server.app  # type: ignore[attr-defined]

    @property
    def token(self) -> str:
        return self.server.auth_token  # type: ignore[attr-defined]

    @property
    def ui_root(self) -> Path:
        return self.server.ui_root  # type: ignore[attr-defined]

    def log_message(self, fmt: str, *args: Any) -> None:
        return

    def _send_bytes(self, status: int, content_type: str, data: bytes) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'")
        self.end_headers()
        self.wfile.write(data)

    def _send_json(self, status: int, payload: Any) -> None:
        self._send_bytes(
            status,
            "application/json; charset=utf-8",
            json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        )

    def _authorized(self) -> bool:
        header = self.headers.get("X-RTFC-Token")
        query_token = parse_qs(urlparse(self.path).query).get("token", [None])[0]
        return secrets.compare_digest(str(header or query_token or ""), self.token)

    def _require_auth(self) -> bool:
        if self._authorized():
            return True
        self._send_json(HTTPStatus.FORBIDDEN, {"ok": False, "error": "Invalid local session token."})
        return False

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path == "/":
            if not self._authorized():
                self._send_bytes(HTTPStatus.FORBIDDEN, "text/plain; charset=utf-8", b"Invalid local session token.")
                return
            html = (self.ui_root / "index.html").read_text("utf-8").replace("__SESSION_TOKEN__", self.token)
            self._send_bytes(HTTPStatus.OK, "text/html; charset=utf-8", html.encode("utf-8"))
            return
        if parsed.path in {"/styles.css", "/app.js"}:
            target = self.ui_root / parsed.path.lstrip("/")
            if not target.exists():
                self.send_error(HTTPStatus.NOT_FOUND)
                return
            content_type = "text/css; charset=utf-8" if target.suffix == ".css" else "application/javascript; charset=utf-8"
            self._send_bytes(HTTPStatus.OK, content_type, target.read_bytes())
            return
        if parsed.path == "/api/status":
            if not self._require_auth():
                return
            self._send_json(
                HTTPStatus.OK,
                {
                    "ok": True,
                    "app": {"name": APP_NAME, "version": APP_VERSION},
                    "repository": self.app.publisher.repository_status(),
                    "site_url": self.app.site_url,
                },
            )
            return
        if parsed.path == "/api/task":
            if not self._require_auth():
                return
            task_id = parse_qs(parsed.query).get("id", [""])[0]
            try:
                self._send_json(HTTPStatus.OK, {"ok": True, "task": self.app.task_status(task_id)})
            except ReleaseManagerError as exc:
                self._send_json(HTTPStatus.NOT_FOUND, {"ok": False, "error": str(exc)})
            return
        self.send_error(HTTPStatus.NOT_FOUND)

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if not self._require_auth():
            return
        try:
            if parsed.path == "/api/package":
                length = int(self.headers.get("Content-Length", "0"))
                if length <= 0:
                    raise ReleaseManagerError("No package data was received.")
                if length > MAX_UPLOAD_BYTES:
                    raise ReleaseManagerError("Release package exceeds the 250 MB safety limit.")
                filename = self.headers.get("X-RTFC-Filename", "release.zip")
                data = self.rfile.read(length)
                summary = self.app.inspect_upload(filename, data)
                self._send_json(HTTPStatus.OK, {"ok": True, "package": summary})
                return
            if parsed.path == "/api/publish":
                payload = self._read_json_body()
                package_id = str(payload.get("package_id", ""))
                confirm_release_id = str(payload.get("confirm_release_id", ""))
                task_id = self.app.start_publish(package_id, confirm_release_id)
                self._send_json(HTTPStatus.ACCEPTED, {"ok": True, "task_id": task_id})
                return
            if parsed.path == "/api/open-folder":
                self._open_path(self.app.repo_root)
                self._send_json(HTTPStatus.OK, {"ok": True})
                return
            raise ReleaseManagerError("Unknown API endpoint.")
        except ReleaseManagerError as exc:
            self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(exc)})
        except Exception as exc:
            self._send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"ok": False, "error": str(exc)})

    def _read_json_body(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > 1024 * 1024:
            raise ReleaseManagerError("Invalid request body.")
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ReleaseManagerError("Request body is not valid JSON.") from exc
        if not isinstance(payload, dict):
            raise ReleaseManagerError("Request body must be a JSON object.")
        return payload

    @staticmethod
    def _open_path(path: Path) -> None:
        if os.name == "nt":
            os.startfile(str(path))  # type: ignore[attr-defined]
        elif sys.platform == "darwin":
            subprocess.Popen(["open", str(path)])
        else:
            subprocess.Popen(["xdg-open", str(path)])


class LocalServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(
        self,
        address: tuple[str, int],
        handler: type[BaseHTTPRequestHandler],
        app: ReleaseManagerApplication,
        auth_token: str,
        ui_root: Path,
    ):
        super().__init__(address, handler)
        self.app = app
        self.auth_token = auth_token
        self.ui_root = ui_root


def choose_port(preferred: int) -> int:
    for port in [preferred, *range(preferred + 1, preferred + 20)]:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            try:
                sock.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise ReleaseManagerError("Could not find an available local port for the Release Manager.")


def launch_server(repo_root: Path, site_url: str, port: int) -> int:
    ui_root = Path(__file__).resolve().parent / "ui"
    if not (ui_root / "index.html").exists():
        raise ReleaseManagerError(f"Release Manager UI files are missing from {ui_root}")
    token = secrets.token_urlsafe(32)
    app = ReleaseManagerApplication(repo_root, site_url)
    selected_port = choose_port(port)
    server = LocalServer(
        ("127.0.0.1", selected_port),
        ReleaseManagerHandler,
        app,
        token,
        ui_root,
    )
    url = f"http://127.0.0.1:{selected_port}/?token={quote(token)}"
    print(f"{APP_NAME} {APP_VERSION}")
    print(f"Project: {repo_root}")
    print(f"Local interface: {url}")
    print("Keep this window open while publishing. Press Ctrl+C to stop.")
    threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever(poll_interval=0.3)
    except KeyboardInterrupt:
        print("\nRelease Manager stopped.")
    finally:
        server.server_close()
    return 0


def cli_inspect(repo_root: Path, archive: Path) -> int:
    inspector = ReleasePackageInspector(app_data_root())
    package = inspector.inspect_path(archive)
    print(json.dumps(package.summary(), indent=2, ensure_ascii=False))
    return 0


def cli_publish(
    repo_root: Path,
    archive: Path,
    site_url: str,
    push: bool,
    verify: bool,
    assume_yes: bool,
) -> int:
    inspector = ReleasePackageInspector(app_data_root())
    package = inspector.inspect_path(archive)
    print(json.dumps(package.summary(), indent=2, ensure_ascii=False))
    if not assume_yes:
        answer = input("Publish this release? Type PUBLISH to continue: ").strip()
        if answer != "PUBLISH":
            print("Cancelled.")
            return 2
    publisher = Publisher(repo_root, site_url)
    result = publisher.publish(package, print, push=push, verify_deployment=verify)
    print(json.dumps(result.to_dict(), indent=2, ensure_ascii=False))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=APP_NAME)
    parser.add_argument("--project", type=Path, help="Path to the RTFCLMGZN Git repository")
    parser.add_argument("--site-url", default=DEFAULT_SITE_URL)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--inspect", type=Path, metavar="RELEASE_ZIP")
    parser.add_argument("--publish", type=Path, metavar="RELEASE_ZIP")
    parser.add_argument("--yes", action="store_true", help="Skip CLI confirmation")
    parser.add_argument("--no-push", action="store_true", help="Commit locally without pushing")
    parser.add_argument("--no-verify", action="store_true", help="Do not wait for Cloudflare confirmation")
    parser.add_argument("--version", action="version", version=APP_VERSION)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        repo_root = (
            args.project.expanduser().resolve()
            if args.project
            else find_repo_root(Path(__file__))
        )
        if args.inspect:
            return cli_inspect(repo_root, args.inspect.expanduser().resolve())
        if args.publish:
            return cli_publish(
                repo_root,
                args.publish.expanduser().resolve(),
                args.site_url,
                push=not args.no_push,
                verify=not args.no_verify,
                assume_yes=args.yes,
            )
        return launch_server(repo_root, args.site_url, args.port)
    except ReleaseManagerError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"UNEXPECTED ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
