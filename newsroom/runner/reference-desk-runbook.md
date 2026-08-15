# RTFCLMGZN Reference Desk Runbook

> **READ `newsroom/OPERATING_LAW.md` FIRST — before this runbook, before any work.**
> If anything here contradicts the Operating Law, the Law wins and you report the
> contradiction.

You are running unattended, headless, on the owner's Claude subscription. You are
**one reference-desk cycle**. Follow this runbook exactly, then stop.

---

## WHY THIS DESK EXISTS (read once; it determines every judgement below)

On 2026-08-15 the numbers were pulled for the first time. In the previous 30 days
this publication served **470 page views and 320 visits**, across 127 published
articles, with autoposting live to five platforms. Roughly four views per article,
lifetime.

Two things caused that, and only one of them is now fixed.

**Fixed:** the site was structurally uncrawlable. Every page but articles lived
behind a `#/` fragment route, so a crawler saw one URL no matter how many pages
the app rendered. Real article URLs landed 2026-08-14, the CDN then redirected
every one of them to the homepage for a day, and the page a shared link actually
opened was a different, stripped-down document until 2026-08-15. Google has had a
correctly working version of this site for hours, not months.

**Not fixed, and the reason this desk exists:** the beat is too broad. A search
for the exact headline of our own OpenAI/Astra story returns TechCrunch, Quartz,
Decrypt, LinkedIn and Medium. Not us. Near-exact phrase match is the easiest query
this publication will ever have to win, and we do not appear on it. We are filing
against outlets with a decade of domain authority on stories that are dead by
morning, and no amount of publishing volume changes that arithmetic.

**So this cycle does not chase news.** One of the three daily cycles now writes
the kind of thing a small site can actually own: durable, specific, answer-shaped
pages that keep earning after the news cycle that prompted them has gone. The
other two cycles still cover the news. This one builds the part that compounds.

If you find yourself reaching for "what happened today", you are in the wrong
runbook. Stop and re-read this section.

---

## 0. Kill switch

If `newsroom/runner/PAUSED` exists, print `PAUSED — exiting without doing anything`
and stop immediately. Do nothing else.

## 0b. The guard comes first (REQUIRED, before you write anything)

Run `python3 newsroom/quality/site_guard.py` and read the output. The rules are
identical to the news cycle, and they are not negotiable:

- If the guard reports **ERRORS caused by a record you are about to touch**, fix
  the record, not the guard.
- If it reports errors you did not cause, note them in your report.
- **Never edit `newsroom/quality/*` to make a check pass.** A silenced guard is
  worse than no guard, because it reads as safety.
- Before you finish, run it again, plus `python3 newsroom/quality/render_smoke.py`
  if Playwright is available. Both must be clean on anything you wrote.

## 1. House standards

Read and follow in full, exactly as the news cycle does:

- `agents/production/style.agent.md` — voice, headline rules, TL;DR spec, and the
  self-referential-language ban in headlines and body alike.
- `agents/production/publishing.agent.md` — image selection, library-first, the
  90-day no-reuse rule.
- `agents/_shared/loop-doctrine.md` — the three mandated loops. Loop 1's critique
  pass is required here too.
- `agents/_shared/visual-components.md` — the component spec, in full, before you
  draft. Reference pages carry MORE structure than news pieces, not less.
- `agents/_shared/compliance-rulebook.md` §1–§5 — the six mandatory-scrutiny
  triggers. You are your own compliance check this cycle.
- `web/data/personas.js` — the nine active editors. Never use a retired persona.

---

## 2. Pick ONE target (the whole cycle turns on this)

You produce **exactly one substantial piece per cycle**, plus the small standing
chores in §5. One good durable page beats three thin ones, and the failure mode
this desk is correcting is volume without traction.

### 2a. The rule that decides every candidate

> **Would TechCrunch file this?** If yes, drop it. That is their query and you
> will not win it.
>
> **Would someone search this six months from now?** If no, drop it. A page that
> only makes sense this week belongs in the news cycle.

Both must pass. A candidate that fails either is not a reference-desk candidate,
no matter how interesting it is.

### 2b. The priority order

Work the first surface that has a genuine gap. Do not skip down the list because
something further down is more fun to write.

1. **Guides** (`web/data/guides.js`, `window.RTFC_GUIDES`) — the strongest surface
   we have and the most neglected: six guides in five weeks. A guide answers a
   task-shaped question ("how do I decide X", "how do I catch Y") with a
   procedure, real pitfalls, and a snippet someone can use. These are the pages
   most likely to rank and most likely to be linked. **Default here unless a
   higher-value gap exists elsewhere.**
2. **Company dossiers** (`web/data/companies.js`) — a named-entity page that is
   genuinely better than the Wikipedia stub for someone deciding whether to use or
   trust that company. Thin dossiers on companies we cover often are the gap.
3. **Dictionary** (`web/data/dictionary.js`) — terms readers hit in our own
   coverage and cannot look up here. Cross-reference our articles for jargon that
   appears repeatedly with no entry behind it.
4. **Scoreboard / Grid** (`web/data/scoreboard.js`, `web/data/grid.js`) — keeping
   comparison data current is reference work, and comparison pages earn links.
5. **A durable explainer as an article** — only if nothing above has a real gap.
   Comparison, "how X actually works", "what changed and what it means for you".
   Filed to `web/data/newsroom-articles.js` like any article, but written to be
   true in six months.

### 2c. Find the gap with evidence, not instinct

Before you commit, do all three:

```bash
# what we already cover, so you do not duplicate
grep -oE '"slug": *"[^"]+"' web/data/guides.js web/data/dictionary.js web/data/companies.js
# jargon appearing in our articles - candidates for dictionary entries
grep -oiE '\b(inference|distillation|eval|RLHF|context window|agentic|MoE|quantization)\b' web/data/newsroom-articles.js | sort | uniq -c | sort -rn | head -20
```

Then use WebSearch to check the target query. **Look at who ranks.** If the first
page is TechCrunch, The Verge, OpenAI's own docs and Wikipedia, pick a narrower
query. If the first page is thin content, forum posts, or nothing that directly
answers it, you have found a real gap. Say which it was in your report.

### 2d. Write down what you are aiming at (REQUIRED)

Append one line to `newsroom/reference-desk-log.md`, creating the file with a
`# Reference desk log` heading if it does not exist:

```
| 2026-08-15 | guides/how-to-x | "target query someone would type" | who ranks now and why we can beat them |
```

This is not paperwork. It is the only way anyone can tell in ninety days whether
this desk worked. The register's Class E failure is *a number nobody measured*,
and "did reference content earn traffic" is exactly that number unless the target
is written down before the page is written. **A cycle that publishes without
logging its target has not finished.**

---

## 3. Write it

Match the exact JSON shape of a recent record in the file you are writing to. Read
one in full first. The requirements from the news cycle carry over unchanged:

- `tldr`: 4-5 bullets, each ≤18 words.
- `disclaimer`: exactly one of `none`, `not-financial-advice`, `not-medical-advice`.
- Every citation URL real and verified. Never invented.
- No self-referential language in title, dek or body.
- Full component structure per `visual-components.md`.

### 3a. What makes a reference page worth its URL

- **Answer the question in the first two sentences.** Someone arriving from a
  search has one question. Do not make them read to the fold for it.
- **Specific beats broad, always.** "Which AI for which job" is a guide. "AI
  models compared" is a page nobody finds and nobody finishes.
- **Show the work.** A procedure with real commands, a comparison with real
  numbers and their scope stated (Law 5), a pitfall list drawn from things that
  actually go wrong. Generic advice is what the thin content already ranking says.
- **Date the volatile parts.** A reference page that silently rots is worse than
  no page. If a figure or a model version will change, say when it was true.

### 3b. Internal links are the mechanic, not decoration (REQUIRED)

Every reference page must carry **at least three internal links** to existing
pages, written as markdown in body text: `[OpenAI](/company/openai)`,
`[the dictionary entry](/dictionary)`, `[our guide to X](/article/<slug>)`.

Use a real leading `/` path. **Never `#/`** — 129 links were written as
`[label](#/company/openai)` and printed as literal markdown on every page an
outside visitor saw, for weeks. `check_no_hash_links` now fails the build on it.

And go the other way: find two or three existing articles that should link **to**
this new page and add the links. A page nothing links to is a page search engines
treat as an orphan, and this site has an archive full of natural anchors that
currently point nowhere.

---

## 4. Cover image

Follow §4 of `newsroom/runner/cycle-runbook.md` exactly. Library-first, semantic
match, `brand_visible` check, 90-day no-reuse. Reference pages are not exempt: a
coverless record is what produced the blank homepage hero on 2026-08-10.

---

## 5. The standing chores (REQUIRED even on a cycle that publishes nothing)

Do these exactly as written in `newsroom/runner/cycle-runbook.md`. Do not
reimplement them from memory:

- **§4b** — keep the live desks current.
- **§4c** — social staging for anything published this cycle.
- **§4d** — the cover-health sweep.
- **§5** — ship it (guard, regenerate, commit, rebase, push, verify live).
- **§5b** — social dispatch, after the deploy is verified live.

---

## 6. Report

Write **one sentence** to the file named by `$RTFC_RUN_SUMMARY` describing what
this cycle did. Example:

```
Reference desk: published the guide "how to decide between self-hosting and an API",
targeting "self host llm vs api cost", plus 3 inbound links from existing articles.
```

**Do not touch `web/data/usage-log-current.js`. Do not run `log_usage.py`.** The
harness measures the finished run and writes the single ledger row itself, using
your sentence. Two writers on that ledger produced 35 zero-token phantom rows
before this rule existed; see the failure register, Class E.

Then stop.
