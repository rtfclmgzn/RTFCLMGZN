// THE SCOREBOARD — how the models actually compare: independent strength vs. cost.
// Maintained by the Data Desk. Two numbers per model:
//   score : the current Artificial Analysis Intelligence Index for the named reasoning mode.
//           This is an independent aggregate across coding, reasoning, and knowledge evaluations.
//   pin/pout : vendor list price per 1M input/output tokens where published. The UI derives
//           a value view from strength and cost; exact provider/runtime pricing can vary.
// RULES: never substitute vendor self-reported benchmark claims for the independent index;
// refresh after every scheduled benchmark scan and record the scan even when nothing moves.
window.RTFC_SCOREBOARD = {
  updated: "July 16, 2026",
  scannedAt: "2026-07-24T21:45:00Z",
  basisNote: "Strength is the current Artificial Analysis Intelligence Index for a representative high-capability reasoning mode. Prices are vendor list prices stored separately from the independent score. This snapshot was cross-checked against the live Artificial Analysis model leaderboard; SWE-bench and Terminal-Bench remain supporting coding signals rather than being blended by hand into an opaque house score. Scanned July 16 2026 on the publication of Kimi K3, which is listed as released-but-unmeasured pending an independent aggregate. Re-scanned July 24 2026 alongside coverage of DeepSeek retiring its legacy API aliases in favor of V4: no change to the DeepSeek V4 Pro row — DeepSeek's own SWE-bench/MCPAtlas figures are vendor-reported, not the independent index, and this cycle's pricing research turned up conflicting secondary-source numbers rather than one verifiable vendor list price, so pin/pout stay null pending normalization.",
  rows: [
    { model:"Claude Fable 5",      mode:"with fallback", lab:"Anthropic", score:60, pin:10,   pout:50, status:"released",
      note:"Current independent leader by one point. Maximum capability, but still the most expensive model in this comparison." },
    { model:"GPT-5.6 Sol",         mode:"max",           lab:"OpenAI",    score:59, pin:5,    pout:25, status:"released",
      note:"One point off the lead at roughly half Fable 5's token price; the strongest price-performance result at the very top." },
    { model:"Claude Opus 4.8",     mode:"max",           lab:"Anthropic", score:56, pin:5,    pout:25, status:"released",
      note:"Tied with Sol high on the independent index and still a proven premium agentic-coding workhorse." },
    { model:"GPT-5.6 Sol",         mode:"high",          lab:"OpenAI",    score:56, pin:5,    pout:25, status:"released",
      note:"Near-max capability with less deliberation than Sol max; useful when latency matters more than the final few points." },
    { model:"GPT-5.6 Terra",       mode:"max",           lab:"OpenAI",    score:55, pin:2.5,  pout:15, status:"released",
      note:"The daily-driver standout: only four points behind Sol max at a materially lower price." },
    { model:"GPT-5.5",             mode:"xhigh",         lab:"OpenAI",    score:55, pin:5,    pout:30, status:"released",
      note:"Previous generation still scores well, but Terra max now matches it at a much lower cost." },
    { model:"Grok 4.5",            mode:"high",          lab:"xAI",       score:54, pin:2,    pout:6, status:"released",
      note:"Strong independent score and aggressive pricing; remains one of the best value frontier options." },
    { model:"Claude Sonnet 5",     mode:"max",           lab:"Anthropic", score:53, pin:2,    pout:10, status:"released",
      note:"A strong middle tier for coding and agent work, with a substantially better cost profile than Opus or Fable." },
    { model:"GPT-5.6 Luna",        mode:"max",           lab:"OpenAI",    score:51, pin:1,    pout:6, status:"released",
      note:"Budget model with a surprisingly high independent score; especially compelling for high-volume routed workloads." },
    { model:"GLM-5.2",             mode:"max",           lab:"Z.ai",      score:51, pin:0.6,  pout:2, status:"released",
      note:"Matches Luna max on the index at extremely low list pricing — the current value outlier." },
    { model:"Muse Spark 1.1",      mode:"xhigh",         lab:"Meta",      score:51, pin:1.25, pout:4.25, status:"released",
      note:"Now independently measured at the same score as Luna max and GLM-5.2 max; no longer merely an unproven launch entry." },
    { model:"Gemini 3.5 Flash",    mode:"default",       lab:"Google",    score:50, pin:0.5,  pout:2, status:"released",
      note:"Fast, inexpensive, and only one index point behind the 51-point cluster." },
    { model:"Gemini 3.1 Pro Preview", mode:"default",    lab:"Google",    score:46, pin:null, pout:null, status:"preview",
      note:"The current independently measured Google Pro entry. Pricing is omitted here until the Data Desk verifies the exact public API rate used by the benchmark provider." },
    { model:"DeepSeek V4 Pro",     mode:"max",           lab:"DeepSeek",  score:44, pin:null, pout:null, status:"released",
      note:"Lower raw index than the frontier leaders, but a notable open-market value candidate once exact provider pricing is normalized." },
    { model:"Kimi K3",            mode:"max",           lab:"Moonshot",  score:null, pin:null, pout:null, status:"released",
      note:"Launched July 16 2026 as a ~2.8T-parameter open-weight MoE with a 1M context. Moonshot claims wins over Opus 4.8 and GPT-5.5 on some coding and agent tasks and concedes it trails Fable 5 and GPT-5.6 Sol overall. Unranked here until an independent aggregate scores it; full open weights are promised July 27." }
  ],
  sources: [
    { label:"Artificial Analysis — live LLM leaderboard", url:"https://artificialanalysis.ai/leaderboards/models" },
    { label:"SWE-bench — official coding-agent leaderboards", url:"https://www.swebench.com/" },
    { label:"Terminal-Bench — official terminal-agent leaderboard", url:"https://www.tbench.ai/leaderboard" },
    { label:"Our coverage: GPT-5.6 Sol/Terra/Luna public launch", url:"#/article/gpt-5-6-sol-terra-luna-launch" },
    { label:"Our coverage: Chinese models and the price war", url:"#/article/chinese-models-us-enterprise-share" }
  ]
};
