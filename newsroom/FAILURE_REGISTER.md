# FAILURE REGISTER

*Every reader-visible failure this system has produced, what it actually cost, and the named check that now makes it impossible. Opened 2026-08-15.*

**Read this after `OPERATING_LAW.md` and before your runbook.** The Law says what to do. This says what happened when it wasn't done, which is the part that makes a rule stick.

Two things to understand before the list:

**An agent has no memory. A file does.** Every entry below was learned once, by somebody, and then forgotten by the next run — because the lesson lived in a conversation instead of in a file with teeth. The right-hand column is the only part of this document that actually prevents anything. The prose is here so you understand *why* the check exists and do not delete it when it becomes inconvenient.

**Nothing is closed until a check can fail.** An entry marked OPEN is a live risk. Do not mark one closed because it feels handled.

---

## THE CLASSES

Nine failures in thirteen entries share five shapes. Recognising the shape is worth more than remembering the instance, because the next failure will be a new instance of an old shape.

| # | Class | The shape of it |
|---|---|---|
| **A** | **Cross-surface promise broken** | Two places have to agree — router and title table, app and server, data and script tag — and only one of them got edited. |
| **B** | **Silent partial data** | A record is written that is legal but incomplete. Nothing errors. A field renders empty, a page dies, or a number is quietly wrong. |
| **C** | **The check itself failed** | A guard crashed, went blind, or was more forgiving than the runtime, and reported health that did not exist. |
| **D** | **Verified in the wrong place** | Everything was confirmed by reading files. The thing being promised lives on the internet, and nobody asked the internet. |
| **E** | **A number nobody measured** | An agent wrote a figure it could not observe. It looked plausible, so it survived. |

---

## THE REGISTER

### A — cross-surface promise broken

| What broke | What it cost | Now blocked by |
|---|---|---|
| Every page except articles used `#/` fragment routes | Months of zero organic search traffic on 100+ articles. A crawler sees one URL no matter how many pages the app renders. | `check_no_hash_links` — a `href="#/"` anywhere in the site or the SSR renderer fails the build |
| `/grid` rendered a real page with no `ROUTE_HEADS` entry | Shipped for weeks with the tab title and the Google snippet both reading "Page not found" | `check_routes_have_titles` |
| `guides.js` was in the app's lookup pool but in neither the SSR function nor the sitemap | All six guides 404'd for Google, for refreshes and for anyone sent a link. Invisible from inside the site, because clicking a guide card worked — the app resolved the slug itself and never asked the server. | `check_ssr_store_parity` — the app, the server and the sitemap must name the same stores |
| `index.html` never loaded `social-posts.js` | 143KB of current distribution records across 56 articles, and the Distribution panel on every article page rendered nothing | `check_scripts_and_globals` — a global the app reads that a file on disk defines and index.html does not load is now an ERROR, not a warning |
| `index.html` used relative asset paths (`data/x.js`) | At `/article/<slug>` they resolved to `/article/data/x.js` and 404'd — the whole data layer vanished at depth | Root-relative paths plus `assetUrl()`; `check_scripts_and_globals` verifies every script tag resolves to a real file |

### B — silent partial data

| What broke | What it cost | Now blocked by |
|---|---|---|
| Three articles had a `pipeline` record with no `gate` block; the renderer read `pl.gate.decision` | Three article pages died in front of readers: "This page didn't render" | Per-block `try/catch` containment, plus the HOSTILE minimal-record fixture in `render_smoke.py` — a synthetic article carrying only required fields is injected on every run |
| Two health articles carried `disclaimer:"health"`, which matched no branch | **No medical disclaimer rendered at all** on medical coverage | Renderer fails safe to a generic caution; `check_articles` rejects any disclaimer outside the known enum |
| Four ledger rows all used id `u-0128` | The store's own dedup keeps the first and drops the rest, so three real runs existed in the file and did not exist on the site | `repair_ledger_ids` — renumbers collisions in CI, keeping the earliest |
| A stray comma created a sparse-array hole | `forEach` skips the hole silently; a record's worth of nothing sat in a live store for days | `check_array_holes` + `--fix` |
| A **missing** comma between two records | A JavaScript SyntaxError, so the browser loaded **none** of `usage-log-current.js`. `/usage` announced "this log is 33 days stale, the jobs are failing." Nothing was failing. ~200 rows and the real cost figure were never loaded. | `check_array_holes` detects and `--fix-syntax` repairs it; only ever applied to a file that already fails to parse |

### C — the check itself failed

| What broke | What it cost | Now blocked by |
|---|---|---|
| `var SB = window.RTFC_SCOREBOARD \|\| {updated:"",rows:[]}` in three places. `\|\|` substitutes the default only when the left side is **falsy**, and `{}` is truthy. | A scoreboard store that exists but is empty, or that a repair truncated, or that a partial write left as `{}`, sails past the guard clause and the next line reads `.rows.filter(...)` on undefined. `/scoreboard` renders nothing and the boot splash stays over it forever, because the splash is only removed once a route paints. The live site is one truncated write from a permanently blank page. Identical shape to the 2026-08-13 `pipeline` record with no `gate` block. Found by booting an engine bundle with empty seed stores, which is a test the site itself had never had. | Default the PROPERTY, not the object. `check_store_defaults` reads every `window.RTFC_* \|\| {` in app.js and errors when a property is then read with an array method and has no fallback of its own. It recognises the correct fix, so it does not flag the code it asked for |
| `site_guard.py` printed `✗` to a Windows cp1252 console and died mid-report | A check that crashes *while reporting* blocks the ship AND hides the findings it already had | `sys.stdout.reconfigure` + `say()` + ASCII fallback marks; tested under `PYTHONIOENCODING=cp1252` |
| One malformed ledger row raised inside `check_ledger` | The whole guard died before printing a single result. Nine other check families never ran. The ship was blocked by a stack trace. | `run()` wraps every check: an exception becomes a named `check-crash` finding and the report still prints. Store readers degrade to per-record salvage — one bad record costs one record. |
| The salvage layer made the guard **more forgiving than a browser** | The guard read 284 rows and reported health while the browser loaded zero | Salvage is now reported as a live outage in those words, because that is what it is |
| `check_scripts_and_globals` matched `<script defer src="(data/` and index.html moved to `/data/` | The check silently matched **zero** script tags and passed every run while checking nothing. Caught by a human reading the regex, which is not a system. | `expect()` — every pattern-based check declares how many things it expects to find. Finding fewer is not a pass; it is the check declaring itself blind, and it fails the build. Verified against four separate silent-breakage scenarios. |

| An article body's internal links were written as `[OpenAI](#/company/openai)` — 129 of them across 89 records | Dead in the app (the router reads pathname, nothing listens for hashchange), invisible to search, and printed as **literal markdown text** on the server-rendered page, which is the page every visitor from X, Google or a shared link actually lands on | `check_no_hash_links` now scans `web/data/*.js` — it only ever read code, which is why the writers' 129 links were never seen. `repair_data_hash_links` rewrites them; both renderers now render internal links |
| `check_no_hash_links` was taught to strip `<!-- -->` comments so it would stop flagging index.html's own changelog. Its sibling `live_check.py` runs the same regex over the LIVE homepage and was not taught. | The `live` job went red on a string inside an HTML comment — text no browser renders and no reader can click. A guard that cries wolf about its own documentation is a guard people learn to skip, which is how the next real failure gets through. | `check_live_check_parity` — reads `live_check.py`, requires the comment strip on its fragment scan, and declares itself blind if that scan is gone |
| The step that RECORDS a live failure ran `git add newsroom/quality/incidents.log`, and `.gitignore` carries a blanket `*.log` | git does not skip an ignored path quietly: it exits 1. So a run where the live check found a real problem produced **two** red steps and **zero** incident records. The stability-gate counter, the thing that decides when this engine is ready to package, read as zero incidents because the recorder could not write. | `git add -f`, plus `check_workflow_staging` now matches every explicit `git add <path>` in every workflow against `.gitignore` and demands `-f` |
| `exact-cover-enforcer.js` matched `a[href="#/article/<slug>"]` | A document-wide MutationObserver plus four timers ran on every page load to patch three articles that no longer exist in any store, via a selector that cannot match since the URL migration. Pure cost, zero effect, for weeks. | Deleted. `check_no_hash_links` reading the data layer is what surfaced it |

### D — verified in the wrong place

| What broke | What it cost | Now blocked by |
|---|---|---|
| Five real pages — `/companies` (a 12,000-character dossier index), `/labs`, `/grid`, `/podcasts`, `/wallpapers` — sat in `sitemap.xml` with **no link to them anywhere in the served HTML**. `app.js` builds those links at runtime, so the site looked complete to every human who used it. | Invisible to anything that does not execute JavaScript, and a weaker signal to everything that does: a URL found only in a sitemap is not a URL a page vouched for. Found while auditing internal linking on the day the traffic numbers were pulled for the first time: **470 page views in 30 days across 127 articles**. Nobody had checked whether the site links to its own pages, because from inside the app it obviously does. | `check_static_link_coverage` — every top-level URL in the sitemap must have a static `href` in `index.html`. It declares itself blind if the shell stops yielding links at all. The five pages are now in the footer, which since the SSR shell change renders on all 129 article pages |
| Editing `.github/workflows/*.yml` directly. `SHIP2.bat` runs `copy /Y workflow_updates\*.yml .github\workflows\` on **every** ship. | The edit is not a change, it is a change with a countdown on it: silently overwritten by the next push, with a clean ship log, because the copy succeeded. Anyone reading the repo afterwards sees the old workflow and no evidence an edit ever happened. Nearly shipped the reference-desk change into the file that gets overwritten. | `check_workflow_source_parity` — compares the two directories wherever both exist (the owner's machine, which is the only place SHIP2 runs) and names which copy will win |
| `newsroom/reference-desk-log.md` was created, staged, shipped, and **was not there**. `git add -u` only stages files git already tracks, and SHIP2's explicit new-file list did not name it. | The guard passed, the push succeeded, CI went green, and the file the whole reference-desk experiment is measured by did not exist on `main`. A new file at a path not already in the add list ships as nothing, and every signal says success. | Named explicitly in SHIP2's staging list, with a comment saying why. The general lesson is in this row: **a new top-level file is not shipped until you have seen it on `main`** |
|---|---|---|
| `web/_redirects` was supposed to give every page a real URL. Its 37 exact rules proxied to `/index.html`, which Cloudflare canonicalises with a **308 to `/`**, so every page redirected to the homepage. Its six `/x/*` splat rules were not honoured at all, so the magazine reader, every section, every editor and every company dossier returned a hard **404** to anyone arriving from outside the app. | The entire real-URL migration was undone at the CDN. Four checks passed the whole time — every one of them read files in this repo. | `functions/[[path]].js` answers those URLs itself; `check_route_plumbing` reads ITS route lists and fails if `_redirects` reappears |
| Five agent workflows were given `${{ runner.temp }}` in their **job-level** `env:`. That context only exists inside a step. | GitHub does not skip the bad key — it rejects the entire file: *"Invalid workflow file … Unrecognized named-value: 'runner'"* — and runs **no jobs at all**. The newsroom cycle, both scans, the weekly evolution and the resources refresh were dead for eight hours. The site stopped publishing. Every other check stayed green, because every other check reads the repo, and the repo was fine. The only visible symptom was five runs listed by FILE PATH instead of by name. | `check_workflow_contexts` parses every workflow and refuses any expression using a context that is not available where it is written |
| `/article/<slug>` served a hand-written mini-page: its own thirty lines of inline CSS, no `styles.css`, no `app.js`. Clicking an article from inside the site rendered the real product; opening the identical URL from X, Google or a shared link rendered a bare serif document. | Every new reader arrived on the worse of two products. No nav, no evidence bar (sources, distinct outlets, share of paragraphs cited), no TL;DR, no audio, different typography. It closed by inviting the reader to "the interactive reader" — linked to the URL they were already on, so there was no route from a shared link to the real page at all. Every file-reading check passed for the whole day, because every file was fine: the OUTPUT was the broken thing, and nothing looked at the output. | The function now serves `index.html` itself with three substitutions (`engine:head`, `engine:jsonld`, `<main id="app">`), so a crawler gets the text and a reader gets the site. `check_ssr_shell_markers` fails the build if the function and the shell stop agreeing on those markers; `ssr_render_check.mjs` **runs the function** in CI and on every ship and reads the HTML it makes — 20 assertions, each one negative-tested against a deliberately broken build |
| `live_check.py` used `urlopen`, which follows redirects | It followed all 37 redirects to the homepage, found a valid HTML document each time, and reported **200 OK for every page**. The one check that touched reality was structurally incapable of seeing the outage. | `_NoRedirect` — a 3xx is reported as itself. The prefix routes are in its page list. **And it now runs in CI after every deploy** (`site-guard.yml`, job `live`), because a check nobody remembers to run is not a check. |

### E — a number nobody measured

| What broke | What it cost | Now blocked by |
|---|---|---|
| 153 of 269 ledger rows carried `input_tokens:0` because agents cannot see their own token accounting and wrote a zero rather than a blank | The public cost figure froze at **$11.48 for a month** while the newsroom kept publishing. It appeared in the footer and in the homepage card deck, and was "fixed" repeatedly by editing the display. | `log_usage.py` — the workflow measures the run and writes the row. Every surface states metered and unmetered counts separately. Law 3. |
| **Two writers on the ledger.** The workflow step measured each finished run and wrote a row; the agent inside the run, following its runbook, also wrote one, by hand, with zero tokens, because it cannot see its own accounting. Since the first cutover, 35 of 38 new rows were those zero-token twins. | The public "unmetered" count kept climbing after the page promised it was frozen history; run counts were inflated; and when an agent called `log_usage.py` mid-run, its PARTIAL transcript was logged and the harness's complete one skipped as a duplicate. | One writer. Agents write one sentence to `$RTFC_RUN_SUMMARY`; the harness writes the row. `check_ledger` errors on any post-cutover row without a run tag or with zero tokens; `repair_ledger_duplicates` merges twins, keeping the agent's description. The page computes before/after the cutover instead of asserting it. |
| A row carried a `ts` in the future | Nothing in the pipeline can know a future time, so the row was typed, not measured. It reorders "newest activity" on a public page. | `repair_future_timestamps` — clamps to the observed moment, which is a true upper bound, and never invents when the run happened |
| The Grid page said "25 facilities" next to an industry that counts ~12,000 datacenters | Both true, different definitions — but a reader cannot know that, and overclaiming is unrecoverable on a site whose product is stated confidence | Law 5: any figure that invites "that can't be right" states its own scope next to the number |

---

### The shape under all of these

Nine of the entries above were **fixed once and left broken elsewhere**: hash links fixed for articles and not pages, one unguarded field fixed while its siblings crashed, `git add -u` added to one workflow while six identical blocks stayed broken, the ledger writer fixed in the runbook while the workflow kept its own. `check_workflow_staging` exists because the check found two more copies in under a second after five had been fixed by hand. **A fix that does not come with a search for its siblings is half a fix**, and the half you skipped is the one that ships.

## STILL OPEN

Honest list. These have no enforcement today.

1. **Social posting is not verified.** There are caps and a dedupe ledger, but nothing confirms a post actually landed on any platform. The Facebook-only period would not be caught today. *(Class D — the same shape as the `_redirects` failure: we verify what we wrote, not what happened.)*
2. **Nobody watches the watchers on a schedule you see.** The guard goes red in GitHub Actions. If nobody opens Actions, nobody knows. GitHub emails the repo owner on workflow failure by default — confirm that address is one you read, because it is currently the entire alerting system.
3. **No visual regression testing.** `render_smoke.py` catches JS errors and phone-width overflow. It cannot catch "this looks wrong". Screenshot diffing would close it.
4. **Editorial quality and factual accuracy beyond structure.** The guard verifies a source exists. It cannot verify the claim. This one is not automatable and should not be pretended otherwise.
5. **The 168 historical unmetered ledger rows.** Fixed going forward; the history stays unmetered and labelled, permanently and on purpose.

---

## HOW TO ADD AN ENTRY

When something breaks in front of a reader:

1. Fix it.
2. Ask which of the five classes it belongs to, and **check every other instance of that class in the same commit** (Law 7).
3. Add a check that fails. If you cannot think of one, say so in the entry and add it to STILL OPEN rather than writing a check that cannot fail.
4. Add the row here. One line each for what broke, what it cost, and what now blocks it.

An entry with an empty right-hand column is not a lesson. It is a note.
