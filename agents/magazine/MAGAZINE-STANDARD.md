# THE RTFCLMGZN MAGAZINE STANDARD
### The production bible. Set by The Primer (Special Edition № 001), July 2026. Every future issue is built to this bar — founder-approved layouts only.

**The prime directive, in the founder's words: make it like a REAL magazine.** Ads, cool photos, different layouts, brands, no space wasted, nothing cut off. If a page looks like a book page — a title and a column of text floating in emptiness — it is wrong and gets rebuilt.

---

## 1. The Laws

1. **No voids.** Every page must measure ≥ 90% content fill (audit procedure in §6). Empty cream space is a defect.
2. **No cutoffs.** No text may overflow or clip at a page's bottom. `scrollHeight > clientHeight` on any `.mpage` = build failure.
3. **No two adjacent pages share a layout.** Rotate compositions like a real art director (rotation table in §3).
4. **Every text page carries art.** Spot illustration, full-bleed background, or photo — generated per-page from that page's actual idea, per the cinematic scene-brief doctrine (editorial-notes N-003).
5. **Ads are part of the magazine.** 4–6 ad pages per issue at real positions (§4). A magazine without ads isn't a magazine.
6. **The cover is a real cover** (§2): masthead ON the art, coverlines, flash badge, issue bar, barcode. Never just art + a title.
7. **Page count: 40–80 for a numbered issue.** This is the number `qa_scan.py` actually enforces (check #8, N-020: `if pages < 40` → THIN ISSUE, "expand stories, don't cap"). The Primer, a free evergreen field guide, set 33 and is exempt. **This line previously read "30–40" and contradicted the gate for a month** — Issue 002 was first built to 40pp against this stale text and had to be rebuilt to 80. If you change the range, change `qa_scan.py` in the same commit or the next issue gets built to the wrong one.
8. **Pacing rhythm:** never more than two consecutive "heavy" reading pages; break with an ad, a photo spread, an opener, or a quote page.
9. **Fixed pages, magazine ratio.** 3:4 pages, horizontal wheel-scroll on desktop, vertical on portrait. All type in `clamp(...vh)` units so pages compose identically at any size.
10. **Ship only after the audit passes** (§6). "Looks fine" is not a check. Numbers are.
11. **NO SOURCE LINES ON MAGAZINE PAGES** (founder, 2026-08-10). A magazine page carries reporting, not a bibliography. Never put a `sources` array on a spread — the renderer will draw a grey link footer across the page and it reads like a web article, which is the exact opposite of the brief. The sourcing still has to be real and it still has to be checkable; it lives in the **dated public archive**, which is where a reader who wants the receipt is pointed. Issue 002 was built with 152 source links across 52 pages and every one was stripped before it shipped. Do not add them back, and do not write copy that promises the reader a citation on the page.

## 2. Cover anatomy (kind:"cover" + coverlines[])

Required fields and their rendered anatomy:
- `image` — 3:4 hero art, generated with "large dark negative space at top for a masthead"
- masthead: RTFCL**MGZN** rendered across the top (renderer supplies it)
- `tagline` — "artificial magazine" under the masthead
- `flash` — gold corner badge, rotated (e.g. "BEGINNER'S SPECIAL")
- `coverlines[]` — 4–5 items `{k:"ACT I", t:"tease line"}`, stacked left side — these sell the inside
- `title` + `sub` — big serif issue title, lower-left
- `issueline` — bottom bar text: "SPECIAL EDITION № 001 · JULY 2026 · FREE"
- barcode block renders automatically in the bottom bar

## 3. The layout system (kinds & rotation)

**Text-page layouts** (field `layout:` on `kind:"text"`):
| layout | Composition | Use for |
|---|---|---|
| *(default/right)* | Title, body left, art rail right (fig + caption + pull-quote + violet stat box) | workhorse explainer |
| `left` | Mirrored rail | variety after a `right` |
| `top` | Full-bleed art across top 42%, 2-column body below | section-starting explainers |
| `overlay` | Full-bleed art, dark glass text panel at bottom, kicker | dramatic/story pages |
| `band` | Art strip top, edge-to-edge violet quote band mid-page, 2-col body | skill/method pages |
| `stats` | Body + slim art rail + edge-to-edge 3-tile stat strip at bottom | numbers-driven pages |

**Structured kinds** (fill by design): `contents` (with act thumbnails), `players` (character-select lab cards), `faceoff` (comparison table), `glossary`, `list` (numbered), `timeline`, `opener` (act divider, full art), `quote` (full-bleed), `photo` (full-bleed editorial photo + caption block), `ad` (§4), `resources`, `back` (full-bleed brand page).

**Rotation rule:** plan the page map first; assign layouts so no adjacent repeats; verify rhythm (Law 8).

## 4. Advertising pages (kind:"ad")

- **Positions:** inside-front-cover (page 2, premium slot) · between acts (2–3) · inside-back-cover (second-to-last).
- **Two types:**
  - *Fictional-brand ads* (`house:false`): beautiful full-page campaigns for clearly invented brands (Helios Compute, Momentum Robotics, Token & Thread). Footer MUST state fictional + "this placement is available to real sponsors — sponsors@rtfclmgzn.com". These are simultaneously texture AND a live demo of sponsor inventory.
  - *House ads* (`house:true`): our own products — Archive, Daily Digest, Plus, Podcast. Violet rubric instead of grey.
- **NEVER fabricate an ad for a real company or use real logos/brand assets** — implies endorsement that doesn't exist; legal and trust poison.
- Ad art prompt style: "Premium advertisement photography … luxury-brand aesthetic … No text, no letters, no logos." Brand name/tagline are HTML overlays, never baked into the image.
- Fields: `image, brand, tag, line, foot, house`.

## 5. Art production recipe

- Generator: `agents/social/gen_image.py "<scene>" <out.jpg> "3:4"` (Nano Banana 2 Lite, ~$0.034/img). **JPEG (.jpg) is the site standard** — run under `uv run --with pillow` and the script re-encodes to q85 (~80% smaller than PNG; the 2026-07-11 corpus conversion cut 31.5MB→6.4MB).
- **HOUSE ART STYLE = CYBERPUNK / FUTURIST / photoreal (founder-locked 2026-07-12, N-018).** Sleek high-tech
  sci-fi — glowing neon circuitry, holographic light, advanced machinery, near-photorealistic, cinematic;
  volumetric violet/indigo, ink-black atmosphere, dramatic rim light. **NEVER old-fashioned, vintage, magical,
  "Harry-Potter": no candles/lanterns/quills/parchment/scrolls, no wizardry, no floating-book libraries, no
  fantasy staircases, no painterly-storybook.** This style + its negatives are **auto-appended to every prompt
  by `gen_image.py`** (HOUSE_STYLE / STYLE_NEGATIVE) — so **pass a SCENE description only** (the old hand-typed
  "painterly" suffix is retired). `--raw` bypasses (rare). Always eyeball; regenerate anything that drifts.
- Every prompt = 2–4 sentence scene built from the page's thesis. Icons/clip-art prompts are banned (N-003).
- Budget per issue: ~15–25 images ≈ $0.50–0.85. Generate cover as 3 concepts; founder picks.
- Aspect: pages/covers 3:4 · article covers 16:9.

## 5b. Copy budgets & the never-again laws (added after the founder's final pass)

- **Copy is cut to fit the layout, never the reverse.** These budgets are **measured off Issue 001**,
  which renders with zero cutoffs at these lengths — they are not estimates, and guessing at them is how
  Issue 002 shipped 16 overflowing pages into its first audit. Body word counts:

  | layout | budget | ceiling |
  |---|---|---|
  | `posterTop` | 110–150 | 155 |
  | `splitLeft` / `splitRight` | 125–140 | 145 |
  | `quoteLead` | 125–140 | 145 |
  | `statFeature` | 125–145 | 150 |
  | `bottomImage` | 105–120 | 125 |
  | `cornerCard` | 100–115 | 120 |
  | `fullBleed` | 95–105 | 110 |
  | `overlay` | 110–130 | 135 |
  | `runover` / `runoverAlt` | 240–320 | **330** |
  | `letter` | 165–185 | 190 |

  Continuation sheets are two-column and hold roughly twice a lead page. **When a lead page runs long,
  move the excess into its runover rather than deleting reporting** — that is what the runover is for.
- **Structured pages have item ceilings too, and portrait is the binding case:** a `list` page holds
  **9 items** (10 overflows in portrait), a `faceoff` holds **6 rows** with the verdict strip. Both
  measured, both narrower than the counts that fit in landscape.
- **Title clearance:** ≥ 50px between the running head and the page title (page top padding 9.5%).
- **Rich text everywhere it teaches:** `**bold**`, `==highlight==`, `++accent++` in body copy (renderer `fmt()`); every text page should carry at least one bold or highlight — plain-gray walls of text are a defect.
- **Portrait is a first-class composition, not a fallback:** pages take natural height (min 60svh; full-bleed kinds 92svh) so voids/cutoffs are structurally impossible; art rails compose as a 44%-figure grid with caption/pull beside, fact box full-width — never stacked full-width slabs.
- **Structural fill:** structured kinds (contents/glossary/list/timeline/players) use flex `space-evenly` with card-styled rows so they always fill the page regardless of item count; faceoff carries a bottom verdict strip pinned with `margin-top:auto`.

## 5c. The decor pack (V5 — no page ships naked)

The founder's law: *"pages with zero graphics/images/aesthetics at all other than the text and the formatting — that's not very magazine-like."* Every **light page** therefore carries baseline aesthetics automatically (CSS, zero data changes needed):

- **Trim frame** — 1px violet hairline inset 2.1% on all four edges (`.mpage.light::before`). Folio sits inside it like a real printed trim.
- **Corner watermark** — oversized ◈ glyph, 5% opacity, bleeding off the bottom-right corner (`.mpage.light::after`).
- **Act side-tab** (`.mtab`) — solid violet vertical tab on the right edge showing the act (renderer derives it from `folio` before the first `·`). Rendered on every folio'd page, both compositors.
- **Art medallion** (`.mdeco`) — ringed circular crop of act art, top-right, on structured kinds (glossary, list, timeline, faceoff, players, resources). Map lives at the top of `spreadPage()`; pages using it get class `hasdeco` (title/kicker take `padding-right` clearance).

Rule: if a new structured kind is added, add it to the `DECO` map and give its branch `hasdeco`+`deco("<kind>")`. **Never ship a text-only page** — the decor pack is the floor, not the ceiling.

**Gotcha that broke a build:** never write a blanket `.mpage.light>*{position:relative}` — it silently overrides the absolutely-positioned folios/tabs/medallions and shoves them into flow (15 pages "grew" cutoffs at once). Scope positioning fixes to specific classes.

## 5d. Reader mechanics (the page-turn spec)

- **Fixed-sheet reader: ALWAYS a horizontal filmstrip, identical on every screen** (founder's "option 2" — looks the same on phone, tablet, wide monitor). `isHoriz()` returns `true` unconditionally; `.mpage` is a fixed 3:4 sheet sized in container-query units (`cqh`/`cqw`) so content scales with the page, never the window. Do NOT reintroduce orientation-dependent vertical scroll — it breaks the consistency the founder chose.
- **Real page-turn animation.** Every `turn()` (wheel/arrow/space) swings the settling page in from its spine: the target `.mpage` gets `.mturn-in`, which runs the `mturnin` keyframe (`rotateY(-15deg)→0` + brightness/opacity lift, `.44s`, `transform-origin:left center`) under `.mtrack{perspective:2400px}`. Class is removed after ~470ms. Honors `prefers-reduced-motion`. This is the "turns like a real magazine" moment — the cover flip, then a turn on every page change.
- **The scrubber GLIDES.** The `#mscrub` range input drives a rAF lerp (`glideTo`: `scrollLeft += (target−cur)*0.2` per frame) that continuously re-targets as the slider moves — a buttery exponential ease-out, never a jump. Snap is disabled (`.mtrack.scrubbing{scroll-snap-type:none}`) while dragging so the glide isn't yanked, and restored on release/settle. Verified acceptance: per-frame deltas must decay smoothly (~0.8 ratio), not step in one jump.
- **Landscape / desktop = horizontal page turns.** Orientation test kept for the wheel/key handlers: `innerWidth > innerHeight`, checked per event.
- The track uses `scroll-snap-align: center` — so the ONLY stable scroll positions are **center-snap points**: `page.offsetLeft + page.offsetWidth/2 − track.clientWidth/2`, clamped to the scroll range. The turn engine must target exactly these, or mandatory snap re-adjusts after the glide (the "shifts left and right" bug).
- **Current page = nearest clamped snap point to `scrollLeft`** — NOT nearest page-center to viewport-center: at the track ends the first/last pages can't physically center (their snap points clamp), and center-math skips page 1 entirely at scrollLeft 0.
- **Wheel:** accumulate `deltaY+deltaX`; at ±40 trigger ONE turn; lock (~340ms) while turning; `preventDefault()` in landscape only. One notch = one clean page flip. Never map wheel to raw `scrollLeft +=` — it fights mandatory snap and jiggles.
- **Arrow keys** call the same `turn()` engine (`window.__magTurn`); holding a key autorepeats into sequential clean flips. Escape exits. Portrait: keys and wheel pass through to native scrolling.
- **Acceptance test** (run it — don't assume): dispatch `new WheelEvent('wheel',{deltaY:120,…})` on `.mtrack`, wait ≥500ms, assert `scrollLeft` equals the next page's snap point ±2px and the counter advanced by exactly 1. Repeat backwards.

## 5e. Cache busting (deploy law)

All `<script>`/`<link>` asset tags in `index.html` carry `?b=N`. **Bump N on every release** — browsers (and Cloudflare's edge) cache aggressively; a stale `app.js` next to fresh data files produces impossible-looking bugs. A "fix that changed nothing" usually means the old file is still cached: bump `b=` first, re-test second.

## 6. The audit (mandatory before showing the founder)

**Run it against the REAL reader, not a mock-up.** Serve `web/` and open `#/read/<issue>`; for a Plus
issue, stub `GET /api/issue/<id>` to return `{ok:true,issue:{...}}` so the pages actually load. A
hand-rolled preview renderer measures nothing — it has different CSS and will report a clean page that
the site paints broken. If a headless browser is available, drive that; a script that renders the issue
through the shipped `app.js` and reports fill/cutoff per page in all three window sizes lives in the
runbook's Step 3.

**Always audit Issue 001 alongside as a control.** If the current issue and 001 both show a defect, it is
in the renderer or the stylesheet; if only the current issue shows it, it is in the copy. That one
comparison is what separates "my page is too long" from "the CSS is broken", and it is how the `.tp-src`
flex bug below was found instead of being papered over by cutting good reporting.


Run in the browser on `#/read/<issue>` after a cache-busted reload:
```js
[...document.querySelectorAll('.mpage')].map((p,i)=>{
  const overflow=p.scrollHeight>p.clientHeight+4;           // Law 2
  const pr=p.getBoundingClientRect();
  let maxB=pr.top;[...p.querySelectorAll('*')].forEach(el=>{const b=el.getBoundingClientRect().bottom;if(b>maxB&&b<pr.top+pr.height*2)maxB=b;});
  return {page:i+1, overflow, fill:Math.round((maxB-pr.top)/pr.height*100)}; // Law 1
}).filter(r=>r.overflow||r.fill<90)
```
**Pass = empty array** (full-bleed pages naturally read 100; centered brand pages must be given full-bleed backgrounds rather than allowed to sit sparse). Fix by trimming text, resizing clamps, or upgrading the page to a fuller layout — never by shrinking type below legibility.

**CRITICAL (learned the hard way):** run the audit in **BOTH orientations** (resize landscape ~1320×780 AND portrait ~860×1080) — a landscape-only pass missed a completely broken portrait rendering. And the cutoff test must use **element-bottom vs page-bottom** (below), not `scrollHeight` alone — fixed-height grid tracks can clip children without inflating scrollHeight:
```js
[...document.querySelectorAll('.mpage')].map((p,i)=>{const pr=p.getBoundingClientRect();
  const w=[...p.querySelectorAll('*')].reduce((a,el)=>Math.max(a,el.getBoundingClientRect().bottom),0);
  return {page:i+1,cutPx:Math.round(w-pr.bottom)};}).filter(x=>x.cutPx>4)   // pass = []
```

## 7. Issue production sequence (repeat per issue)

1. **Arc first:** acts + page map with layout assignments (founder approves arc + page count).
2. **Cover:** generate 3 concepts → founder picks → build full cover anatomy.
3. **Write all pages** into the issue file (`web/data/<issue>.js`, pushed onto `RTFC_MAGAZINE_ISSUES`, `format:"spread"`): tight magazine copy (block budgets: text-page body 170–260 words; overlay 120–170; band 150–200), storytelling doctrine applied, pull-quote + stat pulled from each page's own content.
4. **Generate page art** (spot pieces per §5) + ads.
5. **Wire layouts** per rotation table; insert ads at §4 positions.
6. **Run the audit** (§6); iterate until pass.
7. **Founder page-by-page review**; revise by page number until sign-off.
8. **Log everything to P0** (`task_type:"magazine"` / `"image"`); update the issue `ledger` so The Ledger page and `/usage` agree.

## 8. File & code map

- Issue data: `web/data/primer-issue.js` (the template example) — pushes onto `window.RTFC_MAGAZINE_ISSUES`
- Renderer: `web/assets/app.js` → `spreadPageV3()` (layout compositor) + `spreadPage()` (structured kinds) + `viewSpread()` (reader shell, wheel/keys/counter)
- Styles: `web/assets/styles.css` → "MAGAZINE V3" block (layout system) + earlier spread-reader block
- This doc: the standard. The Primer (33pp) is the living reference implementation — when in doubt, open it and copy its patterns.

## 9. Magazine 2.0 standards (2026-07-12 founder pass — "make it richer, more magazine-like")

The founder's mandate: a magazine drops once a month, so **never cheap out on graphics**. Real magazines are image-rich and beautiful on every spread. Standards raised:

- **Graphics density ≈ 2× minimum.** Target **an image or data-graphic on ~every spread** — full-bleed photos, act openers, spot illustrations, ad campaigns, AND data-viz (charts). A monthly issue should carry **20–30+ visual assets**, not a dozen. Budget ~$0.70–1.10 in image generation per issue — trivial against a monthly cadence, and non-negotiable for the "goldmine" feel.
- **Never robotic spacing.** Do NOT stretch text with `space-evenly` to force-fill a page — it reads mechanical. Let copy flow naturally top-down (`flex-start` + comfortable gap) and **fill remaining space with imagery/decor**, not stretched line-gaps. Voids get solved with art, not air.
- **Readability on cream pages:** body/timeline text must be a true dark ink (≥ #332e3a), never the theme's muted `--ink-soft` (which is near-invisible on cream). Test every light page for contrast.
- **Structured pages carry a full-width top image BAND, not a corner medallion.** Every structured kind (timeline/glossary/list/faceoff/players/resources/contents) renders a bespoke edge-to-edge art band across the top of the page (`hasband` class → `.mband`, art keyed in the `BAND` map in `app.js`, files `mg-band-*.jpg` + reused act art). Medallions (`deco()`/`hasdeco`) are retired — they left the page a wall of cream text. The band supplies the graphic AND the fade into the body so there are no voids.
  - **Band sizing law — no clipping, ever.** The band is ~16.5% page height (portrait) / ~14.5% (landscape) with content `padding-top` ~20% / ~17.5%. Dense pages (glossary with 12 terms, long lists) additionally compact item padding, gaps, and font-size (`.mpage.hasband` overrides). After ANY change to a band page, re-run the cutoff audit (element-bottom vs page-bottom must be `[]`) in BOTH orientations before shipping — the previous pass clipped up to 118px until bands were shrunk and content compacted.
- **Every issue ships a downloadable PDF** with a **relevant, human filename** — never `the-primer.pdf`/`issue.pdf`. Convention (matches `pdfName()` in app.js): special issues → `rtfclmgzn-<title-slug>-<year>.pdf` (e.g. `rtfclmgzn-the-primer-2026.pdf`); numbered issues → `rtfclmgzn-issue-<NNN>-<month>-<year>.pdf` (e.g. `rtfclmgzn-issue-002-august-2026.pdf`). Store it at `web/magazine/<that-name>.pdf`, point the issue's `pdf:` field at it, and the download buttons (`.mdl` reader bar + `.mag-dl` hub card) also set `download="<pdfName(iss)>"` so the saved file is named correctly even if the URL ever differs. Generated by a `reportlab` build that parses the issue file. Regenerate the PDF whenever issue content changes.
- **Art prompts stay cinematic scene-briefs** (§5), and lean into *variety*: photography-style spreads (macro hardware, data-center aisles), painterly metaphor spots, and abstract data-poetry bands — mix registers so no two spreads feel same-y.

**The adaptive law:** each issue should look better than the last. When a spread feels text-heavy or flat, the fix is always *more/ better imagery and looser, more human layout* — log what worked into this doc so the bar only rises.

## 10. THE FILL DOCTRINE (2026-07-12 — founder's white-space war; the hard-won rules)

The founder rejected the magazine FOUR times over white space. The failure was a bad audit: we checked only whether text *overflowed* (cutoffs), never whether pages were *visually full*. Pages passed while a quarter to half of them was dead cream. **These rules are non-negotiable for every issue.**

- **Audit is VISUAL, in PORTRAIT.** The founder reads in a portrait window. After building any page, **screenshot it in portrait (~820×1180) and look.** If you can see a cream region bigger than a small margin — a gap around a floating quote, an empty half beside a small image, a stretched-gap void — the page FAILS. No numeric "cutoff = 0" check substitutes for looking. (Cutoffs still matter in landscape, where pages are fixed 3:4 height — keep the element-bottom-vs-page-bottom audit there.)
- **No image smaller than it needs to be.** The root cause of the void was tiny ~130px "rail" thumbnails. **Rail/side images must fill their column** (in portrait they become a full-width band, `.mr-fig` aspect 16/10, min ~26svh). A picture postage-stamp on a magazine page is always wrong.
- **`flex-start`, never `space-evenly`, for body copy.** Stretching sparse text to fill height reads robotic AND leaves mid-page gaps. Flow copy top-down; fill leftover space with imagery/graphics/panels.
- **The "slack-absorber" pattern kills voids structurally.** On a full page layout, make ONE element `flex:1` (usually the hero image) so it eats whatever space the rest doesn't use. Then a void is impossible by construction (see `.mletter` and the V16 rail fix).
- **VARIETY is mandatory — every page full but DIFFERENT.** The founder's exact words: not every page one big image. Rotate treatments so no two neighbors feel same-y: big-hero-image · full-bleed photo · **real charts/graphs (bar/donut/line)** · **"by the numbers" stat boxes** · **sidebars / callout panels** ("in plain English", "watch for", "key terms") · pull-quote bands · face-off tables · **ad pages**. Every issue should use most of these, not lean on one.
- **Ads are furniture, and there should be MORE of them.** House ads (newsletter, Plus, Primer, dossiers, archive) + tasteful "Sponsorship available" slots. They fill pages, look professional, and demo inventory to future sponsors. 4–6+ per issue.
- **Images: keep every generated asset (never reduce the count), and build/maintain a LIBRARY.** Curate FREE, legal, AI-relevant imagery (Unsplash/Pexels/Wikimedia CC — companies, models, chips, robots, data centers) + free-to-use brand assets for AI companies referenced. Pull from the library to fill; generate fresh bespoke art (Nano Banana, house style) for covers and hero moments. **Do NOT cheap out where the page earns real art.** NEVER scrape copyrighted news photos.
- **Kill internal jargon in captions/copy.** "Cover study C — 'The Handoff'" was cut on sight — captions describe the *image* for the reader, or don't exist. No production shorthand ever ships.

## 11. ISSUE CADENCE & THE FIRST OFFICIAL ISSUE (001, July 2026)

The Primer is the free front-door field guide (evergreen). The **numbered monthly issues** are the product. Founder-set cadence:

- **Issue 001 — "July 2026," the catch-up issue.** Covers **all the main stories of the first half of 2026 (H1)** — the year so far, re-synthesized with hindsight: the frontier-model race (GPT-5.6/Sol-Terra-Luna, Grok, Fable 5, Chinese models), the funding boom ($510B H1), compute/HBM crunch (NVIDIA Rubin, SK Hynix), humanoid robots shipping, AI in health/FDA, policy/regulation moves. This is a data-rich retrospective → **lean hard on charts, scoreboards, timelines, "by the numbers," and the Ledger.**
- **From Issue 002 (August) onward — "recap + look-ahead," like a real monthly.** Each issue = the month that just happened (July for the Aug issue) distilled with hindsight, PLUS a forward-looking "what August is shaping up to be" section (announced launches, expected events, predictions from the Ledger). Retrospective + preview, every month.
- Every issue obeys §1–§10: cover anatomy, 30–40pp, the fill doctrine, variety, ads, PDF with a proper filename (`rtfclmgzn-issue-001-july-2026.pdf`), the Ledger printing its own production cost, and predictions graded in public.
- Build order for a numbered issue: Curation Editor scores the window & picks the slate → assigns persona month-in-review columns → Data Desk builds the charts/scoreboard/timeline → Layout composes to the fill doctrine → screenshot-audit every page in portrait → generate/pull art → PDF → ship.

## 12. THE QA GATE is law (2026-07-12)

Everything in §1–§11 is only real if it's checked. The enforced gate is
`agents/magazine/MAGAZINE-QA-GATE.md` + `agents/magazine/qa_scan.py`. Nothing ships until both
pass. The Standards Editor owns it; Layout and Curation must clear it. This closes the gap that
let voids, crops, and a stale agent count reach the founder: standards were written but never checked.

## 13. GATEFOLDS — every issue ships two (2026-07-12 founder request: "make me proud")

A real magazine has a centerfold. Ours has two jointed, oversized image spreads per issue — the
marquee visual moments. **Every issue (Primer included) ships exactly one of each:**

- **A fold renders as TWO normal 3:4 pages** (same size as every other page — NOT one oversized page; founder was emphatic 2026-07-12). One spread object → two `.mfoldhalf` pages that share ONE image split across them; the natural inter-page gap is the gutter. `viewSpread` counts a fold as 2 in the page total; `spreadPageV3` returns both halves.
- **`kind:"centerfold"`** — image split LEFT | RIGHT (`background-size:200% 100%`, positions `left`/`right`), continuous left→right. **Generate the art at 3:2** (= two 3:4 pages) so it fills both full-bleed with no distortion or bars. Place near the **geometric middle** of the issue.
- **`kind:"verticalfold"`** — image split TOP | BOTTOM (`background-size:auto 200%`, positions `top`/`bottom`), continuous top→bottom when stacked in portrait (side-by-side in the horizontal reader it's two panels of one tall image). Generate the art at **9:16**. Place at an act break or dramatic beat.
- Caption (kicker/title/cap) sits on the FIRST half; the second is pure image.
- Both render full-bleed with a bottom scrim and an overlaid **`kicker` / `title` / `cap`** (reader-facing caption — NO internal jargon). Renderer lives in `spreadPageV3()`; styles in the V26 CSS block.

**The art must be a REAL continuous scene — NEVER mirrored/symmetrical (hard rule, learned the hard way, N-016).** The first attempt asked for "symmetric/mirrored around the center" for seam-robustness; Nano Banana obliged and produced two near-identical halves reflected down the middle — cheap, obviously AI, and the founder (rightly) hated it. In THIS reader the fold is displayed WHOLE (never split), so seam-robustness is not needed — a beautiful continuous image is. Compose with a clear **directional flow** and an **asymmetric** payoff:
- Centerfold (16:9): a single continuous panorama that reads **left → right** with a real progression (e.g. one glowing origin on the left → a vast luminous city on the right; or capital → compute → machines). The subject changes across the width; the two halves are DIFFERENT.
- Verticalfold (9:16): a single continuous scene that reads **top → bottom** (or bottom → top) with a real progression (e.g. a keynote stage up top → hard foundations at the base; or a figure at the base → a summit above).
- **Every prompt MUST end with:** *"One single continuous asymmetric cinematic scene, clearly NOT symmetrical, NOT mirrored, no repeated or duplicated halves."* Then the house style suffix. `gen_image.py "<prompt>" <out.jpg> "16:9"` (centerfold) / `"9:16"` (verticalfold). Files: `<issue>-centerfold.jpg`, `<issue>-verticalfold.jpg`. **Always eyeball the result** — if the left/right (or top/bottom) halves look like reflections of each other, regenerate.

**THE CHOP STEP IS NOT OPTIONAL — the reader never loads the base image.** `spreadPageV3()` builds a
gatefold from two PRE-CUT halves, `<name>-1.jpg` and `<name>-2.jpg`; it never references `<name>.jpg`.
Generate the joined art, then run:

    uv run --with pillow python agents/magazine/fold_chop.py web/assets/img/<name>.jpg center     # centerfold
    uv run --with pillow python agents/magazine/fold_chop.py web/assets/img/<name>.jpg vertical   # verticalfold

Skip it and both fold pages render as broken images. Note the ratio arithmetic: two 3:4 pages side by
side are exactly **3:2**, so a centerfold splits with no crop — generate it at 3:2, not 16:9 (this doc
said 16:9 in one place and 3:2 in another; 3:2 is the one that is geometrically correct). Stacked, two
3:4 pages are **3:8**, which no generator offers, so a verticalfold is generated at 9:16 and the chopper
centre-crops the WIDTH down to 3:8 — deliberately, so the whole top-to-bottom progression survives.

`qa_scan.py` enforces the count: **exactly one `centerfold` and one `verticalfold` per spread issue**, each with a real `image`, `title`, and `cap`.

## 14. RENDERER TRAPS (things the data cannot fix)

- **`sources` must never appear on a spread at all (Law 11).** The note below is kept because the bug
  is real and would bite any future page kind that appends a child to a flex row — but the first-order
  rule is simply that no spread carries `sources`.
- **`.tp-src` on a split page was a flex item (fixed 2026-08-10).** `featureText()`'s `close()` appends the
  sources footer as the LAST CHILD of the page element. On `splitLeft`/`splitRight` that element is
  `display:flex; flex-direction:row`, so the footer became a third column and crushed the text column from
  ~333px to ~67px — the copy then ran ~2,600px past the page. It presented exactly like a copy-length
  problem and was not: **any** split page carrying `sources` overflowed no matter how short the body was.
  Issue 001 p25 shipped with this defect. The fix is the `V-FIX` block at the foot of `styles.css`, which
  pins `.tp-src` out of the row. If you ever add a new flex-row page kind, check what `close()` appends to it.
- **`statFeature` needs a `stats` array of 3.** Without it the giant number row at the foot renders empty
  and the page reads as a void. The renderer does not supply a fallback.
- **`runover` / `runoverAlt` must NOT carry a `title`.** They are continuation sheets; the renderer draws a
  "continued" rule from `cont` and an optional `crosshead`. A title on a runover means the feature was
  built wrong.
- **`photo` and `resources` take `body` as a STRING**, every other kind takes an array. The renderer calls
  `esc()` on the string ones and `.map()` on the arrays; get it backwards and the page throws.
