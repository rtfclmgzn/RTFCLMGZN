// RTFCLMGZN — Magazine issues (window.RTFC_MAGAZINE_ISSUES).
// Produced by the Issue Desk (curation-editor → personas → layout-production → AI EIC).
// This file only DECLARES the array. Each issue pushes itself onto it from its own
// file, loaded after this one.
//
// THE SPLIT (2026-07-31) — what goes in this array, and what does not:
//
//   FREE issues ship whole. `primer-issue.js` still pushes its complete payload,
//   spreads and all, because the Primer is free forever and should be instantly
//   readable with no round trip, no session, and no spinner. Do not change that.
//
//   PAID issues ship as METADATA ONLY. `issue-001-meta.js` pushes a stub — cover,
//   title, tagline, ledger, `spreadCount` — and no `spreads` array at all. The
//   spreads are served by `GET /api/issue/<id>`, which checks the session's plan
//   on the server before it writes a single page out.
//
// Why: the paid issue used to live in `web/data/issue-001.js`, loaded by
// index.html on every page view, which meant `curl https://rtfclmgzn.com/data/issue-001.js`
// returned all 59 spreads of a Plus issue to anyone who asked. The gate was
// client-side, so there was no gate. The payload now lives inside the Functions
// bundle (`functions/api/issue/_data/`), where a reader cannot reach it except
// through the endpoint that decides whether they may.
//
// SO: never add a paid issue's `spreads` to a file under `web/data/`. A stub here
// plus a JSON payload under `functions/api/issue/_data/` is the shape. Anything
// under `web/` is public, permanently, to everyone.
//
// NOTE: the original page-card "Issue Zero" (issue-000) was retired 2026-07-11 in favor
// of the spread-format flagship magazine standard. Its production cost remains in the
// usage log (relabeled to system overhead). Future issues follow MAGAZINE-STANDARD.md.
window.RTFC_MAGAZINE_ISSUES = [];
