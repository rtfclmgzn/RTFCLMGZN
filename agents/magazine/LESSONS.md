# RTFCLMGZN Magazine — Lessons

Every entry here cost a rebuild, a founder catch, or a shipped defect. They are written in one shape,
always:

> **Symptom** — what it looked like from the outside.
> **Root cause** — what was actually wrong, which is never what it looked like.
> **Enforced check** — the thing that now *fails a build* if it happens again.

**A lesson without an enforced check is a wish.** If you learn something new during a run and there is
no check for it yet, write the check in the same run — into `agents/magazine/qa_scan.py`, into the
audit, or into `newsroom/runner/magazine-pipeline.md` — and say where it lives. Then record it here
and in the cycle's state file:

```python
import sys; sys.path.insert(0, "newsroom/runner")
import pipeline_state as ps
st = ps.load()
ps.add_lesson(st, symptom="...", cause="...", check="...", phase="verify")
ps.save(st)
```

Seeded 2026-08-10 from the Issue 002 rebuild.

---

## 1. The page-count doc contradicted the enforced gate

**Symptom.** Issue 002 was built to 40 pages and read thin next to its 61-page predecessor. It had to
be rebuilt from scratch to 80.

**Root cause.** `MAGAZINE-STANDARD.md` Law 7 said "30–40 pages". `qa_scan.py` check 8 said
`if pages < 40: THIN ISSUE` with a target of 40–80. The doc and the gate had disagreed for a month and
the build followed the doc, because the doc is the thing that reads like a specification. Nobody had
noticed because nothing compared them.

**Enforced check.** `qa_scan.py` fails on `pages < 40` **and** on `pages > 80`, and it is the only
number that counts. Law 7 now carries the range *and* the story of this failure, so the next reader
sees why. The pipeline runbook makes it a standing law in §0.5 and repeats it in CURATE and BUILD:
**when a doc and the gate disagree, believe the gate and fix the doc in the same run.**

---

## 2. Copy budgets were invented instead of measured

**Symptom.** Sixteen pages overflowed on the first real audit — text running past the bottom of the
sheet on layout after layout.

**Root cause.** The build estimated how much copy each layout could hold. Nobody measured Issue 001,
which renders with zero cutoffs and had the real answer sitting in it the whole time. The estimates
were plausible and roughly 20–40% too generous, which is the worst kind of wrong: not obviously
broken, just broken everywhere.

**Enforced check.** The measured budgets live in `MAGAZINE-STANDARD.md` §5b (posterTop 110–150/155,
splitLeft/splitRight 125–140/150, quoteLead 125–140/145, statFeature 125–145/150, bottomImage
105–120/125, cornerCard 100–115/120, fullBleed 95–105/110, overlay 110–130/135, runover 240–320/375,
letter 165–185/190) and are enforced per-spread by `qa_scan.py`'s `BODY_CEIL` map, plus a `THIN_MIN`
floor of 95 words on split and statFeature pages so a page cannot void either. Structured pages have
measured ceilings too: `list` ≤ 9 items, `faceoff` ≤ 6 rows — portrait is the binding case. CURATE now
writes the per-page budget into the page map so BUILD writes to a number rather than a feel.

---

## 3. The renderer contract was never read

**Symptom.** Pages that threw, `statFeature` pages with an empty giant-number row at the foot,
continuation sheets carrying headlines, gatefolds rendering as broken images.

**Root cause.** The field names were inferred from the previous issue's JSON instead of read out of
`spreadPageV3()` / `spreadPage()` / `featureText()` in `web/assets/app.js`. Inference gets the common
case right and every special case wrong, and the special cases are where the renderer has no
fallbacks.

**Enforced check.** `qa_scan.py` structurally validates the contract on the parsed payload:
`statFeature` without `stats[]` fails; `runover`/`runoverAlt` carrying a `title` fails; `photo` and
`resources` whose `body` is not a STRING fails, and `text` whose `body` is not a LIST fails; a text
page without an `image` fails. The pipeline runbook makes "read the renderer before writing a single
spread" a blocking step in BUILD, and §14 of the standard lists the traps that data alone cannot fix.

---

## 4. "Verification" ran against a preview renderer we wrote ourselves

**Symptom.** An issue was declared audited and clean. It was neither. The real reader showed voids and
cutoffs on pages the "audit" had passed.

**Root cause.** A custom preview HTML renderer was written to look at the issue, and then measured.
It re-implemented the layout, so what it measured was the assumptions in the preview script — not the
stylesheet, not `app.js`, not the actual site. A self-written renderer agrees with you by
construction.

**Enforced check.** The only audit that counts serves the real `web/` tree, loads the real
`index.html` and the real `app.js`, stubs `GET /api/issue/<id>` and `GET /api/auth/me` so a paid issue
opens, and measures every `.mpage` the site actually paints — `agents/magazine/audit_real.py`. Three
window sizes, all of them: **1320×780, 860×1080, 1440×900**. Fill `< 90%` is a void; element bottom
more than 4px past the page bottom is a cutoff. The VERIFY phase of the runbook says it plainly:
never audit against a preview renderer you wrote yourself, and use `audit_real.py` rather than
rewriting it. Local viewing uses `agents/magazine/devserver.py`, never bare `python -m http.server` —
a plain static server cannot answer `/api/issue/<id>`, so a paid issue shows the upsell instead of the
issue, and it will serve a cached `app.js` next to today's data.

---

## 5. Source links were printed on magazine pages

**Symptom.** 152 source links across 52 spreads. The pages read like web articles — a grey link footer
under the reporting, which is the exact thing the entire standard exists to prevent. All of them were
stripped before the issue shipped.

**Root cause.** Web-article habits carried into magazine layout. Sourcing has to be real and
checkable, and the build reached for the mechanism it knew — a `sources` array on the spread — rather
than the one a magazine actually uses, which is attribution inside the prose.

**Enforced check.** Law 11: **a spread must never carry `sources`.** `qa_scan.py` fails the build on
any spread with a `sources` key, naming the spread index. Attribution lives in the sentence ("Hugging
Face's own forensic writeup", "on Microsoft's fiscal fourth-quarter call") and the links live in the
dated public archive, which is where a reader wanting the receipt is pointed. The runbook also
forbids writing copy that *promises* the reader a citation on the page.

---

## 6. The `.tp-src` flex bug — found only because the previous issue was audited as a control

**Symptom.** Split pages overflowed by ~2,600px. It presented exactly like a copy-length problem, so
the first response was to cut copy. Cutting copy did not fix it: **any** `splitLeft`/`splitRight` page
carrying `sources` overflowed no matter how short the body was.

**Root cause.** `featureText()`'s `close()` appends the sources footer as the last child of the page
element. On a split layout that element is `display:flex; flex-direction:row`, so the footer became a
third flex column and crushed the text column from ~333px to ~67px. Issue 001 page 25 had shipped
with this defect months earlier and nobody knew, because nobody had ever measured a shipped issue.

**Enforced check.** The `V-FIX` block at the foot of `styles.css` pins `.tp-src` out of the flex row.
More importantly, the *method* is now mandatory: **VERIFY audits the previous issue in the same
harness as a control.** If the new issue and the control fail the same page kind, the bug is in the
renderer or the stylesheet — fix it there and do not cut good reporting to work around a CSS defect.
If only the new issue fails, it is the copy or the data. (Known artifact: the two `mfoldhalf` second
halves read 0% fill in both issues; they are pure full-bleed art. Do not "fix" that.) And the general
rule from §14: if you add a new flex-row page kind, check what `close()` appends to it.

---

## 7. Gatefolds shipped without the chop step

**Symptom.** Both gatefolds rendered as two broken-image pages — four dead pages in the middle of the
issue, including the centerfold.

**Root cause.** The art was generated as one wide image and the build stopped there.
`spreadPageV3()` never loads a gatefold's base image; it loads two pre-cut halves, `<name>-1.jpg` and
`<name>-2.jpg`, each full-bleed on its own normal 3:4 page. The chop is a separate step and it looks
optional. It is not.

**Enforced check.** `qa_scan.py` requires exactly one `centerfold` and one `verticalfold`, each with a
real `image`, `title` and `cap`, **and checks both `-1.jpg` and `-2.jpg` halves exist on disk in
`web/assets/img/`**. `gen_issue_art.py` runs `fold_chop.py` automatically at the end of every art run
so the chop cannot be forgotten. The ratio arithmetic is written down because it is not obvious: two
3:4 pages side by side are exactly **3:2**, so a centerfold is generated at 3:2 and splits with no
crop; stacked they are **3:8**, which no generator offers, so a verticalfold is generated at **9:16**
and the chopper centre-crops the WIDTH down to 3:8 — deliberately, to preserve the whole
top-to-bottom progression. Related hard rule (N-016): a fold must be **one continuous asymmetric
scene**, never mirrored; every fold prompt ends with the anti-mirror sentence, and the halves get
eyeballed.

---

## 8. `qa_scan.py` was not scanning the paid issue payloads at all

**Symptom.** The gate ran clean on issues that had real defects in them. Every check appeared to pass
while the actual magazine content was never examined.

**Root cause.** Every check in the file globbed `web/data/*.js`. When paid issues moved their pages
out of `web/` and into `functions/api/issue/_data/<id>.json` — correctly, because anything under
`web/` is public forever — the content moved out from under the gate and nothing noticed.
`issue-001.json` and `issue-002.json` were invisible to it. Worse, the `*-meta.js` stubs left behind
still declared `format:"spread"`, so the gatefold and page-count checks fired on metadata that could
never satisfy them, and the gate cried wolf on every run — which is how a gate ends up ignored.

**Enforced check.** Section 10 of `qa_scan.py` (added 2026-08-10) parses every
`functions/api/issue/_data/issue-*.json` and runs the whole structural suite against it: page count
40–80, image uniqueness, marker balance, placeholder leaks, ad-page count, gatefold count and halves
on disk, adjacent-layout repeats, body type per kind, the §5b copy ceilings and thin-copy floor,
`statFeature` stats, runover titles, list/faceoff item ceilings, and the `sources` ban. `_issue_js_files()`
now excludes `*-meta.js` so the metadata stubs stop generating unsatisfiable failures. Standing rule:
**if you move content to a new location, add that location to the gate in the same commit** — a gate
that scans the wrong path is worse than no gate, because it reports success.

---

## 9. File edits through PowerShell silently mangled the text

**Symptom.** Mojibake appearing in shipped copy — em-dashes, curly quotes and the ◈ decor glyph
turning into garbage — often noticed pages away from the edit that caused it.

**Root cause.** `Get-Content` / `Set-Content` round-trip through the console's active codepage rather
than UTF-8, so any non-ASCII character in a file that was merely *passed through* an edit came out
corrupted. Nothing errors; the file just quietly changes.

**Enforced check.** Repo files are edited with Python (`open(..., encoding="utf-8")`) or the Write/Edit
tools, never with PowerShell `Get-Content`/`Set-Content`. The pipeline runbook states it in §0.6 as a
standing rule for every phase, and every tool in `agents/magazine/` reads and writes with an explicit
`encoding="utf-8"`.
