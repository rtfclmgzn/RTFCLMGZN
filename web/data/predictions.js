// THE PREDICTION LEDGER — the newsroom's forward-looking calls, graded in public.
// Owned by the Standards Editor. RULES:
//  - Log a prediction whenever coverage makes a specific, falsifiable, dated call.
//  - `status`: "pending" until its resolveBy date passes; then the Standards Editor
//    grades it "right" | "wrong" | "partial" with a one-line `verdict` and `resolved` date.
//  - NEVER quietly delete a wrong call. Being wrong in public is the entire point.
//  - `claim` is one sentence. `by` = persona key. `source` = the article slug it came from.
window.RTFC_PREDICTIONS = [
  { id:"p-001", made:"2026-07-09", by:"sage-okafor", source:"gpt-5-6-sol-terra-luna-launch",
    claim:"GPT-5.6 Terra's $2.50/$15 pricing will force a public reprice from Anthropic or Google within one month.",
    resolveBy:"2026-08-09", status:"pending" },
  { id:"p-002", made:"2026-07-09", by:"sage-okafor", source:"grok-4-5-the-price-is-the-product",
    claim:"Grok 4.5's independently-measured hallucination rate will surface in production complaints and pressure its 'good enough, cheaper' positioning.",
    resolveBy:"2026-08-15", status:"pending" },
  { id:"p-003", made:"2026-07-11", by:"evelyn-zhao", source:"china-companion-ai-rules-july-15",
    claim:"The minors-protection provisions of China's companion-AI rules will be the first component copied by a Western regulator.",
    resolveBy:"2026-12-31", status:"pending" },
  { id:"p-004", made:"2026-07-11", by:"ash-lindqvist", source:"humanoids-go-public-agility-unitree",
    claim:"Agility's or Unitree's public filings will show per-unit utilization far below the hours a warehouse asset is depreciated over.",
    resolveBy:"2026-09-30", status:"pending" },
  { id:"p-005", made:"2026-07-11", by:"sage-okafor", source:"meta-town-hall-agents-stalled",
    claim:"Meta's promised 'three-to-six-month' agent payoff window will slip at least once more before it's met.",
    resolveBy:"2027-01-15", status:"pending" },
  { id:"p-006", made:"2026-07-09", by:"kian-farzan", source:"chinese-models-us-enterprise-share",
    claim:"US labs will answer the 30–46% Chinese-model enterprise share with further price cuts, not with benchmark campaigns.",
    resolveBy:"2026-09-15", status:"pending" },
  // ---- graded calls (the scorecard is only credible if wins AND losses show) ----
  { id:"p-000", made:"2026-06-28", by:"sage-okafor", source:"gpt-5-6-sol-terra-luna-launch",
    claim:"GPT-5.6 would move from its government-vetted partner preview to general availability by mid-to-late July.",
    resolveBy:"2026-07-31", status:"right", resolved:"2026-07-09",
    verdict:"Correct. Sol, Terra, and Luna opened to all users July 9 — inside the window." }
];
