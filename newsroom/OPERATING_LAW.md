# RTFCLMGZN — OPERATING LAW

**Every agent reads this file first. Before the runbook, before the story, before the fix.**

This document exists because of a question the owner asked on 2026-08-14, and it is worth stating plainly because it is the most important sentence in this repository:

> *"How is there 26 agents that I told from day one to adapt and evolve and learn, and last night you fixed the hash-link problem on all the articles, and then this happens? Something is obviously flawed in my system."*

He was right, and the diagnosis is not that the agents are careless. It is architectural:

**An agent has no memory. A file does.**

Every run is a fresh model instance with no recollection of any previous run. It knows exactly what it reads. So a lesson learned in a conversation, a commit message, or an agent's own reasoning is *gone the moment that run ends*. The hash-link failure is the perfect example: articles were moved to real URLs, the lesson "fragments are invisible to search engines" was learned and applied to articles — and it was never written anywhere an agent or a check would encounter it. So every other page kept its fragments, and nobody knew until a human looked.

Two things follow, and they are the whole philosophy of this system:

1. **A rule that is not written down does not exist.** If it matters, it lives in this file or in a runbook, not in someone's head.
2. **A rule that is only written down decays.** Prose is skimmed, interpreted, and quietly dropped under deadline. The rules that actually hold are the ones a machine enforces. That is what `newsroom/quality/site_guard.py` and `render_smoke.py` are: the laws below with teeth.

**So the standing instruction to every agent is: when you learn something, encode it. A fix that leaves no check behind has not been finished.**

---

## THE LAWS

### 1. Every page is a real, crawlable URL

No `#/` route links, anywhere, ever. Fragments are invisible to search engines — the crawler sees one URL no matter how many pages the app renders. Every page lives at a real path (`/resources`, `/article/<slug>`, `/grid`), is served at that path by `functions/[[path]].js`, has an entry in `ROUTE_HEADS` so it has a real title, and appears in the sitemap.

*Adding a route means four edits in one commit: the router, `ROUTE_HEADS`, the `EXACT`/`PREFIX` sets in `functions/[[path]].js`, and `gen_sitemap.py`'s STATIC list.* Enforced by `check_no_hash_links` and `check_route_plumbing`.

**And a real URL is only real once something has fetched it from the internet.** `web/_redirects` held this job until 2026-08-15 and did none of it: its 200-proxy rules pointed at `/index.html`, which Cloudflare canonicalises with a 308 to `/`, so all 37 pages redirected to the homepage; and its `/x/*` splat rules were ignored outright, so the magazine reader, every section, every editor and every company dossier returned a hard 404 to anyone arriving from outside the app. Four separate checks passed the whole time, because every one of them read files in the repo. The one check that touched the live site followed redirects and reported 200 OK. `live_check.py` no longer follows redirects: a page that answers with a 3xx is a page that does not exist, and it now says so.

### 2. Records are complete; renderers assume nothing

Write every field the shape calls for — including the ones that feel optional, like a pipeline's `gate` block. And on the rendering side: never read a nested store field without guarding it. Three pages died in front of readers this week on exactly that. Enforced by `check_articles` and by the hostile-minimal-record fixture in `render_smoke.py`.

### 3. Measure; never self-report a number you cannot see

An agent cannot see its own token accounting, so it must never write one. `log_usage.py` runs in the workflow and measures the run. This law exists because 153 rows of `input_tokens:0` froze the public cost figure at $11.48 for a month while the newsroom kept publishing. The same principle generalizes: **if you cannot measure it, say so in the record rather than writing a zero, an estimate, or a plausible guess.** A blank is honest; a fabricated figure is not.

### 4. Reference surfaces never carry invented facts

The Scoreboard prints independent scores, never a vendor's own claim. The Grid pins a site only when the reporting establishes who runs it and where. A model gets a row when it ships and stays *unmeasured* until someone independent measures it. **A blank field is always acceptable. A plausible guess never is.**

### 5. Say what a number counts

The Grid tracks 25 megasites while directories count ~12,000 datacenters — both true, different definitions. Any figure that invites a "that can't be right" reaction must state its own scope on the page, next to the number, before a reader has to go and check. Overclaiming on a site whose entire product is stated confidence is the one unrecoverable mistake.

### 5b. A check may fail. A check may never crash.

A guard that raises mid-run is worse than no guard: it blocks the ship, hides every finding it had already collected behind a stack trace, and looks like diligence while checking nothing. On 2026-08-15 one malformed ledger row an agent had written took `site_guard.py` down before it printed a single result, and nine other check families never ran.

Two rules follow, and both are now enforced in code:

- **Every check runs inside `run()`**, which turns an exception into a `check-crash` finding naming the check. The build still fails, but it fails *with the rest of the report*.
- **Every store reader degrades to per-record salvage.** One unreadable record costs that record — reported with the actual characters around the failure — never the file and never the run.

Write new checks the same way: a check that cannot answer must say "I could not answer", not die. And when a reader hands you partial data, say how much was lost. Silent partial data is the failure mode this law exists to prevent, in both directions.

### 6. Never silence a guard

If a check fails, fix the thing it found. Do not edit `newsroom/quality/*` to make it pass, do not delete the check, do not work around it. If a check is genuinely wrong, say so in your run report and **leave it failing** for the owner. A disabled guard reads as safety and is its opposite.

### 7. Generalize every fix

When you fix something, ask: *where else is this true?* The hash-link failure, the unguarded-field crashes, and the relative-asset-path breakage were all one bug fixed in one place while identical instances sat untouched elsewhere. Before closing any fix:

1. Search for other instances of the same pattern.
2. Fix them in the same commit.
3. **Add a check so the pattern cannot return** — that is the step that makes it learning instead of maintenance.

### 8. The record of a scan is the product

Every scheduled run logs a row, even a no-op. Every Scoreboard review appends a dated scan entry, even when nothing moved. A newsroom that stopped running and a newsroom that ran and found nothing must never look identical.

### 9. Nothing about the reader is quietly downgraded

Entitlement is decided by the server. A disclaimer with an unrecognised value still renders a notice. Reader library state syncs to the account, not just the browser. When in doubt, fail toward the reader's interest.

### 10. Leave the next run a better map

If you learned something operational — a step that always fails first, a runbook that contradicts another file, a tool that lies — append one dated line to `newsroom/runner/living-notes.md`. That file is the closest thing this system has to memory between runs. Keep it short enough to be read.

---

## WHAT A GOOD RUN LOOKS LIKE

1. Read this file. Read your runbook.
2. Run `python3 newsroom/quality/site_guard.py`. Note what is already broken so you never get blamed for it and never make it worse.
3. Do the work. Write complete records.
4. Run the guard again, and `render_smoke.py` if Playwright is available. Both clean on anything you touched.
5. If you fixed something: generalize it (Law 7) and leave a check behind.
6. If you learned something: one line in `living-notes.md` (Law 10).
7. Report honestly, including what you could not do and why. **An unfinished task reported accurately is worth more than a finished-looking one that isn't.**

---

## WHY THE CHECKS EXIST, IN ONE LINE EACH

- `site_guard.py` — the contracts: data shapes, cross-surface promises, renderer parity, routing plumbing, ledger honesty. Runs on every push, before every ship, hourly.
- `render_smoke.py` — opens every page cold, the way a visitor from Google does, plus a deliberately minimal record that proves an incomplete store record cannot kill a page.
- `ensure_covers.py` / `verify_covers.py` — no article ships without a cover.
- `gen_sitemap.py` — every real URL is discoverable.
- `log_usage.py` — the bill is measured, not claimed.

Each one exists because something broke in front of a reader. That is the only reason a check should ever exist, and it is why none of them should ever be removed to make a build go green.
