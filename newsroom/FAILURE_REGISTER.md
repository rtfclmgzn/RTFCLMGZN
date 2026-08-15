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
| `site_guard.py` printed `✗` to a Windows cp1252 console and died mid-report | A check that crashes *while reporting* blocks the ship AND hides the findings it already had | `sys.stdout.reconfigure` + `say()` + ASCII fallback marks; tested under `PYTHONIOENCODING=cp1252` |
| One malformed ledger row raised inside `check_ledger` | The whole guard died before printing a single result. Nine other check families never ran. The ship was blocked by a stack trace. | `run()` wraps every check: an exception becomes a named `check-crash` finding and the report still prints. Store readers degrade to per-record salvage — one bad record costs one record. |
| The salvage layer made the guard **more forgiving than a browser** | The guard read 284 rows and reported health while the browser loaded zero | Salvage is now reported as a live outage in those words, because that is what it is |
| `check_scripts_and_globals` matched `<script defer src="(data/` and index.html moved to `/data/` | The check silently matched **zero** script tags and passed every run while checking nothing. Caught by a human reading the regex, which is not a system. | `expect()` — every pattern-based check declares how many things it expects to find. Finding fewer is not a pass; it is the check declaring itself blind, and it fails the build. Verified against four separate silent-breakage scenarios. |

### D — verified in the wrong place

| What broke | What it cost | Now blocked by |
|---|---|---|
| `web/_redirects` was supposed to give every page a real URL. Its 37 exact rules proxied to `/index.html`, which Cloudflare canonicalises with a **308 to `/`**, so every page redirected to the homepage. Its six `/x/*` splat rules were not honoured at all, so the magazine reader, every section, every editor and every company dossier returned a hard **404** to anyone arriving from outside the app. | The entire real-URL migration was undone at the CDN. Four checks passed the whole time — every one of them read files in this repo. | `functions/[[path]].js` answers those URLs itself; `check_route_plumbing` reads ITS route lists and fails if `_redirects` reappears |
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
