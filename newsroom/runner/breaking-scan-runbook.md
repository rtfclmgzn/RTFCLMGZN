# RTFCLMGZN Breaking-News Scan Runbook

You are running unattended, headless, on the owner's Claude subscription. This is NOT one of the three regular publishing cycles (05:00/11:00/17:00 Central) — it runs every 2 hours in between them, for one purpose only: **make sure a genuinely major AI story never has to wait for the next regular cycle.** The owner's own words: "if a huge release like Opus 5 was just released, and I go to sleep tonight without seeing an article on that, this whole site is a failure."

This is a scan, not a content quota. Most runs should find nothing worth an out-of-cycle publish, and that is success, not failure — do not lower the bar to have something to show.

## 0. Kill switch

If `newsroom/runner/PAUSED` exists, log a no-op entry (see Step 4) and stop immediately.

## 1. What counts as "breaking" — the bar is high

Only these qualify for an immediate out-of-cycle publish:
- A new model release or major model upgrade from a frontier lab (Anthropic, OpenAI, Google DeepMind, Meta, xAI, Mistral, Moonshot/Kimi, DeepSeek, or a comparable frontier player).
- A major security incident or vulnerability disclosure affecting a widely-used AI system.
- A major regulatory or legal action (a bill signed, a landmark ruling, a significant enforcement action).
- A major infrastructure or business event with industry-wide implications (a landmark acquisition, a major outage, a landmark funding round).

Explicitly NOT breaking, even if genuinely new: routine minor feature updates, opinion pieces, small-startup news, incremental research papers, anything that would lose nothing by waiting for the next regular cycle (at most a few hours away). When in doubt, don't — the regular cycles exist for everything that isn't this urgent.

## 2. Scan

Use WebSearch to check for major AI news from the last ~3 hours (check today's real date/time first). Cross-check candidates against what's already published:
```
grep -oE '"slug": *"[^"]+"|"title": *"[^"]+"|"publishedAt": *"[^"]+"' web/data/newsroom-articles.js
```
Also check the last few entries of `web/data/usage-log-current.js` (agent `breaking-scan`) so you don't re-research the same non-event you already logged a few scans ago.

If nothing clears the bar in Step 1, or everything that does is already covered: go straight to Step 4 (log a no-op) and stop. Do not write anything.

## 3. If something genuinely qualifies

Publish **at most one** article this scan, even if more than one thing qualifies — pick the single most important one; the rest can wait for the next regular cycle (note them in your Step 4 log entry so they aren't lost).

Follow the exact same standards as a regular cycle (see `newsroom/runner/cycle-runbook.md` §1, §3 **including §3a's depth requirements** (apply block, source reconciliation, chart when warranted, cross-links), §4 for house specs/JSON shape/image rules, and §4b for the RSS feed — read them in full before writing), with one addition: **set `"breaking": true`** in the article's JSON. Adding your published article to `web/rss.xml` (§4b) applies here too — a reader's feed reader should see a breaking story the moment it ships, not wait for the next regular cycle. This holds it in the homepage hero slot for 24 hours (or until a newer breaking story replaces it) even as routine-cycle articles publish underneath it — the entire point of this scan existing. Do not set it on anything published by a regular cycle; it's reserved for stories that actually cleared the bar in §1.

In particular:
- Verify the story against a primary source, not just aggregator coverage.
- Real, working citation URLs only.
- Self-reported claims from the company in the story (benchmarks, safety scores, etc.) must be attributed as theirs, not stated as neutral fact.
- Cover image: library-first, semantic match, check `brand_visible` in the manifest carefully — never use an image with a competing company's branding baked into it.
- Ship it exactly like a regular cycle: bump every `?b=N` cache-buster, `git add` only touched files, run `python -m newsroom.runner.verify_publish_surface` and stop if it's non-zero, commit with a specific message noting this was an out-of-cycle breaking publish and why, push, poll-verify the deploy landed.

## 3b. Refresh Buzz (REQUIRED every scan — regardless of whether Step 3 published anything)

This is the owner's explicit standing requirement: Buzz should carry **at least 9 genuinely fresh posts a day**, refreshed on a real 2-hour cadence — this scan is that cadence. "Fresh" and "genuinely qualifying" both matter equally: this step exists to hit the floor with real signal, never with filler.

1. Read `web/data/buzz.js`'s own header rules first; they are binding (§buzz of the compliance rulebook) — never fabricate a quote or post, every `url` must resolve to something real, `text` only paraphrases or briefly quotes verifiably public material.
2. Check how many items currently carry a `date` within the last 24 hours. **If it's below 9**, that's a real gap, not a quiet day — widen your search past the last 2 hours (go back 12-24h if you have to) and look harder across labs, researchers, and official channels until you've either closed the gap with real items or you're confident there genuinely isn't more qualifying signal today. Don't stop at a shallow slice and call it done.
3. In the normal case, add the genuinely loudest 1-3 new AI-world signals since the last scan: model updates, notable research, funding, infra moves, credible insider/exec commentary — the same "top AI buzz" bar the file's own `heat` field already implies, not routine or filler news. If a candidate would only pad the count, leave it out — this is a floor to guarantee real coverage, not a quota to fill regardless.
4. Retire every card older than ~7 days, per the file's own rule.
5. Give each new card a fresh sequential `bz-NNN` id and a real `date`.

## 4. Always log the outcome (this is how the owner sees what you checked, even when you publish nothing)

Append one row to `web/data/usage-log-current.js` (follow its existing array-literal format exactly, matching an existing row's fields), regardless of outcome:
- `agent: "breaking-scan"`
- `task_type: "no-op"` (nothing qualified) or `"publish"` (you shipped something)
- `description`: one honest sentence — what you checked and why you did or didn't act, **plus what you did to Buzz in §3b** (cards retired/added, or "widened the window, still below 9" if a real gap couldn't be closed honestly). If you deferred other qualifying stories per the one-per-scan cap in §3, name them here too.
- `article_id`: the new article's `id` if you published, else `"system"`.
- Give it a fresh `id` (increment past the highest existing `u-NNNN` in the file), a real UTC `ts`, and `measured:"estimated"` for a text-only scan (no metered spend to report).

This entry is what surfaces on the Pulse/Control Room page's "Last activity on the floor" — it's the owner's visibility into the scan, so make the description genuinely informative, not a generic "scanned, nothing found."

**Even on a no-op, bump every `?b=N` cache-buster in `web/index.html` by 1** before committing, exactly like a regular cycle would. `usage-log-current.js` and `buzz.js` are both loaded via cache-busted script tags — without the bump, a browser that already cached the old files at the same `?b=` URL won't see the new content, which defeats the entire point of this step.

**Use the Edit tool, or Python opened with `encoding="utf-8"` on both read and write, for that bump. Never PowerShell (`Get-Content`/`Set-Content`/`-replace`) or any tool that doesn't explicitly declare UTF-8 on both ends.** `index.html` has em dashes and curly quotes in its `<title>`, meta tags, and visible banner — a non-UTF-8-safe read/write silently mangles all of them into mojibake across the whole file, not just the lines you touched, with no error and a normal-looking diff. This has genuinely happened before, more than once, during exactly this routine no-op bump. Sanity-check before committing: `grep -c 'â€' web/index.html` should print `0`.

Then `git add` `web/index.html`, `web/data/usage-log-current.js`, and `web/data/buzz.js` (only if §3b actually changed it), run the publish-surface guard, commit, and push, same as always.

Then stop. Do not start a second scan.
