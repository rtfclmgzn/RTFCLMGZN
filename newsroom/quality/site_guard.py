#!/usr/bin/env python3
"""SITE GUARD — the standing check on everything the publication ships.

WHY (2026-08-14, owner escalation: "what do we have 37 agents for if they
don't check").

Three failures in two days had the same shape. An autonomous agent wrote a
store record that was fine by its own lights; a renderer read a field that
record happened not to carry; a whole page died in front of readers. Each time
the response was to guard that one field. That is not a system — that is
patching the last bullet hole.

This file is the system. It runs on EVERY push (site-guard.yml), before every
manual ship (SHIP2.bat), and hourly, and it checks the things nobody thought
to ask about:

  · every data store against its real contract (types, enums, ranges, ids)
  · every cross-surface promise: routes vs page titles, globals vs script
    tags, script tags vs files on disk, articles vs sitemap, images vs disk
  · both renderers against each other, so the SPA and the SSR pages can never
    drift apart on markup vocabulary
  · the ledger against honesty: unmetered rows counted and reported, never
    silently averaged into a total
  · the cache-buster, so a deploy can never be invisible again

ERRORS fail the run (exit 1). WARNINGS are printed and pass, because a guard
that cries wolf gets switched off, and a switched-off guard is the thing we
are replacing.

Deterministic, no network, no LLM, runs in under a second.
"""

from __future__ import annotations

import io
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# WINDOWS CONSOLE (2026-08-14). The owner ran this on a stock Windows Python
# whose console encoding is cp1252, and the guard died mid-report on the "✗"
# in its own output — a check that crashes while reporting is worse than no
# check, because it blocks the ship AND hides the findings it already had.
# Force UTF-8 where the runtime allows it, and fall back to ASCII marks where
# it doesn't. A guard must be the most robust thing in the repo.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    MARK_ERR, MARK_WARN, MARK_NOTE, MARK_OK = "✗", "!", "·", "✓"
except Exception:                                    # very old/odd runtimes
    MARK_ERR, MARK_WARN, MARK_NOTE, MARK_OK = "X", "!", "-", "OK"


def say(s: str) -> None:
    """Print that cannot fail on any console, ever."""
    try:
        print(s)
    except UnicodeEncodeError:
        enc = (getattr(sys.stdout, "encoding", None) or "ascii")
        print(s.encode(enc, "replace").decode(enc, "replace"))


HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))
from jsstore import (read_store, read_appended_rows, SALVAGE_REPORT,  # noqa: E402
                     tolerant_parse, slice_container)

WEB = ROOT / "web"
DATA = WEB / "data"
APP = WEB / "assets" / "app.js"
INDEX = WEB / "index.html"
SSR = ROOT / "functions" / "article" / "[slug].js"

ERRORS: list[str] = []
WARNS: list[str] = []
NOTES: list[str] = []
# Asset and sitemap checks need the FULL repo. CI always has it; a partial
# working copy does not, and a guard that screams about files it was never
# given teaches people to ignore guards. --skip-assets turns those off.
CHECK_ASSETS = True


def err(where: str, msg: str) -> None:
    ERRORS.append("%-22s %s" % (where, msg))


def warn(where: str, msg: str) -> None:
    WARNS.append("%-22s %s" % (where, msg))


def note(msg: str) -> None:
    NOTES.append(msg)


def now() -> datetime:
    return datetime.now(timezone.utc)


def parse_ts(v):
    if not isinstance(v, str):
        return None
    try:
        return datetime.fromisoformat(v.replace("Z", "+00:00"))
    except ValueError:
        return None


# --------------------------------------------------------------------------
# 1. ARTICLES — the store that has broken pages three times
# --------------------------------------------------------------------------
ARTICLE_STORES = [
    ("RTFC_ARTICLES", DATA / "articles.js"),
    ("RTFC_LIVE_ARTICLES", DATA / "live-articles.js"),
    ("RTFC_NEWSROOM_ARTICLES", DATA / "newsroom-articles.js"),
    ("RTFC_RESEARCH", DATA / "research.js"),
    ("RTFC_GUIDES", DATA / "guides.js"),
]
REQUIRED_ARTICLE = ["id", "slug", "title", "dek", "persona", "section", "body"]
DISCLAIMERS = {"none", "not-financial-advice", "not-medical-advice"}


def load_articles():
    out = []
    for var, path in ARTICLE_STORES:
        data = read_store(path, var)
        if data is None:
            if path.is_file():
                err("articles", "%s: could not parse %s" % (path.name, var))
            continue
        if not isinstance(data, list):
            err("articles", "%s: %s is not an array" % (path.name, var))
            continue
        for a in data:
            if isinstance(a, dict):
                a["__store"] = path.name
                out.append(a)
    return out


def check_articles(arts, personas, sections):
    seen_slug, seen_id = {}, {}
    pkeys = {p.get("key") for p in personas if isinstance(p, dict)}
    skeys = {s.get("key") for s in sections if isinstance(s, dict)}
    horizon = now() + timedelta(hours=2)
    for a in arts:
        who = "%s/%s" % (a.get("__store", "?"), a.get("slug") or a.get("id") or "?")
        for f in REQUIRED_ARTICLE:
            if not a.get(f):
                err("article-fields", "%s: missing required field '%s'" % (who, f))
        slug, aid = a.get("slug"), a.get("id")
        if slug:
            if slug in seen_slug:
                err("article-dupes", "duplicate slug '%s' (%s and %s)"
                    % (slug, seen_slug[slug], who))
            seen_slug[slug] = who
            if not re.fullmatch(r"[a-z0-9][a-z0-9\-]*", str(slug)):
                err("article-slug", "%s: slug is not url-safe lowercase" % who)
        if aid:
            if aid in seen_id:
                err("article-dupes", "duplicate id '%s' (%s and %s)"
                    % (aid, seen_id[aid], who))
            seen_id[aid] = who
        if a.get("persona") and pkeys and a["persona"] not in pkeys:
            err("article-persona", "%s: persona '%s' is not in personas.js"
                % (who, a["persona"]))
        if a.get("section") and skeys and a["section"] not in skeys:
            warn("article-section", "%s: section '%s' is not a known desk"
                 % (who, a["section"]))
        d = a.get("disclaimer")
        if d is not None and d not in DISCLAIMERS:
            err("article-disclaimer", "%s: disclaimer '%s' not one of %s"
                % (who, d, sorted(DISCLAIMERS)))
        ts = parse_ts(a.get("publishedAt"))
        if a.get("publishedAt") and ts is None:
            err("article-date", "%s: publishedAt is unparseable" % who)
        elif ts and ts > horizon:
            err("article-date", "%s: publishedAt is in the FUTURE (%s) — this "
                "reorders the homepage and buries live stories"
                % (who, a["publishedAt"]))
        body = a.get("body")
        if isinstance(body, list):
            for i, b in enumerate(body):
                if not isinstance(b, dict) or not b.get("type"):
                    err("article-body", "%s: body[%d] has no type" % (who, i))
                elif b["type"] in ("h2", "quote", "p") and not b.get("text"):
                    err("article-body", "%s: body[%d] type=%s has no text"
                        % (who, i, b["type"]))
        elif body is not None:
            err("article-body", "%s: body is not an array" % who)
        for i, s in enumerate(a.get("sources") or []):
            if not isinstance(s, dict) or not s.get("label"):
                err("article-sources", "%s: sources[%d] has no label" % (who, i))
            u = (s or {}).get("url") or ""
            # "#/scoreboard" is a legitimate source: our own reference surface.
            if u and u != "#" and not u.startswith(("http://", "https://", "#/", "/")):
                err("article-sources", "%s: sources[%d] url is neither an "
                    "absolute link nor an internal route: %s" % (who, i, u[:60]))
        img = a.get("image")
        if img and isinstance(img, str) and not img.startswith(("http", "data:")):
            if CHECK_ASSETS and not (WEB / img.lstrip("/")).is_file():
                err("article-image", "%s: cover file missing on disk: %s" % (who, img))
        elif not img:
            err("article-image", "%s: no cover image (the cover gate should have "
                "healed this before publish)" % who)
        pl = a.get("pipeline")
        if isinstance(pl, dict) and not pl.get("gate"):
            warn("article-pipeline", "%s: pipeline record has no gate block "
                 "(renderer survives it; the record is still incomplete)" % who)
    return seen_slug


# --------------------------------------------------------------------------
# 2. REFERENCE SURFACES
# --------------------------------------------------------------------------
def check_scoreboard(entities):
    sb = read_store(DATA / "scoreboard.js", "RTFC_SCOREBOARD")
    if not isinstance(sb, dict):
        err("scoreboard", "could not parse RTFC_SCOREBOARD")
        return
    ent_names = " ".join(str(e.get("name", "")) for e in (entities or [])
                         if isinstance(e, dict)).lower()
    if not sb.get("basisNote"):
        err("scoreboard", "basisNote is empty — the scan log IS the credibility")
    for r in sb.get("rows") or []:
        m = r.get("model", "?")
        if not r.get("lab"):
            err("scoreboard", "%s: no lab" % m)
        if r.get("status") not in ("released", "preview", "announced", "retired"):
            warn("scoreboard", "%s: unusual status '%s'" % (m, r.get("status")))
        sc = r.get("score")
        if sc is not None and not (isinstance(sc, (int, float)) and 0 <= sc <= 100):
            err("scoreboard", "%s: score '%s' is not 0-100 or null" % (m, sc))
        for k in ("pin", "pout"):
            v = r.get(k)
            if v is not None and not (isinstance(v, (int, float)) and v >= 0):
                err("scoreboard", "%s: %s '%s' is not a positive number or null"
                    % (m, k, v))
        if sc is not None and ent_names and str(m).lower() not in ent_names:
            warn("scoreboard", "%s: scored but has no entities.js entry, so its "
                 "first mention in articles renders as bare text" % m)


def check_grid():
    g = read_store(DATA / "grid.js", "RTFC_GRID")
    if not isinstance(g, dict):
        err("grid", "could not parse RTFC_GRID")
        return
    ids = set()
    for f in g.get("facilities") or []:
        n = f.get("name", "?")
        if f.get("id") in ids:
            err("grid", "duplicate facility id '%s'" % f.get("id"))
        ids.add(f.get("id"))
        for k, lo, hi in (("lat", -90, 90), ("lng", -180, 180)):
            v = f.get(k)
            if not isinstance(v, (int, float)) or not (lo <= v <= hi):
                err("grid", "%s: %s '%s' out of range" % (n, k, v))
        if f.get("status") not in ("operating", "building", "announced"):
            err("grid", "%s: status '%s' is not a known state" % (n, f.get("status")))
        if f.get("confidence") not in ("confirmed", "reported", "early"):
            err("grid", "%s: confidence '%s' is not a known level"
                % (n, f.get("confidence")))


def check_extensions():
    ext = read_store(DATA / "extensions.js", "RTFC_EXTENSIONS")
    if ext is None:
        err("extensions", "could not parse RTFC_EXTENSIONS")
        return
    app = io.open(APP, encoding="utf-8").read()
    m = re.search(r"var EXT_KINDS=\{(.*?)\};", app, re.S)
    kinds = set(re.findall(r"([a-z]+)\s*:", m.group(1))) if m else set()
    seen = set()
    for c in ext:
        if not c.get("id") or not c.get("cat"):
            err("extensions", "a category has no id/cat")
        if c.get("id") in seen:
            err("extensions", "duplicate category id '%s'" % c.get("id"))
        seen.add(c.get("id"))
        for it in c.get("items") or []:
            nm = it.get("name", "?")
            if not str(it.get("url", "")).startswith("https://"):
                err("extensions", "%s: url is not https" % nm)
            if kinds and it.get("kind") not in kinds:
                err("extensions", "%s: kind '%s' has no chip style in app.js "
                    "(EXT_KINDS)" % (nm, it.get("kind")))


HOLE_RE = re.compile(r",[ \t]*(?:\r?\n[ \t]*)*,")


# A record that ends and is immediately followed by the next record with no
# comma between them. This is not sloppy JS — it is a SyntaxError, and a
# SyntaxError anywhere in a data file means the browser executes NONE of it.
# The store's global stays undefined and every page that reads it silently
# falls back to whatever it had before.
#
# On 2026-08-15 exactly this sat in usage-log-current.js. The /usage page
# announced "This log is 33 days stale — the jobs are failing", 200 rows were
# invisible, and the public cost figure was wrong, all because one agent append
# omitted one character. Nothing was failing. One comma was missing.
MISSING_COMMA_RE = re.compile(r"(\}[ \t]*)(\r?\n[ \t]*\{)")


def store_parses(path) -> bool:
    """Does every array/object literal in this file parse cleanly?

    The missing-comma repair below is only ever applied to a file that ALREADY
    fails to parse. That is what makes a regex safe enough to edit a live data
    store with: on a file that reads fine, the pattern is never even consulted,
    so a false positive cannot insert a comma into working data.
    """
    try:
        text = io.open(path, encoding="utf-8", newline="").read()
    except Exception:                                      # noqa: BLE001
        return False
    ok = True
    mark = len(SALVAGE_REPORT)
    try:
        starts = [m.end() for m in
                  re.finditer(r"window\.[A-Za-z_0-9]+\s*=\s*(?=[\[{])", text)]
        starts += [m.end() for m in re.finditer(r"var\s+rows\s*=\s*(?=\[)", text)]
        for s in starts:
            raw = slice_container(text, s)
            if raw is None:
                ok = False
                continue
            try:
                tolerant_parse(raw)
            except Exception:                              # noqa: BLE001
                ok = False
    finally:
        # This is a probe, not a check. Anything it provoked must not show up
        # in the report twice.
        del SALVAGE_REPORT[mark:]
    return ok


def check_array_holes(fix: bool = False):
    """Two syntax faults an agent append can leave behind, both invisible.

    1. A STRAY comma makes a sparse array. forEach skips the hole, so the site
       looks fine and one record's worth of nothing sits in a live store.
    2. A MISSING comma is a SyntaxError, which kills the entire file in the
       browser while the tolerant Python parsers here read it happily. That
       asymmetry is the dangerous one: the guard says 284 rows, the reader sees
       81, and only the reader is right.
    """
    for p in sorted(DATA.glob("*.js")):
        text = io.open(p, encoding="utf-8", newline="").read()
        holes = HOLE_RE.search(text)
        # Only a file that does not parse is a candidate for comma insertion.
        gaps = MISSING_COMMA_RE.search(text) if not store_parses(p) else None
        if not holes and not gaps:
            continue
        if fix:
            new = text
            if holes:
                new = HOLE_RE.sub(",", new)
            if gaps:
                new, n = MISSING_COMMA_RE.subn(r"\1,\2", new)
                note("inserted %d missing comma(s) in %s" % (n, p.name))
            io.open(p, "w", encoding="utf-8", newline="").write(new)
            if holes:
                note("repaired array hole(s) in %s" % p.name)
        else:
            if holes:
                err("store-syntax", "%s: stray comma creates a sparse-array hole — "
                    "run site_guard.py --fix" % p.name)
            if gaps:
                err("store-syntax", "%s: two records with NO COMMA between them. "
                    "This is a JavaScript SyntaxError, so the browser loads none "
                    "of this file and every page reading it is stale right now — "
                    "run site_guard.py --fix" % p.name)


def repair_ledger_ids(fix: bool) -> None:
    """Duplicate row ids are SILENT DATA LOSS.

    usage-log-current.js ends with `rows.forEach(... if(!seen[r.id]) push)` —
    a dedup that keeps the first row and drops every later one wearing the same
    id. On 2026-08-14 four separate pulse-scan runs had all written `u-0128`,
    so three real runs existed in the file and did not exist on the site. It
    renders as nothing; nothing is exactly what you look for and never find.

    Agents picked ids by copying a nearby row. log_usage.py now computes
    max+1 deterministically, and this renumbers whatever the old habit left
    behind — keeping the earliest row's id and giving each later collision a
    fresh one, so no row is rewritten out of existence.
    """
    p = DATA / "usage-log-current.js"
    if not p.is_file():
        return
    text = io.open(p, encoding="utf-8", newline="").read()
    ids = re.findall(r'id:"(u-\d+)"', text)
    dupes = {i for i in ids if ids.count(i) > 1}
    if not dupes:
        return
    if not fix:
        for d in sorted(dupes):
            err("ledger", "row id '%s' is used %d times — the store's own dedup "
                "drops all but the first, so %d logged runs are invisible on the "
                "site. Run site_guard.py --fix" % (d, ids.count(d), ids.count(d) - 1))
        return
    nxt = max(int(i.split("-")[1]) for i in ids) + 1
    seen: set[str] = set()
    out, pos = [], 0
    for m in re.finditer(r'id:"(u-\d+)"', text):
        rid = m.group(1)
        out.append(text[pos:m.start()])
        if rid in seen:
            new = "u-%04d" % nxt
            nxt += 1
            out.append('id:"%s"' % new)
            note("ledger: renumbered a duplicate %s -> %s" % (rid, new))
        else:
            seen.add(rid)
            out.append(m.group(0))
        pos = m.end()
    out.append(text[pos:])
    io.open(p, "w", encoding="utf-8", newline="").write("".join(out))


def repair_missing_script_tags(fix: bool) -> None:
    """Load any data file whose global the app reads and index.html forgot.

    WHY THIS REPAIRS ITSELF RATHER THAN BEING FIXED BY HAND (2026-08-15).
    `social-posts.js` sat in web/data/ for weeks — current, committed, 56
    articles' worth of real distribution records — and the Distribution panel
    on every article page rendered nothing, because one `<script>` tag was
    never added. The data was fine. The reader was fine. Only the wiring was
    missing, and nothing in the world could see it.

    That is a mechanical fault with exactly one correct fix, so it is repaired
    mechanically. The new tag is inserted after the last existing data script
    and inherits whatever cache-buster the file already uses, so the next
    restamp treats it like any other.

    RTFC_WORLDMAP is exempt: the map code fetches it on demand, deliberately.
    """
    if not INDEX.is_file() or not APP.is_file():
        return
    idx = io.open(INDEX, encoding="utf-8", newline="").read()
    app = io.open(APP, encoding="utf-8").read()
    srcs = re.findall(r'<script defer src="/?(data/[^"?]+)', idx)
    if len(srcs) < 20:
        return                       # blind; expect() reports it in the check
    loaded = set()
    for s in srcs:
        p = WEB / s
        if p.is_file():
            loaded |= set(re.findall(r"window\.(RTFC_[A-Z_0-9]+)",
                                     io.open(p, encoding="utf-8").read()))
    on_disk = {}
    for p in sorted(DATA.glob("*.js")):
        try:
            for g in re.findall(r"window\.(RTFC_[A-Z_0-9]+)",
                                io.open(p, encoding="utf-8").read()):
                on_disk.setdefault(g, p.name)
        except OSError:
            pass
    missing = sorted({on_disk[g] for g in
                      set(re.findall(r"window\.(RTFC_[A-Z_0-9]+)", app))
                      - loaded - {"RTFC_WORLDMAP"} if g in on_disk})
    if not missing or not fix:
        return
    anchor = None
    for m in re.finditer(r'[ \t]*<script defer src="/?data/[^\n]*\n', idx):
        anchor = m
    if anchor is None:
        return
    buster = ""
    b = re.search(r"\?b=([0-9a-z]+)", idx)
    if b:
        buster = "?b=" + b.group(1)
    tags = "".join('  <script defer src="/data/%s%s"></script>\n' % (f, buster)
                   for f in missing)
    io.open(INDEX, "w", encoding="utf-8", newline="").write(
        idx[:anchor.end()] + tags + idx[anchor.end():])
    for f in missing:
        note("index.html: added the missing <script> for data/%s" % f)


def repair_future_timestamps(fix: bool) -> None:
    """A ledger row cannot have happened later than the moment we read it.

    WHY (2026-08-15). u-0279 carried a `ts` in the future. Nothing in the
    pipeline can know a future time, so the row was not measured — an agent
    typed a timestamp, which is Law 3 in miniature: a number written instead of
    observed. It is small, and it is the same failure that froze the public
    cost figure at $11.48 for a month.

    The repair is deliberately conservative. It does NOT invent when the run
    happened; it clamps the claim to the latest moment we can actually stand
    behind — the moment this check observed it. That is a true upper bound and
    an honest one, and unlike the original it cannot put a row in the future or
    reorder "newest activity" on the public page. Rows already in the past are
    never touched.

    log_usage.py stamps its own rows from the runner's clock and is not the
    source of these. This exists for the hand-appended ones, and the runbook
    rule is the real fix: agents log through log_usage.py, never by typing a
    row.
    """
    p = DATA / "usage-log-current.js"
    if not p.is_file():
        return
    text = io.open(p, encoding="utf-8", newline="").read()
    horizon = now() + timedelta(hours=2)
    stamp = now().strftime("%Y-%m-%dT%H:%M:%SZ")
    out, pos, fixed = [], 0, 0
    for m in re.finditer(r'ts:\s*"([^"]+)"', text):
        out.append(text[pos:m.start()])
        ts = parse_ts(m.group(1))
        if ts is not None and ts > horizon:
            fixed += 1
            if fix:
                out.append('ts:"%s"' % stamp)
                note("ledger: clamped a future ts %s -> %s (observed time)"
                     % (m.group(1), stamp))
            else:
                out.append(m.group(0))
        else:
            out.append(m.group(0))
        pos = m.end()
    out.append(text[pos:])
    if fixed and fix:
        io.open(p, "w", encoding="utf-8", newline="").write("".join(out))


def check_ledger():
    base = read_store(DATA / "usage-log.js", "RTFC_USAGE_LOG") or []
    cur = read_appended_rows(DATA / "usage-log-current.js") or []
    rows = list(base) + list(cur)
    if not rows:
        err("ledger", "no usage rows at all")
        return
    cost_cfg = read_store(DATA / "cost-config.js", "RTFC_COST_CONFIG") or {}
    priced = set((cost_cfg.get("models") or {}).keys())
    ids, newest, unmetered = set(), None, 0
    for r in rows:
        rid = r.get("id")
        if rid in ids:
            err("ledger", "duplicate row id '%s'" % rid)
        ids.add(rid)
        ts = parse_ts(r.get("ts"))
        if ts is None:
            err("ledger", "%s: unparseable ts" % rid)
            continue
        if ts > now() + timedelta(hours=2):
            err("ledger", "%s: ts is in the future" % rid)
        newest = ts if (newest is None or ts > newest) else newest
        tin, tout = r.get("input_tokens") or 0, r.get("output_tokens") or 0
        if tin < 0 or tout < 0:
            err("ledger", "%s: negative token count" % rid)
        if (tin or tout) and r.get("model") and r["model"] not in priced:
            err("ledger", "%s: model '%s' has tokens but no price in "
                "cost-config.js, so its cost silently reads as $0"
                % (rid, r["model"]))
        if not (tin or tout or r.get("images")):
            unmetered += 1
    share = unmetered * 100 // max(1, len(rows))
    note("ledger: %d rows, %d unmetered (%d%%), newest %s"
         % (len(rows), unmetered, share, newest.isoformat() if newest else "?"))
    if newest and (now() - newest) > timedelta(hours=24):
        err("ledger", "newest row is %d hours old — the scheduled jobs are not "
            "logging, and the public cost figure is frozen"
            % int((now() - newest).total_seconds() // 3600))
    if share > 60:
        warn("ledger", "%d%% of rows carry no token figures. The site must show "
             "these as unmetered (it does) — but the fix is log_usage.py running "
             "in every workflow, not a nicer label." % share)


# --------------------------------------------------------------------------
# 3. CROSS-SURFACE — the promises no single file can keep alone
# --------------------------------------------------------------------------
def check_no_hash_links():
    """NEVER AGAIN (2026-08-14, owner).

    Everything after a "#" is invisible to a search engine: the crawler fetches
    one URL no matter how many pages the app renders behind fragments. The site
    ran that way for months, earning zero organic traffic on 100+ articles;
    /article/<slug> fixed the articles and left every other page behind.

    Every page now has a real path, and this check is what keeps it that way.
    A `href="#/..."` anywhere in the shipped site or in the SSR renderer fails
    the build. Bare in-page anchors (`href="#tldr"`) are fine and untouched —
    it is specifically the "#/" route shape that is banned.
    """
    targets = [APP, INDEX, SSR] + sorted((ROOT / "functions").rglob("*.js"))
    if not expect("check_no_hash_links", sum(1 for t in targets if t.is_file()),
                  4, "files to scan"):
        return
    seen = set()
    for p in targets:
        if not p.is_file() or p in seen:
            continue
        seen.add(p)
        text = io.open(p, encoding="utf-8", errors="replace").read()
        # strip comments so the historical explanations of the bug don't trip it
        stripped = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
        stripped = re.sub(r"^\s*(//|\*|#).*$", "", stripped, flags=re.M)
        hits = re.findall(r'href\s*=\s*["\'`]#/[^"\'`]*', stripped)
        hits += re.findall(r'["\'`]https?://[^"\'`]*/#/[^"\'`]*', stripped)
        for h in sorted(set(hits))[:6]:
            err("hash-links", "%s: hash route link `%s` — every page must be a "
                "real crawlable URL" % (p.name, h[:70]))


def check_route_plumbing():
    """A route is only real if three things agree: the router renders it, the
    head table titles it, and the server hands index.html to a cold request for
    it. Two out of three is a page that 404s on refresh or shows up in Google
    titled 'Page not found'."""
    app = io.open(APP, encoding="utf-8").read()
    routes = set(re.findall(r'parts\[0\]==="([a-z\-]+)"', app))
    if not expect("check_route_plumbing", len(routes), 25, "routes in app.js"):
        return

    # THE SERVER SIDE MOVED OUT OF _redirects (2026-08-15). Measured on the live
    # site, `_redirects` did not do either job it was there for: the 37 exact
    # rules proxied to /index.html, which Cloudflare canonicalises with a 308 to
    # /, so every page redirected to the homepage; and the six /x/* splat rules
    # were not honoured at all, so the magazine reader, sections, editors and
    # company dossiers returned a hard 404 to anyone arriving from outside the
    # app. functions/[[path]].js answers those URLs itself. This check now reads
    # ITS route lists, because that file is what the server actually consults.
    fn = ROOT / "functions" / "[[path]].js"
    if not fn.is_file():
        err("routing", "functions/[[path]].js is missing — every page except "
            "/article/* 404s on a cold visit or a refresh")
        return
    src = io.open(fn, encoding="utf-8").read()

    def literal_set(name):
        m = re.search(r"const\s+%s\s*=\s*new Set\(\[(.*?)\]\)" % name, src, re.S)
        return set(re.findall(r'"([a-z0-9\-]+)"', m.group(1))) if m else set()

    served = literal_set("EXACT") | literal_set("PREFIX")
    if not served:
        err("routing", "functions/[[path]].js declares no routes — its EXACT/"
            "PREFIX lists could not be read, so this check is blind")
        return

    # article/share have their own, more specific Functions; home needs no entry.
    handled_elsewhere = {"article", "share"}
    for r in sorted(routes - served - handled_elsewhere):
        err("routing", "route '/%s' renders in the app but functions/[[path]].js "
            "does not serve it — a cold visit or a refresh 404s" % r)
    for r in sorted(served - routes - handled_elsewhere):
        warn("routing", "functions/[[path]].js serves '/%s' but the app has no "
             "route for it — it renders the not-found view at status 200" % r)

    stale = WEB / "_redirects"
    if stale.is_file():
        err("routing", "web/_redirects still exists. Its 200-proxy rules send "
            "every page to /index.html, which Cloudflare 308s to / — it will "
            "undo functions/[[path]].js for any path it still matches. Delete it.")


def tracked_files():
    """Paths git actually tracks. The question this guard asks is not "does this
    file exist on disk" but "is it published in the repository" — a local
    backup that git ignores is nobody's business, while a tracked file in a
    public repo is on the internet. Falls back to a disk walk if git is
    unavailable, which errs toward noisy rather than silent."""
    try:
        import subprocess
        out = subprocess.run(["git", "ls-files"], cwd=str(ROOT), capture_output=True,
                             text=True, timeout=20)
        if out.returncode == 0:
            return {ROOT / line.strip() for line in out.stdout.splitlines() if line.strip()}
    except Exception:
        pass
    return None


def check_no_paid_content_in_repo():
    """PAID CONTENT NEVER LIVES IN A PUBLIC REPO (2026-08-14).

    The magazine paywall was correct in the browser and correct on the server,
    and the issue JSON was still readable by anyone, because this repository is
    public and the payload was committed to it. The gate held; the file was
    simply also published at raw.githubusercontent.com. 119KB of a Plus issue,
    free to whoever thought to look.

    Paid payloads now live in the RTFC_ISSUES KV namespace, which exists only
    inside the Cloudflare account. This check makes the old mistake impossible
    to repeat: any TRACKED json that declares itself paid fails the build.
    """
    tracked = tracked_files()
    for p in sorted(ROOT.rglob("*.json")):
        if "/node_modules/" in str(p).replace("\\", "/"):
            continue
        if tracked is not None and p not in tracked:
            continue                      # untracked/ignored: not published
        try:
            text = io.open(p, encoding="utf-8", errors="replace").read(4000)
        except OSError:
            continue
        if '"access"' in text and '"plus"' in text:
            err("paid-content", "%s declares access:plus and is TRACKED in this "
                "PUBLIC repo, so that payload is published. Paid content belongs "
                "in the ISSUES KV namespace, never in git."
                % p.relative_to(ROOT))


def check_routes_have_titles():
    """Every route branch must have a <title>. This exact gap shipped the Grid
    page for weeks under 'Page not found' — invisible to us, visible to Google."""
    app = io.open(APP, encoding="utf-8").read()
    routes = set(re.findall(r'parts\[0\]==="([a-z\-]+)"', app))
    m = re.search(r"var ROUTE_HEADS=\{(.*?)\n  \};", app, re.S)
    heads = set(re.findall(r'^\s*"?([a-z\-]+)"?\s*:\s*\[', m.group(1), re.M)) if m else set()
    if not expect("check_routes_have_titles", len(routes), 25, "routes in app.js"):
        return
    if not expect("check_routes_have_titles", len(heads), 20, "ROUTE_HEADS entries"):
        return
    # These build their <title> from the record they render, not the table.
    dynamic = {"article", "section", "persona", "editor", "company", "read", "issue"}
    for r in sorted(routes - heads - dynamic):
        err("route-titles", "route '#/%s' renders a page but has no ROUTE_HEADS "
            "entry — its tab title and search snippet say 'Page not found'" % r)


def check_scripts_and_globals():
    idx = io.open(INDEX, encoding="utf-8").read()
    app = io.open(APP, encoding="utf-8").read()
    # Root-relative OR relative: index.html moved to /data/... when every page
    # got a real URL, and this regex silently matched nothing for one commit —
    # a check that quietly stops checking is the worst failure mode there is.
    srcs = re.findall(r'<script defer src="/?(data/[^"?]+)', idx)
    if not expect("check_scripts_and_globals", len(srcs), 20, "data script tags in index.html"):
        return
    read_globals = set(re.findall(r"window\.(RTFC_[A-Z_0-9]+)", app))
    if not expect("check_scripts_and_globals", len(read_globals), 15, "RTFC_ globals read by app.js"):
        return
    for s in srcs:
        if not (WEB / s).is_file():
            err("scripts", "index.html loads %s which does not exist" % s)
    loaded_globals = set()
    for s in srcs:
        p = WEB / s
        if p.is_file():
            loaded_globals |= set(re.findall(r"window\.(RTFC_[A-Z_0-9]+)",
                                             io.open(p, encoding="utf-8").read()))
    # Globals the app reads but nothing in index.html defines. RTFC_WORLDMAP is
    # deliberately lazy-loaded by the map code; everything else must be shipped.
    lazy = {"RTFC_WORLDMAP"}
    on_disk = {}
    for p in sorted(DATA.glob("*.js")):
        try:
            for g in re.findall(r"window\.(RTFC_[A-Z_0-9]+)",
                                io.open(p, encoding="utf-8").read()):
                on_disk.setdefault(g, p.name)
        except OSError:
            pass
    for g in sorted(read_globals - loaded_globals - lazy):
        if g in on_disk:
            # The data exists, is committed, is current — and one <script> tag
            # is missing, so the feature it powers renders nothing. This is a
            # wiring bug with a known fix, not an open question. It blocks.
            # (RTFC_SOCIAL_POSTS sat like this: 143KB of real distribution
            # records, 56 articles' worth, and the Distribution panel on every
            # article page rendered empty because nobody loaded the file.)
            err("scripts", "app.js reads window.%s and web/data/%s defines it, "
                "but index.html never loads that file — the feature renders "
                "empty. Add the <script defer src=\"/data/%s?b=...\"> tag."
                % (g, on_disk[g], on_disk[g]))
        else:
            warn("scripts", "app.js reads window.%s but no data file in index.html "
                 "defines it — anything drawn from it renders empty" % g)


def check_cache_buster():
    idx = io.open(INDEX, encoding="utf-8").read()
    stamps = re.findall(r"\?b=([0-9a-z]+)", idx)
    # Zero stamps is not "consistent". It means the stamping scheme changed and
    # this check has been agreeing with itself about nothing ever since.
    if not expect("check_cache_buster", len(stamps), 20, "?b= stamps in index.html"):
        return
    tokens = set(stamps)
    if len(tokens) > 1:
        err("cache-buster", "index.html carries %d different ?b= stamps %s — a "
            "partial restamp ships some assets stale" % (len(tokens), sorted(tokens)))


# The writers' inline vocabulary, named once. A marker listed here must be
# implemented by BOTH renderers or the same article reads differently depending
# on whether the reader arrived via the app or a shared /article/ link.
MARKERS = [
    (r"\*\*", "**bold**"),
    ("==", "==highlight=="),
    (r"\+\+", "++accent++"),
    ("__", "__underline__"),
    (r"\{\{note:", "{{note: margin note}}"),
    ("%%", "%%figure|caption%%"),
]


def check_renderer_parity():
    app = io.open(APP, encoding="utf-8").read()
    ssr = io.open(SSR, encoding="utf-8").read() if SSR.is_file() else ""
    if not ssr:
        warn("renderers", "SSR article renderer not found")
        return

    def fmt_body(src):
        m = re.search(r"function fmt\(s\)\s*\{(.*?)\n\s*\}", src, re.S)
        return m.group(1) if m else ""

    a, s = fmt_body(app), fmt_body(ssr)
    if not a or not s:
        # NOT a warning. If this check cannot find the two fmt() bodies it is
        # comparing nothing, and "comparing nothing" has always printed the
        # same clean result as "they match". Say the true thing instead.
        err("check-blind", "check_renderer_parity could not isolate the fmt() "
            "body in %s — the two renderers are NOT being compared, so they "
            "can drift apart freely" % ("app.js" if not a else "the SSR function"))
        return
    if not expect("check_renderer_parity", sum(1 for pat, _ in MARKERS if pat in a),
                  4, "known markers in app.js fmt()"):
        return
    for pat, label in MARKERS:
        in_app, in_ssr = pat in a, pat in s
        if in_app and not in_ssr:
            err("renderers", "%s renders in the app but NOT on shared "
                "/article/ pages" % label)
        if in_ssr and not in_app:
            err("renderers", "%s renders on /article/ pages but NOT in the app"
                % label)
    # speech must strip every marker, or the audio reads punctuation aloud
    m = re.search(r"function cleanSpeech\(t\)\s*\{(.*?)\n  \}", app, re.S)
    speech = m.group(1) if m else ""
    if speech:
        for pat, label in MARKERS:
            if pat not in speech:
                warn("renderers", "cleanSpeech() does not strip %s — the "
                     "Listen feature will speak the marker" % label)


def check_ssr_store_parity():
    """Every article store the APP renders at /article/<slug> must also be read
    by the SERVER function and by the sitemap generator.

    WHY (2026-08-15). guides.js was in app.js's lookup pool and in this guard's
    ARTICLE_STORES, but in neither functions/article/[slug].js nor
    gen_sitemap.py. The failure was invisible from inside the site: clicking a
    guide card worked, because the SPA resolved the slug itself and never asked
    the server. It broke only for people arriving from outside — a refresh, a
    shared link, Googlebot — who got a 404 on all six guides, and it broke
    silently, because nobody tests their own site cold.

    This is the general form of that bug: a page is only real if every reader
    agrees it exists. Three lists, one truth, checked on every push.
    """
    fn = ROOT / "functions" / "article" / "[slug].js"
    gen = ROOT / "newsroom" / "runner" / "gen_sitemap.py"
    for label, path in (("functions/article/[slug].js", fn),
                        ("newsroom/runner/gen_sitemap.py", gen)):
        if not path.is_file():
            err("ssr-parity", "%s is missing — articles have no real URLs" % label)
            continue
        text = io.open(path, encoding="utf-8").read()
        for _var, store in ARTICLE_STORES:
            if not store.is_file():
                continue
            # Match the QUOTED path literal, not a bare mention. A plain
            # substring search passes on any file that merely names the store in
            # a comment — including the comment explaining this very check,
            # which is exactly how the first version of it self-defeated.
            pat = r"""["']/?(?:data/)?%s["']""" % re.escape(store.name)
            if not re.search(pat, text):
                err("ssr-parity",
                    "%s is rendered by app.js but %s never reads it — its articles "
                    "404 on a cold load and are invisible to search"
                    % (store.name, label))


def check_sitemap_and_rss(slugs):
    if not CHECK_ASSETS:
        return
    sm = WEB / "sitemap.xml"
    if not sm.is_file():
        err("sitemap", "sitemap.xml missing")
    else:
        text = io.open(sm, encoding="utf-8").read()
        missing = [s for s in slugs if ("/article/%s<" % s) not in text
                   and ("/article/%s" % s) not in text]
        if missing:
            err("sitemap", "%d published articles are absent from sitemap.xml "
                "(first: %s) — invisible to search" % (len(missing), missing[0]))
    rss = WEB / "rss.xml"
    if rss.is_file():
        text = io.open(rss, encoding="utf-8").read()
        n = text.count("/#/article/")
        if n:
            err("rss", "%d feed links still point at #/ fragments instead of "
                "real /article/ URLs" % n)


# --------------------------------------------------------------------------
# 4. THE ENGINE — what makes this installation THIS publication
# --------------------------------------------------------------------------
CONFIG = ROOT / "engine.config.json"
BASELINE = HERE / "engine_baseline.json"

# Files that are ALLOWED to name the domain, because they are the ones that
# will read it from the config once the extraction lands, or because naming it
# is their whole job.
DOMAIN_OK = {
    "engine.config.json",
    "autonomy.default.json",
    "live_check.py",           # it exists to talk to this specific site
    "FAILURE_REGISTER.md", "OPERATING_LAW.md", "OPERATION_MAP.md",
    "site_guard.py",
}


def fix_requested() -> bool:
    return "--fix" in sys.argv or "--fix-syntax" in sys.argv


def check_engine_config():
    """The identity ratchet.

    An audit on 2026-08-15 found this publication's identity in roughly 500
    places: four separate SITE constants, a wordmark hand-inlined in three
    files, a desk list written out five times with two copies already drifted
    onto different colours, and a price table duplicated across two files that
    disagreed with itself. That is what "not yet a product" looks like in
    concrete terms.

    Extracting all of it in one commit would be a rewrite of app.js, and a
    rewrite is exactly the kind of change that breaks a live site. So this
    check is a RATCHET instead of a wall:

      · engine.config.json must exist and be internally consistent with the
        code it claims to describe. Drift there is a hard error, because a
        config that lies is worse than no config.
      · the number of hardcoded domain literals per file may go DOWN or stay
        flat, never up. New code reads the config; old code gets migrated when
        someone is in the file anyway.

    That makes "how close is this to being a sellable engine" a number that
    only moves in one direction, instead of a feeling.
    """
    import json
    if not CONFIG.is_file():
        err("engine", "engine.config.json is missing — the engine has no "
            "declared identity, so nothing can be rebranded without a rewrite")
        return
    try:
        cfg = json.loads(io.open(CONFIG, encoding="utf-8").read())
    except Exception as exc:                               # noqa: BLE001
        err("engine", "engine.config.json does not parse: %s" % exc)
        return

    for key in ("identity", "web", "desks", "theme", "cadence"):
        if key not in cfg:
            err("engine", "engine.config.json has no '%s' block" % key)
    if "desks" not in cfg or "web" not in cfg:
        return

    # 1. The app must actually READ the config, and the generated JS the browser
    #    loads must be byte-identical to what the config says. Either failing
    #    means the config describes a site other than the one readers get.
    app = io.open(APP, encoding="utf-8").read()
    if "window.RTFC_ENGINE" not in app:
        err("engine", "app.js never reads window.RTFC_ENGINE — engine.config.json "
            "is decorative; the site is still hardcoded")
    if not re.search(r"var SECTION_COLORS\s*=\s*deskMap\(", app):
        err("engine", "app.js SECTION_COLORS is not derived from the config's desks "
            "— the desk list exists in two places again, and they WILL drift")
    gen = ROOT / "newsroom" / "runner" / "gen_engine_js.py"
    out = DATA / "engine.js"
    if gen.is_file():
        try:
            import importlib.util
            spec = importlib.util.spec_from_file_location("gen_engine_js", gen)
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            want = mod.render()
            have = io.open(out, encoding="utf-8").read() if out.is_file() else ""
            if want != have:
                if fix_requested():
                    io.open(out, "w", encoding="utf-8", newline="\n").write(want)
                    note("engine: regenerated web/data/engine.js from engine.config.json")
                else:
                    err("engine", "web/data/engine.js is stale — it does not match "
                        "engine.config.json. Run newsroom/runner/gen_engine_js.py "
                        "(SHIP2 and CI do this automatically).")
        except Exception as exc:                           # noqa: BLE001
            err("check-crash", "check_engine_config could not render engine.js: %s" % exc)
    else:
        err("engine", "newsroom/runner/gen_engine_js.py is missing — the browser has "
            "no way to receive engine.config.json")

    # 2. Figures the site prints about itself must come from one place.
    personas = read_store(DATA / "personas.js", "RTFC_PERSONAS") or []
    want = (cfg.get("cadence") or {}).get("editorial_personas")
    if personas and want and len(personas) != want:
        err("engine", "engine.config.json says %d editorial personas, "
            "personas.js has %d. The site prints this number, and it has been "
            "wrong in public before ('7 editors' when there were 9)."
            % (want, len(personas)))

    # 3. THE RATCHET.
    site_url = (cfg.get("web") or {}).get("site_url", "")
    domain = (cfg.get("web") or {}).get("domain", "")
    if not domain:
        return
    counts = {}
    roots = [WEB / "assets" / "app.js", INDEX, ROOT / "functions",
             ROOT / "newsroom", ROOT / "agents", ROOT / ".github"]
    files = []
    for r in roots:
        if r.is_file():
            files.append(r)
        elif r.is_dir():
            files += [f for f in r.rglob("*")
                      if f.is_file() and f.suffix in
                      (".js", ".py", ".json", ".yml", ".yaml", ".html", ".md")]
    for f in files:
        if f.name in DOMAIN_OK or "__pycache__" in str(f):
            continue
        try:
            n = io.open(f, encoding="utf-8", errors="replace").read().count(domain)
        except OSError:
            continue
        if n:
            counts[str(f.relative_to(ROOT)).replace("\\", "/")] = n

    base = {}
    if BASELINE.is_file():
        try:
            base = json.loads(io.open(BASELINE, encoding="utf-8").read())
        except Exception:                                  # noqa: BLE001
            base = {}
    if not base:
        io.open(BASELINE, "w", encoding="utf-8").write(
            json.dumps(counts, indent=2, sort_keys=True) + "\n")
        note("engine: recorded the hardcoding baseline (%d files, %d literals). "
             "It may go down from here, never up."
             % (len(counts), sum(counts.values())))
        return

    grew = [(f, n, base.get(f, 0)) for f, n in counts.items() if n > base.get(f, 0)]
    for f, n, was in sorted(grew):
        err("engine", "%s hardcodes '%s' %d times, up from %d. New code must "
            "read engine.config.json — every literal added here is another "
            "place a second site breaks." % (f, domain, n, was))
    total, was_total = sum(counts.values()), sum(base.values())
    if total < was_total:
        # Lowering the ceiling can only make future runs stricter, never looser,
        # so it is always safe to record and needs no flag.
        io.open(BASELINE, "w", encoding="utf-8").write(
            json.dumps(counts, indent=2, sort_keys=True) + "\n")
        note("engine: hardcoded '%s' literals down to %d from %d — baseline lowered"
             % (domain, total, was_total))
    else:
        note("engine: %d hardcoded '%s' literals across %d files (baseline held)"
             % (total, domain, len(counts)))


def check_workflow_staging():
    """Any workflow that commits and rebases must stage the WHOLE tree first.

    WHY (2026-08-15, twice in one day). `git pull --rebase` refuses to run at
    all when a tracked file is modified and unstaged: "cannot pull with rebase:
    You have unstaged changes", exit 128. A workflow that stages a hand-written
    list of paths and then rebases is therefore one stray modified file away
    from failing — and it fails at the END, after the agent has already spent
    thirty minutes writing the articles.

    It killed 2 of the last 8 Newsroom Cycles and, in the same shape, all three
    push attempts of the owner's ship script the same morning. The fix is one
    line, `git add -u`, and the reason this is a CHECK and not just a fix is
    that there were FIVE copies of the pattern and only one got fixed the first
    time. That is the failure shape this whole repo keeps repeating: a real fix
    applied to one instance while its siblings sit untouched.
    """
    wf = ROOT / ".github" / "workflows"
    staged = ROOT / "workflow_updates"
    files = []
    for d in (wf, staged):
        if d.is_dir():
            files += sorted(d.glob("*.yml")) + sorted(d.glob("*.yaml"))
    if not expect("check_workflow_staging", len(files), 3, "workflow files"):
        return
    for f in files:
        text = io.open(f, encoding="utf-8", errors="replace").read()
        # Only SHELL matters. Several workflows also describe git steps in prose
        # inside an agent prompt ("7. Commit and push: git pull --rebase first"),
        # and flagging those is how a check earns a reputation for crying wolf.
        # A real command starts its line; prose mentions it mid-sentence.
        if not re.search(r"^\s*git pull --rebase", text, re.M):
            continue
        if not re.search(r"^\s*git add -u\s*$", text, re.M):
            err("workflow", "%s rebases but never runs `git add -u`. One stray "
                "modified file makes `git pull --rebase` exit 128 and fails the "
                "run after all the work is done." % f.name)
        if re.search(r"git rebase --abort;", text):
            err("workflow", "%s runs `git rebase --abort;` without `|| true`. "
                "When the pull died before starting a rebase there is nothing "
                "to abort, so the cleanup itself errors and fails the step it "
                "was meant to rescue." % f.name)


# --------------------------------------------------------------------------
def run(label, fn, *args, **kwargs):
    """Run one check. If it throws, that becomes a FINDING, not the end of the run.

    WHY (2026-08-15). check_ledger hit a row a bot had written that the parser
    could not read, raised, and took the whole guard down with it — mid-report,
    before printing a single result. The ship was blocked by a stack trace and
    the nine other check families never ran. A guard that dies while guarding is
    worse than no guard: it is an outage that looks like diligence.

    A crashing check is a real error and still fails the build. It just fails it
    with a name, alongside everything the other checks found.
    """
    try:
        return fn(*args, **kwargs)
    except Exception as exc:                               # noqa: BLE001
        err("check-crash", "%s raised %s: %s — this check could not run, so "
            "whatever it protects is currently unchecked"
            % (label, type(exc).__name__, exc))
        return None


def expect(family: str, found: int, minimum: int, what: str) -> bool:
    """Assert that a check actually FOUND something to check.

    THE FAILURE MODE THIS EXISTS FOR (2026-08-15, owner: "make sure things I am
    not even imagining are checked").

    Almost every check here works by matching a pattern against a file. A
    pattern that stops matching does not report anything — it reports NOTHING,
    which is byte-for-byte identical to "I looked and everything was fine". A
    guard cannot tell you it has gone blind; it just gets quieter.

    This already happened. `check_scripts_and_globals` matched
    `<script defer src="(data/...` and the day index.html moved to
    `/data/...` it silently matched zero script tags and passed every run,
    while it was checking nothing at all. It was caught by a human reading the
    regex, which is not a system.

    So every pattern-based check now states how many things it EXPECTS to find.
    Finding fewer is not a clean pass; it is the check declaring itself broken,
    and it fails the build under the same rules as any other code fault.
    Returns True when the check may proceed.
    """
    if found >= minimum:
        return True
    err("check-blind", "%s found only %d %s (expected at least %d). The check "
        "did not pass — it went blind. Its pattern no longer matches the files "
        "it reads, so everything it protects is currently unchecked."
        % (family, found, what, minimum))
    return False


def report_salvage():
    """Surface anything a store reader had to skip to keep going.

    Read these as LIVE OUTAGES, not as parser trivia. This guard is deliberately
    tolerant so that one bad record cannot blind it — but a browser is not. If a
    store needed salvage here, the browser threw a SyntaxError on the whole file,
    the global never got defined, and every page reading it is serving stale or
    empty data to real readers right now.
    """
    if SALVAGE_REPORT:
        err("store-salvage", "a store below needed salvage to be read at all. "
            "The BROWSER has no salvage: it loads none of that file, so the "
            "pages it feeds are stale on the live site until this is repaired "
            "(site_guard.py --fix-syntax repairs the common causes).")
    for label, idx, msg in SALVAGE_REPORT:
        where = label if idx < 0 else "%s[%d]" % (label, idx)
        err("store-salvage", "%s: %s" % (where, msg))


def main() -> int:
    global CHECK_ASSETS
    fix = "--fix" in sys.argv
    CHECK_ASSETS = "--skip-assets" not in sys.argv

    # --fix-syntax: repair ONLY the two faults that make a store unreadable to a
    # browser, then stop. Safe to run from a workstation seconds before a push,
    # because it edits punctuation in a file that is already invalid JS and
    # touches nothing a bot could be appending to at the same moment. The full
    # --fix (id renumbering and the rest) stays in CI, where there is no race.
    if "--fix-syntax" in sys.argv:
        check_array_holes(True)
        repair_missing_script_tags(True)
        run("check_engine_config", check_engine_config)
        for n in NOTES:
            say("  " + MARK_NOTE + " " + n)
        say("syntax repair pass complete" if NOTES else "no store-syntax faults found")
        return 0

    run("check_array_holes", check_array_holes, fix)
    run("repair_ledger_ids", repair_ledger_ids, fix)
    run("repair_future_timestamps", repair_future_timestamps, fix)
    run("repair_missing_script_tags", repair_missing_script_tags, fix)
    personas = run("read personas.js", read_store, DATA / "personas.js", "RTFC_PERSONAS") or []
    sections = run("read sections", read_store, DATA / "personas.js", "RTFC_SECTIONS") or []
    entities = run("read entities.js", read_store, DATA / "entities.js", "RTFC_ENTITIES") or []
    if isinstance(entities, dict):
        entities = entities.get("models") or []

    arts = run("load_articles", load_articles) or []
    expect("load_articles", len(arts), 50, "articles across every store")
    slugs = run("check_articles", check_articles, arts, personas, sections) or {}
    run("check_scoreboard", check_scoreboard, entities)
    run("check_grid", check_grid)
    run("check_extensions", check_extensions)
    run("check_ledger", check_ledger)
    run("check_no_hash_links", check_no_hash_links)
    run("check_no_paid_content_in_repo", check_no_paid_content_in_repo)
    run("check_route_plumbing", check_route_plumbing)
    run("check_routes_have_titles", check_routes_have_titles)
    run("check_scripts_and_globals", check_scripts_and_globals)
    run("check_cache_buster", check_cache_buster)
    run("check_renderer_parity", check_renderer_parity)
    run("check_ssr_store_parity", check_ssr_store_parity)
    run("check_engine_config", check_engine_config)
    run("check_workflow_staging", check_workflow_staging)
    run("check_sitemap_and_rss", check_sitemap_and_rss, list(slugs.keys()))
    report_salvage()

    say("=" * 72)
    say("SITE GUARD - %d articles, 10 check families" % len(arts))
    for n in NOTES:
        say("  " + MARK_NOTE + " " + n)
    if WARNS:
        say("\nWARNINGS (%d):" % len(WARNS))
        for w in WARNS:
            say("  " + MARK_WARN + " " + w)
    if ERRORS:
        say("\nERRORS (%d):" % len(ERRORS))
        for e in ERRORS:
            say("  " + MARK_ERR + " " + e)
        # --gate code: fail only on the families a human ship can actually fix
        # right now (code and configuration). Data-side findings in bot-owned
        # stores are printed but do not block, because the authoritative repair
        # is site-guard.yml running --fix in the same checkout as the bots —
        # blocking the owner's ship on a row an agent will rewrite in ten
        # minutes is how a guard gets disabled.
        if "--gate" in sys.argv:
            i = sys.argv.index("--gate")
            scope = sys.argv[i + 1] if len(sys.argv) > i + 1 else "all"
            if scope == "code":
                # "check-crash" is here on purpose. With the salvage layer in
                # jsstore, bot-written data can no longer take a check down, so a
                # crash now means the guard's OWN code is broken — and shipping
                # while a whole check family silently isn't running is the exact
                # hole that let three pages die in front of readers.
                # "store-salvage" is NOT here: a malformed row is bot-owned data,
                # repaired by site-guard.yml in CI, and blocking the owner's ship
                # on a row an agent will rewrite in ten minutes is how a guard
                # gets switched off.
                code_fams = ("route-titles", "scripts", "cache-buster", "renderers",
                             "hash-links", "routing", "paid-content", "ssr-parity",
                             "check-crash", "check-blind", "engine", "workflow")
                blocking = [e for e in ERRORS if e.strip().startswith(code_fams)]
                if not blocking:
                    say("\nGUARD: no CODE-side errors — ship allowed. The data "
                          "findings above are repaired by site-guard.yml in CI.")
                    return 0
                say("\nGUARD FAILED on code-side errors — do not ship this state.")
                return 1
        say("\nGUARD FAILED - do not ship this state.")
        return 1
    say("\nGUARD PASSED — every contract the site depends on is intact.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
