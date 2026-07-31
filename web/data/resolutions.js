// ============================================================================
// THE RESOLUTIONS STORE — the answer half of the Claims Ledger (#/claims).
//
// HOW THE LEDGER WORKS
// Open claims are NOT stored anywhere. They are derived live in app.js from the
// articles themselves: every scorecard item still marked unsettled (partial /
// contested / unverified / company) that names a `resolver`, plus every `apply`
// item on a watch-type article. This file holds ONLY resolutions, keyed to the
// claim. That means the ledger can never drift from the archive — edit a claim
// out of an article and it leaves the ledger; a resolution whose key no longer
// matches anything is simply inert.
//
// THE KEY FORMAT
//   "<article-slug>|sc|<n>"  the nth scorecard item in that article (0-based,
//                            counted across ALL scorecard blocks in body order)
//   "<article-slug>|w|<n>"   the nth apply/watch item in that article (0-based)
// Get the index by counting in the article's own JSON. If a claim's position
// shifts because a scorecard item was inserted before it, the key must be
// updated in the same commit — otherwise the resolution silently detaches.
//
// THE INTEGRITY RULE (non-negotiable)
// APPEND-ONLY. Never rewrite an article's original text to reflect a
// resolution, and never edit or delete a resolution once published. A resolved
// claim renders as a dated update block BENEATH the unchanged article. The
// moment this publication silently edits history, the transparency it rests on
// is worthless. If a resolution turns out to be wrong, append a second one
// correcting it; do not amend the first.
//
// MAINTENANCE (pulse scan, every 3 hours — see newsroom/runner/pulse-scan-runbook.md)
//   The scan reads the open claims on #/claims, checks whether any resolver has
//   actually happened, and appends an entry here when one has. It must NOT
//   resolve a claim on inference — the `url` has to show the thing the resolver
//   named. No source, no resolution.
//
// outcome: "confirmed" | "refuted" | "partly" | "superseded" | "expired"
//   confirmed  — the claim turned out to be true
//   refuted    — it turned out to be false
//   partly     — borne out in part; say which part in `note`
//   superseded — events moved past it; it can no longer be settled as posed
//   expired    — the resolver's own deadline passed with no answer (this is a
//                real finding and worth logging, not a gap)
// ============================================================================
window.RTFC_RESOLUTIONS = {
  updated: "2026-07-30",
  note: "Resolutions are append-only and dated. Articles are never rewritten; every resolution renders beneath the original piece and on the Claims Ledger.",
  items: [
    // Seeded empty on purpose. The first entries are written by the pulse scan
    // once one of the archive's open resolvers actually resolves. An empty
    // ledger that says "62 open, 0 resolved" is honest; a pre-filled one would
    // not be.
    //
    // Shape, for the scan to copy:
    // { key:"kimi-k3-open-weights-live-download|sc|1",
    //   at:"2026-08-04T13:20:00Z",
    //   outcome:"confirmed",
    //   note:"Moonshot's technical report states the active-parameter count directly, matching the community estimate.",
    //   label:"Moonshot technical report",
    //   url:"https://..." }
  ]
};
