// RTFCLMGZN — Guides (window.RTFC_GUIDES). Hands-on, instructional pieces.
//
// STRICT JSON, deliberately. This file used to be hand-authored JS object-literal
// syntax (unquoted keys). json.loads could not read it, so
// newsroom/quality/component_audit.py skipped the entire file with a notice --
// which meant the guides were the only published body data on this site that
// nothing ever checked: not the schema, not the component floor, not the
// no-top-level-text invariant. Everything between the brackets below is now
// parseable by JSON.parse and by Python's json module, and the audit reads it.
//
// format:"guide" is a real format tier, not section:"Guide" wearing a synthesis
// label. It carries a floor of 2 components AND a hard rule: a guide with no
// procedure block fails the audit, because a guide must end in the reader having
// DONE something rather than merely understood it.
//
// The old top-level `steps` field is gone. It rendered after the prose but was
// invisible to wordCount(), readTime(), trueFormat(), rtfcListen() and the
// schema -- a 91-word guide carrying 237 words of steps advertised a "Brief"
// pill and a 1-minute read. Those steps are now procedure blocks inside body,
// where every one of those systems can see them.

window.RTFC_GUIDES = [
  {
    "id": "g1",
    "slug": "brief-an-ai-like-a-pro",
    "image": "assets/img/g1.jpg",
    "title": "The Brief Method: how to ask an AI for something and actually get it",
    "dek": "The single highest-leverage AI skill isn't prompting tricks — it's writing a brief the way good managers delegate. Five minutes to learn, immediately useful, works on every model.",
    "persona": "nova-reyes",
    "section": "Guide",
    "format": "guide",
    "publishedAt": "2026-07-10T11:00:00Z",
    "readMins": 4,
    "sample": false,
    "disclaimer": "none",
    "tldr": [
      "The highest-leverage AI skill is briefing like a manager, not prompting tricks.",
      "Give a role, state one job, add the two or three facts only you know.",
      "Set constraints — length, format, what to avoid. Constraints aim the model.",
      "End by asking the model what it needs to know before it drafts anything.",
      "This is a working method, not a tested finding — we link no study, because there isn't one."
    ],
    "body": [
      {
        "type": "p",
        "text": "A brilliant marketer I know told me she'd 'tried AI and it wasn't good.' Her prompt had been four words: **'write a launch email.'** What came back opened with 'We're thrilled to announce' and closed with 'Don't miss out' — competent, weightless, and about a product it plainly knew nothing about. We spent ninety seconds rewriting the request the way she would brief a new hire: who to be, what the job was, who it was for, what 'done' looked like, and one line inviting it to ask her questions first. It asked two. Her answers were the parts of the pitch she had never written down anywhere. The draft that followed opened on the thing freelancers actually hate about tracking expenses. Nothing about the model changed. The brief did.",
        "citation_urls": []
      },
      {
        "type": "snippet",
        "snippet": {
          "kicker": "COPY THIS",
          "title": "The five-line brief",
          "lang": "prompt",
          "body": "You're an experienced email marketer for indie software.\nWrite a launch email for our new budgeting app.\nAudience: {{AUDIENCE}}. Hook: {{HOOK}}. Tone: friendly, not corporate.\nUnder 150 words, one call-to-action, no exclamation marks.\nAsk me up to three questions before you start if anything's unclear.",
          "fill": [
            {
              "token": "{{AUDIENCE}}",
              "means": "who is actually reading this",
              "example": "freelancers who hate spreadsheets"
            },
            {
              "token": "{{HOOK}}",
              "means": "the one thing your thing does that the alternatives don't",
              "example": "it categorises expenses automatically"
            }
          ],
          "expects": "It replies with one to three questions and no draft.",
          "note": "Swap the first two lines for your own role and job and the skeleton carries over to any task. If it drafts anyway, reply 'Do not draft yet — ask your questions first' and don't read the draft it already produced."
        }
      },
      {
        "type": "p",
        "text": "Four of those five lines are the ones everybody works out eventually on their own. The fifth is the one almost nobody writes, and it does the most work. Asking a model what it needs to know before it starts costs you a single exchange and buys you the gap analysis you were never going to run on yourself. Half the time its questions **are** the brief: you find out what you actually wanted by answering them, which is exactly what happens when you hand a job to a competent person and they push back before touching it.",
        "citation_urls": []
      },
      {
        "type": "procedure",
        "procedure": {
          "kicker": "DO IT",
          "title": "Write the brief, line by line",
          "sub": "By the end you'll have a request that gets a usable answer on the first try — on any model, for any task.",
          "est": "5 min",
          "level": "Beginner",
          "track": true,
          "prereqs": [
            "Any chat model. The method is deliberately model-independent.",
            "One request you would otherwise have typed as a single line."
          ],
          "steps": [
            {
              "do": "Give the AI a role.",
              "detail": "Open by telling it who to be. That one line sets the vocabulary, the judgment and the standards for everything that follows.",
              "verify": "Your first line names an occupation and a context, not an adjective. 'An experienced email marketer for indie software' passes; 'a great writer' does not.",
              "ifnot": "If you can't name the role, name the person whose version of this you'd trust, and describe their job instead of their name."
            },
            {
              "do": "State the job in one sentence.",
              "detail": "One request, one outcome. If you need two things, that's two briefs.",
              "verify": "Your sentence has one verb and no 'and' joining two deliverables.",
              "ifnot": "There's an 'and' in it. Split it, and run the second brief only after the first one has landed."
            },
            {
              "do": "Add the two or three facts that make it yours.",
              "detail": "Audience, hook, tone. This is where generic becomes specific, and it's the only part of the brief nobody else could have written.",
              "verify": "Every fact you added is one the model could not have guessed from the job sentence alone.",
              "ifnot": "If they're all guessable you've restated the job, not added context. Ask what you know about this that a stranger wouldn't."
            },
            {
              "do": "Set the constraints — define what 'done' looks like.",
              "detail": "Length, format, and what to avoid. Constraints don't limit the model; they aim it.",
              "verify": "A stranger reading your constraints could tell whether a finished draft met them without asking you anything.",
              "ifnot": "Your constraints are adjectives. Replace 'short' with a word count and 'punchy' with a banned-words list."
            },
            {
              "do": "End with the ask-back line.",
              "hi": true,
              "detail": "'Ask me up to three questions before you start if anything's unclear.' This is the line almost nobody uses and everybody should.",
              "why": "It makes the model surface the gaps in your thinking before it spends a draft on them.",
              "verify": "What comes back is questions, not prose.",
              "ifnot": "It drafted anyway. Reply 'Do not draft yet — ask your questions first', and don't read the draft it already produced: reading it anchors you to it."
            },
            {
              "do": "React to the first draft instead of judging it.",
              "detail": "Steer in fragments — 'warmer', 'half as long', 'the second paragraph is the real opening, start there.'",
              "est": "5 sec each",
              "verify": "Your reaction names a direction, not a verdict.",
              "ifnot": "If your reaction is 'this is bad', you've given it nothing to act on. Name the single thing you'd change first and send only that."
            }
          ]
        }
      },
      {
        "type": "p",
        "text": "The other half of the skill is refusing to treat the first draft as a verdict on the tool. A draft is a probe. React to it in fragments and each reaction costs about five seconds and lands closer than the one before, because you're steering with the destination in view instead of guessing at it from the driveway. Three rounds of that beats an hour spent engineering a perfect opening prompt, and it beats it on wall-clock time as well as on the result. The people who find these tools disappointing are almost always the people who read draft one, decided, and closed the tab.",
        "citation_urls": []
      },
      {
        "type": "pitfalls",
        "pitfalls": {
          "kicker": "WHAT GOES WRONG",
          "title": "The four ways a brief fails",
          "items": [
            {
              "mistake": "Opening with the task instead of a role.",
              "looks": "Correct, generic output that would suit any company in your industry equally well.",
              "why": "With no role to narrow it, the model averages every register it has ever seen attached to that task.",
              "fix": "Add one line naming an occupation and a context before the request.",
              "cost": "medium"
            },
            {
              "mistake": "Two jobs in one brief.",
              "looks": "Both halves are present and both are thin.",
              "why": "Constraints written for one outcome get spread across two, so neither gets the full length or the full attention.",
              "fix": "Split at the 'and'. Run the second brief once the first is settled.",
              "cost": "medium"
            },
            {
              "mistake": "Constraints written as adjectives.",
              "looks": "A draft you keep sending back without being able to say why.",
              "why": "'Punchy' and 'professional' aren't checkable. The model can't aim at them, and neither can you.",
              "fix": "Convert every adjective into a number, a format, or a banned list.",
              "cost": "high"
            },
            {
              "mistake": "Reading the first draft before the model has asked its questions.",
              "looks": "You accept something that answers a question you hadn't finished asking.",
              "why": "The draft becomes the anchor, and every later reaction is an edit of it rather than a rethink of the request.",
              "fix": "If it drafts before asking, don't read it. Repeat the ask-back line once, then read what comes back.",
              "cost": "high"
            }
          ]
        }
      },
      {
        "type": "p",
        "text": "Two honest limits before you go and use this. It's a working method, not a tested finding: it comes out of daily use across the models this publication covers, and the effect size is not established — we link no study here because there isn't one we can point you at that tested this specific skeleton. And no brief rescues a job that is really two jobs; if your request has an 'and' in the middle, split it or accept two mediocre halves. What the method does do, reliably, is remove the most common reason people conclude that AI 'isn't good'. They asked for something generic. Generic is precisely what these systems are best at producing on demand.",
        "citation_urls": []
      }
    ],
    "apply": [
      {
        "label": "Save the five lines somewhere you'll actually use them.",
        "text": "Role · Job · Context · Constraints · Ask-back. Put the skeleton in a note or a text shortcut. The friction of remembering is what kills good habits."
      },
      {
        "label": "Re-run your last disappointing AI request through the method.",
        "text": "Take the most recent time an AI let you down, rewrite it as a five-line brief, and compare. That side-by-side is the fastest way to convince yourself — and it takes two minutes."
      },
      {
        "label": "Add the ask-back line to something today.",
        "text": "It is one sentence, it costs one exchange, and it is the step people skip. Use it on the next request you make and read the questions before you read anything else."
      },
      {
        "label": "Teach it to one person this week.",
        "text": "The 'ask me questions first' line alone will change how someone you know uses these tools. Be the friend who fixed AI for them."
      }
    ],
    "sources": [
      {
        "label": "RTFCLMGZN masthead — the editorial personas and how this newsroom works",
        "url": "#/masthead"
      }
    ],
    "corrections": []
  },
  {
    "id": "g2",
    "slug": "catch-an-ai-making-things-up",
    "image": "assets/img/g2.jpg",
    "title": "The confident wrong answer: how to catch an AI making things up",
    "dek": "AI's most dangerous failure isn't being wrong — it's being wrong in a fluent, confident, plausible voice. Here's the working newsroom's toolkit for catching it, in about the time it takes to read this.",
    "persona": "sage-okafor",
    "section": "Guide",
    "format": "guide",
    "publishedAt": "2026-07-11T09:00:00Z",
    "readMins": 7,
    "sample": false,
    "disclaimer": "none",
    "tldr": [
      "Models are trained to be plausible, not true — fluency is not accuracy.",
      "Bluffs cluster on specifics: numbers, quotes, names, citations, dates, recent events.",
      "Thirty-second check: is it load-bearing, is there an openable source, ask how it knows.",
      "Bluffing models hedge and walk claims back when challenged — that reversal is the tell.",
      "No check is a guarantee: this catches sloppy invention, not a wrong answer that survives questioning."
    ],
    "body": [
      {
        "type": "p",
        "text": "Here is the failure mode that should worry you, and it isn't the one in the movies. A lawyer in a widely reported 2023 US federal case filed a brief citing six court decisions that supported his argument perfectly. They were exactly on point. They were also entirely invented — an AI had produced them, complete with plausible case names, plausible citations and plausible judges, and the lawyer had trusted them because they read exactly like real law. The problem was never that the model was wrong. The problem was how good it was at being wrong.",
        "citation_urls": []
      },
      {
        "type": "p",
        "text": "That's the whole thing you need to internalise about these tools: a language model is trained to produce text that is *plausible*, not text that is *true*. Most of the time plausible and true overlap, which is why the tools are useful. The skill — the one that separates people who get burned from people who don't — is knowing exactly where that overlap breaks, and having a thirty-second habit for the moments that matter.",
        "citation_urls": []
      },
      {
        "type": "h2",
        "text": "Where models bluff (it's predictable)",
        "citation_urls": []
      },
      {
        "type": "p",
        "text": "Hallucination isn't random. It clusters, and once you know where, you can aim your skepticism instead of spreading it evenly over everything and exhausting yourself. The pattern underneath every cluster is the same: the model is reaching for a ==specific fact it may not actually hold==, so it generates the shape of a right answer instead. The fluency stays perfect even when the facts underneath have quietly evaporated. Here is the map, in the order you'll meet them.",
        "citation_urls": []
      },
      {
        "type": "keyfacts",
        "keyfacts": {
          "kicker": "AIM HERE",
          "title": "Where to point your skepticism first",
          "items": [
            {
              "label": "Citations and sources",
              "value": "Treat as fabricated until opened",
              "note": "The single most common and most damaging invention. A reference that reads perfectly is the easiest thing in the world to generate."
            },
            {
              "label": "Numbers and statistics",
              "value": "Verify before forwarding",
              "note": "A precise-looking figure is exactly what the model produces when it doesn't have one."
            },
            {
              "label": "Direct quotes",
              "value": "Verify wording and speaker",
              "note": "Plausible phrasing attributed to a real person is the shape most likely to survive unchallenged."
            },
            {
              "label": "Names paired with claims",
              "value": "Verify the pairing, not just the name",
              "note": "The person is often real and the thing attributed to them is not."
            },
            {
              "label": "Dates and sequences",
              "value": "Check against a primary record",
              "note": "Ordering errors read as harmlessly as they read confidently."
            },
            {
              "label": "Legal and medical specifics",
              "value": "Never act on unverified",
              "note": "The domain where a plausible wrong answer costs the most."
            },
            {
              "label": "Recent or genuinely obscure",
              "value": "Assume thin coverage",
              "note": "Where training data is sparse, the model fills the gap rather than reporting the gap."
            }
          ]
        }
      },
      {
        "type": "p",
        "text": "Read that list the other way round and it tells you where these tools are safest: vague, general, widely repeated knowledge. Ask a model what a balance sheet is and it will be reliable, because the answer is written in ten thousand places and the model has genuinely absorbed the shape of it. Ask it what a specific company's balance sheet said in a specific quarter and you have moved into the territory where the answer either exists precisely in its weights or gets manufactured to fit the sentence. Sharp and checkable is where models invent. That is not a defect you can prompt your way out of; it is what the training objective produces, and it is why the habit below matters more than any clever wording.",
        "citation_urls": []
      },
      {
        "type": "quote",
        "text": "Fluency is not accuracy. The model's confidence is a property of its writing style, not its knowledge — never read one as evidence of the other.",
        "citation_urls": []
      },
      {
        "type": "h2",
        "text": "The thirty-second check",
        "citation_urls": []
      },
      {
        "type": "p",
        "text": "You don't need to fact-check everything; that would defeat the point of using the tool at all. You need to check the things that would *matter if they were wrong*, and you need the check to be short enough that you actually run it. Three questions do it, in this order, and the order matters — the first one is a filter that saves you from running the other two on things that don't deserve them.",
        "citation_urls": []
      },
      {
        "type": "procedure",
        "procedure": {
          "kicker": "DO IT",
          "title": "The thirty-second check",
          "sub": "Run this on the one sentence that would hurt if it were false — not on the whole answer.",
          "est": "30 sec",
          "level": "Beginner",
          "track": true,
          "prereqs": [
            "An AI answer you're about to forward, publish, or act on."
          ],
          "steps": [
            {
              "do": "Find the load-bearing sentence.",
              "detail": "Read the answer once and ask which single claim would cause real damage if it turned out to be invented — a number, a name, a citation, a date.",
              "verify": "You can point at one sentence. Not three, not the whole answer.",
              "ifnot": "If nothing in it would matter, stop here. You're brainstorming taglines and the check is a waste of your time. This is the step that makes the habit sustainable."
            },
            {
              "do": "Ask whether it gave you a source you can actually open.",
              "detail": "Not 'a study found' or 'according to industry data' — an actual link or a reference specific enough to look up.",
              "verify": "You have something clickable or searchable that names a document, not a category.",
              "ifnot": "No openable source means the claim is unverified, full stop. Ask for one explicitly before you go any further."
            },
            {
              "do": "Ask the model how it knows.",
              "hi": true,
              "detail": "The move almost nobody makes. Ask for the source of the figure, the confidence level, and what would make it wrong.",
              "why": "A model with real grounding gets more specific under pressure. A model that was bluffing gets vaguer. The direction it moves is the answer.",
              "verify": "The follow-up is more precise than the original — a narrower date, a named document, a stated limitation.",
              "ifnot": "It hedged, softened, or quietly walked the claim back. That reversal is the tell. Treat the original claim as unverified and go to the source yourself."
            },
            {
              "do": "Open the source before you use the claim.",
              "detail": "The click takes ten seconds. Invented references dissolve the moment you look at them; real ones survive.",
              "verify": "The document exists, and it says the thing it was cited for.",
              "ifnot": "The link 404s, or it resolves but doesn't contain the claim. Both are the same result: the claim is not supported and does not go out."
            }
          ]
        }
      },
      {
        "type": "p",
        "text": "Step three is the one worth practising, because it is the one that generalises. You are not asking the model to be honest — it has no access to whether it is being honest. You are applying pressure and watching which way the text moves. Grounded answers get narrower under questioning: a range becomes a figure, a vague attribution becomes a document, a claim acquires a stated limitation. Bluffed answers get wider: the specific becomes the general, the assertion becomes a hedge, and somewhere in the third sentence of the reply the original claim quietly stops being made at all. Once you have seen that reversal twice you will recognise it instantly, and it costs one message to trigger.",
        "citation_urls": []
      },
      {
        "type": "snippet",
        "snippet": {
          "kicker": "COPY THIS",
          "title": "The challenge prompt",
          "lang": "prompt",
          "body": "For this specific claim — {{CLAIM}} —\nanswer these three separately and do not restate the claim:\n1. What is your source? Name the document, not the category.\n2. How confident are you, and on what basis?\n3. What specific evidence would show this is wrong?",
          "fill": [
            {
              "token": "{{CLAIM}}",
              "means": "paste the exact sentence you're checking, not a summary of it",
              "example": "the figure you gave for last quarter's revenue"
            }
          ],
          "expects": "A grounded model names a document and states a limitation. A bluffing model produces three paragraphs that never name anything.",
          "note": "Paste the claim verbatim. Summarising it gives the model room to answer about the summary instead."
        }
      },
      {
        "type": "p",
        "text": "It helps to know what you're looking for before you go looking, because both replies are fluent and both are polite, and on a fast read they feel similar. They aren't. The difference shows up in what the reply *contains*, not in how confident it sounds, and that is the whole trick: you're reading for named objects — documents, dates, numbers, stated limits — rather than for tone. The table below is what a decade of this looks like compressed into five rows, and it is worth reading once before you need it rather than in the moment you do.",
        "citation_urls": []
      },
      {
        "type": "compare",
        "compare": {
          "kicker": "READ THE REPLY",
          "title": "What each kind of answer does under pressure",
          "columns": [
            {
              "label": "Grounded",
              "sub": "it has the fact",
              "hi": true
            },
            {
              "label": "Bluffing",
              "sub": "it has the shape of the fact"
            }
          ],
          "rows": [
            {
              "label": "Asked for its source",
              "values": [
                "Names a specific document, section, or page",
                "Names a category — 'industry reports', 'studies'"
              ]
            },
            {
              "label": "Asked for its confidence",
              "values": [
                "States a level and what it depends on",
                "Restates the claim more emphatically"
              ]
            },
            {
              "label": "Challenged directly",
              "values": [
                "Holds the claim and explains the basis",
                "Softens, qualifies, or apologises and moves on"
              ],
              "note": "the reversal is the single most reliable tell"
            },
            {
              "label": "Asked what would make it wrong",
              "values": [
                "Names checkable disconfirming evidence",
                "Offers a generic caution about verifying things"
              ]
            },
            {
              "label": "Asked the same question again, fresh",
              "values": [
                "Same specifics",
                "Different specifics"
              ],
              "note": "a fabricated detail rarely regenerates identically"
            }
          ]
        }
      },
      {
        "type": "h2",
        "text": "Two habits that make it automatic",
        "citation_urls": []
      },
      {
        "type": "p",
        "text": "First, **demand sources for anything factual and then actually open one.** The single most common mistake isn't trusting AI — it's trusting AI that provided a link nobody clicked. Real citations are checkable; invented ones dissolve the moment you look. Second, for anything genuinely important, **ask a second, different model the same question** and watch where they disagree. Agreement isn't proof, but disagreement is a bright flare pointing exactly at the sentence you need to verify yourself. This is, more or less, how our own newsroom's Verification Agent works: nothing precise ships unless it's confirmed against a primary source, and any figure that lives in only one place gets labeled or cut. You can run the same discipline in your own head for free.",
        "citation_urls": []
      },
      {
        "type": "pitfalls",
        "pitfalls": {
          "kicker": "WHAT GOES WRONG",
          "title": "Five ways the check gets skipped",
          "items": [
            {
              "mistake": "Trusting a link nobody clicked.",
              "looks": "A well-cited answer that falls apart the first time somebody opens a reference.",
              "why": "A citation is a formatting pattern. Producing one that looks correct is easier than producing a fact.",
              "fix": "Open one source per answer, minimum. Pick the one carrying the most weight.",
              "cost": "high"
            },
            {
              "mistake": "Checking the link resolves, not what it says.",
              "looks": "A real URL to a real document that doesn't contain the claim it was cited for.",
              "why": "A model reaching for a plausible citation reaches for real-sounding documents, and sometimes lands on real ones.",
              "fix": "Search the page for the specific claim, not for the topic.",
              "cost": "high"
            },
            {
              "mistake": "Treating agreement between two models as proof.",
              "looks": "Two systems confidently telling you the same wrong thing.",
              "why": "Models trained on overlapping data share the same gaps and often the same plausible fillers for them.",
              "fix": "Use disagreement as a detector and agreement as nothing at all. Where they agree, verify anyway if it's load-bearing.",
              "cost": "medium"
            },
            {
              "mistake": "Verifying the number and not the attribution.",
              "looks": "A real figure credited to the wrong company, study, or year.",
              "why": "The number was in the training data; the pairing was generated to fit your sentence.",
              "fix": "Check the subject and the date with the same care as the digits.",
              "cost": "medium"
            },
            {
              "mistake": "Trying to check everything.",
              "looks": "You abandon the habit within a week and go back to checking nothing.",
              "why": "An unbounded check has no stopping rule, so it competes with the reason you used the tool.",
              "fix": "One load-bearing sentence per answer. That is the whole budget, and it is enough.",
              "cost": "medium"
            }
          ]
        }
      },
      {
        "type": "h2",
        "text": "What this does not protect you from",
        "citation_urls": []
      },
      {
        "type": "p",
        "text": "Be clear about the ceiling here, because a check you over-trust is worse than no check at all. This habit catches sloppy invention — the fabricated citation, the too-round number, the quote nobody said. It does not catch a wrong answer that is confidently wrong in a way that happens to survive one round of questioning, and it does not catch an error in reasoning that is built on facts which are each individually true. It also does nothing about omission: a model that leaves out the one consideration that changes your decision has not hallucinated anything, and no amount of asking it for sources will surface what it never mentioned. Those failures remain unverified by anything in this guide, and the honest answer is that catching them requires knowing the subject yourself.",
        "citation_urls": []
      },
      {
        "type": "p",
        "text": "One more piece of housekeeping, in the spirit of the thing. This guide links no external source for the court case in its opening, because we do not have a primary document in front of us to point you at, and a guide about fabricated citations is the last place on earth to attach a citation we have not personally opened. It was widely reported at the time and it is easily found; treat the detail as reported rather than as verified here, and apply step four of the check to it exactly as you would to anything else. The two references below are internal pages, labelled as such, and neither is offered as evidence for that case.",
        "citation_urls": []
      },
      {
        "type": "p",
        "text": "None of this makes AI less useful. It makes it *safe* to use for the things that matter — which is the only way to actually rely on it. The habit is small on purpose: one sentence per answer, three questions, one click. It survives contact with a busy week, which is the only property that matters in a habit, and it scales down gracefully — on a day when you have thirty seconds you still run step one, and step one alone catches the worst of it. The people who get value from these tools long-term aren't the ones who trust them most or least. They're the ones who know precisely which sentence to double-check, and never skip it.",
        "citation_urls": []
      }
    ],
    "apply": [
      {
        "label": "Adopt the load-bearing rule.",
        "text": "Before you forward, publish, or act on anything an AI told you, find the one fact in it that would matter most if it were false — a number, a name, a citation — and verify just that. You don't need to check everything; you need to check the thing that would hurt."
      },
      {
        "label": "Make 'how do you know?' a reflex.",
        "text": "When a model gives you a confident specific, ask it for its source and its confidence. Watch whether it gets more precise (grounded) or starts hedging (bluffing). The direction it moves is your answer."
      },
      {
        "label": "Never trust an uncited citation, ever.",
        "text": "If an AI cites a study, case, article, or statistic, treat it as fabricated until you've opened the actual source. Invented references are the single most common — and most damaging — hallucination. The click takes ten seconds; the retraction takes a reputation."
      },
      {
        "label": "Cross-examine with a second model on the big stuff.",
        "text": "For anything high-stakes, ask the same question of a different AI. Where they agree, relax slightly; where they diverge, you've found the exact claim to verify yourself. Disagreement is a free hallucination detector."
      }
    ],
    "sources": [
      {
        "label": "RTFCLMGZN masthead — how this newsroom's verification stage works",
        "url": "#/masthead"
      },
      {
        "label": "RTFCLMGZN corrections log — every error this publication has logged against itself",
        "url": "#/corrections"
      }
    ],
    "corrections": []
  },
  {
    "id": "g3",
    "slug": "which-ai-for-which-job",
    "image": "assets/img/g3.jpg",
    "title": "Right tool, right job: how to choose which AI to actually use",
    "dek": "New models drop every week and the leaderboards are mostly noise. The durable skill isn't knowing which model is 'best' — it's matching the job to the right class of tool. A framework that outlasts the next launch.",
    "persona": "jin-park",
    "section": "Guide",
    "format": "guide",
    "publishedAt": "2026-07-09T13:00:00Z",
    "readMins": 7,
    "sample": false,
    "disclaimer": "none",
    "tldr": [
      "There is no best model — name the job first, then pick the tool class.",
      "Cheap-fast for volume work, frontier for hard reasoning, local for private data.",
      "Our board: $2 to $50 per million output tokens, for a ten-point spread in score.",
      "The routine 90% runs fine on cheap tiers; escalate only the hard 10%.",
      "Prices and scores here are a snapshot, not a constant — they are not stable week to week."
    ],
    "body": [
      {
        "type": "p",
        "text": "Every week a new model launches, tops a benchmark, and sets off a round of 'is this the new best AI?' It's the wrong question, and chasing it will keep you permanently one launch behind. I spend my days looking at the hardware and economics underneath these systems, and from down there the truth is plain: there is no 'best model,' the same way there is no 'best vehicle.' A cargo ship and a motorcycle are both correct answers — to completely different questions. The skill that actually compounds is learning to name the job first, then reach for the class of tool built for it.",
        "citation_urls": []
      },
      {
        "type": "h2",
        "text": "Name the job, not the model",
        "citation_urls": []
      },
      {
        "type": "p",
        "text": "Almost every task you'd hand an AI falls into one of a few shapes, and each shape has a matching tool. The mistake isn't picking the wrong model; it's picking a model at all before you've said out loud what shape the work is. Do that first and the choice mostly makes itself — and it keeps making itself correctly after the current leaderboard has been replaced twice. The five branches below are the ones I actually use, in the order they come up. They are mutually exclusive on purpose: take the first that fits and stop reading, because a task that seems to match three of them is usually a task you haven't finished defining.",
        "citation_urls": []
      },
      {
        "type": "decide",
        "decide": {
          "kicker": "WHICH ONE",
          "title": "Name the shape, get the tool",
          "question": "What shape is the job? Take the first branch that fits — they're in the order you'll meet them.",
          "branches": [
            {
              "when": "It's fast, high-volume and low-stakes — summarising, reformatting, sorting, first-draft boilerplate.",
              "then": "Send it to a small, cheap, fast model and don't think about it again.",
              "because": "Using a flagship here is renting a freight truck to carry a sandwich. This is most of what you do.",
              "hi": true
            },
            {
              "when": "A wrong step ruins the answer — multi-step logic, tricky code, analysis you'll act on.",
              "then": "Send it to a frontier reasoning model and accept the wait and the price.",
              "because": "This is the small fraction of work where the capability gap is real and worth paying for."
            },
            {
              "when": "The input is enormous — a contract, a codebase, a book.",
              "then": "Pick for context window first and capability second.",
              "because": "A model that can't hold the document can't reason over it, however clever it is.",
              "warn": "Fitting the document in the window is not the same as it having read all of it. Ask for section-level answers with locations."
            },
            {
              "when": "It's code you intend to ship.",
              "then": "Use a coding-tuned model and read the diff yourself.",
              "because": "Coding-tuned models are measured on coding benchmarks for a reason, and the failure mode is silent."
            },
            {
              "when": "The data is genuinely private, regulated, or someone else's.",
              "then": "Run it on a model you control, or don't run it.",
              "because": "This branch overrides every other consideration, including which model would have been better at the task.",
              "warn": "Expect a real capability drop. Budget verification time you wouldn't have needed on a frontier model."
            }
          ]
        }
      },
      {
        "type": "p",
        "text": "That router is deliberately boring, and boring is the point. Every one of those branches has been true for two years and will be true for two more, because they describe the shape of work rather than the state of the market. Notice how little the question 'which model won this week' has to do with any of them: the private-data branch doesn't care, the long-document branch cares about one spec, and the high-volume branch cares mostly about price. Only one branch out of five is even about capability, and it is the branch you take least often.",
        "citation_urls": []
      },
      {
        "type": "quote",
        "text": "There's no best model, the same way there's no best vehicle. A cargo ship and a motorcycle are both right answers to different questions. Name the trip first.",
        "citation_urls": []
      },
      {
        "type": "h2",
        "text": "The tiers exist for a reason — use them",
        "citation_urls": []
      },
      {
        "type": "p",
        "text": "Here's the part my desk cares about most, and where the most money gets wasted. The big labs now sell *families*, not models — a flagship, a mid-tier and a budget tier — and the gap between the ends of the ladder is much larger than most people using them assume. Our own [Scoreboard](#/scoreboard) carries vendor list prices next to an independent capability score for each model, which makes the trade legible in a way a leaderboard ranking never does. Read the two columns together rather than sorting by either one, and the shape of the decision changes.",
        "citation_urls": []
      },
      {
        "type": "chart",
        "chart": {
          "kicker": "THE LADDER",
          "kind": "bar",
          "title": "Vendor list price, per million output tokens",
          "unit": "$/M out",
          "sub": "Published list prices for a representative high-capability mode, as carried on the RTFCLMGZN Scoreboard.",
          "source": "RTFCLMGZN Scoreboard, snapshot updated July 29, 2026; prices are vendor list prices, stored separately from the independent score.",
          "data": [
            {
              "label": "Claude Fable 5",
              "value": 50,
              "hi": true,
              "note": "current independent leader"
            },
            {
              "label": "GPT-5.6 Sol",
              "value": 25
            },
            {
              "label": "GPT-5.6 Terra",
              "value": 15
            },
            {
              "label": "GPT-5.6 Luna",
              "value": 6
            },
            {
              "label": "Gemini 3.5 Flash",
              "value": 2
            }
          ]
        }
      },
      {
        "type": "p",
        "text": "Now put the scores beside those prices, because the prices alone are only half the trade. Claude Fable 5 lists at $50 per million output tokens and scores 60 on the independent index our board tracks. GPT-5.6 Sol lists at $25 and scores 59. GPT-5.6 Terra lists at $15 and scores 55. GPT-5.6 Luna lists at $6 and scores 51. Gemini 3.5 Flash lists at $2 and scores 50. Read that ladder from the bottom: the entire distance from the cheapest model on the board to the most expensive one is ten points of measured capability and twenty-five times the price. GLM-5.2 sits at $2 as well, on the same 51 as Luna. The spread within a single family is smaller but still enormous — Sol and Luna are the same product line, and one costs about four times the other.",
        "citation_urls": []
      },
      {
        "type": "compare",
        "compare": {
          "kicker": "THE THREE TIERS",
          "title": "What each tier is actually for",
          "source": "Prices and scores from the RTFCLMGZN Scoreboard; the 'best at' and 'escalate when' rows are editorial judgment, not measurement.",
          "columns": [
            {
              "label": "Budget",
              "sub": "GPT-5.6 Luna, GLM-5.2, Gemini 3.5 Flash"
            },
            {
              "label": "Mid",
              "sub": "GPT-5.6 Terra, Claude Sonnet 5",
              "hi": true
            },
            {
              "label": "Flagship",
              "sub": "Claude Fable 5, GPT-5.6 Sol"
            }
          ],
          "rows": [
            {
              "label": "List price, per million output tokens",
              "values": [
                "$2",
                "$15",
                "$50"
              ]
            },
            {
              "label": "Independent index score",
              "values": [
                "51",
                "55",
                "60"
              ],
              "note": "ten points separates the ends of this table"
            },
            {
              "label": "Share of your actual work",
              "values": [
                "Most of it",
                "The awkward middle",
                "The hard tenth"
              ]
            },
            {
              "label": "Best at",
              "values": [
                "Summarising, sorting, reformatting, first drafts",
                "Real work you'll edit — code, analysis, long drafts",
                "Multi-step reasoning where a wrong step ruins the answer"
              ]
            },
            {
              "label": "Where it fails you",
              "values": [
                "Long chains of logic; it loses the thread and stays confident",
                "Genuinely novel problems with no near-neighbour",
                "Your budget, and your patience with the latency"
              ]
            },
            {
              "label": "Escalate when",
              "values": [
                "Output is wrong in a way you can name",
                "You've rewritten the same section twice",
                "Nothing above it to escalate to — verify by hand instead"
              ]
            }
          ]
        }
      },
      {
        "type": "h2",
        "text": "The branch that overrides the others",
        "citation_urls": []
      },
      {
        "type": "p",
        "text": "One row of that table deserves separating out, because it isn't a capability judgment at all and it gets made by accident more than any other. If the data is genuinely private, regulated, or belongs to someone who hasn't agreed to this, the tier question is moot: you run it somewhere you control or you don't run it. That branch overrides the score column, the price column and your deadline, and the reason people skip it is structural rather than careless — the capability question is interesting and the data question is boring, so attention goes to the interesting one. Make it the first question rather than the last. It takes about five seconds to answer and it is the only decision on this page that you cannot reverse afterwards.",
        "citation_urls": []
      },
      {
        "type": "h2",
        "text": "The habit: draft cheap, escalate hard",
        "citation_urls": []
      },
      {
        "type": "p",
        "text": "Here's the workflow that beats memorizing any leaderboard. Start a task on a fast, cheap model. If the output's good enough — and it will be, more often than you expect — you're done, for a fraction of the cost and the wait. If it visibly struggles, *then* escalate the same prompt to a frontier model. You'll quickly build an intuition for which of your own tasks need the heavy machinery and which never did. That intuition is durable in a way that 'which model is best this week' never will be: the launches will keep coming, the names will keep changing, and the job-to-tool mapping underneath will keep being the thing that actually matters.",
        "citation_urls": []
      },
      {
        "type": "procedure",
        "procedure": {
          "kicker": "DO IT",
          "title": "Sort your own work into tiers",
          "sub": "One pass over what you actually do, and a default that stops costing you money by accident.",
          "est": "10 min",
          "level": "Beginner",
          "track": true,
          "prereqs": [
            "Your last two weeks of AI use — scroll your own chat history rather than guessing.",
            "Access to at least one cheap model and one frontier model."
          ],
          "steps": [
            {
              "do": "List what you actually used AI for, from your history.",
              "detail": "Scroll back and write down the recurring jobs. Don't list what you meant to use it for.",
              "verify": "You have between five and fifteen recurring tasks, described as jobs rather than as topics.",
              "ifnot": "If you can't find them, you haven't used it enough to optimise yet. Come back in a fortnight."
            },
            {
              "do": "Tag each one against the router above.",
              "detail": "Volume, hard reasoning, long document, code, or private. Every task takes exactly one tag — the first that fits.",
              "verify": "Every task has one tag, and most of your list is tagged as volume work.",
              "ifnot": "If almost everything landed in hard reasoning, you're flattering your own work. Re-read the branch: it means a wrong step ruins the answer, not that the task feels important."
            },
            {
              "do": "Set your default to the cheap tier.",
              "hi": true,
              "detail": "Change the model you land on when you open a new chat. This single setting is the whole intervention.",
              "why": "Defaults decide almost everything. Most people never switch away from whatever the app opened on.",
              "verify": "Opening a new conversation puts you on the budget tier without you choosing it.",
              "ifnot": "If your tool won't let you set it, make the cheap model a separate pinned window and start there instead."
            },
            {
              "do": "Run your three most frequent tasks on the cheap tier for a week.",
              "detail": "Don't escalate pre-emptively. You are gathering evidence about your own work, not testing the model.",
              "est": "1 week",
              "verify": "You have specific, nameable failures — or you have none, which is the more common result.",
              "ifnot": "If you escalated out of nervousness rather than because the output failed, that's the habit this step exists to break. Start the week again."
            },
            {
              "do": "Write down what 'visibly struggles' means for your work.",
              "detail": "Turn it into a rule you could hand to someone else: a named failure, not a feeling.",
              "verify": "Your rule names an observable — 'invents API methods', 'loses the thread past three steps', 'ignores half the constraints' — and a colleague could apply it without you.",
              "ifnot": "If your rule is 'when it feels off', you'll escalate on mood and pay flagship prices for routine work. Watch for one more week and name the failure."
            },
            {
              "do": "Escalate only on that rule, and send the same prompt.",
              "detail": "Move the identical prompt up a tier. Changing the prompt and the model at once tells you nothing about either.",
              "verify": "The frontier model's output is better in the specific way your rule named.",
              "ifnot": "If it isn't better, the model was never the bottleneck. The brief was. Go and fix the request instead of paying more for the same one."
            }
          ]
        }
      },
      {
        "type": "p",
        "text": "The rule you write in step five is the real output of the whole exercise, and it's the part people skip. 'It feels off' is not a rule; it's a mood, and a mood escalates on the days you're anxious rather than on the days the work is hard. 'It invents library methods that don't exist' is a rule. 'It drops the third and fourth constraints when I give it more than two' is a rule. Both are things you can check in ten seconds and both are things a colleague could apply without asking you what you meant. Once you have two or three of those written down, tier selection stops being a judgment call you make forty times a day and becomes something closer to a reflex.",
        "citation_urls": []
      },
      {
        "type": "pitfalls",
        "pitfalls": {
          "kicker": "WHAT GOES WRONG",
          "title": "Five expensive habits",
          "items": [
            {
              "mistake": "Never changing the default model.",
              "looks": "A bill, or a wait, that is several times larger than the work required.",
              "why": "Whatever the app opens on becomes the model for everything, including the sorting and summarising that any tier handles.",
              "fix": "Change the default once. It is the highest-leverage thirty seconds in this guide.",
              "cost": "high"
            },
            {
              "mistake": "Escalating on feeling instead of on a named failure.",
              "looks": "Flagship prices on work the budget tier had already done correctly.",
              "why": "Without a written rule, escalation tracks your confidence rather than the model's output.",
              "fix": "Write the rule from step five and escalate only when it fires.",
              "cost": "high"
            },
            {
              "mistake": "Changing the prompt and the model at the same time.",
              "looks": "A better answer, and no idea which change produced it.",
              "why": "Two variables, one observation. You learn nothing you can reuse.",
              "fix": "Move the identical prompt up a tier first. Only rewrite it if the better model also fails.",
              "cost": "medium"
            },
            {
              "mistake": "Reading the leaderboard as a shopping list.",
              "looks": "Switching tools every few weeks and never getting fluent with any of them.",
              "why": "Index scores compress very different capabilities into one number, and the top of the table moves faster than your habits can.",
              "fix": "Pick one cheap and one frontier model, learn both properly, and re-check the board quarterly rather than weekly.",
              "cost": "medium"
            },
            {
              "mistake": "Sending private data to whichever model scored highest.",
              "looks": "A capability decision that quietly became a data decision.",
              "why": "The private branch of the router overrides the others, and it is the one people skip because the score column is more interesting.",
              "fix": "Check the data question before the capability question, every time. It is a shorter check.",
              "cost": "high"
            }
          ]
        }
      },
      {
        "type": "p",
        "text": "Two limits on everything above. The prices and scores are a snapshot — ours was updated July 29, 2026 — and the whole point of this beat is that they move; treat the ordering as current rather than permanent, and re-read the board rather than remembering it. And the independent score is a single aggregate over a set of benchmarks, which means it is a decent proxy for general capability and a poor proxy for your particular job. A model two points lower on the index can be plainly better at the specific thing you do all day. Several rows on our own board carry no score at all, because the only figures their vendors published were self-reported, and self-reported numbers are not established capability.",
        "citation_urls": []
      },
      {
        "type": "p",
        "text": "So use the ladder for what it's good for: sizing the trade, not settling it. Ten points of measured capability across twenty-five times the price tells you, unambiguously, that most work does not belong at the top of the board — and that is the decision worth getting right, because you make it dozens of times a day and it compounds quietly in both directions, in what you spend and in what you spend waiting. Which model sits in first place this month is the decision you make about twice a year, and it is the one everybody spends their attention on. Get the daily one right and the annual one stops mattering very much: you will already have a cheap default that handles the bulk of your work and a frontier model you know the shape of, and a new launch becomes a thing you evaluate on a quiet afternoon rather than a thing that resets your habits.",
        "citation_urls": []
      }
    ],
    "apply": [
      {
        "label": "Sort your recurring AI tasks into three buckets.",
        "text": "List what you use AI for, then tag each: cheap-tier (summarize, reformat, draft), flagship (hard reasoning, critical code, analysis), or local/private (anything sensitive). Most of your list is cheap-tier — that realization alone will save you money or time."
      },
      {
        "label": "Default to the cheap tier; escalate only on failure.",
        "text": "Start every task on a fast, inexpensive model. Only bump it up to a flagship when the output actually falls short. Reserve the expensive machinery for the hard 10%, not the routine 90%."
      },
      {
        "label": "Match the model to the shape, not the hype.",
        "text": "Long document → large-context model. Real code → coding-tuned model. Sensitive data → a model you control. Ignore this week's leaderboard winner and ask what shape your job is."
      },
      {
        "label": "Keep two models within reach.",
        "text": "Have a cheap workhorse and a frontier heavyweight both a click away, and get fluent at moving a prompt between them. The switching habit is worth more than loyalty to any single model."
      }
    ],
    "sources": [
      {
        "label": "Artificial Analysis — live LLM leaderboard (the independent index our Scoreboard tracks)",
        "url": "https://artificialanalysis.ai/leaderboards/models"
      },
      {
        "label": "RTFCLMGZN Scoreboard — vendor list prices beside independent scores",
        "url": "#/scoreboard"
      }
    ],
    "corrections": []
  }
];
