# CONTENT INVENTORY — check before you create (the no-duplicate, no-crowding law)
### Founder mandate 2026-07-11: "we don't want any duplicate or similar ones too close to each other." This is house law for EVERY content type — articles, guides, resources, Buzz cards, magazine pieces.

## The rule, in one line
**Before creating anything, read what already exists, and don't make something a reader would recognize as a repeat — either an exact duplicate OR a near-neighbor stacked too close in time.**

## Two tests every new piece must pass

1. **Duplicate test (same substance).** Does a piece already cover this core subject/story/skill? If yes, don't make a second one — instead UPDATE the existing piece, or find a genuinely different angle that adds something the first didn't. "Already covered" includes earlier runs and earlier days, not just today.

2. **Crowding test (too similar, too close).** Even when it's not a duplicate, don't stack near-neighbors:
   - No two pieces on the **same company's adjacent news** within ~48h unless the second is a real escalation.
   - No two **guides teaching the same underlying skill** (e.g. two "how to write a prompt" guides) — ever. Guides must each teach a *distinct* skill.
   - Vary the **desk/topic** across a day's slate and across consecutive guides — don't publish three Markets pieces in a row if the day offered more.
   - A good gut check: if the two titles would sit next to each other in a list and a reader would think "didn't I already read this?", it fails.

## How each content type checks

- **Articles (automated pipeline):** Stage 1 already dedupes against `web/data/live-articles.js` + `web/data/pending-review.js`. Now also apply the crowding test — scan the last ~3 days, not just "is this the exact same event." One subject per day.
- **Guides:** BEFORE writing, read `web/data/guides.js` in full and list every existing guide's title + the one core skill it teaches. The new guide must teach a skill **not already on that list**, and must not be a rewording of one. Keep the catalog spread across different reader needs (prompting, choosing a model, a specific workflow, a specific tool-type) rather than clustering.
- **Resources:** read `web/data/resources.js`; don't add a source/handle that's already listed.
- **Buzz cards:** read `web/data/buzz.js`; one card per real post/announcement — never two cards for the same underlying item. (Retirement of >5-day-old cards already in compliance-rulebook §7.)
- **Magazine:** the Curation Editor checks prior issues so a monthly doesn't re-run a framing or a Compendium item from a recent issue.

## The backstop
The weekly Editorial Review (P3, `agents/review/editorial-review.agent.md`) explicitly scans the last ~7 days for repetition and near-overlap and flags drift into editorial-notes. That's the safety net for slow creep — but prevention at creation time (this doc) is the first line, not the review.
