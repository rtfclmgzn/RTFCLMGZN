/* THE BUZZ — curated social signal.
   Written by the Buzz Desk during each newsroom run. RULES (compliance-rulebook §buzz):
   - NEVER fabricate a quote or a post. `text` paraphrases or briefly quotes something
     verifiably public; `url` links to the original post/announcement or the report of it.
   - `source.kind`: lab | person | news | gov  (drives the avatar color)
   - `heat` 0-100: the desk's judgment of how loud this is across the feed today.
   - Keep 12-24 items; retire anything older than ~5 days on each run. */
window.RTFC_BUZZ = [
  { id:"bz-021", date:"2026-07-17",
    source:{ name:"TechCrunch", handle:"TechCrunch", platform:"web", kind:"news" },
    text:"Databricks announced a new funding round valuing it at **$188 billion**, reportedly around $3 billion, as it continues repositioning itself as an AI platform company.",
    why:"A major private-market valuation reset shows how strongly enterprise AI infrastructure is being rewarded by investors.",
    heat:86, topics:["funding", "databricks", "enterprise ai", "valuation"],
    url:"https://techcrunch.com/2026/07/17/databricks-hits-188b-valuation-extending-its-run-as-ais-favorite-second-act/" },
  { id:"bz-022", date:"2026-07-17",
    source:{ name:"TechCrunch", handle:"TechCrunch", platform:"web", kind:"news" },
    text:"Vertu’s $6,880 Alphafold luxury phone uses Hermes Agent for multi-step executive workflows. Testing found it more autonomous than Gemini in some tasks, but also prone to **incorrect dates, incomplete actions, and inconsistent file handling**.",
    why:"It is a vivid real-world test of whether agentic autonomy is valuable enough to justify premium hardware pricing.",
    heat:78, topics:["ai agents", "hardware", "vertu", "enterprise"],
    url:"https://techcrunch.com/2026/07/17/vertu-wants-executives-to-pay-6880-for-an-ai-agent-heres-how-it-actually-performs/" },
  { id:"bz-023", date:"2026-07-17",
    source:{ name:"TechCrunch", handle:"TechCrunch", platform:"web", kind:"news" },
    text:"Agility Robotics is opening a **60,000-square-foot humanoid-robot training facility in Fremont**, near Tesla’s expected Optimus production site. The company says it has secured $300 million in contract orders and has more than 30 prospective customers in discussion.",
    why:"The move adds commercial deployment evidence to the humanoid-robotics race, beyond headline demonstrations and prototypes.",
    heat:82, topics:["robotics", "humanoids", "agility robotics", "manufacturing"],
    url:"https://techcrunch.com/2026/07/17/agility-robotics-plants-its-flag-in-teslas-backyard/" },
  { id:"bz-024", date:"2026-07-17",
    source:{ name:"TechCrunch", handle:"TechCrunch", platform:"web", kind:"gov" },
    text:"San Francisco ordered Apple and Google to remove dozens of AI “nudify” apps from their stores, arguing that they facilitate non-consensual intimate deepfakes. Apple said it had removed three cited apps, while Google said all five referenced Play apps had been suspended.",
    why:"This is a concrete escalation from public criticism to platform-enforcement pressure over generative-AI abuse.",
    heat:91, topics:["deepfakes", "safety", "policy", "apple"],
    url:"https://techcrunch.com/2026/07/17/apple-and-google-ordered-to-purge-nudify-apps-from-app-stores/" },
  { id:"bz-025", date:"2026-07-17",
    source:{ name:"TechCrunch", handle:"TechCrunch", platform:"web", kind:"news" },
    text:"TechCrunch’s Equity podcast examined how Apple’s trade-secrets lawsuit against OpenAI could affect **OpenAI’s hardware ambitions and a potential IPO timeline**. The complaint reportedly alleges misconduct involving senior hardware leadership and more than 400 former Apple employees now at OpenAI.",
    why:"The case links AI talent movement, hardware strategy, litigation risk, and capital-markets timing in one of the industry’s highest-profile disputes.",
    heat:84, topics:["openai", "apple", "litigation", "ipo"],
    url:"https://techcrunch.com/video/how-apples-big-lawsuit-could-disrupt-openais-ipo-plans/" }
];
