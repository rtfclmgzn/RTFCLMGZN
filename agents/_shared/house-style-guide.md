# RTFCLMGZN — House Style Guide

Loaded into every writing and editing agent as cached context. This is the shared spine that keeps seven distinct persona voices reading as one professional publication.

## 1. Voice of the publication (above individual personas)

- **Additive, never derivative.** We never republish someone else's reporting. Every piece adds synthesis, context, or original analysis. If a draft could be replaced by a link to the source, it fails.
- **Confident but honest about uncertainty.** State what is known plainly; label what is unconfirmed, rumored, or unproven as exactly that.
- **Hype-resistant.** We describe what shipped and what the evidence shows, not what a launch blog claims. Superlatives from press releases are quoted and attributed, never adopted as our own voice.
- **Reader-respecting.** Assume an intelligent, AI-literate reader who resents padding. No filler intros, no "in today's fast-moving world of AI."

## 2. Structure

- **Lede first.** Every piece opens with what changed and why it matters — before any background or adjectives.
- **Inverted pyramid for briefs;** thesis-then-evidence for synthesis and research pieces.
- **One clear claim per paragraph.** Short paragraphs. No walls of text.
- **Headlines** are specific and literal, not clickbait. State the news, not a tease. No "You won't believe…", no manufactured questions.

## 3. Sourcing (enforced, not optional)

- Every factual claim traces to a source. Synthesis pieces **name and link** every source used.
- Numbers, benchmark scores, funding figures, and dates are cross-checked against **at least one primary source** (company blog, filing, official announcement, model card/paper) — never a single secondary write-up. This is enforced at the Verification stage.
- Direct quotation is minimal and always attributed. Default mode is paraphrase + original analysis. Never reproduce substantial verbatim passages from another outlet.
- Never mirror a source's structure or wording closely enough to constitute copying.

## 4. Formats and lengths — FOUR tiers (three length-derived, plus `guide`)

**Corrected 2026-07-31.** This section said "exactly three formats, founder-locked" and listed three. That
has not been true since `guide` shipped: it is in the `format` enum in `newsroom/schemas/article-draft.json`,
it has its own row in the `FLOOR` dict in `newsroom/quality/component_audit.py`, and `trueFormat()` in
`app.js` returns it. The three length tiers are still founder-locked (2026-07-12, N-026); `guide` was added
alongside them, not in place of one.

Three of the four **are** a length band — derived from the actual word count (`trueFormat` in app.js),
never merely declared. Don't pad to a number; if a story only carries a brief's worth of real content, it's
a brief, and that's honest. **`guide` is the exception and is declared, not derived**: a guide's substance
lives in `procedure` and `snippet` blocks, which `wordCount()` cannot see, so length would mislabel it.

| Format | Length (target / band) | Authors | Charts | Components (audited floor) | Use |
|---|---|---|---|---|---|
| **Brief** | ~300 words (250–450) | 1 | none — one sourced `stat` callout is the ceiling | **1** — usually `keyfacts` or `ledger` | Fast reaction to a news event, minutes-to-hours after. One fact, one why-it-matters, one link. |
| **Synthesis** | ~1,200 words (800–1,900) | 1 | optional | **2** (3–4 typical), ≥1 data-carrying | Reads across several sources into one clearer account — our signature daily format. Bull + bear, honest verdict. |
| **Research** | ~3,500 words (2,200 floor) | 2–3 | **2–3 required** | **4**, ≥2 of them charts, plus a `scorecard` | The flagship. Multi-section argument (geopolitics/history/counter-case), runs 1–2×/week. Exemplar: `rs-001`. |
| **Guide** | not length-derived — shape set by the cadence table in `cycle-runbook.md` §3d | 1 | optional | **2** (`flow` and `compare` carry most guides) **plus a mandatory `procedure` block** | Hands-on instruction. The test is whether the reader can DO something afterward, not whether they understood something. |
| Persona column | fits its tier above | 1 | per tier | per tier | Recurring opinion/analysis under a named persona byline — still lands in one of the length tiers. |

**Charts and components are not the same thing, and this table used to conflate them.** The old
"Charts: none" on Brief was read as "a brief carries no visual layer," which reads as a direct
contradiction of `cycle-runbook.md` §3b, which requires **at least one component on every brief** and has
since it shipped. Both rules are right and were never actually in conflict:

- **A brief gets no CHART.** A chart reads as *measured*; a 300-word reaction to a single announcement
  almost never has a real series behind it, and inventing a second data point to fill a bar is exactly the
  fabrication `visual-components.md` bans. One sourced `stat` callout is the honest ceiling.
- **A brief still gets one COMPONENT** — a `keyfacts` box or a `ledger`: structure over facts the piece
  already carries. That is the floor `component_audit.py` enforces, and prose does not satisfy it.

The Components column is the enforced floor from `cycle-runbook.md` §3b and the `FLOOR` dict in
`newsroom/quality/component_audit.py`. **§3b is canonical for the visual layer; this table is a summary of
it** — if they ever diverge again, §3b wins and this table is the one that is wrong. `qa_scan.py` #9 fails
any "research" piece under 2,200 words or without 2–3 charts. Weight the daily mix toward synthesis — our
signature "one deep read instead of five overlapping ones."

## 5. Mechanics

- US English. Oxford comma. Numerals for 10+ and all figures/percentages/money; spell out one–nine in prose.
- First reference to a company/model uses full name; subsequent references may shorten.
- Model/version names exactly as the vendor writes them (e.g. "Claude Opus 4.8", "GPT Image 1.5").
- Dates as "July 9, 2026" in body; ISO (2026-07-09) in metadata.
- Currency with symbol and scale ("$2.5 billion", "$84/mo").
- Active voice by default. Cut hedging stacks ("it seems that it may possibly").

## 6. Mandatory boilerplate on every published piece

1. **AI-authorship disclosure** — a clear, standard line that the piece was researched and drafted by RTFCLMGZN's AI editorial system with human editorial oversight.
2. **Byline** — the assigned persona.
3. **Correction & update log** — a visible, timestamped log appended to every article; corrections are additive, never silent edits.
4. **Topic-specific disclaimers** where required — see `compliance-rulebook.md` (not medical advice / not financial advice).
5. **"Put it to work" block** on every synthesis, research, and persona column — 2–4 concrete, specific actions the reader can take this week. See `reader-doctrine.md`. Breaking briefs are exempt.

## 7. The Reader Doctrine (governs content)

Every piece answers three questions — **What changed? · What does it mean? · What can I do with it?** — and ends (except briefs) with a Put-it-to-work block of real, hands-on scenarios. We write for the AI-obsessed builder who reads the news for the opening. Full doctrine, boundaries (positivity ≠ hype; actionability ≠ advice), and enforcement live in [`reader-doctrine.md`](reader-doctrine.md). It is loaded alongside this guide into every writing and editing agent.

## 8. What gets a piece rejected back down the pipeline

- An unsourced factual claim, or a number from a single secondary source.
- Adopting a vendor's hype language as our own voice.
- Close paraphrase of a single competitor article without added value.
- Missing or incorrect disclosure/disclaimer boilerplate.
- Persona voice drift (caught by the Managing Editor quality pass).

## Article graphics & rhythm (added 2026-07-12 — "not enough graphics" fix)

Text-heavy articles are a defect. Break them up — tastefully, never gratuitously:

- **Rich text in the body:** use `**bold**`, `==highlight==`, `++accent++` on the load-bearing phrases. The renderer ALSO auto-emphasizes figures (money-with-scale, %, ×multipliers) — so you don't need to mark those, but do mark the key *ideas*. Every synthesis should carry a few.
- **Charts when data warrants** (zero cost, no image — rendered client-side): add a body block
  `{type:"chart", chart:{kind:"bar"|"donut", title, unit, source, data:[{label,value,hi?,color?}]}}`
  ONLY with numbers that appear in the piece and are sourced. A comparison of ≥3 figures → bar; a share/split → donut. One chart per article is usually plenty; two max. NEVER invent numbers to make a chart.
- **Stat callout** for a single dramatic figure: `{type:"stat", value:"$650B", label:"what it is (may use ==markup==)"}`.
- **The cover image stays generated** (Nano Banana, ~$0.034 — copyright-clean and on-brand). Do NOT scrape/hotlink news photos: it's a copyright and trust risk. If a real photo is truly needed, use only CC-licensed sources (Wikimedia Commons) with attribution. Prefer charts + generated art.
- **Pull-quote** (`{type:"quote"}`) at least once in longer pieces — it breaks the grey wall and gives the eye a rest.

## Natural timestamps
`publishedAt` must reflect the ACTUAL generation moment with real minutes/seconds — never a flat :00. The article footer prints "Filed <date · time>", so times like 8:34 PM read like a real newsroom. Don't round.
