#!/usr/bin/env python3
"""RTFCLMGZN — automated pre-ship QA scan.

This is the gate that should have existed all along. It statically checks the
shipped data/HTML for the exact classes of error the founder kept catching by
hand — so the SYSTEM catches them before he ever sees them, not after.

Run before calling any release "done":
    uv run --python 3.12 python agents/magazine/qa_scan.py
Exit code 0 = clean, 1 = problems found (each printed with file:line).

What it catches:
  1. STALE COUNTS   — any "N agents" / "N personas" that disagrees with the
                      canonical roster (the twenty-one-vs-twenty-six bug).
  2. MARKER BALANCE — unbalanced **bold** / ==highlight== / ++accent++ markers.
  3. PLACEHOLDER    — lorem/TODO/TBD/XXX/[insert leaks in shipped copy.
  4. LAYOUT REPEAT  — two adjacent magazine spreads using the same text layout
                      (the "AI slop, every page the same" complaint).
  5. THIN COPY      — split/data/fullBleed/quoteLead text pages whose body is too
                      short for the layout (the split-page void bug).

NOTE: this covers CONTENT/DATA defects. VISUAL defects (voids, crops, folio
crowding) require the browser audit documented in MAGAZINE-QA-GATE.md — run BOTH.
"""
import os, re, sys, glob

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
WEB = os.path.join(ROOT, "web")

# --- canonical roster (single source of truth; update here when the roster changes) ---
AGENTS = 26
PERSONAS = 9
WORDNUM = {  # spelled-out numbers we care about
    "seventeen":17,"eighteen":18,"nineteen":19,"twenty":20,"twenty-one":21,
    "twenty-two":22,"twenty-three":23,"twenty-four":24,"twenty-five":25,
    "twenty-six":26,"twenty-seven":27,"seven":7,"eight":8,"nine":9,"ten":10,
}


def _issue_js_files():
    """Issue files that actually carry spreads in web/data/.

    Excludes `*-meta.js`: since paid issues moved their pages to
    functions/api/issue/_data/<id>.json, those stubs are metadata only. They still declare
    format:"spread" (correctly — it describes the issue), so the gatefold and page-count
    checks used to fire on them every run and could never be satisfied. Their real content
    is scanned structurally in section 10.
    """
    out = glob.glob(os.path.join(WEB, "data", "*issue*.js")) + glob.glob(os.path.join(WEB, "data", "primer*.js"))
    return [f for f in out if not os.path.basename(f).endswith("-meta.js")]

problems = []
def flag(f, i, msg):
    problems.append(f"{os.path.relpath(f, ROOT)}:{i}: {msg}")

def shipped_files():
    files = glob.glob(os.path.join(WEB, "data", "*.js"))
    files += [os.path.join(WEB, "index.html"), os.path.join(WEB, "404.html")]
    return [f for f in files if os.path.isfile(f)]

# 1 + 3: counts and placeholders (line scan)
COUNT_RE = re.compile(r"([A-Za-z\-]+|\d+)\s+(ai\s+)?(agents|personas|writers)\b", re.I)
PLACEHOLDER_RE = re.compile(r"\blorem ipsum\b|\bTODO\b|\bTBD\b|\bFIXME\b|\bXXXX?\b|\[insert", re.I)
# The roster check must only look at files that describe OUR newsroom. The article
# corpus is full of legitimate sentences about other people's agents ("550 shopping
# queries", "3 agents"), and flagging those made the gate cry wolf on every run —
# which is how a noisy gate ends up ignored, the same failure this file exists to fix.
ROSTER_EXEMPT = ("newsroom-articles.js", "live-articles.js", "articles.js", "buzz.js",
                 "research.js", "guides.js", "approved-batch-2026-07-14.js",
                 "grid.js", "models-issue.js", "dictionary.js")

for f in shipped_files():
    roster_scope = os.path.basename(f) not in ROSTER_EXEMPT
    for i, line in enumerate(open(f, encoding="utf-8", errors="ignore"), 1):
        if "placeholder=" in line or 'placeholder"' in line:
            pass
        elif PLACEHOLDER_RE.search(line):
            flag(f, i, f"placeholder/TODO leak: {PLACEHOLDER_RE.search(line).group(0)!r}")
        if not roster_scope:
            continue
        for m in COUNT_RE.finditer(line):
            tok, _, kind = m.group(1).lower(), m.group(2), m.group(3).lower()
            val = WORDNUM.get(tok, int(tok) if tok.isdigit() else None)
            if val is None:
                continue
            want = AGENTS if kind in ("agents",) else PERSONAS
            if kind in ("agents", "personas", "writers") and val != want:
                # 'writers' == personas count; allow the exact roster only
                target = AGENTS if kind == "agents" else PERSONAS
                if val != target:
                    flag(f, i, f"STALE COUNT: '{m.group(0).strip()}' — roster is {target} {kind}")

# 2: rich-text marker balance in magazine issue files
for f in _issue_js_files():
    txt = open(f, encoding="utf-8", errors="ignore").read()
    for marker, name in (("**","bold"), ("==","highlight"), ("++","accent")):
        n = txt.count(marker)
        if n % 2 != 0:
            flag(f, 0, f"UNBALANCED {name} markers ('{marker}' appears {n} times — must be even)")

# 4 + 5: magazine spread checks (adjacent-layout repeat + thin copy)
# Only the layouts with a TEXT COLUMN BESIDE A TALL IMAGE void when copy is short;
# image-forward layouts (posterTop/fullBleed/quoteLead/bottomImage/cornerCard) fill
# via the image regardless, so they're NOT copy-length-sensitive.
THIN_LAYOUTS = {"splitLeft","splitRight","statFeature"}
MIN_WORDS = 95  # a side-column text page needs >= this many words of body or it voids
for f in _issue_js_files():
    txt = open(f, encoding="utf-8", errors="ignore").read()
    # crude spread walk: each spread starts at `{ kind:"..."`
    spreads = re.findall(r'kind:"([a-z]+)"(?:[^{}]*?layout:"([a-zA-Z]+)")?', txt)
    prev = None
    for kind, layout in spreads:
        sig = layout or kind
        if sig == prev and kind == "text":
            flag(f, 0, f"ADJACENT REPEAT: two '{sig}' text spreads in a row (vary the layout)")
        prev = sig
    # thin-copy: for each text spread with a thin layout, count body sentences
    for block in re.split(r'\{\s*kind:"text"', txt)[1:]:
        block = block[:block.find("] }")+3] if "] }" in block else block[:1500]
        lm = re.search(r'layout:"([a-zA-Z]+)"', block)
        lay = lm.group(1) if lm else "posterTop"
        if lay in THIN_LAYOUTS:
            body = re.search(r'body:\s*\[(.*?)\]', block, re.S)
            if body:
                words = len(re.findall(r"[A-Za-z][A-Za-z'\-]+", body.group(1)))
                if words < MIN_WORDS:
                    tm = re.search(r'title:"([^"]{0,40})', block)
                    flag(f, 0, f"THIN COPY: '{lay}' page (\"{tm.group(1) if tm else '?'}\") has ~{words} words (<{MIN_WORDS}); it may void")

# 6: gatefolds — every spread issue ships exactly one centerfold + one verticalfold,
# each with real image/title/cap (the founder's jointed-image feature; MAGAZINE-STANDARD §13).
for f in _issue_js_files():
    txt = open(f, encoding="utf-8", errors="ignore").read()
    if 'format:"spread"' not in txt and "format:'spread'" not in txt:
        continue
    for fold in ("centerfold", "verticalfold"):
        n = len(re.findall(r'kind:"%s"' % fold, txt))
        if n != 1:
            flag(f, 0, f"GATEFOLD: expected exactly 1 '{fold}' spread, found {n} (MAGAZINE-STANDARD §13)")
        # each fold block must carry image + title + cap
        for block in re.split(r'\{\s*kind:"%s"' % fold, txt)[1:]:
            block = block[:block.find("}")+1] if "}" in block else block[:400]
            for field in ("image", "title", "cap"):
                if not re.search(r'\b%s:' % field, block):
                    flag(f, 0, f"GATEFOLD: '{fold}' is missing '{field}:' (needs image+title+cap)")

# 7: hardcoded PAGE COUNTS in magazine prose — they drift out of sync every time a page is
# added (this is what let "Twenty-seven pages" ship on a 37-page Primer). Flag any count of
# 10+ immediately followed by "page(s)" in the shipped magazine copy; the fix is to derive it
# or drop it (§13 / N-017), never to type a number that a later edit silently invalidates.
PAGECOUNT_DIGIT = re.compile(r'\b(\d{2,3})\s*-?\s*pages?\b', re.I)
PAGECOUNT_WORD  = re.compile(r'\b((?:twenty|thirty|forty|fifty|sixty)(?:[\s-](?:one|two|three|four|five|six|seven|eight|nine))?)\s+pages?\b', re.I)
for f in _issue_js_files() + [os.path.join(WEB, "data", "magazine-issues.js")]:
    if not os.path.isfile(f):
        continue
    for i, line in enumerate(open(f, encoding="utf-8", errors="ignore"), 1):
        if line.lstrip().startswith("//"):
            continue
        for m in PAGECOUNT_DIGIT.finditer(line):
            if int(m.group(1)) >= 10:
                flag(f, i, f"HARDCODED PAGE COUNT: '{m.group(0).strip()}' in prose — drifts when pages change; derive or drop it (N-017)")
        for m in PAGECOUNT_WORD.finditer(line):
            flag(f, i, f"HARDCODED PAGE COUNT: '{m.group(0).strip()}' in prose — drifts when pages change; derive or drop it (N-017)")

# 8: FLAGSHIP QUALITY (founder-locked 2026-07-12 — "40-80pp, no image reuse, quality over everything").
#    These are the standards a REAL magazine meets; the digest-era issues fail them until remade.
for f in _issue_js_files():
    txt = open(f, encoding="utf-8", errors="ignore").read()
    if 'format:"spread"' not in txt:
        continue
    # rendered page count (folds render as 2). Flag < 40 (target 40-80; N-020).
    spreads = re.findall(r'\{\s*kind:"([a-z]+)"', txt)
    pages = sum(2 if k in ("centerfold", "verticalfold") else 1 for k in spreads)
    if pages < 40:
        flag(f, 0, f"THIN ISSUE: only {pages} pages — a flagship issue is 40-80 (N-020). Expand stories, don't cap.")
    # image REUSE within the issue — every page earns its own art (N-021). Ads/covers included.
    imgs = re.findall(r'image:"assets/img/([^"]+)"', txt)
    seen = {}
    for im in imgs:
        seen[im] = seen.get(im, 0) + 1
    for im, c in seen.items():
        if c > 1:
            flag(f, 0, f"IMAGE REUSE: '{im}' used {c}× in one issue — each page needs unique art (N-021)")

# 9: ARTICLE FORMAT LADDER (founder-locked 2026-07-12) — three tiers by length:
#   brief ~300w · synthesis ~1,200w · RESEARCH ~3,500w (2,200+ floor) with 2-3 charts + 2+ authors.
#   Enforce the flagship end: a "research" piece that's short or chart-less isn't research.
TEXT_RE = re.compile(r'text:"((?:[^"\\]|\\.)*)"')
WORD_RE = re.compile(r"[A-Za-z]+")
for f in (os.path.join(WEB, "data", "research.js"), os.path.join(WEB, "data", "live-articles.js"), os.path.join(WEB, "data", "articles.js")):
    if not os.path.isfile(f):
        continue
    txt = open(f, encoding="utf-8", errors="ignore").read()
    for blk in re.split(r"\n  \{", txt)[1:]:
        idm = re.search(r'id:"([^"]+)"', blk)
        if not idm:
            continue
        is_research = ('format:"research"' in blk[:500]) or bool(re.search(r'authors:\[\s*"[^"]+"\s*,', blk[:500]))
        if not is_research:
            continue
        words = sum(len(WORD_RE.findall(x)) for x in TEXT_RE.findall(blk))
        charts = blk.count('type:"chart"')
        if words < 2600:
            flag(f, 0, f"RESEARCH too short: '{idm.group(1)}' ~{words}w — a research piece is the flagship (~3,500w). Expand.")
        if charts < 2 or charts > 3:
            flag(f, 0, f"RESEARCH charts: '{idm.group(1)}' has {charts} chart(s) — research needs 2-3 (N-024/format ladder).")


# 10: PAID ISSUE PAYLOADS (added 2026-08-10). Every check above globs web/data/*.js only.
#     Since paid issues moved to functions/api/issue/_data/<id>.json, THE ACTUAL CONTENT OF
#     EVERY NUMBERED ISSUE HAS NOT BEEN SCANNED AT ALL — issue-001.json and issue-002.json
#     were invisible to this gate. These run structurally against the parsed JSON, which is
#     both stricter and less brittle than the regex passes above.
import json as _json
ISSUE_JSON = sorted(glob.glob(os.path.join(ROOT, "functions", "api", "issue", "_data", "issue-*.json")))
THIN_MIN = 95
# measured off Issue 001 (MAGAZINE-STANDARD §5b); ceilings, not targets
BODY_CEIL = {"posterTop":155,"splitLeft":150,"splitRight":150,"quoteLead":145,"statFeature":150,
             "bottomImage":125,"cornerCard":120,"fullBleed":110,"overlay":135,
             "runover":375,"runoverAlt":375}
STRING_BODY = {"photo", "resources"}

def _wc(b):
    if isinstance(b, str):  return len(b.split())
    if isinstance(b, list): return sum(len(x.split()) for x in b if isinstance(x, str))
    return 0

for f in ISSUE_JSON:
    try:
        iss = _json.load(open(f, encoding="utf-8"))
    except Exception as e:
        flag(f, 0, f"UNPARSEABLE issue payload: {e}")
        continue
    sp = iss.get("spreads") or []
    if not sp:
        flag(f, 0, "issue payload has no spreads[]")
        continue

    pages = sum(2 if s.get("kind") in ("centerfold", "verticalfold") else 1 for s in sp)
    if pages < 40:
        flag(f, 0, f"THIN ISSUE: {pages} pages — a flagship issue is 40-80 (N-020). Expand stories, don't cap.")
    if pages > 80:
        flag(f, 0, f"OVERLONG ISSUE: {pages} pages — the ceiling is 80 (N-020).")

    seen = {}
    for s in sp:
        im = s.get("image")
        if isinstance(im, str) and im:
            seen[im] = seen.get(im, 0) + 1
    for im, c in seen.items():
        if c > 1:
            flag(f, 0, f"IMAGE REUSE: '{im}' used {c}x in one issue — each page needs unique art (N-021)")

    blob = _json.dumps(iss, ensure_ascii=False)
    for marker, name in (("**", "bold"), ("==", "highlight"), ("++", "accent")):
        n = blob.count(marker)
        if n % 2:
            flag(f, 0, f"UNBALANCED {name} markers ('{marker}' appears {n} times — must be even)")
    m = PLACEHOLDER_RE.search(blob)
    if m:
        flag(f, 0, f"placeholder/TODO leak in issue copy: {m.group(0)!r}")

    ads = sum(1 for s in sp if s.get("kind") == "ad")
    if ads < 4:
        flag(f, 0, f"ONLY {ads} ad page(s) — a real magazine carries 4-6+ (§4)")
    for fold in ("centerfold", "verticalfold"):
        fs = [s for s in sp if s.get("kind") == fold]
        if len(fs) != 1:
            flag(f, 0, f"GATEFOLD: expected exactly 1 '{fold}' spread, found {len(fs)} (§13)")
        for x in fs:
            for fld in ("image", "title", "cap"):
                if not x.get(fld):
                    flag(f, 0, f"GATEFOLD: '{fold}' missing '{fld}'")
            base = (x.get("image") or "").rsplit("/", 1)[-1]
            if base:
                stem = base[:-4] if base.lower().endswith(".jpg") else base
                for half in ("-1.jpg", "-2.jpg"):
                    hp = os.path.join(WEB, "assets", "img", stem + half)
                    if not os.path.isfile(hp):
                        flag(f, 0, f"GATEFOLD: {stem}{half} missing — run agents/magazine/fold_chop.py (§13); "
                                   f"the reader never loads the base image")

    prev = None
    for i, s in enumerate(sp):
        k = s.get("kind")
        lay = s.get("layout")
        sig = lay or k
        if k == "text" and sig == prev:
            flag(f, 0, f"ADJACENT REPEAT at spread {i}: two '{sig}' text spreads in a row (vary the layout)")
        prev = sig
        if k in STRING_BODY and not isinstance(s.get("body", ""), str):
            flag(f, 0, f"spread {i} ({k}): body must be a STRING for this kind — the renderer esc()s it")
        if k == "text":
            if not isinstance(s.get("body"), list):
                flag(f, 0, f"spread {i}: text body must be a LIST — the renderer calls .map() on it")
            w = _wc(s.get("body"))
            ceil = BODY_CEIL.get(lay or "posterTop")
            if ceil and w > ceil:
                flag(f, 0, f"OVERLONG COPY spread {i} ('{lay}'): {w} words > {ceil} ceiling — it will "
                           f"overflow the sheet (§5b budgets are measured, not advisory)")
            if lay in ("splitLeft", "splitRight", "statFeature") and w < THIN_MIN:
                flag(f, 0, f"THIN COPY spread {i} ('{lay}'): {w} words (<{THIN_MIN}); it may void")
            if lay == "statFeature" and not s.get("stats"):
                flag(f, 0, f"spread {i}: statFeature without stats[] — the foot row renders empty (§14)")
            if lay in ("runover", "runoverAlt") and s.get("title"):
                flag(f, 0, f"spread {i}: '{lay}' carries a title — continuation sheets have no headline (§14)")
            if lay not in ("runover",) and not s.get("image"):
                flag(f, 0, f"spread {i} ('{lay}'): no image — every text page carries art (Law 4)")
        if s.get("sources"):
            flag(f, 0, f"SOURCE LINES ON A MAGAZINE PAGE (spread {i}): a spread must never carry "
                       f"'sources' — it renders a link footer and reads like a web article (Law 11). "
                       f"Sourcing belongs in the public archive.")
        if k == "list" and len(s.get("items", [])) > 9:
            flag(f, 0, f"spread {i}: list has {len(s['items'])} items — 9 is the portrait ceiling (§5b)")
        if k == "faceoff" and len(s.get("rows", [])) > 6:
            flag(f, 0, f"spread {i}: faceoff has {len(s['rows'])} rows — 6 is the portrait ceiling (§5b)")

# --- report ---
if problems:
    print(f"QA SCAN: {len(problems)} problem(s) found\n" + "-"*60)
    for p in problems:
        print("  " + p)
    print("-"*60 + "\nFAIL — fix these before shipping.")
    sys.exit(1)
else:
    print("QA SCAN: clean. (Still run the visual browser audit — see MAGAZINE-QA-GATE.md.)")
    sys.exit(0)
