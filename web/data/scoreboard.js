// THE SCOREBOARD — how the models actually compare: strength vs. cost.
// Maintained by the Data Desk. Two numbers per model:
//   score : a 0–100 composite "intelligence index" aggregated from published, independent
//           benchmarks (coding, reasoning, knowledge) in the style of Artificial Analysis.
//           Higher = stronger. It is an AGGREGATE, not one test — see `basisNote` + sources.
//   pin/pout : list price per 1M input/output tokens. `est:true` marks an estimate where a
//           lab hasn't published the exact figure (shown with a ~). Unknown = null.
// The page derives VALUE = strength per dollar, so you can see the thing that actually
// matters: not just who's smartest, and not just who's cheapest, but the ratio.
// RULES: scores move only when independent benchmarks move; never inflate a lab's own number.
window.RTFC_SCOREBOARD = {
  updated: "July 12, 2026",
  basisNote: "Strength is a 0–100 composite of independent coding, reasoning, and knowledge benchmarks (anchored to Artificial Analysis' Intelligence & Coding indices and the SWE-Bench / Terminal-Bench figures in our coverage). It's an aggregate snapshot, not a single test — and it moves as new independent results land.",
  rows: [
    { model:"GPT-5.6 Sol",      lab:"OpenAI",    score:83, pin:5,    pout:25,   est:true,  status:"released",
      note:"The new flagship. Tops the independent aggregate — and priced roughly half of Fable 5, which is the story of the summer." },
    { model:"Fable 5",          lab:"Anthropic", score:80, pin:10,   pout:50,   status:"released",
      note:"Premium frontier model; still leads on the hardest agentic-coding evals, but now the most expensive seat in the house." },
    { model:"GLM-5.2",          lab:"Z.ai",      score:74, pin:0.6,  pout:2,    est:true,  status:"released",
      note:"The value bomb: frontier-adjacent strength at a fraction of the price — the engine behind Chinese models' US enterprise surge." },
    { model:"Opus 4.8",         lab:"Anthropic", score:73, pin:5,    pout:25,   status:"released",
      note:"The proven workhorse — strong agentic coding (SWE-Bench Pro 69%), well-understood, widely deployed." },
    { model:"GPT-5.6 Terra",    lab:"OpenAI",    score:72, pin:2.50, pout:15,   status:"released",
      note:"The mid-tier that reset the market. Near-flagship strength at a third of flagship price — the default most builders should start on." },
    { model:"Grok 4.5",         lab:"xAI",       score:68, pin:2,    pout:6,    status:"released",
      note:"Fourth-place intelligence at a first-place price — strong value, but watch its independently-measured hallucination rate." },
    { model:"GPT 5.5",          lab:"OpenAI",    score:66, pin:5,    pout:30,   status:"released",
      note:"Previous-gen flagship; capable and everywhere, but out-priced and out-scored by the 5.6 tiers now." },
    { model:"Gemini 3.5 Flash", lab:"Google",    score:61, pin:0.5,  pout:2,    est:true,  status:"released",
      note:"Cheap and fast; a big jump over the prior Flash. Google's volume play while Pro is delayed." },
    { model:"Muse Spark 1.1",   lab:"Meta",      score:60, pin:1.25, pout:4.25, status:"released",
      note:"Meta's first paid model — built for large-context agentic work; solid value, unproven at the top." },
    { model:"GPT-5.6 Luna",     lab:"OpenAI",    score:55, pin:1,    pout:6,    status:"released",
      note:"The budget tier: not the smartest, but plenty for summarizing, sorting, and first drafts at rock-bottom cost." },
    { model:"Gemini 3.5 Pro",   lab:"Google",    score:null, pin:null, pout:null, status:"delayed",
      note:"Promised for June, slipped to July after enterprise testers flagged reasoning issues. No independent scores yet." }
  ],
  sources: [
    { label:"Our teardown: Grok 4.5 — benchmarks, pricing, the hallucination caveat", url:"#/article/grok-4-5-the-price-is-the-product" },
    { label:"Our coverage: GPT-5.6 Sol/Terra/Luna public launch & pricing", url:"#/article/gpt-5-6-sol-terra-luna-launch" },
    { label:"Our coverage: Chinese models (GLM-5.2) and the price war", url:"#/article/chinese-models-us-enterprise-share" }
  ]
};
