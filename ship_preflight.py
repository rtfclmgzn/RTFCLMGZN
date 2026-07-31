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
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MIN_FREE_MB = 400
OK, BAD = "  ok   ", "  FAIL "


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
    check("worldmap.js", c_worldmap)
    check("guides.js", c_guides)
    check("component blocks", c_invariant)
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

    print("\nPre-flight passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
