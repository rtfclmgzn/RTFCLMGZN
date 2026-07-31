// RTFCLMGZN — ISSUE 001 · "THE FIRST HALF" (July 2026) — METADATA STUB ONLY.
//
// This file is what index.html loads in place of the old `issue-001.js`. It carries
// everything needed to render the issue's CARD on #/magazine — cover, title, tagline,
// month, publish date, the cost ledger, and how many spreads are inside — and it
// carries no `spreads` array, because Issue 001 is a Plus issue.
//
// The spreads live in `functions/api/issue/_data/issue-001.json` and are served only
// by `GET /api/issue/issue-001`, which returns:
//     200 {"ok":true,"issue":{...}}             session plan === "plus"
//     402 {"ok":false,"error":"plus-required"}  everyone else
// The reader fetches them when the issue is actually opened. Before this split the
// whole issue was in `web/data/issue-001.js`, loaded on every page view, so
// `curl https://rtfclmgzn.com/data/issue-001.js` handed the entire paid issue to
// anyone. `web/data/issue-001.js` is retired — do not reintroduce it, and do not
// paste spreads back into this file. Anything under `web/` is public forever.
//
// `spreadCount` is the real count (59) and is here on purpose: the card can honestly
// say how big the issue is without shipping a page of it.
//
// The Primer (issue 000) is free and stays whole in `primer-issue.js` — it needs no
// endpoint and no fetch.
window.RTFC_MAGAZINE_ISSUES.push({
  id:"issue-001", number:1, format:"spread", access:"plus",
  title:"The First Half",
  tagline:"Six months that rewired the AI industry — the year so far, with hindsight",
  month:"2026-07", published:"2026-07-12T05:00:00Z",
  cover:{ image:"assets/img/issue-001-cover-hub.jpg", art_status:"generated", palette:"ink & violet" },
  ledger:{ tokens:172000, compute_cost_usd:1.42, images:38, note:"Issue 001 build (flowing-features edition): cover and feature art generated; interior carries unique per-page art — topical story images plus fresh Nano-Banana generations. Text is re-synthesis of already-published reporting; token figure estimated, image cost metered." },
  spreadCount:61
});
