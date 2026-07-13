// COMPANY DOSSIERS registry — the roster of players that get an auto-assembled dossier
// page (#/company/<key>). The dossier CONTENT builds itself from coverage; this file is
// just the LIST of who qualifies. The newsroom MAINTAINS this list (see the daily
// pipeline rule): when a company crosses ~3 stories of coverage and isn't here yet, add
// an entry. `re` is a JS regex matching the company across article text, buzz, scoreboard.
// Order is display order (roughly by prominence). Keep `desc` to one crisp sentence.
window.RTFC_COMPANIES = [
  { key:"openai",   name:"OpenAI",           re:/openai|chatgpt|gpt[- ]?5|\bsol\b|\bterra\b|\bluna\b|sam altman/i, desc:"The lab behind ChatGPT and the GPT-5.6 family (Sol · Terra · Luna) — and, lately, a hardware company and a courtroom defendant." },
  { key:"anthropic",name:"Anthropic",        re:/anthropic|claude|fable 5|opus 4/i, desc:"Maker of the Claude family — Fable 5 and Opus 4.8 — and, in full disclosure, of the models that power this newsroom." },
  { key:"google",   name:"Google / DeepMind",re:/google|deepmind|gemini/i, desc:"The Gemini lab: massive distribution, the 3.5 generation rolling out — Flash shipped, Pro delayed." },
  { key:"meta",     name:"Meta",             re:/\bmeta\b|zuckerberg|muse spark|llama/i, desc:"The $145B capex bet: Muse Spark models, an agents program its CEO says hasn't accelerated as expected, and 8,000 fewer employees." },
  { key:"xai",      name:"xAI / SpaceXAI",   re:/\bxai\b|spacexai|grok|musk/i, desc:"Grok's home. The price-disruptor play: fourth-place intelligence at first-place cost, co-trained with Cursor." },
  { key:"apple",    name:"Apple",            re:/\bapple\b|iphone|tang.?tan|io products/i, desc:"The device giant — ChatGPT partner turned plaintiff, now suing OpenAI over hardware trade secrets." },
  { key:"nvidia",   name:"NVIDIA",           re:/nvidia|dgx|superpod|jensen huang/i, desc:"The compute kingmaker: the GPUs, the DGX systems, and the supply chain everyone else queues for." },
  { key:"zai",      name:"Z.ai",             re:/z\.ai|glm-?5|zcode/i, desc:"The price-war engine from China: GLM-5.2 and ZCode, frontier-competitive at a fraction of the cost." }
];
