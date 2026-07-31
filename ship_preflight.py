#!/usr/bin/env python3
"""RTFCLMGZN ship pre-flight + cache-buster bump.

WHY THIS IS A .PY FILE AND NOT A PILE OF `python -c` STRINGS IN A .BAT

Three separate shipping attempts died because cmd.exe rewrites a command line
before the program on it ever runs, and every one of those failures was silent
until it produced a Python SyntaxError about code nobody wrote:

  1. `%` -- cmd strips an unpaired percent sign inside a batch file, which turned
     `'BAD: %s' % bad` into `'BAD: s' bad`. SHIP_VISUAL_SYSTEM.bat could never
     pass its own pre-flight.
  2. `!` -- with EnableDelayedExpansion (needed for the deploy-poll loop), `!` is
     an expansion sigil. `if len(ns)!=1 else None; ... print('...:` had the whole
     span from the `!` onward eaten. That is what stopped the last two runs.
  3. Quote nesting -- every apostrophe in a Python literal has to survive cmd's
     own quote parser on the way through.

None of those are Python problems, none of them are visible in the source, and
all of them vanish the moment the code lives in a file. Everything the ship
script needs to compute now happens here, and the .bat only calls this and then
runs git.

Exit codes: 0 = all checks passed and the cache-buster was bumped (new number is
written to .newb for the .bat to read). 1 = a check failed; nothing was modified.
"""

from __future__ import annotations

import ast
import io
import json
import re
import shutil
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MIN_FREE_MB = 400
OK, BAD = "  ok   ", "  FAIL "

# ---------------------------------------------------------------------------
# Freshness thresholds. Each is the point past which the surface stops being a
# live publication and starts being a screenshot of one -- and each is set from
# the cadence that surface is actually promised, plus one missed run of slack so
# a single skipped cycle warns nobody and two skipped cycles block the ship.
#
# The failure these exist to catch is silent: nothing errors when a desk rots.
# The Buzz once sat 8 days stale past its own 7-day retirement rule and the
# Scoreboard was missing a frontier flagship 5 days after this newsroom
# published its launch story, and both were found by a human noticing, not by
# any check. Staleness is the one defect that gets worse on its own.
#
# 36h -- newest article `publishedAt`. Three publishing cycles run daily
#        (05:00/11:00/17:00 Central, ~6h apart) and a legitimately empty cycle is
#        allowed by the runbook, so a day with no story is possible and honest.
#        A day and a half with none is not: it means the runner is wedged, the
#        kill switch is on, or pushes are being rejected and nobody noticed.
ARTICLE_MAX_AGE_H = 36
# 24h -- newest `buzz.js` card. The breaking scan runs every 2h and is required
#        to refresh Buzz on EVERY run, targeting 9+ fresh posts a day. A full
#        day with nothing added means roughly twelve consecutive scans either did
#        not run or found nothing, and the second is not credible on this beat.
BUZZ_MAX_AGE_H = 24
# 18h -- `scoreboard.js` `scannedAt`. The Benchmark Data Desk's own standard is
#        that the Scoreboard is never more than 12 hours behind a completed run;
#        the pulse scan (every 3h) advances `scannedAt` even when nothing moved,
#        so this is 12h plus one missed pulse plus margin. Tighter than the
#        others on purpose: a stale leaderboard shows readers wrong numbers,
#        where a stale feed only shows them old ones.
SCOREBOARD_MAX_AGE_H = 18


def read(rel: str) -> str:
    return io.open(ROOT / rel, encoding="utf-8", newline="").read()


ASSIGN = re.compile(r"window\.[A-Za-z_][A-Za-z_0-9]*\s*=\s*(?=[\[{])")


def js_object(rel: str, opener: str):
    """Slice a `window.VAR = <literal>;` payload out of a data file.

    Matched on the ASSIGNMENT ITSELF -- the variable name followed by `=` followed
    by an opening bracket -- and never on a bare name or on the first bracket in
    the file. Both of the weaker anchors have already failed here:

      * first-bracket: worldmap.js documents its own shape in a header comment,
        `{ w, h, paths:{...}, meta:{...} }`, so the slice parsed the DOCUMENTATION.
      * bare name: that same comment says "(window.RTFC_WORLDMAP)", with no `=`,
        so anchoring on the name landed in the comment and then found the very
        same brace. Two different fixes, one identical JSONDecodeError at char 2.

    The last match wins, so a header that shows example assignments cannot win
    over the real one at the bottom of the file.
    """
    s = read(rel)
    matches = list(ASSIGN.finditer(s))
    if not matches:
        raise RuntimeError(f"no `window.X = {opener}` assignment found in {rel}")
    start = matches[-1].end()
    if s[start] != opener:
        raise RuntimeError(f"{rel} assigns a {s[start]!r}, expected {opener!r}")
    end = s.rindex("]") + 1 if opener == "[" else s.rindex("}") + 1
    return json.loads(s[start:end])


COMPONENTS = {
    "chart", "compare", "timeline", "entity", "scorecard", "ledger", "beforeafter",
    "spectrum", "flow", "keyfacts", "stakes", "sourcecheck", "stat",
    "model", "rank", "counter", "document",
    "procedure", "snippet", "decide", "pitfalls",
}

REQUIRED_FILES = [
    "web/assets/app.js", "web/assets/styles.css", "web/index.html",
    "web/data/worldmap.js", "web/data/guides.js", "web/data/figures.js",
    "web/data/resolutions.js", "functions/api/geo.js",
    "newsroom/quality/component_audit.py", "newsroom/schemas/article-draft.json",
]

failures: list[str] = []


warnings: list[str] = []


def warn(label: str, fn):
    """Report, never block.

    Surface freshness is a CONTENT defect, not a code-safety one. This script
    gates whether a build is safe to deploy, and refusing to ship a paywall fix
    or a security header because the Buzz feed is 26 hours old is the wrong
    trade every single time. The scheduled cycle should treat staleness as
    fatal -- it is the thing that can actually fix it. A human shipping code
    needs to SEE it, not be stopped by it.
    """
    try:
        detail = fn()
    except Exception as exc:                      # noqa: BLE001
        warnings.append(f"{label}: {exc}")
        print(f"  warn  {label:<20}{exc}")
        return
    print(f"{OK}{label:<20}{detail if detail is not None else ''}")


def check(label: str, fn):
    try:
        detail = fn()
    except Exception as exc:                      # noqa: BLE001 - report, never crash
        failures.append(f"{label}: {type(exc).__name__}: {exc}")
        print(f"{BAD}{label:<20}{type(exc).__name__}: {exc}")
        return
    if detail is None:
        print(f"{OK}{label}")
    else:
        print(f"{OK}{label:<20}{detail}")


def c_disk():
    free = shutil.disk_usage(ROOT).free // (1024 * 1024)
    if free < MIN_FREE_MB:
        raise RuntimeError(f"only {free} MB free, need more than {MIN_FREE_MB}")
    return f"{free:,} MB free"


def c_schema():
    d = json.loads(read("newsroom/schemas/article-draft.json"))
    fmt = d["properties"]["article"]["properties"]["format"]["enum"]
    n = len(d["properties"]["article"]["properties"]["body"]["items"]["anyOf"])
    if "guide" not in fmt:
        raise RuntimeError("format enum is missing 'guide'")
    return f"valid JSON, {n} body branches, formats {'/'.join(fmt)}"


def c_python():
    for f in ("newsroom/autonomy/schema.py", "newsroom/quality/article_score.py",
              "newsroom/quality/component_audit.py"):
        ast.parse(read(f))
    return "parse clean"


def c_utf8():
    # The cycle runbook's mojibake guard: these files are full of em dashes and
    # curly quotes, and one non-UTF-8-safe edit corrupts the whole file silently.
    bad = [f for f in ("web/index.html", "web/assets/app.js", "web/assets/styles.css",
                       "web/data/guides.js")
           if io.open(ROOT / f, encoding="utf-8", errors="replace").read().count("â€")]
    if bad:
        raise RuntimeError(f"mojibake in {bad}")
    return "clean"


def c_files():
    missing = [f for f in REQUIRED_FILES if not (ROOT / f).exists()]
    if missing:
        raise RuntimeError(f"missing {missing}")
    return f"all {len(REQUIRED_FILES)} present"


def c_worldmap():
    d = js_object("web/data/worldmap.js", "{")
    n = len(d["paths"])
    if n < 150:
        raise RuntimeError(f"only {n} countries")
    return f"{n} countries, viewBox {d['w']}x{d['h']}"


def c_guides():
    g = js_object("web/data/guides.js", "[")
    no_proc = [x["slug"] for x in g
               if not any(b.get("type") == "procedure" for b in x.get("body") or [])]
    if no_proc:
        raise RuntimeError(f"guide with no procedure block: {no_proc}")
    return f"{len(g)} guides, every one carries a procedure"


def c_invariant():
    # THE INVARIANT: rtfcListen() speaks every block with .text and wordCount()
    # sums it, so a component carrying top-level text corrupts both.
    arts = js_object("web/data/newsroom-articles.js", "[")
    bad = [f"{x['slug']}:{b['type']}" for x in arts for b in x.get("body") or []
           if b.get("type") in COMPONENTS and "text" in b]
    if bad:
        raise RuntimeError(f"component blocks carrying top-level text: {bad}")
    return f"{len(arts)} articles, no component carries top-level text"


SCRIPT_SRC = re.compile(r"<script\b[^>]*\bsrc\s*=\s*[\"']([^\"']+)[\"']", re.I)


def c_scripts():
    """Every local `<script src>` in index.html must resolve to a real file.

    index.html hand-lists ~40 data files in explicit load order and app.js reads
    the globals they define. A renamed, moved, or deleted one is a 404 that the
    browser reports only to the console: the page still renders, and the feature
    that needed that global just silently isn't there. REQUIRED_FILES above is a
    hardcoded list of ten that has never tracked the script tags, so until now
    nothing in the ship path connected the page's own manifest to the filesystem.

    Absolute and protocol-relative URLs are somebody else's server and are not
    checked; the query string (`?b=N`) and any fragment are stripped before the
    path is resolved, and a leading `/` is resolved against `web/`, which is what
    Pages serves as the site root.
    """
    web = ROOT / "web"
    missing, checked = [], 0
    for src in SCRIPT_SRC.findall(read("web/index.html")):
        if re.match(r"^(?:[a-z][a-z0-9+.-]*:)?//", src, re.I) or src.startswith("data:"):
            continue
        checked += 1
        rel = src.split("?", 1)[0].split("#", 1)[0].lstrip("/")
        if not (web / rel).is_file():
            missing.append(src)
    if missing:
        raise RuntimeError(f"{len(missing)} <script src> resolve to nothing: {missing}")
    return f"{checked} local script tag(s), all resolve"


def _iso(stamp: str):
    """Parse an ISO stamp from the data files. `Z` is spelled out for < 3.11."""
    parsed = datetime.fromisoformat(stamp.strip().replace("Z", "+00:00"))
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


# `date:"2026-07-24"` in buzz.js. Matched with a left guard so it cannot pick up
# a longer key ending in "date". buzz.js and scoreboard.js are JS object-literal
# syntax (unquoted keys), so json cannot read them -- these are read by pattern,
# not parsed.
BUZZ_DATE = re.compile(r"(?<![A-Za-z_])date\s*:\s*\"(\d{4}-\d{2}-\d{2})\"")
SCANNED_AT = re.compile(r"(?<![A-Za-z_])scannedAt\s*:\s*\"([^\"]+)\"")


def _newest_article():
    stamps = [a["publishedAt"] for a in js_object("web/data/newsroom-articles.js", "[")
              if a.get("publishedAt")]
    if not stamps:
        raise RuntimeError("newsroom-articles.js carries no publishedAt at all")
    return _iso(max(stamps))          # same-format Z stamps sort lexicographically


def _newest_buzz():
    dates = BUZZ_DATE.findall(read("web/data/buzz.js"))
    if not dates:
        raise RuntimeError("buzz.js carries no dated cards")
    # `date` is day-granular, so a card dated today was added at some unknown
    # hour of today. Age it from the LAST instant it could denote (end of that
    # UTC day); aging from midnight instead would fail a feed refreshed three
    # hours ago every time the clock passed 00:00Z, and a guard that cries wolf
    # is a guard someone deletes.
    return _iso(max(dates)) + timedelta(days=1)


def _newest_scan():
    found = SCANNED_AT.findall(read("web/data/scoreboard.js"))
    if not found:
        raise RuntimeError("scoreboard.js has no scannedAt")
    return _iso(max(found))


def c_freshness():
    """Fail the ship when a live surface has quietly stopped being live.

    Reports all three ages every run -- the number going up across runs is the
    early warning -- and names every stale surface at once rather than failing on
    the first, so one run tells you everything that rotted.
    """
    now = datetime.now(timezone.utc)
    surfaces = (
        ("newest article", _newest_article, ARTICLE_MAX_AGE_H),
        ("newest buzz card", _newest_buzz, BUZZ_MAX_AGE_H),
        ("scoreboard scan", _newest_scan, SCOREBOARD_MAX_AGE_H),
    )
    ages, stale = [], []
    for label, getter, limit in surfaces:
        hours = max(0.0, (now - getter()).total_seconds() / 3600)
        ages.append(f"{label} {hours:.0f}h/{limit}h")
        if hours > limit:
            stale.append(f"{label} is {hours:.0f}h old, limit is {limit}h")
    if stale:
        raise RuntimeError("; ".join(stale))
    return ", ".join(ages)


def c_audit():
    r = subprocess.run([sys.executable, "-m", "newsroom.quality.component_audit"],
                       cwd=ROOT, capture_output=True, text=True)
    sys.stdout.write(r.stdout)
    sys.stderr.write(r.stderr)
    if r.returncode != 0:
        raise RuntimeError(f"component_audit exited {r.returncode}")
    return None


def bump() -> str:
    """Bump every ?b=N in index.html by one. Read and written with newline=''
    so line endings survive the round trip untouched."""
    p = ROOT / "web/index.html"
    s = io.open(p, encoding="utf-8", newline="").read()
    found = sorted(set(re.findall(r"\?b=(\d+)", s)))
    if len(found) != 1:
        raise RuntimeError(f"cache-buster numbers disagree: {found}")
    new = str(int(found[0]) + 1)
    io.open(p, "w", encoding="utf-8", newline="").write(re.sub(r"\?b=\d+", "?b=" + new, s))
    io.open(ROOT / ".newb", "w").write(new)
    return f"b={found[0]} -> b={new}"


def main() -> int:
    print("=== Pre-flight ===")
    check("free disk", c_disk)
    check("article-draft.json", c_schema)
    check("python files", c_python)
    check("UTF-8", c_utf8)
    check("files present", c_files)
    check("index.html scripts", c_scripts)
    check("worldmap.js", c_worldmap)
    check("guides.js", c_guides)
    check("component blocks", c_invariant)
    warn("surface freshness", c_freshness)
    check("component audit", c_audit)

    if failures:
        print(f"\n{len(failures)} PRE-FLIGHT FAILURE(S) -- nothing was modified:")
        for f in failures:
            print(f"  FAIL  {f}")
        return 1

    print("\n=== Cache-buster ===")
    # A scheduled cycle has already published the current number against the OLD
    # app.js, so that URL is cached at the edge and in every reader's browser.
    # Reusing it would ship the new build to nobody.
    try:
        print(f"{OK}{'index.html':<20}{bump()}")
    except Exception as exc:                      # noqa: BLE001
        print(f"{BAD}cache-buster        {exc}")
        return 1

    if warnings:
        print(f"\n{len(warnings)} WARNING(S) -- not blocking, but the desks are rotting:")
        for w in warnings:
            print(f"  warn  {w}")
    print("\nPre-flight passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
