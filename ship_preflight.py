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
import hashlib
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
# 36h -- newest article `publishedAt`. The runner is a Windows Task Scheduler
#        MINUTE task on a rolling interval (schedule.interval_minutes, 240 by
#        default), NOT three fixed daily editions -- this comment claimed
#        05:00/11:00/17:00 Central until 2026-08-13, and the site's Control Room
#        claimed the same three hours, but the published record shows stories
#        landing across fifteen different hours of the day. A legitimately empty
#        cycle is allowed by the runbook, so a day with no story is possible and
#        honest. A day and a half with none is not: at a 4h interval that is nine
#        consecutive silent cycles, which means the runner is wedged, the kill
#        switch is on, or pushes are being rejected and nobody noticed.
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


BUSTER_RE = re.compile(r"\?b=([0-9a-z]+)")


def bump() -> str:
    """Stamp every ?b= in index.html with a hash of what index.html actually loads.

    THIS USED TO BE A COUNTER, AND THE COUNTER SHIPPED A BUILD TO NOBODY.

    The old version incremented ?b=N by one on every run. That is correct only if
    this script is the sole thing that ever changes a busted file. It is not. On
    2026-08-13 a scheduled cycle ran, bumped 385 -> 387 against the then-current
    app.js, and published. A separate commit an hour later replaced app.js and
    styles.css with a large overhaul but did not run the ship path, so those new
    files went to the edge under the SAME ?b=387 URL that every browser and every
    edge node had already cached. The server had the new bundle. Not one reader
    could get it. The site looked completely unchanged, and nothing anywhere
    reported an error, because from HTTP's point of view nothing was wrong.

    A counter encodes "how many times did we ship", which is not the question.
    The question is "is this byte-for-byte what the reader already has", and only
    the content can answer that. So the stamp is now a short digest over the
    bytes of every local file index.html references, plus index.html itself.

    Consequences worth knowing:
      - Any commit that changes app.js, styles.css or any data/*.js changes the
        stamp, whoever makes it and whether or not they ran the ship path.
      - A run that changes nothing produces the SAME stamp, so readers keep their
        warm cache instead of re-downloading ~800KB for no reason. The counter
        busted every cache on every run whether anything changed or not.
      - The stamp is hex, not decimal. Nothing parses it as a number; it is only
        ever compared for equality by a cache.

    Read and written with newline='' so line endings survive untouched.
    """
    p = ROOT / "web/index.html"
    s = io.open(p, encoding="utf-8", newline="").read()
    old = sorted(set(BUSTER_RE.findall(s)))
    if len(old) != 1:
        raise RuntimeError(f"cache-buster values disagree, refusing to stamp: {old}")

    web = ROOT / "web"
    # Every local asset the page references, in the page's own order, deduped.
    # Sorting would hide a reordering of the load sequence, which app.js depends
    # on, so the order is part of what gets hashed.
    refs, seen = [], set()
    for src in SCRIPT_SRC.findall(s) + re.findall(
        r"<link\b[^>]*\bhref\s*=\s*[\"']([^\"']+)[\"']", s, re.I
    ):
        if re.match(r"^(?:[a-z][a-z0-9+.-]*:)?//", src, re.I) or src.startswith("data:"):
            continue
        rel = src.split("?", 1)[0].split("#", 1)[0].lstrip("/")
        if rel and rel not in seen:
            seen.add(rel)
            refs.append(rel)

    digest = hashlib.sha256()
    # index.html's own markup counts: a copy change with no asset change still
    # needs the HTML re-fetched, and the HTML is what carries the stamp.
    digest.update(BUSTER_RE.sub("?b=", s).encode("utf-8"))
    # A referenced file that does not exist is a 404, and c_scripts already fails
    # the run for a missing <script src>. It is NOT worth failing here for a
    # missing icon or feed: this script gates the autonomous publishing path, and
    # blocking the news over a cosmetic 404 is a worse outcome than the 404. The
    # missing path still goes into the digest by name, so a file appearing or
    # disappearing changes the stamp; only its bytes are unavailable to hash, and
    # a file nobody can fetch is a file nobody has cached.
    missing = []
    for rel in refs:
        f = web / rel
        digest.update(rel.encode("utf-8"))
        if f.is_file():
            digest.update(f.read_bytes())
        else:
            missing.append(rel)
            digest.update(b"\x00MISSING")

    new = digest.hexdigest()[:10]
    note = f" [{len(missing)} referenced file(s) missing: {', '.join(missing)}]" if missing else ""
    if new == old[0]:
        io.open(ROOT / ".newb", "w").write(new)
        return f"b={new} unchanged - no asset bytes differ, readers keep their cache{note}"
    io.open(p, "w", encoding="utf-8", newline="").write(BUSTER_RE.sub("?b=" + new, s))
    io.open(ROOT / ".newb", "w").write(new)
    return f"b={old[0]} -> b={new} ({len(refs)} assets hashed){note}"


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
