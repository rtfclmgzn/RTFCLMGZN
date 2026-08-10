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
    "article_id": "live-014",
    "ts": "2026-07-13T08:10:00Z",
    "export": {
      "article_id": "live-014",
      "url": "/#/article/tsmc-record-q2-revenue-ai-demand",
      "headline": "The AI boom just printed a receipt: TSMC did $39.6 billion in one quarter",
      "hook": "TSMC's record quarter is the strongest physical-demand signal in AI — and Thursday's margins will show what that demand costs.",
      "key_facts": [
        "Q2 revenue reached T$1.27T ($39.62B), up 36% year over year",
        "June revenue rose 67.9% year over year to T$442.68B",
        "Full Q2 earnings and guidance arrive Thursday"
      ],
      "tone": "technical, numbers-first",
      "persona": "jin-park",
      "section": "Compute",
      "primary_image": "assets/img/live-014-tsmc-fab.webp",
      "disclaimer": "not-financial-advice"
    },
    "posts": [
      {
        "platform": "x",
        "copy": "The AI boom just printed a physical receipt.\n\nTSMC Q2 revenue: T$1.27T ($39.62B), up 36% YoY and a record. June alone rose 67.9%.\n\nDemand is no longer the question. Thursday's margin, capex and capacity guidance will tell us what supplying it costs. →",
        "hashtags": [
          "#AI",
          "#Semiconductors",
          "#TSMC"
        ],
        "image": {
          "prompt": "Dark editorial semiconductor foundry image with glowing wafer geometry and industrial precision, violet and amber accents, no text.",
          "status": "ready",
          "cost_usd": 0
        },
        "status": "ready",
        "post_url": null
      },
      {
        "platform": "instagram",
        "copy": "The AI boom just printed a receipt.\n\nTSMC reported a record T$1.27 trillion ($39.62B) in second-quarter revenue, up 36% from a year ago. June sales rose 67.9%.\n\nThat proves physical demand. Thursday's earnings call will answer the harder question: can capacity keep expanding without crushing margins? Full analysis at RTFCLMGZN.",
        "hashtags": [
          "#AI",
          "#TSMC",
          "#Semiconductors",
          "#Chips",
          "#DataCenters",
          "#TechNews"
        ],
        "image": {
          "prompt": "Square editorial semiconductor foundry image, luminous wafer rings, deep ink background, violet and amber accents, no text.",
          "status": "ready",
          "cost_usd": 0
        },
        "status": "ready",
        "post_url": null
      },
      {
        "platform": "facebook",
        "copy": "TSMC just reported the clearest physical signal of AI demand this quarter: record Q2 revenue of T$1.27 trillion ($39.62B), up 36% year over year.\n\nThe next test arrives Thursday. Gross margin, capex and advanced-capacity guidance will show whether the supply chain is turning demand into durable economics — or simply spending faster to keep up.\n\nRead the full Compute desk analysis:",
        "hashtags": [
          "#AI",
          "#Semiconductors"
        ],
        "image": {
          "prompt": "Wide editorial semiconductor factory scene with wafer geometry, dark violet and amber palette, no text.",
          "status": "ready",
          "cost_usd": 0
        },
        "status": "ready",
        "post_url": null
      }
    ]
  },
  {
    "article_id": "live-015",
    "ts": "2026-07-13T07:47:00Z",
    "export": {
      "article_id": "live-015",
      "url": "/#/article/ai-corporate-labs-bell-labs-bargain",
      "headline": "AI is rebuilding Bell Labs inside five companies. The price is scientific power.",
      "hook": "AI may be reviving the corporate research lab, but the same companies funding the science increasingly control access to it.",
      "key_facts": [
        "Industry involvement in notable AI models rose from roughly 25% historically to 80% today",
        "Business share of U.S. basic research recovered from 14% in 2004 to 32%",
        "Only 40% of doctorate recipients now plan to enter academia, down from 56% in 2004"
      ],
      "tone": "essayistic, sourced, argumentative",
      "persona": "sage-okafor",
      "section": "Opinion",
      "primary_image": "assets/img/live-015.jpg",
      "disclaimer": "none"
    },
    "posts": [
      {
        "platform": "x",
        "copy": "AI is rebuilding Bell Labs inside five companies.\n\nIndustry involvement in notable models: ~25% historically → 80% today. Business now performs 32% of U.S. basic research.\n\nThe renaissance is real. So is the concentration of who gets to choose the questions. →",
        "hashtags": [
          "#AI",
          "#Research"
        ],
        "image": {
          "prompt": "Editorial image of a classic research library merging with modern circuit diagrams, deep violet palette, no text.",
          "status": "ready",
          "cost_usd": 0
        },
        "status": "ready",
        "post_url": null
      },
      {
        "platform": "instagram",
        "copy": "The corporate lab is back.\n\nFrontier AI increasingly requires the compute, data and engineering budgets of a platform company. That can produce breakthroughs universities cannot afford — while concentrating control over what gets studied, published and deployed.\n\nOur new Opinion essay asks what society gets in return for that bargain.",
        "hashtags": [
          "#AI",
          "#Science",
          "#Research",
          "#OpenScience",
          "#TechPolicy"
        ],
        "image": {
          "prompt": "Square editorial research library fused with luminous circuitry, archival paper and violet light, no text.",
          "status": "ready",
          "cost_usd": 0
        },
        "status": "ready",
        "post_url": null
      },
      {
        "platform": "facebook",
        "copy": "Industry now participates in roughly 80% of notable AI models, compared with about a quarter historically. The corporate research lab is returning because frontier experiments increasingly require industrial-scale compute.\n\nThat may accelerate invention. It also concentrates the power to decide what gets researched, disclosed and deployed. Our Opinion desk examines the bargain — and what a healthier settlement could look like:",
        "hashtags": [
          "#AI",
          "#Research"
        ],
        "image": {
          "prompt": "Wide editorial laboratory-library image with blueprint circuitry, deep ink and violet palette, no text.",
          "status": "ready",
          "cost_usd": 0
        },
        "status": "ready",
        "post_url": null
      }
    ]
  },
  {
    "article_id": "live-016",
    "ts": "2026-07-13T07:23:00Z",
    "export": {
      "article_id": "live-016",
      "url": "/#/article/ai-agent-identity-trust-standards-itu",
      "headline": "Before an AI agent can spend your money, it needs a passport",
      "hook": "The agent economy needs identity, permission, logs and revocation before it needs more personality.",
      "key_facts": [
        "ITU launched a Focus Group on Agentic AI",
        "The work covers identity, trust and meaningful human control",
        "Financial transactions and critical infrastructure are explicit focus areas"
      ],
      "tone": "formal, practical, policy-aware",
      "persona": "evelyn-zhao",
      "section": "Policy",
      "primary_image": "assets/img/live-016.jpg",
      "disclaimer": "none"
    },
    "posts": [
      {
        "platform": "x",
        "copy": "Before an AI agent can spend your money, it needs a passport.\n\nThe ITU just opened a standards effort around agent identity, trust and human control.\n\nThe production stack is boring but decisive: principal, permissions, receipts, revocation. →",
        "hashtags": [
          "#AIAgents",
          "#AIgovernance"
        ],
        "image": {
          "prompt": "Editorial agent identity card over a network blueprint, dark ink and violet glow, no text.",
          "status": "ready",
          "cost_usd": 0
        },
        "status": "ready",
        "post_url": null
      },
      {
        "platform": "instagram",
        "copy": "The agent economy will not run on personality. It will run on identity, permission, receipts and revocation.\n\nThe ITU has launched a Focus Group on Agentic AI to develop common foundations for trust and meaningful human control — especially in finance and critical infrastructure.\n\nNew Policy brief at RTFCLMGZN.",
        "hashtags": [
          "#AIAgents",
          "#AI",
          "#AIGovernance",
          "#Cybersecurity",
          "#EnterpriseAI"
        ],
        "image": {
          "prompt": "Square editorial digital identity card connected to agent nodes, dark blueprint aesthetic, violet accents, no text.",
          "status": "ready",
          "cost_usd": 0
        },
        "status": "ready",
        "post_url": null
      },
      {
        "platform": "facebook",
        "copy": "AI agents are beginning to schedule, purchase and act across connected systems. The missing layer is not another benchmark — it is proof of who the agent represents, what authority it has and how that authority can be revoked.\n\nThe ITU has now opened a standards effort around exactly that problem. Our new Policy brief explains what builders and buyers should implement before the standard is finished:",
        "hashtags": [
          "#AIAgents",
          "#AIgovernance"
        ],
        "image": {
          "prompt": "Wide editorial agent identity and permissions network, dark ink background with violet light, no text.",
          "status": "ready",
          "cost_usd": 0
        },
        "status": "ready",
        "post_url": null
      }
    ]
  },
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
,
{
  "article_id": "newsroom-darpa-venom-f16-ai-controlled-flight",
  "ts": "2026-08-10T20:58:00Z",
  "export": {
    "article_id": "newsroom-darpa-venom-f16-ai-controlled-flight",
    "url": "/#/article/darpa-venom-f16-ai-controlled-flight",
    "headline": "An AI agent flew a US Air Force F-16 in real flight tests, with a pilot ready to take back control at a switch",
    "hook": "An AI agent flew a real US Air Force F-16 fighter jet in July, with a human safety pilot able to reclaim control at any moment via one switch.",
    "key_facts": [
      "DARPA and the Air Force disclosed the flight July 16 at Eglin Air Force Base",
      "VENOM converts standard F-16s, not a one-off testbed like the earlier X-62A VISTA jet",
      "DARPA hasn't disclosed flight counts or durations beyond the one announcement"
    ],
    "tone": "measured, skeptical of overclaiming",
    "persona": "ash-lindqvist",
    "section": "Robotics",
    "primary_image": "assets/img/newsroom/newsroom-darpa-venom-f16-ai-controlled-flight.jpg",
    "disclaimer": "none"
  },
  "posts": [
    {
      "platform": "x",
      "variant": "hook",
      "copy": "An AI agent flew a real US Air Force F-16 in July. A safety pilot could reclaim control at any moment with one switch. DARPA says it's the first time a standard fighter jet -- not a one-off testbed -- has flown this way.",
      "reply_copy": "Full story:",
      "link_in_reply": true,
      "hashtags": [
        "#AI",
        "#DARPA"
      ],
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "x",
      "variant": "second-wave",
      "not_before": "2026-08-11T01:54:42Z",
      "copy": "What DARPA hasn't said about its AI-flown F-16 test: no flight count, no flight-hour total, no maneuver detail beyond \"basic flight control.\" \"An AI flew an F-16\" is confirmed. \"Ready for combat\" is not a claim DARPA has made.",
      "reply_copy": "The full breakdown:",
      "link_in_reply": true,
      "hashtags": [
        "#AI"
      ],
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "instagram",
      "copy": "An AI just flew a real US Air Force fighter jet.\n\nDARPA and the Air Force disclosed a VENOM-modified F-16 flew under AI control in July at Eglin Air Force Base -- with a human safety pilot able to take back control instantly via one switch.\n\nWhat's different this time: VENOM converts standard operational F-16s, not a single purpose-built research jet. Full story at the link in bio.",
      "hashtags": [
        "#AI",
        "#ArtificialIntelligence",
        "#DARPA",
        "#F16",
        "#Aviation",
        "#Robotics",
        "#Defense",
        "#TechNews"
      ],
      "image": {
        "prompt": null,
        "status": "none",
        "cost_usd": 0
      },
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "facebook",
      "copy": "An AI agent flew a real US Air Force F-16 fighter jet in July -- with a human pilot in the cockpit the whole time, able to take back control instantly at a dedicated switch.\n\nDARPA's VENOM program is a real step up from earlier tests: it converts standard operational F-16s rather than relying on a single specially built research jet. What DARPA hasn't published is a flight count or a flight-hour total -- so \"an AI flew an F-16\" is confirmed, but \"ready for combat\" isn't a claim anyone has made yet.\n\nFull story:",
      "hashtags": [
        "#AI",
        "#Defense"
      ],
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "threads",
      "copy": "An AI agent flew a real US Air Force F-16 in July. A safety pilot stayed in the cockpit the whole time, able to reclaim control at one switch. DARPA's VENOM program converts standard fighter jets -- not a single one-off research aircraft like the earlier X-62A VISTA. Real milestone, still a supervised one.",
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "bluesky",
      "copy": "An AI flew a real US Air Force F-16 in July. Safety pilot could reclaim control at one switch, the whole flight. DARPA's VENOM converts standard fighters, not a one-off testbed.",
      "status": "ready",
      "post_url": null
    }
  ]
},
{
  "article_id": "newsroom-meta-muse-code-contributor-tier-pricing",
  "ts": "2026-08-10T20:58:00Z",
  "export": {
    "article_id": "newsroom-meta-muse-code-contributor-tier-pricing",
    "url": "/#/article/meta-muse-code-contributor-tier-pricing",
    "headline": "Meta's new coding agent is up to 20x cheaper if you let it train on your code",
    "hook": "Meta's new Muse Code coding agent costs up to 20x less on its Contributor tier -- in exchange for prompts and completions Meta may use to train its next model.",
    "key_facts": [
      "Contributor: $0.10/M input, $0.20/M output vs Standard's $1.25/$4.25",
      "Contributor data may train Meta's models; Standard data never does, per Meta's own page",
      "Once code trains a model there's no extraction procedure -- researchers say that makes erasure requests effectively unsatisfiable"
    ],
    "tone": "practical, two-sided",
    "persona": "nova-reyes",
    "section": "Products",
    "primary_image": "assets/img/newsroom/newsroom-meta-muse-code-contributor-tier-pricing.jpg",
    "disclaimer": "none"
  },
  "posts": [
    {
      "platform": "x",
      "variant": "hook",
      "copy": "Meta's new Muse Code coding agent is up to 20x cheaper on its \"Contributor\" tier. The catch: Meta may use your prompts and completions to train its next model on that tier -- and once code trains a model, there's no getting it back out.",
      "reply_copy": "The full breakdown:",
      "link_in_reply": true,
      "hashtags": [
        "#AI",
        "#Meta"
      ],
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "x",
      "variant": "second-wave",
      "not_before": "2026-08-11T01:54:44Z",
      "copy": "The real question with Meta's discount coding tier isn't whether the trade is fair to you -- it's whether you have the authority to make it on your employer's or client's code. Explicit disclosure to a user isn't the same as consent from whoever actually owns the repo.",
      "reply_copy": "Full analysis:",
      "link_in_reply": true,
      "hashtags": [
        "#AI"
      ],
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "instagram",
      "copy": "Meta's new coding agent is up to 20x cheaper -- if you let it train on your code.\n\nMuse Code's \"Contributor\" tier runs $0.10/M input tokens vs $1.25 on Standard. The trade: Meta may use your prompts and completions to improve its models. Once code trains a model, there's no procedure to pull it back out.\n\nFor a hobby project? Maybe a fair trade. For your employer's codebase? Probably not yours to trade. Full story at the link in bio.",
      "hashtags": [
        "#AI",
        "#Meta",
        "#Coding",
        "#SoftwareEngineering",
        "#TechNews",
        "#DataPrivacy",
        "#ArtificialIntelligence",
        "#Developers"
      ],
      "image": {
        "prompt": null,
        "status": "none",
        "cost_usd": 0
      },
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "facebook",
      "copy": "Would you let an AI company train on your code to save money?\n\nMeta's new Muse Code coding agent has two pricing tiers on the exact same model. Standard costs $1.25/$4.25 per million tokens. Contributor costs $0.10/$0.20 -- more than 12x cheaper -- but Meta says it may use your prompts and completions to improve its products.\n\nThe part worth knowing: once code is absorbed into a model's training, there's no procedure to extract it back out, which privacy researchers say makes a GDPR-style erasure request effectively unsatisfiable.\n\nOur read: a genuinely fair trade for a hobby project, and very likely a compliance problem for anyone else's code. Full breakdown:",
      "hashtags": [
        "#AI",
        "#TechNews"
      ],
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "threads",
      "copy": "Meta's new Muse Code coding agent: 20x cheaper if you let it train on your prompts and completions. Standard tier never trains on your data; Contributor tier might. Once code trains a model there's no pulling it back out. Fine for your own side project. Not your call to make on someone else's code.",
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "bluesky",
      "copy": "Meta's new coding agent is up to 20x cheaper on its \"Contributor\" tier -- the catch is Meta may train on your prompts and completions, with no way to undo it once that happens.",
      "status": "ready",
      "post_url": null
    }
  ]
},
{
  "article_id": "newsroom-ai-data-center-electricity-ratepayer-fight-2026",
  "ts": "2026-08-10T20:58:00Z",
  "export": {
    "article_id": "newsroom-ai-data-center-electricity-ratepayer-fight-2026",
    "url": "/#/article/ai-data-center-electricity-ratepayer-fight-2026",
    "headline": "Congress, five states, and the White House all moved on AI data-center power costs this summer. The numbers they're citing don't measure the same thing.",
    "hook": "A House bill cleared committee 52-0, New York's governor sidestepped her own legislature, and a senator's viral 267% electricity-bill stat turned out to measure something else entirely.",
    "key_facts": [
      "H.R. 9340 (Ratepayer Protection Act) advanced 52-0 in the House on July 21 -- no Senate companion yet",
      "NY's governor signed a narrower 50-MW executive order instead of the legislature's unsigned 20-MW moratorium bill",
      "Sen. Warren's 267% figure measured wholesale prices, not bills; PolitiFact rated it Mostly False"
    ],
    "tone": "analytical, numbers-first, skeptical of headline figures",
    "persona": "evelyn-zhao",
    "section": "Policy",
    "primary_image": "assets/img/newsroom/newsroom-ai-data-center-electricity-ratepayer-fight-2026.jpg",
    "disclaimer": "none"
  },
  "posts": [
    {
      "platform": "x",
      "variant": "hook",
      "copy": "A House bill on AI data-center power costs just cleared committee 52-0. New York's governor sidestepped her own legislature with an executive order. And a US senator's viral \"267% electricity bill\" stat actually measured wholesale prices, not bills.",
      "reply_copy": "The full story:",
      "link_in_reply": true,
      "hashtags": [
        "#AI",
        "#EnergyPolicy"
      ],
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "x",
      "variant": "second-wave",
      "not_before": "2026-08-11T01:54:46Z",
      "copy": "Texas's ERCOT is tracking 410 GW of large-load interconnection requests -- about 87% of it data centers. That queue alone is nearly triple the state's current generating capacity. The rule the state writes to handle it may matter more than anything Congress does.",
      "reply_copy": "Read the full piece:",
      "link_in_reply": true,
      "hashtags": [
        "#AI"
      ],
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "instagram",
      "copy": "Everyone agrees AI data centers are raising electricity bills. Nobody agrees on by how much.\n\nA House bill cleared committee 52-0. New York's governor signed an executive order instead of her own legislature's bill. Ohio's rates are up 175% since 2005. A US senator's viral 267% stat turned out to measure wholesale prices, not bills -- and got rated Mostly False.\n\nFive real numbers, five different things. Full breakdown at the link in bio.",
      "hashtags": [
        "#AI",
        "#EnergyPolicy",
        "#DataCenters",
        "#Electricity",
        "#Policy",
        "#TechNews",
        "#ClimateAndEnergy"
      ],
      "image": {
        "prompt": null,
        "status": "none",
        "cost_usd": 0
      },
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "facebook",
      "copy": "This summer, Congress, five states, and the White House all moved on the same problem: AI data centers are visibly raising electricity bills. What's missing is a single number anyone agrees on for how big the problem actually is.\n\nA bipartisan House bill cleared committee 52-0 on July 21 -- but has no Senate companion. New York's governor sidestepped her own legislature's moratorium bill with a narrower executive order. And a widely repeated \"267% increase\" statistic from a US senator turned out to measure wholesale electricity prices, not what actually lands on a residential bill -- PolitiFact rated it Mostly False.\n\nWe reconciled five real, differently-scoped numbers and mapped where every state and federal effort actually stands. Full story:",
      "hashtags": [
        "#AI",
        "#EnergyPolicy"
      ],
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "threads",
      "copy": "AI data centers are raising electricity bills -- but the numbers being cited don't measure the same thing. A House bill cleared committee 52-0. NY's governor sidestepped her own legislature. A senator's viral 267% stat was actually wholesale prices, not bills, and got rated Mostly False. We reconciled five real figures against what each one actually covers.",
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "bluesky",
      "copy": "A House bill on data-center power costs cleared committee 52-0. NY's governor sidestepped her own legislature. A senator's viral 267% stat was actually wholesale prices, not bills. Five real numbers, none measuring the same thing.",
      "status": "ready",
      "post_url": null
    }
  ]
}
];
