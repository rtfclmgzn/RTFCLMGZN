from __future__ import annotations

import gzip
import hashlib
import html
import ipaddress
import json
import re
import socket
import time
import urllib.error
import urllib.request
import zlib
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urlsplit

from .dedupe import canonical_url, is_public_http_url


class SourceFetchError(RuntimeError):
    pass


class _NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Reject redirects so a discovered URL cannot redirect into a private network."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):  # type: ignore[override]
        return None


_OPENER = urllib.request.build_opener(_NoRedirectHandler())


@dataclass(frozen=True)
class SourceDocument:
    url: str
    canonical_url: str
    title: str
    publisher: str
    source_class: str
    published_at: str
    excerpt: str
    fetched_at: str
    content_sha256: str
    fetch_status: str
    cache_hit: bool
    error: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class _TextExtractor(HTMLParser):
    BLOCK_TAGS = {
        "article",
        "aside",
        "blockquote",
        "br",
        "dd",
        "div",
        "dl",
        "dt",
        "figcaption",
        "figure",
        "footer",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "header",
        "li",
        "main",
        "nav",
        "ol",
        "p",
        "pre",
        "section",
        "table",
        "td",
        "th",
        "tr",
        "ul",
    }
    SKIP_TAGS = {"script", "style", "noscript", "svg", "canvas", "template"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.skip_depth = 0
        self.title_parts: list[str] = []
        self.in_title = False

    def handle_starttag(self, tag: str, attrs) -> None:  # type: ignore[override]
        tag = tag.lower()
        if tag in self.SKIP_TAGS:
            self.skip_depth += 1
        if tag == "title":
            self.in_title = True
        if not self.skip_depth and tag in self.BLOCK_TAGS:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:  # type: ignore[override]
        tag = tag.lower()
        if tag == "title":
            self.in_title = False
        if tag in self.SKIP_TAGS and self.skip_depth:
            self.skip_depth -= 1
        if not self.skip_depth and tag in self.BLOCK_TAGS:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if self.skip_depth:
            return
        if self.in_title:
            self.title_parts.append(data)
        self.parts.append(data)

    def text(self) -> str:
        value = html.unescape(" ".join(self.parts))
        value = re.sub(r"[\t\f\v ]+", " ", value)
        value = re.sub(r"\s*\n\s*", "\n", value)
        value = re.sub(r"\n{3,}", "\n\n", value)
        return value.strip()

    def title(self) -> str:
        return re.sub(r"\s+", " ", " ".join(self.title_parts)).strip()


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _is_public_ip(address: str) -> bool:
    try:
        ip = ipaddress.ip_address(address)
    except ValueError:
        return False
    return not (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


def _assert_public_dns(url: str) -> None:
    if not is_public_http_url(url):
        raise SourceFetchError("Source URL failed the public HTTP safety policy")
    hostname = urlsplit(url).hostname or ""
    try:
        answers = socket.getaddrinfo(hostname, None, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise SourceFetchError(f"Source hostname could not be resolved: {hostname}") from exc
    addresses = {str(row[4][0]) for row in answers if row and row[4]}
    if not addresses or any(not _is_public_ip(address) for address in addresses):
        raise SourceFetchError("Source hostname resolved to a non-public address")


def _decode_body(body: bytes, headers: Any) -> bytes:
    encoding = str(headers.get("Content-Encoding") or "").lower()
    if encoding == "gzip":
        return gzip.decompress(body)
    if encoding == "deflate":
        try:
            return zlib.decompress(body)
        except zlib.error:
            return zlib.decompress(body, -zlib.MAX_WBITS)
    return body


def _decode_text(body: bytes, content_type: str) -> str:
    charset = "utf-8"
    match = re.search(r"charset=([A-Za-z0-9._-]+)", content_type, re.I)
    if match:
        charset = match.group(1)
    try:
        return body.decode(charset, errors="replace")
    except LookupError:
        return body.decode("utf-8", errors="replace")


class SourceCache:
    """Fetch and reuse source excerpts without repeated model web-search calls.

    Source pages are untrusted evidence. The cache extracts plain text only, rejects
    redirects and private-network destinations, limits response size, and never
    executes page scripts or instructions.
    """

    def __init__(self, root: Path, config: dict[str, Any]):
        self.root = root.resolve()
        batch = config.get("batch") or {}
        fetch = batch.get("source_fetch") or {}
        self.enabled = bool(fetch.get("enabled", True))
        self.timeout_seconds = int(fetch.get("timeout_seconds", 12))
        self.max_bytes = int(fetch.get("max_bytes", 512 * 1024))
        self.max_excerpt_chars = int(fetch.get("max_excerpt_chars", 5000))
        self.cache_ttl_seconds = int(float(fetch.get("cache_ttl_hours", 12)) * 3600)
        self.max_unique_sources = int(fetch.get("max_unique_sources_per_cycle", 12))
        self.cache_dir = self.root / "newsroom" / "data" / "source-cache"
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def fetch_many(self, sources: Iterable[dict[str, Any]]) -> dict[str, SourceDocument]:
        unique: dict[str, dict[str, Any]] = {}
        for raw in sources:
            if not isinstance(raw, dict):
                continue
            url = str(raw.get("url") or "").strip()
            if not is_public_http_url(url):
                continue
            key = canonical_url(url)
            unique.setdefault(key, raw)
            if len(unique) >= self.max_unique_sources:
                break
        result: dict[str, SourceDocument] = {}
        for key, raw in unique.items():
            result[key] = self.fetch(raw)
        return result

    def fetch(self, raw: dict[str, Any]) -> SourceDocument:
        url = str(raw.get("url") or "").strip()
        canonical = canonical_url(url)
        cached = self._read_cache(canonical)
        if cached is not None:
            return cached
        if not self.enabled:
            return self._fallback(raw, "disabled", "Direct source fetching is disabled")
        try:
            _assert_public_dns(url)
            request = urllib.request.Request(
                url,
                method="GET",
                headers={
                    "Accept": "text/html,application/xhtml+xml,text/plain,application/xml;q=0.8,*/*;q=0.2",
                    "Accept-Encoding": "gzip, deflate",
                    "User-Agent": "RTFCLMGZN-Newsroom/0.3.2 (+https://rtfclmgzn.com)",
                },
            )
            with _OPENER.open(request, timeout=self.timeout_seconds) as response:
                content_type = str(response.headers.get("Content-Type") or "").lower()
                allowed = (
                    "text/html",
                    "application/xhtml+xml",
                    "text/plain",
                    "application/xml",
                    "text/xml",
                    "application/rss+xml",
                    "application/atom+xml",
                    "application/json",
                )
                if content_type and not any(kind in content_type for kind in allowed):
                    raise SourceFetchError(f"Unsupported source content type: {content_type[:120]}")
                body = response.read(self.max_bytes + 1)
                if len(body) > self.max_bytes:
                    raise SourceFetchError("Source response exceeded the configured byte limit")
                body = _decode_body(body, response.headers)
                text = _decode_text(body, content_type)
                title = str(raw.get("label") or raw.get("title") or canonical)
                if "html" in content_type or "xhtml" in content_type or "<html" in text[:1000].lower():
                    extractor = _TextExtractor()
                    extractor.feed(text)
                    extracted = extractor.text()
                    title = extractor.title() or title
                else:
                    extracted = re.sub(r"\s+", " ", text).strip()
                excerpt = self._select_excerpt(extracted)
                if len(excerpt) < 160:
                    raise SourceFetchError("Source page yielded too little readable text")
                document = SourceDocument(
                    url=url,
                    canonical_url=canonical,
                    title=title[:300],
                    publisher=str(raw.get("publisher") or "")[:300],
                    source_class=str(raw.get("source_class") or "credible-secondary")[:80],
                    published_at=str(raw.get("published_at") or ""),
                    excerpt=excerpt,
                    fetched_at=_utc_now(),
                    content_sha256=hashlib.sha256(excerpt.encode("utf-8")).hexdigest(),
                    fetch_status="fetched",
                    cache_hit=False,
                )
                self._write_cache(document)
                return document
        except (SourceFetchError, urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError) as exc:
            return self._fallback(raw, "fallback", str(exc))

    def _fallback(self, raw: dict[str, Any], status: str, error: str) -> SourceDocument:
        url = str(raw.get("url") or "").strip()
        canonical = canonical_url(url) if is_public_http_url(url) else url
        notes = str(raw.get("notes") or "").strip()
        supports = raw.get("supports") or []
        support_text = "; ".join(str(item) for item in supports if str(item).strip())
        excerpt = "\n".join(value for value in (notes, support_text) if value).strip()
        document = SourceDocument(
            url=url,
            canonical_url=canonical,
            title=str(raw.get("label") or raw.get("title") or canonical)[:300],
            publisher=str(raw.get("publisher") or "")[:300],
            source_class=str(raw.get("source_class") or "credible-secondary")[:80],
            published_at=str(raw.get("published_at") or ""),
            excerpt=excerpt[: self.max_excerpt_chars],
            fetched_at=_utc_now(),
            content_sha256=hashlib.sha256(excerpt.encode("utf-8")).hexdigest(),
            fetch_status=status,
            cache_hit=False,
            error=error[:1000],
        )
        self._write_cache(document)
        return document

    def _select_excerpt(self, text: str) -> str:
        text = re.sub(r"\n{3,}", "\n\n", text).strip()
        if len(text) <= self.max_excerpt_chars:
            return text
        # Keep the opening material and a closing window; many official pages put
        # methodology, qualifications, or contact context near the end.
        head = int(self.max_excerpt_chars * 0.8)
        tail = self.max_excerpt_chars - head
        return text[:head].rstrip() + "\n…\n" + text[-tail:].lstrip()

    def _cache_path(self, canonical: str) -> Path:
        digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
        return self.cache_dir / f"{digest}.json"

    def _read_cache(self, canonical: str) -> SourceDocument | None:
        path = self._cache_path(canonical)
        try:
            age = time.time() - path.stat().st_mtime
            if age > self.cache_ttl_seconds:
                return None
            value = json.loads(path.read_text("utf-8"))
            if value.get("canonical_url") != canonical:
                return None
            value["cache_hit"] = True
            return SourceDocument(**value)
        except (FileNotFoundError, OSError, ValueError, TypeError, json.JSONDecodeError):
            return None

    def _write_cache(self, document: SourceDocument) -> None:
        path = self._cache_path(document.canonical_url)
        temporary = path.with_suffix(".tmp")
        value = document.to_dict()
        value["cache_hit"] = False
        try:
            temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", "utf-8")
            temporary.replace(path)
        except OSError:
            temporary.unlink(missing_ok=True)
