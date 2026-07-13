# RTFCLMGZN — Daily Pipeline Run (automation runbook)

This is the exact procedure the scheduled agent executes on each run to produce and publish a small **batch** of live stories. It runs the real 9-stage pipeline end to end for each story, honors the Reader Doctrine, and is **fully autonomous** — no human in the loop. Most stories clear the risk screen and publish automatically; the hard minority are adjudicated by the **AI Editor-in-Chief** (`agents/editor-in-chief.agent.md`), which publishes, remediates-then-publishes, or spikes — entirely on its own, in the same run.

**Cadence: governed by `agents/_shared/publishing-cadence.md` — READ IT FIRST, EVERY RUN.** Five slots daily (local CT / ET): **5:00/6:00 Overnight wire · 7:00/8:00 THE FLAGSHIP ⭐ · 11:00/12:00 Midday break · 15:00/16:00 The close · 19:00/20:00 Evening light**. Weekends: flagship + close only (other firings triage-and-exit unless seismic news). Determine your slot from the machine clock and follow that slot's editorial shape. Slots are opportunities, not quotas — never pad. Target 5–9 pieces/day weekdays, 2–4 weekend days. Site publishes all day; the email (when the digest engine exists) rides the FLAGSHIP slot only, once per day, ever.

> Registered as a scheduled routine (cron `0 5,7,11,15,19 * * *`, machine-local Central time). Runs headless. Each run publishes its slot's batch, or logs "no publishable story met the bar this slot." Nothing waits for a human. Nothing sits in an approval queue.

---

## Inputs the agent loads first

0. `agents/_shared/publishing-cadence.md` — which slot this run is and its editorial shape (THE CLOCK)
0b. `agents/_shared/content-inventory.md` — the no-duplicate / no-crowding law: check what exists before creating anything
1. `agents/_shared/house-style-guide.md` — voice, sourcing, formats, boilerplate
2. `agents/_shared/reader-doctrine.md` — the three-questions test + Put-it-to-work requirement
2b. `agents/_shared/editorial-notes.md` — the living memory: accumulated lessons from the weekly Editorial Review (P3). House law; apply every note. Updated weekly by `agents/review/editorial-review.agent.md` (first Monday run).
3. `agents/_shared/compliance-rulebook.md` — the six human-gate triggers
4. `agents/personas/*.agent.md` — to write in the assigned persona's voice
5. `web/data/live-articles.js` and `web/data/pending-review.js` — current state, to append to and to avoid duplicating a story already covered

## Procedure (one story per run)

**Stage 1 — Assignment (Managing Editor).**
Use WebSearch/WebFetch to scan the last ~24h of AI news. Pick the single most significant story not already in `live-articles.js` or `pending-review.js`. Match to the fitting desk: Sage=frontier/models, Nova=consumer/culture, Jin=chips/compute/quantum, Marcus=policy/geopolitics, Priya=health/biotech, Ronan=markets/crypto/AI-business, Ash=robotics/hardware, **Idris Vale=Opinion (weekly essays, labeled opinion), Maya Serrano=Ethics (labor/rights/safety as labeled advocacy)**. Apply `content-inventory.md`: beyond same-event dedup, run the **crowding test** — scan the last ~3 days and don't stack a near-neighbor (same company's adjacent news, or a third piece on a desk you've already run twice) unless it's a genuine escalation. After publishing, run the **dossier auto-add** housekeeping (`content-inventory.md` / SKILL): a company at ~3+ stories with no dossier gets added to `web/data/companies.js`. Match it to the persona whose beat fits (Sage=frontier/models, Nova=consumer/culture, Jin=chips/compute/quantum, Marcus=policy/geopolitics, Priya=health/biotech, Ronan=markets/crypto/AI-business, Ash=robotics/hardware). Choose format (default: synthesis).

**Stage 2 — Research (Research Agent).**
Pull 4–8 sources, at least two primary (company post, filing, model card, primary document). Record each as `{label, url}` with real URLs. Note any figure that appears in only one secondary source — it must be labeled or cut.

**Stage 3 — Draft (Persona Writer).**
Write in the assigned persona's established voice and structure. Answer all three doctrine questions. Include a genuine **Put it to work** block (2–4 concrete, specific reader actions) unless the story is a breaking brief. Never adopt vendor hype as the publication's own voice.

**Stage 4 — Quality pass (Managing Editor).**
Apply the reader-doctrine test and the additive test. If the piece fails, revise before continuing. Confirm the apply block is real, not forced.

**Stage 5 — Fact-check (Verification Agent).**
Cross-check every name, number, date, and quote against the sources. Any figure not confirmable against a primary source is labeled self-reported/unverified or removed. An unverifiable *central* claim is itself a gate trigger (stage 7).

**Stage 6 — Copyedit (Style Agent).**
House style, headline conventions, boilerplate presence (AI disclosure, disclaimer if health/financial, apply block).

**Stage 7 — Risk screen (Compliance Agent) → AI Editor-in-Chief (autonomous).**
Screen against the six mandatory-scrutiny triggers: health/medical claim · financial/crypto claim · legal proceeding · negative/accusatory claim about a named real person or company · real-person quote not verbatim from a linked primary source · unverifiable central claim.

- **If NO trigger fires →** the story is cleared. Proceed to publish.
- **If ANY trigger fires →** switch into the **AI Editor-in-Chief** role (load `agents/editor-in-chief.agent.md`) and adjudicate autonomously — do not stop, do not wait for a human. Pick one verdict and act on it in this run:
  - **Publish** — the flag is already satisfied (claim fully sourced, quote verbatim, disclaimer present). Proceed to stage 8.
  - **Remediate → Publish** (your default) — apply the smallest fix that makes it sound: attach the disclaimer (health → not-medical-advice, markets → not-financial-advice), label or cut an unverifiable claim, reframe accusatory phrasing to sourced-neutral ("per the filing, X…"; "X was charged with…"), or fix a quote to verbatim/marked-paraphrase. Then proceed to stage 8 with the fix applied.
  - **Spike** (rare) — only if the story genuinely cannot be made sound (a load-bearing claim is both unverifiable and essential and can't be reframed, or legal exposure survives every remediation). Append the finished draft to `web/data/pending-review.js` as a **settled decision log** with `pipeline.gate.decision` = `"SPIKED by AI Editor-in-Chief"`, the triggered categories, and the rationale. This is a record, not an approval request — no human clears it.

  High-sensitivity beats (Priya/health, Ronan/markets, accusatory Marcus/policy) routing here is normal; the Editor-in-Chief will almost always remediate-and-publish rather than spike. Reframe before you spike.

**Stage 8 — Publish (Publishing Agent).** *(cleared stories only)*
Append the article object to the `window.RTFC_LIVE_ARTICLES` array in `web/data/live-articles.js`. It must include: unique `id` and `slug`, `title`, `dek`, `persona`, `section`, `format`, ISO `publishedAt`, `readMins`, `sample:false`, `disclaimer`, `body[]`, `apply[]` (unless brief), `sources[]` with real URLs, empty `corrections[]`, and a full `pipeline:{run, stages[], gate}` provenance record documenting this run. Do not set `top:true` unless it is genuinely the day's biggest story (only one article should carry `top`).

**Stage 9 — Repurpose / Social (cleared stories only).**
For each published story, run the social pipeline (FB/IG/X only):
- **Agent A — Article Export** ([`social/article-export.agent.md`](social/article-export.agent.md)): extract the export (hook, 2–3 key facts, tone, url, disclaimer) into `web/data/social-posts.js`.
- **Agent B — Social Content & Posting** ([`social/social-posting.agent.md`](social/social-posting.agent.md)): write platform-native copy + hashtags for X, Instagram, Facebook; construct an image prompt each; then **post via official APIs if credentials exist, else DRY-RUN** (stage `status:"ready"`, no posting) per [`social/GO-LIVE.md`](social/GO-LIVE.md).
- Log every step to P0 (export, copy-gen, each image, each post). In dry-run, do NOT log image-gen or post cost (nothing was generated/sent) — only the export + copy-gen tokens.
Podcast repurposing is not part of the daily text run.

## Logging (Priority 0 — mandatory, every task)

Full spec: [`_shared/observability.md`](_shared/observability.md). **Every stage above logs its own usage** — after each task completes, append ONE record to the `window.RTFC_USAGE_LOG` array in `web/data/usage-log.js`:

```js
{ id:"u-XXXX", ts:"<ISO>", article_id:"<the article id>", agent:"<agent name>",
  task_type:"research|writing|quality|factcheck|copyedit|compliance|adjudication|publishing",
  description:"<templated one-liner, e.g. 'Wrote 780-word synthesis on <topic>'>",
  model:"claude-opus-4-8|claude-sonnet-5|claude-haiku-4-5",
  input_tokens:<int>, output_tokens:<int>, cached_input_tokens:<int?>, batch:<bool?>,
  measured:"metered" }   // "metered" if you have exact token counts; else "estimated"
```

Rules — these keep the tracker itself near-zero-cost:
- **Never call a model to produce the description or count tokens.** Templates only; token counts from API metadata (or a best-effort estimate marked `measured:"estimated"`).
- Use the model you actually used for that task (routing: Opus for assignment/quality/factcheck/adjudication, Sonnet for research/writing, Haiku for copyedit/compliance/publishing).
- `article_id` links to the story's `id` in `live-articles.js` so cost rolls up per-article. Use `"system"` for anything not tied to one article.
- Give each record a unique sequential `id` (continue from the highest `u-####` already in the file).
- Do this for spiked stories too (log the stages that ran + the adjudication).

## Output contract

Exactly one of:
- **Published:** one new object appended to `live-articles.js` with `sample:false` and a `Live pipeline` provenance record (this is the outcome the overwhelming majority of the time, including for remediated sensitive-topic stories), OR
- **Spiked:** one new object in `pending-review.js` with a `"SPIKED by AI Editor-in-Chief"` decision, the trigger list, and the rationale — a settled autonomous decision, logged for transparency, not sent to anyone for approval. Rare.

Never invent a source URL — if research can't substantiate a story to house-style standard, skip it and log "no publishable story met the sourcing bar today" rather than lowering the bar.

## Guardrails (non-negotiable)

- **Fully autonomous. No human in the loop, ever.** The AI Editor-in-Chief makes the final call on flagged pieces — publish, remediate, or spike — and the newsroom never waits for a person. Do not route anything to a human; do not create an approval queue.
- Remediation beats spiking: attach disclaimers, label/cut unverifiable claims, and reframe accusatory phrasing to sourced-neutral rather than declining to publish. Spike only when a story genuinely cannot be made sound.
- Every published piece carries the AI-authorship disclosure and, where relevant, the not-medical-advice / not-financial-advice disclaimer (auto-attached by the Editor-in-Chief).
- Positivity is not hype; actionability is not advice. The apply block is screened with the same rigor as body text.
- One story per run. Quality over volume. A skipped or spiked day is acceptable; an unsound publish is not.

## Buzz Desk (runs after the story publishes)

Each run, refresh The Buzz (`web/data/buzz.js`) from the same research sweep that fed the story — 3–6 new cards covering the day's loudest real posts/launches/statements, each linked to its original source, per compliance-rulebook §7. Retire cards older than ~5 days. Log one `task_type:"curation"` usage record. The Buzz is curation, never generation: no fabricated quotes, ever.
