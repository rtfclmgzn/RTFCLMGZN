// RTFCLMGZN — Social distribution records.
// Agent A (article-export) writes the `export`; Agent B (social-posting) writes `posts[]`.
// DRY-RUN by default: copy + hashtags + image prompt are generated and staged with
// status "ready"; nothing posts to a real account until credentials are provisioned
// (see agents/social/GO-LIVE.md). Every generation step is logged to usage-log.js.
//
// status: "ready" (staged, dry-run) | "posted" (live) | "failed"
// image.status: "none" | "ready" (prompt only) | "generated"
window.RTFC_SOCIAL_POSTS = [
  {
    article_id:"live-001",
    ts:"2026-07-09T18:33:00Z",
    export:{
      article_id:"live-001",
      url:"/#/article/grok-4-5-the-price-is-the-product",
      headline:"Grok 4.5 isn't the smartest model on the board. Its bet is that it doesn't need to be.",
      hook:"SpaceXAI's new model trails the frontier on benchmarks but undercuts everyone on price — and its hallucination rate quietly doubled.",
      key_facts:[
        "Priced $2/$6 per M tokens vs Opus 4.8 at $5/$25 and Fable 5 at $10/$50",
        "Independent testing: accuracy rose 35%→52% but hallucination rate jumped 25%→54%",
        "Cursor disclosed its own codebase leaked into training, inflating one benchmark"
      ],
      tone:"skeptical, numbers-first",
      persona:"sage-okafor",
      section:"Frontier",
      primary_image:null,
      disclaimer:"none"
    },
    posts:[
      {
        platform:"x",
        copy:"Grok 4.5 is the cheapest way to be 4th-best.\n\n$2/$6 per M tokens vs Opus at $5/$25. But independent tests show its hallucination rate jumped 25%→54% — it knows more, and it's more confident when it's wrong.\n\nGreat for cheap batch work. Not for unsupervised agents. →",
        hashtags:["#AI","#Grok"],
        image:{ prompt:"Minimalist editorial illustration: a price tag dwarfing a small trophy, deep-indigo and violet palette, clean flat vector, high contrast, no text.", status:"ready", cost_usd:0.039 },
        status:"ready",
        post_url:null
      },
      {
        platform:"instagram",
        copy:"The cheapest way to be fourth-best.\n\nSpaceXAI's Grok 4.5 trails the frontier on most benchmarks — but it's a fraction of the price ($2/$6 per million tokens vs Opus at $5/$25). The catch: independent testing found its hallucination rate doubled to 54%.\n\nThe honest read: great for cheap, checkable batch work. Risky for anything that acts on its own. Full breakdown at the link in bio.",
        hashtags:["#AI","#ArtificialIntelligence","#Grok","#SpaceXAI","#LLM","#MachineLearning","#AInews","#TechNews","#Anthropic","#OpenAI"],
        image:{ prompt:"Square editorial hero image: a sleek discounted price tag beside a modest 4th-place ribbon, deep-ink background with violet gradient glow, magazine-cover minimalism, no text.", status:"ready", cost_usd:0.039 },
        status:"ready",
        post_url:null
      },
      {
        platform:"facebook",
        copy:"Is \"good enough and much cheaper\" the winning move in AI?\n\nSpaceXAI just shipped Grok 4.5. It isn't the smartest model available — it trails Opus 4.8 and Fable 5 on most benchmarks. But it's dramatically cheaper ($2/$6 per million tokens vs Opus at $5/$25) and far more token-efficient.\n\nThe asterisk worth knowing: independent testing found its hallucination rate jumped from 25% to 54% — and Cursor openly disclosed that its own codebase accidentally leaked into training, inflating one benchmark.\n\nOur take: a genuinely competitive fourth-place model at a first-place price — with one reliability flag you shouldn't ignore. Full analysis here:",
        hashtags:["#AI","#TechNews"],
        image:{ prompt:"Wide editorial banner: a price tag and a benchmark bar chart on a balance scale tipping toward price, deep-indigo/violet palette, clean flat vector, no text.", status:"ready", cost_usd:0.039 },
        status:"ready",
        post_url:null
      }
    ]
  }
];
