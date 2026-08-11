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
},
{
  "article_id": "newsroom-openai-daybreak-gpt-5-6-cyber-launch",
  "ts": "2026-08-11T00:22:14Z",
  "export": {
    "article_id": "newsroom-openai-daybreak-gpt-5-6-cyber-launch",
    "url": "/#/article/openai-daybreak-gpt-5-6-cyber-launch",
    "headline": "OpenAI’s new cybersecurity model answers 95% of hacking requests its public model refuses. Getting access needs ID verification and, from September, a hardware key.",
    "hook": "OpenAI released a hacking-capable AI model, GPT-5.6-Cyber, gated behind ID checks and a hardware-key requirement -- three days after a related model got paused for tripping the company's own 'critical' cybersecurity threshold.",
    "key_facts": [
      "GPT-5.6-Cyber completes 95% of advanced hacking requests vs. 1.5% for the public model",
      "It already found a real Chrome vulnerability (CVE-2026-15903) and mobile-OS flaws",
      "No independent lab has replicated OpenAI's own benchmark numbers"
    ],
    "tone": "measured, skeptical of self-reported claims",
    "persona": "evelyn-zhao",
    "section": "Policy",
    "primary_image": "assets/img/newsroom/newsroom-openai-daybreak-gpt-5-6-cyber-launch.jpg",
    "disclaimer": "none"
  },
  "posts": [
    {
      "platform": "x",
      "variant": "hook",
      "copy": "OpenAI just released a model built to find real zero-days -- it answers 95% of advanced hacking requests its public model refuses at 1.5%. Access needs ID verification and, from September, a hardware key. It shipped 3 days after a related model got paused for going too far.",
      "reply_copy": "Full story:",
      "link_in_reply": true,
      "hashtags": [
        "#AI",
        "#Cybersecurity"
      ],
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "x",
      "variant": "second-wave",
      "not_before": "2026-08-11T05:07:19Z",
      "copy": "The 95% vs. 1.5% completion-rate gap behind OpenAI's new cybersecurity model? That's OpenAI's own internal benchmark. No independent lab has replicated it. The Chrome vulnerability it found is real and independently verifiable -- the benchmark that says how capable the model is, isn't.",
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
      "copy": "OpenAI just shipped a model built to hack.\n\nGPT-5.6-Cyber answers 95% of advanced hacking requests its public model refuses at 1.5%. It's already found a real Chrome vulnerability and mobile-OS flaws. Access requires ID verification, a legal declaration, and -- from September -- a hardware security key.\n\nThe twist: it launched three days after a related OpenAI model got paused for tripping the company's own 'critical' cybersecurity threshold. Full story at the link in bio.",
      "hashtags": [
        "#AI",
        "#Cybersecurity",
        "#OpenAI",
        "#Hacking",
        "#TechNews",
        "#AIsafety",
        "#InfoSec"
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
      "copy": "OpenAI released a model built specifically to do the offensive-security work its public model is designed to refuse -- finding zero-day vulnerabilities and building exploit chains.\n\nGPT-5.6-Cyber completes 95% of advanced hacking requests; the public model manages 1.5%. It's already found a real Chrome vulnerability (now patched) and flaws in a popular mobile OS. Getting access requires identity verification, a legal attestation, and -- starting September 1 -- a mandatory hardware security key.\n\nThe release lands three days after OpenAI disclosed a separate, related model had been paused after tripping the company's own 'critical' cybersecurity threshold -- the first time that specific safeguard has triggered. We checked what's independently verifiable versus what's still just OpenAI's word. Full story:",
      "hashtags": [
        "#AI",
        "#Cybersecurity"
      ],
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "threads",
      "copy": "OpenAI's new GPT-5.6-Cyber answers 95% of advanced hacking requests vs. 1.5% for the public model -- and it's already found a real Chrome vulnerability. Access needs ID checks and, from September, a hardware key. It shipped 3 days after a related model got paused for tripping OpenAI's own 'critical' cyber threshold. We checked what's independently verifiable vs. just OpenAI's word.",
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "bluesky",
      "copy": "OpenAI's new hacking-capable model answers 95% of advanced requests vs 1.5% for the public one. It shipped 3 days after a related model got paused for tripping OpenAI's own 'critical' cyber threshold. The 95% figure is OpenAI's own benchmark -- unreplicated.",
      "status": "ready",
      "post_url": null
    }
  ]
},
{
  "article_id": "newsroom-firmus-2-billion-nvidia-blackstone-ai-factory-raise",
  "ts": "2026-08-11T00:22:14Z",
  "export": {
    "article_id": "newsroom-firmus-2-billion-nvidia-blackstone-ai-factory-raise",
    "url": "/#/article/firmus-2-billion-nvidia-blackstone-ai-factory-raise",
    "headline": "A former Bitcoin miner just raised $2 billion to build AI data centers in Australia. Its valuation has doubled twice in a year.",
    "hook": "Firmus, an Australian company that started as a Bitcoin miner, closed a $2 billion round backed by Nvidia and Blackstone -- its valuation has now roughly doubled twice in twelve months, to above $10.5 billion.",
    "key_facts": [
      "The $2B equity round is separate from a $10B debt facility and an A$73.3B total build-out plan",
      "Valuation went from ~$1.4B a year ago, to $5.5B in April, to $10.5B+ now",
      "Nvidia is both an investor in Firmus and its main hardware supplier"
    ],
    "tone": "skeptical, numbers-first, arithmetic-focused",
    "persona": "kian-farzan",
    "section": "Markets",
    "primary_image": "assets/img/newsroom/newsroom-firmus-2-billion-nvidia-blackstone-ai-factory-raise.jpg",
    "disclaimer": "not-financial-advice"
  },
  "posts": [
    {
      "platform": "x",
      "variant": "hook",
      "copy": "A company that was mining Bitcoin two years ago just raised $2B to build AI data centers in Australia -- valuing it above $10.5B. That's roughly double its April valuation, and double THAT valuation from a year ago. Nvidia is both an investor and its main supplier.",
      "reply_copy": "Full story:",
      "link_in_reply": true,
      "hashtags": [
        "#AI",
        "#Funding"
      ],
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "x",
      "variant": "second-wave",
      "not_before": "2026-08-11T05:07:24Z",
      "copy": "Firmus's $2B raise this week is separate from its $10B debt facility, which is separate from the A$73.3B it says its full AI-factory build-out will eventually cost. Three different pools of money, three different headline numbers -- and at least one outlet already conflated USD and AUD reporting them.",
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
      "copy": "From Bitcoin miner to $10.5 billion AI infrastructure company -- in under two years.\n\nFirmus just closed a $2 billion equity round backed by Nvidia, Coatue, Blackstone and Jane Street. Its valuation has now roughly doubled twice in twelve months. The money funds AI data centers across Australia, with Indonesia next.\n\nBut the $2B is just one of three numbers in this story -- there's also a separate $10B debt facility, and an A$73.3B total build-out plan. We scoped what each one actually covers. Full story at the link in bio.",
      "hashtags": [
        "#AI",
        "#Funding",
        "#DataCenters",
        "#Nvidia",
        "#Australia",
        "#TechNews",
        "#VentureCapital"
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
      "copy": "Firmus, an Australian AI-infrastructure company that started out as a Bitcoin miner, closed a fully subscribed $2 billion equity round this week -- pushing its valuation above $10.5 billion. That's roughly double its April valuation, which was itself roughly double where the company stood a year ago.\n\nThe round drew follow-on money from Nvidia and Coatue, plus new backing from Blackstone and Jane Street. It funds Project Southgate, Firmus's AI-data-center build-out across Australia, with Indonesia next.\n\nHere's the part headlines miss: the $2B equity round, a separate $10B debt facility, and an A$73.3 billion total projected build-out cost are three different numbers describing three different things -- and at least one outlet's headline conflated USD and AUD figures for the same round. We scoped out what each number actually covers, and who's really carrying the risk if AI-compute demand doesn't show up on schedule. Full story:",
      "hashtags": [
        "#AI",
        "#Markets"
      ],
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "threads",
      "copy": "A former Bitcoin miner just raised $2B to build AI data centers in Australia, valuing it above $10.5B -- roughly double its April valuation, itself roughly double a year ago. That's separate from a $10B debt facility and an A$73.3B total build-out plan. Nvidia is both an investor and Firmus's main hardware supplier. We scoped out what each number actually covers.",
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "bluesky",
      "copy": "Former Bitcoin miner Firmus raised $2B, valuation now $10.5B+ -- doubled twice in a year. Separate from a $10B debt facility and an A$73.3B build-out plan. Nvidia is both investor and main supplier. Three numbers, three different things.",
      "status": "ready",
      "post_url": null
    }
  ]
}
,
{
  "article_id": "newsroom-anthropic-macquarie-gic-theseus-infrastructure",
  "ts": "2026-08-11T12:55:00Z",
  "export": {
    "article_id": "newsroom-anthropic-macquarie-gic-theseus-infrastructure",
    "url": "/#/article/anthropic-macquarie-gic-theseus-infrastructure",
    "headline": "Anthropic's next data centers will be owned by Macquarie and GIC, not Anthropic",
    "hook": "Anthropic just signed up as anchor tenant on a fleet of data centers it won't own -- Macquarie and GIC are building and owning them instead, and the announcement names no dollar figure at all.",
    "key_facts": [
      "Theseus Infrastructure is jointly owned by Macquarie Asset Management and GIC; Anthropic leases capacity as anchor tenant",
      "No dollar figure, capacity number, or completion date was disclosed in the announcement",
      "Anthropic separately pledged in February to cover any consumer electricity-price increases tied to its data centers"
    ],
    "tone": "technical, detail-obsessed, reads the spec sheet",
    "persona": "jin-park",
    "section": "Compute",
    "primary_image": "assets/img/newsroom/newsroom-anthropic-macquarie-gic-theseus-infrastructure.jpg",
    "disclaimer": "none"
  },
  "posts": [
    {
      "platform": "x",
      "variant": "hook",
      "copy": "Anthropic just got a fleet of new data centers. It won't own a single one of them. Macquarie and GIC are building and owning them instead, leasing the capacity back -- and the announcement names no dollar figure, no megawatts, no date.",
      "reply_copy": "Full story:",
      "link_in_reply": true,
      "hashtags": [
        "#AI",
        "#DataCenters"
      ],
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "x",
      "variant": "second-wave",
      "not_before": "2026-08-11T17:40:00Z",
      "copy": "Meta moved $279B of data-center leases off its balance sheet. Google guarantees $44B of rent on buildings it'll never own. Anthropic took a $35B loan to lease chips instead of buying them. Theseus is the same trick, applied to whole data centers now.",
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
      "copy": "Anthropic's newest data centers will belong to someone else.\n\nMacquarie Asset Management and Singapore's GIC are forming Theseus Infrastructure to build and own AI data centers, with Anthropic signing on as anchor tenant under long-term leases.\n\nWhat's missing from the announcement is the story: no dollar figure, no megawatt count, no completion date, and no executive quoted by name. We laid out what's actually known versus what's still just a structure. Full story at the link in bio.",
      "hashtags": [
        "#AI",
        "#DataCenters",
        "#Anthropic",
        "#Infrastructure",
        "#TechNews",
        "#Compute"
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
      "copy": "Anthropic, Macquarie Asset Management and Singapore's GIC announced Theseus Infrastructure this week -- a new company that will build and own AI data centers, with Anthropic leasing the finished capacity as anchor tenant rather than building or owning anything itself.\n\nWhat the joint announcement doesn't say is the more interesting part: no total dollar figure, no site count, no capacity target in megawatts or gigawatts, and no completion date. No individual executive is quoted by name.\n\nWe looked at what this deal structure actually is -- and it matches a pattern showing up across the industry this year: Meta has moved roughly $279 billion of leases off its balance sheet, Google guarantees some $44 billion of rent on buildings it will never own, and Anthropic itself already took on a $35 billion loan to lease chips rather than buy them. Full story:",
      "hashtags": [
        "#AI",
        "#Infrastructure"
      ],
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "threads",
      "copy": "Anthropic's next data centers will be owned by Macquarie and GIC, not Anthropic. It signs on as anchor tenant under long-term leases while they build and own the buildings. The announcement names no dollar figure, no megawatts, no date -- and it's the same capex-to-opex trick Meta and Google have both used this year, just applied to Anthropic now.",
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "bluesky",
      "copy": "Anthropic's next data centers: owned by Macquarie and GIC, not Anthropic. It leases the capacity as anchor tenant. No dollar figure, no MW, no date disclosed. Same off-balance-sheet trick Meta ($279B) and Google ($44B) have run this year.",
      "status": "ready",
      "post_url": null
    }
  ]
},
{
  "article_id": "newsroom-agibot-overtakes-unitree-h1-2026-shipments",
  "ts": "2026-08-11T12:55:00Z",
  "export": {
    "article_id": "newsroom-agibot-overtakes-unitree-h1-2026-shipments",
    "url": "/#/article/agibot-overtakes-unitree-h1-2026-shipments",
    "headline": "AgiBot passed Unitree as the world's top humanoid-robot vendor in the first half of 2026",
    "hook": "AgiBot just took the humanoid-robot shipment lead from Unitree -- the same week Unitree prices a $904M Shanghai IPO built on the ranking it just lost.",
    "key_facts": [
      "AgiBot shipped ~8,400 humanoid robots in H1 2026 (44% share) vs. Unitree's ~5,900 (31%)",
      "Chinese manufacturers combined hold 97% of global humanoid-robot shipments",
      "Unitree is pricing a Shanghai IPO at 150.8 yuan/share, targeting about $904 million, the same week its shipment lead disappeared"
    ],
    "tone": "curious, hands-on, watches the demo-vs-shipping gap",
    "persona": "ash-lindqvist",
    "section": "Robotics",
    "primary_image": "assets/img/newsroom/newsroom-agibot-overtakes-unitree-h1-2026-shipments.jpg",
    "disclaimer": "none"
  },
  "posts": [
    {
      "platform": "x",
      "variant": "hook",
      "copy": "AgiBot just passed Unitree as the world's #1 humanoid-robot maker by shipments -- 8,400 units to 5,900 in H1 2026. Same week, Unitree is pricing a $904M Shanghai IPO built on the ranking it just lost.",
      "reply_copy": "Full story:",
      "link_in_reply": true,
      "hashtags": [
        "#Robotics",
        "#AI"
      ],
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "x",
      "variant": "second-wave",
      "not_before": "2026-08-11T17:45:00Z",
      "copy": "Forbes' pushback on the AgiBot/Unitree numbers: Western humanoid makers aren't behind on tech, they're deliberately not scaling until reliability is proven. Shipment share and technology lead aren't the same claim -- we laid out both sides.",
      "reply_copy": "The full breakdown:",
      "link_in_reply": true,
      "hashtags": [
        "#Robotics"
      ],
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "instagram",
      "copy": "The humanoid-robot leaderboard just flipped.\n\nAgiBot shipped roughly 8,400 humanoid robots in the first half of 2026 -- passing Unitree's 5,900 -- for a 44% global share. Chinese manufacturers combined now hold 97% of all humanoid-robot shipments worldwide.\n\nThe timing is the story: Unitree is pricing a Shanghai IPO at 150.8 yuan a share, targeting about $904 million, in the same window it lost the shipment lead it built its pitch on. Full story at the link in bio.",
      "hashtags": [
        "#Robotics",
        "#Humanoid",
        "#AgiBot",
        "#Unitree",
        "#China",
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
      "copy": "Shanghai-based AgiBot shipped roughly 8,400 humanoid robots in the first half of 2026, overtaking Hangzhou-based Unitree's approximately 5,900 units -- a 44% to 31% global-share flip, per research firm Smart Analytics Global.\n\nThe timing is notable: Unitree is pricing a Shanghai Star Market IPO at 150.8 yuan a share, targeting roughly $904 million, in the very window its shipment lead disappeared. Chinese manufacturers combined now hold 97% of global humanoid-robot shipments.\n\nNot everyone reads the shipment numbers as decisive -- Forbes' own analysis argues shipment volume measures manufacturing scale, not technology quality, and that Western makers are deliberately holding back until reliability is proven at scale. We laid out both the numbers and the pushback. Full story:",
      "hashtags": [
        "#Robotics",
        "#AI"
      ],
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "threads",
      "copy": "AgiBot passed Unitree as the world's top humanoid-robot vendor in H1 2026 -- 8,400 units to 5,900. Same week, Unitree prices a $904M Shanghai IPO built on the shipment lead it just lost. Forbes argues shipment share overstates the win; we laid out both reads.",
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "bluesky",
      "copy": "Humanoid-robot leaderboard flip: AgiBot 8,400 units (44%) passed Unitree's 5,900 (31%) in H1 2026. Unitree's pricing a $904M Shanghai IPO the same week. Chinese makers hold 97% of global shipments combined.",
      "status": "ready",
      "post_url": null
    }
  ]
},
{
  "article_id": "newsroom-intel-20-billion-stock-offering-ai-buildout",
  "ts": "2026-08-11T12:55:00Z",
  "export": {
    "article_id": "newsroom-intel-20-billion-stock-offering-ai-buildout",
    "url": "/#/article/intel-20-billion-stock-offering-ai-buildout",
    "headline": "Intel priced a $20 billion stock sale to fund AI chips, up from the $15 billion it announced hours earlier",
    "hook": "Intel filed for a $15B stock sale and upsized it to $20B the same day -- a raise that nets almost exactly what Intel says it'll spend on capex this entire year.",
    "key_facts": [
      "Intel's offering was upsized from $15B to $20B the same day, priced at $95/share, netting ~$19.7B",
      "Intel raised 2026 capex guidance to about $20B in July, up from $18B",
      "Shares fell about 4% on the announcement, after a ~175% year-to-date run"
    ],
    "tone": "brisk, arithmetic-skeptic",
    "persona": "kian-farzan",
    "section": "Markets",
    "primary_image": "assets/img/newsroom/newsroom-intel-20-billion-stock-offering-ai-buildout.jpg",
    "disclaimer": "not-financial-advice"
  },
  "posts": [
    {
      "platform": "x",
      "variant": "hook",
      "copy": "Intel filed for a $15B stock offering Monday morning. By Monday afternoon it was $20B at $95/share. Net proceeds: ~$19.7B -- almost exactly what Intel says it'll spend on capex this entire year, from one equity sale.",
      "reply_copy": "Full story:",
      "link_in_reply": true,
      "hashtags": [
        "#Intel",
        "#AI"
      ],
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "x",
      "variant": "second-wave",
      "not_before": "2026-08-11T17:50:00Z",
      "copy": "The arithmetic on Intel's raise: $19.7B net proceeds against $20B in 2026 capex guidance is ~98% coverage from one stock sale. That's not a treasury top-up -- that's a bet sized to change who's funding Intel's AI buildout.",
      "reply_copy": "The full breakdown:",
      "link_in_reply": true,
      "hashtags": [
        "#Markets"
      ],
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "instagram",
      "copy": "Intel filed to raise $15 billion Monday morning. By that afternoon, it was $20 billion, priced at $95 a share.\n\nNet proceeds of about $19.7 billion come close to covering Intel's entire 2026 capex guidance in one sale. Shares fell about 4% on the dilution -- after a stock that's already up roughly 175% this year.\n\nWe broke down the three different $20B-ish numbers in this story, and why none of them are the same figure. Full story at the link in bio. Not financial advice.",
      "hashtags": [
        "#Intel",
        "#Markets",
        "#AI",
        "#Semiconductors",
        "#Stocks",
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
      "copy": "Intel filed a $15 billion underwritten stock offering the morning of August 10 -- and upsized it to $20 billion the same day, pricing at $95 a share for expected net proceeds of about $19.7 billion.\n\nThe number is worth sitting with: Intel raised its 2026 capital-expenditure guidance to about $20 billion in July. This single equity sale nets close to that entire figure. Shares fell roughly 4% on the announcement, a standard dilution reaction, even with the stock up about 175% for the year.\n\nWe scoped out the three separate $20B-ish numbers in this story -- the capex guidance, the original ask, and the actual raise -- because they're not the same figure even though the headlines make them sound like it. Full story (not financial advice):",
      "hashtags": [
        "#Intel",
        "#Markets"
      ],
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "threads",
      "copy": "Intel filed for a $15B stock sale, upsized to $20B the same day at $95/share. Net proceeds ~$19.7B come close to covering Intel's entire 2026 capex guidance from one sale. Shares dipped ~4% on the dilution. Not financial advice.",
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "bluesky",
      "copy": "Intel: filed $15B stock offering, upsized to $20B same day at $95/share. ~$19.7B net proceeds vs. $20B 2026 capex guidance -- one sale covers nearly the whole year. Shares -4% on the news. Not financial advice.",
      "status": "ready",
      "post_url": null
    }
  ]
},
{
  "article_id": "newsroom-deephealth-fda-clearance-ai-breast-ultrasound",
  "ts": "2026-08-11T20:15:41Z",
  "export": {
    "article_id": "newsroom-deephealth-fda-clearance-ai-breast-ultrasound",
    "url": "/#/article/deephealth-fda-clearance-ai-breast-ultrasound",
    "headline": "The FDA cleared an AI tool that flags breast-cancer lesions on ultrasound. The accuracy numbers behind it aren't published yet.",
    "hook": "The FDA cleared DeepHealth's AI breast-ultrasound tool on July 28 -- but the 98% accuracy and 8-point sensitivity gain RadNet is citing come from its own unpublished study, not an outside review.",
    "key_facts": [
      "FDA 510(k) K260303 cleared DeepHealth's SMART-B breast-ultrasound AI on July 28",
      "RadNet's own 16-radiologist study reports >98% lesion-localization accuracy and an 8-point sensitivity gain",
      "RadNet plans to deploy across 400+ imaging centers, covering up to 700,000 studies a year"
    ],
    "tone": "precise, evidence-first",
    "persona": "priya-anand",
    "section": "Health",
    "primary_image": "assets/img/newsroom/newsroom-deephealth-fda-clearance-ai-breast-ultrasound.jpg",
    "disclaimer": "not-medical-advice"
  },
  "posts": [
    {
      "platform": "x",
      "variant": "hook",
      "copy": "FDA cleared an AI tool that reads breast ultrasounds and flags cancer lesions on July 28. The 98% accuracy and 8-point sensitivity gain being cited? RadNet's own study, not yet peer-reviewed.",
      "reply_copy": "Full story:",
      "link_in_reply": true,
      "hashtags": ["#AIHealth", "#FDA"],
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "x",
      "variant": "second-wave",
      "not_before": "2026-08-12T01:15:41Z",
      "copy": "A 510(k) clearance means the FDA found this device \"substantially equivalent\" to prior ones -- not that it independently verified the accuracy numbers the company is now publicizing. Worth knowing before the headline percentage sticks.",
      "reply_copy": "The full breakdown:",
      "link_in_reply": true,
      "hashtags": ["#AI", "#Radiology"],
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "instagram",
      "copy": "The FDA cleared an AI tool on July 28 that reads breast ultrasounds, flags suspicious lesions, and drafts the report -- a radiologist still signs off.\n\nThe company behind it says its own study found 98%+ accuracy and an 8-point jump in cancer-detection sensitivity. That study hasn't been peer-reviewed yet.\n\nWe broke down what's FDA-confirmed versus what's still just the company's word. Full story at the link in bio. Not medical advice.",
      "hashtags": ["#AIHealth", "#FDA", "#Radiology", "#BreastCancer", "#HealthTech", "#AI"],
      "image": { "prompt": null, "status": "none", "cost_usd": 0 },
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "facebook",
      "copy": "The FDA cleared DeepHealth's AI breast-ultrasound tool on July 28 -- it automates lesion detection and drafts a report, with a radiologist keeping final sign-off.\n\nDeepHealth's parent, RadNet, cites its own 16-radiologist study: more than 98% lesion-localization accuracy, an 8-point sensitivity gain, and a 37% cut in interpretation time. That study hasn't appeared in a peer-reviewed journal yet -- worth knowing before taking the percentages as independently confirmed.\n\nWe laid out what's regulatory fact versus what's still just the company's own account. Full story (not medical advice):",
      "hashtags": ["#AIHealth", "#FDA"],
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "threads",
      "copy": "FDA cleared an AI breast-ultrasound tool July 28. The 98% accuracy and 8-point sensitivity gain being cited are from the company's own unpublished study, not an outside review. Radiologist still signs off. Not medical advice.",
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "bluesky",
      "copy": "FDA cleared DeepHealth's AI breast-ultrasound tool July 28 (510k K260303). The >98% accuracy / 8pt sensitivity numbers are RadNet's own unpublished study, not independently verified. Not medical advice.",
      "status": "ready",
      "post_url": null
    }
  ]
},
{
  "article_id": "newsroom-openai-apple-trade-secrets-motion-to-dismiss",
  "ts": "2026-08-11T20:15:41Z",
  "export": {
    "article_id": "newsroom-openai-apple-trade-secrets-motion-to-dismiss",
    "url": "/#/article/openai-apple-trade-secrets-motion-to-dismiss",
    "headline": "OpenAI asks a judge to throw out Apple's trade-secrets lawsuit, calling it \"rotten to its core\"",
    "hook": "OpenAI's motion to dismiss Apple's trade-secrets suit says Apple never identifies an actual secret -- just two ex-Apple hires doing standard industry recruiting. A judge hears it October 1.",
    "key_facts": [
      "Apple sued OpenAI, io Products, and two named ex-Apple engineers on July 10",
      "OpenAI's Aug 5 motion calls the complaint \"rotten to its core,\" says the word \"fail\" appears ~50 times in Apple's own filing",
      "Apple's complaint separately counts more than 400 of its former employees now at OpenAI"
    ],
    "tone": "composed, legally precise",
    "persona": "evelyn-zhao",
    "section": "Policy",
    "primary_image": "assets/img/newsroom/newsroom-openai-apple-trade-secrets-motion-to-dismiss.jpg",
    "disclaimer": "none"
  },
  "posts": [
    {
      "platform": "x",
      "variant": "hook",
      "copy": "OpenAI's motion to dismiss Apple's trade-secrets suit calls it \"rotten to its core\" -- and points out Apple's own complaint uses the word \"fail\" nearly 50 times. A judge hears the motion October 1.",
      "reply_copy": "Full story:",
      "link_in_reply": true,
      "hashtags": ["#OpenAI", "#Apple"],
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "x",
      "variant": "second-wave",
      "not_before": "2026-08-12T01:15:41Z",
      "copy": "Apple's complaint counts more than 400 of its former employees now working at OpenAI. OpenAI's motion says that's just what happens when Apple loses the talent war -- not evidence of a scheme.",
      "reply_copy": "The full breakdown:",
      "link_in_reply": true,
      "hashtags": ["#AI", "#TechLaw"],
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "instagram",
      "copy": "Apple sued OpenAI in July, alleging two ex-Apple hardware engineers took confidential files and supplier info on their way out.\n\nOpenAI's August 5 motion to dismiss calls the complaint \"rotten to its core\" and says Apple never actually identifies a protectable trade secret.\n\nA judge hears the motion October 1. We laid out both sides' claims next to each other. Full story at the link in bio.",
      "hashtags": ["#OpenAI", "#Apple", "#TechNews", "#AI", "#Lawsuit"],
      "image": { "prompt": null, "status": "none", "cost_usd": 0 },
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "facebook",
      "copy": "Apple sued OpenAI, its hardware unit io Products, and two named ex-Apple engineers in July, alleging trade-secret theft -- confidential files, supplier data, and interview-room requests for Apple hardware.\n\nOpenAI's August 5 motion to dismiss fires back hard, calling the complaint \"rotten to its core\" and arguing Apple never identifies a specific, protectable secret -- just ordinary industry recruiting, dressed up as a scheme.\n\nA judge hears the motion October 1. We put Apple's claims and OpenAI's rebuttal side by side. Full story:",
      "hashtags": ["#OpenAI", "#Apple"],
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "threads",
      "copy": "OpenAI's motion to dismiss Apple's trade-secrets suit calls it \"rotten to its core,\" says Apple never names an actual secret. Apple's complaint counts 400+ ex-Apple staff now at OpenAI. Judge hears it Oct 1.",
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "bluesky",
      "copy": "OpenAI moves to dismiss Apple's trade-secrets suit, calling it \"rotten to its core.\" Apple alleges two named ex-engineers took files/supplier data; OpenAI says no secret is actually described. Hearing Oct 1.",
      "status": "ready",
      "post_url": null
    }
  ]
},
{
  "article_id": "g6",
  "ts": "2026-08-11T20:15:41Z",
  "export": {
    "article_id": "g6",
    "url": "/#/article/keep-claude-code-asking-before-it-acts",
    "headline": "Keep Claude Code asking before it acts, before auto mode becomes the default on August 14",
    "hook": "Claude Code switches to auto-approval by default on August 14. Here's the exact setting to get a human checkpoint back -- on everything, or just on pushes.",
    "key_facts": [
      "Auto mode becomes default for new Claude Code sessions on Pro, Max, and Team plans August 14",
      "Shift+Tab in the CLI (or the desktop mode dropdown) switches modes any time",
      "A permissions.ask rule in settings.json checkpoints pushes and PRs while keeping auto mode elsewhere"
    ],
    "tone": "austere, technically exacting",
    "persona": "luka-petrovic",
    "section": "Guide",
    "primary_image": "assets/img/g6.jpg",
    "disclaimer": "none"
  },
  "posts": [
    {
      "platform": "x",
      "variant": "hook",
      "copy": "Claude Code's auto mode becomes the default August 14 -- no more approval prompts before every action. If you want a checkpoint back on pushes specifically, one settings.json rule does it. Guide:",
      "reply_copy": "Full guide:",
      "link_in_reply": true,
      "hashtags": ["#ClaudeCode", "#AI"],
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "instagram",
      "copy": "Claude Code stops asking for approval before every action on August 14 -- a classifier runs on its own instead.\n\nWant a human checkpoint back? One line in your settings file checkpoints pushes and PRs while keeping auto mode everywhere else.\n\nExact steps, exact settings, at the link in bio.",
      "hashtags": ["#ClaudeCode", "#AI", "#DevTools", "#Coding"],
      "image": { "prompt": null, "status": "none", "cost_usd": 0 },
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "facebook",
      "copy": "Starting August 14, Claude Code's auto mode becomes the default for new sessions on Pro, Max, and Team plans -- it stops asking before every file edit, command, or push.\n\nIf you want a human checkpoint back, on everything or just on pushes, we wrote up the exact settings.json rules that do it, sourced straight from Anthropic's own configuration docs.\n\nGuide:",
      "hashtags": ["#ClaudeCode", "#AI"],
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "threads",
      "copy": "Claude Code's auto mode becomes the default August 14. Want a checkpoint back on pushes specifically? One permissions.ask rule in settings.json does it. Full steps in the guide.",
      "status": "ready",
      "post_url": null
    },
    {
      "platform": "bluesky",
      "copy": "Claude Code auto-approves by default from Aug 14. One settings.json rule (permissions.ask) gets you a checkpoint back on pushes/PRs while keeping auto mode elsewhere. Guide has the exact JSON.",
      "status": "ready",
      "post_url": null
    }
  ]
}
];
