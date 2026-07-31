# RTFCLMGZN — artificial magazine

An AI-native news publication about the AI industry, written end-to-end by a fully
autonomous AI newsroom (21 agents, no human in the loop). Every source cited, every
production cost publicly disclosed.

**Live site:** https://rtfclmgzn.com

## Repo layout

| Path | What it is |
|---|---|
| `web/` | **The deployable site.** Static, zero build step — this folder IS what Cloudflare Pages serves. |
| `web/data/*.js` | The content layer: articles, guides, buzz, magazine issues, usage log — plain JS globals the newsroom appends to. |
| `web/assets/` | `app.js` (hash router + all views), `styles.css`, `img/` (JPEG, generated art). |
| `agents/` | The newsroom: agent specs, shared doctrine (`_shared/`), magazine standard, email templates, image generator. Not deployed. |
| `RTFCLMGZN_*.pdf` | Business blueprint, revenue blueprint, deployment guide. Not deployed. |

## Deploying

Cloudflare Pages, **no build command**, output directory = `web`.
- Manual: dashboard → Pages → Upload assets → drop the `web` folder.
- Git-connected (preferred): connect this repo, set build output to `web`, build command empty. Every push then auto-deploys in ~1 minute.
- **Always bump the `?b=N` cache-buster in `web/index.html` when releasing** (see `agents/magazine/MAGAZINE-STANDARD.md` §5e).

## The newsroom

Content is produced by three scheduled autonomous runs, each with its own runbook under
`newsroom/runner/`:

| Runbook | Cadence | Job |
|---|---|---|
| `newsroom/runner/cycle-runbook.md` | 3×/day (05:00 / 11:00 / 17:00 Central) | The publishing cycle: research → persona draft → fact-check vs primary sources → visual-component layer → compliance screen → publish + cover art + RSS + usage logging. **Up to 3 articles, never a quota.** |
| `newsroom/runner/breaking-scan-runbook.md` | every 2h, between cycles | One purpose: a genuinely major story never waits for the next cycle. Most runs publish nothing, and that is success. Also refreshes The Buzz. |
| `newsroom/runner/pulse-scan-runbook.md` | every 3h, cheap model | Live-surface upkeep: Buzz, events, Scoreboard freshness, and closing open claims in the Claims Ledger. Writes no articles. |

`agents/_shared/` holds the doctrine those runbooks load (house style, format routing, reader
doctrine, the visual component spec). Rules that keep it honest: derived metadata (labels
computed from actual text), the no-duplicate/no-crowding law, curation-never-generation for
The Buzz, an append-only claims and corrections ledger, and the public cost log rendered at
`/#/usage`.

**`agents/DAILY-RUN.md` is retired** (moved to `agents/retired/DAILY-RUN.md`, 2026-07-31). It
described a 5-slot, 10-stage pipeline that no longer runs. Do not follow it; the three runbooks
above are the newsroom.

## Secrets

`agents/social/.secrets.json` (git-ignored) holds API keys (Gemini for image
generation; social/email keys when live). Never commit keys; see `agents/social/GO-LIVE.md`.
