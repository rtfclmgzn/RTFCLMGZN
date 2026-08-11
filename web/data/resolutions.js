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
  updated: "2026-08-11",
  note: "Resolutions are append-only and dated. Articles are never rewritten; every resolution renders beneath the original piece and on the Claims Ledger.",
  items: [
    { key:"microsoft-nadella-ai-bubble-compute-rationing|w|0",
      at:"2026-08-10T02:15:00Z",
      outcome:"confirmed",
      note:"Azure growth held well above 40% threshold at 43% YoY; FY2027 capex guidance increased to $255-260B (35% increase over 2026), and Amy Hood confirmed continued internal-first allocation with external capacity still rationed.",
      label:"Microsoft Q4 FY2026 earnings call",
      url:"https://seekingalpha.com/article/4927337-microsoft-corporation-msft-q4-2026-earnings-call-transcript" },
    { key:"white-house-moonshot-fable-distillation-accusation|w|1",
      at:"2026-08-10T02:35:00Z",
      outcome:"confirmed",
      note:"Moonshot AI released full Kimi K3 open-weight model (2.8 trillion parameters, 1M context) on July 26-27, 2026 on Hugging Face, enabling independent technical analysis of K3's training data and architecture.",
      label:"Kimi K3 open weights release",
      url:"https://www.kimi.com/blog/kimi-k3" },
    { key:"moonshot-kimi-k3-open-model-launch|w|0",
      at:"2026-08-11T14:30:00Z",
      outcome:"confirmed",
      note:"Moonshot released Kimi K3 open weights on July 26-27, 2026 (2.8T parameters, 1M context, 50B active per token) on Hugging Face with 47-page technical report. Artificial Analysis published independent Intelligence Index benchmark placing K3 at #3-4, comparable to Opus 4.8 and GPT-5.5.",
      label:"Kimi K3 technical report & Artificial Analysis evaluation",
      url:"https://artificialanalysis.ai/articles/kimi-k3-achieves-3-in-the-artificial-analysis-intelligence-index-comparable-to-opus-4-8-and-gpt-5-5" },
    { key:"moonshot-ai-50-billion-pre-ipo-valuation|w|0",
      at:"2026-08-11T03:45:00Z",
      outcome:"refuted",
      note:"Moonshot AI closed its August pre-IPO financing round at $35 billion valuation, not $50 billion. The round raised $3.5 billion at the lower valuation in late July 2026.",
      label:"Moonshot AI Series C funding close (July 2026)",
      url:"https://finance.yahoo.com/technology/ai/articles/moonshot-ai-seeks-50-billion-180829999.html" }
  ]
};
