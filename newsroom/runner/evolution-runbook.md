# RTFCLMGZN Weekly Evolution Runbook


> **READ `newsroom/OPERATING_LAW.md` FIRST — before this runbook, before any work.**
> It is short, it is absolute, and it exists because rules that live only in a
> conversation are gone the moment a run ends. Everything below assumes you have
> read it. If anything here contradicts the Operating Law, the Law wins and you
> report the contradiction.
You are the weekly evolution run — the job that keeps this publication a **living system** instead of a site that only adds articles. One run per week. You do maintenance the daily cycles are too busy for: the Scoreboard's freshness, the company registry's growth, the Grid's depth, the Dictionary's vocabulary, the ink layer's adoption, and the ledger's integrity. Follow this runbook exactly, then stop.

You are running unattended, headless, on the owner's Claude subscription (no API billing — do not call any paid API). Work from the repository root.

## 0. Kill switch

If `newsroom/runner/PAUSED` exists, print `PAUSED — exiting without doing anything` and stop immediately.

## 0b. The guard comes first (REQUIRED)

Run `python3 newsroom/quality/site_guard.py` before you write anything and again before you push. Fix any ERROR caused by a record you touched. Never edit `newsroom/quality/*` to make a check pass — a silenced guard reads as safety and is the opposite. Report anything you could not fix rather than working around it.

Do not hand-write your own usage row for token counts you cannot see. The workflow measures the run and writes the ledger row itself (`newsroom/runner/log_usage.py`); a self-reported `input_tokens:0` is what froze the public cost figure for a month. Log what you DID (description, article ids) in your report — the harness logs what it cost.

## 1. House standards

Skim before editing anything: `agents/production/style.agent.md` (voice), `agents/_shared/compliance-rulebook.md` §1–§5 (scrutiny triggers). Every rule there binds this run too. The overriding discipline for THIS run: **you maintain reference surfaces, and reference surfaces never carry invented facts.** A blank field is always acceptable; a plausible guess never is.

## 2. Scoreboard freshness (web/data/scoreboard.js)

1. Fetch the current Artificial Analysis Intelligence Index leaderboard (WebSearch/WebFetch). If it cannot be reached this run, skip score changes entirely and say so in the scan entry — never re-derive or estimate a score.
2. For every row with a `score`, compare against the live leaderboard. Apply moves by reading the number directly off the leaderboard (integer scale), same as every prior scan.
3. Any generally-released general-reasoning model covered by this site (grep recent articles + buzz) that is missing from the board: add it as released-but-unmeasured, with a vendor list price only if the vendor publishes one (else `pin:null, pout:null`). Vendor self-reported benchmarks are never adopted as scores.
4. Every model on the board must have an entry in `web/data/entities.js` (`{re, name, maker, makerKey, kind, access}`). Add any missing.
5. Whatever happened — including nothing — prepend a dated entry to `basisNote` in the established style ("Re-scanned <date> (weekly evolution): ..."). The board's rule stands: record every scan, even the ones that change nothing.

## 3. Dossier promotion (web/data/companies.js)

The owner's standing instruction: a company that keeps showing up in coverage earns a dossier automatically.

1. Count mentions: for each company name that appears in article bodies or Buzz cards but has NO key in `companies.js`, count the number of **distinct published pieces** mentioning it (articles + buzz cards; one piece = one mention regardless of repetitions).
2. Any such company with **3+ distinct pieces** gets promoted: add a `companies.js` entry matching the existing shape (key, re — a safe word-boundary regex, name, desc grounded in what the coverage actually established). Cap: **2 promotions per run**, most-mentioned first.
3. No logo work needed — a key missing from LOGO_EXT renders a neutral mark by design. Note the new key(s) in your report so a future run can source an official SVG into `web/assets/logos/` (official brand asset only, never a lookalike).

## 4. Grid enrichment (web/data/grid.js)

The facility cards support four OPTIONAL structured fields, rendered as spec chips when present: `power` (critical IT power), `chips` (accelerator count/type), `since` (operating since), `capex` (reported investment). Most rows don't have them yet.

1. Pick up to **3 facilities** missing some or all of these fields, oldest `addedAt` first.
2. Research primary sources (operator announcements, filings, utility records as reported by credible outlets). Add ONLY figures you can source; phrase reported-not-confirmed numbers as the source does ("reported ~$10B"). Add `specSrc:"<url>"` on any row you enrich (the renderer ignores unknown fields; the field is for the audit trail).
3. The file's own honesty rules govern everything: `status` vs `confidence` stay independent, no invented pins, no street addresses.
4. If the week's coverage named a new facility (announced or breaking ground), add its row per the file's rules.
5. Update `updated:` and, if your edits change what the methodology line should say, the methodology.

## 5. Dictionary growth (web/data/dictionary.js)

Scan the last 7 days of articles for jargon a general reader keeps meeting that has no Dictionary entry (grep terms against `data/dictionary.js`). Add up to **5 entries**, alphabetical position, in the file's established register: beginner-first, no undefined terms inside a definition, `**bold**`/`==mark==` allowed. Terms added here should be the ones articles `__underline__` (runbook §3b+ of the cycle) — the two layers reinforce each other.

## 5b. The Extensions index and the Prompt Library (REQUIRED, weekly)

Both pages print "last re-verified <date>" from their own data files. That date is a promise; keep it true.

**`web/data/extensions.js`** (the AI Extensions encyclopedia):
1. Spot-check **10 entries** per run, oldest-unchecked first: does the URL still resolve, is it still the maker's own domain, is the one-line description still accurate?
2. Remove anything dead or acquired-and-folded. A dead link in a directory is a correction, not a shrug.
3. Add anything this week's coverage introduced that a reader would want to wire up — same rules as the file header (primary sources only, no pricing, `kind` from the known set, tags structural only).
4. Update `RTFC_EXTENSIONS_META.updated` to today **only if you actually checked**. Never touch the date without doing the work — a false freshness stamp is worse than an old one.

**`web/data/prompts.js`** (the Prompt Library):
1. Re-read any prompt older than 60 days against current model behaviour. A prompt that no longer produces what it claims gets rewritten or removed, never left as decoration.
2. Add at most **2 prompts** a week, and only ones that pass the file's own bar: a specific job, `<ANGLE BRACKET>` placeholders, and a `why` that teaches the technique rather than the text.
3. Update `RTFC_PROMPTS_META.updated` under the same rule as above.

Report what you checked, what you removed and why, and what you added.

## 6. Ink-layer adoption audit

Check the last 7 days of articles for the §3b+ marker dosage (any `==` or `__` in body prose). If fewer than 80% comply, apply the dosage to up to **4** non-compliant articles — emphasis only, wording unchanged, one-line pipeline note ("ink layer applied <date>"). Report the compliance rate.

## 7. Ledger integrity (web/data/usage-log-current.js)

1. Every scheduled run is required to log a row, including no-ops. Check the ledger for gaps longer than 24h in the trailing week. **Never backfill rows for runs you didn't witness** — a fabricated ledger row is worse than a gap. Report gaps in your run report so the owner can see scheduler failures.
2. **Do not write your own usage row.** The workflow's `log_usage.py` step measures this run from its own transcript and appends the row after you exit. Your job is the audit, not the entry.
3. Audit the meter itself: count rows carrying no token figures (`input_tokens:0, output_tokens:0`, no `images`). Report the count and, critically, **whether it is falling**. Every row written from 2026-08-14 forward should be `measured:"metered"`; a run of new `measured:"unmetered"` rows means `log_usage.py` stopped finding the transcript — say so loudly in the report, because the public cost figure silently stops growing when that happens, which is exactly how it froze at $11.48 for a month.
4. Unmetered history is **never** retroactively estimated. It is displayed as an unmetered count on the site and left alone.

## 8. Self-improvement notes (newsroom/runner/living-notes.md)

Read the trailing week's commit messages (`git log --oneline --since="7 days ago"`) and any pipeline `review` notes in articles published this week. Append up to **3 dated bullet lessons** to `newsroom/runner/living-notes.md` (create with a one-line header if absent) — concrete, operational lessons ("X keeps failing, do Y first"), not affirmations. Keep the file under 40 bullets by pruning the oldest when over.

## 9. Ship it

```
python3 newsroom/runner/gen_sitemap.py
python3 -c "import ship_preflight as s; print(s.bump())"
git config user.name "rtfclmgzn-pipeline"
git config user.email "rtfclmgzn@gmail.com"
git add web/data web/index.html web/rss.xml web/sitemap.xml web/assets/logos newsroom/runner/living-notes.md
git commit -m "evolution: weekly living-system pass — <one-line summary of what changed>"
git pull --rebase origin main || { git rebase --abort; echo "rebase race — changes ride the next run"; exit 0; }
git push origin main
```

If nothing at all changed this run (possible, not likely), commit only the ledger row and the basisNote scan entry — the record that the system checked itself IS the product.

## 10. Report

Print a summary: scores moved (from→to), models added, companies promoted (with mention counts), facilities enriched (fields + sources), dictionary terms added, ink compliance rate, ledger gaps found, lessons filed. Plain text, no ceremony.
