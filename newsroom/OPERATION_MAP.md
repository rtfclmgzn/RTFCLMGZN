# RTFCLMGZN — THE WHOLE OPERATION, A TO Z

*Written 2026-08-14. If this file and the repo disagree, the repo is right and this file is stale — fix it.*

---

## 1. WHAT THIS THING ACTUALLY IS

A news publication with no staff. Six scheduled jobs run on GitHub's servers, write articles and data into a git repository, and Cloudflare serves the result. Your PC is not involved and does not need to be on. There is no database of content — **the repo is the CMS**. Every article, score, datacenter and price lives in a `.js` file under `web/data/`.

That single design choice explains almost everything else: why deploys are just commits, why a bot can break a page, and why the checks all read files.

---

## 2. WHAT RUNS, WHEN, AND WHAT IT TOUCHES

| Job | Schedule | Model | Writes | Runbook |
|---|---|---|---|---|
| **Newsroom cycle** | 3×/day | Sonnet | articles, buzz, scoreboard, companies, RSS, covers | `cycle-runbook.md` |
| **Breaking scan** | hourly | Haiku | breaking articles, buzz | `breaking-scan-runbook.md` |
| **Pulse scan** | periodic | Haiku | buzz, scoreboard flags | `pulse-scan-runbook.md` |
| **Weekly evolution** | Mon 09:00 UTC | Sonnet | scores, dossiers, Grid specs, dictionary, extensions, prompts | `evolution-runbook.md` |
| **Magazine pipeline** | phased | mixed | the monthly issue (draft only — never auto-publishes) | in-workflow |
| **Social dispatch** | every 3h | script | posts to X, Bluesky, Threads, Facebook, Instagram, Reddit | `agents/social/` |
| **Site guard** | every push + hourly | none (deterministic) | repairs data, fails the build | — |

**The order of a publish:** research → draft → self-critique → components → cover (generate or reuse) → compliance self-check → write to store → sitemap + RSS → cache-buster restamp → commit → push → Cloudflare builds → social dispatch picks it up on its next run.

---

## 3. THE PARTS

**Content** — `web/data/*.js`. Articles, guides, scoreboard, grid, buzz, companies, entities, dictionary, extensions, prompts, usage ledger. Hand-editable, bot-written, parsed by three different readers (the app, the SSR function, the Python checks).

**The app** — `web/assets/app.js` (~500KB, no framework, no build step). Renders every page from those globals. Pathname router with real URLs.

**Server bits** — `functions/`: server-rendered article pages at `/article/<slug>`, the Stripe billing endpoints, the account library API. Cloudflare Pages Functions.

**Routing** — `web/_redirects` maps every app path to `index.html` so deep links survive a cold visit. Adding a route means four edits: router, `ROUTE_HEADS`, `_redirects`, sitemap.

**The checks** — `newsroom/quality/`: `site_guard.py` (contracts + cross-surface promises), `render_smoke.py` (opens every page in a real browser), `live_check.py` (verifies the published site). Plus `ensure_covers.py`, `gen_sitemap.py`, `log_usage.py` in `newsroom/runner/`.

**The law** — `newsroom/OPERATING_LAW.md`. Read first by every agent. The checks are its enforcement.

**Ship path** — `SHIP2.bat` on your PC: guard → commit → rebase past the bots → restamp → push, with retries.

---

## 4. WHERE TO RUN THE WORK — your direct question

**Use Claude Code, in the repo, on your PC. `Code → New`, opened at `D:\BUSINESS\RTFCLMGZN`.**

Why, concretely:

- **It edits files in place.** Right now every change I make goes: container → deliver → write to your disk → you run SHIP2. Claude Code cuts that to one step and removes the entire class of "did the file land" problems.
- **It can run the checks itself.** `site_guard.py` and `render_smoke.py` are the whole safety net, and they need to run *in the repo* against the *full* checkout. From here I run them against a partial copy with `--skip-assets`.
- **It can run git.** No more pasted logs, no more rebase archaeology.
- **It reads the repo as it works.** 500KB of app.js, six runbooks, 125 articles — it opens what it needs instead of me holding it in a conversation.

**Cowork (here, `Home → New`) is the right place for:** deciding what to build, strategy, monetization, reviewing what shipped, and anything where you want to talk it through with screenshots. It's a bad place for a 40-file refactor, which is what today was.

**`Home → Projects` — use it.** Make a project for RTFCLMGZN and put in its instructions: the repo path, the Operating Law summary, "always run site_guard before proposing a ship", your writing preferences. Then every Cowork chat starts already knowing the rules instead of me relearning them.

**Model: yes, Opus 5 for this work — but not blindly.**

- **Opus, max/high effort** — architecture, anything touching the router or the checks, debugging something that has already been "fixed" once, and any decision that affects money or trust. Today's work was all of this.
- **Sonnet** — writing content, CSS, adding entries to a data file, routine edits. It's most of the volume and it's cheaper and faster.
- The *newsroom itself* should stay on Sonnet/Haiku as it is. Do not put Opus on the hourly scan; that is how you burn an allowance on 720 runs a month that mostly say "nothing happened."

**The practical split:** decide here, build in Code, ship with SHIP2, verify with `live_check.py`.

---

## 5. WHAT IS NOW GUARDED (and what still isn't)

**Guarded — cannot silently regress:**

- Hash-route links anywhere in the site or the SSR renderer → build fails.
- A route that renders but has no title or no server rule → build fails.
- A data file the app reads but the page never loads → flagged.
- The two renderers drifting apart on markup → build fails.
- A half-restamped cache-buster → build fails.
- An article record missing required fields, a future publish date, a duplicate slug, an unknown disclaimer, a missing cover → flagged or fails.
- A store record missing optional fields killing a page → the hostile-record fixture catches it every run.
- Duplicate ledger ids and sparse-array holes → auto-repaired in CI.
- Every page and every article rendering cold, at three widths, with zero JS errors → every push.
- The published site matching the repo after deploy → `live_check.py`.

**Still soft — the honest list:**

1. **Editorial quality.** No check can tell you a story is boring or an angle is weak. That is what reading it does.
2. **Factual accuracy beyond structure.** The guard verifies a source *exists*; it cannot verify the claim.
3. **Visual regressions.** The smoke test catches errors and overflow, not "this looks wrong". Screenshot diffing would close this and is not built.
4. **The 153 unmetered ledger rows.** Fixed going forward; the history stays unmetered and labelled, permanently.
5. **Social posting** has no equivalent guard yet — it has caps and a dedupe ledger, but nothing verifies a post actually landed.
6. **Nobody watches the watchers on a schedule you see.** The guard goes red in GitHub Actions; if you never look at Actions, you never know. A push notification on a red guard is the missing piece.

---

## 6. PAID BENEFITS BEYOND THE MAGAZINE — options, for you to pick

Today Plus gates exactly one thing: the issue spread reader. Ranked by *value delivered per unit of work and ongoing cost*:

**Cheap, immediate, fits the brand:**

1. **Data exports.** The Scoreboard, the Grid and the full usage ledger as CSV/JSON, with history. Costs nothing to run (built in the browser from data already shipped), and it is exactly what a researcher or an analyst would pay for. Free users see the page; Plus takes the data.
2. **The full archive, as a file.** Every article as clean markdown in one download, updated monthly. Same mechanism as the prompt-library download I built today.
3. **Early access.** Each issue lands for Plus 5–7 days before it appears publicly. Zero extra work, real perceived value, and it gives the newsletter something to announce twice.

**Moderate work, higher value:**

4. **A Plus-only weekly brief** — one edition a week that only subscribers get, written by the existing pipeline against the week's coverage. Costs a few thousand tokens; needs the email path finished.
5. **Watchlists with alerts.** Follow a company or a model; get told when its dossier or score moves. The dossier data already exists; the alerting does not.

**Don't do these:**

- Paywalling articles. The free archive is the entire top of the funnel and the SEO asset.
- Paywalling the Dictionary, Guides, Extensions or Prompts — those are what bring strangers in.
- "Ad-free" as a benefit. There are no ads.

My recommendation: **1 + 3 now** (a day of work, no new infrastructure), then 4 once email is real.

---

## 7. BEFORE THIS IS AN ENGINE YOU CAN SELL

You said it is leaking oil, and you were right. It leaks less today. In rough order:

1. ~~A checking system that runs without anyone remembering~~ — **done today.**
2. ~~Rules that survive a run ending~~ — **done today** (`OPERATING_LAW.md`).
3. **Watch the watchers** — a notification when the guard goes red. Small.
4. **Two weeks of quiet.** Let the pipeline run against the new laws and see what the guard catches. If a fortnight passes with no reader-visible breakage, the system is stable enough to templatize. That is the real gate, and it is a *waiting* gate, not a building one.
5. **Then** the engine work: `engine.config.json`, the brand/content separation audit, the clone checklist — all of which already exist in draft in `engine-product/`.

Selling a system that breaks in front of a customer costs more than the sale. Two weeks.
