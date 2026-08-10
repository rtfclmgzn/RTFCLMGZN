// RTFCLMGZN — ISSUE 002 · "THE RECKONING" (August 2026) — METADATA STUB ONLY.
//
// This is what index.html loads for the issue CARD on #/magazine — cover, title, tagline,
// month, publish date, cost ledger, and how many spreads are inside. It carries no `spreads`
// array, because Issue 002 is a Plus issue. See issue-001-meta.js for the full rationale:
// anything under web/ is public forever, so a paid issue's pages must never live here.
//
// The spreads live in `functions/api/issue/_data/issue-002.json` and are served only by
// `GET /api/issue/issue-002` (200 for a session with plan === "plus", 402 otherwise).
//
// `spreadCount` is the spread count, not the page count — the reader derives the real page
// total itself once the payload arrives (a gatefold spread renders as two sheets), so the
// storefront card and the reader never quote two different sizes.
window.RTFC_MAGAZINE_ISSUES.push({
  id:"issue-002", number:2, format:"spread", access:"plus",
  title:"The Reckoning",
  tagline:"July, with hindsight — and the first read on where August is headed",
  month:"2026-08", published:"2026-08-10T12:00:00Z",
  cover:{ image:"assets/img/i2-cover.jpg", art_status:"generated", palette:"ink & violet, cracked-glass amber accent" },
  ledger:{ tokens:0, compute_cost_usd:1.94, images:55, note:"57 images generated through the house Nano Banana pipeline at $0.034 each; 55 placed, two spare cover concepts. Writing and layout ran on a subscription seat, so there is no metered token figure to print." },
  spreadCount:78
});
