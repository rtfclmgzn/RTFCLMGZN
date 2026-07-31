> # ⛔ RETIRED — HISTORICAL DOCUMENT. DO NOT FOLLOW THIS.
>
> **Retired 2026-07-31. Moved here from `agents/DAILY-RUN.md`.**
>
> **The live runbook is [`newsroom/runner/cycle-runbook.md`](../../newsroom/runner/cycle-runbook.md).**
> Its two companions are [`newsroom/runner/breaking-scan-runbook.md`](../../newsroom/runner/breaking-scan-runbook.md)
> (every 2h, out-of-cycle majors only) and [`newsroom/runner/pulse-scan-runbook.md`](../../newsroom/runner/pulse-scan-runbook.md)
> (every 3h, live-surface upkeep). Those three are the newsroom. This file is not.
>
> **Why it was retired:** it describes a newsroom that no longer exists, in enough
> detail to be convincing, which is worse than describing none at all. Specifically:
>
> | This file says | What actually runs |
> |---|---|
> | **5 publishing slots/day** (5:00, 7:00, 11:00, 15:00, 19:00) | **3 cycles/day** (05:00 / 11:00 / 17:00 Central), plus a 2-hourly breaking scan and a 3-hourly pulse scan |
> | A **10-stage** pipeline with per-stage agent handoffs | One cycle runbook executed end-to-end by a single runner, which is its own compliance check (`cycle-runbook.md` §1) |
> | Every article must carry a **`formatDecision`** field | **This field does not exist.** It appears on zero published articles. `format-routing.md`'s `format_decision` routing record is the live equivalent, and it is an internal pre-draft record, not an article field. |
> | The Scoreboard is maintained by a "Benchmark Data Desk" stage | `cycle-runbook.md` §4b and `pulse-scan-runbook.md` §3 |
> | Cover uniqueness lives here (Stage 7.5) | `agents/_shared/format-and-image-policy.md` §3–§4 and `cycle-runbook.md` §4 |
>
> It also predates the **visual component system** entirely (`agents/_shared/visual-components.md`,
> `cycle-runbook.md` §3b, and the mechanical floor in `newsroom/quality/component_audit.py`), so
> anything drafted against this file will ship under its component floor and fail the audit.
>
> **On the article provenance that cites this file:** some published `pipeline` blocks name
> `DAILY-RUN.md` as the procedure they ran under. **Those records stay exactly as they are.**
> They are an accurate, dated statement of what the pipeline was at the time, and this
> publication's integrity rule is append-only — provenance is never retroactively edited to
> match a later reorganization. A citation here is a historical fact about that article, not
> an instruction to any future run.
>
> Kept rather than deleted for exactly that reason: those provenance blocks have to keep
> resolving to something.

# RTFCLMGZN — Daily Pipeline Run (automation runbook)

This is the scheduled newsroom procedure. It runs autonomously, publishes only sound work, and records every content, image, benchmark, maintenance, and deployment action in the public usage ledger.

**Cadence:** read `agents/_shared/publishing-cadence.md` first. Scheduled slots are 5:00, 7:00, 11:00, 15:00, and 19:00 machine-local Central time. Slots are opportunities, not quotas. Never pad.

## Inputs loaded on every run

1. `agents/_shared/publishing-cadence.md`
2. `agents/_shared/content-inventory.md`
3. `agents/_shared/house-style-guide.md`
4. `agents/_shared/format-and-image-policy.md`
5. `agents/_shared/reader-doctrine.md`
6. `agents/_shared/editorial-notes.md`
7. `agents/_shared/compliance-rulebook.md`
8. `agents/personas/*.agent.md`
9. `web/data/live-articles.js`, `web/data/newsroom-articles.js`, `web/data/research.js`, and `web/data/pending-review.js`
10. `web/data/image-usage.js`
11. `web/data/scoreboard.js`
12. `web/data/usage-log.js` and `web/data/usage-log-current.js`

## Stage 0 — Freshness and system housekeeping

Before choosing a story:

- Check the current article inventory and crowding rules.
- Run the cover-image cooldown audit. Existing violations are maintenance work and must be corrected before adding more reused art.
- Check `RTFC_SCOREBOARD.scannedAt`. If older than 12 hours, or if a major model/benchmark release occurred, run the Benchmark Data Desk procedure below.
- Check that every repository/site change since the last run has a matching usage/change-ledger record. Backfill missing records honestly as estimated when exact usage metadata is unavailable.

## Stage 1 — Assignment (Managing Editor)

Scan the last ~24 hours of AI news. Pick the most significant genuinely new story not already covered or pending. Match it to the correct persona/desk and run the no-duplicate/no-crowding test.

Choose the **planned format from evidence depth**, not preference:

- **Brief:** normally 1–2 credible sources and one narrow event/fact pattern.
- **Synthesis:** normally 3–6 credible, meaningfully independent sources; the daily default.
- **Research:** normally **8+** independent evidence threads (was stated here as 7+; corrected 2026-07-31 to match the canonical floor in `agents/_shared/format-routing.md`, which is the single authority — see the retirement notice at the top of this file), at least 3 primary/high-value sources, a multi-angle question, and enough substance for 2,200+ words plus 2–3 sourced charts.

Source quality and independence override raw count. Any override must be explained. Create:

```js
formatDecision:{planned,source_count,primary_source_count,override,rationale}
```

## Stage 2 — Research (Research Agent)

Collect the evidence required by the planned tier. Mark each source `primary:true|false`. Use real URLs. Never count duplicated rewrites as independent evidence. Label or remove any figure that cannot be corroborated.

## Stage 3 — Draft (Persona Writer)

Write to the planned tier without padding:

- Brief: 250–450 words.
- Synthesis: 800–1,900 words, thesis/evidence/counter-case/verdict, and a real Put-it-to-work block.
- Research: 2,200+ words, 2–3 sourced charts, multiple sections, and multiple authors when warranted.

Answer: What changed? What does it mean? What can the reader do with it?

## Stage 4 — Quality pass (Managing Editor)

Apply the Reader Doctrine, additive test, persona test, and format reconciliation. The visible site format is derived from finished word count. A planned synthesis that remains a brief is revised or deliberately refiled with a recorded rationale.

## Stage 5 — Fact-check (Verification Agent)

Cross-check every name, number, date, quotation, price, and benchmark against attached sources. Prefer primary documents. Vendor self-reported results never silently become independent scores.

## Stage 6 — Copyedit (Style Agent)

Apply house style, headline rules, disclosures, disclaimers, rich-text rhythm, links, and correction-log requirements.

## Stage 7 — Risk screen and autonomous Editor-in-Chief

Screen health, financial, legal, accusatory, quotation, and unverifiable-central-claim triggers. Publish, remediate then publish, or spike only when the central claim cannot be made sound.

## Stage 7.5 — Cover selection and uniqueness gate

1. Build the blocked set from every article cover used in the previous 90 days.
2. Add all images selected in the current batch.
3. Search the managed SOL/Gemini library only among eligible images.
4. Score for topical relevance, quality, orientation, crop safety, and semantic duplication.
5. If no eligible strong match exists, generate a new copyright-clean Gemini/Nano Banana cover.
6. Never evade the rule by copying, renaming, recompressing, or lightly cropping the same artwork.
7. Validate again. Any reuse by a different article inside 90 days blocks publication.
8. The same article may retain its cover during a correction/update.

## Stage 8 — Publish (Publishing Agent)

Append the cleared article to the canonical content data. Required fields include unique ID/slug, image, title, dek, persona, section, `formatDecision`, timestamps, body, apply block when applicable, sources with primary flags, corrections, and full pipeline provenance.

Before committing, run:

- format/length QA;
- source-count reconciliation;
- cover cooldown and same-batch uniqueness QA;
- persona/section validation;
- frontend data-shape validation.

Never add a new script path to the live page without confirming that it loads cleanly before `app.js`.

## Stage 9 — Repurpose / Social

Export platform-native X/Instagram/Facebook copy. Use the article's assigned cover. Post only when official credentials exist; otherwise stage as ready/dry-run. Log each real task and charge no image/post cost for operations that did not occur.

## Stage 10 — Benchmark Data Desk

The Scoreboard must never be more than 12 hours behind a completed scheduled run.

1. Open the live Artificial Analysis model leaderboard.
2. Check official SWE-bench and Terminal-Bench leaderboards for material coding-agent changes.
3. Check vendor pricing pages when price fields changed or are missing.
4. Update `web/data/scoreboard.js` only from current, attributable evidence.
5. Use the independent Artificial Analysis Intelligence Index as the displayed strength score; do not hand-mix vendor claims into an opaque house number.
6. Update `updated`, `scannedAt`, rows, notes, and sources.
7. If no scores changed, still advance `scannedAt` and log “scan completed; no material changes.”
8. Major model launches trigger an immediate scan outside the 12-hour window.

## Mandatory observability — no unlogged changes

Every completed task appends one record to the usage ledger. This includes:

- research, writing, QA, verification, copyedit, compliance, publishing;
- image generation/selection and cooldown remediation;
- benchmark scans and scoreboard edits;
- site fixes, rollbacks, cache bumps, deployment repairs, policy changes, and data migrations.

Use exact metered token/image counts when available. When work occurs through a subscription session or connector without token metadata, use a defensible estimate, `measured:"estimated"`, and the actual model name. Never silently omit work because it was not an article.

A commit that changes shipped site behavior or public data without a matching ledger record fails the release gate.

## Output contract

A run ends with one of:

- published content plus complete provenance and usage records;
- a settled spike record;
- a benchmark/maintenance update;
- or an explicit logged “no publishable story met the bar.”

A skipped slot is preferable to weak evidence, padded copy, repeated artwork, stale benchmarks, or an unlogged change.
