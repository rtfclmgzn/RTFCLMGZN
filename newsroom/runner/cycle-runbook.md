# RTFCLMGZN Claude Cycle Runbook

You are running unattended, headless, on the owner's Claude subscription (no API billing — do not call any paid API for text; images use the capped `generate-image` CLI only when the art library has no fit). You are one newsroom cycle. Follow this runbook exactly, then stop.

**Repo root:** `D:\BUSINESS\RTFCLMGZN` — you are already running with this as your working directory.

## 0. Kill switch

If `newsroom/runner/PAUSED` exists, print `PAUSED — exiting without doing anything` and stop immediately. Do nothing else.

## 1. House standards (read before writing anything)

Read and follow, in full:
- `agents/production/style.agent.md` — voice, headline rules, TL;DR spec, self-referential-language ban (headlines AND body text).
- `agents/production/publishing.agent.md` — image-selection rules (library-first, semantic match not just tags, 90-day no-reuse, brand_visible check).
- `agents/_shared/compliance-rulebook.md` §1–§5 — the six mandatory-scrutiny triggers (health/medical, financial/crypto, legal proceedings, accusatory claims about a named party, unverifiable quotes, unconfirmed central claims). If a candidate story trips one, either source it properly, remediate it (disclaimer, hedge, cut the claim), or drop the candidate — you are your own compliance check this cycle, there is no separate agent to hand off to.
- `web/data/personas.js` — the nine active editors (key, section, beat, tone, bio). Never use a retired persona.

## 2. Research

Use WebSearch/WebFetch to find genuinely current AI-industry news (check today's date). Cross-check against already-published coverage before committing to a topic:
```
grep -oE '"slug": *"[^"]+"|"title": *"[^"]+"|"publishedAt": *"[^"]+"' web/data/newsroom-articles.js
```
Do not re-cover a story already published in the last 7 days unless there's a genuine new development.

**Format targets for this run** (source-gated — never pad a thin story to hit a target; a brief with one solid source beats a padded synthesis):
- Brief: one clear claim, 1-2 sources, ~250-450 words.
- Synthesis: multiple corroborating sources, real analysis, 800-1900 words (the site's own word-count ruler relabels anything under 650 words as a Brief regardless of what you call it — see `trueFormat()` in `web/assets/app.js` if you want to check).
- Research: 2200+ words, deep primary-source stack. Check whether a research piece has run in the trailing 7 days (grep `"format": *"research"` in the dates above) — if none, and a strong candidate supports the depth, elevate to research this cycle.

Per-cycle cap: **3 articles maximum.** Stop researching once you have enough good candidates for this slot; do not keep pulling more.

## 3. Write

Match the exact JSON shape of a recent entry in `web/data/newsroom-articles.js` (read one in full first: slug, title, dek, persona, section, format, disclaimer, tldr, body, sources, id, image, pipeline, publishedAt). Required:
- `tldr`: 4-5 bullets, each ≤18 words, final bullet carries the load-bearing caveat when one exists.
- `disclaimer`: exactly one of `none`, `not-financial-advice`, `not-medical-advice` — required for Health/Markets sections.
- Every citation URL must be a real, working link you actually found — never invented.
- No self-referential language anywhere in title/dek/body (see style.agent.md — this has burned us before, check carefully).
- `pipeline` block: write an honest `run`/`stages`/`gate` record like the existing entries, noting this was an autonomous Claude-runner cycle (not "owner-directed"), with real assignment/verification/review notes about what you actually checked.

## 4. Cover image

Follow `publishing.agent.md`'s rules exactly:
1. Check `image-library/art/manifest.json` for a semantically-fitting, unused-within-90-days image (read each candidate's `description`, not just tags — the mismatch this rule exists to prevent is a real incident: robots-as-workers art was used for a story about robots-as-product).
2. Check `web/data/image-usage.js`'s registry logic conceptually — no image (library or generated) on a second article/magazine within 90 days.
3. If you use a library image: resize to ~1536px web JPEG into `web/assets/img/newsroom/<article-id>.jpg` (Python PIL is available), then append `{"article_id": "...", "used_at": "<today>"}` to that image's `used_in` in the manifest.
4. If nothing fits, generate one: `python -m newsroom.cli generate-image --prompt "..." --out web/assets/img/newsroom/<article-id>.jpg --section <Section>`. This is capped by a shared budget guard and will fail cleanly if exhausted — if it fails, fall back to the best available library image even if imperfect, rather than leaving no cover.

## 5. Ship it

0. Before touching anything, run `git status --short`. If it already shows uncommitted changes to a file you're about to edit (most likely `web/index.html`, since the owner sometimes hand-edits the UI directly), that's someone's in-progress work sitting in the same file you need to bump the cache-buster in -- `git add` stages the whole file, not just your lines, so your commit will unavoidably include it too. That's fine (don't try to strip it out or stash it -- an unattended stash/pop can conflict and wedge the repo for the next cycle), but say so explicitly in your Step 6 report (e.g. "note: index.html had a pre-existing unrelated edit already in the working tree, included in this commit") so the owner isn't confused by a diff your summary doesn't otherwise explain.
1. Update `web/index.html`: bump every `?b=N` cache-buster by 1 (all occurrences, same new number).
2. `git add` **only** the files you actually touched (new/changed article data, cover image, manifest, index.html). Never `git add -A`.
3. Run the guard: `python -m newsroom.runner.verify_publish_surface`. If it exits non-zero, STOP — do not push. Unstage whatever it flagged and reconsider; do not override this check.
4. `git commit` with a real, specific message (what you published and why, not a generic "update").
5. `git push origin main`.
6. Verify: `curl -s https://rtfclmgzn.com/ | grep -o '?b=[0-9]*'` in a short poll loop until it shows your new number (deploy takes ~30-90s).

## 6. Report

Print a short summary: what you published (title, section, format, word count), what cover you used and why, the new cache-buster number, and confirmation the deploy landed. If you decided NOT to publish anything this cycle (no candidate cleared compliance, or nothing genuinely new), say so explicitly and explain why — an empty cycle is a legitimate, honest outcome, not a failure to hide.

Then stop. Do not start a second cycle, do not modify anything else, do not touch files outside what this runbook describes.
