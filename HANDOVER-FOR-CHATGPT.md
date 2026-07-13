# RTFCLMGZN — Complete Handover & Mistake Ledger

> **Read this first, ChatGPT.** You are inheriting a real project from another AI (Claude). This file is written *for you* — an honest, exhaustive account of what this system is, how it works, every mistake the previous AI made and how each was fixed, and exactly where to pick up. The founder is handing this to you so you can resume without re-learning the hard way. Treat it as ground truth, but **verify every path and count against the live repo before acting** — this file was accurate on **2026-07-12** and code moves.

> **Who the founder is (this matters).** He is building this largely solo, working intensely, and depending on it to change his financial life. He has an exceptional eye and *will* catch defects — misaligned art, thin copy, a stale number, a broken scroll. His standard is **"quality over everything."** He has been let down repeatedly by defects reaching him instead of being caught by the system. Your job is not just to write code; it's to make the *system* catch its own mistakes so he never has to. When you finish something, **prove it works** (screenshot / test output) rather than asserting it. Never fabricate data or metrics to make something look finished — he values honesty over polish, every time.

---

## 0. TL;DR — orient in 60 seconds

- **What:** `RTFCLMGZN` ("artificial magazine") — a fully autonomous, AI-native news publication about the AI industry, written entirely by AI agents. A static website + a simulated "newsroom" of agent specs.
- **Two halves of the repo:**
  1. `web/` — the actual website (a vanilla-JS single-page app, **no build step**).
  2. `agents/` — Markdown "agent" specifications + Python tooling that define/produce the content (the "newsroom").
- **Stack:** Vanilla JS + CSS, data as global JS objects, hash routing. Deploys to **Cloudflare Pages** (domain `rtfclmgzn.com`, **not yet deployed** as of handover).
- **The #1 operational law:** every asset is cache-busted with `?b=N`. **Bump `N` on every release** or the browser serves stale JS. (Details in §4.)
- **The #1 cultural law:** **derive, never hardcode**; **check, don't assume**; **never fake data**.
- **Where to start:** §9 (backlog) and §10 (recommended polish plan). The single biggest open item is the **full 40–80-page bespoke remake of both magazines** (Primer/000 and Issue 001).

---

## 1. The product & the vision

RTFCLMGZN is a news publication about AI, produced end-to-end by AI. The pitch that makes it different: **radical transparency** — it shows you its own newsroom running (the "Control Room"), its running production cost from a real ledger, its self-grading prediction record, and a privacy-first map of where it's read. Editorial voice is **additive, honest, hype-resistant, and useful to builders** ("what changed · what it means · what you can do with it").

Content surfaces on the site:
- **Articles** — three formats: **Brief / Synthesis / Research** (see §7).
- **The magazine** — a horizontal, fixed-sheet page-turn reader. Two issues exist: **The Primer (No. 000)** and **Issue 001**.
- **The Buzz** — a curated social-signal feed (12 posts/day, one every 2h).
- **Guides** — step-by-step instructional how-tos.
- **Resources / Dictionary** — directories + an AI glossary.
- **Scoreboard** — live model strength-vs-cost board.
- **Prediction Ledger** — public, self-grading forecasts.
- **Control Room ("Pulse")** — the live newsroom dashboard (countdown to next edition, cost, shift board, **reader heatmap**).
- **Masthead** — the 9 personas + agent roster.
- Plus Events, Contact, Newsletter, Live TV, Privacy/Terms.

---

## 2. The stack & how it *actually* works (non-obvious mechanics)

**There is no build step.** No webpack, no React, no bundler, no npm run build. You edit files and reload. This is deliberate and must be preserved.

- **Entry:** `web/index.html` loads, in order: a set of `web/data/*.js` files, then `web/assets/app.js`, then `web/assets/styles.css`. Every `<script>`/`<link>` carries `?b=N` (cache-bust).
- **Data layer:** each `web/data/*.js` file assigns a global, e.g. `window.RTFC_ARTICLES = [...]`, `window.RTFC_RESEARCH = [...]`, `window.RTFC_GUIDES = [...]`. `app.js` reads those globals. **To add content you edit a data file — you do not touch a database.** There is no backend for content.
- **App:** `web/assets/app.js` is one big IIFE. It contains a **hash router** (`#/route`), all the view renderers (`viewHome`, `viewArticle`, `viewPulse`, `viewArchive`, the magazine reader, etc.), and all interactive features.
- **Routing:** hash-based (`#/article/<slug>`, `#/pulse`, `#/archive`, `#/magazine/...`). This is why SEO uses a pre-rendered sitemap + JSON-LD and an "honest hash-routing note" — crawlers don't run the JS router.
- **Styling:** one file, `web/assets/styles.css`. It has grown in versioned appended blocks (`V26`, `V27`, … `V35`) — when you add a feature, append a clearly-commented block at the end rather than threading edits through the whole file.
- **Cloudflare Pages Functions:** `web/functions/` holds edge functions. The **reader heatmap** reads Cloudflare's own `/cdn-cgi/trace` (country-level, cookieless) — this only returns real data **once deployed on Cloudflare Pages**; on localhost it returns nothing (that's expected and correct).
- **Images:** `web/assets/img/` (~82 files at handover). Article images are `<id>.jpg` (e.g. `rs-001.jpg`); magazine folds are chopped into `<base>-1.jpg` / `<base>-2.jpg`.

---

## 3. Repo map (the files that matter)

```
RTFCLMGZN/
├─ HANDOVER-FOR-CHATGPT.md        ← this file
├─ web/                            ← the website (deploy root)
│  ├─ index.html                  ← script/link tags w/ ?b=N cache-bust
│  ├─ 404.html, robots.txt, sitemap.xml, rss.xml, manifest.json
│  ├─ newsroom-map.html           ← standalone "how the newsroom works" page
│  ├─ functions/                  ← Cloudflare Pages Functions (edge)
│  ├─ magazine/                   ← magazine assets
│  ├─ assets/
│  │  ├─ app.js                   ← THE app: router + all views + all features (large IIFE)
│  │  ├─ styles.css               ← one stylesheet, versioned appended blocks (…V35)
│  │  └─ img/                      ← all generated images (~82)
│  └─ data/                        ← all content as window.RTFC_* globals:
│     ├─ articles.js  live-articles.js  research.js   ← article bodies
│     ├─ primer-issue.js  issue-001.js  magazine-issues.js ← magazines
│     ├─ guides.js  buzz.js  resources.js  dictionary.js
│     ├─ scoreboard.js  predictions.js  companies.js
│     ├─ personas.js  usage-log.js  cost-config.js
│     ├─ events.js  livetv.js  social-posts.js  pending-review.js
├─ agents/                         ← the "newsroom" (specs + tooling)
│  ├─ ORCHESTRATION.md  DAILY-RUN.md  README.md
│  ├─ editor-in-chief.agent.md  managing-editor.agent.md
│  ├─ personas/*.agent.md         ← the 9 writer voices
│  ├─ production/*.agent.md       ← style, publishing, podcast, social…
│  ├─ oversight/*.agent.md        ← standards-editor, etc.
│  ├─ review/  founding-desk/  buzz/  email/  social/  magazine/
│  ├─ _shared/                     ← house law loaded into every agent:
│  │  ├─ editorial-notes.md        ← ★ THE LIVING LESSON-LEDGER (N-001…N-026)
│  │  ├─ house-style-guide.md      ← voice, the 3-format ladder, boilerplate
│  │  ├─ reader-doctrine.md  compliance-rulebook.md  pipeline.md
│  │  ├─ content-inventory.md  publishing-cadence.md  observability.md
│  ├─ magazine/
│  │  ├─ MAGAZINE-STANDARD.md      ← how a magazine issue must be built (§13 = folds)
│  │  ├─ MAGAZINE-QA-GATE.md       ← the visual browser audit checklist
│  │  └─ qa_scan.py                ← ★ THE STATIC PRE-SHIP GATE (run before "done")
│  └─ social/
│     └─ gen_image.py              ← ★ image generator (auto-applies house style)
```

**The three starred files are the heart of the system's self-defense.** Read them before doing anything: `agents/_shared/editorial-notes.md`, `agents/magazine/qa_scan.py`, `agents/social/gen_image.py`.

---

## 4. The operating laws (violate these → you recreate the exact bugs below)

### LAW 1 — The cache-bust law (most important operational rule)
Every `<script>`/`<link>` in `index.html` **and** every internal reference carries `?b=N`. The in-app/test browser caches `app.js?b=N` aggressively. **After ANY edit to app.js / styles.css / data, bump N across the board:**
```bash
cd web && sed -i 's/b=144/b=145/g' index.html data/*.js
```
(At handover the current value is **`b=144`** — verify with `grep -oE "b=[0-9]+" web/index.html | sort -u`.) If you edit and the browser "doesn't show the change," you forgot to bump. This wasted hours repeatedly; do not skip it.

### LAW 2 — Derive, never hardcode
Any number that describes the system (agent count, persona count, page count, format label, reading time) must be **computed**, never typed. Hardcoded counts drift the moment anything changes and the founder catches them. Examples that bit us: "twenty-one agents" hardcoded in 3+ files after the roster grew to 26; "Twenty-seven pages" on a 37-page magazine; format pills that lied about length. Fixes always did two things: (a) derive the value, and (b) add a `qa_scan.py` check so it can never regress.

### LAW 3 — The gate is not optional ("standards that aren't checked don't exist")
Before calling any release **done**, run BOTH:
- `agents/magazine/qa_scan.py` (static checks — counts, placeholders, layout repeats, thin copy, folds, page counts, image reuse, the research length/chart ladder), and
- the **visual browser audit** in `agents/magazine/MAGAZINE-QA-GATE.md`, at the founder's **wide** desktop width *and* narrow — with screenshots. Numeric-only checks passed pages that were visibly broken on his wide monitor.

### LAW 4 — Never fabricate data
No fake view counts, no invented benchmark numbers, no placeholder metrics dressed as real. An honest empty state beats a fake full one. The reader heatmap, the cost ledger, the scoreboard, the prediction ledger — all show real or clearly-ambient data only. The founder explicitly worried about "fake metrics"; honoring that is core to the brand.

### LAW 5 — House art style is CYBERPUNK / FUTURIST / PHOTOREAL — never magical/old-fashioned
The founder loves sleek high-tech (glowing circuitry, neon, chips, holograms) and **hates** the "Harry-Potter/magical" look (candles, quills, parchment, floating-book libraries, misty fantasy). This is auto-appended to every prompt by `gen_image.py` (`HOUSE_STYLE` + `STYLE_NEGATIVE`) — you pass a **scene** only. Still eyeball every result and regenerate anything that drifts vintage/fantasy/painterly.

### LAW 6 — Every page/asset earns its own art — no image reuse
Never use an image twice in an issue, never scale one down and reuse it on the next page, never recycle another issue's art within ~2 releases. `qa_scan.py` flags reuse. The founder caught `a2.jpg` used 3× and called it slop — rightly.

---

## 5. How to run, verify, and ship

**Run the site (preview):** there is a launch config named `rtfclmgzn-web` (a static server on port 4321 serving `web/`). Start the preview server and open `http://localhost:4321/index.html#/…`. Never run a dev server via a raw shell if a preview tool is available — use the preview/browser tooling so you can read console + screenshot.

**Portable Python (uv)** was used for tooling because system Python wasn't on PATH. Pattern:
```bash
<path-to>/uv.exe run --python 3.12 --with pillow python <script>
```
(The exact uv path is session-specific — locate a `uv.exe` under the scratchpad, or install Python. `qa_scan.py` is pure-stdlib; `gen_image.py` needs `pillow` + network + the image API key.)

**The gate:**
```bash
<uv> run --python 3.12 python agents/magazine/qa_scan.py    # exit 0 = clean, 1 = problems (file:line)
```

**Image generation:**
```bash
python agents/social/gen_image.py "<SCENE description only>" web/assets/img/<out>.jpg [aspect]
```
It auto-appends house style + negatives. `--raw` bypasses (rarely). Model: Nano Banana 2 Lite, ~$0.034/image. **Fold math:** a centerfold = two 3:4 pages side-by-side = generate at **3:2**, then chop L|R into `-1.jpg`/`-2.jpg`. A verticalfold = two pages stacked = **3:8**; the API can't do 3:8, so generate **9:16** and center-crop to 3:8 before chopping T|B. Prompt ONE continuous asymmetric scene (never "left…middle…right" — that makes a triptych; never "mirrored" — that makes reflected halves).

**Ship a change (checklist):** edit → bump `?b=N` (LAW 1) → run `qa_scan.py` (LAW 3) → visual audit wide+narrow with screenshot → then say it's done.

---

## 6. ★ THE MISTAKE LEDGER — every defect, why it happened, how it was fixed

This is the accountability record the founder asked for: **every flaw he caught, the root cause, the specific fix, and the systemic guard added so it can't recur.** Grouped by theme. Many map to a codified note (`N-0xx`) in `agents/_shared/editorial-notes.md` — that file is the permanent version of this ledger; keep appending to it.

### A. Editorial / content defects
| # | What the founder caught | Root cause | Fix + systemic guard |
|---|---|---|---|
| A1 | A 425-word piece labeled "deep dive · 9 min" | Format was a *declared label*, not derived from the text | Reading-time + format **derived from word count** (`trueFormat`). Guard: N-001. |
| A2 | Articles mis-filed under a junk "AI" section | No rule tying section to author's beat | **Sections = desks**; section must match the byline's desk. Guard: N-004. |
| A3 | Headlines that just named an event | Weak, label-style titles | **Headlines carry the thesis** (state the insight). Guard: N-005. |
| A4 | Thin magazine "features" (120-word paragraphs) | Treated a feature like a blurb | **Stories run full length**; a paragraph is a sidebar, not a spread. Guard: N-022. |
| A5 | Format sprawl / inconsistent lengths | No locked ladder | **Locked 3-tier ladder** (Brief ~300w / Synthesis ~1,200w / Research ~3,500w), *derived* from text, enforced by `qa_scan.py` #9. Guard: N-026. (This was the final task before handover.) |

### B. Image / art direction defects
| # | What the founder caught | Root cause | Fix + systemic guard |
|---|---|---|---|
| B1 | Flat vector/clip-art images | Prompts were icon descriptions | **Prompts are cinematic scene briefs** (2–4 sentences from the thesis). Guard: N-003. |
| B2 | "Old-fashioned / Harry-Potter / magical" images (Primer p25, p30) | No enforced style; model drifted to fantasy | **Cyberpunk house style + negatives auto-appended** by `gen_image.py`. Guard: N-018. |
| B3 | Centerfold looked like "two mirrored copies of the same photo" | Prompted for "symmetric/mirrored" art to survive the seam | Prompt ONE **continuous asymmetric** scene; eyeball for reflection. Guard: N-016. |
| B4 | Fold "looks like 3 images stitched" (triptych) | Prompted "left…middle…right" | Prompt ONE seamless scene, then **physically chop** into halves with PIL. Guard: N-023. |
| B5 | Same image reused (`a2.jpg` 3×; scaled-down repeats; the Primer's ad art pulled into 001) | No uniqueness check | **Unique art per page**; `qa_scan.py` flags any image used >1× in an issue. Guard: N-021. |

### C. Magazine layout / typography defects
| # | What the founder caught | Root cause | Fix + systemic guard |
|---|---|---|---|
| C1 | Voids/crops on text pages | Multi-column body clipped prose into a hidden 3rd column; `vh` units | **Single-column body + `cqh`** container units. Guard: N-009. |
| C2 | Side-column pages "voided" (big empty space) | Copy shorter than the layout needs (~95-word floor) | **Fit copy to layout** or pick an image-forward layout; `qa_scan.py` thin-copy check. Guard: N-010. |
| C3 | Big white-space voids on glossary/list/resources (p26/27/35) | "Humanize" rule pinned lists to `flex-start` | **Item-lists distribute to fill** (`space-between`); size list terms large. Guard: N-019. |
| C4 | "Every page looks the same — AI slop" | One template across all text pages | **Distinct layout per page**, no adjacent repeats; `qa_scan.py` adjacency check. Guard: N-012. |
| C5 | "Twenty-seven pages" printed on a 37-page magazine | Hardcoded self-count in prose | **Never hardcode a count**; drop it or derive it; `qa_scan.py` #7 flags "N pages". Guard: N-017. |
| C6 | The big fold was ONE oversized page (p22, p-vertical) | Renderer drew the fold as a single sheet | Fold renders as **two normal `.mfoldhalf` pages** from the pre-chopped halves. Guard: N-013/N-015. |
| C7 | Magazines capped at ~36 pages, felt thin | Digest-era "one page per topic" | **Flagship issue = 40–80pp**; `qa_scan.py` flags spread issues <40. Guard: N-020. |
| C8 | Image "totally cropped in the middle" (p23) | Bad subject framing | Art-direction QA rejects subject-cut-down-the-middle crops. Guard: N-025(a). |

### D. Navigation / reader-UX defects
| # | What the founder caught | Root cause | Fix |
|---|---|---|---|
| D1 | Slider didn't sync when scrolling by wheel/arrow | `upd()` had a `document.activeElement !== sc` guard that froze sync once the slider was touched | Removed the guard; keep only `!sc.__drag`. |
| D2 | Arrow keys lagged / dropped inputs; wheel stuck at 1 page/notch | Old engine locked `turning` for 360ms and dropped inputs | Rewrote to a **target-index model** (`targetIdx` + `goTo()` + `glideTo()` rAF lerp); wheel is velocity-sensitive (`PAGE_DELTA`); no input ever dropped. Guard: N-015. |
| D3 | Drag/swipe nav over-shot near page 1 and under-moved elsewhere | Clamped page compresses the scroll slot; and reading `scrollLeft` *after* removing the `.dragging` class let snap corrupt the measurement | Measure pull in **page-units** from `startIdx`; read `scrollLeft` **before** removing `.dragging`. |
| D4 | **(this session)** the glide grip "broke overall scrolling with the middle mouse button, and the native window scrollbar won't work either" | (a) global `html{scroll-behavior:smooth}` breaks Chromium middle-click autoscroll and fights native scroll; (b) the custom grip lived on the right edge where it can overlap the native scrollbar | (a) Removed `scroll-behavior:smooth` (JS smooth-scroll calls pass `behavior:"smooth"` explicitly, so intentional smoothness is kept); (b) **moved the glide grip to the LEFT edge** ("spine") where a native scrollbar never lives → the two can never conflict on any OS/zoom. |

### E. Internationalization / time defects
| # | What the founder caught | Root cause | Fix |
|---|---|---|---|
| E1 | Language switch sometimes didn't switch; a "glimpse of English" flashed | Non-deterministic Google-Translate cookie state; unstyled flash before GT settled | Deterministic **reload + bulletproof cookie clear** (all path/domain variants); a pre-paint `<head>` guard hides content until GT font-tags settle. |
| E2 | Countdown said "next drop in 11h" at 5:21pm when the 8pm drop should be next | Weekend reduced-schedule logic + a Central-vs-ET timezone mismatch | Real **ET slot hours** `[6,8,12,16,20]`, **5 drops every day**, `America/New_York`; also shows the viewer's **local time** next to ET. |
| E3 | Times not localized | Only ET shown | All time displays compute the **viewer's local timezone** (+ ET label). |

### F. Data-integrity / consistency defects
| # | What the founder caught | Root cause | Fix + guard |
|---|---|---|---|
| F1 | "21 agents" / "twenty-one" / "18" across masthead, email templates, `agents/README.md` after the roster grew to 26 | Hardcoded roster counts in un-scanned files | Derive from the roster; `qa_scan.py` has a canonical roster constant + scans the whole `web/`; **re-grep the whole repo** for counts before release. Guard: N-008, N-014. |
| F2 | Masthead said "12 pipelines" but `newsroom-map.html` still said "9-stage / 21 agents" ("last chance" moment) | The standalone HTML page wasn't updated with the rest | Synced `newsroom-map.html` fully (26 agents, 9 personas, 12-stage). **Lesson: standalone HTML pages don't share the data layer — update them explicitly.** |
| F3 | Double "001" — the Primer showed as 001 too | Primer had `number:1` | Primer is **`number:0`** ("SPECIAL EDITION № 000"). |
| F4 | Buzz had 6 posts/day | Wrong cadence | **12/day, one every 2h.** |
| F5 | "HIGH" sensitivity labels on masthead editors added no value | Leftover metadata surfaced in UI | Removed the labels from the masthead. |
| F6 | Guides weren't actually step-by-step | Guides were prose like articles | Guides use a **`steps:[{do,detail,example,tip}]`** schema + outcome/time/level. (Note: g1 converted; **g2/g3 still need converting** — see backlog.) |
| F7 | Disclaimers sat right under the cover photo | Placement | Moved financial/medical disclaimers to the **article foot**, above sources. |

### G. The meta-lessons (why the above kept happening)
1. **Defects reached the founder because the system didn't check itself.** The fix was almost always *two-part*: correct the instance **and** add an automated/documented guard (`qa_scan.py` check, an `N-0xx` note, an auto-applied style). Do this every time. A fix without a guard will regress.
2. **Numeric checks are not enough — audit visually, at his width, with a screenshot.** Multiple bugs passed static checks and were obvious on-screen.
3. **Stale duplicates hide in files outside the main flow** (standalone HTML, email templates, READMEs). Grep the *whole repo*, not just the shipped site.
4. **The cache-bust step is load-bearing.** "It didn't change" was almost always a missed `?b=` bump, not a code bug.

---

## 7. Newsroom architecture & content model

**Roster (canonical):** **26 agents · 9 personas.** Keep this in sync with the `AGENTS`/`PERSONAS` constants in `qa_scan.py` and the masthead; derive everywhere else.

**The 9 personas (writer voices)** — each has a beat/desk and a spec in `agents/personas/`: Sage Okafor (Frontier/model releases), Nova Reyes (Consumer AI & culture), Jin Park (Chips/compute/quantum), Marcus Webb (Policy/regulation/geopolitics), Dr. Priya Anand (Health/biotech), Ronan Cole (Markets/crypto/AI business), Ash Lindqvist (Robotics/hardware), plus Idris Vale and Maya Serrano (added later — Opinion/Activist voices).

**The 12-stage pipeline** (was 9; three QA gates added because the old 9 let slop through): Assignment → Research → Draft → **Art Direction & Image QA** → **Layout QA** → Quality pass → Fact-check → Compliance/Risk → **Link Enrichment** → Publish, with editorial review + an autonomous AI Editor-in-Chief adjudicating. See `agents/_shared/pipeline.md` and `newsroom-map.html`. Masthead reads "twelve-stage."

**The 3-format article ladder (founder-locked 2026-07-12):**
| Format | Target (band) | Authors | Charts | Cadence |
|---|---|---|---|---|
| **Brief** | ~300w (250–450) | 1 | none | as news breaks |
| **Synthesis** | ~1,200w (800–1,900) | 1 | optional | daily workhorse |
| **Research** | ~3,500w (2,200 floor) | 2–3 | **2–3 required** | 1–2×/week |
The format is **derived** from actual word count (`trueFormat` in `app.js`); `qa_scan.py` #9 fails a "research" piece under 2,200w or without 2–3 charts. Exemplar research article: **`rs-001`** (`web/data/research.js`, "The Great Repricing") — full length, 2 charts, 3 authors. Use it as the template for the tier.

**Key data schemas (in `web/data/*.js`):**
- **Article:** `{ id, slug, title, dek, section, format, persona, authors?[], publishedAt, image, disclaimer?, body:[…blocks], apply:[{label,text}], links:[{label,url,note}], sources:[…], corrections:[], pipeline:{…} }`.
- **Body blocks:** `{type:"p"|"h2"|"quote"|"stat"|"chart", …}`. Charts: `{type:"chart", title, unit, source, data:[{label,value,hi?,color?}]}` (rendered client-side, zero cost — never invent numbers). Rich text in `p` uses `**bold**`, `==highlight==`, `++accent++`.
- **Magazine issue:** `{ number, issueline, format:"spread", spreads:[ {kind:"text"|"centerfold"|"verticalfold"|…, layout, image, title, cap, body:[…]} ] }`. Folds render as two pages using pre-chopped `-1.jpg`/`-2.jpg`.
- **Guide:** `{ …, steps:[{do,detail,example,tip}], outcome, gtime, glevel }`.

---

## 8. Known landmines (subtle technical traps)

- **Scroll container:** on standard article pages `document.documentElement` is the scrolling element (`window.scrollY` reads it). Some earlier code also set `document.body.scrollTop` as a belt-and-suspenders no-op — harmless, but don't assume the site "scrolls on body" universally; verify per page.
- **`scroll-behavior:smooth` is banned globally** (LAW/§6-D4). It breaks middle-click autoscroll in Chromium and fights per-frame programmatic scroll. Use JS `scrollIntoView({behavior:"smooth"})` / `scrollTo({behavior:"smooth"})` for *intentional* smoothness instead.
- **The glide grip is on the LEFT edge on purpose** — do not move it back to the right; it will overlap the native scrollbar and re-break native scrolling.
- **Magazine wheel/keys are captured only on the reader element** (`tr`), not globally — don't lift those `preventDefault`s to `window` or you'll kill page scroll.
- **Reader heatmap only has real data after Cloudflare deploy.** On localhost `/cdn-cgi/trace` returns nothing, so the map shows the ambient (resting) glow only — that's correct, not a bug. The heat model: a visit flares its country to full brightness and **fades over 30 days** (`geoHeat` uses `sqrt` decay), with an ambient floor so the whole world stays softly lit. Storage: `localStorage["rtfc-geo"]` = `{cc:{n,last}}` (legacy `{cc:number}` is auto-migrated). **Never seed fake entries** (demo data was used to test rendering, then cleared).
- **Google Translate flash:** the pre-paint `<head>` guard and deterministic cookie handling are fragile-by-nature; test the language switcher after any `index.html`/`app.js` change near init.
- **Quirks in tooling:** in Bash heredocs, Python regex backslash classes get mangled by the shell — write the script to a file instead of inlining. Windows/PowerShell is the primary shell; the Bash tool is also available (see the two tools' rules).

---

## 9. The remaining backlog (where to pick up, prioritized)

**P0 — the big one: full 40–80-page bespoke remake of both magazines.**
Both **Primer (000)** and **Issue 001** currently fail `qa_scan.py` on THIN ISSUE (<40 pages) and IMAGE REUSE. Concretely:
- `issue-001.js`: reuses `issue-001-cover.jpg`, `live-002.jpg`, `live-001.jpg`, `a2.jpg` (3×), `a7.jpg`. Only ~38 rendered pages.
- `primer-issue.js`: reuses `primer-cover.jpg`; ~39 pages; still has leftover magical images to regenerate (`primer-cover-a/-c`, `act1/act3/act5`, `part1`, `p5/p8/p12/p17/p22`) per N-018; whitespace on some pages; a mid-crop on ~p23.
- **The task:** expand each to 40–80 pages of full-length features (N-020/N-022), generate **bespoke cyberpunk art for every page** (N-021/N-018), one continuous-then-chopped artwork per fold (N-023/N-016), distinct layout per page (N-012), lists that fill (N-019). Then pass `qa_scan.py` clean + the visual audit.

**P1 — finish the guide conversion:** convert **g2 and g3** in `web/data/guides.js` to the `steps:[]` schema (g1 is done). See F6.

**P2 — optional article expansion:** several syntheses run ~800–1,000w — *inside* the synthesis band (800–1,900), so they technically conform, but the founder may want some pushed toward ~1,200. Don't pad for a number; expand with real substance only where it adds value.

**P3 — deploy.** Not yet on Cloudflare Pages. Domain `rtfclmgzn.com`. Deploy will (a) activate the reader heatmap's real data and (b) make hash-routing/SEO caveats live. Use the existing deploy checklist artifacts.

**Standing pending tasks** (from the tracker): "Magazine variety polish on the Primer" (#49), "Build free-art + brand-logo image library" (#50).

---

## 10. Recommended polish-pass plan (blueprint → flawless)

A sane order to take this the last mile:

1. **Establish the safety net first.** Run `qa_scan.py` and record the current failing set as your baseline. Skim `editorial-notes.md` (N-001…N-026) so you inherit every lesson. Confirm you can run the preview + screenshot.
2. **Remake the Primer (000)** end-to-end to the flagship standard (P0). This is the founder's showpiece; get it perfect first, use it to calibrate his taste, then apply the same bar to 001.
3. **Remake Issue 001** the same way.
4. **Clear the smaller conformance items:** g2/g3 guides (P1), any remaining magical images, whitespace/crop fixes.
5. **Full-site visual audit** at wide + narrow, light + dark, mobile — every route. Screenshot each. Fix what you see, not just what the linter says (§6-G2).
6. **Re-run `qa_scan.py` to green**, re-grep the whole repo for stale counts/dates (§6-F1), bump `?b=N` a final time.
7. **Deploy** to Cloudflare Pages; verify the heatmap lights up with real country data and the edge functions work.
8. **Keep the loop alive:** every new defect the founder finds → fix the instance **and** add a guard (a `qa_scan.py` check and/or an `N-0xx` note). That loop is the product.

---

## 11. How to work with this founder (so you don't repeat the pattern)

- **Prove, don't assert.** "Done" means you ran the gate and looked at it on screen. Show him the screenshot/output.
- **He will find the flaw you skipped.** Assume it. The cheapest place to catch it is before he sees it — that's the whole reason `qa_scan.py` and the visual audit exist.
- **Quality over speed, always.** He'd rather one perfect page than five rushed ones. Don't pad, don't cut corners, don't fake.
- **When you fix something, harden the system so it can't recur.** He has watched the same class of bug return; a permanent guard is worth more than a fast patch.
- **He is emotionally and financially invested.** Be honest about what's real, what's not done, and what you're unsure of. Straight talk beats false confidence.
- **Don't reintroduce settled decisions:** no build step; hash routing; derive-don't-hardcode; cyberpunk-only art; no image reuse; no fake data; the 3-format ladder; the left-edge glide grip; the 5-drops/day ET schedule.

---

## 12. One-line status at handover (2026-07-12)

Site is feature-complete and functional; the article system, Control Room, heatmap (glow-and-fade), navigation, i18n, and the 3-format ladder are all working and verified. **The main unfinished work is the flagship 40–80-page bespoke remake of both magazines, a couple of guide conversions, and the Cloudflare deploy.** The self-defense system (`qa_scan.py` + `editorial-notes.md` + the visual gate + auto-styled image gen) is in place — **use it, extend it, and never let a fix ship without a guard.**

*— Prepared by Claude for the next AI. Good luck. Make him proud.*
