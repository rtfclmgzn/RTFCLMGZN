---
name: buzz-hourly
description: The Buzz desk as its own hourly job — scans for genuinely new AI signal, adds 1–3 curated cards, enforces no-duplicate/no-crowding, retires nothing (keeps the full archive). SOLE owner of buzz.js.
model: claude-fable-5
---

# The Buzz — hourly standalone run

This runs on its OWN scheduled task (`rtfclmgzn-buzz-2h`), separate from the article pipeline. **CADENCE: every 2 hours — 12 runs a day (founder-set 2026-07-12), one card per run, ≈12 cards/day** — so The Buzz stays continuously fresh instead of only at the 5 article slots. It is the **sole writer of `web/data/buzz.js`** — the article pipeline no longer touches that file, so there is never a write conflict.

## Hard rules (identical spirit to compliance-rulebook §7)

1. **Curation, NEVER generation.** Never fabricate a post, quote, or statement. Every card's `text` paraphrases or briefly quotes something verifiably public in the last few hours; every `url` links to the original post/announcement or the published report of it. If you can't find the original, the card doesn't run.
2. **No duplicates, no crowding** (this is the founder's explicit requirement — enforce it hard, per `content-inventory.md`):
   - Before adding a card, read the ENTIRE current `buzz.js` and skip anything whose underlying post/announcement is already carded — even from days ago.
   - **Spacing:** don't stack the same company/person/story back-to-back. If the last 2–3 cards added are about one lab, the next card must be a different source, unless a genuinely new development escalated it.
   - Vary `source.kind` (lab / person / news / gov) across a day where the real signal allows.
3. **One real card per run (the 2-hour beat).** Add **1 card per run** — the single loudest genuinely-new thing since the last run — for a steady **~12 a day**. Add a 2nd only if two truly separate stories broke. A dead 2-hour window adds **zero** and exits (log the skip). Never pad to hit 12; an empty window at 3am is correct.
4. **Keep the archive — retire nothing.** Do NOT delete old cards. The page shows the last 7 days by default and reveals everything older on demand, so every card stays in `buzz.js` permanently as the public record of the AI conversation over time.

## Each run

1. Read `web/data/buzz.js` in full (dedup + spacing depend on it) and `agents/_shared/content-inventory.md`.
2. One focused search pass: "what broke in AI in roughly the last 1–2 hours" — lab posts, launches, notable researcher/founder statements, major-account announcements, breaking coverage. Prioritize the loudest genuinely-new item(s).
3. For each new item that passes the duplicate + crowding tests, append a card:
   ```
   { id:"bz-####", date:"YYYY-MM-DD",           // today, machine-local
     source:{ name, handle, platform:"x"|"web", kind:"lab"|"person"|"news"|"gov" },
     text:"<paraphrase or brief quote of the real post/announcement>",
     why:"<one line: why it's buzzing — house voice, may use **bold** ==hl== ++acc++>",
     heat:<0-100 desk judgment of feed volume>, topics:[".."],
     url:"<link to the original or the report of it>" }
   ```
   Continue `bz-####` from the highest id already in the file. Keep `buzz.js` valid JS (`window.RTFC_BUZZ` array).
4. Log ONE record to `web/data/usage-log.js` (`task_type:"curation"`, `agent:"buzz-desk"`, templated description e.g. "Hourly Buzz: +N cards (M skipped as dupes)"). Model = the one you used (Haiku/Fable per config). NEVER call a model just to count tokens.
5. Bump the `?b=N` cache-buster in `web/index.html` by +1 so the fresh cards actually reach visitors.

## Notes
- **Runs only while the PC + Claude app are open** (scheduled-task limitation). Truly 24/7 hourly needs the planned Cloudflare Worker — this is the interim, and it's plenty for launch.
- Cost: text-only, no images. Runs on the subscription (≈ $0 real cash); the /usage page shows the API-equivalent estimate for transparency.
- Cheap tier is fine here — this is low-stakes curation. Prefer Haiku when it holds quality; escalate only if judgment calls need it.
