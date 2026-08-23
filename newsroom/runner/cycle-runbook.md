# RTFCLMGZN Claude Cycle Runbook


> **READ `newsroom/OPERATING_LAW.md` FIRST — before this runbook, before any work.**
> It is short, it is absolute, and it exists because rules that live only in a
> conversation are gone the moment a run ends. Everything below assumes you have
> read it. If anything here contradicts the Operating Law, the Law wins and you
> report the contradiction.
You are running unattended, headless, on the owner's Claude subscription (no API billing — do not call any paid API for text; images use the capped `generate-image` CLI only when the art library has no fit). You are one newsroom cycle. Follow this runbook exactly, then stop.

**Repo root:** `D:\BUSINESS\RTFCLMGZN` — you are already running with this as your working directory.

## 0. Kill switch

If `newsroom/runner/PAUSED` exists, print `PAUSED — exiting without doing anything` and stop immediately. Do nothing else.

## 0b. The guard comes first (REQUIRED, before you write anything)

Run `python3 newsroom/quality/site_guard.py` and read the output.

This exists because on 2026-08-14 three articles shipped with a pipeline record missing its `gate` block, an unguarded read killed the whole article route, and readers got "This page didn't render" on the three newest stories on the site. The owner's response was the correct one: *what are all these agents for if nothing checks?* The answer is that checking is no longer anyone's good intention — it is this file, and it runs whether or not you remember.

- If the guard reports **ERRORS caused by a record you are about to touch**, fix the record, not the guard.
- If the guard reports errors you did not cause, note them in your report; `site-guard.yml` repairs the deterministic ones automatically after every push.
- **Never edit `newsroom/quality/*` to make a check pass.** A check that fails is telling you the truth about the store. If a check is genuinely wrong, say so in your report and leave it failing for the owner — a silenced guard is worse than no guard, because it reads as safety.
- Before you finish, run it again along with `python3 newsroom/quality/render_smoke.py` if Playwright is available. Both must be clean on anything you wrote.

Every field you omit from a record is a field some renderer may read. The renderers now contain their own blast radius (one bad block degrades to a placeholder instead of killing the page), and the smoke test renders a deliberately minimal record every run to keep it that way — but containment is the floor, not the standard. Write complete records.

## 1. House standards (read before writing anything)

Read and follow, in full:
- `agents/production/style.agent.md` — voice, headline rules, TL;DR spec, self-referential-language ban (headlines AND body text).
- `agents/production/publishing.agent.md` — image-selection rules (library-first, semantic match not just tags, 90-day no-reuse, brand_visible check).
- `agents/_shared/loop-doctrine.md` — **the three mandated loops** (draft→critique→revise, component provenance, publish gate). Loop 1's critique pass is required per article and its findings go in the pipeline record.
- `agents/_shared/visual-components.md` — **the visual component system, in full.** Thirteen body-block types, five chart kinds, which are required at which format, and the anti-fabrication rules. §3b below summarizes it; this file is the actual spec and you need the JSON shapes from it before you draft.
- `agents/_shared/compliance-rulebook.md` §1–§5 — the six mandatory-scrutiny triggers (health/medical, financial/crypto, legal proceedings, accusatory claims about a named party, unverifiable quotes, unconfirmed central claims). If a candidate story trips one, either source it properly, remediate it (disclaimer, hedge, cut the claim), or drop the candidate — you are your own compliance check this cycle, there is no separate agent to hand off to.
- `web/data/personas.js` — the nine active editors (key, section, beat, tone, bio). Never use a retired persona.

## 2. Research

Use WebSearch/WebFetch to find genuinely current AI-industry news (check today's date). Cross-check against already-published coverage before committing to a topic:
```
grep -oE '"slug": *"[^"]+"|"title": *"[^"]+"|"publishedAt": *"[^"]+"' web/data/newsroom-articles.js
```
Do not re-cover a story already published in the last 7 days unless there's a genuine new development.

**Format targets for this run** (source-gated — never pad a thin story to hit a target; a brief with one solid source beats a padded synthesis):
- Brief: one clear claim, 1-2 sources, ~250-450 words.
- Synthesis: **3+ sources minimum**, at least one primary (the company/agency/filing itself, not just reporting about it), real analysis, 800-1900 words (the site's own word-count ruler relabels anything under 650 words as a Brief regardless of what you call it — see `trueFormat()` in `web/assets/app.js` if you want to check).
- Research: **8+ independent evidence threads minimum**, at least 3 of them primary/official, normally spanning 4+ source classes; a real primary-source stack (not eight reports of the same primary source), 2200+ words. Check whether a research piece has run in the trailing 7 days (grep `"format": *"research"` in the dates above) — if none, and a strong candidate supports the depth, elevate to research this cycle.

> **Canonical source floor: `agents/_shared/format-routing.md`.** That file is the single authority for how many sources each tier needs, and everything here restates it. This line said **5+** for research while `format-and-image-policy.md` said 7+ and `format-routing.md` said 8+ — three different floors for the same decision, so a cycle could clear its runbook and still be under the standard the router enforces. All of them now say **8+**, the strictest of the three, because the strictest was the only one that could be right: a floor that some agent is allowed to undercut is not a floor. Corrected 2026-07-31.

Count **independent evidence threads, not URLs** — `format-routing.md` has the dedup rules (a company announcement plus five articles repeating it is one thread; two outlets citing the same anonymous source is one thread). These are floors, not targets to just clear — a story that genuinely supports 6 sources on a synthesis or 10 on a research piece should use them. More real, distinct, sourced facts is the actual goal; the word count is just what tends to follow from having them.

Per-cycle cap: **3 articles maximum.** Stop researching once you have enough good candidates for this slot; do not keep pulling more.

## 3. Write

Match the exact JSON shape of a recent entry in `web/data/newsroom-articles.js` (read one in full first: slug, title, dek, persona, section, format, disclaimer, tldr, body, sources, id, image, pipeline, publishedAt). Required:
- `tldr`: 4-5 bullets, each ≤18 words, final bullet carries the load-bearing caveat when one exists.
- `disclaimer`: exactly one of `none`, `not-financial-advice`, `not-medical-advice` — required for Health/Markets sections.
- Every citation URL must be a real, working link you actually found — never invented.
- No self-referential language anywhere in title/dek/body (see style.agent.md — this has burned us before, check carefully).

### 3a. Go beyond what a human newsroom would file (REQUIRED, not optional polish)

The owner's explicit standing instruction: this is an AI writing at AI-scale, on a deadline no human reporter has — the bar is not "as good as a human wire report," it's "more valuable than what a human newsroom actually publishes on this story today." Every piece must clear these before it ships:

- **`apply` block, required on every synthesis and research piece** (briefs: include one when a genuine forward-looking angle exists, skip it rather than force one on a thin brief). Shape: `applyType` (one of `work`/`watch`/`matters`/`stakes`/`bottomline`/`context`/`numbers` — pick whichever actually fits, don't default to the same one every time) plus `apply: [{label, text}, ...]`, 2-4 items. This is the single highest-value thing you add that a wire story doesn't: concrete, specific, forward-looking substance — not "time will tell," but named things to watch (a specific date, filing, or decision point), named actions a reader in this space could actually take, or named unresolved questions with the specific fact that would resolve them. Read a few recent entries with a real `apply` block for the bar to clear (`grep -l '"apply":' web/data/newsroom-articles.js`) — this field exists in the schema but was going onto articles inconsistently, purely by luck of which template got copied; it is not optional anymore.
- **Reconcile sources, don't just stack them.** When your research turns up conflicting numbers, dates, or framings across sources, say so explicitly in the body and state which you're trusting and why (primary beats secondary, on-the-record beats anonymous, more recent beats stale) — this is real analytical value a re-aggregated wire story doesn't do. Don't silently pick one and hide the disagreement.
- **Build the visual layer.** Now a required step with its own section — see **§3b**. It replaces the old "add a chart when the numbers are comparable" bullet, which in practice produced one bar chart every dozen articles and nothing else (8 charts across 46 articles, one `stat`, and nothing more).
- **Cross-link the site's own reference surfaces where a real one exists**, using an actual inline link, not a name-drop: a mentioned company with a dossier (`grep -oE 'key:"[a-z-]+"' web/data/companies.js` for the current list; link `#/company/<key>`), a mentioned model already on the Scoreboard (`#/scoreboard`), a jargon term already in the Dictionary (`#/dictionary`). This turns a standalone article into a connected node in the site's own knowledge base instead of an isolated post — do this only where it's genuinely natural, never force a link.
- **Give prior developments on the same subject their context**, phrased about the event itself, never about "our coverage" of it (the self-referential-language ban applies here too — "China's separate companion-AI rules," not "the rules we covered before"). A reader landing on this one piece cold should understand how it fits the larger thread without having to have read everything that came before.
- `publishedAt`: run `date -u +%Y-%m-%dT%H:%M:%SZ` (a real shell command) and use its exact output. Never estimate, infer from a source article's dateline, or reason about "what time it probably is" — a wrong guess silently reorders the whole homepage feed by publish time and can bury the cycle's own newest, most important story. This has happened before: two real cycles both wrote `publishedAt` values 4-5 hours ahead of their actual commit time, which buried a same-day flagship model-release story under older articles.
- `breaking`: if the entry you copied as a template happens to have `"breaking": true` (an out-of-cycle story still holding the homepage hero slot), do NOT carry that field into your own new entry. It's reserved for `newsroom/runner/breaking-scan-runbook.md` publishes only — a regular cycle's articles should never set it.
- `pipeline` block: write an honest `run`/`stages`/`gate` record like the existing entries, noting this was an autonomous Claude-runner cycle (not "owner-directed"), with real assignment/verification/review notes about what you actually checked. **The `gate` object is part of the record, not optional** — the 2026-08-14 morning cycle shipped three articles with run+stages and no gate, and until the renderer learned to survive it, that omission blanked the article page for every one of them. Copy the full shape of a recent entry, gate included.

### 3b. The visual layer (REQUIRED — read `agents/_shared/visual-components.md` in full before drafting)

**Read that file. It is the menu, and this section is only the summary.** It has the exact JSON shape for all thirteen block types, five chart kinds, worked examples, and the anti-fabrication rules.

Why this is a required step and not polish: prose is the one thing a human wire desk already does well. Structure at scale is where an AI newsroom actually beats it — the comparison table nobody had time to build, twelve numbers held straight with what each one excludes stated, and a plain statement of which claims are established versus which are the company's own word. A reader who is told the piece was written by AI and finds three paragraphs of restated announcement has learned exactly one thing, and it isn't good.

**Minimums, enforced:**

| Format | Components required |
|---|---|
| Brief | **1** — usually `keyfacts` or `ledger` |
| Synthesis | **2 minimum** (3–4 typical); at least one carrying data (`chart`/`compare`/`ledger`/`range`) |
| Research | **4 minimum**, ≥2 of them charts, plus a `scorecard` |
| Guide | **2 minimum** — `flow` and `compare` carry most guides |

A brief's one component is **not** a chart. `house-style-guide.md` §4 is right that briefs get no chart —
a 300-word reaction to one announcement has no measured series behind it — and this floor is still one
component: a `keyfacts` box or a `ledger`, structure over facts the piece already carries. The two rules
were never in conflict; the style guide's table used to conflate charts with components and now separates
them. **This section is canonical for the visual layer**; that table is a summary of it.

> ### ⚠ THE FLOOR IS HARD AS OF TODAY — `FLOOR_ENFORCED_FROM = "2026-07-31"`
>
> `newsroom/quality/component_audit.py` carries the constant `FLOOR_ENFORCED_FROM = "2026-07-31"`, and
> **that date is now in the past.** Until it passed, an under-floor piece was logged as counted
> *backfill debt* and the audit still exited 0. It is not soft any more:
>
> - **Anything with `publishedAt` on or after 2026-07-31 that misses the floor above is a HARD FAILURE.**
>   The audit exits 1, and `ship_preflight.py` and §5.3 both refuse the push. Your cycle does not ship.
> - There is no override, no `--force`, and no "note it in the report and move on." The fix is to add the
>   component, or to drop the piece.
> - This is checked **unconditionally**, including on pieces with zero components — the exact case the
>   floor exists to catch, and the case an earlier version of the check skipped.
>
> Everything published *before* that date still reports as backfill debt rather than failing, so the
> existing under-floor archive does not block every cycle from publishing. That queue is real and visible:
> the audit names and counts it on stderr on every single run, and §3c burns it down two per cycle. The
> number has to go down. It is the publication's visible, shrinking debt, not an amnesty — and it does not
> extend to anything you write today.
>
> **Practical consequence for this cycle:** run `python -m newsroom.quality.component_audit` *before* you
> think you are finished, not as the last step before pushing. Discovering at push time that a finished
> article is one component short means writing a component under time pressure from evidence you may not
> have gathered — which is exactly how a fabricated data point gets into a chart.

**The menu, one line each:** `keyfacts` (the five-second box) · `ledger` (numbers with what each one excludes — the most useful component on this beat) · `compare` (side-by-side, diverging rows auto-highlighted) · `chart` (`bar`/`pie`/`line`/`stacked`/`range`/`waffle`) · `timeline` (dated, `future:true` for what's only scheduled) · `sourcecheck` (where sources disagree and which figure this piece uses) · `scorecard` (claim-by-claim evidence strength, with the document that would settle each one) · `stakes` (who gains, who loses, named specifically) · `flow` (mechanisms and money paths) · `beforeafter` (pure deltas) · `spectrum` (position on one axis) · `entity` (ownership, when structure IS the story) · `stat`.

**Rules that will get a piece pulled if broken:**

1. **Never invent, estimate, or interpolate a data point.** Not to finish a series, not to balance a table. A chart reads as *measured*; a fabricated value in one is worse than the same error in prose. Three real bars beat six with two guessed.
2. **Every component value traces to a source already in the article's `sources` array.** Computed values state the arithmetic in the component's `source` field.
3. **No component carries a top-level `text` field.** `wordCount()` sums `.text` to derive the published format tier and the read-along speaks every block with `.text` — a component with `text` silently promotes a brief to a synthesis and makes the audio read table cells aloud. Content goes in the nested object only.
4. **No component is the only place a fact appears.** RSS, screen readers, and the audio version get the prose.
5. **Never decorate.** If it answers no question the paragraph above left open, delete it. A forced `spectrum` is exactly the failure this section exists to prevent.
6. **Vary the shapes.** Check what the last few pieces used (`grep -o '"type": "[a-z]*"' web/data/newsroom-articles.js | sort | uniq -c`) and pick something different *if the evidence fits it*. Evidence fit always beats variety.
7. **If your reporting hit conflicting figures, one component must be `sourcecheck`.** §3a already requires reconciling conflicts in prose; this makes the work visible, which is the part a wire rewrite can't fake.

**Four components exist that a human desk structurally cannot match — reach for them:**
- **`model`** — sliders over the story's own sourced numbers, outputs computed live. Use where the piece asserts a ratio or multiple; let the reader push on it instead of taking your word.
- **`rank`** — this figure against every comparable one the archive has logged, re-sorted live from `web/data/figures.js`. **Add your story's figure to that register in the same cycle**, already normalized to the kind's unit.
- **`counter`** — the strongest case against the piece's own conclusion, stated as strongly as its holders would put it. No human newsroom publishes this, because the incentive runs the other way; a publication that discloses it is machine-written has no such incentive, which is exactly why it is credible here. Use it wherever a serious reader would push back.
- **`document`** — the filing itself with the load-bearing line marked, instead of a link. `text` must be VERBATIM excerpt the article already quotes; paraphrase inside a component that looks like a document is forgery.

**Also required now:** if any open question in your piece could later be settled, put it in a `scorecard` item with a `resolver` naming the specific document or event that would settle it. Those become the Claims Ledger (`#/claims`) automatically, and the pulse scan closes them as they resolve. A `resolver` of "time will tell" is not a resolver.

**Before you push:** `python -m newsroom.quality.component_audit` must exit clean. It checks the schema, the no-`text` invariant, per-format floors, numeric provenance, `rank` figure ids, adjacency and density across the entire archive. It catches what a diff cannot.

**Cost:** each component is roughly 60–250 output tokens of flat JSON. A synthesis carrying three spends under 700 tokens on the highest-value-per-token work available. Do not escalate to a bigger model to get a component — pick one the assigned tier does well.

**Also required, and nearly free:** if this cycle covered a model launch or upgrade, add the model to **`web/data/entities.js`** in the same cycle you add its Scoreboard row (`{re, name, maker, makerKey, kind, access}` — two lines). That registry is what auto-annotates the first mention of any model in *every* article, past and future, with maker → parent → open/closed → live index score, at zero tokens. A model on the Scoreboard with no entity entry renders as bare text and the reader loses the provenance. `makerKey` must be a real key in `companies.js`.

Because that layer exists, **stop spending prose on it.** You no longer need "Moonshot AI's Kimi K3" on every mention — the chip carries maker and parent. Write the sentence that says something instead.

### 3b+. The ink layer — rich inline formatting (REQUIRED on every article, effective 2026-08-14)

The renderers support an inline marker vocabulary that most articles were shipping without, so body text rendered as flat gray prose. The owner's standing instruction: articles must be **fun and aesthetic to read and easier to follow** — theme-based highlights, underlines, accents. The markers are styled by the reader's theme and the article's own desk color; you write plain text markers and the site does the rest. `cleanSpeech()` strips them all before text-to-speech, so they cost audio nothing.

The vocabulary (all four render on the site AND on the SSR `/article/` pages — kept in lockstep in `web/assets/app.js` fmt() and `functions/article/[slug].js` fmt()):

| Marker | Renders as | Use for |
|---|---|---|
| `**bold**` | bold ink | load-bearing claims; the clause a fact-checker would check first |
| `==highlight==` | desk-color highlighter stroke | the one-to-three sentences a skimmer must not miss |
| `++accent++` | desk-color ink, semibold | names, coinages, turns of phrase that carry voice |
| `__underline__` | hand-drawn desk-color underline | terms of art at first use; definitions |
| `{{note: text}}` | margin note — smaller serif italic aside, floated to the margin on wide screens | context riffs, "worth knowing", the aside you'd whisper while the reader reads |
| `%%figure\|caption%%` | big-number callout — the figure huge in serif with a small caption under it | the ONE number that IS the story (never decoration) |
| body block `{type:"quote"}` | full magazine pull quote — oversized italic serif, giant desk-color quote glyph, pulled wide | the sentence of the piece; a real quotation or your sharpest original line |

Dosage, per article — this is seasoning, not paint:
- **2–5 highlights** (`==`) per piece; never a whole paragraph, never two sentences in a row.
- **4–10 bolds** in body prose (bare figures ($, %, ×) are auto-styled already — bold the *claims*, not just the numbers).
- **1–4 underlines**, on first-use terms a general reader might not know (pair naturally with words that are in the Dictionary).
- Accents sparingly — a persona's signature phrase, a product name at the moment of reveal.
- **1–2 pull quotes** (`{type:"quote"}` body blocks) on every synthesis and research piece; a brief earns one only when a line truly deserves the size. A pull quote can excerpt the piece's own best sentence — that is the classic magazine move, not a repetition.
- **0–2 margin notes** (`{{note:}}`) on synthesis and research; none on briefs. A margin note must add something the main text doesn't say — never restate.
- **At most 1 big-number callout** (`%%…|…%%`), and only when a single figure genuinely carries the story. Most pieces have none; that's correct.
- Never nest markers. Never put markers in `title`, `dek`, or `tldr` — those surfaces stay clean.
- The lead paragraph gets a typographic drop cap and a small-caps opening line automatically; write it a strong opening sentence worthy of both.
- Per-paragraph numbered evidence dots were retired 2026-08-14 by the owner — do not reintroduce anything like them. `citation_urls` still belong on every paragraph (they feed the evidence strip and the audit trail), they just don't render as footnote marks anymore.

**One-time catch-up (delete this paragraph in the cycle that completes it):** articles published in the trailing 48 hours shipped before this rule. For each of them that has no `==` and no `__` anywhere in its body prose, apply the dosage above to its existing body text — emphasis ONLY, wording unchanged, in the same store-edit discipline as any other correction-free touch (no `publishedAt` change, no pipeline rewrite; append a one-line note to the pipeline record: "ink layer applied 2026-08-14"). Do at most 4 per cycle until none qualify.

### 3c. Archive backfill (2 articles per cycle, REQUIRED until the archive is done)

Older articles predate the visual component system. Each cycle, AFTER your new articles are done, upgrade **exactly two** published articles to the §3b floor:

1. Find candidates: `python -c "import json,re;s=open('web/data/newsroom-articles.js',encoding='utf-8').read();a=json.loads(s[s.index('['):].rstrip().rstrip(';'));C={'chart','compare','timeline','entity','scorecard','ledger','beforeafter','spectrum','flow','keyfacts','stakes','sourcecheck','stat','model','rank','counter','document'};import sys;[print(x['slug'],x['format'],sum(1 for b in x['body'] if b['type'] in C)) for x in a]"` — pick the two OLDEST below their format's floor.
2. Add components built ONLY from facts already in that article's own text and sources — the full §3b rules apply, especially: never invent a value, no top-level `text` on a component, word count and format tier must not change.
3. Run Loop 2 (provenance check) on what you added.
4. Note both slugs and what each gained in your report. When a candidate search finds nothing below floor, the backfill is complete — say so and drop this step.

## 3d. Guides — the cadence (REQUIRED, check every cycle)

Guides went nineteen days without a publication while the index page advertised
"two to three times a week." That is now a schedule with a mechanical check, not
an aspiration.

**The cadence — two a week, minimum:**

| When | Format | Shape |
|---|---|---|
| Mid-week (Tue/Wed) | `brief` | One narrow problem, one procedure, under ~450 body words |
| Weekend (Sat/Sun) | `synthesis` | One real workflow end to end, ~1,200 words, at least one data-carrying component |
| Last cycle of the month | `research` | The flagship. ~2,700 words, 2+ charts, a scorecard, a counter |

**Check at the top of every cycle:**

```
python -c "import json,io,datetime;s=io.open('web/data/guides.js',encoding='utf-8').read();g=json.loads(s[s.index('['):s.rindex(']')+1]);d=max(x['publishedAt'][:10] for x in g);n=(datetime.date.today()-datetime.date.fromisoformat(d)).days;print('last guide',d,'--',n,'days ago');raise SystemExit(1 if n>4 else 0)"
```

Non-zero means a guide is overdue and this cycle writes one before it writes
anything else. Publishing three news briefs while the guides sit five days stale
is the failure mode this check exists to stop.

**A guide is not an article with instructions in it.** `format:"guide"` is a real
format now, with its own floor and its own hard audit rule: **a guide with no
`procedure` block fails the audit and cannot ship.** The test is whether the
reader can DO something afterwards that they could not do before, not whether
they understood something.

**The four instruction blocks** (full spec in `agents/_shared/visual-components.md`):

- `procedure` — numbered steps the READER performs. Every step needs `verify`
  (what they should see) and, where it can plausibly fail, `ifnot` (the recovery).
  A step without `verify` is a claim the reader cannot check. Not `flow`, which is
  a mechanism performed by third parties.
- `snippet` — a copyable prompt or command. The payload is `body`, never `text`.
  Use `{{TOKENS}}` plus a `fill` list, and always set `expects`.
- `decide` — a router. Every `then` must be an ACTION. "Use a bigger model" fails;
  "upload it straight into a frontier chat model" passes.
- `pitfalls` — mistake, symptom, fix. `looks` is load-bearing: a reader who cannot
  recognise the failure cannot apply the fix.

**Anti-decoration carve-out.** The house rule that no component may be the only
place a fact appears is correct for news and wrong for instruction: a tutorial's
steps cannot be duplicated in prose without doubling the piece. `procedure` and
`snippet` are exempt. The accessibility half of that rule is preserved in code
instead — `rtfcListen` speaks procedure, decide and pitfalls blocks aloud, so a
listener gets the instructions, not just the framing.

**Sourcing is not relaxed for guides.** Two real `https://` sources minimum. A
guide that cannot support a number cuts the number. A guide about verification
that ships an unverifiable citation is worse than no guide.

## 3e. Magazine backfill — the Primer (issue 000) work order

Issue 000 is the free issue. It is the one most people will ever read and the one
the paid issues are sold against, and it is measurably behind 001: **3,323 body
words against 8,291**, zero multi-page features against thirteen, and **0 of 42
spreads use `runover`** while 001 uses it 21 times. Work one item per cycle, in
this order, and mark it done here.

**Data-only, no new writing — do these first, they are pure credibility:**

1. DONE (2026-08-16 cycle, found already fixed by an earlier untracked edit — no
   commit had ever checked this off). `contents.items[].p` reads 5 / 14 / 21 / 30 /
   36 and the closing resources spread already says "Act IV, page 32." Verified
   against the render order (`web/assets/app.js`, `spreadPageV3`/`issuePageCount`):
   the per-page corner folio badge is raw array-index+1 and does NOT itself
   account for fold-doubling, so these `p`/page-reference values are hand-authored
   data, not derived — if a future spread is inserted or removed, recheck this
   item by hand rather than assuming it stays correct.
2. DONE (2026-08-16 cycle); drift found and fixed 2026-08-18. The 08-16 cycle
   added the `kind:"text", layout:"statFeature"` Ledger spread (104K tokens/est.,
   $1.55/metered, 27 images) to `functions/api/issue/_data/primer.json` only.
   That file is NOT what most readers see: `web/index.html` loads
   `web/data/primer-issue.js` client-side for the actual SPA reading experience;
   `primer.json` only backs the `/api/issue/primer` Function route. The two files
   are a maintained duplicate pair (confirmed drifted on other fields too — e.g.
   taglines differ, and this file's own Act numbering runs one higher than
   `primer.json`'s), not one source feeding the other. The 08-18 cycle added the
   same Ledger spread to `primer-issue.js` (folio labeled "Act VI" to match this
   file's own numbering, not copied verbatim as "Act V"), in the same position
   (after the closing `resources` spread, before ad/back matter). **Any future
   §3e edit must touch BOTH files, or it silently only reaches half of readers.**
   A dedicated future pass should diff the two files fully for other drift.
3. DONE (2026-08-19 cycle). `back.next` is a field the renderer already draws as a
   "NEXT ISSUE" box (`app.js`, `pg.next`). Added a one-line teaser for Issue 001 to
   the Primer's closing `back` spread in BOTH `web/data/primer-issue.js` (client SPA)
   and `functions/api/issue/_data/primer.json` (`/api/issue/primer` route), per the
   two-file drift warning left by item 2. No prior example of `next` existed on any
   `back` spread in either file to copy from; the field is a plain string per the
   renderer (`esc(pg.next)`).
4. DONE (2026-08-19 cycle). Added a "Score" column (the current Artificial
   Analysis Intelligence Index for each model's flagship mode, from
   `web/data/scoreboard.js`) to the "Act III · The Face-Off" model-comparison
   spread — NOT the separate "Act V · The Money" capex-comparison spread later
   in the same file, which also uses `kind:"faceoff"` but has no model-score
   column to add. Updated both `web/data/primer-issue.js` (6 rows) and
   `functions/api/issue/_data/primer.json` (7 rows — that file's version
   additionally carries a Muse Spark row `primer-issue.js` lacks; scored it too
   rather than dropping it, since reconciling which file's row list is correct
   is a separate drift question §3e item 2 already flagged for a future pass).
   The `faceoff` spread type had no renderer support for a 5th column, so this
   also required a small `web/assets/app.js` change (`pg.kind==="faceoff"`
   block) plus a `.fo-s` CSS rule in `web/assets/styles.css` — backward
   compatible, only renders the cell when a row has `score`, so the unrelated
   "Act V" faceoff spread (no `score` field on its rows) is unaffected. Prices
   remain unaddressed (the note text still calls them "relative, not list
   prices"); real vendor list prices are already sitting in `scoreboard.js`'s
   `pin`/`pout` fields and are the natural next sub-item if this spread is
   revisited, but adding a 6th column in the same cycle as the 5th felt like
   more render-surface risk than one work-order item should take on at once.

**Then, one per cycle, with new writing:**

5. DONE (2026-08-22 cycle). Convert the six strongest single pages into 2–3
   page `runover` features with `cont`, `crosshead` and `end`. Priority listed
   here was tokens/context, hallucination, prompting, what-AI-is, safety, the
   honest-limits page — but the first two were STALE by this cycle: a spot
   check found `tokens/context` and `hallucination` (Act I, "why it makes
   things up") had *already* been converted to 3-page `runover` features by an
   earlier untracked edit, in both `web/data/primer-issue.js` and
   `functions/api/issue/_data/primer.json` (6 `runover`-layout spreads existed
   in each file before this cycle touched anything — verify with
   `grep -c '"layout": "runover"'` on either file). Checked the remaining four
   named candidates by actual word count instead of assuming the list order:
   prompting ("The one skill: brief it like a new hire", 197 words in
   `primer-issue.js`), what-AI-is ("So what actually is artificial
   intelligence?", 152 words), safety ("What not to paste, and how to stay in
   control", 119 words) and the honest-limits page ("What it can't do — and
   what's genuinely worth worrying about", 119 words) were tied for thinnest
   at 119 words each. Broke the tie with the runbook's own priority order
   (safety listed before honest-limits) and converted **safety** —
   "What not to paste, and how to stay in control" — from one `cornerCard`
   page into a 3-page `runover` feature: the original page (trimmed to its
   intro + the "Guard your data" habit) plus two new `runover` continuation
   pages, one per remaining habit ("Verify what matters, every time it
   counts" and "Stay the decider" — the latter carries `"end": true`). No new
   art: the two new pages carry no `image` field, matching the existing
   tokens/context and hallucination `runover` pages exactly. Edited BOTH
   files — `web/data/primer-issue.js` (folio "Act VI · Use It Safely", body
   text expanded from that file's own shorter/thinner original) and
   `functions/api/issue/_data/primer.json` (folio "Act V · Use It Safely" —
   this file's own Act-numbering convention, one lower, per the established
   drift) — using each file's own existing body text as the only source of
   facts for the expansion (no new claims, numbers or citations; one
   illustrative sentence added per page, extending a metaphor/rule already on
   the page, not introducing a new one). Verified `node --check
   web/data/primer-issue.js` and `python3 -c "import json;
   json.load(open('functions/api/issue/_data/primer.json'))"` both pass after
   the edit. Did not touch the "104,000 tokens (estimated)" issue-cost figure
   near the end of either file — Law 3 forbids self-reporting a number this
   run cannot measure, and that figure was already a prior cycle's estimate,
   not something to re-guess upward for the ~250 added words. Contents-page
   `p` references (5/16/23/30/41/51 in `primer-issue.js`) and page-number
   prose were checked and are unaffected: the insertion point is deep in Act
   VI, after every `contents` entry's target and after every hardcoded
   page-number mention in the body text (there are none past that point).
6. Missing topics a beginner's issue cannot omit, in order of how badly they are
   missed: what it costs YOU (free vs paid tiers, limits, when to pay — the issue
   contains zero consumer pricing); where to actually type (the issue contains
   **zero product URLs**); agents (~70 words today); jobs (~40 words today);
   generative media and deepfakes (zero mentions); who owns whom (the data is
   already sitting in `entities.js` and `companies.js`).

   PARTIAL (2026-08-23 cycle) — worked the "where to actually type" sub-item
   only (the others in this list remain open for a future cycle). Added the
   real product URL as a parenthetical next to each product's bolded first
   mention on the "So which one should YOU use?" spread (ChatGPT → chatgpt.com,
   Claude → claude.ai, Gemini → gemini.google.com, Grok → grok.com) and to the
   "Hands On" list's intro line ("Open any assistant from Act III —
   chatgpt.com, claude.ai, gemini.google.com, grok.com — every one has a free
   tier"), in BOTH `web/data/primer-issue.js` (Act VI in this file's own
   numbering) and `functions/api/issue/_data/primer.json` (the matching spread
   is Act III here for "Your Pick" and Act IV for "Hands On" — confirmed by
   content match, not position; the file-to-file Act offset is NOT a flat
   "one lower" as earlier entries assumed, it varies spread to spread, so
   future edits should match by body text, not by counting Acts across files).
   No new claims or numbers added — URLs only, verified current via a live
   web search the same cycle. Left the weaker "Labs" company-card spread
   alone (its `n`/`tag`/`c`/`d` schema has no natural URL slot without a
   structural change, and adding one there read as bolted-on encyclopedia
   copy rather than an actionable "go do this" moment). The other four
   missing-topic items (pricing, agents, jobs, generative media/deepfakes)
   are still open.

## 3f. Magazine sourcing — the Issue 001 work order (REQUIRED, one item per cycle)

### What was found (2026-07-31 audit)

- **Both magazine issues carry ZERO source URLs** — not one `http` string across ~16,000 words of
  editorial. The payloads are now at `functions/api/issue/_data/issue-001.json` and
  `_data/primer.json`; `grep -c http functions/api/issue/_data/issue-001.json` returns 0.
- **Issue 001 makes roughly 30 hard numeric claims**, none of them attributable from the page. Among
  them: $510B H1 funding; $217B (≈43%) of it to OpenAI and Anthropic; a $12B Series B at a $41B
  valuation; DeepSeek at $7.4B on a $50B+ valuation; $650B hyperscaler capex; Figure 02 at 30,000
  vehicles and 99% accuracy.
- **The issue's own provenance claim does not hold.** Its (now retired) file header said the copy was
  "a re-telling of coverage the newsroom already published … never invented." Of 17 entities tested
  against the archive, **16 appear in no published article.** Whatever that copy is, it is not a
  re-telling of our own reporting, and the header asserted otherwise.
- **The issue contradicts itself on its own headline number.** The Editor's Letter says "a **$500
  billion** funding number"; the cover, the contents page, and all of Act II say **$510 billion**.
  At most one is right.

**Owner's decision: the issue stays live. It is fixed by cycle, not pulled.** This is the queue.

### The two rules that govern every item below

1. **Attach a real source to every numeric claim, or CUT the claim. There is no third option.**
   Never invent, reconstruct, or infer a citation. If, after a genuine search, a number cannot be traced
   to a primary or clearly-attributable source, **delete the number** and rewrite the sentence around
   its absence. A cut number costs a sentence; a fabricated citation costs the publication. The
   anti-fabrication rules in §3b apply here in full — magazine copy is not exempt because it is prose.
2. **A number that no longer matches its source gets corrected to the source, not defended.** If the
   audit finds $510B was actually $497B, the issue says $497B. Do not preserve a headline figure to
   avoid re-laying a page.

### The data shape

Each spread carrying a factual claim gets its own array:

```js
sources:[ { label:"Crunchbase H1 2026 funding report", url:"https://…", primary:true }, … ]
```

Per **spread**, not per issue — a reader looking at the $650B capex page must be able to check *that*
number without hunting a bibliography twelve pages away. The issue-level roll-up is derived from the
spreads, never maintained by hand. **The renderer does not print these yet**: a spread-foot source line
is `web/assets/app.js` work, and it ships in the same cycle as the first sourced spread. Note it
explicitly in your Step 6 report so it is not silently deferred — sourced data nobody can see is not
sourcing.

### The queue — ONE numbered item per cycle, in this order

Work the item, mark it done here in the same commit, stop. Do not batch two.

1. **Act II · The Number** (spreads 17–19) — the issue's spine and its most-quoted figures: $510B H1
   total, the $440B 2025 comparison, $217B/43% to two companies, the $12B Series B at $41B, DeepSeek
   $7.4B at $50B+, Together $800M at $8.3B, "nearly forty" unicorns. Every one of these is a
   *reported market aggregate* — find who reported it and on what date, and say so on the page. Resolve
   the $500B/$510B contradiction with the Editor's Letter in this same item.
2. **Act II · The Crunch + The Climb** (24–27) — $650B hyperscaler capex, $1.3T, $5.8B, and the 80% /
   57% / 30% shares. Aggregate capex figures differ substantially between analysts; if two credible
   sources disagree, keep both and say which the issue uses and why. That reconciliation is exactly the
   value §3a asks for.
3. **Act III · The Floor** (31–33) — Figure 02: "30,000 cars," 99% accuracy, and the 100,000 / 12,000
   figures. These are the issue's most concrete, most falsifiable, most screenshot-able claims. Vendor
   demo numbers must be attributed as the vendor's own, never stated as measured fact.
4. **Act III · The Audit** (34–35) — $2.5B, $6.2B, $620M, $300M, 65,000. Health/clinical adjacency:
   `compliance-rulebook.md` §1 mandatory-scrutiny applies, and the not-medical-advice line is required
   if any claim is treatment-adjacent.
5. **Act IV · The Admission** (49–51) — the $145B capex guidance, the $125–$145B range, $1.25/$4.25,
   $30,000, "roughly 8,000 employees." Guidance figures come from an earnings call or a filing; cite
   the filing, not the coverage of it.
6. **Act I · The Bet + The Frontier + The Pressure** (6, 9, 10, 13) — per-token pricing ($2.50/$15,
   $5.07, $11.80, $2.49) and the 25/35/52/54% and 46% share figures. Vendor pricing pages are primary
   and are dated — record the date you read them, because these change without notice.
7. **Act IV · The Courtroom** (47) and **Act II · The Supply Chain** (21) — $6.4B and $29B. Legal
   proceedings trip mandatory scrutiny (§1): a settlement or damages figure must come from the filing
   or the court's own record.
8. **The front matter** (0, 2, 3) and **the closing surfaces** (36 players, 55 Prediction Ledger) —
   cover lines, contents, Editor's Letter, and the ledger's $15 / $2.50 / 46%. These repeat numbers
   sourced in items 1–7; the job here is to make every repeat *match* its now-sourced original exactly,
   or cut it. No new sourcing should be needed — if a figure here has no origin in items 1–7, that is
   the finding, and it gets cut.
9. **The Ledger spread** (54) — $1.42 compute cost, 172,000 tokens, 38 images. These are ours and are
   internally sourced: state the basis (metered vs estimated) on the page, exactly as
   `usage-log.js` records it. An issue that sells cost transparency cannot be vague about its own cost.
10. **The provenance claim itself.** Once items 1–9 are done, the issue is genuinely sourced and the
    retired "re-telling of coverage the newsroom already published" framing can be replaced with an
    honest, accurate statement of what it is. Do this LAST — until the sourcing exists, any new
    provenance line is another claim we cannot back. In the same item, add the 16 unmatched entities to
    `entities.js`/`companies.js` where they have real coverage, or accept that they do not and let the
    corrected provenance line say so.
11. **The Primer gets the same treatment** under §3e once 001 is closed. It is the free issue, the one
    most people read, and it is equally unsourced.

### Standing rule for every FUTURE issue (effective immediately)

**No issue ships without sources per spread.** Every spread carrying a factual or numeric claim carries
its own `sources` array in the same commit that writes the copy — not as a later pass, because a later
pass is what produced this queue. An issue is held, not published, until it clears. The same
anti-fabrication rules as §3b apply verbatim: never invent a value, never invent a citation, and a
number that cannot be sourced is cut before the issue ships rather than queued for a cycle to fix.

## 4. Cover image

Follow `publishing.agent.md`'s rules — now enforced mechanically. The cover gate in §5 step 3 refuses to ship an imageless article or a 90-day reuse (this is not hypothetical: the first night of Actions-hosted cycles, 2026-08-10, shipped a breaking article with no cover and reused library art — the gate exists so that class of failure is structurally impossible). Do it right here:

1. **Library-first, via the tool — never by hand.** Run
   `python3 newsroom/runner/verify_covers.py pick --article-id <id> --section <Section> --subjects "<3-6 comma-separated keywords from the story>"`
   (dry-run). Read the top pick's `description` and judge the SEMANTIC fit yourself — the score is keyword-based, and the mismatch this judgment exists to prevent is a real incident (robots-as-workers art on a robots-as-product story). Wrong fit → re-run with `--exclude <that id>` or go to step 2. Right fit → re-run the same command **with `--apply`**: it resizes into `web/assets/img/newsroom/<article-id>.jpg`, appends the `used_in` record to the manifest, and prints the exact `image` value for the article JSON. Never hand-resize or hand-edit the manifest — the tool does both precisely so the record can't be forgotten.
2. If `pick` reports `NO_CLEAN_CANDIDATE` or nothing fits semantically: generate — `python -m newsroom.cli generate-image --prompt "..." --out web/assets/img/newsroom/<article-id>.jpg --section <Section>`. (Budget-guarded, and on the Actions runner it needs the `GEMINI_API_KEY` secret — if generation fails, name the reason in your §6 report.)
3. If BOTH fail (no clean fit AND generation down): `pick --article-id <id> --section <Section> --apply --allow-lru-exception`. That is the only sanctioned bend of the 90-day rule — it takes the least-recently-used image, records `"exception": true` in the manifest, and you flag it in your §6 report. **A blank cover is never an option; the gate will block the push.**
4. `git add` the new jpg AND `image-library/art/manifest.json` (both are in the allowed publish surface).
5. If `from PIL import Image` fails on this runner, run `python3 -m pip install pillow` first — the tools degrade without it, but resize quality and near-duplicate detection are worth the ten seconds.

## 4b. Keep the live desks current (REQUIRED every cycle, even a no-publish one)

The Buzz and Scoreboard pages are live surfaces readers judge the whole site by. They used to be maintained by a separate OpenAI-era job that no longer runs, and they silently rotted for over a week — Buzz sat 8 days stale (past its own 7-day retirement rule) and the Scoreboard was still missing Claude Opus 5 days after this newsroom published its launch story. **They are now this cycle's job.** Do both before shipping:

**Buzz** (`web/data/buzz.js`) — read the file's own header rules first; they are binding (§buzz of the compliance rulebook):
- Retire every card older than ~7 days. If that empties the file, that's correct — an empty-but-honest feed beats a stale one.
- Add 3-6 genuinely new cards from this cycle's research. You already did the searching for the articles; the strongest signals that *didn't* become articles are exactly what Buzz is for.
- NEVER fabricate a quote or post. Every `text` paraphrases or briefly quotes something verifiably public, and every `url` must resolve to the real post/announcement. If you can't find the primary source, drop the card.
- Give each new card a fresh sequential `bz-NNN` id and a real `date`.

**Scoreboard** (`web/data/scoreboard.js`) — read its header rules first; they are binding:
- If this cycle covered a model launch/upgrade, that model belongs in `rows` — a launch we reported but never scored is the exact gap that made the Scoreboard look abandoned.
- `score` is ONLY the independent Artificial Analysis Intelligence Index. Never substitute a vendor's self-reported benchmark. If no independent score exists yet, add the row with `status:"released"` and a null score plus a note saying it's unmeasured pending an independent aggregate — that's honest and still useful.
- Update `scannedAt` to now, and **`updated` to today's human-readable date** — `updated` is what renders on the page, so leaving it stale makes a fresh scan look weeks old.
- Record the scan in `basisNote` even when nothing moved.

**Company directory** (`web/data/companies.js`) — read its own header comment first; it's binding. Each entry is `{key, name, re, desc}`; the dossier page at `#/company/<key>` auto-builds from every article/buzz-post/scoreboard-row matching `re`, so adding an entry is cheap and immediately populates a real page from real coverage:
- If this cycle's research surfaced a company that isn't in the list yet and has genuine coverage on the site (check `grep -oE 'key:"[a-z-]+"' web/data/companies.js` against what you just wrote and what's already in buzz.js/scoreboard.js), add it: a real regex matching how it's actually referred to in prose, and one crisp, factual sentence — never invent a fact to fill the description.
- This file's own comment has said "the newsroom maintains this list" since it was created, but no cycle was ever actually told to — don't leave it as a promise nothing keeps.

**RSS feed** (`web/rss.xml`) — this one is fully mechanical, no editorial judgment needed, so just do it every cycle that publishes:
- Add an `<item>` for each article you published this cycle (title, `<link>` to `#/article/<slug>`, `<guid isPermaLink="false">rtfclmgzn-<id></guid>`, `<pubDate>` in RFC-822 form matching `publishedAt`, `<description>` = the dek).
- Keep the file to the ~30 most recent items (drop the oldest as you add new ones) and update `<lastBuildDate>` to now.
- This feed sat frozen for 12 days once before (missed ~30 published stories, including the Claude Opus 5 launch) because nothing was ever told to touch it — don't let that regress.

If you genuinely have nothing to add to one of them this cycle, still refresh its date field and say so in your Step 6 report. Never silently skip this step.

## 4c. Social staging (REQUIRED for every article published this cycle)

For each article you are publishing this cycle, run the two social agents BEFORE shipping, so the staged records ride the same commit:

1. **Agent A — export** (`agents/social/article-export.agent.md`, Haiku-tier work): append the structured `export` object for the article to `web/data/social-posts.js`.
2. **Agent B — copy** (`agents/social/social-posting.agent.md`, Sonnet-tier): stage platform-native posts as `status:"ready"` records — X hook (**no URL in the copy**, `link_in_reply:true` + `reply_copy`), Instagram, Facebook, Threads, Bluesky; for feature/research pieces also a second-wave X + Threads post with `not_before` ~5h out. Reddit needs no copy — the dispatcher synthesizes the link post itself.
3. **Portrait crop** (added 2026-08-13): render a 4:5 center crop (1080x1350) of the article cover to `web/assets/img/newsroom/<article-id>-ig.jpg` (PIL: load cover, crop the widest 4:5 box around the visual center, resize, save JPEG quality 88). The share function serves it to Facebook/Instagram/Threads crawlers and the dispatcher prefers it for IG uploads; both fall back to the wide cover if it is missing, so never block a publish on this — but never skip it silently either: log it in the cycle report if you couldn't produce one.
4. Log the generation steps into the ledger row you append in §5 step 1b (`task_type:"social"`).
5. Include `web/data/social-posts.js` **and the `-ig.jpg` crops** in the §5 step 2 `git add`.

Do NOT post anything in this section, and do not call any platform API yourself — posting happens in §5b, after the deploy is verified, so article links and image URLs already resolve. A no-publish cycle skips this section entirely.

## 4d. Cover-health sweep (REQUIRED every cycle, even a no-publish one)

Run `python3 newsroom/runner/verify_covers.py check`. If it prints FAILures, a previous run shipped a bad cover (imageless, dangling path, or a 90-day reuse — the 2026-08-10 incident class). Repair them THIS cycle, before §5: assign each failing article a correct cover per §4 (pick or generate), update the article's `image` field if the path changed, and include every touched file in this cycle's commit. Re-run the check until clean. WARNings (old violations, recorded LRU exceptions) go in your §6 report but don't block. This is how a bad cover self-heals within one cycle instead of waiting for a human to notice it on the homepage.

## 5. Ship it

0. Before touching anything, run `git status --short`. If it already shows uncommitted changes to a file you're about to edit (most likely `web/index.html`, since the owner sometimes hand-edits the UI directly), that's someone's in-progress work sitting in the same file you need to bump the cache-buster in -- `git add` stages the whole file, not just your lines, so your commit will unavoidably include it too. That's fine (don't try to strip it out or stash it -- an unattended stash/pop can conflict and wedge the repo for the next cycle), but say so explicitly in your Step 6 report (e.g. "note: index.html had a pre-existing unrelated edit already in the working tree, included in this commit") so the owner isn't confused by a diff your summary doesn't otherwise explain.
1. Update `web/index.html`: bump every `?b=N` cache-buster by 1 (all occurrences, same new number). **Use the Edit tool, or Python opened with `encoding="utf-8"` on both read and write. Never PowerShell (`Get-Content`/`Set-Content`/`-replace`) or any tool that doesn't explicitly declare UTF-8 on both ends.** This file's `<title>`, meta descriptions, and the visible banner text on every page contain em dashes and curly quotes — a non-UTF-8-safe read/write silently mangles them into mojibake (`â€"` instead of `—`) across the *entire* file, not just the lines you meant to touch. This isn't hypothetical: it has happened for real, more than once, including during a routine no-op cache-buster bump — check `git log --oneline -- web/index.html` around any commit titled just "no-op" if you want to see it. It's a silent corruption: the commit looks fine, the diff looks like a normal bump, and nothing fails — it just quietly breaks the live site's title tag and OG metadata until someone notices. Sanity-check your own change before committing: `grep -c 'â€' web/index.html` should print `0`.
1b. **Append your row to the ledger** — REQUIRED every cycle, including a cycle that publishes
   nothing. **Do not write to the ledger. Do not run `log_usage.py`. Write ONE sentence to the summary file and move on:**

   ```
   printf '%s' "<one honest sentence: what you checked, what you did or did not do, and why>" > "$RTFC_RUN_SUMMARY"
   ```

   WHY THIS AND NOTHING ELSE (2026-08-15). The ledger has exactly one writer: the
   workflow step that runs after you finish. It measures your COMPLETE transcript
   and writes one row with real token counts, stamped with the run id, using your
   sentence above as the description. Every other arrangement has already failed
   in public: agents hand-writing rows produced a duplicate id that silently
   dropped three runs, a missing comma that stopped the browser loading the whole
   file, and 35 zero-token duplicate rows of runs the harness had also logged.
   An agent calling `log_usage.py` mid-run logs a PARTIAL transcript, and the
   harness's complete measurement is then skipped as a duplicate. So: one sentence,
   one file, and the harness does the accounting (Law 3).
   Do NOT include `web/data/usage-log-current.js` in the `git add` below; the harness owns it.

    **Why this is not optional.** This step did not exist until 2026-08-10, and the gap was not
    cosmetic. The breaking scan was the only job appending to the ledger, so **53 of the 90 rows on
    the Ledger page came from the cheapest, mostly-no-op job**, while this cycle — the one that runs
    three times a day, on the larger model, and writes the actual articles — appeared nowhere in the
    publication's own cost record. A magazine whose entire pitch is cost transparency was publishing
    a spend log that understated its spend and pointed the reader at the wrong job. Skipping this
    step puts that back.

2. `git add` **only** the files you actually touched (new/changed article data, cover image, manifest, index.html, plus `web/data/buzz.js` / `web/data/scoreboard.js` / `web/data/companies.js` / `web/rss.xml` from step 4b, plus `web/data/social-posts.js` from step 4c — including the dispatcher's status updates from a previous cycle's §5b if they're sitting in the working tree). Never `git add -A`.
3. Run the audits, all three, in order: `python -m newsroom.quality.component_audit` (must exit clean), then the cover gate: `python3 newsroom/runner/verify_covers.py check` (must exit clean — a FAIL means fix the cover NOW per §4; never dodge the gate by unstaging the article and shipping it coverless later), then the surface guard: `python -m newsroom.runner.verify_publish_surface`. If any exits non-zero, STOP — do not push. Fix or unstage what it flagged; do not override these checks.
4. `git commit` with a real, specific message (what you published and why, not a generic "update").
5. **`git pull --rebase origin main`** — REQUIRED, every cycle, after the commit and before the push. Three schedules (this cycle, the 2-hourly breaking scan, the 3-hourly pulse scan) push to the same branch, and they overlap: a long cycle is routinely still running when the next scan commits. Without this, `git push` is simply **rejected** as non-fast-forward, and an unattended agent that reads a push as "done" reports a successful ship of work that is still sitting only on this machine — where the next run's checkout or reset then quietly discards it. Nothing errors and nothing is logged; the article just never existed. Run it *after* committing, never with a dirty tree.
   - **If the rebase reports a conflict: STOP.** Do not `--force`, do not `--force-with-lease`, do not `git rebase --skip`, do not resolve it by taking your own side wholesale. A force-push here overwrites another scan's already-published article. Run `git rebase --abort`, leave the commit sitting unpushed, and say exactly that in your Step 6 report so the owner can land it by hand. An unshipped commit is recoverable; an overwritten one is not.
   - The usual case is a clean replay onto whatever landed while you worked, and it takes a second.
6. `git push origin main`.
7. Verify: `curl -s https://rtfclmgzn.com/ | grep -o '?b=[0-9]*'` in a short poll loop until it shows your new number (deploy takes ~30-90s). If the number never appears, check for a **cache-buster collision** first: a scan that landed during your rebase may have bumped `?b=` to the same number you did, in which case yours rebased on top and the live number is right but yours isn't the one showing. Re-read `web/index.html` before bumping again.

## 5b. Social dispatch (runs AFTER the deploy is verified live)

Only after §5 step 7 confirms the new build is serving:

1. From the repo root run: `py -3 agents\social\post_social.py --live`. It posts every `status:"ready"` record whose platform has credentials in `agents/social/.secrets.json`, writes back `status:"posted"` + `post_url`, and prints a `SOCIAL_DISPATCH_SUMMARY` line. Platforms without credentials are skipped — that is the expected dry-run state, not an error (see `agents/social/GO-LIVE.md`).
2. Do NOT commit or push in this section. The status updates to `web/data/social-posts.js` stay in the working tree and ride the next cycle's §5 commit (step 2 covers this). They are inert metadata; the dedupe ledger at `%LOCALAPPDATA%\RTFCLMGZN\social-ledger.json` — outside the repo on purpose — is what prevents double-posting, so a lost status update can never cause a repost.
3. Fold the `SOCIAL_DISPATCH_SUMMARY` into your §6 report, and carry any estimated X API spend into the next cycle's ledger row (the dispatcher pays per-use on X; everything else is free).
4. If the dispatcher reports failures, report them and move on — it retries each record up to 3 attempts across cycles on its own. Never hand-post via an API call yourself.

## 6. Report

Print a short summary: what you published (title, section, format, word count, source count), **confirm the §3a bar for each piece** (whether it has an `apply` block and why that type fits, any cross-links to companies/scoreboard/dictionary, any source conflicts you had to reconcile), **confirm the §3b bar for each piece** — name every component you used and the specific reader question each one answers, plus any you considered and rejected and why, plus any `entities.js` additions. "Added a chart" is not a report; "added a `ledger` because both deals were quoted at $14B and neither figure covers the same thing" is. What cover you used and why, **what you changed on Buzz, the Scoreboard, the company directory, and the RSS feed in step 4b** (cards retired/added, rows or scores touched, companies added, items added to the feed — or an explicit "nothing to add, dates refreshed"), the new cache-buster number, confirmation the deploy landed, **and what §5b dispatched** (per-platform posted/failed counts from `SOCIAL_DISPATCH_SUMMARY`, links to the live posts, estimated X spend — or an explicit "social: still dry-run, no credentials configured"). If you decided NOT to publish anything this cycle (no candidate cleared compliance, or nothing genuinely new), say so explicitly and explain why — an empty cycle is a legitimate, honest outcome, not a failure to hide.

Then stop. Do not start a second cycle, do not modify anything else, do not touch files outside what this runbook describes.
