// Owner-approved direct publication batch — 2026-07-14.
// Loaded after live-articles.js and before app.js.
(function () {
  var batch = [
    {
      id: "live-017",
      slug: "openai-gpt-5-6-sol-terra-luna-ai-work",
      image: "assets/img/live-017-cover.png",
      title: "OpenAI’s GPT-5.6 lineup turns one model into a working system",
      dek: "Sol, Terra and Luna point to a product strategy built around routing deep reasoning, everyday work and lower-cost throughput through different systems.",
      persona: "sage-okafor",
      section: "Frontier",
      format: "synthesis",
      top: false,
      publishedAt: "2026-07-14T18:00:00Z",
      sample: false,
      disclaimer: "none",
      tldr: [
        "The real shift: AI products are becoming systems that route work between models.",
        "Deep reasoning, everyday drafting and bulk automation each get a different engine.",
        "Routing quality now matters as much as model quality — and benchmarks don't measure it.",
        "The moat is moving from the model to the system around it."
      ],
      body: [
        { type: "p", text: "The most important change in advanced AI is not simply that individual models are becoming stronger. It is that the product around them is becoming a coordinated system. Different workloads reward different tradeoffs: deep research and difficult coding justify slower, more capable reasoning; routine drafting and summarization reward speed; repeated automation needs predictable cost and throughput. A mature AI platform increasingly has to make those choices before the user even notices there was a choice to make." },
        { type: "h2", text: "Specialization replaces the one-model assumption" },
        { type: "p", text: "For years, the public conversation treated every major model release as a search for one universal winner. That framing made sense when the product was a single chat box and users were still discovering what large language models could do. It makes less sense now. A legal review, a software migration, a brainstorming session and a batch of ten thousand document classifications are not the same workload. They differ in risk, latency tolerance, context length, tool requirements and acceptable cost." },
        { type: "p", text: "A model family makes those differences explicit. Rather than forcing every request through the same expensive path, a system can reserve its strongest reasoning for work that benefits from it and route simpler requests through faster models. The user experiences one product, while the underlying stack behaves more like an operating environment. That is the deeper significance of a lineup such as Sol, Terra and Luna: the names matter less than the architecture they represent." },
        { type: "quote", text: "The next phase of AI is not one model doing everything. It is a system that knows which kind of intelligence the job requires." },
        { type: "h2", text: "Routing becomes part of the product" },
        { type: "p", text: "Once a platform offers multiple systems, routing quality becomes as important as raw model quality. A bad router can waste money by sending simple tasks to an expensive model. It can also damage trust by sending a high-stakes task to a weaker one. Good routing therefore needs more than a rough estimate of prompt complexity. It needs awareness of context, permissions, available tools, user preferences and the consequences of being wrong." },
        { type: "p", text: "This is why benchmark leadership alone is becoming less decisive. Benchmarks can measure whether a model solves a defined problem, but they rarely capture whether a product selects the right model, preserves context across steps, handles failures gracefully or integrates with the software people already use. The strongest AI system may not always expose the strongest model. It may instead expose the most dependable combination of routing, memory, tools and control." },
        { type: "h2", text: "What this changes inside a business" },
        { type: "p", text: "For teams, specialization creates a clearer operating model. High-stakes analysis can receive the strongest available reasoning. First drafts, classification and document cleanup can use faster paths. High-volume background tasks can be assigned to lower-cost systems. That makes AI adoption easier to budget and reduces the need for every employee to understand model menus, context limits and inference economics before they can get useful work done." },
        { type: "p", text: "It also creates a governance challenge. An organization may be comfortable using a lightweight model for public information but require a more controlled system for confidential documents or regulated decisions. Administrators will need policies that map task types to approved models, data boundaries and review requirements. The AI platform that makes those rules visible and enforceable will have an advantage over one that treats every prompt as an isolated consumer interaction." },
        { type: "h2", text: "The system is becoming the moat" },
        { type: "p", text: "The competitive question is therefore moving from which company has the best single model to which company builds the most dependable complete system. That includes model routing, tool execution, memory, identity, permissions, observability and a recovery path when automation fails. A technically superior model can still lose inside a weak product, while a slightly weaker model can become dominant when it is easier to reach, cheaper to operate and better integrated." },
        { type: "p", text: "The winners will make model choice nearly invisible while preserving enough control for experts, regulated teams and cost-sensitive operators. That balance is difficult. Too much automation can make the system opaque. Too much manual choice can turn every interaction into configuration work. The companies that solve that tension will define the next stage of AI productivity." }
      ],
      apply: [
        { label: "Put it to work", text: "Divide your AI workload into high-stakes reasoning, fast daily work and repetitive high-volume automation. Reserve premium reasoning for tasks where a better answer materially changes the outcome." },
        { label: "What to watch", text: "Independent evaluations, transparent routing controls, API economics, enterprise governance and measurable workflow gains outside launch demonstrations." }
      ],
      links: [],
      sources: [
        { label: "OpenAI — official product information", url: "https://openai.com/" }
      ],
      corrections: [],
      pipeline: { run: "owner-approved direct batch · 2026-07-14", stages: [
        { name: "Assignment", agent: "Managing Editor", note: "Owner approved the model-ecosystem angle for immediate publication." },
        { name: "Research", agent: "Research Agent", note: "Article framed as product and workflow analysis without unsupported performance claims." },
        { name: "Draft", agent: "Sage Okafor", note: "Expanded into a full synthesis centered on routing, governance and workflow design." },
        { name: "Fact-check", agent: "Verification Agent", note: "Removed unsupported benchmark, pricing and availability claims." },
        { name: "Risk screen", agent: "Compliance Agent", note: "No medical, financial or accusatory trigger." },
        { name: "Publish", agent: "Publishing Agent", note: "Published through the corrected GitHub content path." }
      ], gate: { decision: "Approved for owner-directed publication", note: "Owner explicitly approved this three-story batch." } }
    },
    {
      id: "live-018",
      slug: "ai-infrastructure-race-datacenters-power-gpus",
      image: "assets/img/live-018-cover.png",
      title: "The AI infrastructure race has moved from GPUs to grids",
      dek: "Compute remains scarce, but electricity, cooling, interconnection and permitting are becoming the constraints that determine how quickly AI capacity can actually come online.",
      persona: "jin-park",
      section: "Compute",
      format: "synthesis",
      top: false,
      publishedAt: "2026-07-14T18:02:00Z",
      sample: false,
      disclaimer: "none",
      tldr: [
        "The AI buildout's constraint moved from GPUs to power, cooling, permits and grid connections.",
        "Winning is now systems engineering: sites, substations, transmission — not just chip orders.",
        "Customers feel electrical engineering as software performance: latency, uptime, inference cost.",
        "Flexible workload scheduling could make data centers grid-friendly — and strategically valuable.",
        "Megawatts and construction discipline are becoming the scoreboard."
      ],
      body: [
        { type: "p", text: "The AI infrastructure race is no longer reducible to securing more accelerators. Chips remain essential, but a usable cluster also needs high-bandwidth memory, networking, rack power, cooling, substations, transmission capacity and permission to connect it all. A delay at any point in that chain can strand expensive hardware or push a deployment back by months. The physical system has become too large and too interdependent for any one component to define the outcome." },
        { type: "h2", text: "The bottleneck is now a chain" },
        { type: "p", text: "Early in the generative-AI boom, access to advanced GPUs looked like the dominant constraint. That was true, but incomplete. As supply expanded and orders became larger, the surrounding infrastructure started to matter just as much. A rack full of accelerators cannot run without sufficient electrical capacity. A site with electricity cannot operate dense hardware without cooling. A finished facility cannot serve users if its network, permits or utility interconnection are delayed." },
        { type: "p", text: "This changes the meaning of infrastructure advantage. The strongest operators are not merely the companies that can place the largest chip orders. They are the ones that can secure sites, negotiate power, design dense cooling systems, obtain permits and coordinate construction without allowing one constraint to invalidate the rest of the plan. Execution becomes a systems-engineering problem rather than a procurement contest." },
        { type: "quote", text: "The next AI winner will need better models, but it will also need better power contracts, better cooling and faster interconnection." },
        { type: "h2", text: "Electrical engineering is becoming product strategy" },
        { type: "p", text: "The physical layer is now a product differentiator. Latency, regional availability, uptime and inference cost all depend on where and how capacity is built. Enterprise customers may experience those decisions as software performance, but the underlying cause is often electrical and mechanical engineering. A provider with efficient cooling, dense racks and reliable regional capacity can deliver a better product even when its model is not dramatically different." },
        { type: "p", text: "Power efficiency also affects economics. Every additional watt consumed across a large fleet becomes an operating expense, a cooling burden and a limit on how much hardware can fit behind a given interconnection. That makes model optimization, chip utilization and workload scheduling infrastructure issues as much as software issues. The cheapest answer may come from better orchestration rather than a cheaper accelerator." },
        { type: "h2", text: "The grid is not an infinite resource" },
        { type: "p", text: "Large data centers arrive as concentrated industrial loads. Utilities may need new substations, transmission upgrades or generation capacity before those facilities can operate at full scale. Those projects take time, and their costs create political questions. Regulators and local governments increasingly want to know who pays for the upgrades and whether existing households or businesses will absorb part of the bill." },
        { type: "p", text: "That scrutiny changes site selection. A theoretically attractive location can become unusable if the utility queue is long, community opposition is strong or water and cooling constraints are severe. Conversely, regions with available generation, clear permitting and experienced operators can become strategic hubs. The map of AI capacity will be shaped by energy policy and construction timelines as much as by proximity to users." },
        { type: "h2", text: "Flexible compute could become part of the solution" },
        { type: "p", text: "Recent research on power-flexible data centers explores whether some AI workloads can reduce or shift consumption in response to grid conditions. Training checkpoints, batch inference and nonurgent jobs may have more scheduling flexibility than latency-sensitive services. If operators can move those workloads without damaging reliability, data centers could behave less like fixed peak loads and more like controllable industrial systems." },
        { type: "p", text: "That does not eliminate the need for new infrastructure, but it can improve utilization and reduce pressure during constrained periods. It also creates another software advantage: the ability to understand workload priority, energy availability and hardware state across a fleet. The control plane that schedules compute may become as strategically important as the hardware it manages." },
        { type: "h2", text: "Megawatts are becoming the real scoreboard" },
        { type: "p", text: "The competitive edge is broadening. Companies able to build power-efficient systems, shift workloads around grid conditions and document the local economic case will have more room to expand. The AI buildout remains a compute race, but its finish line is increasingly set by megawatts, cooling capacity and construction discipline rather than model parameters alone." }
      ],
      apply: [
        { label: "Put it to work", text: "When evaluating an AI provider or infrastructure project, examine power availability, cooling design, grid interconnection timing and permitting—not only the announced accelerator count." },
        { label: "What to watch", text: "Utility rate structures, regional restrictions, new capacity announcements and commercial evidence that AI workloads can respond flexibly to grid conditions." }
      ],
      links: [],
      sources: [
        { label: "HCLTech — AI data-center investment announcement", url: "https://www.hcltech.com/press-releases/hcltech-launches-full-stack-ai-offering-powered-new-ai-data-center-investment" },
        { label: "Power-Flexible AI Data Centers", url: "https://arxiv.org/abs/2606.25098" },
        { label: "Next-Generation AI Data Center Power Architecture", url: "https://arxiv.org/abs/2606.25095" }
      ],
      corrections: [],
      pipeline: { run: "owner-approved direct batch · 2026-07-14", stages: [
        { name: "Assignment", agent: "Managing Editor", note: "Owner approved an infrastructure feature." },
        { name: "Research", agent: "Research Agent", note: "Combined company material with current power-systems research." },
        { name: "Draft", agent: "Jin Park", note: "Expanded into a full compute-and-grid synthesis." },
        { name: "Fact-check", agent: "Verification Agent", note: "Removed unsupported market-size and project-timing claims." },
        { name: "Risk screen", agent: "Compliance Agent", note: "Corporate and policy claims kept neutral and attributed." },
        { name: "Publish", agent: "Publishing Agent", note: "Assigned an existing relevant newsroom data-center cover." }
      ], gate: { decision: "Approved for owner-directed publication", note: "Owner explicitly approved this three-story batch." } }
    },
    {
      id: "live-019",
      slug: "meta-google-anthropic-openai-ai-arms-race",
      image: "assets/img/live-019-cover.png",
      title: "The AI arms race is becoming an ecosystem war",
      dek: "OpenAI, Google, Anthropic and Meta are competing across models, distribution, infrastructure, developers and enterprise trust. A benchmark lead alone is no longer enough.",
      persona: "ronan-cole",
      section: "Markets",
      format: "synthesis",
      top: false,
      publishedAt: "2026-07-14T18:04:00Z",
      sample: false,
      disclaimer: "not-financial-advice",
      tldr: [
        "The AI race is now ecosystem versus ecosystem, not model versus model.",
        "OpenAI has habit; Google has distribution; Anthropic has enterprise trust; Meta has reach.",
        "Developers and enterprises buy tooling, stability and contracts — switching costs are the lock-in.",
        "Compound advantages decide it: users attract developers, integrations attract enterprises, revenue funds compute."
      ],
      body: [
        { type: "p", text: "The AI market still presents itself as a sequence of model launches, but the durable contest is much wider. OpenAI, Google, Anthropic and Meta are competing over the complete environment around intelligence: developer access, enterprise contracts, consumer distribution, infrastructure, data controls and the talent capable of building the next generation. A benchmark result may dominate a news cycle, yet the company that wins the cycle may not win the market." },
        { type: "h2", text: "Each company enters with a different advantage" },
        { type: "p", text: "OpenAI has unusually strong product recognition and direct user habit. Millions of people learned to think of a general-purpose AI assistant through ChatGPT, giving the company a powerful position at the application layer. That familiarity can translate into developer attention and enterprise demand, but it also creates pressure to maintain reliability while expanding into more tools, workflows and pricing tiers." },
        { type: "p", text: "Google brings a different kind of leverage. It can distribute AI through search, cloud infrastructure, productivity software, Android and a deep research organization. Its challenge is not access to users or compute; it is turning those assets into a coherent experience that feels faster and simpler than competing products. Distribution is only an advantage when the integration is good enough to become habit." },
        { type: "p", text: "Anthropic has built a distinct position around enterprise use, controllability and safety-oriented governance. That can matter more as AI moves from experimentation into regulated or business-critical workflows. Enterprises often care less about winning a public benchmark than about predictable behavior, contractual protections, data boundaries and support when something breaks." },
        { type: "p", text: "Meta approaches the market from mass consumer distribution and an ecosystem strategy. It can embed assistants and creation tools across social platforms while supporting developers with broadly available models and services. That gives Meta a path to scale that does not depend on persuading every user to adopt a separate destination app." },
        { type: "quote", text: "The real AI war is no longer model versus model. It is ecosystem versus ecosystem." },
        { type: "h2", text: "Why benchmarks are no longer enough" },
        { type: "p", text: "Those advantages are difficult to compare on a single benchmark. A model that leads a technical evaluation can still lose commercial ground when it is expensive, hard to integrate or disconnected from the tools people already use. A slightly weaker model can win meaningful adoption when distribution, latency, price and reliability are better aligned with the workflow." },
        { type: "p", text: "The same applies to developers. They increasingly choose more than an API. They choose tooling, documentation, rate limits, observability, data policies, regional availability and a roadmap. Switching providers can involve rewriting prompts, rebuilding evaluation suites and renegotiating compliance reviews. That makes developer trust and operational consistency forms of lock-in even when the underlying model is replaceable." },
        { type: "h2", text: "Enterprise trust is becoming a market asset" },
        { type: "p", text: "For businesses, the decision is rarely about raw intelligence alone. Procurement teams evaluate security, uptime, support, contractual terms and the ability to control where data goes. A provider that repeatedly changes behavior, pricing or availability can lose confidence even while improving its model. Conversely, a company that offers stable operations may gain share without owning the most spectacular demo." },
        { type: "p", text: "This is where infrastructure and economics meet product strategy. A provider with deeper compute capacity can absorb spikes, offer lower latency and serve large customers more reliably. A company with superior distribution can spread inference costs across a larger user base. A company with stronger enterprise relationships can monetize slower but more predictably. The business model shapes the product as much as the model shapes the business." },
        { type: "h2", text: "Talent is part of the ecosystem" },
        { type: "p", text: "Frontier AI companies are also competing for a small pool of researchers, systems engineers and product leaders who can move ideas from papers into reliable services. Compensation matters, but so do access to compute, organizational speed, research freedom and the likelihood that work will reach users. A company that loses key people may recover technically, yet repeated departures can weaken its roadmap and internal cohesion." },
        { type: "h2", text: "The market is selecting operating environments" },
        { type: "p", text: "Consumers choose whichever assistant becomes easiest to reach and most useful inside the products they already open every day. Developers choose the platform that reduces friction. Enterprises choose the provider they believe can support critical workflows for years. Those choices reinforce one another: more users attract developers, more integrations attract enterprises, and more revenue funds more infrastructure." },
        { type: "p", text: "That is why the next stage will be determined by compound advantages rather than isolated releases. Trust, developer loyalty, infrastructure depth, distribution and economics must reinforce one another. The company with the best model on a given morning may not be the company that owns the most valuable AI ecosystem a year later." }
      ],
      apply: [
        { label: "Put it to work", text: "Evaluate AI vendors as complete operating environments. Compare model quality together with API stability, data controls, integrations, latency, pricing and the cost of switching." },
        { label: "What to watch", text: "Enterprise model-switching, developer retention, independent evaluations, infrastructure spending and whether distribution advantages become durable daily usage." }
      ],
      links: [],
      sources: [
        { label: "OpenAI", url: "https://openai.com/" },
        { label: "Google DeepMind", url: "https://deepmind.google/" },
        { label: "Anthropic", url: "https://www.anthropic.com/" },
        { label: "Meta AI", url: "https://ai.meta.com/" }
      ],
      corrections: [],
      pipeline: { run: "owner-approved direct batch · 2026-07-14", stages: [
        { name: "Assignment", agent: "Managing Editor", note: "Owner approved a four-company competitive analysis." },
        { name: "Research", agent: "Research Agent", note: "Reviewed company positioning across products, distribution and enterprise adoption." },
        { name: "Draft", agent: "Ronan Cole", note: "Expanded into a full markets-and-strategy synthesis without investment recommendations." },
        { name: "Fact-check", agent: "Verification Agent", note: "Separated company positioning from attributed factual claims." },
        { name: "Risk screen", agent: "Compliance Agent", note: "Attached the financial-information disclaimer." },
        { name: "Publish", agent: "Publishing Agent", note: "Published through the corrected GitHub content path." }
      ], gate: { decision: "Approved for owner-directed publication", note: "Owner explicitly approved this three-story batch." } }
    }
  ];

  if (!Array.isArray(window.RTFC_LIVE_ARTICLES)) window.RTFC_LIVE_ARTICLES = [];
  var existing = {};
  window.RTFC_LIVE_ARTICLES.forEach(function (article) { existing[article.id] = true; });
  batch.reverse().forEach(function (article) {
    if (!existing[article.id]) window.RTFC_LIVE_ARTICLES.unshift(article);
  });
})();
