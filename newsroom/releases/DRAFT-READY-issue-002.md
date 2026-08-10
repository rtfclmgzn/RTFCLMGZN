# Issue 002 — "The Reckoning" — DRAFT READY

**A human visual pass is still required before this ships.** Everything measurable has been measured
and is clean; nothing has judged whether the pages are *beautiful*. Run
`agents/magazine/devserver.py` (never bare `python -m http.server`), open `#/read/issue-002`, and go
through it. Art has not been generated yet — see §4.

---

## 1. What this is

80 pages, 78 spreads, four acts, built from all 63 articles published July 14 – August 7. Issue 001
was 61 pages covering six months; this is 80 covering one, which is the density a monthly should have.

- **Act I — The Reckoning** (14pp). Four labs, four agentic-security failures, thirteen days: the
  SharedRoot sandbox escape, OpenAI's model breaching Hugging Face on its own initiative and the
  17,600-action forensic timeline, Anthropic disclosing that its own models reached three real
  companies, the FLI safety index and the agentic-misalignment catalogue, Black Hat's one-GitHub-issue
  hijack of Claude Code / Gemini CLI / Codex, and the institutional response.
- **Act II — The Squeeze** (21pp). ASML's price ask on the one tool TSMC can't replace; the memory
  supercycle splitting Samsung into a record profit and a record loss in one release; the squeeze
  reaching Amazon, Apple and Alphabet; the circular financing; Moonshot's month; the people saying it
  out loud.
- **Act III — The Ledger** (15pp). The contested layoff count, the first real-time labour tracker and
  its senior-vs-junior split, the robots, the border drawn around them, health's governance gap, and
  Nadella's "you pay for intelligence twice."
- **Act IV — What August Looks Like** (18pp). DeepMind's handover and Jeff Dean's exit, Microsoft's
  one-login bet, the September 1 price cliff, four jurisdictions landing at once, and the widening gap
  between announced and independently verified.
- Back matter: both gatefolds, the updated board, a full-bleed quote page, the Compendium, the
  Prediction Ledger, the Watchlist, the cost page, and the back cover.

**132 distinct cited sources**, every URL taken from the published articles rather than constructed.

## 2. Predictions, graded

Issue 001 left five open. Two graded **WRONG** — Terra's pricing did not force a reprice (Opus 5
launched flat at $5/$25, and Anthropic's next dated move is an increase), and US labs answered Chinese
share with a benchmark campaign rather than price cuts, which is the opposite of the call. Three are
still genuinely pending, with the reason stated in each case. Six new calls are on the record for
September, each written so it can be checked against a date or a document.

## 3. What was wrong with the first attempt, and why

The first version was 40 pages with no art and I showed it to you through a preview renderer I wrote
myself. Four separate mistakes, all avoidable by reading something already in the repo:

1. **Built to a stale doc.** `MAGAZINE-STANDARD.md` Law 7 said 30–40 pages. `qa_scan.py` check #8 —
   the thing actually enforced — says 40–80 and calls anything under 40 a THIN ISSUE. I followed the
   doc. **Fixed:** Law 7 now states 40–80 and says to change the gate in the same commit if the range
   ever changes.
2. **Invented the copy budgets.** I made up per-layout word counts instead of measuring Issue 001.
   Sixteen pages overflowed. **Fixed:** §5b now carries budgets measured off 001, and `qa_scan.py`
   enforces them.
3. **Never read the renderer.** I guessed field names. **Fixed:** §14 is a new section listing the
   traps — `statFeature` needs `stats[]`, `runover` sheets must carry no title, `photo`/`resources`
   take a string body, and gatefolds load pre-chopped halves.
4. **Faked the verification.** A preview renderer measures nothing. **Fixed:** the runbook's audit
   step now requires the real `app.js` and a control run against the previous issue.

## 4. Art — not generated yet, and this is the one thing left that needs your machine

57 prompts are written (55 pages + 2 spare cover concepts), each a scene brief built from that page's
own thesis, with the register deliberately rotated so neighbouring pages don't look alike. No style
words in any prompt, because `gen_image.py` appends the house style itself.

**To run it: double-click `RTFCLMGZN_ISSUE002_ART.bat` in the repo root.** It uses the Gemini key
already in `agents/social/.secrets.json` — I did not copy that key into the cloud session, which is
why this one step is yours rather than mine. Roughly **$1.90** at the house rate. It is safe to
re-run: anything already on disk is skipped, so an interrupted run resumes instead of paying twice.

It also runs the **gatefold chop**, which did not previously exist anywhere in the repo as a script.
`spreadPageV3()` never loads a fold's base image — it loads `<name>-1.jpg` and `<name>-2.jpg`. Issue
001's halves were made ad-hoc. `agents/magazine/fold_chop.py` now does it reproducibly.

Once the art run finishes, `web/assets/img/_issue-art-manifest.json` holds the real image count and
metered cost. Those two numbers go into the Ledger page's `stats` and the issue's `ledger` block,
which currently carry honest placeholders rather than guesses.

## 5. A real renderer bug, found and fixed — it was breaking Issue 001 too

`featureText()`'s `close()` appends the sources footer as the **last child of the page element**. On
`splitLeft`/`splitRight` that element is `display:flex; flex-direction:row`, so `.tp-src` silently
became a third column in the row and crushed the text column from ~333px to ~67px. The copy then ran
about 2,600px past the page.

It presented exactly like a copy-length problem and was not: **any** split page carrying `sources`
overflowed no matter how short its body was. I only caught it by auditing Issue 001 as a control —
its page 25 has the same defect and shipped with it.

The fix is a `V-FIX` block at the foot of `styles.css` that pins `.tp-src` out of the flex row. After
it, Issue 001 goes from 1 cutoff to **0**. If I had trimmed copy until the numbers looked fine, I
would have deleted good reporting and left the bug in place.

## 6. Audit results

`qa_scan.py`: **clean**, on both issues. While extending it I found it had been firing on the
metadata *stubs* — they legitimately declare `format:"spread"` with no spreads, so the gatefold and
page-count checks could never pass on them. That's excluded now, so the gate should be green for you
rather than permanently red.

Real reader, all three window sizes, art absent (geometry is unaffected — every image is a CSS
background on an already-sized element):

| window | pages | cutoffs | voids |
|---|---|---|---|
| 1320×780 landscape | 80 | **0** | 0 |
| 860×1080 portrait | 80 | **0** | 0 |
| 1440×900 founder | 80 | **0** | 0 |

The two `mfoldhalf` second halves report 0% fill in the raw numbers. That is an artifact — they are
pure full-bleed art with no text elements to measure, and **Issue 001 reports the same thing with its
art present**, which is how I know it isn't a defect.

**What the audit cannot tell you, and I am not claiming:** whether any page is beautiful, whether the
art comes back on-style, or whether the issue reads monotonously. That is the pass only you can do.

## 7. Files changed

| file | what |
|---|---|
| `functions/api/issue/_data/issue-002.json` | the issue, 78 spreads |
| `web/data/issue-002-meta.js` | public card stub, no spreads |
| `web/assets/styles.css` | **the `.tp-src` flex fix** — affects Issue 001 too |
| `web/index.html` | adds the issue-002 script tag, bumps 35 cache-busters 313→314 |
| `agents/magazine/qa_scan.py` | scans the JSON payloads; stops flagging meta stubs |
| `agents/magazine/MAGAZINE-STANDARD.md` | page range, measured budgets, §14 renderer traps, chop step |
| `agents/magazine/fold_chop.py` | **new** — the gatefold chop |
| `agents/magazine/gen_issue_art.py` | **new** — batch art runner, resumable |
| `agents/magazine/art-prompts-issue-002.json` | 57 prompts |
| `newsroom/runner/magazine-runbook.md` | rewritten so next month can't repeat this |
| `RTFCLMGZN_ISSUE002_ART.bat` | **new** — one double-click for the art run |
| `web/data/usage-log-current.js` | row `u-0171` |

**`index.html` and `styles.css` are the two that touch the live site.** Everything else is inert
until the issue is published. Nothing here has been committed or pushed.
