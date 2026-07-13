# THE QA GATE — Definition of "Done" (nothing ships until this passes)

**Why this exists.** Across the July 2026 build the founder repeatedly caught defects that
should never have reached him: white-space voids, cropped text, a stale "twenty-one agents"
count, pages that all looked the same, text crowding the folio. The root cause was not the
design — it was the **absence of an enforced gate**. Standards were *written* but not *checked*.
This document is the check. It is mandatory. A page or issue is not "done," and must not be
called done to the founder, until **every box below passes**.

Run order for any magazine issue (or any page edited):
1. `qa_scan.py` (static/content checks) — must exit 0.
2. The **visual browser audit** below, at the founder's real window size — must be clean.
3. Only then is it shippable.

---

## A. AUTOMATED STATIC SCAN — `agents/magazine/qa_scan.py`
`uv run --python 3.12 python agents/magazine/qa_scan.py` — must print "clean" / exit 0. It catches:
- [ ] **No stale roster counts.** Canonical roster is **26 agents · 9 personas** (edit the constants
      in `qa_scan.py` the day the roster changes, and it re-checks every file). This is the check
      that would have caught "twenty-one agents." Never hardcode a count without updating the roster
      constant, and prefer deriving counts in code where possible (masthead already derives from
      `PERSONAS.length`).
- [ ] **Rich-text markers balanced** — `**` `==` `++` each appear an even number of times.
- [ ] **No placeholder leaks** — no lorem/TODO/TBD/FIXME/`[insert`.
- [ ] **No two adjacent text spreads share a layout** (the "every page the same / AI slop" defect).
- [ ] **No thin copy** — split/data text pages carry **≥ 95 words** of body or their side-column voids.
- [ ] **Gatefolds present** — every spread issue ships **exactly one `centerfold` + one `verticalfold`**,
      each with a real `image`, `title`, and `cap` (MAGAZINE-STANDARD §13). Art must be seam-robust:
      centerfold survives a vertical split, verticalfold survives a horizontal split.

## B. VISUAL BROWSER AUDIT — run in the reader, at the FOUNDER'S window, per page
The founder views on a **wide desktop window (~1440×900)**, NOT the narrow Claude preview. Bugs
that hide in a tall/narrow page (2-column crop, split voids) only appear wide. **Always audit wide
AND narrow.** For every `.mpage`:
- [ ] **No cream void.** No empty gap larger than ~10–12% of page height, anywhere (bottom OR middle).
      Structured lists distribute to fill; image-forward pages let the image absorb slack; side-column
      pages need enough copy (see A). A quarter-page of white is an automatic fail.
- [ ] **No cropped / overflowing text.** Nothing clipped by `overflow:hidden`. **Body copy is ALWAYS
      single-column** — CSS multicol silently spills into a clipped extra column near capacity (this
      caused the letter "…You are about to read" cutoff). Never use `columns:2+` for body prose.
- [ ] **No text within ~5% of any trim edge**, and **nothing crowds the folio** (running foot). Use
      `cqh` units for bottom clearance, never `%` (which is width-relative and too small).
- [ ] **Every page a DISTINCT layout.** A real magazine composes each page; no template rotation.
      Neighbours must differ. The engine offers: posterTop · fullBleed · splitLeft · splitRight ·
      statFeature · quoteLead · cornerCard · bottomImage + structured kinds (timeline/glossary/list/
      players/faceoff/quote/contents/resources) + cover/opener/ad/photo/letter/back.
- [ ] **Graphical & full**, per the fill doctrine (MAGAZINE-STANDARD §10): full-bleed art, dropped
      titles, dense columns, pull-quotes, stat boxes, charts, sidebars, ads. No page reads as "a web
      article." Founder's bar: *aesthetic, graphical, zero wasted space.*
- [ ] **Fixed-sheet consistent** — the page looks identical (scaled) at any window size. Content sized
      in `cqh`/`cqw` (scales with the page), never `vh` (scales with the window).
- [ ] **Gatefolds land as marquee moments** — the centerfold reads as one seamless double-WIDE image
      (no hard seam, title dropped over the foot); the verticalfold reads as one towering double-TALL
      spread. Neither shows a jarring cut at its gutter line. **Page-turn** swings each settling page in
      from its spine; the **scrubber glides** (smooth ease-out, never a jump) — verify both by interacting.

Automated helpers for B (paste into the reader console; expect empty results):
- Overflow/crop: `[...document.querySelectorAll('.mpage')]` → max descendant `.bottom`/`.right` vs page.
- Void: per light page, largest vertical gap between content rows vs page height.
- Folio crowd: `Range`-rect bottom of leaf text vs `.mfolio-bot` top (use Range, not the padding box).
Screenshot the flagged pages — **numeric checks alone missed real bugs; always eyeball.**

## C. RELEASE MECHANICS
- [ ] **Cache-bust**: bump `?b=N` on every asset tag in `index.html` **and** `data/*.js` every release.
      (Stale `b=` served old files silently — "a fix that changed nothing" = bump `b=` first.)
- [ ] **Every issue ships a PDF** with a real filename (`rtfclmgzn-issue-<NNN>-<month>-<year>.pdf` /
      `rtfclmgzn-<slug>-<year>.pdf`), `pdf:` field set, download button present. If the PDF isn't built
      yet, **remove the `pdf:` field** so there's no broken download button — never ship a 404 link.
- [ ] **Dev server** is the threaded, no-cache `devserver.py` (never bare `python -m http.server`).

## D. IMAGES (founder-set)
- [ ] Keep **every** generated image (never reduce the count). Reuse topical story art where relevant.
- [ ] Generate bespoke art for covers + hero moments; don't cheap out where the page earns it.
- [ ] Pull from a curated **free-art / brand library** (Unsplash/Pexels/Wikimedia CC, free brand assets)
      for filler. **Never scrape copyrighted news photos.**
- [ ] Captions describe the image for the reader — **no internal jargon** ("Cover study C" was cut on sight).

## E. CONTENT INTEGRITY (unchanged, still mandatory)
- [ ] A magazine **re-synthesises already-published coverage** — never invents facts, quotes, or events.
- [ ] No fabricated real-company ads (fictional brands disclosed; house ads + "sponsorship available").
- [ ] Health/financial/legal claims disclaimed; the Ledger prints the issue's real production cost.

---

**The rule in one line:** *Screenshot every page at the founder's window width, run `qa_scan.py`, and
fix every void, crop, stale number, and repeated layout BEFORE the word "done" is ever used.*
