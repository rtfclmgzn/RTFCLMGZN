from __future__ import annotations

import hashlib
import ipaddress
import re
from difflib import SequenceMatcher
from pathlib import Path
from typing import Iterable
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

TRACKING_QUERY_PREFIXES = ("utm_", "ref", "source", "campaign", "fbclid", "gclid")


def is_public_http_url(url: str) -> bool:
    """Return True only for syntactically public HTTP(S) URLs.

    This is a deterministic SSRF and citation-integrity guard. It deliberately
    rejects embedded credentials, localhost-like names, non-default ports, and
    literal private/reserved IP addresses. It does not perform DNS resolution.
    """

    try:
        parts = urlsplit(str(url or "").strip())
        port = parts.port
    except (TypeError, ValueError):
        return False
    if parts.scheme.lower() not in {"http", "https"}:
        return False
    if not parts.hostname or parts.username or parts.password:
        return False
    hostname = parts.hostname.rstrip(".").lower()
    if (
        hostname == "localhost"
        or hostname.endswith((".localhost", ".local", ".internal", ".lan", ".home"))
        or "." not in hostname
    ):
        return False
    if port not in {None, 80, 443}:
        return False
    try:
        address = ipaddress.ip_address(hostname)
    except ValueError:
        # Reject control characters and whitespace even if urlsplit tolerated them.
        return not any(character.isspace() or ord(character) < 32 for character in hostname)
    return not (
        address.is_private
        or address.is_loopback
        or address.is_link_local
        or address.is_multicast
        or address.is_reserved
        or address.is_unspecified
    )


def normalize_text(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9\s]", " ", value)
    value = re.sub(r"\s+", " ", value)
    return value


def title_similarity(left: str, right: str) -> float:
    return SequenceMatcher(None, normalize_text(left), normalize_text(right)).ratio()


def canonical_url(url: str) -> str:
    parts = urlsplit(url.strip())
    hostname = (parts.hostname or "").lower()
    port = parts.port
    netloc = hostname
    if port and not ((parts.scheme == "https" and port == 443) or (parts.scheme == "http" and port == 80)):
        netloc = f"{hostname}:{port}"
    clean_query = [
        (key, value)
        for key, value in parse_qsl(parts.query, keep_blank_values=True)
        if not any(key.lower().startswith(prefix) for prefix in TRACKING_QUERY_PREFIXES)
    ]
    path = re.sub(r"/{2,}", "/", parts.path or "/")
    if path != "/":
        path = path.rstrip("/")
    return urlunsplit((parts.scheme.lower(), netloc, path, urlencode(clean_query), ""))


def source_fingerprint(urls: Iterable[str]) -> str:
    normalized = sorted({canonical_url(url) for url in urls if url})
    return hashlib.sha256("\n".join(normalized).encode("utf-8")).hexdigest()


def story_key(title: str, source_urls: Iterable[str]) -> str:
    payload = normalize_text(title) + "\n" + source_fingerprint(source_urls)
    return "story:" + hashlib.sha256(payload.encode("utf-8")).hexdigest()


def read_existing_titles(repo_root: Path) -> list[str]:
    titles: list[str] = []
    pattern = re.compile(r"(?:[\"']?title[\"']?)\s*:\s*[\"']([^\"']+)[\"']")
    for rel in (
        "web/data/articles.js",
        "web/data/live-articles.js",
        "web/data/research.js",
        "web/data/newsroom-articles.js",
    ):
        path = repo_root / rel
        if path.is_file():
            try:
                titles.extend(pattern.findall(path.read_text("utf-8")))
            except UnicodeDecodeError:
                continue
    return titles
