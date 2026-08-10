# RTFCLMGZN Magazine Draft Runbook

You are running unattended, headless, once a month. You produce a **draft** issue only — you never
publish, and you never push to `main`. An issue ships only after the founder has looked at it, per
`agents/magazine/MAGAZINE-QA-GATE.md`.

Model: `claude-opus-4-8`, matching `agents/magazine/curation-editor.agent.md` ("you run on Opus
because curation IS the product"). It fires once a month; the better model is free at that cadence.

---

## READ THIS FIRST — the five ways the August 2026 run got it wrong

Issue 002's first attempt was rebuilt from scratch. Every failure was avoidable by reading something
that was already in the repo. Do not repeat them.

1. **It built to a page count from `MAGAZINE-STANDARD.md` without checking `qa_scan.py`.** The doc
   said 30–40; the enforced gate says 40–80. It shipped 40 pages against a 61-page predecessor.
   **The gate is the source of truth. When a doc and the gate disagree, believe the gate and fix
   the doc in the same run.**
2. **It invented copy budgets instead of measuring Issue 001.** Sixteen pages overflowed. The real
   budgets are now in `MAGAZINE-STANDARD.md` §5b, measured off 001. **Measure, don't estimate.**
3. **It never read the renderer.** It guessed field names, missed that `statFeature` needs `stats[]`,
   missed that gatefolds load pre-chopped `-1/-2` halves, and missed that `runover` sheets must not
   carry a title. **Read `spreadPageV3()` / `spreadPage()` / `featureText()` in `web/assets/app.js`
   before writing a single spread.** §14 of the standard lists the traps.
4. **It "verified" against a preview renderer it wrote itself.** That measures nothing. **Step 4
   below is the only audit that counts.**
5. **It put source links on the pages.** 152 of them, across 52 spreads. A magazine page carries
   reporting, not a bibliography — the grey link footer makes the page read like a web article, which
   is the one thing the whole standard exists to prevent. **Never put a `sources` array on a spread**
   (MAGAZINE-STANDARD Law 11; `qa_scan.py` now fails the build on it). The sourcing must still be real
   and checkable — it lives in the dated public archive, and that is where the reader gets pointed.

---

## 0. Kill switch and duplicate guard

- If `newsroom/runner/PAUSED` exists, log a no-op (Step 8) and stop.
- Target month = the calendar month that just finished. An issue dated August covers July with a
  look-ahead at August (MAGAZINE-STANDARD §11).
- If `web/data/issue-*-meta.js` already covers the target month, stop and log a no-op — unless a
  `magazine-draft-issue-<NNN>` branch exists, in which case **resume it** rather than starting over.

## 1. Read before writing (non-negotiable, in this order)

1. `agents/magazine/qa_scan.py` — the thresholds it enforces are the spec. Note the page range,
   the per-layout body ceilings, the item ceilings, and the image-uniqueness rule.
2. `web/assets/app.js` → `spreadPageV3`, `spreadPage`, `featureText` — the exact field contract per
   `kind` and per `layout`.
3. `agents/magazine/MAGAZINE-STANDARD.md` §5b (budgets), §13 (gatefolds), §14 (renderer traps).
4. The previous issue's payload in `functions/api/issue/_data/` — for voice, structure, and to
   pull its Prediction Ledger.

## 2. Curate (Curation Editor — `agents/magazine/curation-editor.agent.md`)

1. Read every article for the target month from `web/data/newsroom-articles.js`.
2. Score for significance-in-hindsight, development since publication, and cross-story connections.
   Real judgment, not a rubric.
3. **Grade the previous issue's pending predictions first, honestly, before writing anything else.**
   RIGHT / WRONG / still PENDING. A ledger that grades everything RIGHT is not a ledger. Then write
   5–7 new falsifiable calls, each with a date or a document that either appears or does not.
4. Pick the slate: a cover story with a real throughline, 4 acts, a timeline, a scoreboard, a
   compendium, the players grid. `newsroom/registry/agents.json` is the canonical roster — check
   `persona_count` before writing any count into copy.
5. **No `sources` on any spread** (Law 11). Write the reporting so the attribution is *in the prose*
   — "Hugging Face's own forensic writeup", "on Microsoft's fiscal fourth-quarter call" — which is how
   a magazine attributes anyway. The archive holds the links.
6. **Structure as multi-page FEATURES, not one-page summaries.** A feature opens on
   `posterTop`/`splitLeft`/`quoteLead` and continues across 1–3 `runover`/`runoverAlt` sheets sharing
   one `folio`. Depth over breadth: five stories at three pages each beats fifteen at one.

## 3. Build (Layout & Production — `agents/magazine/layout-production.agent.md`)

1. Metadata-only stub to `web/data/issue-<NNN>-meta.js`; the full spread payload to
   `functions/api/issue/_data/issue-<NNN>.json`. Never both — anything under `web/` is public forever.
2. **40–80 pages.** Aim high; 001 was 61 and 002 was 80. Do not pad — earn it with reporting.
3. Every page gets its own image. `qa_scan.py` fails the build on any filename used twice.
4. Art: write a scene-only prompt per page built from that page's own thesis (the house style is
   auto-appended by `gen_image.py` — adding style words causes drift). Then:
   `uv run --with pillow python agents/magazine/gen_issue_art.py <prompts.json>`
   which generates everything, skips what already exists, and runs the gatefold chop. **The chop is
   mandatory — the reader never loads a fold's base image.**
5. Build the PDF per §9 naming (`rtfclmgzn-issue-<NNN>-<month>-<year>.pdf`) into `web/magazine/`.
   If it isn't built, remove the `pdf:` field rather than shipping a dead download button.

## 4. Audit against the REAL reader (this is the step that was faked last time)

1. `uv run --python 3.12 python agents/magazine/qa_scan.py` — must exit 0. Never weaken a check to
   make it pass; if a threshold is genuinely wrong, prove it with a measurement and change it
   deliberately, in its own commit, with the reason written down.
2. Serve `web/` and open `#/read/issue-<NNN>` in a headless browser, stubbing
   `GET /api/issue/issue-<NNN>` to return `{ok:true,issue:{…}}`. Measure every `.mpage` for fill
   (<90% = void) and cutoff (element bottom past page bottom) at **1320×780, 860×1080, and
   1440×900**. Iterate until all three are clean.
3. **Audit the previous issue in the same harness as a control.** If both fail, the bug is in the
   renderer or stylesheet — fix it there, and do not cut good reporting to work around it. That
   comparison is how the `.tp-src` flex bug was found. Expect the two `mfoldhalf` second halves to
   read 0% fill in both issues; they are pure full-bleed art and that is an artifact, not a defect.
4. **What this step still cannot do:** judge whether a page is *beautiful*, whether the art drifted
   off house style, or whether the issue is monotonous. Numbers do not see those. Say so plainly in
   the note rather than implying the issue is signed off.

## 5. Stop. Do not publish.

- Do **not** merge to `main`, do **not** `git push origin main`, do **not** touch `index.html`'s
  cache-busters on `main`.
- Commit to a local branch `magazine-draft-issue-<NNN>` so the work survives and diffs cleanly.

## 6. Write the draft-ready note

`newsroom/releases/DRAFT-READY-issue-<NNN>.md`, in plain founder-facing language: the cover story and
why it won; page count against the 40–80 standard; how many images were generated and the metered
cost; which predictions were graded and how they scored; whether `qa_scan.py` passed; what the real-
reader audit found at each of the three window sizes; and — first line, boldest — **that a human
visual pass is still required**, with the command to view it (`agents/magazine/devserver.py`, never
bare `python -m http.server`) and the branch name.

If you changed anything outside the issue payload — a stylesheet fix, a gate threshold, a doc — list
it separately and say why. Those are the changes most likely to surprise someone.

## 7. Log it

Append one row to `web/data/usage-log-current.js`: `agent:"magazine-desk"`, `task_type:"magazine"`,
a real metered figure for images and `measured:"estimated"` for the subscription-run writing. Commit
on the draft branch — **do not** run the rebase-and-push sequence from `cycle-runbook.md`.

## 8. Always log the outcome, even on a no-op

If Step 0 stopped the run, still append a row saying so. This log is the only visibility into whether
the monthly draft ran at all — which is exactly how August 2026 went unnoticed until the 9th.

Then stop.
