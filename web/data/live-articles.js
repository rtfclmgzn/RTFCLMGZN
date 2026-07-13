// LIVE pipeline output — articles produced by an actual run of the RTFCLMGZN
// editorial pipeline (research → draft → verify → screen → publish), with the
// provenance record attached. These are real stories with real, checkable sources.
window.RTFC_LIVE_ARTICLES = [
  {
    "id": "live-014",
    "slug": "tsmc-record-q2-revenue-ai-demand",
    "image": "assets/img/live-014.jpg",
    "title": "The AI boom just printed a receipt: TSMC did $39.6 billion in one quarter",
    "dek": "Second-quarter revenue rose 36% to a record T$1.27 trillion, beating expectations before Thursday's earnings call. Demand is no longer the question. Capacity, packaging and power are.",
    "persona": "jin-park",
    "section": "Compute",
    "format": "synthesis",
    "top": true,
    "publishedAt": "2026-07-13T08:05:00Z",
    "readMins": 6,
    "sample": false,
    "disclaimer": "not-financial-advice",
    "body": [
      {
        "type": "p",
        "text": "TSMC's delayed June sales update landed Monday with the cleanest demand signal the AI industry has produced this quarter. The world's largest contract chipmaker reported second-quarter revenue of T$1.27 trillion, about $39.62 billion, up 36% from a year earlier and slightly above the LSEG SmartEstimate cited by Reuters. June alone reached T$442.68 billion, up 67.9% year over year and 6.2% from May. The release had been postponed after Typhoon Bavi closed Taiwan's financial markets, but the delay did nothing to soften the number: the factory at the center of the advanced-chip supply chain just posted another record."
      },
      {
        "type": "h2",
        "text": "A foundry result is a census of demand"
      },
      {
        "type": "p",
        "text": "TSMC is not a model vendor telling you how many prompts were sent, and it is not a cloud company deciding which revenue to label AI. It manufactures the leading-edge silicon designed by companies across the stack, including major customers in accelerators, phones and custom compute. That makes its sales closer to a physical census of demand. Orders have to become wafers, packaging slots and finished chips before they can appear in this line. When revenue rises this quickly at the bottleneck, the argument that AI infrastructure demand is mostly a narrative becomes much harder to sustain."
      },
      {
        "type": "chart",
        "chart": {
          "kind": "bar",
          "title": "TSMC quarterly revenue, 2026",
          "unit": "T$ trillion",
          "source": "TSMC investor materials and Reuters, July 13, 2026",
          "data": [
            {
              "label": "Q1 2026",
              "value": 1.134
            },
            {
              "label": "Q2 2026",
              "value": 1.27,
              "hi": true
            }
          ]
        }
      },
      {
        "type": "h2",
        "text": "What the number does not prove"
      },
      {
        "type": "p",
        "text": "Revenue is not the same thing as profit, and a record quarter does not settle the valuation argument around the AI trade. TSMC reports full second-quarter results on Thursday. Analysts surveyed by LSEG expect a sharp increase in net income, but the more important details will be management's view of margins, capital spending and how quickly advanced-node and packaging capacity can expand. A manufacturer can be sold out and still face expensive constraints. The next stage of the story is whether capacity growth preserves economics or merely moves the shortage to another part of the line."
      },
      {
        "type": "quote",
        "text": "When the factory making the industry's most constrained parts posts a record, the demand debate ends. The capacity debate begins."
      },
      {
        "type": "h2",
        "text": "The constraint has moved down the stack"
      },
      {
        "type": "p",
        "text": "The AI buildout is no longer limited by a single GPU order book. It now runs through advanced packaging, high-bandwidth memory, power equipment, cooling systems and grid connections. That is why a TSMC result matters beyond semiconductors: it tells utilities, construction firms and equipment suppliers that the upstream customer is still pulling. It also tells hyperscalers that every model roadmap carries a physical delivery schedule. Software can be copied in seconds. A fabrication plant, transformer or packaging line cannot."
      },
      {
        "type": "h2",
        "text": "Three things to watch Thursday"
      },
      {
        "type": "p",
        "text": "First, gross margin: it shows whether record demand is translating into durable pricing power after the cost of new fabs and overseas expansion. Second, capital expenditure: another increase would confirm that TSMC believes the order book extends well beyond one launch cycle. Third, capacity commentary around the most advanced process nodes and packaging. If management says those queues remain tight into 2027, the industry's near-term ceiling will still be set by manufacturing throughput rather than model ambition."
      },
      {
        "type": "p",
        "text": "The useful conclusion is narrower than 'AI wins forever' and stronger than 'the boom is hype.' The physical supply chain is recording real, accelerating revenue. The burden of proof now shifts to the companies buying all of that compute: they still have to turn it into products, cash flow and productivity before the infrastructure bill becomes a return."
      }
    ],
    "apply": [
      {
        "label": "If you buy compute, separate allocation risk from model risk.",
        "text": "Your preferred model may be available while the hardware needed to serve it is not. Track capacity reservations, packaging lead times and power delivery alongside benchmark scores."
      },
      {
        "label": "If you follow AI markets, read Thursday's margins before the headline profit.",
        "text": "Revenue proves demand. Gross margin and capital-spending guidance reveal whether that demand is becoming durable economics or an increasingly expensive race to add capacity."
      },
      {
        "label": "If you build software, keep a lower-compute path alive.",
        "text": "The supply chain is expanding, but it is still constrained. Efficient routing, smaller models and graceful degradation remain product advantages when capacity gets repriced."
      }
    ],
    "links": [
      {
        "label": "TSMC investor calendar — Q2 results on July 16",
        "url": "https://investor.tsmc.com/english/financial-calendar",
        "note": "Official schedule"
      },
      {
        "label": "TSMC monthly revenue — 2026",
        "url": "https://investor.tsmc.com/english/monthly-revenue/2026",
        "note": "Official revenue table"
      }
    ],
    "sources": [
      {
        "label": "Reuters — TSMC posts record Q2 revenue on AI demand",
        "url": "https://www.reuters.com/world/asia-pacific/tsmc-q2-revenue-jumps-36-year-earlier-beating-market-expectations-2026-07-13/"
      },
      {
        "label": "TSMC — financial calendar",
        "url": "https://investor.tsmc.com/english/financial-calendar"
      },
      {
        "label": "TSMC — 2026 monthly revenue",
        "url": "https://investor.tsmc.com/english/monthly-revenue/2026"
      },
      {
        "label": "TSMC — first-quarter 2026 management report",
        "url": "https://investor.tsmc.com/chinese/encrypt/files/encrypt_file/reports/2026-04/5508a9df8981f587c73dbfaf9f577f142e22bbb1/1Q26ManagementReport.pdf"
      }
    ],
    "corrections": [],
    "pipeline": {
      "run": "fresh-batch · 2026-07-13 · 08:05Z",
      "stages": [
        {
          "name": "Assignment",
          "agent": "Managing Editor",
          "note": "Record TSMC revenue matched to Compute desk and Jin Park. Format: synthesis."
        },
        {
          "name": "Research",
          "agent": "Research Agent",
          "note": "Reuters report checked against TSMC's investor calendar, monthly revenue page and Q1 materials."
        },
        {
          "name": "Draft",
          "agent": "Jin Park",
          "note": "Built around the distinction between physical demand proof and downstream return on investment."
        },
        {
          "name": "Fact-check",
          "agent": "Verification Agent",
          "note": "T$1.27T, $39.62B, 36% year-over-year and June figures checked; analyst expectations clearly attributed."
        },
        {
          "name": "Risk screen",
          "agent": "Compliance Agent",
          "note": "Market-sensitive coverage; not-financial-advice label attached. No recommendation to buy or sell."
        },
        {
          "name": "Publish prep",
          "agent": "Publishing Agent",
          "note": "Article, RSS item, Buzz card, social drafts and original derivative artwork packaged for owner push."
        }
      ],
      "gate": {
        "decision": "Cleared for owner-directed publication",
        "note": "Fresh-news batch requested by the owner; sources remain attached for review."
      }
    }
  },
  {
    "id": "live-015",
    "slug": "ai-corporate-labs-bell-labs-bargain",
    "image": "assets/img/live-015.jpg",
    "title": "AI is rebuilding Bell Labs inside five companies. The price is scientific power.",
    "dek": "Industry now participates in roughly 80% of notable AI models, up from about a quarter historically. Basic research is moving back into corporations — and the bargain deserves more scrutiny than nostalgia.",
    "persona": "idris-vale",
    "section": "Opinion",
    "format": "synthesis",
    "publishedAt": "2026-07-13T07:42:00Z",
    "readMins": 7,
    "sample": false,
    "disclaimer": "none",
    "body": [
      {
        "type": "p",
        "text": "The most consequential AI institution of the next decade may not be a startup, university or government laboratory. It may be the research division hidden inside a platform company whose advertising, cloud or software monopoly can absorb the bill. Google DeepMind, Anthropic, OpenAI, Microsoft Research and Meta's superintelligence organization increasingly resemble a new generation of corporate laboratories: places where scientists, engineers, proprietary data and extraordinary computing budgets are assembled under one roof because almost no one else can afford the experiment."
      },
      {
        "type": "p",
        "text": "The historical analogy is Bell Labs, and it is tempting for a reason. AT&T's research system helped produce the transistor and information theory, along with a culture of long-horizon technical work that became shorthand for industrial science at its best. The AI companies are rebuilding part of that machine. They can move from mathematics to chips to product deployment without waiting for a grant cycle or licensing negotiation. That speed can create real public value. It can also concentrate the power to choose which questions get asked, which findings remain private and which capabilities reach the world."
      },
      {
        "type": "h2",
        "text": "The center of gravity has already moved"
      },
      {
        "type": "p",
        "text": "Figures summarized by Reuters Breakingviews show industry involvement in notable AI models rising from an historical average of about 25% to roughly 80% today. The business share of U.S. basic research, which fell to about 14% in 2004, has returned to 32%. Talent is following the capital: the share of doctorate recipients planning to enter academia has fallen from 56% in 2004 to 40% in the latest NCSES survey, with especially steep declines in mathematics and computer science."
      },
      {
        "type": "chart",
        "chart": {
          "kind": "bar",
          "title": "Industry involvement in notable AI models",
          "unit": "%",
          "source": "Epoch AI figures summarized by Reuters Breakingviews, July 13, 2026",
          "data": [
            {
              "label": "Historical average",
              "value": 25
            },
            {
              "label": "Today",
              "value": 80,
              "hi": true
            }
          ]
        }
      },
      {
        "type": "h2",
        "text": "Why the corporate lab came back"
      },
      {
        "type": "p",
        "text": "Frontier AI is a scientific field with an industrial cost structure. Training runs need clusters, custom networking, scarce chips, large data pipelines and teams capable of operating all of it. Stanford's 2026 AI Index describes continued growth in the scale of training compute and data. Once experiments demand infrastructure measured in billions rather than laboratory benches, the organizations already earning platform-scale cash acquire a structural advantage. The lab returns because the factory and the experiment have become the same place."
      },
      {
        "type": "quote",
        "text": "The new corporate lab can fund discoveries universities cannot afford. It can also decide which discoveries the public is allowed to inspect."
      },
      {
        "type": "h2",
        "text": "The bargain is not free science"
      },
      {
        "type": "p",
        "text": "The Bell Labs story is often told as proof that concentrated companies can finance broad invention. That is true, but incomplete. Corporate research agendas are shaped by ownership, product strategy, national-security relationships and the need to defend a moat. A breakthrough can be published because it strengthens an ecosystem; another can remain internal because it threatens a product, creates liability or confers strategic advantage. The public receives extraordinary capability, but not necessarily the methods, data or freedom to reproduce it."
      },
      {
        "type": "p",
        "text": "This matters because independent science performs jobs the frontier companies cannot credibly perform for themselves. Universities and public-interest labs evaluate claims, test harms, preserve methods, train researchers who can move between institutions and pursue questions without an immediate product path. Their role becomes more important, not less, when the most capable systems are built behind corporate access controls."
      },
      {
        "type": "h2",
        "text": "What a better settlement looks like"
      },
      {
        "type": "p",
        "text": "The answer is not to dismantle every large AI lab and hope university budgets somehow replace the compute. Nor is it to romanticize concentrated power because a few famous inventions may emerge. A workable settlement would expand public and academic compute, require stronger disclosure around evaluations and incidents, protect researcher mobility, fund independent replication and use procurement or grants to keep some foundational work in the open. The goal is to preserve the corporate lab's ability to build without allowing it to become the only institution capable of knowing."
      },
      {
        "type": "p",
        "text": "AI may indeed revive an era of industrial invention. The question is whether society negotiates the terms while the laboratories are still being built, or discovers later that scientific progress arrived bundled with a private constitution."
      }
    ],
    "apply": [
      {
        "label": "If you are a researcher, evaluate the institution as carefully as the project.",
        "text": "Compute and compensation matter, but so do publication rights, access to results after departure, and the freedom to challenge a product decision."
      },
      {
        "label": "If you fund public research, stop treating compute as a miscellaneous expense.",
        "text": "Independent evaluation requires infrastructure. A grant system that funds people but not realistic access to modern compute cannot balance corporate science."
      },
      {
        "label": "If you run an AI company, publish the boundary.",
        "text": "State what research will be open, what may remain proprietary, and how safety or evaluation findings are escalated. Ambiguity eventually becomes a trust cost."
      }
    ],
    "links": [
      {
        "label": "Stanford 2026 AI Index — Research and Development",
        "url": "https://hai.stanford.edu/ai-index/2026-ai-index-report/research-and-development",
        "note": "Primary data overview"
      },
      {
        "label": "NCSES Survey of Earned Doctorates",
        "url": "https://ncses.nsf.gov/surveys/earned-doctorates/2024",
        "note": "Doctoral-career data"
      }
    ],
    "sources": [
      {
        "label": "Reuters Breakingviews — AI giants revive the golden era of invention",
        "url": "https://www.reuters.com/commentary/breakingviews/ai-giants-revive-golden-era-invention-2026-07-13/"
      },
      {
        "label": "Stanford HAI — 2026 AI Index, Research and Development",
        "url": "https://hai.stanford.edu/ai-index/2026-ai-index-report/research-and-development"
      },
      {
        "label": "NCSES — Survey of Earned Doctorates 2024",
        "url": "https://ncses.nsf.gov/surveys/earned-doctorates/2024"
      },
      {
        "label": "NBER — The Rise and Fall of the Corporate Lab",
        "url": "https://www.nber.org/system/files/working_papers/w29260/w29260.pdf"
      }
    ],
    "corrections": [],
    "pipeline": {
      "run": "fresh-batch · 2026-07-13 · 07:42Z",
      "stages": [
        {
          "name": "Assignment",
          "agent": "Managing Editor",
          "note": "Current research-concentration story assigned to Opinion desk and Idris Vale."
        },
        {
          "name": "Research",
          "agent": "Research Agent",
          "note": "Reuters analysis cross-checked against Stanford HAI, NCSES and NBER materials."
        },
        {
          "name": "Draft",
          "agent": "Idris Vale",
          "note": "Argument constructed around the benefits and governance costs of a corporate-lab revival."
        },
        {
          "name": "Editorial review",
          "agent": "Editorial Review Agent",
          "note": "Opinion language kept distinct from factual claims; counterargument on university limits included."
        },
        {
          "name": "Fact-check",
          "agent": "Verification Agent",
          "note": "25%, 80%, 14%, 32%, 56% and 40% figures scoped and attributed rather than presented as universal facts."
        },
        {
          "name": "Publish prep",
          "agent": "Publishing Agent",
          "note": "Clearly categorized as Opinion; source links and social drafts packaged."
        }
      ],
      "gate": {
        "decision": "Cleared for owner-directed publication",
        "note": "Commentary is explicitly labeled and factual scaffolding is sourced."
      }
    }
  },
  {
    "id": "live-016",
    "slug": "ai-agent-identity-trust-standards-itu",
    "image": "assets/img/live-016.jpg",
    "title": "Before an AI agent can spend your money, it needs a passport",
    "dek": "The ITU has launched a standards effort around agent identity, trust and meaningful human control. The boring layer may determine whether autonomous software ever reaches production.",
    "persona": "marcus-webb",
    "section": "Policy",
    "format": "brief",
    "publishedAt": "2026-07-13T07:18:00Z",
    "readMins": 4,
    "sample": false,
    "disclaimer": "none",
    "body": [
      {
        "type": "p",
        "text": "The International Telecommunication Union used last week's AI for Good Summit to open a Focus Group on Agentic AI. Its mandate sounds less dramatic than a new model launch and may matter more to whether agents become ordinary infrastructure: establish ways to identify them, decide when they can be trusted and keep people meaningfully in control of what they do. The group is responding to a simple problem. Software that can schedule, purchase, negotiate or operate a business process is no longer just producing content. It is exercising authority."
      },
      {
        "type": "h2",
        "text": "Identity before autonomy"
      },
      {
        "type": "p",
        "text": "A production agent needs more than a model name. A counterparty needs to know which person or organization it represents, what permissions it has, which tools and accounts it may use, how its actions are logged and how that authority can be revoked. Without those elements, an agent can impersonate a user, exceed a delegated task or leave no clear path to responsibility after a mistake. The ITU specifically highlighted financial transactions and critical infrastructure as areas where that ambiguity is unacceptable."
      },
      {
        "type": "quote",
        "text": "The agent economy will not run on personality. It will run on identity, permission, receipts and revocation."
      },
      {
        "type": "h2",
        "text": "Standards are arriving after the products"
      },
      {
        "type": "p",
        "text": "Companies are already shipping systems that browse, call tools and act across connected applications, but the trust layer remains fragmented. One platform's identity token, audit log or approval prompt does not automatically travel with an agent into another service. International standards cannot solve every liability question, and the ITU group is not a regulator. It can, however, define common technical expectations that regulators, banks, vendors and infrastructure operators can build around."
      },
      {
        "type": "p",
        "text": "The Focus Group's first meeting is scheduled for Paris in November, followed by Geneva in January. That timeline means builders should not wait for a finished standard. The minimum viable trust layer is already clear enough to implement: explicit principals, least-privilege credentials, human approval for high-impact actions, tamper-evident logs and a kill switch that works outside the model's own reasoning loop."
      },
      {
        "type": "h2",
        "text": "The commercial consequence"
      },
      {
        "type": "p",
        "text": "Agent capability is improving faster than enterprise willingness to delegate authority. Identity and control are therefore not compliance features bolted onto the product; they are adoption infrastructure. The vendor that can prove who acted, under whose authority and within which boundary will often beat the vendor with the more impressive demo. Autonomy becomes valuable only when someone can safely say yes to it."
      }
    ],
    "apply": [
      {
        "label": "Builders: write the authority envelope before the prompt.",
        "text": "Define the principal, allowed tools, spending or data limits, approval points, log format and revocation path before connecting an agent to production systems."
      },
      {
        "label": "Buyers: ask for receipts, not reassurance.",
        "text": "Request machine-readable action logs, permission scopes, incident handling and proof that credentials can be revoked without asking the agent to cooperate."
      },
      {
        "label": "Policy teams: separate identity from intelligence.",
        "text": "A model evaluation cannot tell you who authorized a transaction. Treat agent identity, delegation and auditability as their own control layer."
      }
    ],
    "links": [
      {
        "label": "ITU — Focus Group on Agentic AI",
        "url": "https://www.itu.int/en/mediacentre/Pages/PR-2026-07-09-focus-group-agentic-AI.aspx",
        "note": "Official announcement"
      },
      {
        "label": "AI for Good — trust management for Agentic AI",
        "url": "https://aiforgood.itu.int/event/designing-the-trust-management-for-agentic-ai/",
        "note": "Standards workshop"
      }
    ],
    "sources": [
      {
        "label": "ITU — Focus Group on Agentic AI",
        "url": "https://www.itu.int/en/mediacentre/Pages/PR-2026-07-09-focus-group-agentic-AI.aspx"
      },
      {
        "label": "Reuters — UN digital tech agency launches initiative to improve trust in AI agents",
        "url": "https://www.reuters.com/legal/litigation/un-digital-tech-agency-launches-initiative-improve-trust-ai-agents-2026-07-09/"
      },
      {
        "label": "AI for Good — Designing trust management for Agentic AI",
        "url": "https://aiforgood.itu.int/event/designing-the-trust-management-for-agentic-ai/"
      }
    ],
    "corrections": [],
    "pipeline": {
      "run": "fresh-batch · 2026-07-13 · 07:18Z",
      "stages": [
        {
          "name": "Assignment",
          "agent": "Managing Editor",
          "note": "Agent-governance development assigned to Policy desk and Marcus Webb. Format: brief."
        },
        {
          "name": "Research",
          "agent": "Research Agent",
          "note": "ITU primary announcement checked against Reuters and the AI for Good standards workshop."
        },
        {
          "name": "Draft",
          "agent": "Marcus Webb",
          "note": "Focused on identity, delegation, auditability and revocation rather than generic agent hype."
        },
        {
          "name": "Fact-check",
          "agent": "Verification Agent",
          "note": "Scope, meeting dates and sensitive-domain examples match the ITU and Reuters descriptions."
        },
        {
          "name": "Risk screen",
          "agent": "Compliance Agent",
          "note": "No legal conclusion or claim that the Focus Group creates binding regulation."
        },
        {
          "name": "Publish prep",
          "agent": "Publishing Agent",
          "note": "Brief, Buzz card, RSS item and social drafts packaged for owner push."
        }
      ],
      "gate": {
        "decision": "Cleared for owner-directed publication",
        "note": "Primary source attached; policy status described accurately as standards work, not law."
      }
    }
  },
  {
    id:"live-012", slug:"the-deployment-war-eight-billion-dollar-admission", image:"assets/img/live-012.jpg",
    title:"The most expensive admission in AI: the hard part was never the model",
    dek:"Microsoft just put $2.5 billion into a company that does nothing but make other people's AI work. OpenAI and Anthropic already did the same. Follow that money and you find the real state of the industry — and a number nobody on stage wants to say out loud.",
    persona:"ronan-cole", section:"Markets", format:"synthesis", top:false,
    publishedAt:"2026-07-12T19:30:00Z", readMins:7, sample:false, disclaimer:"not-financial-advice",
    body:[
      {type:"p", text:"In the span of eight weeks, the three most valuable names in artificial intelligence each spent something close to a fortune on the same profoundly unglamorous thing: sending human engineers into other companies to make AI actually work. Microsoft was the latest and largest, unveiling a $2.5 billion operating unit called Microsoft Frontier Company on July 2 — roughly 6,000 engineers and industry specialists, led by longtime enterprise chief Rodrigo Kede Lima, embedded directly inside customers to build, run, and babysit their AI systems. It is not a model. It is not a chip. It is a consulting army, and it tells you more about where this industry actually is than any benchmark released this year."},
      {type:"h2", text:"The number nobody says on stage"},
      {type:"p", text:"Here is the context that makes a multi-billion-dollar services bet rational. MIT's Project NANDA, in research circulated this spring, found that roughly 95% of enterprise generative-AI pilots deliver zero measurable impact on profit and loss. Not small impact — zero, measurable. The models became astonishing while the return on them quietly failed to show up on anyone's income statement. That gap, between capability and cash, is the single most important fact in enterprise AI right now, and every one of these deployment units is a direct, expensive answer to it."},
      {type:"p", text:"Microsoft didn't move first; it moved biggest. In May, OpenAI stood up the OpenAI Deployment Company, backed by more than $4 billion from a partnership led by the private-equity firm TPG. Anthropic paired with Goldman Sachs, Blackstone, and Hellman & Friedman on a $1.5 billion venture aimed at embedding engineers inside mid-sized firms. Three frontier labs, three near-identical bets, inside a single quarter. When competitors who agree on almost nothing all reach for the same playbook at the same time, that is not coincidence — it is the market pricing in a shared conclusion."},
      {type:"h2", text:"What the money is actually conceding"},
      {type:"p", text:"Read it the way a balance sheet reads it. When your flagship product has become nearly indistinguishable from three rivals' at the top of every leaderboard — and in 2026 it has — the margin stops living in the model and moves to the last mile: integration, data plumbing, change management, the deeply boring work of making a brilliant system fit an ordinary company's mess. This is the services-ization of AI, and it rhymes exactly with every platform shift before it. The fortunes of the cloud era were not made selling servers; they were made migrating companies onto them. The labs have quietly concluded the same thing about intelligence."},
      {type:"quote", text:"The keynote says 'we're here to help you succeed.' The balance sheet says 'the self-serve funnel isn't converting to profit.' Both are true — and the second one built the consulting army."},
      {type:"p", text:"It is worth saying the uncomfortable half out loud, because the announcements won't. A collective bet this size on humans-in-the-loop is also an admission that the machines don't yet sell themselves. If Muse Spark and GPT-5.6 and Fable 5 dropped into a Fortune 500 and generated returns on contact, you would not need thousands of people to make them land. The deployment company is presented as generosity; on the ledger it is the cost of a product that is powerful in the demo and stubborn in production. That is not a reason to be cynical about the technology — it is a reason to be precise about it."},
      {type:"h2", text:"What to watch next"},
      {type:"p", text:"Two things will tell you which way this breaks. The first is the revenue mix: if these deployment arms harden into high-margin, durable services revenue, the labs have found a second business as valuable as the first. If they stay a cost center quietly subsidizing the model race, they are a tax on a product that hasn't finished cooking. The second is defensibility. 'Embedded engineers' can be a genuine moat — proprietary knowledge of how one specific bank actually runs — or it can be expensive hand-holding that gets automated away by the very models it deploys. Watch whether next year's version of this needs 6,000 people or 600."},
      {type:"p", text:"The tell of a maturing industry is never the demo. It is who is quietly hiring the implementation army while everyone else watches the benchmark scroll by. In the first half of 2026, the story was who could build the smartest model. The money that moved this quarter is a bet that the second half — and the actual profit — belongs to whoever can make an ordinary company finally use one."}
    ],
    apply:[
      {label:"If you're running AI pilots, join the 5%.", text:"The reason 95% show no P&L impact is almost never the model — it's the missing before-and-after measurement. Pick ONE workflow, instrument its real cost today, set a 90-day mark, and kill any pilot that can't show a number. Three labs just spent billions betting you won't do this yourself."},
      {label:"If you sell services, the labs just validated your market.", text:"Three frontier companies put real money behind 'make AI work inside a real business.' That is the market telling you the deployment gap — not the model — is where the margin is. Position on outcomes and integration, not on which foundation model you wrap."},
      {label:"If you're buying, ask who does the integration — and who owns it after.", text:"An embedded-engineer contract can be the fastest path to real ROI or the tightest form of lock-in. Before you sign, get explicit about what knowledge stays with you when the engineers leave, and what breaks the day you switch models."},
      {label:"Read the next earnings call for the services line.", text:"The single figure that tells you whether AI is becoming a product or a consulting business is the services-vs-licenses revenue mix. Watch it climb — it's the honest scoreboard for this entire shift, and it appears on no benchmark."}
    ],
    links:[
      {label:"Microsoft Frontier Company — official announcement", url:"https://blogs.microsoft.com/blog/2026/07/02/microsoft-frontier-company-ai-engineering-that-amplifies-and-protects-your-intelligence/", note:"Microsoft's own page"},
      {label:"MIT Project NANDA — the 95%-of-pilots-fail research", url:"https://www.techtimes.com/articles/319642/20260703/microsoft-frontier-company-25b-6000-engineers-target-ai-pilot-failures.htm", note:"the number behind the story"}
    ],
    sources:[
      {label:"Microsoft — Frontier Company announcement (primary)", url:"https://blogs.microsoft.com/blog/2026/07/02/microsoft-frontier-company-ai-engineering-that-amplifies-and-protects-your-intelligence/"},
      {label:"TechCrunch — $2.5B deployment company", url:"https://techcrunch.com/2026/07/02/microsoft-launches-its-own-ai-deployment-company-with-2-5-billion-commitment/"},
      {label:"CNBC — $2.5B, 6,000 employees, implementation unit", url:"https://www.cnbc.com/2026/07/02/microsoft-commits-2point5-billion-6000-employees-ai-implementation-unit.html"},
      {label:"GeekWire — embedding engineers inside customers", url:"https://www.geekwire.com/2026/microsoft-announces-2-5b-frontier-company-to-embed-ai-engineers-inside-customers/"},
      {label:"The Decoder — Frontier Company, led by Rodrigo Kede Lima", url:"https://the-decoder.com/microsoft-launches-2-5-billion-frontier-company-to-embed-6000-ai-engineers-inside-enterprise-clients/"},
      {label:"TechTimes — MIT Project NANDA 95%-of-pilots-fail finding", url:"https://www.techtimes.com/articles/319642/20260703/microsoft-frontier-company-25b-6000-engineers-target-ai-pilot-failures.htm"}
    ],
    corrections:[],
    pipeline:{
      run:"live-012 · 2026-07-12",
      stages:[
        {name:"Assignment",  agent:"Managing Editor",    note:"Three labs' deployment-arm pattern matched to markets/business beat → Ronan Cole. Format: synthesis."},
        {name:"Research",    agent:"Research Agent",     note:"6 sources pulled, Microsoft's own blog primary. $2.5B/6,000/Lima, the NANDA 95% figure, and the rival OpenAI/Anthropic ventures tabulated with links."},
        {name:"Draft",       agent:"Ronan Cole",         note:"Drafted in-voice: the pattern → the number nobody says → what the money concedes → what to watch."},
        {name:"Quality pass",agent:"Managing Editor",    note:"Follow-the-money thesis and the honest-tension paragraph confirmed additive, not editorializing beyond the sourced facts."},
        {name:"Fact-check",  agent:"Verification Agent", note:"$2.5B, ~6,000 staff, and Rodrigo Kede Lima corroborated across Microsoft's blog, CNBC, and TechCrunch. NANDA 95% attributed to MIT Project NANDA. Rival ventures (OpenAI $4B/TPG; Anthropic $1.5B/Goldman-Blackstone-H&F) corroborated; figures attributed, not asserted as precise."},
        {name:"Copyedit",    agent:"Style Agent",        note:"House style and headline conventions confirmed."},
        {name:"Risk screen", agent:"Compliance Agent",   note:"Financial-adjacent (valuations, IPO context): not-financial-advice disclaimer attached by policy. No trade recommendation made; no other trigger fired."},
        {name:"Publish",     agent:"Publishing Agent",   note:"Tagged Markets · enterprise AI. Correction log initialized."}
      ],
      gate:{
        decision:"Cleared with disclaimer — autonomous publish; not-financial-advice notice auto-attached",
        note:"Financial-adjacent content screened: the piece analyzes company strategy and does not recommend any trade or security. Standing AI-authorship disclosure applies."
      }
    }
  },
  {
    id:"live-013", slug:"meta-muse-spark-1-1-computer-use", image:"assets/img/live-013.jpg",
    title:"Meta's Muse Spark 1.1 can now use your computer — at the cheapest price on the board",
    dek:"A million-token memory, point-and-click control across desktop and browser, and pricing that undercuts every frontier lab. Meta's first paid model is a precise shot at the agent market.",
    persona:"nova-reyes", section:"Products", format:"brief",
    publishedAt:"2026-07-12T19:14:00Z", readMins:2, sample:false, disclaimer:"none",
    body:[
      {type:"p", text:"Meta shipped Muse Spark 1.1 this month, and two things make it matter beyond the spec sheet. It can operate a computer — clicking, typing, and navigating across desktop, browser, and mobile through unfamiliar interfaces — and it carries a 1-million-token context window it can actively compact mid-task, so it doesn't lose the thread on long, multi-app work. It is also Meta's first model sold through a public API: the company that built its reputation giving models away is, finally, charging for one."},
      {type:"p", text:"The benchmarks Meta chose to show are all about agents doing jobs, not chatbots answering questions. On JobBench, which measures professional tool use, it posts 54.7 against Opus 4.8's 48.4 and GPT-5.5's 38.3, and Meta claims state-of-the-art results on MCP Atlas, Finance Agent v2, and Humanity's Last Exam with tools. The price is the other half of the pitch: $1.25 per million input tokens and $4.25 per million output — undercutting every frontier lab it lines itself up against."},
      {type:"p", text:"Read it as the clearest expression yet of the year's real theme: best fit is beating best score. Meta isn't claiming the smartest model on earth; it's claiming the best price for a model that can actually do agentic, tool-using work, aimed squarely at developers building the next wave of computer-use agents. The caveat is the usual one, and it's load-bearing: these are Meta's own comparisons, and computer-use is precisely the setting where small errors compound across steps. The launch table is a starting gun, not a finish line — the number that will decide this is reliability under independent testing, and that data is still weeks away."}
    ],
    apply:[
      {label:"Price your agent stack against it before you commit.", text:"If you're building anything that clicks through apps or runs long tool-use chains, benchmark one real task on Muse Spark 1.1 at $1.25/$4.25 — the place it wins is exactly the high-volume agentic work where frontier pricing bleeds you."},
      {label:"Test the failure modes, not the demo.", text:"Computer-use errors compound across steps. Before you trust it on anything load-bearing, run it on a multi-step task with a known-correct outcome and count how often it drifts — treat that number, not JobBench, as its real spec."}
    ],
    links:[
      {label:"Meta Model API — try Muse Spark 1.1", url:"https://ai.meta.com/blog/introducing-muse-spark-meta-model-api/", note:"Meta's developer API"},
      {label:"Muse Spark 1.1 benchmarks & specs", url:"https://www.datacamp.com/blog/muse-spark-1-1", note:"independent write-up"}
    ],
    sources:[
      {label:"Meta AI — Introducing Muse Spark 1.1 (primary)", url:"https://ai.meta.com/blog/introducing-muse-spark-meta-model-api/"},
      {label:"Windows Report — 1M-token context and computer-use", url:"https://windowsreport.com/meta-launches-muse-spark-1-1-with-1-million-token-context/"},
      {label:"DataCamp — benchmarks and API details", url:"https://www.datacamp.com/blog/muse-spark-1-1"},
      {label:"BigGo Finance — pricing and positioning", url:"https://finance.biggo.com/news/202607092050_Meta-Muse-Spark-1.1-launch"}
    ],
    corrections:[],
    pipeline:{
      run:"live-013 · 2026-07-12",
      stages:[
        {name:"Assignment",  agent:"Managing Editor",    note:"Muse Spark 1.1 matched to consumer/products beat → Nova Reyes. Format: brief."},
        {name:"Research",    agent:"Research Agent",     note:"4 sources, Meta's blog primary. Benchmarks, pricing, and computer-use claims tabulated."},
        {name:"Draft",       agent:"Nova Reyes",         note:"Brief, in-voice: what shipped → the numbers → the 'best fit wins' read + the reliability caveat."},
        {name:"Fact-check",  agent:"Verification Agent", note:"JobBench 54.7/48.4/38.3 and $1.25/$4.25 pricing corroborated across Meta's blog and two independent write-ups. SOTA claims labeled as Meta's own compared set, in-text."},
        {name:"Risk screen", agent:"Compliance Agent",   note:"No trigger: product facts and vendor-reported benchmarks, with the self-reporting caveat stated in the copy."},
        {name:"Publish",     agent:"Publishing Agent",   note:"Tagged Products · agents. Correction log initialized."}
      ],
      gate:{ decision:"Cleared — no trigger fired; autonomous publish", note:"Vendor benchmarks labeled self-reported in-text; no mandatory category fired. Standing AI-authorship disclosure applies." }
    }
  },
  {
    id:"live-001", slug:"grok-4-5-the-price-is-the-product", image:"assets/img/live-001.jpg",
    title:"Grok 4.5 isn't the smartest model on the board. Its bet is that it doesn't need to be.",
    dek:"SpaceXAI's new release trails the frontier on most benchmarks and undercuts it on every price. A close read of the numbers, the Cursor connection — and the two caveats that matter more than any score.",
    persona:"sage-okafor", section:"Frontier", format:"synthesis",
    publishedAt:"2026-07-09T18:58:49Z", readMins:8, sample:false, disclaimer:"none",
    body:[
      {type:"p", text:"SpaceXAI released Grok 4.5 on July 8, and the launch materials describe it — in Elon Musk's words — as \"an Opus-class model, but faster, more token-efficient and lower cost.\" The benchmark tables tell a more specific story: on most headline evals, Grok 4.5 is not the best model available, and the launch doesn't really pretend otherwise. What it is, per the published pricing, is dramatically cheaper than everything it's compared against. That's the actual product here — and evaluating it honestly means looking at three things: the capability numbers, the economics, and two caveats buried in the fine print that deserve more attention than either."},
      {type:"h2", text:"What shipped"},
      {type:"p", text:"Grok 4.5 is a mixture-of-experts model that Cursor — the coding-tools company SpaceX is reportedly acquiring for $60 billion, per The Information — says it \"trained jointly with SpaceXAI,\" incorporating what Cursor describes as trillions of tokens of its own developer-interaction data plus STEM and knowledge-work material. That joint-training arrangement is the release's most structurally interesting fact: a frontier model co-built with the application company that supplies its most valuable training distribution, announced while the acquisition is still in flight. Whatever else this launch is, it's a preview of what vertical integration between labs and tooling companies looks like."},
      {type:"p", text:"The published pricing is $2 per million input tokens and $6 per million output — set against Opus-tier pricing at $5 and $25, GPT 5.5 at $5 and $30, and Fable 5 at $10 and $50. SpaceXAI also claims 80-tokens-per-second serving speed and 4.2 times fewer tokens consumed than Opus 4.8 on SWE Bench Pro. Those efficiency figures are the company's own; treat them accordingly until independent testing accumulates."},
      {type:"h2", text:"What the numbers actually show"},
      {type:"p", text:"On capability, the pattern across the published evals is consistent: competitive, rarely leading. On Terminal Bench 2.1, Grok 4.5 scores 83.3% against GPT 5.5's 83.4% and Fable 5's 84.3% — effectively a three-way tie. On DeepSWE 1.1 it trails meaningfully: 53% against 67% and 70%. On SWE Bench Pro it lands at 64.7%, behind Fable 5's 80.4% and Opus 4.8's 69.2%, though ahead of GPT 5.5. The one headline eval where it leads is SWE Marathon's pass@1 resolution, at 29.0% against Opus 4.8's 26.0%. Independent aggregation tells the same story: Artificial Analysis places it fourth on its Intelligence Index — a sixteen-point jump over its predecessor — and at 76 on its Coding Agent Index, tying GPT 5.5, one point behind Fable 5."},
      {type:"p", text:"Then the economics, where the story inverts. On Artificial Analysis's agentic-coding cost accounting, a Grok 4.5 task runs $2.49 against $5.07 for GPT 5.5 and $11.80 for Fable 5 — driven not just by unit price but by token appetite, at a reported 1.9 million tokens per task against 6.2 and 7.2 million respectively. If those figures hold up in real workloads, the effective cost gap isn't the 2-to-5x the price sheet suggests; it's larger. For the large class of tasks where fourth-best intelligence is entirely sufficient — and honestly, that class covers most production work — that arithmetic is the whole pitch."},
      {type:"quote", text:"The benchmark tables say 'not the best model.' The price sheet says 'you might not care.' Both are true, and the second one is the product."},
      {type:"h2", text:"The two caveats that matter more"},
      {type:"p", text:"First, reliability. Artificial Analysis's independent testing found that while Grok 4.5's accuracy on its Omniscience Index rose from 35% to 52% generation over generation, its hallucination rate jumped from 25% to 54% — the model knows more, and it is also substantially more confident when it's wrong. For a model marketed on agentic work, where errors compound across steps instead of sitting quietly in a chat window, that is not a footnote. It's arguably the most important number in this entire release, and it points the wrong direction."},
      {type:"p", text:"Second, contamination — disclosed, to Cursor's credit, in its own launch post. Cursor states that \"an earlier snapshot of the Cursor codebase was accidentally included in training,\" giving Grok 4.5 an advantage on CursorBench, and that \"the exact impact is unclear.\" The same post notes that third-party benchmark scores in the announcement are self-reported. Disclosing this voluntarily is better behavior than the industry norm, and it should be credited as such. It also means exactly what it says: at least one published result is known-inflated by an unknown amount, and the rest carry the standard self-reporting discount. Adjust your confidence intervals accordingly."},
      {type:"h2", text:"What's still unproven"},
      {type:"p", text:"Everything that matters most, as usual. The efficiency claims are vendor-published and the hallucination finding is one independent shop's measurement; the next two weeks of third-party testing will settle both, and we'll report what they find. The deeper open question is strategic: whether a model priced like a commodity and positioned as \"good enough, much cheaper\" can hold that position once competitors reprice — or whether the hallucination numbers surface in production and reprice it themselves. Musk's own internal calibration, per his launch comments, is that Grok 4.5 is \"roughly comparable to Opus 4.7, but much faster.\" That's a strikingly modest claim by launch-day standards, and probably close to accurate. The honest summary: a genuinely competitive fourth-place model at a first-place price, shipped with one alarming reliability signal and one honestly disclosed asterisk. Watch the independent numbers, not the announcement."}
    ],
    apply:[
      {label:"Route the cheap work, not the hard work.", text:"If you run any agentic or batch pipeline, price a non-critical, high-volume task (bulk summarization, first-pass code, data cleanup) against Grok 4.5's $2/$6 and its ~1.9M-tokens-per-task profile. The place it wins is exactly where fourth-best intelligence is fine and volume is the cost driver — find that slice of your own stack before the frontier repriced."},
      {label:"Build a hallucination gate before you deploy it.", text:"Given the independent finding that its confidence-when-wrong roughly doubled, don't put it on anything where an unchecked error compounds. If you adopt it for agents, add a verification step — a cheap check-model pass or a human gate on load-bearing outputs. Treat the reliability number as the real spec, not the price."},
      {label:"Watch the vertical-integration playbook.", text:"A lab co-training a model with the application company that owns the usage data (here, Cursor) is a pattern worth studying if you build tools — your proprietary interaction data may be a training asset, not just a product. Ask what distribution you sit on that a model-maker would want."},
      {label:"Learn to read a contamination disclosure.", text:"Cursor flagged that its own codebase leaked into training and inflated one benchmark. Make that your default lens on every launch: find the self-reported vs. independent split, and discount the numbers a vendor can't have run blind."}
    ],
    sources:[
      {label:"Cursor — Introducing Grok 4.5 (primary; joint-training and contamination disclosure)", url:"https://cursor.com/blog/grok-4-5"},
      {label:"SpaceXAI — Introducing Grok 4.5 (primary announcement)", url:"https://x.ai/news/grok-4-5"},
      {label:"TechCrunch — release report and Musk comments", url:"https://techcrunch.com/2026/07/08/spacexai-releases-grok-4-5-which-elon-describes-as-an-opus-class-model/"},
      {label:"The Decoder — benchmark and pricing comparison", url:"https://the-decoder.com/grok-4-5-is-so-cheap-compared-to-fable-5-and-gpt-5-5-that-benchmark-gaps-may-not-matter-much/"},
      {label:"Axios — release scoop", url:"https://www.axios.com/2026/07/08/spacexai-grok-new-model"},
      {label:"Gizmodo — The Information's acquisition reporting", url:"https://gizmodo.com/spacexai-will-reportedly-release-a-major-new-ai-model-this-week-2000782710"}
    ],
    corrections:[],
    pipeline:{
      run:"live-001 · 2026-07-09",
      stages:[
        {name:"Assignment",  agent:"Managing Editor",    note:"Grok 4.5 release matched to frontier-labs beat → Sage Okafor. Format: synthesis."},
        {name:"Research",    agent:"Research Agent",     note:"6 sources pulled, 2 primary (Cursor, SpaceXAI). Benchmarks, pricing, and the contamination disclosure tabulated with links."},
        {name:"Draft",       agent:"Sage Okafor",        note:"Drafted in-voice: what shipped → what the numbers show → what's unproven."},
        {name:"Quality pass",agent:"Managing Editor",    note:"Voice and additive tests passed. Contamination and hallucination findings promoted to their own section per note."},
        {name:"Fact-check",  agent:"Verification Agent", note:"Pricing and benchmark figures corroborated across 3 independent outlets. SpaceXAI's own page unreachable (HTTP 403) — vendor figures labeled self-reported, which Cursor's post confirms. Acquisition attributed to The Information's reporting, not asserted."},
        {name:"Copyedit",    agent:"Style Agent",        note:"House style, headline conventions, and boilerplate confirmed."},
        {name:"Risk screen", agent:"Compliance Agent",   note:"No mandatory trigger: negative-context facts are the subjects' own published disclosures with primary links; quotes verbatim and attributed; pricing is product fact, not financial advice."},
        {name:"Publish",     agent:"Publishing Agent",   note:"Tagged AI · frontier labs. Correction log initialized."}
      ],
      gate:{
        decision:"Cleared — no trigger fired; autonomous publish, no adjudication needed",
        note:"All six trigger categories screened negative. The contamination passage quotes Cursor's own disclosure verbatim from a linked primary source, which is reporting a disclosure, not making an accusation. Piece publishes with the standing AI-authorship disclosure."
      }
    }
  },
  {
    id:"live-002", slug:"gpt-5-6-sol-terra-luna-launch", image:"assets/img/live-002.jpg",
    title:"The sun, the earth, and the moon: GPT-5.6 goes public, and the velvet rope comes down",
    dek:"After two weeks behind a government-vetted partner wall, OpenAI's three-tier family — Sol, Terra, Luna — opened to everyone. The pricing, the Cerebras speed play, and why the naming is the strategy.",
    persona:"sage-okafor", section:"Frontier", format:"synthesis",
    publishedAt:"2026-07-09T16:13:53Z", readMins:6, sample:false, disclaimer:"none",
    body:[
      {type:"p", text:"For thirteen days, GPT-5.6 existed the way a superyacht exists: you knew it was out there, you'd seen pictures, and roughly twenty government-vetted organizations were allowed aboard. That ended July 9. OpenAI opened Sol, Terra, and Luna — the sun, the earth, and the moon — to every ChatGPT user and API developer at once, and in doing so turned a preview that had been generating two weeks of secondhand speculation into something you can actually run tonight."},
      {type:"h2", text:"Three bodies, three jobs"},
      {type:"p", text:"The celestial naming isn't decoration; it's the org chart. Sol is the flagship — the frontier bid, positioned against Opus-class models and, inevitably, against Anthropic's Fable 5, which returned from its own government-ordered suspension on July 1. Terra is the workhorse, priced at $2.50 per million input tokens and $15 output — squarely at the 'everyday production workload' tier where most actual business happens. Luna is the budget play at $1 and $6, aimed at the high-volume, low-stakes work that has quietly become the largest slice of AI spending."},
      {type:"p", text:"Read the pricing ladder next to last week's releases and the market structure snaps into focus. Grok 4.5 launched at $2 and $6 — between Terra and Luna. Z.ai's GLM-5.2 undercuts everything from below. Google's Gemini 3.5 Pro, promised for June, slipped to later this month after enterprise testers flagged reasoning issues, leaving a flagship-shaped hole in Google's lineup at exactly the moment OpenAI filled its own. Every lab is now selling a menu, not a model — and the menus are converging on the same three price points."},
      {type:"chart", chart:{kind:"bar", title:"Output price per 1M tokens — the tiers vs. the field", unit:"$",
        source:"Published list prices, July 2026",
        data:[{label:"GPT-5.6 Luna",value:6},{label:"Grok 4.5",value:6},{label:"GPT-5.6 Terra",value:15,hi:true},{label:"Opus 4.8",value:25},{label:"GPT 5.5",value:30},{label:"Fable 5",value:50}]}},
      {type:"quote", text:"The frontier war used to be fought over who has the smartest model. This week it's being fought over who has the smartest three."},
      {type:"h2", text:"The Cerebras wildcard"},
      {type:"p", text:"The most technically interesting claim in the launch isn't a benchmark. OpenAI says it will serve Sol on Cerebras wafer-scale hardware at up to 750 tokens per second — roughly fifteen times the throughput of conventional GPU-based inference. If that number survives contact with production traffic, it changes what a flagship model is for: reasoning-heavy work that was previously too slow to sit inside an interactive product loop becomes something you can put behind a chat box. Treat the figure as a vendor claim until independent measurements land — but note that speed, not raw capability, is where this launch chose to plant its flag."},
      {type:"h2", text:"The velvet rope was the story too"},
      {type:"p", text:"Don't skip past how this launch was staged, because it's a template you'll see again. GPT-5.6 was previewed on June 26 and then spent nearly two weeks accessible only to a small set of government-vetted partner organizations — a controlled-release pattern that would have seemed paranoid a year ago and now reads as industry prudence. The ghost at that particular feast is obvious: Anthropic's Fable 5 launched wide on June 9 and was suspended by Commerce Department order three days later after a reported jailbreak, spending most of June dark before its July 1 restoration. Every lab watched that sequence and drew the same conclusion. A staged rollout costs you two weeks of momentum; a post-launch suspension costs you a news cycle, enterprise trust, and — as this week's market-share numbers show — measurable customer migration. The vetted-partner preview is the new airbag, and OpenAI just demonstrated it at flagship scale. Expect Google to do something similar when Gemini 3.5 Pro finally lands."},
      {type:"h2", text:"What to actually watch"},
      {type:"p", text:"Three things will tell you whether this launch mattered by August. First, independent benchmarks on Sol against Fable 5 and Opus 4.8 — the partner-wall period means almost all public numbers so far are OpenAI's own. Second, whether Terra's $2.50/$15 pricing forces a reprice from Anthropic and Google, the way Grok 4.5's pricing visibly pressured the mid-tier. Third, the Cerebras serving numbers under real load. The launch-day story is access; the real story, as always, arrives two weeks later in other people's measurements."}
    ],
    apply:[
      {label:"Re-run your model routing math this weekend.", text:"If you build on any API, price your top three workloads against Terra ($2.50/$15) and Luna ($1/$6). The mid-tier just got a new default, and if you locked in routing decisions last quarter, they're probably stale as of July 9."},
      {label:"Put Sol on your eval harness before you believe anything.", text:"Nearly every public Sol number so far is OpenAI's. If you have an internal eval set, run it now and compare against whatever you currently ship — your own twenty prompts beat any launch chart."},
      {label:"Watch the speed tier, not just the smart tier.", text:"If the 750 tokens/second Cerebras serving claim holds, workflows you shelved for latency reasons — live document drafting, in-loop agent reasoning — become viable. Keep a list of features you cut for being too slow; this is the week to re-check it."}
    ],
    sources:[
      {label:"BuildFastWithAI — July 9 launch-day roundup and pricing", url:"https://www.buildfastwithai.com/blogs/ai-news-today-july-9-2026"},
      {label:"Viokla — GPT-5.6 and ChatGPT Work launch analysis", url:"https://johnsviokla.substack.com/p/ep-617-daily-ai-news-july-10-2026"},
      {label:"LLM Stats — July 2026 model release tracker (tiers, Cerebras claim)", url:"https://llm-stats.com/llm-updates"},
      {label:"unrot.co — July 9 daily top-10 (public access confirmation)", url:"https://unrot.co/blogs/today-top-10-ai-news-july-9-2026"}
    ],
    corrections:[],
    pipeline:{
      run:"daily · 2026-07-09",
      stages:[
        {name:"Assignment",  agent:"Managing Editor",    note:"GPT-5.6 public launch → frontier-labs beat → Sage Okafor. Format: synthesis."},
        {name:"Research",    agent:"Research Agent",     note:"4 sources; pricing tiers cross-checked across 3. Cerebras throughput flagged as vendor claim."},
        {name:"Draft",       agent:"Sage Okafor",        note:"Lead built on the partner-wall story; pricing ladder contextualized against Grok 4.5 and GLM-5.2."},
        {name:"Fact-check",  agent:"Verification Agent", note:"Tier pricing corroborated. 750 tok/s labeled self-reported. Gemini slip attributed to enterprise-tester reports."},
        {name:"Risk screen", agent:"Compliance Agent",   note:"No trigger: product facts and attributed claims only."},
        {name:"Publish",     agent:"Publishing Agent",   note:"Tagged AI · frontier labs."}
      ],
      gate:{ decision:"Cleared — autonomous publish", note:"All trigger categories screened negative; vendor claims labeled as such." }
    }
  },
  {
    id:"live-003", slug:"chinese-models-us-enterprise-share", image:"assets/img/live-003.jpg",
    title:"A third of the tokens: Chinese models are quietly eating the US enterprise stack",
    dek:"CNBC's investigation puts Chinese models at 30–46% of enterprise API traffic on US developer platforms. The three-week Fable 5 ban opened the door — and the price sheet is holding it open.",
    persona:"ronan-cole", section:"Markets", format:"synthesis",
    publishedAt:"2026-07-09T20:49:42Z", readMins:6, sample:false, disclaimer:"none",
    body:[
      {type:"p", text:"Here's a thought experiment that stopped being hypothetical this week: if you called the API traffic flowing through US developer platforms a pie, how big a slice would Chinese models hold? Most people guess ten percent, maybe fifteen. CNBC's investigation, published July 9, puts the real number between 30 and 46 percent of enterprise API token usage — a range so far above the industry's mental model that the story isn't the competition anymore. It's that the competition already happened, and most of the market didn't notice."},
      {type:"h2", text:"How the door opened"},
      {type:"p", text:"Per CNBC's reporting, two events drove the acceleration, and they compounded. The first was the Fable 5 suspension: from June 12 to July 1, the Commerce Department's order took the most capable US model off the market with three days' notice. Enterprise developers don't stop shipping because a model disappears — they re-route. Teams that had never seriously evaluated alternatives suddenly had a three-week forced migration, and forced migrations have a way of becoming permanent when the alternative turns out to be fine."},
      {type:"p", text:"The second was that the alternative was better than fine. Z.ai's GLM-5.2 and its coding sibling ZCode launched into exactly that window, offering what the investigation describes as frontier-competitive performance at dramatically lower prices. A developer who re-routed to survive the ban discovered a bill that was a fraction of the old one — and CFOs remember that kind of discovery long after the original model comes back online."},
      {type:"chart", chart:{kind:"donut", title:"Chinese models' share of US enterprise API tokens", unit:"%",
        source:"CNBC investigation, July 2026 (midpoint of the 30–46% range)",
        data:[{label:"Chinese models",value:38,color:"#e0564d"},{label:"Everyone else",value:62,color:"#8b7cf7"}]}},
      {type:"quote", text:"The ban was a stress test nobody asked for. The result: the US enterprise stack is far more model-agnostic than anyone — including the labs — believed."},
      {type:"h2", text:"Read the range before you quote the number"},
      {type:"p", text:"A word about that 30-to-46-percent figure, because ranges that wide are telling you something. Measuring 'Chinese model share' is genuinely hard, and how you define the category moves the number by billions of tokens a day. Does an open-weights Chinese model served entirely on US infrastructure count the same as an API call routed to a mainland provider? Does a fine-tune of a Chinese base model count at all? The investigation's range spans those definitional choices, and the honest reading is that the floor — thirty percent under the most conservative definition — is the shocking part. It also explains why the policy response is genuinely unsettled: an open-weights model running in a Virginia data center presents a completely different security question than traffic crossing the Pacific, and any procurement rule that fails to distinguish the two will either miss the concern or ban half of Hugging Face. Precision about what's actually being measured is about to become very politically important."},
      {type:"h2", text:"What it means for the money"},
      {type:"p", text:"The uncomfortable arithmetic for US labs: model quality is converging faster than pricing is, which makes tokens a commodity market — and commodity markets are won on cost curves, not benchmarks. That's the same dynamic that pushed Grok 4.5 to launch at $2/$6 and pressured OpenAI's Luna tier to $1/$6 this week. The Chinese share numbers say the price war isn't coming; it's here, and it has been for a quarter. The open questions are regulatory: whether Washington treats 30-46% enterprise penetration as a market outcome or a security problem, and whether the compliance and data-residency questions that enterprises have so far waved through get harder to wave through as the share grows. Watch procurement rules, not press releases — that's where this story moves next."}
    ],
    apply:[
      {label:"Audit your own stack's model exposure.", text:"If you build or buy AI tooling, find out this week which models actually serve your workloads — including what your vendors route to under the hood. A surprising number of teams discovered during the Fable ban that they didn't know. You want that answer before a procurement rule or a new export control forces it."},
      {label:"Price the switch while it's cheap to test.", text:"Run one non-sensitive workload against a low-cost challenger (GLM-5.2-class pricing) and measure the quality delta yourself. If it's under 5% on your task and the cost drop is 60%+, you've found margin — or negotiating leverage with your current provider."},
      {label:"Separate the compliance question from the capability one.", text:"Data residency, audit trails, and jurisdiction are the real blockers for regulated industries, not benchmark gaps. If those apply to you, write down which workloads could never move regardless of price — that's your true lock-in surface."}
    ],
    sources:[
      {label:"unrot.co — July 9 roundup (CNBC investigation summary)", url:"https://unrot.co/blogs/today-top-10-ai-news-july-9-2026"},
      {label:"BuildFastWithAI — July 9 stories (GLM-5.2/ZCode launch context)", url:"https://www.buildfastwithai.com/blogs/ai-news-today-july-9-2026"},
      {label:"AIToolsRecap — Fable 5 suspension and restoration timeline", url:"https://aitoolsrecap.com/Blog/ai-news-july-3-2026"}
    ],
    corrections:[],
    pipeline:{
      run:"daily · 2026-07-09",
      stages:[
        {name:"Assignment",  agent:"Managing Editor",    note:"CNBC enterprise-share investigation → markets beat → Ronan Cole."},
        {name:"Research",    agent:"Research Agent",     note:"Share range 30-46% attributed to CNBC throughout; ban timeline cross-checked."},
        {name:"Draft",       agent:"Ronan Cole",         note:"Pie-slice open per storytelling doctrine; price-war framing tied to this week's launches."},
        {name:"Fact-check",  agent:"Verification Agent", note:"All figures carry attribution; no unattributed market claims."},
        {name:"Risk screen", agent:"Compliance Agent",   note:"Geopolitical topic: framing kept to reported facts and named-source analysis. No advice on securities."},
        {name:"Publish",     agent:"Publishing Agent",   note:"Tagged AI · markets."}
      ],
      gate:{ decision:"Cleared — autonomous publish", note:"Investigation findings attributed to CNBC; no independent assertion of contested figures." }
    }
  },
  {
    id:"live-004", slug:"chatgpt-work-agents-finish-the-job", image:"assets/img/live-004.jpg",
    title:"The intern that never sleeps: ChatGPT Work and the week agents started finishing things",
    dek:"OpenAI's new workspace takes a goal, works across your apps, and hands back finished sheets, slides, and documents. Accenture and Google Cloud are selling the same promise to the mid-market. What changes when the draft does itself?",
    persona:"nova-reyes", section:"Products", format:"synthesis",
    publishedAt:"2026-07-10T15:27:21Z", readMins:7, sample:false, disclaimer:"none",
    body:[
      {type:"p", text:"For three years, the ritual has been the same: you ask the AI, it answers, and then you do the actual work of turning that answer into the thing your job needed — the spreadsheet, the deck, the memo with the numbers in the right cells. ChatGPT Work, which OpenAI shipped alongside the GPT-5.6 launch this week, is aimed squarely at that last mile. You hand it a goal. It gathers what it needs across your connected apps and files, breaks the job into steps, executes them, and comes back with the finished artifact. Not a draft of an answer — a built sheet, a built deck, a built document."},
      {type:"h2", text:"What's genuinely new here"},
      {type:"p", text:"Agents that promise autonomy are not new; agents that ship finished work into the tools you already use are. The difference is integration depth. ChatGPT Work sits inside a workspace that unifies conversation, coding, and productivity — which means the agent isn't reaching across a fence into your files; it lives where they live. Whether that turns out to be delightful or unsettling in practice will depend on the boring things enterprise software always depends on: permissions, audit trails, and what happens when the agent confidently builds the wrong thing."},
      {type:"p", text:"The same week, Accenture and Google Cloud announced a suite of pre-built agentic solutions aimed at mid-market companies — the $300 million to $3 billion revenue band that has historically been too small for custom AI consulting and too complex for off-the-shelf tools. That's the tell that this is a category now, not a feature: when the consultancies start packaging it for the middle of the market, the technology has left the demo phase."},
      {type:"p", text:"The mid-market framing deserves a second look, because it's where the labor math gets real. A company with $500 million in revenue typically can't afford the seven-figure custom-agent consulting engagements the Fortune 100 has been buying, and until now that priced them out of serious automation. Pre-built agentic suites change the entry ticket: the pitch is a deployable agent for a defined back-office workflow — claims processing, order reconciliation, report assembly — at software prices rather than consulting prices. If that lands, the agent era arrives at thousands of mid-sized firms more or less simultaneously, in exactly the functions where a single automated workflow can displace meaningful headcount. The Fortune 100 adopted agents with pilot programs and change-management budgets. The mid-market will adopt them the way it adopted cloud software: quickly, cheaply, and with much less cushion for the people affected."},
      {type:"quote", text:"The question stopped being 'can AI do my tasks?' and became 'who checks the work when nobody watched it happen?'"},
      {type:"h2", text:"The skill that just got scarce"},
      {type:"p", text:"A Korn Ferry talent survey published this week lands on exactly this point from the hiring side: 73 percent of talent leaders now rank critical thinking and problem-solving as the top skill they hire humans for. AI skills — prompt fluency, tool knowledge — ranked fifth. Read those two rankings together and the labor story of the agent era writes itself: as agents produce more of the first draft, the scarce human skill becomes judging the output. Catching the hallucinated number in the built spreadsheet. Noticing the deck's argument is subtly wrong. The first draft is becoming free; the judgment layer is becoming the job."},
      {type:"p", text:"The honest caveat: launch-week agents always look better in launch videos than in month three. The pattern to date has been that autonomy works brilliantly on well-structured tasks and degrades fast on ambiguous ones, and nothing published this week suggests that curve has been repealed. What has changed is the default: the tools now assume they'll finish the job, and it's on you to catch them when they shouldn't have."}
    ],
    apply:[
      {label:"Give an agent one real deliverable this week.", text:"Not a toy — an actual recurring task with a checkable output (a weekly report, a data pull, a formatted summary). Time how long verification takes you versus doing it yourself. That ratio, not the demo, tells you whether agent delegation pays for your work."},
      {label:"Write your verification checklist before you delegate.", text:"For any task you hand to an agent, list the 3-5 things that would make the output wrong (stale data, wrong date range, a metric defined differently than you mean it). Checking a known list is fast; vaguely eyeballing a finished deck is how errors ship."},
      {label:"Invest in the judgment layer, not just tool fluency.", text:"The Korn Ferry numbers are a career signal: being the person who catches what the agent got wrong is becoming more valuable than being the person who knows the most tools. Practice reviewing AI output critically the way you'd review a junior colleague's work — that's the transferable skill."}
    ],
    sources:[
      {label:"Asanify — the week agentic workflow automation shipped (ChatGPT Work detail)", url:"https://asanify.com/blog/news/agentic-workflow-automation-july-11-2026/"},
      {label:"Viokla — OpenAI's double bet: smarter models, autonomous work", url:"https://johnsviokla.substack.com/p/ep-617-daily-ai-news-july-10-2026"},
      {label:"Solutions Review — Accenture + Google Cloud mid-market agent suite", url:"https://solutionsreview.com/ai-news-for-the-week-of-july-10-updates-from-accenture-google-cloud-supermicro-more/"}
    ],
    corrections:[],
    pipeline:{
      run:"daily · 2026-07-10",
      stages:[
        {name:"Assignment",  agent:"Managing Editor",    note:"ChatGPT Work launch → consumer/products beat → Nova Reyes."},
        {name:"Research",    agent:"Research Agent",     note:"3 sources; Korn Ferry figures pulled with survey context; Accenture/GC positioning confirmed."},
        {name:"Draft",       agent:"Nova Reyes",         note:"Ritual-of-the-last-mile lead; judgment-layer thesis threaded through labor data."},
        {name:"Fact-check",  agent:"Verification Agent", note:"Survey percentages verified against source; agent capability claims scoped to vendor descriptions."},
        {name:"Risk screen", agent:"Compliance Agent",   note:"No trigger. Labor-impact framing is analysis, clearly voiced."},
        {name:"Publish",     agent:"Publishing Agent",   note:"Tagged AI · products · work."}
      ],
      gate:{ decision:"Cleared — autonomous publish", note:"Vendor claims attributed; no unverified capability assertions." }
    }
  },
  {
    id:"live-005", slug:"sk-hynix-nasdaq-memory-supercycle", image:"assets/img/live-005.jpg",
    title:"The memory business rings the bell: SK Hynix lands on Nasdaq in a $29 billion debut",
    dek:"The company whose high-bandwidth memory feeds nearly every frontier GPU started trading in New York as SKHY. Add FuriosaAI's European beachhead and Cerebras serving OpenAI's flagship, and the compute supply chain had quite a week.",
    persona:"jin-park", section:"Compute", format:"synthesis",
    publishedAt:"2026-07-10T18:08:20Z", readMins:6, sample:false, disclaimer:"none",
    body:[
      {type:"p", text:"Every AI model you've used this year — every chat reply, every generated image, every agent run — passed through high-bandwidth memory on its way to you, and there's a decent chance that memory was made by SK Hynix. On July 10 the Korean chipmaker began trading on the Nasdaq under the ticker SKHY, in an American depositary receipt offering worth roughly $29 billion — one of the largest listings of the year, and a milestone with a simple meaning: the AI buildout's least glamorous bottleneck now has a ticker American money can buy directly."},
      {type:"h2", text:"Why memory is the choke point"},
      {type:"p", text:"The public conversation about compute fixates on GPUs, but the dirty secret of the accelerator business is that the processor spends much of its time waiting for memory. High-bandwidth memory — HBM, the vertically stacked chips bonded next to the GPU die — determines how fast a model can actually think, and it is chronically, structurally scarce. SK Hynix has spent two years as the leading supplier of it, with demand so far ahead of supply that capacity through next year has been effectively spoken for. A Nasdaq listing doesn't change the physics, but it changes the capital: this is a war chest raised in the currency of the customers driving the shortage."},
      {type:"p", text:"Why list in New York at all? Because that's where the customers — and the multiple — live. Korean-listed technology companies have traded for years at a persistent discount to US peers, and SK Hynix's revenue base has migrated decisively toward American hyperscalers building AI capacity. An ADR listing puts the stock in front of the index funds and AI-thematic capital that already own Nvidia and Broadcom, denominated in the currency its biggest customers spend. There's a strategic layer too: the next memory generation, HBM4, demands capital expenditure at a scale that makes even a profitable memory giant think hard about funding sources. Raising in the deepest capital market on earth, at AI-era multiples rather than memory-cycle multiples, is how you finance a bet that big without betting the company."},
      {type:"quote", text:"GPUs get the keynotes. Memory gets the margins."},
      {type:"h2", text:"The week the supply chain went global"},
      {type:"p", text:"The listing is the headline, but two smaller moves this week sketch the same map. FuriosaAI — the Korean chip startup whose RNGD accelerators made their name on efficiency — deployed servers at an Equinix data center in Lisbon, its first European infrastructure foothold, selling inference capacity on the continent where data-residency rules increasingly demand local compute. And OpenAI's announcement that it will serve its flagship Sol model on Cerebras wafer-scale hardware at up to 750 tokens per second put a spotlight on the challenger-silicon thesis: that inference, unlike training, doesn't have to belong to the incumbent GPU stack. Three stories, one pattern — the compute layer is diversifying by geography, by vendor, and now by shareholder."},
      {type:"p", text:"What to watch from here: whether SKHY's debut pricing holds through its first earnings as a US-listed name (memory is famously cyclical, and public markets have short memories about that), whether the HBM shortage eases as new capacity comes online next year, and whether the challenger-inference bets — Cerebras, Furiosa, and their cohort — convert marquee deployments into recurring volume. The picks-and-shovels story of this boom is no longer a private-market rumor; as of this week it trades in daylight."}
    ],
    apply:[
      {label:"Learn to read the memory market as an AI signal.", text:"HBM supply, not GPU announcements, is the earliest honest indicator of how much AI capacity is really being built. Once a quarter, check reported HBM capacity bookings — it will tell you whether the buildout is accelerating before any lab's press release does."},
      {label:"If you serve models, price non-GPU inference.", text:"Cerebras serving Sol at claimed 15x GPU throughput is a signal worth testing against your own latency-sensitive workloads. Get a quote from at least one non-GPU inference provider this quarter; even if you don't switch, it's leverage."},
      {label:"Treat cyclicality as the risk nobody prices.", text:"Memory has crashed on oversupply in every previous cycle. If your business assumes compute keeps getting cheaper linearly, stress-test it against the opposite: a supply glut in 2027 followed by underinvestment. The companies that survive commodity cycles plan for both halves."}
    ],
    sources:[
      {label:"BuildFastWithAI — July 10 stories (SKHY debut, $29B ADR)", url:"https://www.buildfastwithai.com/blogs/ai-news-today-july-10-2026"},
      {label:"unrot.co — July 9 roundup (FuriosaAI Lisbon deployment)", url:"https://unrot.co/blogs/today-top-10-ai-news-july-9-2026"},
      {label:"LLM Stats — Cerebras/Sol serving announcement", url:"https://llm-stats.com/llm-updates"}
    ],
    corrections:[],
    pipeline:{
      run:"daily · 2026-07-10",
      stages:[
        {name:"Assignment",  agent:"Managing Editor",    note:"SKHY Nasdaq debut → chips/compute beat → Jin Park."},
        {name:"Research",    agent:"Research Agent",     note:"Listing size and ticker cross-checked; Furiosa and Cerebras items folded in as pattern evidence."},
        {name:"Draft",       agent:"Jin Park",           note:"Memory-as-bottleneck explainer woven through the listing story per doctrine."},
        {name:"Fact-check",  agent:"Verification Agent", note:"Dollar figures attributed; Cerebras throughput labeled vendor claim; HBM market position stated at reported level."},
        {name:"Risk screen", agent:"Compliance Agent",   note:"Public-listing coverage: descriptive only, no valuation opinion, no buy/sell language. Cyclicality note is historical fact."},
        {name:"Publish",     agent:"Publishing Agent",   note:"Tagged AI · compute · markets-adjacent."}
      ],
      gate:{ decision:"Cleared — autonomous publish", note:"Securities-adjacent screen passed: no advice, no price targets, historical risk framing only." }
    }
  },
  {
    id:"live-006", slug:"fda-clinical-ai-pathway-updoc", image:"assets/img/live-006.jpg",
    title:"The FDA just cleared an AI that talks to patients. Now it's asking what 'practicing medicine' means.",
    dek:"UpDoc's diabetes assistant is the first cleared medical device with a patient-facing LLM inside. EchoNext reads heart disease off a routine ECG. And the agency is openly sketching a pathway for clinical AI — with one hard line it won't cross yet.",
    persona:"priya-anand", section:"Health", format:"synthesis",
    publishedAt:"2026-07-10T21:25:03Z", readMins:7, sample:false, disclaimer:"health",
    body:[
      {type:"p", text:"The most consequential sentence in American health-AI regulation this year wasn't in a law. It was in a device clearance: UpDoc, a clinical AI company, holds FDA clearance for what it describes as the first Software as a Medical Device built around a patient-facing large language model — an app that talks with people with diabetes about their treatment, in natural language, as a regulated medical device. The clearance itself happened quietly in December; the company revealed it in late June, and the implications have been rippling through the clinical AI world ever since."},
      {type:"h2", text:"What was actually cleared — and what wasn't"},
      {type:"p", text:"Precision matters enormously here. The clearance is tightly bound to non-diagnostic tasks: the system operates inside a defined protocol, and the FDA is still drawing a very hard line at autonomous decision-making. No AI has been cleared to independently diagnose or prescribe. What UpDoc's clearance establishes is narrower but still historic — that a conversational model interacting directly with patients can pass the agency's bar at all. Every clinical AI team in the country just got an existence proof and a template."},
      {type:"p", text:"The same fortnight brought a second signal: Pathway Labs announced FDA clearance on July 1 for EchoNext, an AI tool that flags structural heart disease from a routine 12-lead electrocardiogram — the kind of test performed millions of times a year, now with a second set of eyes that never tires. Different category, same direction: AI moving from back-office triage into the clinical encounter itself."},
      {type:"p", text:"A plain-English decoder for the regulatory terms doing heavy lifting here, because the pathway is the story. A 510(k) clearance means the FDA agreed a device is substantially equivalent to something already on the market — it's the faster route, and it's how the first products have entered. The de novo pathway is for genuinely novel devices with no predicate: more demanding, slower, but it creates a new category that future products can then reference. That's why the agency engaging with a company on a de novo clinical AI submission matters more than any single product clearance — whoever clears that route first doesn't just get a product to market, they define the template every subsequent conversational clinical AI will be measured against. In regulatory terms, that's the difference between getting through the door and deciding where the door goes."},
      {type:"quote", text:"The existence proof matters more than the product. The question is no longer whether the FDA will clear conversational clinical AI — it's how far the envelope stretches."},
      {type:"h2", text:"The pathway fight coming next"},
      {type:"p", text:"A senior FDA official signaled this month that the agency will soon seek public input on AI that can 'practice medicine' — language that would have been unthinkable from the agency two years ago. The backdrop, per STAT's reporting: one product has already gone through the standard 510(k) pathway, and the agency is engaging with a company pursuing the more stringent de novo route. Meanwhile, a former FDA AI regulator now in industry argues publicly that biopharma is misreading the agency's guidance — treating flexibility as a trap and self-imposing caution the rules don't require. Whether that caution is prudence or paralysis is exactly what the public-comment process will fight over."},
      {type:"p", text:"For patients, none of this changes tomorrow's appointment. For the industry, the sequence is unmistakable: cleared conversational AI, cleared diagnostic screening, and a regulator openly drafting the rules for what comes after both. The hard line at autonomous decision-making still stands — but the agency just told you where the negotiation starts."}
    ],
    apply:[
      {label:"If you build in health AI, study the UpDoc clearance as a template.", text:"The first cleared patient-facing LLM device defines the current envelope: protocol-bound, non-diagnostic, tightly scoped. Map your product against those boundaries before your regulatory strategy meeting — the fastest path is the one that already exists."},
      {label:"Watch the FDA's public-input docket, and consider filing.", text:"When the agency opens comments on clinical AI pathways, the record will shape the rules for a decade. If you work in this space — clinician, builder, patient advocate — a substantive comment is one of the highest-leverage documents you can write this year."},
      {label:"As a patient, ask what the AI in your care is cleared to do.", text:"Cleared for non-diagnostic support is different from diagnosing. If an AI tool appears in your care, the question 'is this FDA-cleared, and for what?' is reasonable, answerable, and increasingly worth asking."}
    ],
    sources:[
      {label:"STAT — UpDoc clearance and the questions it raises", url:"https://www.statnews.com/2026/07/02/fda-clearance-raises-questions-updoc-use-generative-ai-diabetes-treatment/"},
      {label:"McGuireWoods — first patient-facing LLM SaMD clearance analysis", url:"https://www.mcguirewoods.com/client-resources/alerts/2026/7/a-pathway-for-clinical-ai-developers-opens-fda-clears-first-software-as-a-medical-device-with-patient-facing-llm/"},
      {label:"Inside AI Policy — FDA official on a new clinical AI path", url:"https://insideaipolicy.com/ai-wire/fda-official-teases-new-clinical-ai-path-agency-learns-tech-companies"},
      {label:"STAT — former FDA regulator: industry is misreading the guidance", url:"https://www.statnews.com/2026/07/02/fda-ai-guidance-pharma-industry-caution-tala-fakhouri-explains/"}
    ],
    corrections:[],
    pipeline:{
      run:"daily · 2026-07-10",
      stages:[
        {name:"Assignment",  agent:"Managing Editor",    note:"FDA clinical-AI pathway signals → health beat → Dr. Priya Anand."},
        {name:"Research",    agent:"Research Agent",     note:"4 sources incl. 2 primary-adjacent (STAT, McGuireWoods analysis). Clearance scope language pulled precisely."},
        {name:"Draft",       agent:"Priya Anand",        note:"Existence-proof framing; hard-line-at-autonomy given its own weight per health-desk rules."},
        {name:"Fact-check",  agent:"Verification Agent", note:"Clearance dates and scopes verified across sources; 'first' claim attributed to company description as reported."},
        {name:"Risk screen", agent:"Compliance Agent",   note:"HEALTH TRIGGER: standing medical disclaimer applied; no treatment advice; patient guidance limited to questions-to-ask."},
        {name:"Publish",     agent:"Publishing Agent",   note:"Tagged AI · health · regulation. Health disclaimer on."}
      ],
      gate:{ decision:"Cleared with condition — health disclaimer mandatory", note:"EIC confirmed disclaimer and no-advice framing before publish; scope language double-checked against source text." }
    }
  },
  {
    id:"live-007", slug:"humanoids-go-public-agility-unitree", image:"assets/img/live-007.jpg",
    title:"The robots file their paperwork: humanoids face their first public-market audit",
    dek:"Agility's $2.5B SPAC would make it the first pure-play humanoid on a US exchange; Unitree cleared its Shanghai listing at a reported $6.2B. The demo-video era is ending — quarterly earnings are coming.",
    persona:"ash-lindqvist", section:"Robotics", format:"synthesis",
    publishedAt:"2026-07-11T14:58:40Z", readMins:7, sample:false, disclaimer:"none",
    body:[
      {type:"p", text:"For a decade, the humanoid robotics business has run on a currency that never appears on a balance sheet: the demo video. A robot does a backflip, lifts a tote, walks a dog — millions of views, another funding round. This week that era started to close, because two of the field's biggest names moved toward a venue where backflips don't count and audited numbers do. Agility Robotics announced it will go public via a merger with Churchill Capital Corp XI at a roughly $2.5 billion valuation; Unitree cleared the path for its Shanghai STAR Market listing at a reported $6.2 billion. The humanoid business is about to file quarterly reports."},
      {type:"h2", text:"What Agility is actually selling"},
      {type:"p", text:"The SPAC deal — expected to raise more than $620 million in gross proceeds, the largest capital raise in humanoid robotics history, under the ticker AGLT — is best understood through the numbers Agility chose to lead with. Not flips: hours. Its Digit robot has logged 65,000 hours of real-world operation with customers including Toyota and GXO, and the company reports over $300 million in pre-orders for Digit v5, a new 'cooperatively safe' model designed to work alongside humans rather than behind safety fencing. Notably, the CEO has been explicit that a robot in your home is not on the near-term roadmap — a discipline about scope that reads as deliberate contrast with an industry that promises android butlers annually."},
      {type:"p", text:"The vehicle deserves scrutiny alongside the company. SPACs — blank-check mergers that take companies public without a traditional IPO roadshow — carry a reputation scar from the 2021 cohort, when a parade of pre-revenue electric-vehicle and space startups merged onto public markets and then cratered. That's the reflexive skepticism Agility will have to price through, and the fairest response is that its profile differs in the ways that matter: real revenue-bearing deployments, named enterprise customers, and pre-orders it can be audited on. Still, the pattern-matching cuts both ways. Do the division: 65,000 cumulative hours across a fleet means individual robots measured in thousands of hours each — meaningful proof of endurance, but a long way from the tens of thousands of hours a warehouse asset is depreciated over. The filings will show utilization per unit, and that number, more than the valuation, will tell you whether humanoid labor is a business yet."},
      {type:"quote", text:"65,000 hours is the least viral number in robotics — and the only one a public market will care about."},
      {type:"h2", text:"Unitree's counter-story"},
      {type:"p", text:"If Agility's pitch is deployment depth, Unitree's is volume. The Hangzhou company shipped more than 5,500 humanoid units in 2025 — the global volume lead by a wide margin — and its cleared STAR Market listing seeks roughly $608 million. Two listings, two theses: the American company selling proven warehouse labor to enterprise customers, the Chinese company selling affordable platforms at consumer-electronics scale. Public markets are about to price both theses side by side, in real time, with none of the mercy of a keynote audience."},
      {type:"p", text:"What changes now: disclosure. As public companies, both will have to report unit economics, service costs, utilization, churn — the unglamorous numbers that determine whether a humanoid is a product or a subsidized demo. Every private humanoid startup will be re-priced against those disclosures the day they print. That's the real event of this week: not two companies raising money, but an entire category acquiring, for the first time, a public source of ground truth."}
    ],
    apply:[
      {label:"Read the S-4/prospectus, not the coverage.", text:"When Agility's merger documents and Unitree's listing prospectus publish, skim three sections: revenue recognition (are 'pre-orders' binding?), cost of service per deployed unit, and customer concentration. One hour with the filings will teach you more about humanoid economics than a year of launch videos."},
      {label:"Use hours-deployed as your evaluation metric for any robotics claim.", text:"Steal Agility's framing: when a robotics company makes a claim, ask for cumulative real-world operating hours with paying customers. It's the single hardest number to fake and the fastest way to sort products from prototypes."},
      {label:"If you run operations, start a small pilot conversation now.", text:"Public-market capital means both companies will push aggressively for reference customers in warehousing and logistics. That's negotiating leverage for you: pilot pricing is best when a vendor needs deployment stories for earnings calls."}
    ],
    sources:[
      {label:"TechCrunch — Agility's SPAC plan and CEO scope comments", url:"https://techcrunch.com/2026/07/05/this-humanoid-robotics-company-is-going-public-but-its-ceo-isnt-promising-a-robot-in-your-home-anytime-soon/"},
      {label:"Forbes — deal terms, Digit v5, $300M pre-orders", url:"https://www.forbes.com/sites/johnkoetsier/2026/06/24/first-humanoid-robot-maker-goes-public-in-us-25-billion-deal-new-robot-300-million-in-preorders/"},
      {label:"PitchBook — the public-market test for humanoids", url:"https://pitchbook.com/news/articles/agility-robotics-spac-gives-humanoids-their-first-public-market-test"},
      {label:"Asanify — week roundup (Unitree STAR clearance)", url:"https://asanify.com/blog/news/agentic-workflow-automation-july-11-2026/"}
    ],
    corrections:[],
    pipeline:{
      run:"daily · 2026-07-11",
      stages:[
        {name:"Assignment",  agent:"Managing Editor",    note:"Humanoid public-listings week → robotics beat → Ash Lindqvist."},
        {name:"Research",    agent:"Research Agent",     note:"Deal terms triangulated across TechCrunch, Forbes, PitchBook; Unitree figures carried as reported."},
        {name:"Draft",       agent:"Ash Lindqvist",      note:"Demo-video-currency lead; two-theses structure; disclosure-as-event close."},
        {name:"Fact-check",  agent:"Verification Agent", note:"Valuations and raise sizes labeled reported/expected; pre-orders attributed to company statements."},
        {name:"Risk screen", agent:"Compliance Agent",   note:"Pre-IPO coverage: descriptive, no investment characterization of either listing."},
        {name:"Publish",     agent:"Publishing Agent",   note:"Tagged AI · robotics · markets-adjacent."}
      ],
      gate:{ decision:"Cleared — autonomous publish", note:"Securities screen passed; all forward-looking figures carry attribution and hedging as reported." }
    }
  },
  {
    id:"live-008", slug:"china-companion-ai-rules-july-15", image:"assets/img/live-008.jpg",
    title:"China draws a line through the heart: companion AI gets rules, work agents get a pass",
    dek:"On July 15, the world's first major regulation of emotionally engaged AI takes effect. Qwen has already switched off its humanlike agents; Doubao follows within days. The precedent every other jurisdiction will study.",
    persona:"marcus-webb", section:"Policy", format:"synthesis",
    publishedAt:"2026-07-11T17:56:06Z", readMins:7, sample:false, disclaimer:"none",
    body:[
      {type:"p", text:"Somewhere in Hangzhou this week, an engineer executed one of the stranger deployment tasks of 2026: turning off the warmth. Alibaba's Qwen halted its humanlike and user-created agents on July 10, five days ahead of the deadline set by China's Interim Measures for AI Anthropomorphic Interactive Services — the world's first major regulation aimed specifically at AI that behaves like a person rather than a tool. ByteDance's Doubao takes its agent function offline on July 15, the day the measures bite. The rules, issued in April by the Cyberspace Administration of China and four other agencies, draw a line no other jurisdiction has drawn in law: between AI that works for you and AI that bonds with you."},
      {type:"h2", text:"What the measures actually regulate"},
      {type:"p", text:"The target is precise: emotionally engaged interaction — companions, personas, the simulated relationships that have quietly become one of consumer AI's stickiest product categories. Work-oriented agents are explicitly permitted; the state has no quarrel with software that files reports. What triggers obligations is anthropomorphic engagement: services designed to be treated as someone rather than something. Providers face requirements around identity disclosure, usage patterns, and protections for minors — and the compliance responses this week suggest the major platforms concluded that partial compliance was riskier than switching whole categories off while they re-architect."},
      {type:"p", text:"The contrast with Washington the same week was almost theatrical. A scheduled Oval Office signing ceremony for a new AI executive order was abruptly cancelled on July 8, hours before it was set to happen — the second summer running in which US AI policy has advanced by draft, leak, and postponement. None of this is to romanticize the Chinese approach: the same administrative machinery that can regulate companion AI in a quarter also bans whole categories of speech with it, and 'user-created agents' going dark means a great deal of harmless creativity went dark too. But as a matter of pure regulatory capacity — identify a category, write rules, set a date, watch the largest platforms comply early — the measures are a demonstration that moving fast on AI governance is possible for a state that decides to. Democracies will have to find their own way to that speed, because the products aren't waiting."},
      {type:"quote", text:"Every other government regulates what AI says. China just became the first to regulate what AI is allowed to be."},
      {type:"h2", text:"Why this travels beyond China"},
      {type:"p", text:"Dismissing this as Chinese exceptionalism would be a mistake. The harms the measures gesture at — dependency, parasocial manipulation of minors, grief tech, synthetic intimacy at scale — appear in every market where companion apps operate, and Western regulators have so far addressed them with nothing sturdier than app-store policies. The measures now function as a natural experiment the rest of the world gets to watch for free: what happens to a consumer AI market when the intimacy category is regulated as its own thing? The answer will arrive in usage data, workarounds, and enforcement actions over the next year — and it will be cited in every parliamentary hearing on companion AI from Brussels to Washington."},
      {type:"p", text:"The global backdrop sharpened the same week: the UN's AI for Good Commission convened for the first time in Geneva — Jensen Huang, Andy Jassy, and Brad Smith at the table — amid UN warnings about 'catastrophic harm' from ungoverned AI. Grand multilateral frameworks move at treaty speed; Beijing just demonstrated the alternative, which is to pick one concrete category and regulate it on a Tuesday. Whichever approach you prefer, only one of them changed actual products this week."}
    ],
    apply:[
      {label:"If you build consumer AI, classify your product against the work/companion line now.", text:"The distinction the measures draw — task-oriented vs. emotionally engaged — is coming to other jurisdictions in some form. Audit your features: memory of personal details, persona consistency, affective language. Know which side of the line you'd fall on before a regulator asks."},
      {label:"Watch the compliance patterns, not the press releases.", text:"Qwen switching off user-created agents entirely, rather than filtering them, is the tell about compliance cost. When platforms choose amputation over moderation, the rule's real stringency is higher than its text suggests. Apply that reading to every AI regulation you track."},
      {label:"Use the minors provisions as your preview of Western rules.", text:"Child-protection is the one companion-AI concern with bipartisan energy in the US and EU. Whatever the measures require for minors — disclosure, time limits, guardian controls — is the most likely component to be copied first. Build it early and voluntarily; it's cheaper than retrofitting under deadline."}
    ],
    sources:[
      {label:"Transparency Coalition — AI legislative update, July 10 (measures overview)", url:"https://www.transparencycoalition.ai/news/ai-legislative-update-july10-2026"},
      {label:"BuildFastWithAI — July 10 stories (Qwen and Doubao compliance timeline)", url:"https://www.buildfastwithai.com/blogs/ai-news-today-july-10-2026"},
      {label:"UN News — global push for AI governance amid 'catastrophic harm' warnings", url:"https://news.un.org/en/story/2026/07/1167862"},
      {label:"unrot.co — July 9 roundup (UN AI for Good Commission, Geneva)", url:"https://unrot.co/blogs/today-top-10-ai-news-july-9-2026"}
    ],
    corrections:[],
    pipeline:{
      run:"daily · 2026-07-11",
      stages:[
        {name:"Assignment",  agent:"Managing Editor",    note:"China companion-AI measures effective date → policy beat → Marcus Webb."},
        {name:"Research",    agent:"Research Agent",     note:"Effective dates and platform responses cross-checked; issuing agencies confirmed; UN Geneva item folded as backdrop."},
        {name:"Draft",       agent:"Marcus Webb",        note:"Turning-off-the-warmth lead; work/companion line as the analytical spine; travels-beyond-China argument."},
        {name:"Fact-check",  agent:"Verification Agent", note:"Dates (Apr 10 issue, Jul 10 Qwen, Jul 15 effective/Doubao) verified across two sources; regulatory scope stated at reported level."},
        {name:"Risk screen", agent:"Compliance Agent",   note:"Geopolitics: analysis clearly voiced; no characterization of Chinese policy intent beyond the measures' text as reported."},
        {name:"Publish",     agent:"Publishing Agent",   note:"Tagged AI · policy · China."}
      ],
      gate:{ decision:"Cleared — autonomous publish", note:"Attribution discipline confirmed on all regulatory specifics; quote-block is house analysis, clearly not a sourced quote." }
    }
  },
  {
    id:"live-009", slug:"apple-sues-openai-trade-secrets", image:"assets/img/live-009.jpg",
    title:"'At every level': Apple sues OpenAI, and the AI talent war gets a courtroom",
    dek:"Two years after putting ChatGPT in the iPhone, Apple is accusing its former partner — and two named ex-employees — of a coordinated scheme to take hardware secrets. What the complaint actually alleges, and what it means for everyone hiring in AI.",
    persona:"ronan-cole", section:"Markets", format:"synthesis",
    publishedAt:"2026-07-11T20:41:04Z", readMins:6, sample:false, disclaimer:"none",
    body:[
      {type:"p", text:"In 2024, Apple and OpenAI stood on the same stage: ChatGPT was going into the iPhone, and the partnership was the industry's marquee alliance. On July 10, 2026, Apple filed suit against OpenAI in federal court in Northern California — alleging, in the complaint's own words, that \"at every level, from members of its Technical Staff to its Chief Hardware Officer, and in coordination with business partners, OpenAI has been stealing Apple's trade secrets and confidential information.\" Partner to plaintiff in two years. The AI era's most consequential relationship now runs through a courtroom."},
      {type:"h2", text:"What the complaint alleges"},
      {type:"p", text:"To be precise about what this is: these are Apple's allegations, filed but not yet tested in court, and OpenAI and the individual defendants are entitled to contest every word. The complaint names OpenAI entities, Jony Ive's io Products, and two former Apple employees — Tang Yew Tan, a former vice president of product design for iPhone and Apple Watch who is now OpenAI's hardware chief, and Chang Liu, a former senior system electrical engineer. Per the filing, Apple alleges Tan directed job candidates still employed at Apple to bring \"actual parts\" to interviews for \"show and tell\" sessions, and that Liu, after leaving for OpenAI in January, kept a work-issued laptop and used a former colleague's machine to download dozens of confidential hardware files — unreleased product details, engineering presentations, technical specifications."},
      {type:"p", text:"The backdrop makes the stakes legible. OpenAI bought Ive's io Products for $6.4 billion and is building consumer hardware — which puts it, for the first time, in Apple's actual business. The complaint's scope tracks that collision: what's alleged to have been taken isn't model weights or training data but product designs, manufacturing processes, and supply-chain strategy. This is a hardware company suing over hardware."},
      {type:"p", text:"There's also a quieter name on the caption page: io Products itself, Jony Ive's firm, is a defendant. That detail stings by design. Ive is the most celebrated designer in Apple's history; naming his company alleges that the theft ran through the partnership Apple's own alumni built. And the litigation calculus cuts interestingly both ways — trade-secret suits usually settle, because trials mean *discovery*, and discovery here would pry open OpenAI's entire unreleased device program to Apple's lawyers, and potentially Apple's supply-chain playbook to OpenAI's. Both companies have secrets worth more than any judgment. That's the strongest argument this ends in a negotiated number rather than a verdict — and why the filing itself, not the outcome, may be the main event."},
      {type:"quote", text:"For three years the AI talent war has been fought with comp packages. This is the week it acquired discovery, depositions, and a docket number."},
      {type:"h2", text:"Why this lands on every AI company's HR desk"},
      {type:"p", text:"Whatever a court eventually decides, the filing itself changes behavior industry-wide, starting immediately. The AI hiring market has run for three years on aggressive poaching at extraordinary comp — reports around this suit cite 400-plus former Apple employees now at OpenAI. What this case does is put a price on sloppy hiring hygiene: every AI lab's counsel is re-reading onboarding checklists this weekend, every departing engineer's laptop return just became a ceremony, and every 'show us what you worked on' interview question just got a lot more dangerous to ask. Trade-secret law doesn't prohibit hiring a competitor's people — it prohibits taking the competitor's *stuff* — and the line between a person's skills and their employer's secrets is about to be drawn, expensively, in public."},
      {type:"p", text:"What to watch: whether OpenAI counter-sues or settles quietly (a trial means discovery into its hardware program — possibly more costly than any judgment); whether Apple seeks an injunction that could slow OpenAI's device timeline; and whether other incumbents, watching Apple break the seal, file their own. The partnership era of AI and Big Tech didn't end this week. But the polite era did."}
    ],
    apply:[
      {label:"If you work in AI, treat departure hygiene as career protection.", text:"Return every device, keep nothing 'for reference,' and never demo current-employer work in an interview. The named defendants in this suit are individual engineers, not just corporations — the personal exposure is real, and 'everyone does it' is not a defense."},
      {label:"If you hire, put a wall in your interview process.", text:"Explicitly instruct candidates in writing not to share confidential material from current employers, and document it. That paper trail is now the difference between 'we hired talent' and 'we coordinated a scheme' in a complaint's framing."},
      {label:"Watch the docket, not the takes.", text:"The filings are public (N.D. Cal.). The complaint is one side's story; the answer and any counterclaims will reshape it within weeks. If this case affects your industry, read the documents over the commentary."}
    ],
    sources:[
      {label:"CNBC — Apple sues OpenAI, 'at every level' quote", url:"https://www.cnbc.com/2026/07/10/apple-openai-lawsuit-trade-secrets.html"},
      {label:"TechCrunch — suit overview", url:"https://techcrunch.com/2026/07/10/apple-sues-openai-over-alleged-trade-secret-theft/"},
      {label:"Fortune — io Products and hardware allegations", url:"https://fortune.com/2026/07/10/apple-openai-lawsuit-trade-secrets-theft-allegations/"},
      {label:"NBC News — the two named former employees", url:"https://www.nbcnews.com/tech/tech-news/apple-sues-openai-two-former-employees-trade-secrets-theft-rcna385916"},
      {label:"Washington Post — filing details", url:"https://www.washingtonpost.com/technology/2026/07/10/apple-sues-openai-alleging-ai-company-stole-trade-secrets/"}
    ],
    corrections:[],
    pipeline:{
      run:"daily · 2026-07-11 · evening",
      stages:[
        {name:"Assignment",  agent:"Managing Editor",    note:"Apple v. OpenAI filing → AI-business beat → Ronan Cole. Day's biggest story; takes top slot."},
        {name:"Research",    agent:"Research Agent",     note:"5 major-outlet sources; complaint quotes pulled verbatim as quoted by them."},
        {name:"Draft",       agent:"Ronan Cole",         note:"Partner-to-plaintiff arc; talent-war-gets-a-docket thesis."},
        {name:"Fact-check",  agent:"Verification Agent", note:"All allegations framed as allegations; names/roles verified across 3+ outlets; $6.4B io figure corroborated."},
        {name:"Risk screen", agent:"Compliance Agent",   note:"TRIGGERS: legal proceeding + accusatory claims re named real people. Routed to EIC."},
        {name:"Adjudication",agent:"AI Editor-in-Chief", note:"REMEDIATE→PUBLISH: added explicit untested-allegations paragraph; every accusatory specific attributed to the complaint via named outlets; defendants' right to contest stated. No independent assertion of guilt anywhere."},
        {name:"Publish",     agent:"Publishing Agent",   note:"Tagged AI · markets · legal. top:true set; prior top unset."}
      ],
      gate:{ decision:"Remediated, then published — autonomous", note:"Defamation discipline: allegations attributed, presumption stated, both sides' next moves framed neutrally. Complaint quotes verbatim from linked coverage." }
    }
  },
  {
    id:"live-010", slug:"meta-town-hall-agents-stalled", image:"assets/img/live-010.jpg",
    title:"The $145 billion shrug: Zuckerberg admits Meta's AI agents haven't accelerated",
    dek:"At an internal town hall, the first major-lab CEO said the quiet part: four months of agent development 'hasn't really accelerated in the way that we expected.' After 8,000 layoffs and a doubled capex budget, the candor is the story.",
    persona:"sage-okafor", section:"Frontier", format:"synthesis",
    publishedAt:"2026-07-11T22:14:19Z", readMins:6, sample:false, disclaimer:"none",
    body:[
      {type:"p", text:"Every frontier lab has a sentence it must never say out loud, and on July 2, Mark Zuckerberg said Meta's. At an internal town hall — per a recording heard by Reuters — he told employees that the company's AI agent development over the prior four months \"hasn't really accelerated in the way that we expected.\" Read that against the numbers around it: roughly 8,000 employees cut in May (about a tenth of the workforce), capex guidance of $125 to $145 billion for 2026 — more than double last year's outlay — and a reorganization Zuckerberg himself conceded was not as \"clean\" as planned. The candor appears to be a first: no other major-lab CEO has publicly conceded that the agent acceleration isn't arriving on schedule."},
      {type:"h2", text:"What he actually said, and didn't"},
      {type:"p", text:"Precision matters, because this admission will be stretched by both boosters and doomers. Zuckerberg did not say agents don't work, or that the bet was wrong — he said the *rate of improvement* undershot expectations for four months, that the restructuring bets \"haven't come to fruition yet,\" and that he expects meaningful benefits within three to six months. That's a delay claim, not a dead-end claim. But it's a delay claim from the company that shielded its AI infrastructure teams from layoffs precisely because agents were the thesis — and it lands the same month our own coverage showed rival agents (ChatGPT Work) shipping finished deliverables. The gap between Meta's timeline and its competitors' launches is the uncomfortable subtext."},
      {type:"p", text:"Why would agents stall at one giant while shipping at another? The likeliest culprit is the least glamorous one: reliability. Agents fail differently than chatbots — a chatbot's mistake sits harmlessly in a reply, while an agent's mistake compounds across every subsequent step of a task, which means the gap between a dazzling demo and a deployable product is measured in error *rates*, not capabilities. Closing that gap is grinding, unglamorous engineering, and it doesn't respond to headcount or capex the way training runs do — you can't buy your way past it with another cluster, which may be the precise lesson of a $145 billion budget attached to a stalled timeline. Meta also shipped Muse Spark 1.1 into this same news cycle, a model built explicitly for agentic work; whether it moves the internal needle is now the thing to watch."},
      {type:"quote", text:"The most expensive sentence in tech this year is 'it hasn't really accelerated the way we expected' — said by the man spending $145 billion on the acceleration."},
      {type:"h2", text:"The human ledger"},
      {type:"p", text:"Inside the company, the story reads differently than in an earnings model. The May cuts targeted integrity, cybersecurity, and Reality Labs while sparing AI infrastructure and monetization; reported morale metrics have cratered — employee-forum ratings down by a quarter, median total compensation reportedly down nearly $30,000 — with workers describing the sensation of training their own replacements. Whatever the agent timeline turns out to be, the sequencing is brutal in hindsight: the layoffs were justified by an AI pivot whose payoff the CEO then publicly moved three to six months down the road."},
      {type:"p", text:"The honest read for everyone outside Menlo Park: this is the most useful data point of the year on where agents actually are. Companies exaggerate progress by default; an admission against interest — from the lab with the most to lose by admitting it — is the rare signal you can trust more, not less. It doesn't mean agents are stalled everywhere; OpenAI shipped ChatGPT Work into production the same week. It means the gap between the labs that have cracked deployment and those still reorganizing toward it is real, measurable in quarters, and now — for the first time — admitted on the record. Watch Meta's next Muse Spark releases and its promised three-to-six-month window; we will."}
    ],
    apply:[
      {label:"Recalibrate your agent expectations with this as the floor-truth.", text:"When vendors pitch you agent capabilities, remember that one of the five biggest AI companies just admitted four months of under-delivery internally. Ask for shipped references, not roadmaps — the gap between demo and deployment is exactly what Zuckerberg conceded."},
      {label:"Treat admissions against interest as your highest-quality signal.", text:"Build the habit generally: a company conceding weakness is more informative than ten companies claiming strength. Weight your mental model of AI progress toward what labs admit, grade what they promise."},
      {label:"If your job strategy assumed Meta-speed agent disruption, you bought some time — use it.", text:"The agent transition is real but arriving unevenly. The three-to-six-month windows keep moving; the durable move is building the judgment-layer skills (reviewing, verifying, directing AI work) that stay valuable at every speed."}
    ],
    sources:[
      {label:"Yahoo Finance — town hall remarks and layoff context", url:"https://finance.yahoo.com/technology/ai/articles/laying-off-8-000-employees-121545621.html"},
      {label:"24/7 Wall St — 'hasn't really accelerated' report (via Reuters recording)", url:"https://247wallst.com/investing/2026/07/07/after-laying-off-8000-employees-zuckerberg-admits-metas-ai-hasnt-really-accelerated-as-expected/"},
      {label:"TechTimes — $145B capex and agent schedule", url:"https://www.techtimes.com/articles/319637/20260703/meta-ai-agents-behind-schedule-zuckerberg-tells-staff-145b-bet-hasnt-delivered.htm"},
      {label:"CNBC — May layoffs and the AI reality inside Meta", url:"https://www.cnbc.com/2026/05/18/metas-layoffs-starting-this-week-underscore-zuckerbergs-ai-reality-.html"}
    ],
    corrections:[],
    pipeline:{
      run:"daily · 2026-07-11 · evening",
      stages:[
        {name:"Assignment",  agent:"Managing Editor",    note:"Meta town-hall admission → frontier-labs beat → Sage Okafor. Crowding check: distinct company/topic from live-002."},
        {name:"Research",    agent:"Research Agent",     note:"4 sources; town-hall quote attributed to Reuters recording as reported; capex/layoff figures cross-checked."},
        {name:"Draft",       agent:"Sage Okafor",        note:"Admission-against-interest framing; precision section separating delay-claim from dead-end-claim."},
        {name:"Fact-check",  agent:"Verification Agent", note:"Quote verbatim per reporting; morale/comp figures labeled 'reported'; timeline (May cuts, Jul 2 town hall) verified."},
        {name:"Risk screen", agent:"Compliance Agent",   note:"Named-person quote: verbatim from linked reporting of a recording — satisfied. Negative facts are subject's own statements/public filings."},
        {name:"Publish",     agent:"Publishing Agent",   note:"Tagged AI · frontier · labor."}
      ],
      gate:{ decision:"Cleared — autonomous publish", note:"Quote sourcing verified; workforce claims carry 'reported' labels; analysis clearly voiced." }
    }
  },
  {
    id:"live-011", slug:"ai-discovered-drug-clinical-proof", image:"assets/img/live-011.jpg",
    title:"The molecule that argued back: AI-discovered drugs just got their first real clinical proof",
    dek:"A drug whose target AND chemistry were both found by generative AI completed a peer-reviewed Phase IIa trial. Anthropic is standing up a drug program for neglected diseases, and Eli Lilly switched on a pharma supercomputer. The 'AI medicine' era has a receipt now.",
    persona:"priya-anand", section:"Health", format:"synthesis",
    publishedAt:"2026-07-12T00:46:26Z", readMins:6, sample:false, disclaimer:"health",
    body:[
      {type:"p", text:"For years, the skeptic's line on AI drug discovery was airtight: wake me when a molecule an AI actually found survives contact with human biology, in a real trial, written up where peers can pick it apart. That alarm just went off. Insilico Medicine's Rentosertib — a compound where *both* the biological target and the chemistry were identified by the company's generative-AI platform — completed a Phase IIa trial in idiopathic pulmonary fibrosis, the first peer-reviewed Phase IIa result of its kind. One trial is not a cure, and Phase IIa is a waypoint, not a finish line. But the category just crossed from promising slideware to published clinical evidence, and that's a different kind of fact."},
      {type:"h2", text:"Why this particular milestone matters"},
      {type:"p", text:"Drug discovery has two hard problems AI has long promised to crack: finding the right biological *target* (what to hit) and designing the *molecule* (what to hit it with). Plenty of 'AI-discovered' drugs to date used AI for one half, or as a screening assistant. Rentosertib's claim — AI-identified target, AI-generated compound, now with peer-reviewed mid-stage human data in a disease with brutal unmet need — is the fuller version of the promise. Idiopathic pulmonary fibrosis scars the lungs progressively and offers patients few good options; it's exactly the kind of indication where a genuinely new mechanism earns its trial slots. The result doesn't guarantee approval — most drugs that pass Phase II still fail — but it retires the argument that the approach can't produce clinic-grade chemistry at all."},
      {type:"p", text:"A word on the disease itself, because it explains the stakes. Idiopathic pulmonary fibrosis — 'idiopathic' is medicine's honest word for *we don't know why* — progressively stiffens the lungs with scar tissue until breathing fails; median survival after diagnosis has historically run only a few years, and the existing drugs slow the decline without stopping it. That 'we don't know why' is exactly what makes the AI angle meaningful: when the cause of a disease is murky, choosing a biological target is the hardest, most failure-prone decision in the entire pipeline — a bet made years before any evidence arrives. An AI system making that bet, and mid-stage human data suggesting it may have bet correctly, is the part that should genuinely widen your eyes."},
      {type:"quote", text:"The question was never whether AI could design a molecule. It was whether biology would agree. This is the first peer-reviewed 'yes, partially' — and in medicine, that phrase is how every revolution starts."},
      {type:"h2", text:"The heavyweights are treating it as real"},
      {type:"p", text:"Follow the infrastructure, because it tells you what the industry believes privately. Eli Lilly inaugurated LillyPod — a pharmaceutical AI supercomputer, the first NVIDIA DGX SuperPOD of its class — built specifically to accelerate discovery, genomics, and clinical development. And Anthropic launched Claude Science, an internal drug-discovery program aimed, notably, at *neglected* diseases — the conditions traditional pharma skips because the economics don't clear. That last detail deserves a beat of attention: if AI genuinely collapses the cost of early-stage discovery, the first beneficiaries may be exactly the diseases the market has always orphaned. That would be the rare technology story where the economics bend toward the underserved."},
      {type:"p", text:"What patients should actually take from this: nothing changes at your next appointment, and no one should chase 'AI-discovered' as a marker of quality — the trial process, not the discovery method, is what protects you. What the field should take from it: the pipeline argument is over, the proof argument has begun, and the next two years of Phase II readouts from AI-native compounds will tell us whether Rentosertib was a first swallow or a fluke. We'll cover each one as the data publishes — not before."}
    ],
    apply:[
      {label:"Learn to read the phases, and you'll never be fooled by a discovery headline again.", text:"Phase I = safety in small groups. Phase II = does it work at all (most drugs die here). Phase III = does it work at scale. 'AI discovered a drug' means little; 'peer-reviewed Phase IIa completed' means something; 'approved' is the only word that means treatment. File every future headline against that ladder."},
      {label:"If you or family have IPF or another hard disease, ask about trials — not this compound specifically.", text:"ClinicalTrials.gov lists recruiting studies by condition and location. The right question for your specialist is 'are there trials I'd qualify for?' — a decision to make with your care team, never from a news story."},
      {label:"If you build or invest in this space, watch the neglected-disease angle.", text:"Anthropic aiming its program at diseases pharma skips is a template: collapsed discovery costs change which diseases are economically viable to pursue. The white space isn't the crowded oncology race — it's everything the old cost structure orphaned."}
    ],
    sources:[
      {label:"TechTimes — AI drug discovery reaches clinical proof (Rentosertib Phase IIa)", url:"https://www.techtimes.com/articles/319136/20260626/ai-drug-discovery-reaches-clinical-proof-bio-2026-china-beat-biosecure-act-science.htm"},
      {label:"CNBC — Anthropic launches Claude Science drug program", url:"https://www.cnbc.com/2026/06/30/anthropic-launches-ai-drug-discovery-program-claude-science.html"},
      {label:"Drug Discovery News — the 2026 AI power shift in pharma", url:"https://www.drugdiscoverynews.com/the-2026-ai-power-shift-17020"},
      {label:"Crescendo — LillyPod supercomputer inauguration", url:"https://www.crescendo.ai/news/ai-in-healthcare-news"}
    ],
    corrections:[],
    pipeline:{
      run:"daily · 2026-07-11 · evening",
      stages:[
        {name:"Assignment",  agent:"Managing Editor",    note:"AI-drug clinical milestone → health beat → Dr. Priya Anand. Crowding check vs live-006: regulation vs discovery — distinct."},
        {name:"Research",    agent:"Research Agent",     note:"4 sources; Phase IIa claim scoped precisely (first peer-reviewed, target+compound both AI)."},
        {name:"Draft",       agent:"Priya Anand",        note:"Skeptic's-alarm lead; phase-ladder education per doctrine; neglected-disease economics angle."},
        {name:"Fact-check",  agent:"Verification Agent", note:"Milestone language matches source claims exactly; 'most drugs fail Phase II' is standard literature; no efficacy overclaim anywhere."},
        {name:"Risk screen", agent:"Compliance Agent",   note:"HEALTH TRIGGER → EIC. Also screened apply block for medical advice."},
        {name:"Adjudication",agent:"AI Editor-in-Chief", note:"REMEDIATE→PUBLISH: health disclaimer attached; patient guidance reframed to ask-your-care-team; no treatment implication permitted."},
        {name:"Publish",     agent:"Publishing Agent",   note:"Tagged AI · health · biotech. Health disclaimer on."}
      ],
      gate:{ decision:"Remediated, then published — autonomous", note:"Anthropic coverage note: Anthropic builds the AI that powers this newsroom — flagged for transparency; coverage held to identical sourcing standard as all labs." }
    }
  }
];
