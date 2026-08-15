#!/usr/bin/env python3
"""Generate sitemap.xml from the article stores, and clean RSS links.

WHY (2026-08-14). The site's articles now exist at REAL URLs — /article/<slug>,
served by functions/article/[slug].js — after months of living only behind a
hash fragment that no search engine can see. A real URL that no sitemap names
still takes weeks for a crawler to find, so this script closes the loop:

  1. sitemap.xml — every published article listed at its /article/ URL with
     its real publication date, plus the handful of static crawlable surfaces.
     The old sitemap listed three URLs and contained a comment apologizing for
     the missing articles. That comment is retired with honors.
  2. rss.xml link cleanup — the feed's <link> and <guid> entries pointed at
     /#/article/... fragments. Every fragment link is rewritten in place to the
     real path. (The agents that WRITE the feed still emit fragments until
     their runbooks catch up; running this each CI pass makes that harmless.)

Deterministic, no network, no LLM. Run it after every publish (the CI cover
gate step runs it) and by hand whenever. Idempotent: same stores in, same
bytes out, so re-runs never churn a commit.
"""

from __future__ import annotations

import io
import json
import re
import sys
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent.parent
WEB = ROOT / "web"
SITE = "https://rtfclmgzn.com"

STORES = [
    WEB / "data" / "newsroom-articles.js",
    WEB / "data" / "live-articles.js",
    WEB / "data" / "articles.js",
    WEB / "data" / "research.js",
]

# EVERY PAGE, NOT JUST ARTICLES (2026-08-14). Until the router moved off hash
# fragments, these pages had no URL a crawler could fetch, so listing them in a
# sitemap would have been meaningless. They have real URLs now (see
# web/_redirects), so they belong here — a sitemap that names three URLs for a
# site with forty pages is a sitemap that hides thirty-seven of them.
# Keep in sync with _redirects and ROUTE_HEADS; site_guard.py checks all three.
STATIC = [  # (path, changefreq, priority)
    ("/", "hourly", "1.0"),
    ("/buzz", "hourly", "0.8"),
    ("/archive", "daily", "0.8"),
    ("/magazine", "weekly", "0.9"),
    ("/resources", "weekly", "0.8"),
    ("/labs", "weekly", "0.7"),
    ("/extensions", "weekly", "0.7"),
    ("/prompts", "weekly", "0.7"),
    ("/scoreboard", "daily", "0.8"),
    ("/dictionary", "weekly", "0.7"),
    ("/guides", "weekly", "0.7"),
    ("/grid", "daily", "0.7"),
    ("/podcasts", "monthly", "0.5"),
    ("/companies", "daily", "0.6"),
    ("/pulse", "hourly", "0.6"),
    ("/usage", "daily", "0.6"),
    ("/masthead", "monthly", "0.6"),
    ("/predictions", "weekly", "0.5"),
    ("/claims", "weekly", "0.5"),
    ("/corrections", "weekly", "0.5"),
    ("/review", "weekly", "0.4"),
    ("/live", "weekly", "0.4"),
    ("/events", "weekly", "0.4"),
    ("/wallpapers", "monthly", "0.4"),
    ("/contact", "monthly", "0.3"),
    ("/privacy", "yearly", "0.2"),
    ("/terms", "yearly", "0.2"),
    ("/rss.xml", "hourly", "0.8"),
    ("/newsroom-map.html", "monthly", "0.3"),
]


def tolerant_parse(raw: str):
    """JSON first; else strip comments / quote bare keys / fix single-quoted
    strings and trailing commas — same rules as the SSR function's jsonish()."""
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    out, i, last_sig = [], 0, ""
    n = len(raw)
    while i < n:
        c = raw[i]
        if c in "\"'":
            q = c
            i += 1
            buf = []
            while i < n and raw[i] != q:
                if raw[i] == "\\":
                    buf.append(raw[i]); buf.append(raw[i + 1] if i + 1 < n else "")
                    i += 2
                    continue
                buf.append(raw[i]); i += 1
            i += 1
            s = "".join(buf)
            if q == "'":
                s = s.replace("\\'", "'").replace('"', '\\"')
            out.append('"' + s + '"'); last_sig = '"'
            continue
        if c == "/" and i + 1 < n and raw[i + 1] == "/":
            while i < n and raw[i] != "\n":
                i += 1
            continue
        if c == "/" and i + 1 < n and raw[i + 1] == "*":
            i += 2
            while i + 1 < n and not (raw[i] == "*" and raw[i + 1] == "/"):
                i += 1
            i += 2
            continue
        if (c.isalpha() or c in "_$") and last_sig in "{,":
            j = i
            while j < n and (raw[j].isalnum() or raw[j] in "_$"):
                j += 1
            k = j
            while k < n and raw[k].isspace():
                k += 1
            if k < n and raw[k] == ":":
                out.append('"' + raw[i:j] + '"'); last_sig = '"'; i = j
                continue
            out.append(raw[i:j]); last_sig = raw[j - 1]; i = j
            continue
        if c == ",":
            k = i + 1
            while k < n and raw[k].isspace():
                k += 1
            if k < n and raw[k] in "}]":
                i += 1
                continue
            out.append(c); last_sig = c; i += 1
            continue
        out.append(c)
        if not c.isspace():
            last_sig = c
        i += 1
    return json.loads("".join(out))


def slice_array(text: str, start: int) -> str | None:
    depth, i, in_str = 0, start, None
    while i < len(text):
        c = text[i]
        if in_str:
            if c == "\\":
                i += 2
                continue
            if c == in_str:
                in_str = None
        elif c in "\"'":
            in_str = c
        elif c == "[":
            depth += 1
        elif c == "]":
            depth -= 1
            if depth == 0:
                return text[start:i + 1]
        i += 1
    return None


def load_articles() -> list[dict]:
    arts = []
    for store in STORES:
        if not store.is_file():
            continue
        text = io.open(store, encoding="utf-8", newline="").read()
        m = None
        for m in re.finditer(r"window\.[A-Za-z_0-9]+\s*=\s*(?=\[)", text):
            pass
        if not m:
            continue
        raw = slice_array(text, m.end())
        if not raw:
            continue
        try:
            arts.extend(tolerant_parse(raw))
        except Exception as exc:                        # noqa: BLE001
            print(f"gen_sitemap: SKIPPING unparseable store {store.name}: {exc}")
    return [a for a in arts if isinstance(a, dict) and a.get("slug")]


def write_sitemap(arts: list[dict]) -> None:
    seen, rows = set(), []
    for path, freq, pri in STATIC:
        rows.append(
            f"  <url>\n    <loc>{SITE}{escape(path)}</loc>\n"
            f"    <changefreq>{freq}</changefreq>\n    <priority>{pri}</priority>\n  </url>")
    arts_sorted = sorted(arts, key=lambda a: str(a.get("publishedAt") or ""), reverse=True)
    for a in arts_sorted:
        slug = str(a["slug"])
        if slug in seen:
            continue
        seen.add(slug)
        lastmod = str(a.get("publishedAt") or "")[:10]
        rows.append(
            f"  <url>\n    <loc>{SITE}/article/{escape(slug)}</loc>\n"
            + (f"    <lastmod>{lastmod}</lastmod>\n" if lastmod else "")
            + "    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>")
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           "<!-- Generated by newsroom/runner/gen_sitemap.py — every published article\n"
           "     at its real /article/ URL (served by functions/article/[slug].js).\n"
           "     Regenerated on every CI publish pass; do not edit by hand. -->\n"
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
           + "\n".join(rows) + "\n</urlset>\n")
    io.open(WEB / "sitemap.xml", "w", encoding="utf-8", newline="").write(xml)
    print(f"gen_sitemap: sitemap.xml written — {len(seen)} articles + {len(STATIC)} static URLs")


def clean_rss() -> None:
    p = WEB / "rss.xml"
    if not p.is_file():
        return
    s = io.open(p, encoding="utf-8", newline="").read()
    fixed, count = re.subn(r"rtfclmgzn\.com/#/article/", "rtfclmgzn.com/article/", s)
    if count:
        io.open(p, "w", encoding="utf-8", newline="").write(fixed)
        print(f"gen_sitemap: rss.xml — rewrote {count} fragment link(s) to real URLs")
    else:
        print("gen_sitemap: rss.xml already clean")


if __name__ == "__main__":
    articles = load_articles()
    if not articles:
        print("gen_sitemap: no articles parsed — refusing to write an empty sitemap")
        sys.exit(2)
    write_sitemap(articles)
    clean_rss()
