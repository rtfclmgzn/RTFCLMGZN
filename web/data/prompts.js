// RTFCLMGZN — THE PROMPT LIBRARY (window.RTFC_PROMPTS)
// Lives at /prompts, inside Resources.
//
// WHAT BELONGS HERE
// Prompts that do a specific job well, written to be copied and used as-is by
// someone who is not a prompt engineer. Not "10x your productivity" filler:
// each one names the job it does, what it needs from you in <ANGLE BRACKETS>,
// and what it gives back. If a prompt cannot survive being pasted cold into a
// chat window by a stranger, it does not go on this page.
//
// HOUSE RULES FOR EVERY ENTRY
//   · `use` states the job in one line. `why` states what makes it work, so
//     the reader learns the technique and not just the text.
//   · Placeholders are <UPPERCASE IN ANGLE BRACKETS>, always.
//   · Model-agnostic unless the prompt genuinely depends on a capability
//     (long context, web access, code execution) — then say so in `needs`.
//   · No prompt that asks a model to fabricate credentials, impersonate a real
//     person, or bypass a safety measure. This is a newsroom.
//
// Maintained by the weekly evolution run: new entries as techniques prove out,
// and anything that stops working gets removed rather than left to rot.
window.RTFC_PROMPTS_META = {
  updated: "2026-08-14",
  cadence: "Reviewed weekly; prompts that stop working are removed, not left to rot."
};

window.RTFC_PROMPTS = [

  { cat:"Think it through", id:"thinking", icon:"◈",
    desc:"Prompts that make a model reason properly instead of answering fast. The highest-value category and the least used.",
    items:[
      { title:"The steelman-then-decide", use:"Make a real decision between two options.",
        needs:"Any model.",
        why:"Models default to agreeable summaries of both sides. Forcing the strongest case for each, in order, before any verdict, stops the answer from collapsing into 'it depends'.",
        text:"I need to decide between <OPTION A> and <OPTION B> for <SITUATION, INCLUDING CONSTRAINTS: budget, time, skill, who else is affected>.\n\nDo this in order, with headers:\n1. The strongest possible case for A — the version its best advocate would make.\n2. The strongest possible case for B — same standard.\n3. The three facts that would most change this decision, and how I could find each one this week.\n4. Your actual recommendation, with the single biggest reason you might be wrong about it.\n\nDo not hedge in section 4. Pick one." },
      { title:"Find the flaw in my reasoning", use:"Pressure-test a plan or argument before you commit.",
        needs:"Any model.",
        why:"Asking 'what do you think?' gets encouragement. Asking for the failure mode gets analysis.",
        text:"Here is my reasoning: <YOUR ARGUMENT OR PLAN>.\n\nAssume it is wrong. Work out why.\n\n- Which single assumption is load-bearing — the one where if it fails, everything above it falls?\n- Where am I generalising from too few cases?\n- What would someone who has done this before, and failed, warn me about?\n- What is the cheapest test that would tell me whether the load-bearing assumption holds?\n\nBe blunt. I would rather hear it now than after I have shipped." },
      { title:"Explain it at three depths", use:"Actually understand something instead of recognising the words.",
        needs:"Any model.",
        why:"One explanation lands at one level. Three, deliberately layered, surface exactly where your understanding runs out.",
        text:"Explain <TOPIC> three times, each ~150 words:\n\n1. To someone who has never heard of it — plain words, one concrete analogy, no jargon at all.\n2. To someone in an adjacent field — the mechanism, the real terms, why it works.\n3. To a practitioner — the caveats, the contested parts, where the field disagrees with itself.\n\nEnd with: the one thing most people get wrong about this, and what is actually true." },
      { title:"The premortem", use:"Kill a plan's weak points before you start.",
        needs:"Any model.",
        why:"Imagining a failure that has already happened produces sharper, more specific risks than asking 'what could go wrong'.",
        text:"It is <DATE, 6 MONTHS FROM NOW>. <MY PLAN> has failed completely.\n\nWrite the post-mortem: what went wrong, in what order, and what the earliest visible warning sign of each failure would have been.\n\nThen list the three cheapest things I could do THIS WEEK that would have prevented the two most likely failures." }
    ]},

  { cat:"Research and verify", id:"research", icon:"⌕",
    desc:"Getting facts out of a model, and — more importantly — getting it to tell you which parts you should not trust.",
    items:[
      { title:"Sourced brief with a confidence column", use:"Research a topic without inheriting confident nonsense.",
        needs:"A model with live web access for current facts.",
        why:"Separating claims by confidence is the single highest-value habit in AI research. It converts a wall of plausible text into something you can act on selectively.",
        text:"Research <TOPIC> and give me a brief.\n\nFormat every factual claim as a row: CLAIM | SOURCE (name + link) | CONFIDENCE (established / reported / contested / unverified).\n\nRules:\n- Primary sources beat coverage of primary sources. Say which you used.\n- If two sources disagree, show both and say which you trust and why.\n- If you cannot source a claim, either drop it or mark it UNVERIFIED. Never fill a gap with something plausible.\n- End with: the three questions this brief could not answer, and the specific document or filing that would answer each." },
      { title:"The fact-check pass", use:"Check a piece of text you did not write.",
        needs:"Web access helps; works without it for internal consistency.",
        why:"Models are better critics than authors. Given text and a checking job, they find real errors — especially numbers that contradict each other.",
        text:"Fact-check the text below. Do not rewrite it.\n\nFor each factual claim, output: CLAIM | VERDICT (supported / unsupported / wrong / unverifiable) | what you checked it against.\n\nPay specific attention to: numbers that contradict other numbers in the same text, dates, attributed quotes, causal claims ('X caused Y') that are really just correlation, and anything stated with more certainty than its evidence supports.\n\nTEXT:\n<PASTE>" },
      { title:"What am I not asking?", use:"Escape the limits of your own question.",
        needs:"Any model.",
        why:"The costliest gaps in a decision are the questions you did not know existed. This asks for them directly.",
        text:"I am trying to <GOAL>. Here is what I currently know and believe: <BRAIN DUMP>.\n\nWhat am I not asking that I should be? Give me:\n- Five questions someone experienced in this would ask that I have not.\n- For each: why it matters, and roughly what a good answer looks like.\n- Which one to answer first, and why that one." }
    ]},

  { cat:"Write like yourself", id:"writing", icon:"✎",
    desc:"Drafting, editing and shaping text without ending up with the same beige voice everyone else has.",
    items:[
      { title:"Edit without smoothing my voice away", use:"Improve your writing while keeping it yours.",
        needs:"Any model.",
        why:"Unconstrained editing regresses everything to a corporate mean. Naming what must not change is what preserves the writer.",
        text:"Edit the text below for clarity and flow.\n\nHARD RULES:\n- Keep my voice, my word choices, my rhythm. Do not make it more formal or more polished.\n- Do not add transitions I did not write, and do not smooth out short sentences.\n- If a sentence has a real problem, tell me what is wrong with it BEFORE you change it.\n- Do not use: delve, leverage, robust, seamless, unlock, dive into, it's worth noting, at the end of the day. No em dashes.\n\nOutput the edit, then a short list of what you changed and why.\n\nTEXT:\n<PASTE>" },
      { title:"Learn my style from samples", use:"Get drafts that sound like you from the start.",
        needs:"A model with a decent context window.",
        why:"Style transfer works far better from examples than from adjectives. Three real samples beat any description of your 'tone'.",
        text:"Here are three things I wrote:\n\n<SAMPLE 1>\n---\n<SAMPLE 2>\n---\n<SAMPLE 3>\n\nFirst, describe my style back to me: sentence length and variation, how I open and close, punctuation habits, words I reach for, words I avoid, how formal I am, how I handle uncertainty.\n\nThen write <NEW PIECE> in that style. Afterwards, point out any place you were unsure whether something was my style or just your default." },
      { title:"The ruthless cut", use:"Make something shorter without gutting it.",
        needs:"Any model.",
        why:"Asking for 'shorter' gets summary. Asking for a specific cut with the argument preserved gets editing.",
        text:"Cut this to <TARGET LENGTH> without losing the argument or the voice.\n\nRules:\n- Delete rather than compress. Whole sentences and paragraphs, not clever paraphrase.\n- Preserve every load-bearing fact, number and caveat.\n- Show me the cut version, then list what you removed and the one thing you were least sure about removing.\n\nTEXT:\n<PASTE>" }
    ]},

  { cat:"Build and code", id:"code", icon:"⌨",
    desc:"For coding agents and assistants: the framing that gets working software instead of confident snippets.",
    items:[
      { title:"Understand before you change", use:"Start any change in an unfamiliar codebase.",
        needs:"A coding agent with file access (Claude Code, Cursor, Copilot agent).",
        why:"Most bad AI code changes come from acting before mapping. Forcing a read-only pass first prevents the confident wrong edit.",
        text:"Do NOT change any code yet.\n\nFirst, map what I am about to touch:\n1. Which files are involved in <FEATURE / BUG>, and what each one is responsible for.\n2. How data flows through them, in order.\n3. What else reads or writes the same state — everything my change could break.\n4. The existing conventions in this area (naming, error handling, testing) that my change should match.\n\nThen propose the change in plain English, including what you would test to prove it works. I will approve before you write anything." },
      { title:"Fix the cause, not the symptom", use:"Debugging, without whack-a-mole.",
        needs:"Any model; agents can run the repro.",
        why:"Handed an error, models patch the line that threw. Requiring a stated root cause first is what turns a patch into a fix.",
        text:"Here is the failure: <ERROR / BEHAVIOUR>. Here is the relevant code: <CODE OR FILE>.\n\nBefore proposing any fix:\n1. State the root cause in one sentence. If you are not sure, say what you would need to see to be sure.\n2. Say why the code was written this way — what it was trying to do.\n3. Name every OTHER place in this codebase where the same mistake could exist.\n\nThen propose the smallest correct fix, plus the test that would have caught this. If your fix only handles the symptom, say so explicitly." },
      { title:"Review it like you'll be blamed for it", use:"A real code review, not a compliment.",
        needs:"Any model.",
        why:"Default reviews are polite. Naming the specific failure classes to hunt gets specific findings.",
        text:"Review this code as if you will be on call for it.\n\nHunt specifically for: unguarded field access on data you did not create, error paths that silently swallow failures, assumptions about input shape, race conditions, anything that breaks when a value is missing or empty, and anything a future maintainer will misread.\n\nFor each finding: severity, the concrete input that triggers it, and the fix. Do not comment on style. Do not open with what's good.\n\nCODE:\n<PASTE>" }
    ]},

  { cat:"Agents and automation", id:"agents", icon:"⚙",
    desc:"Prompts for systems that run without you watching — where a vague instruction becomes an expensive mistake at 3am.",
    items:[
      { title:"The unattended-run contract", use:"Give an autonomous agent its standing orders.",
        needs:"An agent framework or a scheduled coding agent.",
        why:"Autonomous runs fail on ambiguity. Stating what to do when uncertain — stop, report, never fabricate — is the difference between a system that degrades safely and one that invents.",
        text:"You are running unattended. No one will answer a question, so these are your standing orders:\n\n1. Do exactly <TASK>, then stop. Do not expand scope.\n2. If you cannot verify something, DO NOT fill the gap with a plausible value. Leave it blank and report it.\n3. If a check fails, fix what it found. Never disable, edit or work around the check.\n4. Before finishing: re-run every verification and report the result honestly, including anything you could not complete and why.\n5. An unfinished task reported accurately is worth more to me than a finished-looking one that isn't.\n\nReport format: what changed, what you verified, what you could not do, what you would do next." },
      { title:"Turn a task into a repeatable procedure", use:"Stop re-explaining the same job every time.",
        needs:"Any model.",
        why:"The bottleneck in automation is usually the undocumented judgment inside a task. This extracts it.",
        text:"I do this task regularly: <DESCRIBE IT, INCLUDING A REAL RECENT EXAMPLE>.\n\nWrite it as a procedure another person — or an agent — could follow without asking me anything:\n- Inputs required, and where each comes from.\n- Steps in order, with the decision rule at each branch (not 'use judgment' — the actual rule I am applying).\n- What 'done and correct' looks like, checkable.\n- The three ways this most commonly goes wrong, and what to do about each.\n\nWhere my example implies a rule I did not state, name it and ask me to confirm." },
      { title:"Design the check, not just the fix", use:"Make a fix permanent.",
        needs:"Any model.",
        why:"Every recurring bug is a missing check. This converts an incident into an invariant — the only way a system actually learns.",
        text:"We just fixed this problem: <WHAT BROKE AND WHAT WE CHANGED>.\n\nNow make it permanent:\n1. Where else in this system could the same class of mistake exist right now? Be specific.\n2. What automated check would have caught it BEFORE it reached a user — a test, a linter rule, a CI step, a schema constraint?\n3. Write that check.\n4. Prove it works by describing exactly how it fails when the old bug is reintroduced.\n\nA fix with no check behind it is not finished." }
    ]},

  { cat:"Learn and decide with data", id:"data", icon:"▤",
    desc:"Reading a document, a dataset or a market without letting the model's confidence do your thinking.",
    items:[
      { title:"Interrogate a long document", use:"Contracts, filings, reports, papers.",
        needs:"A model with long context; attach the file.",
        why:"Summaries of long documents lose exactly the parts that matter. Asking for obligations, risks and omissions extracts what a summary flattens.",
        text:"Read the attached <DOCUMENT>. I care about <WHAT YOU ACTUALLY NEED FROM IT>.\n\nGive me:\n1. What it commits each party to — obligations, deadlines, amounts, with the section number for each.\n2. Anything unusual compared to a standard document of this type.\n3. The parts that would cost me most if I misread them.\n4. What it conspicuously does NOT say that a document like this usually does.\n\nQuote exactly for anything load-bearing. If a section is ambiguous, say so rather than resolving it for me." },
      { title:"Explain this chart / number honestly", use:"Sanity-check a statistic before repeating it.",
        needs:"Any model; vision for images.",
        why:"Most misleading numbers are technically true. This asks for the framing, not the value.",
        text:"Here is a figure I am about to rely on: <NUMBER / CHART / CLAIM, WITH SOURCE>.\n\n- What exactly does it measure, and what does it exclude?\n- What is the denominator, and is it the right one?\n- Who produced it, and what would they want it to show?\n- What would the same underlying reality look like if presented by someone with the opposite interest?\n- Is there a materially different number for the same thing from another source?\n\nThen: is it safe for me to repeat this in public, as stated? If not, how should I state it?" }
    ]}
];
