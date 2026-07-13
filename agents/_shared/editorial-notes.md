# RTFCLMGZN — Editorial Notes (the living memory)

**What this is:** the newsroom's accumulated, evolving guidance — written by the weekly Editorial Review agent, read by every writing/production agent as context on every run. This is how the system gets smarter over time without retraining anything: lessons observed in real output become standing instructions for future output.

**Rules of this file:** entries are short, concrete, and actionable. Each carries a date and a source (what output taught us this). The Review agent APPENDS and PRUNES — it may retire a note that's been fully absorbed or superseded, never silently rewrite history. Keep the file under ~40 notes; when it grows past that, consolidate. Writers: treat these as house law until retired.

---

## Standing notes

**N-001 · 2026-07-10 (ladder locked 2026-07-12) · Depth must be real, labels are derived.** (Source: founder caught a 425-word piece labeled "deep dive · 9 min.") Write to the format's true length on the THREE-TIER ladder (N-026): brief ~300w · synthesis ~1,200w · research ~3,500w — or it gets re-filed to whatever its word count actually is. Reading time and format pills are computed from actual text (`trueFormat`), so a thin piece can't hide behind its label; it just publicly IS a brief.

**N-002 · 2026-07-10 · Facts ride stories (~22× memorability).** (Source: founder directive.) Attach the piece's most load-bearing fact to a real narrative vehicle — historical echo, concrete scene, human moment. One or two per piece, never invented, story serves the fact. Proven pattern: the Google Glass "Glasshole funeral" opening the smart-glasses piece; combinatorial chemistry's false dawn in the drug-discovery piece.

**N-003 · 2026-07-10 · Image prompts are scene briefs, never icons.** (Source: founder rejected the first flat-vector icon batch.) Every image prompt is a 2–4 sentence cinematic scene built from the article's actual thesis (setting, scale contrast/metaphor, fg/bg) + the house style suffix. "A coin on a chart" produces clip-art; "a carnival built of candlestick charts with empty scaffolding behind the facade" produces a cover.

**N-004 · 2026-07-10 · Sections are desks.** (Source: founder flagged mis-filed articles under a junk-drawer "AI" section.) Every piece files under its persona's desk — Frontier/Products/Compute/Policy/Health/Markets/Robotics — never a generic topic label. If the section doesn't match the byline's desk, the assignment was wrong.

**N-005 · 2026-07-10 · Headlines carry the thesis.** (Source: the pieces that landed best with the founder.) Declarative, thesis-bearing titles outperform label-titles: "Meta just started charging for a model. That's the actual news." beats "Meta releases Muse Spark 1.1." State the insight, not the event.

**N-006 · 2026-07-10 · The honest caveat is the brand.** (Source: consistent founder approval of self-aware verdicts.) Every strong claim ships with its own discount — self-reported numbers labeled, bull AND bear cases when both are live, "what would change our mind." Certainty-selling is what competitors do.

---

## Retired notes

*(none yet — the Review agent moves absorbed/superseded notes here with a one-line reason)*

## Standing notes — magazine QA (added 2026-07-12, from the founder's July build)

**N-026 · 2026-07-12 · The article ladder is THREE tiers, and length is the definition — founder-locked.**
(Source: founder — "bake those into the definitions… just the 3 + lengths.") There are exactly three article
formats and each one IS a length band, not a vibe:
  • **Brief** — ~300 words (250–450). One fact, one why-it-matters, one link. Single author. No charts.
  • **Synthesis** — ~1,200 words (800–1,900). The daily workhorse: connects a development to the bigger
    pattern, bull + bear, honest verdict. Single author. Charts optional.
  • **Research** — ~3,500 words (2,200 floor). The flagship: 2+ authors, 2–3 charts/visuals, multi-section
    argument with geopolitics/history/counter-case. Runs 1–2×/week, not daily.
The format is DERIVED from the text (`trueFormat` in app.js), never just declared — write a "research" piece
at 1,700 words and the gate (`qa_scan.py` #9) fails it and it reads as under-built. Don't pad to hit a number;
if a story only carries 300 real words it's a brief, and that's honest. Exemplar research: `rs-001`
(the-great-repricing) — full length, 2 charts, 3 authors. Supersedes the old two-tier N-001 numbers.

- **N-007 · The gate is not optional.** Every issue passes `agents/magazine/qa_scan.py` (static) AND
  the visual browser audit in `MAGAZINE-QA-GATE.md` (at the founder's WIDE window + narrow) before the
  word "done" is used. Standards that aren't *checked* don't exist — this is the lesson of the whole build.
- **N-008 · Never hardcode a roster count.** "twenty-one agents" shipped in 3 files after the roster
  grew to 26. Derive counts in code, or update the `qa_scan.py` roster constant + let it verify. Today: 26 agents · 9 personas.
- **N-009 · Body copy is single-column.** CSS `columns:2+` clips prose into a hidden 3rd column near
  capacity. Every void/crop chase this week traced to multicol or `vh` units — use single column + `cqh`.
- **N-010 · Fit copy to the layout.** Split/data side-column pages void under ~95 words of body. Write to
  length or pick an image-forward layout. Copy length is a design parameter, not an afterthought.
- **N-011 · Audit at the FOUNDER'S window width.** Bugs (2-col crop, split voids, folio crowding) hid in
  the narrow preview and only showed on his wide desktop. Always test wide + narrow, and screenshot —
  numeric-only checks passed pages that were visibly broken.
- **N-012 · Every page different.** One template across all text pages reads as "AI slop." Distinct layout
  per page, no adjacent repeats — enforced by `qa_scan.py`.
- **N-013 · Two seam-robust gatefolds per issue.** Every issue ships one `centerfold` (double-wide) and one
  `verticalfold` (double-tall), each generated so it survives a split on its seam (centerfold → mirror around
  the vertical center; verticalfold → top/bottom each resolve). Place the centerfold near the middle, the
  verticalfold at a dramatic break. Count enforced by `qa_scan.py`; craft in MAGAZINE-STANDARD §13. This is
  the founder's "make me proud" marquee feature — a real magazine has a centerfold, so ours has two.
- **N-014 · Count drift hides in un-scanned files.** `qa_scan.py` only scans `web/`, so stale roster counts
  rotted in the email templates ("21 agents") and `agents/README.md` ("18") unseen. Fix: prefer wording that
  needs no number ("a fully autonomous AI newsroom"); when a number is unavoidable, source it from the
  canonical roster constant. Re-grep the WHOLE repo for counts before a release, not just the shipped site.
- **N-025 · The pipeline is now TWELVE stages — three new QA gates added because the old 9 kept letting
  slop through.** Every story/page now also passes: **(a) Art Direction & Image QA** — enforces the cyberpunk
  style (N-018), bans image reuse within/across issues and back-to-back scaled-down repeats (N-021), and
  rejects bad crops (subject cut down the middle); **(b) Layout QA** — kills white-space voids and bad
  compositions before publish (N-011/N-019); **(c) Link Enrichment** — adds the "Go there" action links
  (N-024). Also formalized: a new **Research** format (2–4 editors, 2200+ words, 1–2×/week; `authors[]`).
  Optimize relentlessly; the whole system exists to stop defects reaching the founder, who has caught far
  too many by hand. Masthead now reads "twelve-stage."
- **N-020 · A flagship issue is 40–80 pages — never cap at ~36.** The digest-era Primer/001 (~38pp, one page
  per topic) read as thin. Real magazines give a big story a full page, or two, or three. Expand; don't
  compress. `qa_scan.py` flags spread issues under 40 pages. Quality over page-economy, always (founder).
- **N-021 · Every page earns its OWN art — no image reuse.** 001 reused `a2.jpg` 3× and pulled the Primer's
  ad art; the founder (rightly) called it slop. NEVER use an image twice in an issue, never scale one image
  down and reuse it on the next page, never recycle another issue's art within ~2 releases. Generate bespoke
  cyberpunk art per page. `qa_scan.py` flags any image used >1× in an issue.
- **N-022 · Stories run full length in the magazine.** A magazine feature is not a 120-word paragraph — it's
  a full page (or a 2–3 page spread) with real depth, pull-quotes, sidebars, stat boxes. Re-synthesise the
  source coverage into a proper feature; if a topic only warrants a paragraph, it's a sidebar, not a spread.
- **N-023 · Folds = ONE continuous artwork, prompted as a single scene, then CHOPPED.** Never prompt "left…
  middle… right" (that makes a triptych — the founder saw "3 images stitched"). Prompt ONE seamless scene;
  generate the centerfold WIDE (3:2) and chop L|R, the verticalfold ULTRA-TALL (crop to 3:8) and chop T|B;
  each half is a clean 3:4 page (`-1.jpg`/`-2.jpg`). Photoreal cyberpunk, site purple palette (N-018).
- **N-024 · Give the reader the door.** When a piece names a product/release/tool, add `links:[{label,url,note}]`
  so they can go straight to it (rendered as the "Go there" block). If a link exists, provide it — don't make
  them hunt. Applies to every article, new and back-catalog.
- **N-018 · House art style = CYBERPUNK / FUTURIST / photoreal — NEVER old-fashioned or magical.** The
  founder loves the sleek high-tech look (glowing circuitry, neon, chips, holograms — Primer p8/p17) and
  rejected the "Harry-Potter / magical" look outright (candles, lanterns, quills, parchment, floating-book
  libraries, misty fantasy staircases — Primer p25/p30). This is now auto-appended to EVERY prompt by
  `agents/social/gen_image.py` (HOUSE_STYLE + STYLE_NEGATIVE) — pass a SCENE description only. Still eyeball
  results; regenerate anything that drifts vintage/fantasy/painterly-storybook.
- **N-019 · Item-lists must FILL the sheet — the flex-start trap.** The V11 "humanize" rule pinned glossary/
  list/resources to `flex-start`, leaving big voids at the foot (founder's repeated white-space rage —
  Primer p26/27/35). Item-lists (glossary/list/resources/players/timeline) DISTRIBUTE to fill
  (`align-content`/`justify-content: space-between`); only running PROSE flows top-down. And the words are
  the point — size the list's headline terms large (glossary term ≈ 2.35cqh). Verify overflow==0 after.
- **N-017 · Never hardcode a page count (or any self-count) in magazine prose.** The Primer contents
  said "Twenty-seven pages" while the magazine was 37 — it rots every time a page is added, and the
  founder caught it on page 3. Same disease as N-014 (roster counts). Fix: DROP the number ("Five acts,
  zero prior knowledge required") or derive it in code; never type a total a later edit invalidates.
  `qa_scan.py` check #7 now flags any "N pages" (10+) in shipped magazine copy.
- **N-016 · Gatefold art is a continuous scene, NEVER mirrored.** Asking Nano Banana for "symmetric/
  mirrored" art (to survive a seam split) produced two reflected near-identical halves — cheap, obviously
  AI, founder furious. The fold is shown WHOLE in this reader, so seam-robustness is moot; beauty is not.
  Prompt for a directional flow (centerfold left→right, verticalfold top→bottom), end every prompt with
  "One single continuous asymmetric cinematic scene, clearly NOT symmetrical, NOT mirrored, no repeated or
  duplicated halves," and EYEBALL it — if the halves reflect each other, regenerate. Salvage a bad mirror
  by cropping one clean half into a single content image (don't waste the spend).
- **N-015 · The reader is fixed-sheet, always horizontal.** The founder chose one consistent reader that looks
  identical on every screen (phone = tablet = wide monitor). Never reintroduce orientation-dependent vertical
  scroll. Page-turns swing from the spine (`.mturn-in`); the scrubber glides via a rAF lerp (never a jump).
