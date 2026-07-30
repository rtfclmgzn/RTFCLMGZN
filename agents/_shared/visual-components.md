# RTFCLMGZN — The Visual Component System

Mandatory context for the Managing Editor, Research Agent, Persona Writers, Verification Agent, Style Agent, Publishing Agent, the Claude cycle runner, and the breaking-scan runner.

This file is the menu. `format-routing.md` decides how long a piece is; this decides what it is made of.

---

## 0. Why this exists, stated plainly

This publication discloses that it is written by AI. That disclosure only survives contact with a skeptical reader if the article is *better* than what a human newsroom filed on the same story — not merely faster or cheaper. A reader who sees "written by AI" on a piece that is three paragraphs of restated press release has learned exactly one thing, and it is not flattering.

The gap where AI actually wins is not prose quality. It is **structure at scale**: building the comparison table a human reporter didn't have time for, holding twelve numbers straight and stating what each one excludes, showing the reader which claims are nailed down and which are the company's own word, and remembering on every single story that the reader may not know Kimi K3 is Moonshot's.

That work is mechanical, tedious, and unbounded. It is the thing to lean into.

**The bar for every piece: what does this article do for the reader that a competent wire rewrite of the same sources cannot?** If the honest answer is "nothing," the piece isn't ready, regardless of word count.

---

## 1. The cost model — read this before worrying about budget

Three tiers, and only one of them costs tokens.

### Tier 0 — free, automatic, already running
Rendered from data already on the page. **Zero tokens. Nothing to write. Cannot be gotten wrong by a writer.**

| What | Where it comes from |
|---|---|
| **Entity chips** — first mention of any registered model or lab gets maker → parent → open/closed → live index score | `web/data/entities.js` + `RTFC_SCOREBOARD`, annotated at render time |
| **Evidence strip** — source count, distinct outlets, % of paragraphs carrying a citation, count of data elements | Counted off the article's own `sources` and `body` |
| **Figure emphasis** — money, percentages, multipliers set in tabular figures | Regex in `fmtBody()` |

The one maintenance duty: **when a cycle covers a model launch, add the model to `entities.js` in the same cycle it goes on the Scoreboard.** A model on the board with no entity entry renders as plain text and the reader loses the provenance. That is a two-line edit, and it retroactively improves every past and future article that mentions the model.

Do not spend tokens re-doing Tier 0 in prose. You no longer need to write "Moonshot AI's Kimi K3" on every mention — the chip carries it. Write the sentence that says something.

### Tier 1 — cheap, structured, this is where the work goes
The components in §3. Each is a small flat JSON block: **roughly 60–250 output tokens.** A whole synthesis carrying three components spends under 700 tokens on structure — a few percent of the piece, for most of its added value.

This is deliberate. The shapes are shallow, the field names say what they mean, and there are no nested arrays-of-arrays, because **a cheap model has to be able to emit these reliably.** Component blocks are the highest value-per-token move available:

| Model profile (`batch.model_profiles`) | Emit these reliably |
|---|---|
| `structured-fast` (briefs — Luna / Haiku class) | `keyfacts`, `ledger`, `stat`, `chart` (bar, waffle), `timeline`, `beforeafter` |
| `balanced` (synthesis — Terra / Sonnet class) | all of the above plus `compare`, `stakes`, `flow`, `chart` (line, stacked, range), `sourcecheck` |
| `reasoning-high` (research) | all of the above plus `scorecard`, `spectrum`, multi-subject `compare` |

Routing rule: **do not escalate a model to get a component.** Pick a component the assigned tier can do well. A clean `keyfacts` box from a cheap model beats a botched `scorecard` from an expensive one.

### Tier 2 — paid, capped, unchanged
Cover-image generation only. See `publishing.agent.md`. Nothing in this document changes the image budget, and no component here is ever a substitute for a cover or vice versa.

---

## 2. Requirements by format

These are floors. A brief that genuinely warrants two components should carry two.

| Format | Components required | Notes |
|---|---|---|
| **Brief** | **1 minimum** | Almost always `keyfacts` or `ledger`. A brief is where Tier 0 does most of the work; one component makes it scannable. Skip only if the story has no numbers, no comparison, and no sequence — say so in the cycle report. |
| **Synthesis** | **2 minimum, 3–4 typical** | At least one must carry *data* (`chart`, `compare`, `ledger`, `range`). If the reporting turned up conflicting figures, one of them must be `sourcecheck`. |
| **Research** | **4 minimum**, at least 2 of them charts | Per `format-routing.md`, research already owes 2–3 sourced charts. Add `scorecard` — a 3,500-word investigation that never states which of its claims are contested is not an investigation. |
| **Guide** | **2 minimum** | `flow` and `compare` carry most guides. `steps` (the existing guide field) is not a component and does not count toward this. |
| **Buzz card** | none | Buzz is curation. Components would overstate what a two-line card knows. |

**Variety rule.** Do not file three consecutive articles whose only component is a bar chart. The system has thirteen block types and five chart kinds specifically so a regular reader meets a different shape each time. Before filing, check the last few published pieces (`grep -o '"type": "[a-z]*"' web/data/newsroom-articles.js | sort | uniq -c`) and reach for something you haven't used lately *if the evidence fits it*. Evidence fit always outranks variety — a forced timeline is worse than a second bar chart.

**Placement.** Components go where the reader needs them, which is immediately after the paragraph that raises the question they answer. Never stack two components back to back with no prose between; that reads as a dashboard, not an article. Never lead with one — the first block is always a `p`.

---

## 3. The component menu

Every block goes in `article.body`, in reading order, alongside the `p` / `h2` / `quote` blocks.

### The one invariant that matters

**A component block must never carry a top-level `text` field.**

`wordCount()` sums `.text` across body blocks to derive the visible format tier, and the read-along feature speaks every block that has `.text`. A component that put its content in `.text` would silently inflate a brief into a synthesis and make the audio version read table cells aloud. Content lives in the nested object only. This is enforced by the schema — but know why.

Every component also takes three optional shared fields: `kicker` (the small uppercase label, has a sensible default per type), `title`, `sub`, and `source` (a string, shown as the attribution line).

---

### `keyfacts` — the five-second box
For the facts a reader needs before deciding to read the piece.
```json
{"type":"keyfacts","keyfacts":{"title":"The deal, in short","items":[
  {"label":"Buyer","value":"Meta","note":"third such deal this quarter"},
  {"label":"Size","value":"$14 billion"},
  {"label":"Term","value":"Not disclosed"}
]}}
```
Use for: any brief. Any story with 3–6 discrete parameters.
Never: as a dumping ground for facts already in the first paragraph verbatim.

### `ledger` — the numbers, scoped
The single most useful component in AI-industry coverage, because almost every dispute about a number is really a dispute about what it includes.
```json
{"type":"ledger","ledger":{"title":"What each $14 billion covers","items":[
  {"value":"$14B","unit":"AMD / Oracle","label":"Multi-year compute capacity purchase",
   "includes":"GPU capacity committed over the contract term",
   "excludes":"Any building, land, or power infrastructure",
   "note":"Announced as a purchase commitment, not cash paid."}
]}}
```
Use for: any story where two figures look comparable but aren't. Any headline number a company disclosed without a schedule.
Never: with an `excludes` you're guessing at. Omit the field instead.

### `compare` — the side-by-side
Rows where the values actually differ are highlighted automatically, so build the table and let the renderer point at the divergence.
```json
{"type":"compare","compare":{"title":"Two $14 billion deals","columns":[
    {"label":"AMD / Oracle","sub":"compute purchase"},
    {"label":"Meta / Blue Owl","sub":"data-center financing","hi":true}],
  "rows":[
    {"label":"What the money buys","values":["GPU capacity","A physical campus"]},
    {"label":"On whose balance sheet","values":["Oracle's","A joint venture's"],
     "note":"the distinction that changes the accounting"}
  ],"source":"Both companies' announcements"}}
```
Use for: 2–4 subjects across 3+ attributes. Pricing tiers, rival models, competing bills, two deals that share a number.
Never: for a single subject (that's `keyfacts`). Never with a `values` array shorter than `columns` — write "Not disclosed", which is itself informative.

### `chart` — five kinds, pick by the shape of the data
```json
{"type":"chart","chart":{"kind":"bar","title":"...","unit":"$B","source":"...",
  "data":[{"label":"Meta","value":14,"hi":true,"note":"optional sub-label"}]}}
```
| `kind` | Data shape | Use when |
|---|---|---|
| `bar` | `[{label,value,hi?,note?}]` | comparing magnitudes across categories — the default |
| `pie` / `donut` | `[{label,value}]` | parts of one whole, 2–5 slices only |
| `line` | ordered `[{label,value,hi?}]` | something genuinely moves over time; needs ≥4 points |
| `stacked` | `[{label,parts:[{label,value}]}]` | composition compared across subjects |
| `range` | `[{label,low,high,point?,hi?}]` | estimates that span a range — honest where a bar implies false precision |
| `waffle` | `[{label,value}]` + `total` | small integer counts a reader can literally count ("3 of 11 signatories") |

**Absolute rule: never invent, estimate, interpolate, or round-for-looks a data point.** Three real bars beat six with two guessed. If a series has a hole, use `range`, or use `bar` with only the points you have and say in `source` what's missing. A fabricated data point is a fabricated fact with a nicer font.

### `timeline` — how it got here
```json
{"type":"timeline","timeline":{"items":[
  {"when":"Mar 2026","what":"Rule proposed","source":"https://..."},
  {"when":"Jul 29","what":"Order adopted","hi":true},
  {"when":"Sep 1","what":"Compliance deadline","future":true,"detail":"What's still owed"}
]}}
```
`hi` marks the news peg. `future` renders as pending — this is how a reader sees what has actually happened versus what is merely scheduled.
Use for: regulatory sequences, funding-round progressions, an incident's chronology.
Never: with fewer than 3 items. Never with vague `when` values ("recently", "earlier") — if you don't have the date, you don't have the timeline.

### `sourcecheck` — where the sources disagree
Required whenever reporting turned up conflicting figures. This makes visible the work a wire rewrite cannot fake.
```json
{"type":"sourcecheck","sourcecheck":{"items":[{
  "question":"How large was the round?",
  "claims":[
    {"who":"Company filing","kind":"primary","says":"$35B","url":"https://...","trusted":true},
    {"who":"Bloomberg","kind":"reporting","says":"about $33B","url":"https://..."}],
  "ruling":"Using the filing. It is the company's own figure on the record; the lower number is attributed to unnamed people familiar."
}]}}
```
Mark exactly one claim `trusted` per question and say why in `ruling`. "Primary beats secondary, on the record beats anonymous, more recent beats stale."
Never: manufacture a disagreement to use the component. No conflict found, no block.

### `scorecard` — what is actually established
The component that most directly earns the transparency claim.
```json
{"type":"scorecard","scorecard":{"items":[{
  "claim":"The facility will reach 50 MW",
  "level":"company",
  "basis":"Stated by the CEO alongside quarterly results; no filing or permit corroborates it.",
  "resolver":"A grid interconnection agreement or construction permit naming the site."
}]}}
```
`level`: `confirmed` · `strong` · `partial` · `contested` · `unverified` · `company` (a company's own unverified word — extremely common in this beat and worth naming every time).
`resolver` is the highest-value field in the whole system: the specific document that would settle it. Fill it in.
Required on research. Strongly encouraged on any synthesis whose central claim rests on a company's own account.

### `stakes` — who this lands on
Forces specificity about incidence instead of gesturing at "the industry."
```json
{"type":"stakes","stakes":{"items":[
  {"who":"US robotics buyers","tone":"loses","what":"Lose access to the cheapest hardware tier."},
  {"who":"Domestic manufacturers","tone":"gains","what":"Gain a protected price umbrella."}
]}}
```
`tone`: `gains` · `loses` · `exposed` · `unclear`. Use `unclear` honestly — a component claiming to know every consequence is the AI-slop tell.
Never: with a `who` as broad as "consumers" or "the market". Name the actual party.

### `flow` — how the thing works
```json
{"type":"flow","flow":{"steps":[
  {"actor":"Importer","what":"Files an equipment authorization"},
  {"actor":"FCC","what":"Checks the model against the Covered List","hi":true},
  {"actor":"Importer","what":"Cannot lawfully sell the unit","blocked":true}
]}}
```
`blocked` renders as a stop. Use for mechanisms, chains of custody, money paths, permission flows. The backbone of most guides.

### `beforeafter` — what specifically changed
```json
{"type":"beforeafter","beforeafter":{"beforeLabel":"Before the order","afterLabel":"After",
  "rows":[{"label":"New authorizations","before":"Granted","after":"Barred"}]}}
```
Use for: rule changes, pricing changes, spec bumps, policy reversals. Nothing beats it for a story whose entire substance is a delta.

### `spectrum` — where this sits
```json
{"type":"spectrum","spectrum":{"leftLabel":"Fully open","rightLabel":"Fully closed",
  "markers":[{"label":"Llama","at":25},{"label":"GPT-5.6","at":92,"hi":true}]}}
```
`at` is 0–100 and **must come from a real ordering** — a published price, a license tier, a measured score. If the position is a judgment call, either don't use this component or say in `source` what the ordering is based on. This is the easiest component to abuse and the one to be most suspicious of yourself using.

### `entity` — the explicit ownership card
The Tier 0 chips handle passing mentions. Use this block only when corporate structure *is* the story.
```json
{"type":"entity","entity":{"items":[{
  "name":"CXMT","kind":"DRAM manufacturer","hq":"Hefei, China",
  "companyKey":"cxmt","structure":"Shanghai-listed",
  "extra":[{"label":"Listed valuation","value":"$489B"}],
  "note":"Whose prospectus does not fund the product driving the story."}]}}
```
`companyKey` must be a real key in `companies.js` or the dossier link 404s.

### `stat` — the single figure
Pre-existing, still valid. One number that carries the story, when a full `ledger` would be overkill.

---

## 4. Anti-slop rules

These are the failure modes that would make the visual layer *worse* than plain prose. A component that trips one of these should be deleted, not fixed.

1. **Never invent a data point.** Not to complete a series, not to balance a table, not to make a chart look fuller. The most damaging possible outcome for this publication is a fabricated number in a chart, because a chart reads as *measured*.
2. **Never build a component out of nothing.** Every value must trace to a source already in the article's `sources` array. If it needs a source you don't have, drop the component.
3. **No component may be the only place a fact appears.** A reader with images off, a screen reader, or an RSS client gets the prose. Components make the prose faster to use; they never replace it.
4. **Never decorate.** If a component adds no information the prose lacks, it is decoration and it makes the article worse, not longer. Ask: *what specific question does this answer that the paragraph above didn't?* No answer, no component.
5. **Do not restate the TL;DR as a `keyfacts`.** Two identical lists in different fonts is padding.
6. **No fake precision.** "About $370 million" stays approximate in the component. Never render an estimate as an exact figure because the field looks tidier.
7. **Do not force variety.** Reaching for `spectrum` because it hasn't been used lately, on a story with no spectrum in it, is the exact failure this whole document is meant to prevent.
8. **Empty is honest.** A story with one source and no numbers gets one `keyfacts` box and no more. Note it in the cycle report and move on.

---

## 5. Verification checklist

The Verification Agent (and the Claude cycle, which is its own verifier) checks every component before publish:

- [ ] Every number in a component appears in, or is directly computed from, a cited source. Computed values state the arithmetic in `source`.
- [ ] No component carries a top-level `text` field.
- [ ] `compare`: every row's `values` length equals `columns` length.
- [ ] `timeline`: every `when` is a real date or period, and ≥3 items.
- [ ] `sourcecheck`: exactly one `trusted` claim per question, and a `ruling` that names why.
- [ ] `scorecard`: every item has a `resolver`, and `level:"company"` is used wherever the basis really is just the company's word.
- [ ] `spectrum`: `at` values trace to a stated ordering.
- [ ] `entity` / `stakes`: every `companyKey` resolves in `companies.js`.
- [ ] Word count and format tier are unchanged by the components (they will be, if the invariant held).
- [ ] Any model named in the piece and missing from `entities.js` has been added.

## 6. What to report

The cycle report states, per article: which components were used and the specific reader question each answers, which were considered and rejected and why, and any `entities.js` additions. "Added a chart" is not a report. "Added a `ledger` because both deals were quoted at $14B and neither figure covers the same thing" is.
