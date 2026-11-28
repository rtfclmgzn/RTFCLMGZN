/* THE BUZZ — curated social signal.
   Written by the Buzz Desk during each newsroom run. RULES (compliance-rulebook §buzz):
   - NEVER fabricate a quote or a post. `text` paraphrases or briefly quotes something
     verifiably public; `url` links to the original post/announcement or the report of it.
   - `source.kind`: lab | person | news | gov  (drives the avatar color)
   - `heat` 0-100: the desk's judgment of how loud this is across the feed today.
   - Keep up to ~48 items; retire anything older than one week (~7 days) on each run. */
window.RTFC_BUZZ = [
{ id:"bz-877", date:"2026-11-18",
    source:{ name:"Google / 9to5Google", handle:"google", platform:"web", kind:"lab" },
    text:"Google launched Gemini 4 Neon on Nov. 18, priced at $3 input / $15 output per million tokens -- a standing price, not an introductory one, and about 25% below what Gemini 4 Carbon will cost once its own introductory pricing ends Dec. 1. Google claims a 32% lower cost per task than Carbon at its default thinking level, though it hasn't said which Carbon price that comparison used.",
    why:"A standing price undercutting a sibling model's post-introductory rate is Google explicitly building a cheaper default tier into its own lineup, not just running a launch promotion.",
    heat:21, topics:["google","gemini","pricing","model launch"],
    url:"https://9to5google.com/2026/11/18/gemini-4-neon-announcement/" },
{ id:"bz-876", date:"2026-11-17",
    source:{ name:"OpenAI", handle:"openai", platform:"web", kind:"lab" },
    text:"OpenAI launched GPT-6.2 Astra and Sol on Nov. 17, cutting Astra's API price 20% versus GPT-6 Astra. OpenAI's own benchmarks lead on a human-judged visual test, but independent results were cooler -- reported flat scores on Artificial Analysis' Coding Agent Index versus the prior model, and at least one prominent early tester called it the first OpenAI frontier release since GPT-4.5 he didn't see as a clear step forward.",
    why:"A price cut paired with a benchmark that didn't move and visibly unimpressed power users is a different signal than a confident capability leap -- worth watching whether OpenAI's next release addresses the specific coding-agent plateau testers flagged.",
    heat:24, topics:["openai","gpt-6.2","model launch","benchmarks"],
    url:"https://openai.com/index/introducing-gpt-6-2-astra-sol" },
{ id:"bz-875", date:"2026-11-12",
    source:{ name:"Bloomberg Law", handle:"bloomberglaw", platform:"web", kind:"news" },
    text:"Flinn Artificial Intelligence Technologies filed two patent-infringement complaints in Delaware federal court on Nov. 12 -- one against Anthropic, one against OpenAI -- alleging both companies' models infringe five patents held by co-inventors Steven Flinn and Naomi Moneypenny. Anthropic's Nov. 10 amended IPO filing had already flagged the possibility of patent claims in general terms, without naming this case.",
    why:"Simultaneous suits against both frontier labs over the same patent family, filed the week of Anthropic's IPO roadshow, puts a specific new legal-cost variable in front of public-market investors right as pricing was being set.",
    heat:20, topics:["anthropic","openai","patents","lawsuit"],
    url:"https://news.bloomberglaw.com/ip-law/anthropic-hit-with-patent-suit-over-claude-ai-neural-networks" },
{ id:"bz-874", date:"2026-11-12",
    source:{ name:"Al Jazeera", handle:"aljazeera", platform:"web", kind:"news" },
    text:"Four nonprofits -- Irreplaceable Education Fund, Public Citizen, Heat Initiative, and Alliance for Secure AI -- sued OpenAI, Anthropic, Google, Meta, and SpaceX's AI unit in San Francisco Superior Court on Nov. 12, asking a judge to freeze frontier-model training and deployment under California's Unfair Competition Law. No injunction has been granted; the companies have not yet responded in court.",
    why:"A request to freeze training and deployment outright, not just add disclosure or safety-testing requirements, is a sharper ask than prior AI litigation -- worth watching for whether any court takes the public-nuisance theory seriously enough to even hold a hearing on interim relief.",
    heat:23, topics:["lawsuit","regulation","openai","anthropic","google","meta","spacex"],
    url:"https://www.aljazeera.com/news/2026/11/12/us-nonprofits-sue-tech-giants-to-halt-ai-development" },
{ id:"bz-873", date:"2026-11-12",
    source:{ name:"Nvidia (SEC 8-K)", handle:"nvidia", platform:"web", kind:"gov" },
    text:"Nvidia's board accepted Jensen Huang's resignation as president, CEO, and board member effective Nov. 11, per the company's own SEC filing, naming CFO Colette Kress interim CEO while it searches for a permanent replacement. The filing gives no reason for the departure; press reports note the board had opened an independent investigation on Nov. 8 into reports Huang was the target of a foreign intelligence effort, but neither the filing nor Nvidia's public statements confirm a link.",
    why:"A 33-year CEO's immediate departure from the world's most valuable chipmaker, with the company's own filing silent on why, leaves a wide gap between what's confirmed (the resignation, the interim CEO, the pre-existing investigation) and what's still just reported -- worth tracking what, if anything, Nvidia eventually confirms.",
    heat:31, topics:["nvidia","jensen huang","leadership","sec filing"],
    url:"https://www.sec.gov/Archives/edgar/data/0001045810/000104581026000082/nvidiaannouncesceotransiti.htm" }
];
