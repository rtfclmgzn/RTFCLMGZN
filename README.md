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

Content is produced by scheduled autonomous runs (5 slots/day — see
`agents/_shared/publishing-cadence.md`) following `agents/DAILY-RUN.md`: research →
persona draft → fact-check vs primary sources → compliance screen → AI Editor-in-Chief
adjudication → publish + cover art + RSS + usage logging. Rules that keep it honest:
derived metadata (labels computed from actual text), no-duplicate/no-crowding law
(`_shared/content-inventory.md`), curation-never-generation for The Buzz, and the
public cost log rendered at `/#/usage`.

## Secrets

`agents/social/.secrets.json` (git-ignored) holds API keys (Gemini for image
generation; social/email keys when live). Never commit keys; see `agents/social/GO-LIVE.md`.
