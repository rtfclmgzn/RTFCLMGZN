// RTFCLMGZN — Guides (window.RTFC_GUIDES). Hands-on, instructional pieces,
// published 2–3x/week alongside the news. Article-compatible schema; section:"Guide".
window.RTFC_GUIDES = [
  {
    id:"g1", slug:"brief-an-ai-like-a-pro", image:"assets/img/g1.jpg",
    title:"The Brief Method: how to ask an AI for something and actually get it",
    dek:"The single highest-leverage AI skill isn't prompting tricks — it's writing a brief the way good managers delegate. Five minutes to learn, immediately useful, works on every model.",
    persona:"nova-reyes", section:"Guide", format:"synthesis",
    publishedAt:"2026-07-10T11:00:00Z", readMins:4, sample:false, disclaimer:"none",
    outcome:"You'll write a request that gets a usable answer on the first try — on any model, for any task.",
    gtime:"5 min", glevel:"Beginner",
    tldr:[
      "The highest-leverage AI skill isn't prompting tricks — it's writing a brief the way a good manager delegates. A four-word prompt gets a generic answer because it asked for something generic; nothing about the model has to change.",
      "Give the AI a role first. That one line sets the vocabulary, judgment and standards for everything that follows.",
      "State the job in one sentence — one request, one outcome. If you need two things, that's two briefs.",
      "Add the two or three facts that make it yours (the audience, the hook, the tone only you know), then set constraints: length, format, what to avoid. Constraints don't limit the model, they aim it.",
      "End with the ask-back line — the step almost nobody uses. It makes the model surface the gaps in your thinking before it wastes a draft, and half the time answering its questions is what tells you what you actually wanted.",
      "Never accept the first draft; react to it. Each reaction takes five seconds and compounds — three rounds of steering beats an hour writing the perfect prompt up front."
    ],
    body:[
      {type:"p", text:"A brilliant marketer I know told me she'd 'tried AI and it wasn't good.' Her prompt had been four words: **'write a launch email.'** The model gave her something generic because she'd asked for something generic. We spent ninety seconds rewriting it the way she'd brief a new hire — and the second output made her sit back in her chair. Nothing about the model changed. The brief did."},
      {type:"p", text:"That's the whole skill, and it works on every model, every time. Here it is as six steps you can reuse tonight."}
    ],
    steps:[
      {do:"Give the AI a role.", detail:"Open by telling it who to be. This one line sets the vocabulary, judgment, and standards for everything that follows.", example:"“You're an experienced email marketer for indie software.”"},
      {do:"State the job in one sentence.", detail:"One request, one outcome. If you need two things, that's two briefs.", example:"“Write a launch email for our new budgeting app.”"},
      {do:"Add the 2–3 facts that make it YOURS.", detail:"This is where generic becomes specific — the audience, the hook, and the tone that only you know.", example:"“Audience: freelancers who hate spreadsheets. Hook: it categorizes expenses automatically. Tone: friendly, not corporate.”"},
      {do:"Set the constraints — define what 'done' looks like.", detail:"Length, format, and what to avoid. Constraints don't limit the model; they aim it.", example:"“Under 150 words, one call-to-action, no exclamation marks.”"},
      {do:"End with the ask-back line.", detail:"The line almost nobody uses and everybody should. It makes the model surface the gaps in your thinking **before** it wastes a draft — and half the time, answering its questions is what tells you what you actually wanted.", example:"“Ask me up to three questions before you start if anything's unclear.”"},
      {do:"Never accept the first draft — react to it.", detail:"Steer with the destination in sight. Each reaction takes five seconds and compounds; three rounds beats an hour of writing the perfect prompt up front.", example:"“Warmer.” · “Half as long.” · “The second paragraph is the real opening — start there.”"}
    ],
    apply:[
      {label:"Save the five lines somewhere you'll actually use them.", text:"Role · Job · Context · Constraints · Ask-back. Put the skeleton in a note or a text shortcut. The friction of remembering is what kills good habits."},
      {label:"Re-run your last disappointing AI request through the method.", text:"Take the most recent time an AI let you down, rewrite it as a five-line brief, and compare. That side-by-side is the fastest way to convince yourself — and it takes two minutes."},
      {label:"Teach it to one person this week.", text:"The 'ask me questions first' line alone will change how someone you know uses these tools. Be the friend who fixed AI for them."}
    ],
    sources:[
      {label:"RTFCLMGZN hands-on testing notes", url:"#/masthead"}
    ],
    corrections:[]
  },
  {
    id:"g2", slug:"catch-an-ai-making-things-up", image:"assets/img/g2.jpg",
    title:"The confident wrong answer: how to catch an AI making things up",
    dek:"AI's most dangerous failure isn't being wrong — it's being wrong in a fluent, confident, plausible voice. Here's the working newsroom's toolkit for catching it, in about the time it takes to read this.",
    persona:"sage-okafor", section:"Guide", format:"synthesis",
    publishedAt:"2026-07-11T09:00:00Z", readMins:5, sample:false, disclaimer:"none",
    tldr:[
      "The dangerous failure isn't that AI is wrong — it's that it's wrong in a fluent, confident, plausible voice. A lawyer once filed a brief citing six perfectly on-point court decisions that were entirely invented.",
      "A language model is trained to produce text that is plausible, not text that is true. Most of the time those overlap, which is why the tools are useful; the skill is knowing exactly where the overlap breaks.",
      "Hallucination isn't random — it clusters on anything precise and verifiable: specific numbers, direct quotes, names paired with claims, citations, dates, legal or medical specifics, and anything recent or obscure. Vague, widely-repeated knowledge is where models are safest.",
      "The thirty-second check is three questions: Is anything here load-bearing? Did it give a source I can actually open? And the move almost nobody makes — ask the model how it knows. A grounded model gets more specific; a bluffing one hedges, softens and walks the claim back. That reversal is the tell.",
      "Two habits make it automatic: demand sources for anything factual and actually open one (the common mistake isn't trusting AI, it's trusting AI that provided a link nobody clicked), and for anything important ask a second model the same question and watch where they disagree.",
      "None of this makes AI less useful — it makes it safe to use for the things that matter. The people who get long-term value aren't the ones who trust these tools most or least, but the ones who know precisely which sentence to double-check."
    ],
    body:[
      {type:"p", text:"Here is the failure mode that should worry you, and it isn't the one in the movies. A lawyer in a real 2023 case filed a brief citing six court decisions that supported his argument perfectly. They were exactly on point. They were also entirely invented — an AI had produced them, complete with plausible case names, plausible citations, and plausible judges, and the lawyer had trusted them because they read exactly like real law. The problem was never that the model was wrong. The problem was how good it was at being wrong."},
      {type:"p", text:"That's the whole thing you need to internalize about these tools: a language model is trained to produce text that is *plausible*, not text that is *true*. Most of the time plausible and true overlap, which is why the tools are useful. The skill — the one that separates people who get burned from people who don't — is knowing exactly where that overlap breaks, and having a thirty-second habit for the moments that matter."},
      {type:"h2", text:"Where models bluff (it's predictable)"},
      {type:"p", text:"Hallucination isn't random; it clusters in specific places, and once you know them you can aim your skepticism. Models bluff hardest on ==anything precise and verifiable==: specific numbers and statistics, direct quotes, names of people paired with specific claims, citations and sources, dates, legal or medical specifics, and anything that happened recently or is genuinely obscure. The pattern underneath all of these is the same — the model is reaching for a *specific* fact it may not actually have, so it generates the shape of a right answer. The fluency stays perfect even when the facts underneath have quietly evaporated. Vague, general, widely-repeated knowledge is where models are safest; sharp, checkable specifics are where they invent."},
      {type:"quote", text:"Fluency is not accuracy. The model's confidence is a property of its writing style, not its knowledge — never read one as evidence of the other."},
      {type:"h2", text:"The thirty-second check"},
      {type:"p", text:"You don't need to fact-check everything — that would defeat the point of the tool. You need to check the things that would *matter if they were wrong*. Three questions do it. First: **is anything here load-bearing?** If you're brainstorming taglines, relax. If a number, name, or citation is going to leave your hands and be treated as fact, that's the sentence to scrutinize. Second: **did it give a source I can actually open?** Not 'a study found' — an actual link or reference you can click and read. Third, the move almost nobody makes: **ask the model how it knows.** 'What's your source for that figure? How confident are you, and what would make you wrong?' A model with real grounding gets more specific; a model that was bluffing starts hedging, softening, or quietly walking the claim back. That reversal is the tell."},
      {type:"h2", text:"Two habits that make it automatic"},
      {type:"p", text:"First, **demand sources for anything factual and then actually open one.** The single most common mistake isn't trusting AI — it's trusting AI that provided a link nobody clicked. Real citations are checkable; invented ones dissolve the moment you look. Second, for anything genuinely important, **ask a second, different model the same question** and watch where they disagree. Agreement isn't proof, but disagreement is a bright flare pointing exactly at the sentence you need to verify yourself. This is, more or less, how our own newsroom's Verification Agent works: nothing precise ships unless it's confirmed against a primary source, and any figure that lives in only one place gets labeled or cut. You can run the same discipline in your own head for free."},
      {type:"p", text:"None of this makes AI less useful. It makes it *safe* to use for the things that matter — which is the only way to actually rely on it. The people who get value from these tools long-term aren't the ones who trust them most or least. They're the ones who know precisely which sentence to double-check, and never skip it."}
    ],
    apply:[
      {label:"Adopt the load-bearing rule.", text:"Before you forward, publish, or act on anything an AI told you, find the one fact in it that would matter most if it were false — a number, a name, a citation — and verify just that. You don't need to check everything; you need to check the thing that would hurt."},
      {label:"Make 'how do you know?' a reflex.", text:"When a model gives you a confident specific, ask it for its source and its confidence. Watch whether it gets more precise (grounded) or starts hedging (bluffing). The direction it moves is your answer."},
      {label:"Never trust an uncited citation, ever.", text:"If an AI cites a study, case, article, or statistic, treat it as fabricated until you've opened the actual source. Invented references are the single most common — and most damaging — hallucination. The click takes ten seconds; the retraction takes a reputation."},
      {label:"Cross-examine with a second model on the big stuff.", text:"For anything high-stakes, ask the same question of a different AI. Where they agree, relax slightly; where they diverge, you've found the exact claim to verify yourself. Disagreement is a free hallucination detector."}
    ],
    sources:[
      {label:"On the 2023 fabricated-citations case (Mata v. Avianca) — widely reported", url:"#/masthead"},
      {label:"RTFCLMGZN Verification Agent — how our newsroom checks facts", url:"#/masthead"}
    ],
    corrections:[]
  },
  {
    id:"g3", slug:"which-ai-for-which-job", image:"assets/img/g3.jpg",
    title:"Right tool, right job: how to choose which AI to actually use",
    dek:"New models drop every week and the leaderboards are mostly noise. The durable skill isn't knowing which model is 'best' — it's matching the job to the right class of tool. A framework that outlasts the next launch.",
    persona:"jin-park", section:"Guide", format:"synthesis",
    publishedAt:"2026-07-09T13:00:00Z", readMins:5, sample:false, disclaimer:"none",
    tldr:[
      "There is no 'best model,' the same way there is no best vehicle — a cargo ship and a motorcycle are both correct answers to completely different questions. Name the job first, then reach for the class of tool built for it.",
      "Match the shape of the work: fast, high-volume, low-stakes tasks want a small cheap model; hard multi-step reasoning wants a frontier reasoning model; long documents want a large-context model; code wants a coding-tuned model; anything genuinely private wants a model on infrastructure you control.",
      "The big labs now sell families, not models — a flagship, a mid-tier and a budget tier at prices differing by 5 to 25 times. GPT-5.6 ships as Sol, Terra and Luna. Those tiers are a menu, and most people order far too expensively out of habit.",
      "The vast majority of real work runs perfectly on the cheap tier. Escalate to the flagship for the genuinely hard 10%, not the routine 90% — that ratio is the single biggest lever on what AI costs you.",
      "A concrete example: independent testing this year found a task that ran about $2.50 on a budget model and near $12 on a flagship, for output a careful reader couldn't tell apart. That's a 5x bill for zero gain.",
      "The durable habit is draft cheap, escalate hard: start on a fast, cheap model and only escalate the same prompt if it visibly struggles. That intuition outlasts every leaderboard, because the names keep changing and the job-to-tool mapping doesn't."
    ],
    body:[
      {type:"p", text:"Every week a new model launches, tops a benchmark, and sets off a round of 'is this the new best AI?' It's the wrong question, and chasing it will keep you permanently one launch behind. I spend my days looking at the hardware and economics underneath these systems, and from down there the truth is plain: there is no 'best model,' the same way there is no 'best vehicle.' A cargo ship and a motorcycle are both correct answers — to completely different questions. The skill that actually compounds is learning to name the job first, then reach for the class of tool built for it."},
      {type:"h2", text:"Name the job, not the model"},
      {type:"p", text:"Almost every task you'd hand an AI falls into one of a few shapes, and each shape has a matching tool. **Fast, high-volume, low-stakes work** — summarizing, reformatting, first-draft boilerplate, sorting — wants a small, cheap, fast model. Using a flagship here is like renting a freight truck to carry a sandwich. **Hard reasoning** — multi-step logic, tricky code, analysis where a wrong step ruins the answer — wants a frontier reasoning model, and it's worth the wait and the price. **Long documents** — a contract, a codebase, a book — wants a large-context model that can hold the whole thing at once. **Code** wants a coding-tuned model. And **anything genuinely private or sensitive** wants a model you can run locally or on infrastructure you control, full stop, regardless of what's fastest."},
      {type:"quote", text:"There's no best model, the same way there's no best vehicle. A cargo ship and a motorcycle are both right answers to different questions. Name the trip first."},
      {type:"h2", text:"The tiers exist for a reason — use them"},
      {type:"p", text:"Here's the part my desk cares about most, and where the most money gets wasted. The big labs now sell *families*, not models — a flagship, a mid-tier, and a budget tier, at prices that differ by 5 to 25 times. GPT-5.6 ships as Sol, Terra, and Luna; the others have their own ladders. Those tiers are not a marketing gimmick; they're a menu, and most people order far too expensively out of habit. The vast majority of real work — the summarizing, drafting, sorting, answering — runs perfectly on the cheap tier. You escalate to the flagship for the genuinely hard 10%, not the routine 90%. Getting that ratio right is the single biggest lever on what AI costs you, whether you're paying per token or just paying with your own time waiting for a slow model to over-think a simple task."},
      {type:"p", text:"A concrete example from my own reporting: independent testing this year found a task that cost around $2.50 on a budget model and near $12 on a flagship — for output a careful reader couldn't tell apart. That's not a rounding error; that's a 5x bill for zero gain, paid over and over by teams who never questioned the default. The discipline isn't stinginess. It's refusing to pay freight-truck prices to deliver a sandwich, and noticing that most of what you send an AI is, in fact, a sandwich."},
      {type:"h2", text:"The habit: draft cheap, escalate hard"},
      {type:"p", text:"Here's the workflow that beats memorizing any leaderboard. Start a task on a fast, cheap model. If the output's good enough — and it will be, more often than you expect — you're done, for a fraction of the cost and the wait. If it visibly struggles, *then* escalate the same prompt to a frontier model. You'll quickly build an intuition for which of your own tasks need the heavy machinery and which never did. That intuition is durable in a way that 'which model is best this week' never will be: the launches will keep coming, the names will keep changing, and the job-to-tool mapping underneath will keep being the thing that actually matters."}
    ],
    apply:[
      {label:"Sort your recurring AI tasks into three buckets.", text:"List what you use AI for, then tag each: cheap-tier (summarize, reformat, draft), flagship (hard reasoning, critical code, analysis), or local/private (anything sensitive). Most of your list is cheap-tier — that realization alone will save you money or time."},
      {label:"Default to the cheap tier; escalate only on failure.", text:"Start every task on a fast, inexpensive model. Only bump it up to a flagship when the output actually falls short. Reserve the expensive machinery for the hard 10%, not the routine 90%."},
      {label:"Match the model to the shape, not the hype.", text:"Long document → large-context model. Real code → coding-tuned model. Sensitive data → a model you control. Ignore this week's leaderboard winner and ask what shape your job is."},
      {label:"Keep two models within reach.", text:"Have a cheap workhorse and a frontier heavyweight both a click away, and get fluent at moving a prompt between them. The switching habit is worth more than loyalty to any single model."}
    ],
    sources:[
      {label:"RTFCLMGZN Compute desk — model tiers & cost analysis", url:"#/masthead"},
      {label:"Our coverage: GPT-5.6's Sol/Terra/Luna tiers", url:"#/article/gpt-5-6-sol-terra-luna-launch"}
    ],
    corrections:[]
  }
];
