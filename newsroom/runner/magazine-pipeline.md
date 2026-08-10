# RTFCLMGZN Magazine Pipeline Runbook

You are running **unattended and headless**, as one step of a six-day pipeline. You have **no memory
of the previous runs.** Everything the earlier phases learned is in a state file, and everything you
learn has to go back into it or it is gone.

You produce a **draft** issue only. You never publish, you never merge to `main`, you never
`git push origin main`. An issue ships only after the founder has looked at it, per
`agents/magazine/MAGAZINE-QA-GATE.md`.

Model: `claude-opus-4-8`, per `agents/magazine/curation-editor.agent.md` — "you run on Opus because
curation IS the product." It fires six times a month; the better model is affordable at that cadence.

---

## WHICH PHASE AM I? — read this first

**The phase you are running is the argument you were invoked with.** The launcher
(`RTFCLMGZN_MAGAZINE_PIPELINE.bat <phase>`) passes exactly one of:

| argument | day of month | what you do | section |
|---|---|---|---|
| `gather` | 25th, 26th, 27th | read the month so far, append to the dossier | **§G** |
| `curate` | 28th | pick the slate, grade last issue's predictions, write the page map | **§C** |
| `build`  | 29th | write the payload, the meta stub, the art manifest; generate all art | **§B** |
| `verify` | 30th (Feb: Mar 1) | qa_scan, real-reader audit with a control, fix, iterate, stop | **§V** |

If you were somehow launched without a phase argument, **stop and log it.** Do not guess a phase, and
do not "do the whole thing" — a single session trying to be all four phases is precisely the
single-shot design this pipeline replaced.

Do §0 (common preamble), then your phase's section, then §Z (common close). Skip the others.

### Where everything lives

| path | what it is |
|---|---|
| `newsroom/runner/magazine-pipeline.md` | this runbook — all four phases |
| `newsroom/runner/pipeline_state.py` | the state module (the pipeline's only memory) |
| `newsroom/runner/magazine-state/<YYYY-MM>.json` | the state file for this cycle |
| `newsroom/runner/PAUSED` | kill switch — if it exists, every phase no-ops |
| `RTFCLMGZN_MAGAZINE_PIPELINE.bat <phase>` | the launcher (one phase per firing) |
| `SETUP_MAGAZINE_PIPELINE.bat` | registers the six Scheduled Task firings |
| `agents/magazine/qa_scan.py` | the enforced gate — the actual spec |
| `agents/magazine/MAGAZINE-STANDARD.md` | the laws (§5b budgets, §13 folds, §14 traps, Law 11) |
| `agents/magazine/LESSONS.md` | symptom / root cause / enforced check, per past failure |
| `agents/magazine/gen_issue_art.py` | art runner — generates every image, then chops the folds |
| `agents/magazine/fold_chop.py` | the gatefold chopper |
| `agents/magazine/audit_real.py` | the headless real-reader audit harness |
| `agents/magazine/devserver.py` | local preview that can serve a PAID issue |
| `functions/api/issue/_data/issue-NNN.json` | the full spread payload (never under `web/`) |
| `web/data/issue-NNN-meta.js` | the public metadata stub |

---

## §0. Common preamble — every phase does this, in this order

1. **Kill switch.** If `newsroom/runner/PAUSED` exists, log a no-op and stop. (The `.bat` also checks
   this before launching you; both checks exist on purpose.)

2. **Load the state.** This is the pipeline's only memory across days:

   ```
   uv run --python 3.12 python newsroom/runner/pipeline_state.py show
   ```

   The file is `newsroom/runner/magazine-state/<YYYY-MM>.json`, keyed by the **cycle month** — the
   month being drafted, which is the month you are standing in (runs on the 1st–4th belong to the
   previous month's cycle, because February's VERIFY lands on March 1). Import it for real work:

   ```python
   import sys; sys.path.insert(0, "newsroom/runner")
   import pipeline_state as ps
   st = ps.load()
   ```

3. **Check your prerequisite and honour the answer.**

   ```python
   if not ps.assert_prerequisite(st, "<your phase>"):
       ps.save(st)          # the refusal is now in the state log
       sys.exit(0)          # stop. Do not proceed.
   ps.start_run(st, "<your phase>")
   ps.save(st)
   ```

   `assert_prerequisite` refuses in three situations and each refusal is real:
   - **your phase already completed this cycle** — you are a duplicate firing (a Windows catch-up
     trigger, or the February fallback task). No-op and stop.
   - **an earlier phase has not completed** — stop. **Especially: if GATHER did not run, CURATE does
     not improvise.** Do not read the article feed and produce a slate anyway. A slate with no three
     passes behind it has no significance-in-hindsight scoring, no cross-story connections and no
     prediction evidence, and it will look exactly like a real one, which is what makes it dangerous.
     Log the refusal (the module already does) and stop, leaving the month to a human.
   - **GATHER has all 3 passes** — nothing left to gather.

4. **Read before writing (non-negotiable, in this order).** BUILD and VERIFY must do all four; GATHER
   and CURATE must do 1, 3 and 4.

   1. `agents/magazine/qa_scan.py` — **the thresholds it enforces are the spec.** Page range,
      per-layout body ceilings, item ceilings, image uniqueness, gatefold rules, the `sources` ban.
   2. `web/assets/app.js` → `spreadPageV3`, `spreadPage`, `featureText` — the exact field contract per
      `kind` and per `layout`. Read the renderer, do not infer it from the last issue's JSON.
   3. `agents/magazine/MAGAZINE-STANDARD.md` §5b (measured copy budgets), §13 (gatefolds), §14
      (renderer traps), Law 11 (no sources on pages).
   4. The previous issue's payload in `functions/api/issue/_data/` — for voice, structure, and its
      Prediction Ledger.

5. **The five standing laws of this pipeline.** These are the mistakes that already cost a rebuild.
   They are repeated in every phase's section because a headless session reads one section.

   - **The gate is the source of truth.** When `MAGAZINE-STANDARD.md` and `qa_scan.py` disagree,
     believe `qa_scan.py` and fix the doc in the same run. The doc said 30–40 pages; the gate says
     40–80; an issue was built to 40 and had to be rebuilt to 80.
   - **Measure, don't estimate.** Copy budgets come from measuring the previous issue, and they are
     already written down in §5b. Inventing them is how sixteen pages shipped overflowing.
   - **Read the renderer before writing spreads.** `statFeature` needs `stats[]` of 3; `runover` must
     carry no `title`; `photo`/`resources` take `body` as a STRING and everything else takes an array;
     gatefolds load pre-chopped `-1`/`-2` halves and never the base image.
   - **Audit against the real reader, with the previous issue as a control.** A preview renderer you
     wrote yourself measures nothing. If the current issue and the control both fail, the bug is in
     the stylesheet or the renderer — fix it there, do not cut good reporting around it.
   - **No sources on pages (Law 11).** Never put a `sources` array on a spread. Attribution goes in
     the prose ("Hugging Face's own forensic writeup"); the links live in the dated public archive.
     `qa_scan.py` fails the build on it.

6. **File handling.** Everything is UTF-8. Write files with Python (`open(..., encoding="utf-8")`) or
   the Write/Edit tools. **Never edit repo files with PowerShell `Get-Content`/`Set-Content`** — it
   silently mangles the em-dashes, curly quotes and ◈ glyphs this repo is full of, and the damage
   shows up pages later as mojibake nobody can trace back.

---

## §G. GATHER — the 25th, 26th and 27th (three passes)

**Goal:** by the end of the 27th, the dossier contains everything CURATE needs, and CURATE does not
have to re-read the month.

You are one of three passes. `len(st["dossier"]["passes"])` tells you which. **The reason this runs
three times is late-breaking news:** a story that lands on the 27th is still in the dossier before the
slate is picked on the 28th, and a story that looked big on the 25th has usually developed by the 27th
into something either much bigger or much smaller. That development *is* the reporting.

### What to do

1. **Read the previous passes first** (`st["dossier"]`). Pass 2 and pass 3 exist to *extend and
   revise*, not to redo. Start from `st["dossier"]["gaps"]` — the open questions the last pass left
   you — and chase those first.

2. **Read the month's articles so far** from `web/data/newsroom-articles.js` (plus `live-articles.js`
   and `buzz.js` where relevant). On pass 1 read the whole month to date. On passes 2 and 3, read
   everything published since the last pass's `window`, **and** re-check the existing candidates for
   developments.

3. **Score every candidate for significance-in-hindsight** — not "was this popular", but "will this
   matter when someone reads it in six months". Real judgment, not a rubric. Record *why*. A candidate
   whose score changed between passes should say so; that movement is the most useful thing in the
   dossier.

4. **Find cross-story connections.** The throughline is what makes it a magazine instead of a list.
   Name the connection, list the stories it spans, state the thesis in one sentence.

5. **Carry the previous issue's pending predictions forward and gather evidence for them.** Read the
   previous issue's Ledger out of `functions/api/issue/_data/` and `web/data/predictions.js`. For each
   pending call, record any evidence that would grade it and which way it leans. **You do not grade
   them — CURATE does.** You supply the evidence so the grading on the 28th is honest rather than
   reconstructed from memory.

6. **Write down what is still missing.** Stories you expect to break before the month ends, numbers
   you could not confirm, a company that has not reported yet. The next pass reads this first.
   Pass 3's gaps become CURATE's known unknowns — say plainly what the issue will not be able to cover.

7. **Append the pass and save.**

   ```python
   ps.append_gather_pass(st, {
       "window": "2026-08-01 .. 2026-08-25",
       "candidates": [{"slug": ..., "headline": ..., "published": ...,
                       "significance": 1-10, "why": "...", "developments": "..."}],
       "connections": [{"name": ..., "stories": [...], "thesis": "..."}],
       "predictions": [{"prediction": ..., "evidence": ..., "leaning": "right|wrong|open"}],
       "pending_predictions": [...],     # pass 1 only, straight from the last Ledger
       "gaps": ["..."],
       "notes": "prose the curator will actually read",
   })
   ps.mark_phase_complete(st, "gather", summary="pass N of 3")
   ps.save(st)
   ```

   The module merges candidates and connections across passes (de-duplicated on `slug`/`name`) so
   CURATE reads one accumulated view. `gaps` is replaced each pass, deliberately — a filled gap is not
   a gap, and a stale gap list sends the curator chasing ghosts.

   **GATHER only becomes `complete` on the third pass.** Passes 1 and 2 finish their run without
   completing the phase, and CURATE knows the difference.

8. **Do not write any issue files.** No payload, no page map, no art prompts, no branch. GATHER
   touches the state file and nothing else in the repo.

---

## §C. CURATE — the 28th

**Prerequisite: GATHER complete, all three passes.** If it is not, you already stopped in §0.3. Do not
work around it.

### What to do

1. **Read the whole dossier.** `st["dossier"]` — every pass, all candidates, all connections, all
   prediction evidence, and pass 3's gaps. This is your input. You may re-read specific articles to
   check a fact; you do not re-do the gathering.

2. **Grade the previous issue's pending predictions first, before writing anything else.**
   RIGHT / WRONG / still PENDING, against the evidence GATHER collected. **A ledger that grades
   everything RIGHT is not a ledger** — if nothing was wrong, the calls were not falsifiable and you
   should say that. Then write **5–7 new falsifiable calls**, each resolvable by a specific date or a
   specific document that either appears or does not.

3. **Pick the slate and the arc.** A cover story with a real throughline, four acts, a timeline, a
   scoreboard, a compendium, the players grid. Structure as multi-page **features**, not one-page
   summaries: a feature opens on `posterTop` / `splitLeft` / `quoteLead` and continues across 1–3
   `runover` / `runoverAlt` sheets sharing one `folio`. Depth over breadth — five stories at three
   pages each beats fifteen at one. `newsroom/registry/agents.json` is the canonical roster; check
   `persona_count` before writing any count into copy (`qa_scan.py` check 1 fails on a stale one).

4. **Resolve the issue identity.** Next issue number, id (`issue-NNN`), title, dateline per
   MAGAZINE-STANDARD §11 (recap of the month just covered + a look-ahead), the previous issue's id
   (VERIFY needs it as the audit control), and the branch name `magazine-draft-issue-NNN`.

5. **Write the page map.** Every page: number, `kind`, `layout`, `folio`, working title, and which
   feature it belongs to. Build it to what `qa_scan.py` enforces, not to what any doc says:
   - **40–80 pages.** Aim high — 001 was 61, 002 was 80. Do not pad; earn it with reporting.
   - **4–6+ ad pages** at real positions (§4).
   - **Exactly one `centerfold` and exactly one `verticalfold`** (§13).
   - **No two adjacent text spreads share a layout** (Law 3).
   - Never more than two consecutive heavy reading pages (Law 8).
   - **Copy budget per page from §5b, measured off the previous issue** — write the budget into the
     page map so BUILD writes to a number instead of guessing. Re-measure against the actual previous
     issue payload if the layouts have changed; record which issue you measured in
     `slate.budget_source`.

6. **No `sources`, anywhere.** Write the reporting so the attribution is *in the prose* — that is how
   a magazine attributes anyway. Do not write copy that promises the reader a citation on the page.

7. **Save everything into the state.** BUILD reads this and nothing else of yours:

   ```python
   ps.set_issue(st, number=..., id="issue-NNN", title=..., dateline=...,
                prev_id="issue-NNN-1", branch="magazine-draft-issue-NNN")
   ps.set_slate(st, cover_story=..., arc=..., features=[...],
                graded_predictions=[...], new_predictions=[...],
                page_map=[...], target_pages=NN, budget_source="issue-NNN-1")
   ps.mark_phase_complete(st, "curate", summary="cover: ...; NN pages planned")
   ps.save(st)
   ```

8. **Do not write the payload and do not generate art.** That is BUILD's job tomorrow. CURATE writes
   the state file only.

---

## §B. BUILD — the 29th

**Prerequisite: CURATE complete.** The slate and page map are in `st["slate"]`; the issue identity is
in `st["issue"]`. You do not re-curate. If the plan has a problem, fix the plan *and record the fix in
the state log* — do not silently substitute your own slate.

### What to do

1. **Read the renderer before writing a single spread** (§0.4.2). This is the step that got skipped and
   cost a full rebuild. Confirm, in `web/assets/app.js`, for every `kind`/`layout` in the page map:
   the field names, which take `body` as an array vs a string, what `close()` appends, and how
   `spreadPageV3` builds a gatefold.

2. **Write the payload and the stub — never both in one place.**
   - Full spread payload → `functions/api/issue/_data/issue-NNN.json`
   - Metadata-only stub → `web/data/issue-NNN-meta.js`

   **Anything under `web/` is public forever.** The pages of a paid issue must not exist anywhere
   under `web/`. Wire the meta stub into `index.html` the way `issue-002-meta.js` is wired.

3. **Write to the measured budgets** (§5b, and the per-page budgets CURATE put in the page map).
   When a lead page runs long, **move the excess into its runover** — that is what a continuation
   sheet is for — rather than deleting reporting. Ceilings that `qa_scan.py` enforces:
   `posterTop` 155, `splitLeft`/`splitRight` 150, `quoteLead` 145, `statFeature` 150, `bottomImage`
   125, `cornerCard` 120, `fullBleed` 110, `overlay` 135, `runover`/`runoverAlt` 375. Structured
   pages: `list` ≤ 9 items, `faceoff` ≤ 6 rows (portrait is the binding case).

4. **Renderer traps to check as you write** (§14): `statFeature` needs `stats[]` of 3;
   `runover`/`runoverAlt` carry **no** `title`; `photo` and `resources` take `body` as a STRING and
   every other kind takes an array; every text page except `runover` carries an `image`; every page's
   image filename is **unique** across the issue (`qa_scan.py` fails on any reuse); **no `sources` on
   any spread.**

5. **Write the art prompt manifest** — a JSON array of `{"file", "ratio", "prompt"}`, one entry per
   page, `file` a bare filename that lands in `web/assets/img/`. Write it to
   `agents/magazine/art-prompts-issue-NNN.json` and record the path in the state.
   - Each prompt is **scene-only**, built from that page's own thesis. The house style is
     auto-appended by `gen_image.py`; adding style words causes drift.
   - **Centerfold: generate at `3:2`** (two 3:4 pages side by side is exactly 3:2 — no crop).
     **Verticalfold: generate at `9:16`**, which the chopper centre-crops on the WIDTH to 3:8 so the
     whole top-to-bottom progression survives.
   - Both fold prompts must end with: *"One single continuous asymmetric cinematic scene, clearly NOT
     symmetrical, NOT mirrored, no repeated or duplicated halves."* A mirrored fold has been rejected
     before and will be again.

6. **Generate the art.**

   ```
   uv run --with pillow python agents/magazine/gen_issue_art.py agents/magazine/art-prompts-issue-NNN.json
   ```

   It generates every image, **skips what already exists** (so a run interrupted half way resumes
   instead of paying twice), and **runs the gatefold chop**. If it exits non-zero, re-run the exact
   same command — it retries only the failures. The chop is **mandatory**: `spreadPageV3()` loads
   `<name>-1.jpg` and `<name>-2.jpg` and never the base image, so skipping it renders both fold pages
   as broken images. `qa_scan.py` now checks the halves exist on disk.

   If the fold base images are not named the two filenames `gen_issue_art.py` chops
   (`i2-centerfold.jpg`, `i2-verticalfold.jpg` as written), either name them to match or run
   `fold_chop.py <image> center|vertical` yourself — and **eyeball the halves**: if left/right (or
   top/bottom) look like reflections of each other, regenerate.

7. **PDF** per §9 naming (`rtfclmgzn-issue-NNN-<month>-<year>.pdf`) into `web/magazine/`. If it is not
   built, **remove the `pdf:` field** rather than shipping a dead download button.

8. **Commit to the draft branch** `magazine-draft-issue-NNN` — local only. Never merge, never push to
   `main`, never touch `index.html`'s cache-busters on `main`.

9. **Save the state.**

   ```python
   ps.set_art(st, manifest_path=..., run_manifest_path="web/assets/img/_issue-art-manifest.json",
              images_planned=N, images_generated=N, images_failed=[...], cost_usd=X.XX,
              gatefolds_chopped=True, payload_path=..., meta_path=...)
   ps.mark_phase_complete(st, "build", summary="NN pages, NN images, $X.XX")
   ps.save(st)
   ```

10. **Do not run the audit and do not write the draft-ready note.** VERIFY does both tomorrow, with
    fresh eyes and a control.

---

## §V. VERIFY — the 30th (February: March 1)

**Prerequisite: BUILD complete.** Paths are in `st["art"]`; the control issue id is
`st["issue"]["prev_id"]`.

### What to do

1. **Run the enforced gate.**

   ```
   uv run --python 3.12 python agents/magazine/qa_scan.py
   ```

   It must exit 0. **Never weaken a check to make it pass.** If a threshold is genuinely wrong, prove
   it with a measurement, change it deliberately in its own commit, and write down the reason. Record
   `ps.record_audit`-style into `st["audit"]["qa_scan"]` = `{"exit": rc, "problems": N}`.

   Note what this gate does *and does not* cover: since paid issues moved to
   `functions/api/issue/_data/`, section 10 of `qa_scan.py` is the only part that scans the actual
   issue content. Everything before it globs `web/data/*.js`. If you add a new content location, add
   it to the gate in the same run.

2. **Audit against the REAL reader.** This is the step that was faked once and must never be faked
   again. Serve `web/` and open `#/read/issue-NNN` in a headless browser, stubbing
   `GET /api/issue/issue-NNN` to return `{ok:true,issue:{…}}` and `GET /api/auth/me` to return a Plus
   session — `agents/magazine/audit_real.py` is that harness. **Use it.** If it is pointing at a
   previous issue's id or a scratch path, change the id and the paths; do not write a new one, and do
   not inline a quick measurement of your own. Measure **every `.mpage`** for:
   - **fill** — `< 90%` is a void (Law 1)
   - **cutoff** — any element bottom past the page bottom, `> 4px` is a cutoff (Law 2)

   at **1320×780, 860×1080 and 1440×900**. All three. Record each with
   `ps.record_audit(st, "1440x900", {"pages": N, "void": N, "cutoff": N})`.

   **Never audit against a preview renderer you wrote yourself.** It measures your assumptions, not
   the site.

3. **Audit the PREVIOUS issue in the same harness, as a control**
   (`ps.record_audit(..., control=True)`). This is not optional and it is not busywork: the `.tp-src`
   flex bug was found exactly this way. **If both issues fail the same page kind, the bug is in the
   renderer or the stylesheet — fix it there**, and do not cut good reporting to work around a CSS
   defect. If only the new issue fails, it is the copy or the data.

   Expect the two `mfoldhalf` second halves to read 0% fill in **both** issues — they are pure
   full-bleed art. That is an artifact of the measurement, not a defect. Do not "fix" it.

4. **Fix and iterate.** Cut copy to the §5b budgets (moving excess into runovers, not deleting
   reporting), correct the data, or fix the stylesheet if the control proves it is renderer-side.
   Re-run steps 1–3. Record each round in `st["audit"]["iterations"]` with what was fixed and what
   remained. Keep going until qa_scan exits 0 and all three windows are clean, or until you are
   genuinely stuck — in which case say so plainly rather than declaring victory.

5. **Write the draft-ready note** to `newsroom/releases/DRAFT-READY-issue-NNN.md`, in plain
   founder-facing language:
   - **First line, boldest: a human visual pass is still required.** With the command to view it —
     `uv run --python 3.12 python agents/magazine/devserver.py`, **never bare `python -m http.server`**
     (a plain static server cannot answer `/api/issue/<id>`, so a paid issue shows the upsell instead
     of the issue, and it will happily serve yesterday's cached `app.js` next to today's data) — and
     the branch name.
   - The cover story and why it won.
   - Page count against the 40–80 standard.
   - How many images were generated and the metered cost.
   - Which predictions were graded and how they scored — including the ones graded WRONG.
   - Whether `qa_scan.py` passed.
   - What the real-reader audit found at each of the three window sizes, and what the control showed.
   - **What this pipeline still cannot judge:** whether a page is *beautiful*, whether the art drifted
     off house style, whether the issue is monotonous. Numbers do not see those. Say it plainly rather
     than implying the issue is signed off.
   - Anything you changed **outside** the issue payload — a stylesheet fix, a gate threshold, a doc —
     listed separately with the reason. Those are the changes most likely to surprise someone.

6. **Record any new lesson** in the shape LESSONS.md uses:

   ```python
   ps.add_lesson(st, symptom="...", cause="...", check="what now prevents it", phase="verify")
   ```

   A lesson without an **enforced check** is a wish. If the check does not exist yet, write it — into
   `qa_scan.py`, into the audit, or into this runbook — in the same run, and say where it lives.

7. **Stop. Do not publish.** No merge to `main`, no `git push origin main`, no cache-buster edits on
   `main`. Commit on `magazine-draft-issue-NNN` so the work survives and diffs cleanly.

   ```python
   ps.set_art(st)   # nothing to change; just save
   st["audit"]["note_path"] = "newsroom/releases/DRAFT-READY-issue-NNN.md"
   st["audit"]["clean"] = ps.audit_clean(st)
   ps.mark_phase_complete(st, "verify", summary="qa 0, three windows clean, note written")
   ps.save(st)
   ```

---

## §Z. Common close — every phase does this

1. **Save the state.** Every phase. Even a no-op. `ps.save(st)` is atomic — a crash cannot corrupt it,
   but a run that never calls it loses everything it learned.

2. **Append one row to `web/data/usage-log-current.js`:** `agent:"magazine-desk"`,
   `task_type:"magazine"`, the phase name, a real metered figure for images (BUILD) and
   `measured:"estimated"` for the subscription-run writing. Commit on the draft branch — **do not**
   run the rebase-and-push sequence from `cycle-runbook.md`.

3. **Log the outcome even on a no-op.** If §0 stopped you — PAUSED, duplicate firing, missing
   prerequisite — still append a usage row saying so. This log is the only visibility into whether the
   pipeline ran at all, which is exactly how a missed monthly draft went unnoticed until the 9th.

4. **Never publish.** No phase of this pipeline ships an issue. That is a human decision.

Then stop.
