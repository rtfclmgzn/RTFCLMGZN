#!/usr/bin/env python3
"""RTFCLMGZN cover gate — no article ships imageless, no image repeats within 90 days.

Born from a real incident (2026-08-10): the first night of GitHub-Actions cycles
published a breaking article with no cover and reused library art inside the
90-day window. The runbooks' prose rules were agent-discipline only; this script
makes them mechanical.

Subcommands
-----------
check   Scan every article data file + magazine issues. FAIL (exit 1) if any
        article inside --fail-window days has: a missing/empty image field, an
        image path whose file does not exist, a suspiciously tiny file, or an
        image shared with another article/magazine surface published within
        --cooldown days. Older violations are reported as warnings only, so
        history can't permanently block a push.

          python -m newsroom.runner.verify_covers check

pick    Deterministically choose a library image that is clean under the
        90-day rule, semantically scored, resize it into place, and record the
        use in the manifest — one command, no bookkeeping left to memory.

          python -m newsroom.runner.verify_covers pick \
              --article-id newsroom-foo --section Frontier \
              --subjects "openai,model,launch" --apply

        Without --apply it only prints the ranked candidates (dry-run).
        --allow-lru-exception: if NO clean candidate exists, take the globally
        least-recently-used image and record it with "exception": true. This is
        the only sanctioned way to bend the 90-day rule, and only because a
        blank cover is the worse failure. The check subcommand treats a
        recorded exception as a warning, not a failure.

Dependencies: stdlib. Pillow is optional — when present, `pick --apply`
resizes to ~1536px JPEG and `check` adds perceptual near-duplicate detection;
when absent, pick copies bytes and check still does existence/size/exact-dup
checks. Install on a runner with: pip install pillow  (or uv pip install pillow)
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import sys
from datetime import datetime, timedelta, timezone

REPO = os.environ.get("RTFC_REPO") or os.path.abspath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
MANIFEST = os.path.join(REPO, "image-library", "art", "manifest.json")
LIBRARY_DIR = os.path.join(REPO, "image-library", "art")
OUT_DIR = os.path.join(REPO, "web", "assets", "img", "newsroom")

DATA_FILES = (
    ("web/data/articles.js", "RTFC_ARTICLES"),
    ("web/data/live-articles.js", "RTFC_LIVE_ARTICLES"),
    ("web/data/newsroom-articles.js", "RTFC_NEWSROOM_ARTICLES"),
    ("web/data/research.js", "RTFC_RESEARCH"),
)
MAGAZINE_FILE = ("web/data/magazine-issues.js", "RTFC_MAGAZINE_ISSUES")

COOLDOWN_DAYS = 90
MIN_BYTES = 10_000
PHASH_DISTANCE = 6

try:
    from PIL import Image  # type: ignore
    HAVE_PIL = True
except ImportError:
    HAVE_PIL = False


# --- tolerant JS-literal parsing (same approach as agents/social/post_social.py) ---

def _normalize_js(source: str) -> str:
    segments, buf = [], []
    i, n = 0, len(source)
    while i < n:
        ch = source[i]
        if ch in ("'", '"'):
            if buf:
                segments.append((False, "".join(buf)))
                buf = []
            quote, j, inner = ch, i + 1, []
            while j < n:
                c = source[j]
                if c == "\\" and j + 1 < n:
                    inner.append(source[j:j + 2]); j += 2; continue
                if c == quote:
                    break
                inner.append(c); j += 1
            text = "".join(inner)
            if quote == "'":
                text = text.replace('\\"', '"').replace('"', '\\"').replace("\\'", "'")
            segments.append((True, '"' + text + '"'))
            i = j + 1
            continue
        if ch == "/" and i + 1 < n and source[i + 1] == "/":
            while i < n and source[i] != "\n":
                i += 1
            continue
        buf.append(ch); i += 1
    if buf:
        segments.append((False, "".join(buf)))
    out = []
    for is_str, text in segments:
        if not is_str:
            text = re.sub(r'([{,\[]\s*)([A-Za-z_][A-Za-z0-9_$]*)(\s*:)', r'\1"\2"\3', text)
            text = re.sub(r",(\s*[}\]])", r"\1", text)
        out.append(text)
    return "".join(out)


def load_array(path: str, global_name: str):
    if not os.path.exists(path):
        return []
    raw = open(path, encoding="utf-8").read()
    m = re.search(r"window\.%s\s*=" % re.escape(global_name), raw)
    if not m:
        return []
    start = raw.find("[", m.end())
    end = raw.rfind("]")
    if start < 0 or end < 0 or end <= start:
        return []
    body = raw[start:end + 1]
    try:
        return json.loads(body)
    except json.JSONDecodeError:
        return json.loads(_normalize_js(body))


def parse_date(value):
    if not value:
        return None
    value = str(value)
    if re.fullmatch(r"\d{4}-\d{2}", value):
        value += "-01"
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def entry_date(entry):
    for key in ("publishedAt", "published", "date", "ts", "month"):
        dt = parse_date(entry.get(key))
        if dt:
            return dt
    return None


# --- gather every (surface_id, image, date) use across the site ---

def collect_uses():
    uses = []
    for rel, global_name in DATA_FILES:
        for entry in load_array(os.path.join(REPO, rel), global_name):
            if not isinstance(entry, dict):
                continue
            uses.append({
                "surface": entry.get("id") or entry.get("slug") or f"{rel}:?",
                "file": rel,
                "image": (entry.get("image") or "").strip(),
                "date": entry_date(entry),
                "kind": "article",
            })
    rel, global_name = MAGAZINE_FILE
    for issue in load_array(os.path.join(REPO, rel), global_name):
        if not isinstance(issue, dict):
            continue
        when = entry_date(issue)
        base = "magazine:%s" % (issue.get("id") or issue.get("number") or "issue")
        cover = (issue.get("cover") or {})
        if isinstance(cover, dict) and cover.get("image"):
            uses.append({"surface": base + ":cover", "file": rel,
                         "image": str(cover["image"]).strip(), "date": when,
                         "kind": "magazine"})
        for i, page in enumerate(issue.get("spreads") or issue.get("pages") or []):
            if isinstance(page, dict) and page.get("image"):
                uses.append({"surface": f"{base}:p{i}", "file": rel,
                             "image": str(page["image"]).strip(), "date": when,
                             "kind": "magazine"})
    return uses


def resolve_image(image_path):
    clean = image_path.lstrip("/")
    candidates = [os.path.join(REPO, "web", clean), os.path.join(REPO, clean)]
    for c in candidates:
        if os.path.isfile(c):
            return c
    return None


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def dhash(path):
    if not HAVE_PIL:
        return None
    try:
        with Image.open(path) as img:
            img = img.convert("L").resize((9, 8), Image.LANCZOS)
            get = getattr(img, "get_flattened_data", None)  # Pillow ≥11 name
            px = list(get()) if get else list(img.getdata())
    except Exception:
        return None
    bits = 0
    for row in range(8):
        for col in range(8):
            left = px[row * 9 + col]
            right = px[row * 9 + col + 1]
            bits = (bits << 1) | (1 if left > right else 0)
    return bits


def hamming(a, b):
    return bin(a ^ b).count("1")


def manifest_source_map():
    """article_id -> (library_file, exception?) from manifest used_in records."""
    out = {}
    if not os.path.exists(MANIFEST):
        return out
    data = json.load(open(MANIFEST, encoding="utf-8"))
    items = data if isinstance(data, list) else data.get("images") or []
    for item in items:
        for use in item.get("used_in") or []:
            aid = use.get("article_id")
            if aid:
                out[aid] = (item.get("file"), bool(use.get("exception")))
    return out


def cmd_check(args):
    now = datetime.now(timezone.utc)
    fail_cutoff = now - timedelta(days=args.fail_window)
    cooldown = timedelta(days=args.cooldown)
    uses = collect_uses()
    source_of = manifest_source_map()

    failures, warnings = [], []

    def report(surface, date, message):
        recent = date is None or date >= fail_cutoff
        (failures if recent else warnings).append(f"{surface}: {message}")

    hashes, phashes = {}, {}
    for use in uses:
        surface, image, date = use["surface"], use["image"], use["date"]
        if not image:
            report(surface, date, "NO IMAGE FIELD — article has no cover at all")
            continue
        path = resolve_image(image)
        if not path:
            report(surface, date, f"image path does not resolve to a file: {image}")
            continue
        size = os.path.getsize(path)
        if size < args.min_bytes:
            report(surface, date, f"cover file is suspiciously small ({size} bytes): {image}")
        use["sha"] = sha256_file(path)
        use["phash"] = dhash(path)
        hashes.setdefault(use["sha"], []).append(use)
        if use["phash"] is not None:
            phashes.setdefault(surface, use)

    def within_cooldown(a, b):
        if a["date"] is None or b["date"] is None:
            return True  # undated: be conservative
        return abs(a["date"] - b["date"]) <= cooldown

    def dup_report(a, b, how):
        exc = source_of.get(a["surface"], (None, False))[1] or \
              source_of.get(b["surface"], (None, False))[1]
        newer = max((u for u in (a, b)), key=lambda u: u["date"] or now)
        msg = (f"same cover as {b['surface'] if newer is a else a['surface']} "
               f"within {args.cooldown}d ({how}): {a['image']}")
        if exc:
            warnings.append(f"{newer['surface']}: {msg} [recorded LRU exception]")
        else:
            report(newer["surface"], newer["date"], msg)

    # exact duplicates
    for sha, group in hashes.items():
        surfaces = {u["surface"]: u for u in group}
        group = list(surfaces.values())
        for i in range(len(group)):
            for j in range(i + 1, len(group)):
                if within_cooldown(group[i], group[j]):
                    dup_report(group[i], group[j], "identical file")

    # same library source per manifest (different resizes of one PNG)
    by_source = {}
    for use in uses:
        src = source_of.get(use["surface"], (None, False))[0]
        if src:
            by_source.setdefault(src, []).append(use)
    for src, group in by_source.items():
        seen_pairs = set()
        for i in range(len(group)):
            for j in range(i + 1, len(group)):
                a, b = group[i], group[j]
                if a["surface"] == b["surface"]:
                    continue
                if a.get("sha") and a.get("sha") == b.get("sha"):
                    continue  # already reported as identical
                key = tuple(sorted((a["surface"], b["surface"])))
                if key in seen_pairs:
                    continue
                seen_pairs.add(key)
                if within_cooldown(a, b):
                    dup_report(a, b, f"same library source {src!r}")

    # perceptual near-duplicates (catches unrecorded manifest use)
    if HAVE_PIL:
        with_ph = [u for u in uses if u.get("phash") is not None]
        for i in range(len(with_ph)):
            for j in range(i + 1, len(with_ph)):
                a, b = with_ph[i], with_ph[j]
                if a["surface"] == b["surface"] or a.get("sha") == b.get("sha"):
                    continue
                sa = source_of.get(a["surface"], (None, False))[0]
                sb = source_of.get(b["surface"], (None, False))[0]
                if sa and sb and sa == sb:
                    continue  # already covered above
                if hamming(a["phash"], b["phash"]) <= args.phash_distance and within_cooldown(a, b):
                    dup_report(a, b, "perceptually near-identical")
    else:
        warnings.append("(Pillow not installed — perceptual near-dup detection skipped; "
                        "existence/size/exact/manifest checks still ran)")

    for line in warnings:
        print(f"WARN  {line}")
    for line in failures:
        print(f"FAIL  {line}")
    total = len([u for u in uses if u["image"]])
    print(f"COVER_GATE checked={len(uses)} with_image={total} "
          f"failures={len(failures)} warnings={len(warnings)}")
    return 1 if failures else 0


# --- pick ---

def cmd_pick(args):
    if not os.path.exists(MANIFEST):
        print("manifest.json not found", file=sys.stderr)
        return 2
    data = json.load(open(MANIFEST, encoding="utf-8"))
    items = data if isinstance(data, list) else data.get("images") or []
    now = datetime.now(timezone.utc)
    cooldown = timedelta(days=args.cooldown)
    subjects = {s.strip().lower() for s in (args.subjects or "").split(",") if s.strip()}

    def last_use(item):
        dates = [parse_date(u.get("used_at")) for u in item.get("used_in") or []]
        dates = [d for d in dates if d]
        return max(dates) if dates else None

    def clean(item):
        lu = last_use(item)
        return lu is None or (now - lu) > cooldown

    def score(item):
        s = 0
        if args.section and args.section in (item.get("best_for_sections") or []):
            s += 10
        item_subjects = {str(x).lower() for x in (item.get("subjects") or [])}
        text = (str(item.get("description") or "") + " " + str(item.get("title") or "")).lower()
        s += 3 * len(subjects & item_subjects)
        s += sum(1 for w in subjects if w and w in text)
        lu = last_use(item)
        age_bonus = 5 if lu is None else min(4, (now - lu).days / 90)
        return s + age_bonus

    pool = [i for i in items if i.get("file")]
    if not args.allow_brand:
        pool = [i for i in pool if not i.get("brand_visible")]
    candidates = sorted((i for i in pool if clean(i)), key=score, reverse=True)
    exception = False
    if not candidates:
        if not args.allow_lru_exception:
            print("NO_CLEAN_CANDIDATE: every eligible library image was used within "
                  f"{args.cooldown}d. Generate an image instead, or re-run with "
                  "--allow-lru-exception as the last resort.")
            return 3
        exception = True
        candidates = sorted(pool, key=lambda i: (last_use(i) or datetime.min.replace(
            tzinfo=timezone.utc)))
    if args.exclude:
        excluded = {e.strip() for e in args.exclude.split(",") if e.strip()}
        candidates = [c for c in candidates if c.get("id") not in excluded
                      and c.get("file") not in excluded]
    if not candidates:
        print("NO_CANDIDATE after exclusions")
        return 3

    top = candidates[0]
    print(("LRU-EXCEPTION " if exception else "") + "PICK "
          + json.dumps({"id": top.get("id"), "file": top.get("file"),
                        "description": top.get("description"),
                        "brand_visible": top.get("brand_visible")},
                       ensure_ascii=False))
    for alt in candidates[1:args.alternatives + 1]:
        print("  alt:", alt.get("id"), "—", str(alt.get("description"))[:100])
    if not args.apply:
        return 0

    if not args.article_id:
        print("--apply requires --article-id", file=sys.stderr)
        return 2
    src = os.path.join(LIBRARY_DIR, top["file"])
    if not os.path.isfile(src):
        print(f"library file missing on disk: {src}", file=sys.stderr)
        return 2
    os.makedirs(OUT_DIR, exist_ok=True)
    out_path = os.path.join(OUT_DIR, f"{args.article_id}.jpg")
    if HAVE_PIL:
        with Image.open(src) as img:
            img = img.convert("RGB")
            if img.width > 1536:
                img = img.resize((1536, round(img.height * 1536 / img.width)),
                                 Image.LANCZOS)
            img.save(out_path, "JPEG", quality=85, optimize=True)
    else:
        shutil.copyfile(src, out_path)
    use = {"article_id": args.article_id, "used_at": now.strftime("%Y-%m-%d")}
    if exception:
        use["exception"] = True
    top.setdefault("used_in", []).append(use)
    with open(MANIFEST, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=1)
        fh.write("\n")
    rel = os.path.relpath(out_path, os.path.join(REPO, "web")).replace(os.sep, "/")
    print("APPLIED image =", rel)
    print("Remember: git add", os.path.relpath(out_path, REPO).replace(os.sep, "/"),
          "image-library/art/manifest.json")
    return 0


def main():
    parser = argparse.ArgumentParser(description="RTFCLMGZN cover gate")
    sub = parser.add_subparsers(dest="cmd")

    c = sub.add_parser("check", help="verify all covers; exit 1 on recent violations")
    c.add_argument("--cooldown", type=int, default=COOLDOWN_DAYS)
    c.add_argument("--fail-window", type=int, default=14,
                   help="violations touching articles newer than this many days fail the run")
    c.add_argument("--min-bytes", type=int, default=MIN_BYTES)
    c.add_argument("--phash-distance", type=int, default=PHASH_DISTANCE)

    p = sub.add_parser("pick", help="choose+apply a clean library cover")
    p.add_argument("--article-id")
    p.add_argument("--section", default="")
    p.add_argument("--subjects", default="", help="csv keywords for semantic scoring")
    p.add_argument("--cooldown", type=int, default=COOLDOWN_DAYS)
    p.add_argument("--apply", action="store_true")
    p.add_argument("--allow-brand", action="store_true")
    p.add_argument("--allow-lru-exception", action="store_true")
    p.add_argument("--exclude", default="", help="csv of manifest ids/files to skip")
    p.add_argument("--alternatives", type=int, default=3)

    args = parser.parse_args()
    if args.cmd == "pick":
        sys.exit(cmd_pick(args))
    if args.cmd == "check" or args.cmd is None:
        if args.cmd is None:
            args = c.parse_args([])
        sys.exit(cmd_check(args))


if __name__ == "__main__":
    main()
