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
  updated: "2026-08-17",
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
      url:"https://finance.yahoo.com/technology/ai/articles/moonshot-ai-seeks-50-billion-180829999.html" },
    { key:"alibaba-qwen38-max-launch-benchmarks-arena|w|0",
      at:"2026-08-12T04:30:00Z",
      outcome:"confirmed",
      note:"Qwen3.8-Max scored 56 on Artificial Analysis Intelligence Index (v4.1.1 as of August 6, 2026), placing it fifth globally, ahead of all US models except Anthropic's (Fable 5 at 62.1, Opus 5 at 63.0) and OpenAI's (GPT-5.6 Sol at 59). Comparable to Claude Opus 4.8 (56) and ahead of DeepSeek V4 Pro (50.9).",
      label:"Artificial Analysis Intelligence Index score",
      url:"https://artificialanalysis.ai/" },
    { key:"moonshot-kimi-k3-redis-zero-days-self-reported-claim|w|0",
      at:"2026-08-13T03:00:00Z",
      outcome:"confirmed",
      note:"Redis assigned CVE-2026-25589 for the heap-overflow vulnerability in RedisBloom module discovered by Kimi K3 agents. Redis released patches across versions 8.8.1, 8.6.5, 8.4.5, 8.2.8, 7.4.10, 7.2.15, and 6.2.23 confirming at least one CVE assignment; the full count of 19 claimed zero-days and autonomy claims remain self-reported and unverified.",
      label:"Redis CVE-2026-25589 assignment and patch releases",
      url:"https://thehackernews.com/2026/07/kimi-k3-agents-found-redis-zero-days.html" },
    { key:"alibaba-qwen38-max-preview-no-benchmarks|w|0",
      at:"2026-08-13T03:15:00Z",
      outcome:"confirmed",
      note:"Alibaba published its own Qwen 3.8-Max benchmark table claiming second-only-to-Fable-5 rankings on multiple benchmarks (OSWorld-Verified 86.1, PaperBench 93.0). No independent third-party evaluation from Artificial Analysis or community leaderboards had published by early August 2026, but Alibaba's own internal benchmark table fulfilled the resolver requirement for published scores.",
      label:"Alibaba Qwen 3.8-Max published benchmark table",
      url:"https://www.alibaba.com/qwen3-8-max" },
    { key:"nvidia-huang-open-weights-policy-letter|w|1",
      at:"2026-08-13T18:00:00Z",
      outcome:"refuted",
      note:"Anthropic published its own July 27 statement on open-weights models without signing NVIDIA's letter; Amazon remained absent from signatories. NVIDIA's letter reached ~50 signatories by late July with OpenAI and Google aboard, but neither Anthropic nor Amazon joined despite their market position and investment relationship.",
      label:"Anthropic statement on open weights; Amazon and Anthropic non-participation in NVIDIA letter",
      url:"https://www.forbes.com/sites/sandycarter/2026/07/25/huangs-open-weights-letter-doubled-to-50-without-amazon-and-anthropic/" },
    { key:"aschenbrenner-situational-awareness-capital-raise-ai-rout|w|0",
      at:"2026-08-14T10:00:00Z",
      outcome:"expired",
      note:"The August 1, 2026 deadline for new capital commitments passed with no confirmed close. Situational Awareness experienced a 67% fund drawdown (from $45B to ~$10B in assets) through July 2026 and explicitly announced it is not accepting new capital, citing the need to stabilize after margin calls and semiconductor-market volatility.",
      label:"Situational Awareness fund capital raise status as of August 1-14",
      url:"https://www.cnbc.com/2026/07/31/leopold-aschenbrenner-situational-awareness-fund-fire-sale.html" },
    { key:"deepseek-v4-pro-0813-price-increase|w|0",
      at:"2026-08-16T16:00:00Z",
      outcome:"confirmed",
      note:"DeepSeek's V4 Pro pricing took effect at 16:00 UTC on August 16, 2026, as announced. Peak-hour pricing increased to $3.96/million output tokens (from $0.87), off-peak to $1.98/million. Cache-hit input tokens increased to $0.044 peak / $0.022 off-peak (from $0.003625). Peak hours defined as 01:00-04:00 and 06:00-10:00 UTC.",
      label:"DeepSeek V4 Pro peak/off-peak pricing effective date",
      url:"https://finance.yahoo.com/technology/ai/articles/deepseek-raising-api-prices-1-174027670.html" },
    { key:"anthropic-macquarie-gic-theseus-infrastructure|w|0",
      at:"2026-08-10T12:00:00Z",
      outcome:"confirmed",
      note:"Anthropic, Macquarie, and GIC announced the Theseus Infrastructure partnership on August 10-12, 2026, with public disclosure of the first site: a 400-megawatt facility in Texas with grid upgrades funded entirely by Anthropic, targeted for Q4 2026 operation. Phased expansion planned to 2 gigawatts by 2028.",
      label:"Theseus Infrastructure first-site capacity and location",
      url:"https://www.macquarie.com/au/en/about/news/2026/anthropic-mam-gic-data-centre-infrastructure-partnership.html" },
    { key:"alibaba-qwen38-max-preview-no-benchmarks|w|1",
      at:"2026-08-12T16:00:00Z",
      outcome:"confirmed",
      note:"Alibaba released Qwen3.8-Max open weights on August 12, 2026, as Qwen3.8-2.4T-A95B (text-only variant, 2.4 trillion parameters with 95B active per token). The open-weights checkpoint is available on Hugging Face; the release removed multimodal (vision/video) capabilities from the API version.",
      label:"Alibaba Qwen3.8-Max open weights release on Hugging Face",
      url:"https://www.explainx.ai/blog/qwen3-8-max-open-weights-live-hugging-face-august-2026" }
  ]
};
