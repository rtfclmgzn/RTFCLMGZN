// ============================================================================
// THE ENTITY LAYER — who makes what, and who owns them.
//
// WHY THIS FILE EXISTS
// A reader meets "Kimi K3" or "GLM-5.2" mid-sentence and has no idea whose model
// that is, let alone who owns the company that made it. A human newsroom solves
// this with an appositive on first mention ("Moonshot AI's Kimi K3") and gives up
// after the first one because prose gets clumsy. This publication solves it in the
// renderer instead: first mention of any model or lab in article prose is annotated
// automatically with maker -> parent -> access, live at read time.
//
// COST: ZERO PER ARTICLE. Nothing here is generated per story. The annotation runs
// in app.js at render time against this registry, so the entire back catalogue gains
// the layer at once and every future article gets it for free, with no tokens spent
// and no chance of a writer hallucinating an ownership claim inline. Model scores and
// prices are NOT duplicated here -- they are read live out of RTFC_SCOREBOARD, so
// there is exactly one number to maintain.
//
// MAINTENANCE (newsroom, every cycle)
//   - Covered a model launch? Add it to `models` in the same cycle you add the
//     Scoreboard row. A model on the board with no entity entry renders unannotated.
//   - `re` must match how the model is actually written in prose, including the
//     shorthand ("Fable 5" as well as "Claude Fable 5"). Anchor with \b.
//   - `makerKey` must be a real key in RTFC_COMPANIES or the chip's link 404s.
//   - NEVER invent an ownership or funding fact to fill a field. Leave it null.
//     A null field renders as nothing; a wrong one is a factual error on every
//     article that mentions the entity.
//   - `needsVerify:true` marks an entry whose ownership/structure line was seeded
//     from general knowledge rather than a cited primary source. Confirm it against
//     a filing or the company's own page, then drop the flag. Entries carrying this
//     flag still render, but they render WITHOUT the unverified sub-claim.
// ============================================================================
window.RTFC_ENTITIES = {
  updated: "2026-08-11",

  // ---------------------------------------------------------------------------
  // MODELS — matched against article prose, first mention only, per article.
  // access: "closed" (API only) | "open-weights" | "partial" | "unknown"
  // ---------------------------------------------------------------------------
  models: [
    // --- Anthropic ---
    { re:/\bClaude Fable 5\b|\bFable 5\b/i, name:"Claude Fable 5", maker:"Anthropic", makerKey:"anthropic",
      kind:"frontier reasoning model", access:"closed" },
    { re:/\bClaude Opus 5\b/i, name:"Claude Opus 5", maker:"Anthropic", makerKey:"anthropic",
      kind:"frontier reasoning model", access:"closed" },
    { re:/\bClaude Opus 4\.8\b/i, name:"Claude Opus 4.8", maker:"Anthropic", makerKey:"anthropic",
      kind:"agentic coding model", access:"closed" },
    { re:/\bClaude Sonnet 5\b/i, name:"Claude Sonnet 5", maker:"Anthropic", makerKey:"anthropic",
      kind:"mid-tier workhorse model", access:"closed" },
    { re:/\bClaude Mythos 5\b|\bMythos 5\b/i, name:"Claude Mythos 5", maker:"Anthropic", makerKey:"anthropic",
      kind:"smaller safety-focused model", access:"closed" },

    // --- OpenAI ---
    { re:/\bGPT-5\.6 Sol\b|\bSol max\b/i, name:"GPT-5.6 Sol", maker:"OpenAI", makerKey:"openai",
      kind:"frontier reasoning model", access:"closed" },
    { re:/\bGPT-5\.6 Terra\b/i, name:"GPT-5.6 Terra", maker:"OpenAI", makerKey:"openai",
      kind:"daily-driver model", access:"closed" },
    { re:/\bGPT-5\.6 Luna\b/i, name:"GPT-5.6 Luna", maker:"OpenAI", makerKey:"openai",
      kind:"budget high-volume model", access:"closed" },
    { re:/\bGPT-5\.6-Cyber\b/i, name:"GPT-5.6-Cyber", maker:"OpenAI", makerKey:"openai",
      kind:"gated offensive-security research model", access:"closed" },
    { re:/\bGPT-5\.6\b/i, name:"GPT-5.6", maker:"OpenAI", makerKey:"openai",
      kind:"frontier model family", access:"closed" },
    { re:/\bGPT-5\.5\b/i, name:"GPT-5.5", maker:"OpenAI", makerKey:"openai",
      kind:"previous-generation frontier model", access:"closed" },
    { re:/\bChatGPT\b/i, name:"ChatGPT", maker:"OpenAI", makerKey:"openai",
      kind:"consumer assistant product", access:"closed" },

    // --- Google ---
    { re:/\bGemini 3\.5 Flash\b/i, name:"Gemini 3.5 Flash", maker:"Google DeepMind", makerKey:"google",
      kind:"fast low-cost model", access:"closed" },
    { re:/\bGemini 3\.1 Pro(?: Preview)?\b/i, name:"Gemini 3.1 Pro", maker:"Google DeepMind", makerKey:"google",
      kind:"frontier model", access:"closed" },
    { re:/\bGemini 3\.5 Pro\b/i, name:"Gemini 3.5 Pro", maker:"Google DeepMind", makerKey:"google",
      kind:"frontier model", access:"closed" },

    // --- xAI ---
    { re:/\bGrok 4\.5\b/i, name:"Grok 4.5", maker:"xAI", makerKey:"xai",
      kind:"frontier model", access:"closed" },
    { re:/\bGrok\b/i, name:"Grok", maker:"xAI", makerKey:"xai",
      kind:"model family", access:"closed" },

    // --- Meta ---
    { re:/\bMuse Spark 1\.2\b/i, name:"Muse Spark 1.2", maker:"Meta", makerKey:"meta",
      kind:"frontier model", access:"partial" },
    { re:/\bMuse Spark 1\.1\b/i, name:"Muse Spark 1.1", maker:"Meta", makerKey:"meta",
      kind:"frontier model", access:"partial" },
    { re:/\bMuse Spark\b/i, name:"Muse Spark", maker:"Meta", makerKey:"meta",
      kind:"model family", access:"partial" },
    { re:/\bMuse Glimmer\b/i, name:"Muse Glimmer", maker:"Meta", makerKey:"meta",
      kind:"open-weights agent model", access:"open-weights" },
    { re:/\bLlama\b/i, name:"Llama", maker:"Meta", makerKey:"meta",
      kind:"open-weights model family", access:"open-weights" },

    // --- China labs ---
    { re:/\bKimi K3\b/i, name:"Kimi K3", maker:"Moonshot AI", makerKey:"moonshot",
      kind:"open-weights frontier model", access:"open-weights" },
    { re:/\bKimi K2\b/i, name:"Kimi K2", maker:"Moonshot AI", makerKey:"moonshot",
      kind:"open-weights model", access:"open-weights" },
    { re:/\bGLM-?5\.2\b/i, name:"GLM-5.2", maker:"Z.ai", makerKey:"zai",
      kind:"low-cost frontier model", access:"open-weights" },
    { re:/\bGLM-?5\b/i, name:"GLM-5", maker:"Z.ai", makerKey:"zai",
      kind:"model family", access:"open-weights" },
    { re:/\bZCode\b/i, name:"ZCode", maker:"Z.ai", makerKey:"zai",
      kind:"coding model", access:"open-weights" },
    { re:/\bDeepSeek[- ]V4[- ]Flash(?:-0731)?\b/i, name:"DeepSeek V4 Flash", maker:"DeepSeek", makerKey:"deepseek",
      kind:"open-weights model", access:"open-weights" },
    { re:/\bDeepSeek V4 Pro\b/i, name:"DeepSeek V4 Pro", maker:"DeepSeek", makerKey:"deepseek",
      kind:"open-weights frontier model", access:"open-weights" },
    { re:/\bDeepSeek V4\b/i, name:"DeepSeek V4", maker:"DeepSeek", makerKey:"deepseek",
      kind:"open-weights model", access:"open-weights" },
    { re:/\bQwen3\.8-Max(?:-Preview)?\b/i, name:"Qwen3.8-Max", maker:"Alibaba", makerKey:"alibaba",
      kind:"frontier model", access:"partial" },
    { re:/\bQwen\b/i, name:"Qwen", maker:"Alibaba", makerKey:"alibaba",
      kind:"model family", access:"open-weights" },
    { re:/\bERNIE\b/i, name:"ERNIE", maker:"Baidu", makerKey:"baidu",
      kind:"model family", access:"partial" },
    { re:/\bERNIE 5\.1\b/i, name:"ERNIE 5.1", maker:"Baidu", makerKey:"baidu",
      kind:"efficiency-focused frontier model", access:"partial" },
    { re:/\bHunyuan Hy3\b/i, name:"Hunyuan Hy3", maker:"Tencent", makerKey:"tencent",
      kind:"open-weights model", access:"open-weights" },
    { re:/\bDoubao(?: 2\.1 Pro)?\b/i, name:"Doubao 2.1 Pro", maker:"ByteDance", makerKey:"bytedance",
      kind:"frontier model", access:"unknown" },

    // --- Europe ---
    { re:/\bLe Chat\b/i, name:"Le Chat", maker:"Mistral AI", makerKey:"mistral",
      kind:"assistant product", access:"closed" },
    { re:/\bMistral Large\b/i, name:"Mistral Large", maker:"Mistral AI", makerKey:"mistral",
      kind:"frontier model", access:"partial" },

    // --- Enterprise & other labs (named in coverage, not yet in the Scoreboard) ---
    { re:/\bIBM Granite\b|\bGranite\b/i, name:"IBM Granite", maker:"IBM", makerKey:"ibm",
      kind:"open enterprise model family", access:"open-weights" },
    { re:/\bCommand A\+\b/i, name:"Command A+", maker:"Cohere", makerKey:"cohere",
      kind:"enterprise model", access:"open-weights" },
    { re:/\bJamba Reasoning 3B\b/i, name:"Jamba Reasoning 3B", maker:"AI21 Labs", makerKey:"ai21",
      kind:"on-device reasoning model", access:"unknown" },
    { re:/\bJamba\b/i, name:"Jamba", maker:"AI21 Labs", makerKey:"ai21",
      kind:"hybrid Mamba-Transformer model family", access:"unknown" },
    { re:/\bPi Journeys\b/i, name:"Pi Journeys", maker:"Inflection AI", makerKey:"inflection",
      kind:"consumer assistant product", access:"closed" },
    { re:/\bReka Edge\b/i, name:"Reka Edge", maker:"Reka AI", makerKey:"reka",
      kind:"vision-language model", access:"unknown" },
    { re:/\bInkling\b/i, name:"Inkling", maker:"Thinking Machines Lab", makerKey:"thinking-machines",
      kind:"open-weight multimodal model", access:"open-weights" },

    // --- Previous generations (still referenced in coverage and comparisons) ---
    { re:/\bGPT-4o\b/i, name:"GPT-4o", maker:"OpenAI", makerKey:"openai",
      kind:"previous-generation model", access:"closed" },
    { re:/\bGPT-4\b(?!o)/i, name:"GPT-4", maker:"OpenAI", makerKey:"openai",
      kind:"previous-generation model", access:"closed" },
    { re:/\bClaude Sonnet 4\.5\b/i, name:"Claude Sonnet 4.5", maker:"Anthropic", makerKey:"anthropic",
      kind:"previous-generation model", access:"closed" },
    { re:/\bClaude Opus 4\.1\b/i, name:"Claude Opus 4.1", maker:"Anthropic", makerKey:"anthropic",
      kind:"previous-generation model", access:"closed" },
    { re:/\bClaude Haiku\b/i, name:"Claude Haiku", maker:"Anthropic", makerKey:"anthropic",
      kind:"fast lightweight model line", access:"closed" },
    { re:/\bGemini 2\.5 (?:Pro|Flash)\b/i, name:"Gemini 2.5", maker:"Google DeepMind", makerKey:"google",
      kind:"previous-generation family", access:"closed" },
    { re:/\bGrok 4\b(?!\.)/i, name:"Grok 4", maker:"xAI", makerKey:"xai",
      kind:"previous-generation model", access:"closed" },
    { re:/\bLlama 4\b/i, name:"Llama 4", maker:"Meta", makerKey:"meta",
      kind:"open-weights family", access:"open-weights" },
    { re:/\bDeepSeek[- ]R1\b/i, name:"DeepSeek R1", maker:"DeepSeek", makerKey:"deepseek",
      kind:"open-weights reasoning model", access:"open-weights" },
    { re:/\bDeepSeek[- ]V3\b/i, name:"DeepSeek V3", maker:"DeepSeek", makerKey:"deepseek",
      kind:"previous-generation open model", access:"open-weights" },
    { re:/\bQwen ?3\b(?!\.)/i, name:"Qwen 3", maker:"Alibaba", makerKey:"alibaba",
      kind:"open-weights family", access:"open-weights" },
    { re:/\bMixtral\b/i, name:"Mixtral", maker:"Mistral AI", makerKey:"mistral",
      kind:"open-weights MoE family", access:"open-weights" },

    // --- Hardware / systems that read like products in prose ---
    { re:/\bDGX SuperPOD\b/i, name:"DGX SuperPOD", maker:"NVIDIA", makerKey:"nvidia",
      kind:"rack-scale AI system", access:"n/a" },
    { re:/\bBlackwell\b/i, name:"Blackwell", maker:"NVIDIA", makerKey:"nvidia",
      kind:"GPU architecture", access:"n/a" },
    { re:/\bInstinct MI\d{3}X?\b/i, name:"Instinct MI-series", maker:"AMD", makerKey:"amd",
      kind:"data-center GPU line", access:"n/a" }
  ],

  // ---------------------------------------------------------------------------
  // ORGS — the ownership/structure line behind a maker. `parent` is the entity
  // that actually controls it; `backers` are large outside shareholders, which is
  // NOT the same thing and must not be written into `parent`.
  // ---------------------------------------------------------------------------
  orgs: [
    { key:"openai",    name:"OpenAI",          parent:null, structure:"Capped-profit group under a nonprofit foundation",
      backers:"Microsoft", hq:"US", needsVerify:true },
    { key:"anthropic", name:"Anthropic",       parent:null, structure:"Public benefit corporation",
      backers:"Google, Amazon", hq:"US", needsVerify:true,
      houseNote:"Supplies the models that produce this publication." },
    { key:"google",    name:"Google DeepMind", parent:"Alphabet Inc.", structure:"Subsidiary research division",
      backers:null, hq:"US / UK" },
    { key:"meta",      name:"Meta",            parent:null, structure:"Public company (NASDAQ: META)",
      backers:null, hq:"US" },
    { key:"xai",       name:"xAI",             parent:null, structure:"Private company controlled by Elon Musk",
      backers:null, hq:"US", needsVerify:true },
    { key:"microsoft", name:"Microsoft",       parent:null, structure:"Public company (NASDAQ: MSFT)",
      backers:null, hq:"US" },
    { key:"nvidia",    name:"NVIDIA",          parent:null, structure:"Public company (NASDAQ: NVDA)",
      backers:null, hq:"US" },
    { key:"amd",       name:"AMD",             parent:null, structure:"Public company (NASDAQ: AMD)",
      backers:null, hq:"US" },
    { key:"apple",     name:"Apple",           parent:null, structure:"Public company (NASDAQ: AAPL)",
      backers:null, hq:"US" },
    { key:"amazon",    name:"Amazon",          parent:null, structure:"Public company (NASDAQ: AMZN)",
      backers:null, hq:"US" },
    { key:"moonshot",  name:"Moonshot AI",     parent:null, structure:"Private Chinese AI lab",
      backers:"Alibaba, Tencent", hq:"Beijing, China", needsVerify:true },
    { key:"zai",       name:"Z.ai",            parent:null, structure:"Private Chinese AI lab (formerly Zhipu AI)",
      backers:null, hq:"Beijing, China", needsVerify:true },
    { key:"deepseek",  name:"DeepSeek",        parent:"High-Flyer", structure:"Lab spun out of a quantitative hedge fund",
      backers:null, hq:"Hangzhou, China", needsVerify:true },
    { key:"alibaba",   name:"Alibaba",         parent:null, structure:"Public company (NYSE: BABA)",
      backers:null, hq:"Hangzhou, China" },
    { key:"baidu",     name:"Baidu",           parent:null, structure:"Public company (NASDAQ: BIDU)",
      backers:null, hq:"Beijing, China" },
    { key:"tencent",   name:"Tencent",         parent:null, structure:"Public company (HKEX: 0700)",
      backers:null, hq:"Shenzhen, China" },
    { key:"bytedance", name:"ByteDance",       parent:null, structure:"Private company",
      backers:null, hq:"Beijing, China" },
    { key:"mistral",   name:"Mistral AI",      parent:null, structure:"Private French AI lab",
      backers:null, hq:"Paris, France", needsVerify:true },
    { key:"tsmc",      name:"TSMC",            parent:null, structure:"Public company (TWSE: 2330)",
      backers:null, hq:"Hsinchu, Taiwan" },
    { key:"samsung",   name:"Samsung",         parent:null, structure:"Public company (KRX: 005930)",
      backers:null, hq:"South Korea" },
    { key:"sk-hynix",  name:"SK Hynix",        parent:"SK Group", structure:"Subsidiary of a Korean conglomerate",
      backers:null, hq:"South Korea" },
    { key:"cxmt",      name:"CXMT",            parent:null, structure:"Chinese DRAM maker, Shanghai-listed",
      backers:null, hq:"Hefei, China", needsVerify:true },
    { key:"huawei",    name:"Huawei",          parent:null, structure:"Private company, employee-shareholder owned",
      backers:null, hq:"Shenzhen, China", needsVerify:true },
    { key:"huggingface", name:"Hugging Face",  parent:null, structure:"Private company",
      backers:null, hq:"US / France" },
    { key:"unitree",   name:"Unitree",         parent:null, structure:"Private Chinese robotics maker",
      backers:null, hq:"Hangzhou, China", needsVerify:true },
    { key:"ibm",       name:"IBM",             parent:null, structure:"Public company (NYSE: IBM)",
      backers:null, hq:"US" },
    { key:"broadcom",  name:"Broadcom",        parent:null, structure:"Public company (NASDAQ: AVGO)",
      backers:null, hq:"US" }
  ]
};
