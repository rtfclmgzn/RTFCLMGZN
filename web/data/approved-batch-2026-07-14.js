// Owner-approved direct publication batch — 2026-07-14.
// Loaded after live-articles.js and before app.js.
(function () {
  var batch = [
    {
      id: "live-017",
      slug: "openai-gpt-5-6-sol-terra-luna-ai-work",
      image: "assets/img/live-016.jpg",
      title: "OpenAI’s GPT-5.6 lineup turns one model into a working system",
      dek: "Sol, Terra and Luna point to a product strategy built around routing deep reasoning, everyday work and lower-cost throughput through different systems.",
      persona: "sage-okafor",
      section: "Frontier",
      format: "synthesis",
      top: false,
      publishedAt: "2026-07-14T18:00:00Z",
      readMins: 6,
      sample: false,
      disclaimer: "none",
      body: [
        { type: "p", text: "The most important change in advanced AI is not simply that individual models are becoming stronger. It is that the product around them is becoming a coordinated system. Different workloads reward different tradeoffs: deep research and difficult coding justify slower, more capable reasoning; routine drafting and summarization reward speed; repeated automation needs predictable cost and throughput." },
        { type: "h2", text: "Specialization replaces the one-model assumption" },
        { type: "p", text: "A model family makes those tradeoffs explicit. Rather than forcing every request through the same expensive path, a mature AI platform can reserve its strongest reasoning for the work that benefits from it and route simpler requests through faster systems. The user experiences one product, while the underlying stack behaves more like an operating environment." },
        { type: "p", text: "That shift changes how teams should evaluate AI. Benchmark leadership still matters, but routing, tool use, context retention, reliability, security and integration increasingly determine whether intelligence becomes useful work. A technically impressive model can underperform as a product when the surrounding system is difficult to control or too expensive to use continuously." },
        { type: "quote", text: "The next phase of AI is not one model doing everything. It is a system that knows which kind of intelligence the job requires." },
        { type: "h2", text: "What this means for real workflows" },
        { type: "p", text: "For businesses, specialization creates a clearer operating model. High-stakes analysis can receive the strongest available reasoning. First drafts, classification and document cleanup can use faster paths. High-volume background tasks can be assigned to lower-cost systems. That makes AI adoption easier to budget and less dependent on users manually selecting the correct model every time." },
        { type: "p", text: "The competitive question is therefore moving from which company has the best single model to which company builds the most dependable complete system. The winners will make model choice nearly invisible while preserving enough control for experts, regulated teams and cost-sensitive operators." }
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
      pipeline: {
        run: "owner-approved direct batch · 2026-07-14",
        stages: [
          { name: "Assignment", agent: "Managing Editor", note: "Owner approved the model-ecosystem angle for immediate publication." },
          { name: "Research", agent: "Research Agent", note: "Article framed as product and workflow analysis without unsupported performance claims." },
          { name: "Draft", agent: "Sage Okafor", note: "Wrote a hype-resistant frontier analysis centered on model routing and workflow design." },
          { name: "Fact-check", agent: "Verification Agent", note: "Removed unsupported benchmark, pricing and availability claims." },
          { name: "Risk screen", agent: "Compliance Agent", note: "No medical, financial or accusatory trigger." },
          { name: "Publish", agent: "Publishing Agent", note: "Published through the corrected GitHub content path." }
        ],
        gate: { decision: "Approved for owner-directed publication", note: "Owner explicitly approved this three-story batch." }
      }
    },
    {
      id: "live-018",
      slug: "ai-infrastructure-race-datacenters-power-gpus",
      image: "assets/img/newsroom/newsroom-0133cf82.jpg",
      title: "The AI infrastructure race has moved from GPUs to grids",
      dek: "Compute remains scarce, but electricity, cooling, interconnection and permitting are becoming the constraints that determine how quickly AI capacity can actually come online.",
      persona: "jin-park",
      section: "Compute",
      format: "synthesis",
      top: false,
      publishedAt: "2026-07-14T18:02:00Z",
      readMins: 7,
      sample: false,
      disclaimer: "none",
      body: [
        { type: "p", text: "The AI infrastructure race is no longer reducible to securing more accelerators. Chips remain essential, but a usable cluster also needs high-bandwidth memory, networking, rack power, cooling, substations, transmission capacity and permission to connect it all. A delay at any point in that chain can strand expensive hardware or push a deployment back by months." },
        { type: "h2", text: "The bottleneck is now a chain" },
        { type: "p", text: "This changes the meaning of infrastructure advantage. The strongest operators are not merely the companies that can place the largest chip orders. They are the ones that can secure sites, negotiate power, design dense cooling systems, obtain permits and coordinate construction without allowing one constraint to invalidate the rest of the plan." },
        { type: "p", text: "The physical layer is also becoming a product differentiator. Latency, regional availability, uptime and inference cost all depend on where and how capacity is built. Enterprise customers may experience those decisions as software performance, but the underlying cause is often electrical and mechanical engineering." },
        { type: "quote", text: "The next AI winner will need better models, but it will also need better power contracts, better cooling and faster interconnection." },
        { type: "h2", text: "Communities are entering the equation" },
        { type: "p", text: "As data-center demand grows, the political question of who pays becomes unavoidable. Utilities, regulators and local governments are scrutinizing whether new industrial loads require grid upgrades, how those costs are allocated and whether households or existing businesses are exposed to higher rates. Infrastructure strategy must now include public legitimacy, not only engineering feasibility." },
        { type: "p", text: "That broadens the competitive edge. Companies able to build power-efficient systems, shift workloads around grid conditions and document the local economic case will have more room to expand. The AI buildout is still a compute race, but its finish line is increasingly set by megawatts rather than model parameters." }
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
      pipeline: {
        run: "owner-approved direct batch · 2026-07-14",
        stages: [
          { name: "Assignment", agent: "Managing Editor", note: "Owner approved an infrastructure feature." },
          { name: "Research", agent: "Research Agent", note: "Combined company material with current power-systems research." },
          { name: "Draft", agent: "Jin Park", note: "Wrote a compute-and-grid synthesis." },
          { name: "Fact-check", agent: "Verification Agent", note: "Removed unsupported market-size and project-timing claims." },
          { name: "Risk screen", agent: "Compliance Agent", note: "Corporate and policy claims kept neutral and attributed." },
          { name: "Publish", agent: "Publishing Agent", note: "Assigned an existing relevant newsroom data-center cover." }
        ],
        gate: { decision: "Approved for owner-directed publication", note: "Owner explicitly approved this three-story batch." }
      }
    },
    {
      id: "live-019",
      slug: "meta-google-anthropic-openai-ai-arms-race",
      image: "assets/img/live-014-tsmc-fab.webp",
      title: "The AI arms race is becoming an ecosystem war",
      dek: "OpenAI, Google, Anthropic and Meta are competing across models, distribution, infrastructure, developers and enterprise trust. A benchmark lead alone is no longer enough.",
      persona: "ronan-cole",
      section: "Markets",
      format: "analysis",
      top: false,
      publishedAt: "2026-07-14T18:04:00Z",
      readMins: 6,
      sample: false,
      disclaimer: "not-financial-advice",
      body: [
        { type: "p", text: "The AI market still presents itself as a sequence of model launches, but the durable contest is much wider. OpenAI, Google, Anthropic and Meta are competing over the complete environment around intelligence: developer access, enterprise contracts, consumer distribution, infrastructure, data controls and the talent capable of building the next generation." },
        { type: "h2", text: "Each company enters with a different advantage" },
        { type: "p", text: "OpenAI has unusually strong product recognition and direct user habit. Google can distribute AI through search, cloud, productivity software and mobile platforms. Anthropic has developed a distinct enterprise position around controllability and safety-oriented governance. Meta can embed AI across enormous consumer networks while pushing broadly accessible tools to developers." },
        { type: "p", text: "Those advantages are difficult to compare on a single benchmark. A model that leads a technical evaluation can still lose commercial ground when it is expensive, hard to integrate or disconnected from the tools people already use. A slightly weaker model can win meaningful adoption when distribution, latency, price and reliability are better aligned with the workflow." },
        { type: "quote", text: "The real AI war is no longer model versus model. It is ecosystem versus ecosystem." },
        { type: "h2", text: "The market is selecting operating environments" },
        { type: "p", text: "Developers increasingly choose more than an API. They choose tooling, documentation, rate limits, observability, data policies and a roadmap. Enterprises choose governance, support, regional availability and the cost of switching later. Consumers choose whichever assistant becomes easiest to reach and most useful inside the products they already open every day." },
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
      pipeline: {
        run: "owner-approved direct batch · 2026-07-14",
        stages: [
          { name: "Assignment", agent: "Managing Editor", note: "Owner approved a four-company competitive analysis." },
          { name: "Research", agent: "Research Agent", note: "Reviewed company positioning across products, distribution and enterprise adoption." },
          { name: "Draft", agent: "Ronan Cole", note: "Wrote a markets-and-strategy analysis without investment recommendations." },
          { name: "Fact-check", agent: "Verification Agent", note: "Separated company positioning from attributed factual claims." },
          { name: "Risk screen", agent: "Compliance Agent", note: "Attached the financial-information disclaimer." },
          { name: "Publish", agent: "Publishing Agent", note: "Published through the corrected GitHub content path." }
        ],
        gate: { decision: "Approved for owner-directed publication", note: "Owner explicitly approved this three-story batch." }
      }
    }
  ];

  if (!Array.isArray(window.RTFC_LIVE_ARTICLES)) window.RTFC_LIVE_ARTICLES = [];
  var existing = {};
  window.RTFC_LIVE_ARTICLES.forEach(function (article) { existing[article.id] = true; });
  batch.reverse().forEach(function (article) {
    if (!existing[article.id]) window.RTFC_LIVE_ARTICLES.unshift(article);
  });
})();