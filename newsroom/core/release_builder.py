from __future__ import annotations

import html
import json
import re
import shutil
import tempfile
import uuid
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import format_datetime
from pathlib import Path
from typing import Any
from xml.etree import ElementTree

from .contracts import content_hash, utc_now


class ReleaseBuildError(RuntimeError):
    pass


@dataclass(frozen=True)
class BuiltRelease:
    release_id: str
    archive_path: Path
    article_id: str
    slug: str
    files: tuple[str, ...]


ARTICLE_ASSIGNMENT = "window.RTFC_NEWSROOM_ARTICLES"


def _sha256_file(path: Path) -> str:
    import hashlib

    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _load_generated_articles(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    text = path.read_text("utf-8")
    pattern = re.compile(
        r"^\s*window\.RTFC_NEWSROOM_ARTICLES\s*=\s*(\[.*\])\s*;\s*$",
        re.DOTALL,
    )
    match = pattern.match(text)
    if not match:
        raise ReleaseBuildError(
            "web/data/newsroom-articles.js is not in the controlled JSON-assignment format"
        )
    try:
        value = json.loads(match.group(1))
    except json.JSONDecodeError as exc:
        raise ReleaseBuildError(f"Invalid generated article data: {exc}") from exc
    if not isinstance(value, list):
        raise ReleaseBuildError("Generated article data must be an array")
    return value


def _write_generated_articles(path: Path, articles: list[dict[str, Any]]) -> None:
    text = (
        "// Generated only by RTFCLMGZN Newsroom Core after exact-version owner approval.\n"
        f"{ARTICLE_ASSIGNMENT} = "
        + json.dumps(articles, indent=2, ensure_ascii=False)
        + ";\n"
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, "utf-8")


def _read_public_slugs(repo_root: Path) -> set[str]:
    result: set[str] = set()
    pattern = re.compile(r"(?:[\"']?slug[\"']?)\s*:\s*[\"']([^\"']+)[\"']")
    for rel in (
        "web/data/articles.js",
        "web/data/live-articles.js",
        "web/data/research.js",
        "web/data/newsroom-articles.js",
    ):
        path = repo_root / rel
        if path.exists():
            result.update(pattern.findall(path.read_text("utf-8")))
    return result


def _svg_artwork(title: str, section: str) -> bytes:
    escaped_title = html.escape(title)
    escaped_section = html.escape(section.upper())
    # No scripts, external references, event attributes, or embedded user HTML.
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#0b0b12"/>
    <stop offset="0.52" stop-color="#211837"/>
    <stop offset="1" stop-color="#091b25"/>
  </linearGradient>
  <pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse">
    <path d="M 64 0 L 0 0 0 64" fill="none" stroke="#ffffff" stroke-opacity="0.055" stroke-width="1"/>
  </pattern>
</defs>
<rect width="1600" height="900" fill="url(#bg)"/>
<rect width="1600" height="900" fill="url(#grid)"/>
<circle cx="1300" cy="120" r="420" fill="#8b7cf7" fill-opacity="0.16"/>
<circle cx="220" cy="780" r="360" fill="#4dd0c4" fill-opacity="0.12"/>
<path d="M100 695 H1500" stroke="#ffffff" stroke-opacity="0.18"/>
<text x="100" y="130" fill="#8b7cf7" font-family="Arial, Helvetica, sans-serif" font-size="30" letter-spacing="7">RTFCLMGZN // {escaped_section}</text>
<foreignObject x="100" y="220" width="1320" height="420">
  <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:82px;line-height:1.05;color:#f5f1ff;letter-spacing:-2px;">{escaped_title}</div>
</foreignObject>
<text x="100" y="765" fill="#f5f1ff" fill-opacity="0.62" font-family="Arial, Helvetica, sans-serif" font-size="25" letter-spacing="4">AI-NATIVE · EVIDENCE-FIRST · HUMAN-GOVERNED</text>
<text x="100" y="830" fill="#4dd0c4" font-family="Arial, Helvetica, sans-serif" font-size="26" letter-spacing="5">RTFCLMGZN.COM</text>
</svg>'''
    return svg.encode("utf-8")


def _update_rss(source: Path, target: Path, article: dict[str, Any]) -> None:
    text = source.read_text("utf-8")
    try:
        ElementTree.fromstring(text)
    except ElementTree.ParseError as exc:
        raise ReleaseBuildError(f"Current RSS is invalid: {exc}") from exc
    published = datetime.fromisoformat(article["publishedAt"].replace("Z", "+00:00"))
    published_rfc = format_datetime(published)
    now_rfc = format_datetime(datetime.now(timezone.utc))
    item = f'''  <item>
    <title>{html.escape(article["title"])}</title>
    <link>https://rtfclmgzn.com/#/article/{html.escape(article["slug"])}</link>
    <guid isPermaLink="false">rtfclmgzn-{html.escape(article["id"])}</guid>
    <pubDate>{published_rfc}</pubDate>
    <description>{html.escape(article["dek"])}</description>
  </item>

'''
    if "<lastBuildDate>" in text:
        text = re.sub(
            r"<lastBuildDate>.*?</lastBuildDate>",
            f"<lastBuildDate>{now_rfc}</lastBuildDate>",
            text,
            count=1,
        )
    marker = "  <item>"
    if marker in text:
        text = text.replace(marker, item + marker, 1)
    elif "</channel>" in text:
        text = text.replace("</channel>", item + "</channel>", 1)
    else:
        raise ReleaseBuildError("RSS channel closing tag is missing")
    try:
        ElementTree.fromstring(text)
    except ElementTree.ParseError as exc:
        raise ReleaseBuildError(f"Generated RSS is invalid: {exc}") from exc
    target.write_text(text, "utf-8")


class ReleaseBuilder:
    def __init__(self, repo_root: Path, releases_dir: Path):
        self.repo_root = repo_root.resolve()
        self.releases_dir = releases_dir.resolve()
        self.releases_dir.mkdir(parents=True, exist_ok=True)

    def build(
        self,
        *,
        story_id: str,
        story: dict[str, Any],
        artifacts: list[dict[str, Any]],
        approval: dict[str, Any],
        artwork_path: Path | None,
    ) -> BuiltRelease:
        existing_slugs = _read_public_slugs(self.repo_root)
        if story["slug"] in existing_slugs:
            raise ReleaseBuildError(f"A public article already uses slug {story['slug']}")

        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        release_id = f"{stamp}-{story['slug']}"[:80]
        article_id = f"newsroom-{story_id.split('-')[0]}"
        published_at = utc_now()
        article = {
            "id": article_id,
            "slug": story["slug"],
            "image": "",
            "title": story["title"],
            "dek": story["dek"],
            "persona": story["persona"],
            "section": story["section"],
            "format": story["format"],
            "top": False,
            "publishedAt": published_at,
            "sample": False,
            "disclaimer": story.get("disclaimer") or "none",
            "body": story["body"],
            "tldr": story.get("tldr") or [],
            "apply": story.get("apply") or [],
            "links": story.get("links") or [],
            "sources": [
                {"label": source["label"], "url": source["url"]}
                for source in story["sources"]
            ],
            "corrections": story.get("corrections") or [],
            "pipeline": {
                "run": f"newsroom-core · {published_at}",
                "stages": [
                    {
                        "name": f"Checkpoint {a['checkpoint']}",
                        "agent": a["agent_id"],
                        "note": str((a.get("content") or {}).get("summary") or a["artifact_type"]),
                    }
                    for a in artifacts
                    if int(a["checkpoint"]) <= 9
                ],
                "gate": {
                    "decision": "Approved for owner-directed publication",
                    "note": f"Exact artifact {approval['artifact_sha256'][:12]} approved by {approval['approver']}.",
                },
            },
        }

        with tempfile.TemporaryDirectory(prefix="rtfcl-release-") as temp_name:
            temp_root = Path(temp_name)
            payload_root = temp_root / "payload"
            generated_source = self.repo_root / "web" / "data" / "newsroom-articles.js"
            generated_target = payload_root / "web" / "data" / "newsroom-articles.js"
            generated_target.parent.mkdir(parents=True, exist_ok=True)
            articles = _load_generated_articles(generated_source)

            image_suffix = ".svg"
            if artwork_path and artwork_path.is_file():
                image_suffix = artwork_path.suffix.lower()
            image_rel = f"assets/img/newsroom/{article_id}{image_suffix}"
            image_target = payload_root / "web" / image_rel
            image_target.parent.mkdir(parents=True, exist_ok=True)
            if artwork_path and artwork_path.is_file():
                shutil.copy2(artwork_path, image_target)
            else:
                image_target.write_bytes(_svg_artwork(article["title"], article["section"]))
            article["image"] = image_rel

            articles.insert(0, article)
            articles.sort(key=lambda item: item.get("publishedAt", ""), reverse=True)
            _write_generated_articles(generated_target, articles)

            rss_source = self.repo_root / "web" / "rss.xml"
            rss_target = payload_root / "web" / "rss.xml"
            rss_target.parent.mkdir(parents=True, exist_ok=True)
            _update_rss(rss_source, rss_target, article)

            payload_paths = [
                "web/data/newsroom-articles.js",
                "web/rss.xml",
                f"web/{image_rel}",
            ]
            files: list[dict[str, Any]] = []
            for rel in payload_paths:
                path = payload_root / rel
                files.append(
                    {
                        "path": rel,
                        "sha256": _sha256_file(path),
                        "size": path.stat().st_size,
                    }
                )
            manifest = {
                "schema_version": 1,
                "release_id": release_id,
                "title": article["title"],
                "created_at": published_at,
                "commit_message": f"Publish newsroom story: {article['title'][:120]}",
                "articles": [
                    {
                        "id": article_id,
                        "slug": article["slug"],
                        "title": article["title"],
                        "image": article["image"],
                    }
                ],
                "approval": {
                    "approver": approval["approver"],
                    "artifact_id": approval["artifact_id"],
                    "artifact_sha256": approval["artifact_sha256"],
                    "approved_at": approval["created_at"],
                },
                "files": files,
            }
            archive_path = self.releases_dir / f"{release_id}.zip"
            with zipfile.ZipFile(
                archive_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9
            ) as archive:
                archive.writestr(
                    "release.json", json.dumps(manifest, indent=2, ensure_ascii=False) + "\n"
                )
                for rel in payload_paths:
                    archive.write(payload_root / rel, f"payload/{rel}")
            return BuiltRelease(
                release_id=release_id,
                archive_path=archive_path,
                article_id=article_id,
                slug=article["slug"],
                files=tuple(payload_paths),
            )
