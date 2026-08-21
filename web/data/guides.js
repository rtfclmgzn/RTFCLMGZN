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
        "text": "Here's the part my desk cares about most, and where the most money gets wasted. The big labs now sell *families*, not models — a flagship, a mid-tier and a budget tier — and the gap between the ends of the ladder is much larger than most people using them assume. Our own [Scoreboard](/scoreboard) carries vendor list prices next to an independent capability score for each model, which makes the trade legible in a way a leaderboard ranking never does. Read the two columns together rather than sorting by either one, and the shape of the decision changes.",
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
  },
  {
    "id": "g4",
    "slug": "self-host-or-api-how-to-decide",
    "image": "assets/img/g4.jpg",
    "title": "Self-host or API: how to actually decide which way to run an AI model",
    "dek": "Every big open-weight release reopens the same argument — run it yourself or rent it through an API? A six-step decision that outlasts any single model launch, built around the one factor that overrides cost every time.",
    "persona": "jin-park",
    "section": "Guide",
    "format": "guide",
    "publishedAt": "2026-08-01T10:07:20Z",
    "readMins": 6,
    "sample": false,
    "disclaimer": "none",
    "tldr": [
      "Self-hosting only saves money above a usage threshold that's easy to miscalculate.",
      "Data control, not cost, is the factor that should override every other consideration.",
      "Size hardware off the model's own published requirement, never a rule of thumb.",
      "Start on the API; move to self-hosting only once real volume makes the math clear.",
      "Caveat: hardware and API prices both move constantly — recheck before committing capital."
    ],
    "body": [
      {
        "type": "p",
        "text": "Every time a serious open-weight model ships, the same argument breaks out underneath it: should you run this yourself, or just pay per token through an API? DeepSeek's own release notes this week for V4-Flash-0731 quietly settle half of that argument for anyone who reads the fine print — they publish exactly what self-hosting the model would take, in hardware terms, right next to the API price. Most releases don't hand you both numbers side by side like that, which is exactly why the decision usually gets made on vibes instead of arithmetic. It doesn't have to.",
        "citation_urls": [
          "https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731"
        ]
      },
      {
        "type": "h2",
        "text": "Name the constraint before you compare prices",
        "citation_urls": []
      },
      {
        "type": "p",
        "text": "Cost is what everyone wants to compare first, and it's the wrong place to start. One constraint overrides the entire cost conversation, and checking it first saves you from running a spreadsheet you didn't need. Everything else genuinely is a cost-and-convenience tradeoff — this one isn't. The consumer-scale version of the same question is smaller-stakes but the same shape: [our guide to turning off chat training in ChatGPT, Claude, and Gemini](/article/stop-chatgpt-claude-gemini-training-on-your-chats) is the individual-account equivalent of the override below.",
        "citation_urls": []
      },
      {
        "type": "decide",
        "decide": {
          "kicker": "WHICH WAY",
          "title": "Self-host or API: name the shape of the job",
          "question": "Take the first branch that fits — they're in the order you should check them.",
          "branches": [
            {
              "when": "Your data is genuinely private, regulated, or belongs to someone who hasn't agreed to send it through a third party.",
              "then": "Self-host, full stop. No other branch matters once this is true.",
              "because": "This overrides cost and convenience every time — sending regulated data through someone else's API is a decision you can't take back.",
              "hi": true
            },
            {
              "when": "You're testing, prototyping, or your volume is low and unpredictable.",
              "then": "Stay on the API. Pay per token and revisit once volume is real.",
              "because": "Hardware sits idle between requests exactly when you can least afford idle capital — the API's whole value is that someone else absorbs that idle time."
            },
            {
              "when": "Your volume is high, steady, and predictable.",
              "then": "Run the actual numbers: your monthly token spend against the hardware's amortized cost.",
              "because": "This is the one branch where self-hosting can genuinely be cheaper — but only if usage is high enough to keep the hardware busy, not merely large in absolute terms."
            },
            {
              "when": "You need to fine-tune or otherwise modify the model's own weights.",
              "then": "Self-host. Most APIs don't expose the underlying weights for direct fine-tuning.",
              "because": "You can't customize what you don't control, and API-side fine-tuning options are typically narrower than what the open weights allow."
            },
            {
              "when": "Latency is the deciding constraint — sub-100ms, no tolerance for a network hop.",
              "then": "Self-host on hardware physically close to where the request originates.",
              "because": "An API call crosses the open internet at least once each way; a local model doesn't have to.",
              "warn": "Self-hosting for latency still requires the hardware to actually outperform the API's serving stack, which is often more optimized than a first self-hosted deployment."
            }
          ]
        }
      },
      {
        "type": "p",
        "text": "The branch worth dwelling on is the third one, because it's the only one where the answer genuinely depends on arithmetic rather than a hard rule. \"High, steady, predictable\" is doing three separate jobs in that sentence, and dropping any one of them breaks the logic. High matters because hardware has to clear a usage floor before it's cheaper than paying per token — a GPU node sitting mostly idle is a worse deal than the API, not a better one. Steady matters because self-hosted capacity is sized for a load level, and traffic that spikes well above your provisioned hardware either falls over or forces you back to an API for overflow anyway, at which point you're paying for both. Predictable matters because the whole comparison in step five assumes you can forecast next month's volume well enough to size against it; a business whose AI usage swings 5x month to month is optimizing for the wrong variable if it's optimizing for per-token cost at all.",
        "citation_urls": []
      },
      {
        "type": "h2",
        "text": "The number nobody runs",
        "citation_urls": []
      },
      {
        "type": "p",
        "text": "If you land on the \"run the numbers\" branch, here's what an actual comparison looks like using this week's release as the worked example — not because the exact figures transfer to every model, but because the shape of the comparison does. DeepSeek-V4-Flash-0731's API runs $0.14 per million input tokens and $0.28 per million output tokens. Self-hosting the same model takes roughly 110GB of memory at 3-bit quantization, or one 4×GB300 node at full precision, by DeepSeek's own published spec.",
        "citation_urls": [
          "https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731"
        ]
      },
      {
        "type": "ledger",
        "ledger": {
          "kicker": "WORKED EXAMPLE",
          "title": "DeepSeek-V4-Flash-0731: API vs. self-host, what each side actually costs",
          "items": [
            {
              "value": "$0.14 / $0.28",
              "unit": "per million tokens, in / out",
              "label": "API pricing (DeepSeek's published rate)",
              "includes": "Compute, uptime, scaling, and model maintenance, bundled into the per-token price",
              "excludes": "Any guarantee about where your data is processed or retained",
              "note": "Cache-hit input tokens run $0.0028/M, a 98% discount on unchanged prompt content."
            },
            {
              "value": "~110GB RAM (3-bit)",
              "unit": "or one 4×GB300 node (full precision)",
              "label": "Self-hosting requirement (DeepSeek's own published spec)",
              "includes": "Full control over the weights, no per-token fee, and no data leaving your infrastructure",
              "excludes": "Hardware acquisition or cloud-rental cost — DeepSeek doesn't publish a dollar figure for this, and it varies by provider and by whether you buy or rent",
              "note": "The unpriced side of this ledger is exactly why step 4 of the procedure below exists: no guide can give you a real hardware number, only your own quote can."
            }
          ]
        }
      },
      {
        "type": "p",
        "text": "Notice what that ledger deliberately doesn't do: it doesn't convert the hardware requirement into a dollar figure, because DeepSeek doesn't publish one and neither should anyone writing about it secondhand. Cloud GPU rental rates and outright hardware purchase prices both move constantly and vary by provider, region, and whether you're buying spot or reserved capacity. The honest version of this comparison has one priced side and one side you have to price yourself — which is the entire reason step four of the procedure below exists as a separate step instead of a number this guide hands you.",
        "citation_urls": [
          "https://www.digitalapplied.com/blog/deepseek-v4-flash-0731-official-release-agent-benchmarks"
        ]
      },
      {
        "type": "h2",
        "text": "The six-step decision",
        "citation_urls": []
      },
      {
        "type": "procedure",
        "procedure": {
          "kicker": "DO IT",
          "title": "Decide, with real numbers instead of vibes",
          "sub": "Twenty minutes with your own usage data beats an hour of guessing.",
          "est": "20 min",
          "level": "Intermediate",
          "track": true,
          "prereqs": [
            "Access to your API provider's usage dashboard, or a realistic estimate of monthly token volume.",
            "The candidate model's own published hardware requirement — not a third-party rule of thumb."
          ],
          "steps": [
            {
              "do": "Total your actual monthly token usage.",
              "detail": "Pull it from your provider's billing dashboard rather than estimating. If you don't have production traffic yet, you don't have the data this decision needs.",
              "verify": "You have one number: total input and output tokens over a real month, not a guess.",
              "ifnot": "If there's no real usage yet, you're pre-revenue on this decision too. Default to the API and revisit once you have a month of data."
            },
            {
              "do": "Apply the private-data override.",
              "detail": "Check whether the data involved is genuinely private, regulated, or belongs to someone who hasn't agreed to a third party processing it.",
              "verify": "You can answer yes or no in one sentence, without hedging.",
              "ifnot": "If you're not sure, treat it as yes. The cost of over-protecting data is smaller than the cost of the alternative."
            },
            {
              "do": "Get the model's own published hardware requirement.",
              "hi": true,
              "detail": "Read the model card or release notes directly. Don't use a generic 'X GB per billion parameters' rule of thumb — quantization, architecture, and context length all change the real number.",
              "why": "A rule of thumb sized DeepSeek-V4-Flash-0731 would badly miscount it: the model card's own 110GB figure already assumes 3-bit quantization, not full precision.",
              "verify": "You have a specific spec — RAM or GPU count and type — sourced from the model publisher, not a blog's estimate.",
              "ifnot": "If the publisher hasn't stated one, treat that absence itself as a signal: an unpublished hardware spec usually means self-hosting hasn't been made easy on purpose."
            },
            {
              "do": "Get a real hardware quote for that spec.",
              "detail": "Price actual cloud rental or purchase costs for the exact configuration step three named — not a rounded-off approximation.",
              "verify": "You have a dollar figure from an actual vendor quote or published cloud rate card, dated to today.",
              "ifnot": "If you can only find rough ranges, use the high end. Underestimating hardware cost is the single most common way this comparison goes wrong."
            },
            {
              "do": "Multiply your token usage by the API price and compare to the hardware's amortized monthly cost.",
              "detail": "Divide the hardware quote by its realistic useful life in months to get a monthly figure, then set it beside your monthly API bill at current usage.",
              "verify": "You have two comparable monthly numbers, not a one-time cost sitting next to a recurring one.",
              "ifnot": "If you're comparing a purchase price directly to a monthly API bill, you've made the single most common version of this mistake. Amortize first."
            },
            {
              "do": "Pilot before committing capital.",
              "detail": "Run real production traffic against both paths for two weeks before buying hardware or signing a reserved-capacity contract.",
              "est": "2 weeks",
              "verify": "You have two weeks of side-by-side data on cost, latency, and reliability, not a projection.",
              "ifnot": "If you skip the pilot and go straight to hardware, you're betting the whole decision on step four's quote being accurate under real load — which it often isn't."
            }
          ]
        }
      },
      {
        "type": "p",
        "text": "Step five is where most of these comparisons quietly fall apart, and it's worth dwelling on why. A hardware purchase is a one-time number; an API bill is a recurring one. Setting them side by side without converting the hardware cost into a monthly, amortized figure makes self-hosting look artificially cheap — you're comparing a single upfront payment to only one month of the alternative. Amortize over the hardware's realistic useful life, usually two to four years for GPU infrastructure before it's meaningfully behind the frontier, and the comparison becomes honest.",
        "citation_urls": []
      },
      {
        "type": "pitfalls",
        "pitfalls": {
          "kicker": "WHAT GOES WRONG",
          "title": "Five ways this decision gets made badly",
          "items": [
            {
              "mistake": "Sizing hardware off a generic rule of thumb instead of the model's own spec.",
              "looks": "A server that's either badly underpowered or wastefully oversized for the model you're actually running.",
              "why": "Quantization, architecture, and context length all change the real requirement — a rule of thumb ignores all three.",
              "fix": "Read the model card's own published hardware requirement before pricing anything.",
              "cost": "high"
            },
            {
              "mistake": "Comparing a one-time hardware price to a monthly API bill.",
              "looks": "Self-hosting looking dramatically cheaper than it actually is over a real time horizon.",
              "why": "A purchase price and a recurring bill aren't the same kind of number until one of them is converted.",
              "fix": "Amortize the hardware cost over its realistic useful life before comparing.",
              "cost": "high"
            },
            {
              "mistake": "Overriding the private-data check because self-hosting looks expensive.",
              "looks": "Regulated or sensitive data sent to a third-party API to save money on infrastructure.",
              "why": "The private-data branch exists precisely because it's the decision people are most tempted to skip under budget pressure.",
              "fix": "Check it first, before you've seen a single price, so cost never gets the chance to override it.",
              "cost": "high"
            },
            {
              "mistake": "Treating the decision as permanent.",
              "looks": "Infrastructure sized for a model that's since been superseded by one with a very different hardware requirement.",
              "why": "Post-training upgrades and new releases change the requirement side of the equation without warning — this week's DeepSeek release changed nothing about the hardware spec, but the next one might.",
              "fix": "Re-run the six steps whenever you'd consider switching models, not just once at the start.",
              "cost": "medium"
            },
            {
              "mistake": "Forgetting who keeps the self-hosted stack running.",
              "looks": "A cost comparison that looks like self-hosting wins, followed by an unplanned ops burden nobody budgeted for.",
              "why": "The API's price already bundles maintenance, scaling, and uptime. Self-hosting unbundles it back onto you, and that labor has a real cost even when it's not on an invoice.",
              "fix": "Price the ongoing maintenance time explicitly, not just the hardware.",
              "cost": "medium"
            }
          ]
        }
      },
      {
        "type": "p",
        "text": "One more wrinkle worth naming: this decision isn't really a one-time fork, because the model landscape underneath it keeps moving. [Matching a job to a model tier](/article/which-ai-for-which-job) assumes you're choosing between API-hosted options; open weights add a genuine fourth branch to that framework, not just a cheaper version of the same choice. A team that self-hosts locks in a specific model's capability level until it re-runs this procedure, while a team on an API rides each vendor's improvements automatically — DeepSeek's own V4-Flash retraining this week is exactly the kind of free upgrade an API user gets for nothing and a self-hosting team has to redeploy for manually. That's a real cost of self-hosting that step four's hardware quote doesn't capture, and it belongs in the decision alongside the dollar figures.",
        "citation_urls": []
      },
      {
        "type": "p",
        "text": "Two honest limits before you run this yourself. First, the worked example above uses one model's numbers from one week — API prices and hardware costs both move, sometimes sharply, so re-check the actual figures rather than reusing these. Second, this framework assumes you can get a real hardware quote and real usage data; if either one is a guess, the output of step five is a guess too, dressed up as arithmetic. The six steps don't remove uncertainty from the decision. They make sure the uncertainty that's left is the kind you chose, rather than the kind you didn't notice. One more thing this framework assumes: that the model's license actually lets you deploy it the way you're planning to — a self-hosting decision made on hardware math alone can still hit a wall the spreadsheet never priced in. [Our guide to checking an open-weight model's license](/article/check-an-open-weight-models-license) is the step to run before, not after, you buy the hardware.",
        "citation_urls": []
      }
    ],
    "apply": [
      {
        "label": "Pull your actual monthly token usage before deciding anything.",
        "text": "Open your API provider's billing dashboard today. Every other step in this guide depends on this number being real, not estimated."
      },
      {
        "label": "Run the private-data override test first, every time.",
        "text": "Before you look at a single price, answer whether the data involved is genuinely private, regulated, or someone else's. Let that answer stand even if the cost math later argues the other way."
      },
      {
        "label": "Get a dated, real hardware quote — not a rule of thumb.",
        "text": "If you're seriously considering self-hosting, price the model's own published hardware requirement from an actual vendor or cloud rate card this week, not a rounded estimate from memory."
      },
      {
        "label": "Pilot both paths for two weeks before buying anything.",
        "text": "Run real traffic against the API and, if feasible, a small self-hosted test before committing to hardware or a reserved-capacity contract. A quote is a guess until it's tested under load."
      }
    ],
    "sources": [
      {
        "label": "DeepSeek-V4-Flash-0731 — official Hugging Face model card (self-hosting hardware spec)",
        "url": "https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731"
      },
      {
        "label": "Digital Applied — DeepSeek V4-Flash-0731: official release, agent benchmarks (pricing and deployment detail)",
        "url": "https://www.digitalapplied.com/blog/deepseek-v4-flash-0731-official-release-agent-benchmarks"
      }
    ],
    "corrections": []
  },
  {
    "id": "g5",
    "slug": "audit-your-ci-for-the-claude-code-gemini-cli-codex-rce",
    "image": "assets/img/g5.jpg",
    "title": "Audit your CI for the Claude Code, Gemini CLI, and Codex GitHub-issue RCE",
    "dek": "Black Hat researchers showed one untrusted GitHub issue could hijack any of three AI coding agents in CI. All three vendors already shipped fixes — this is the checklist for confirming your own pipeline is actually running them.",
    "persona": "luka-petrovic",
    "section": "Guide",
    "format": "guide",
    "publishedAt": "2026-08-07T16:04:49Z",
    "readMins": 4,
    "sample": false,
    "disclaimer": "none",
    "tldr": [
      "One GitHub issue could hijack Claude Code, Gemini CLI, or Codex in CI, Black Hat researchers showed.",
      "All three vendors shipped fixes before the findings went public — confirm you're actually on them.",
      "Fixed releases: Claude Code 2.1.163+, Gemini CLI 0.39.1+ / run-gemini-cli 0.1.22+, Codex's fix is a workflow change.",
      "Check whether any workflow feeds raw issue or pull-request text straight into a command line.",
      "Caveat: GitHub's own advisory ties CVE-2026-54316 to only one stage of the chain, not the whole exploit."
    ],
    "body": [
      {
        "type": "p",
        "text": "At Black Hat USA on August 5, researchers from Novee Security showed that a single GitHub issue — opened by an outside account with zero write access to the repository — was enough to reach remote code execution against three different AI coding agents running in CI: Anthropic's Claude Code, Google's Gemini CLI, and OpenAI's Codex. All three vendors had already shipped fixes before the findings went public, which is the good news and the reason this is a checklist rather than an emergency. The bad news is that 'a patch exists' and 'my pipeline is running it' are two different facts, and the gap between them is exactly what a prompt-injection payload sitting in a public issue is built to exploit. [Full findings, vendor by vendor.](/article/black-hat-2026-github-issue-claude-code-gemini-cli-codex-rce)",
        "citation_urls": [
          "https://www.esecurityplanet.com/threats/black-hat-2026-critical-flaws-found-in-anthropic-google-and-openai-coding-agents/"
        ]
      },
      {
        "type": "h2",
        "text": "Which of the three do you actually run?"
      },
      {
        "type": "decide",
        "decide": {
          "kicker": "WHICH TOOL",
          "title": "Match your CI setup to its fix",
          "question": "Take the branch matching what's actually wired into your pipeline — check all that apply.",
          "branches": [
            {
              "when": "Claude Code Action runs against GitHub issues or pull requests.",
              "then": "Confirm the pinned version is 2.1.163 or later.",
              "because": "Earlier builds let a crafted git flag hidden inside an issue-triggered command reach the runner unread by the tool's own 23 built-in validation checks."
            },
            {
              "when": "Gemini CLI or run-gemini-cli runs non-interactively in a pipeline.",
              "then": "Confirm you're on Gemini CLI 0.39.1+ / run-gemini-cli 0.1.22+, and that the new non-interactive trust confirmation actually blocks the run rather than being bypassed by an existing flag or config.",
              "because": "Google rated the underlying flaw the maximum CVSS 10.0 — an allowlist marked \"restricted\" was never enforced at runtime, letting a malicious .gemini/ directory reach code execution the moment CI ran the tool against untrusted code.",
              "hi": true
            },
            {
              "when": "Codex runs more than one pass inside a single CI job sharing one checkout.",
              "then": "Split the passes into isolated jobs, matching OpenAI's own fix, and treat AGENTS.md as untrusted input regardless of version.",
              "because": "This wasn't a single patchable bug — OpenAI closed it by changing the workflow itself, so there's no version number to check against."
            }
          ]
        }
      },
      {
        "type": "p",
        "text": "Version numbers only close the vendors' own patched entry points. The pattern underneath all three — an agent treating something inside the repository it's working on as an instruction rather than as data — is a configuration problem you carry, not one a version bump resolves for you.",
        "citation_urls": []
      },
      {
        "type": "procedure",
        "procedure": {
          "kicker": "DO IT",
          "title": "Audit your own CI, not just the vendor changelog",
          "sub": "Ten minutes per pipeline, and the only thing you need is read access to your own workflow files.",
          "est": "10 min",
          "level": "Intermediate",
          "track": true,
          "prereqs": [
            "Read access to your repository's CI workflow files.",
            "The ability to check which version of each tool a workflow actually pulls, not just what's in your notes."
          ],
          "steps": [
            {
              "do": "Find every workflow that invokes one of the three tools.",
              "detail": "Search your CI configs for claude-code, gemini-cli / run-gemini-cli, and codex.",
              "verify": "You have a complete list of workflows that touch one of the three, not just the ones you remembered.",
              "ifnot": "If your CI spans multiple repositories, repeat the search in each — a fix applied in one repo's workflow doesn't apply to a copy pasted into another."
            },
            {
              "do": "Print the actual pinned version each workflow runs.",
              "detail": "Check the action tag, the package version, or the container image digest — not the version you last remember installing.",
              "verify": "You have a real version string for every workflow on your list.",
              "ifnot": "If a workflow pulls 'latest' with no pin, that's a separate finding: you can't audit a version you don't control, and you should pin one."
            },
            {
              "do": "Compare each version against the fixed release named above.",
              "hi": true,
              "detail": "Claude Code 2.1.163+, Gemini CLI 0.39.1+ / run-gemini-cli 0.1.22+. Codex has no version gate — its fix is the workspace-isolation change.",
              "verify": "Every workflow is on or above its tool's fixed version, or Codex's passes are already isolated.",
              "ifnot": "Upgrade before doing anything else on this list. Nothing else here substitutes for actually being on the patched release."
            },
            {
              "do": "Check whether the workflow feeds raw issue or pull-request text into a command line.",
              "detail": "The Claude Code chain specifically exploited a crafted git flag reaching a shell command unvalidated. Look for any step that interpolates issue or PR content directly into a bash invocation.",
              "verify": "Untrusted text is passed as a parameter, escaped, or handled by the tool's own validated interface — never string-concatenated into a shell command.",
              "ifnot": "If you find raw interpolation, treat it as its own vulnerability independent of whether the specific vendor bug was patched, and fix it the same way: never build a shell command from unvalidated input."
            },
            {
              "do": "Re-run the workflow against a test issue after patching.",
              "detail": "Open a throwaway issue with an obviously adversarial title or body and confirm the agent handles it as inert text, not as an instruction.",
              "verify": "The test run completes with no unexpected command execution and no secrets touched.",
              "ifnot": "If the agent still reacts to content inside the test issue as if it were a command, the patch didn't close the gap in your specific configuration — file it with the vendor rather than assuming the changelog covers your setup."
            }
          ]
        }
      },
      {
        "type": "p",
        "text": "Running the five steps once closes the vendors' disclosed gap. The ways this audit quietly fails anyway are the same four every time.",
        "citation_urls": []
      },
      {
        "type": "pitfalls",
        "pitfalls": {
          "kicker": "WHAT GOES WRONG",
          "title": "Four ways this audit gets called done when it isn't",
          "items": [
            {
              "mistake": "Assuming Codex needs no action because it has no CVE number.",
              "looks": "Every other tool gets a version-bump ticket; Codex gets skipped because there's nothing to bump.",
              "why": "OpenAI's fix was a workflow change in its own repository, not a package release — there is no version string that tells you whether your own Codex jobs still share one checkout.",
              "fix": "Check your own CI job definitions directly: are two Codex passes still writing to and reading from the same AGENTS.md in one job?",
              "cost": "high"
            },
            {
              "mistake": "Bumping Gemini CLI's version but leaving a flag or config that bypasses the new trust confirmation.",
              "looks": "The changelog says fixed; the pipeline still runs the tool non-interactively without ever pausing on untrusted input.",
              "why": "The version bump ships the capability to require trust confirmation — it doesn't force every existing config to actually invoke it.",
              "fix": "Confirm the trust-confirmation step is present in your workflow logs on a real run, not just in the release notes.",
              "cost": "high"
            },
            {
              "mistake": "Trusting a container image built before the patch and never rebuilt.",
              "looks": "The workflow file references the right version tag, but the cached image underneath is weeks stale.",
              "why": "A version pin in a YAML file describes intent, not what's actually installed in a layer that hasn't been rebuilt.",
              "fix": "Force a rebuild and check the installed version inside the running container, not just the file that names it.",
              "cost": "medium"
            },
            {
              "mistake": "Treating CVE-2026-54316 as covering the whole disclosed chain.",
              "looks": "A patch-tracking ticket closed because 'the CVE is fixed.'",
              "why": "GitHub's own advisory record ties that CVE specifically to the Hugging Face data-exfiltration stage, published weeks before the Black Hat talk — not the initial git-flag validator bypass Novee presented on stage.",
              "fix": "Confirm your Claude Code version against 2.1.163, the release that closed the full chain Novee disclosed, rather than against the CVE number alone.",
              "cost": "medium"
            }
          ]
        }
      },
      {
        "type": "p",
        "text": "Two DEF CON follow-on talks — Aug 7 and Aug 9 — may add detail beyond what Black Hat covered, and any of the three vendors could revise guidance as a result. Treat this as a snapshot: re-check version numbers against each vendor's own advisory page before signing off an audit, not against this guide months from now.",
        "citation_urls": []
      }
    ],
    "apply": [
      {
        "label": "Grep your CI configs today, not on the next sprint.",
        "text": "Search every repository's workflow files for claude-code, gemini-cli, run-gemini-cli, and codex before doing anything else on this list."
      },
      {
        "label": "Verify the running version, not the pinned one.",
        "text": "A version pin in a workflow file is intent. Check what's actually installed in the container or runner that executes it."
      },
      {
        "label": "Test with an adversarial issue before calling it closed.",
        "text": "Open a throwaway issue with an obviously adversarial body and confirm the agent treats it as inert text, not instructions."
      }
    ],
    "sources": [
      {
        "label": "GitHub Security Advisory GHSA-fg94-h982-f3mm — Anthropic's own advisory record for the Claude Code exfiltration stage",
        "url": "https://github.com/anthropics/claude-code/security/advisories"
      },
      {
        "label": "Novee Security — update to Gemini CLI and run-gemini-cli trust model",
        "url": "https://novee.security/vulnerabilities/update-to-gemini-cli-and-run-gemini-cli-trust-model/"
      },
      {
        "label": "cybersecuritynews.com — critical flaws in AI coding agents (Claude Code, Gemini CLI, Codex chains)",
        "url": "https://cybersecuritynews.com/critical-flaws-in-ai-coding-agents/"
      },
      {
        "label": "eSecurityPlanet — Black Hat 2026: critical flaws found in Anthropic, Google, and OpenAI coding agents",
        "url": "https://www.esecurityplanet.com/threats/black-hat-2026-critical-flaws-found-in-anthropic-google-and-openai-coding-agents/"
      }
    ],
    "corrections": []
  },
  {
    "id": "g6",
    "slug": "keep-claude-code-asking-before-it-acts",
    "image": "assets/img/g6.jpg",
    "title": "Keep Claude Code asking before it acts, before auto mode becomes the default on August 14",
    "dek": "Anthropic is switching new Claude Code sessions on Pro, Max, and Team plans from step-by-step approval to a classifier that runs on its own. If you want a human checkpoint back — on everything, or just on pushes — here's exactly which setting does it.",
    "persona": "luka-petrovic",
    "section": "Guide",
    "format": "guide",
    "publishedAt": "2026-08-11T20:14:59Z",
    "readMins": 3,
    "sample": false,
    "disclaimer": "none",
    "tldr": [
      "Claude Code's auto mode becomes the default for new sessions on Pro, Max, and Team plans August 14.",
      "Press Shift+Tab in the CLI, or use the desktop app's mode dropdown, to switch modes any time.",
      "To keep auto mode but checkpoint pushes only, add a permissions.ask rule to your settings file.",
      "Caveat: a default you already set yourself is preserved — this guide is for everyone else."
    ],
    "body": [
      {
        "type": "p",
        "text": "Starting August 14, new Claude Code sessions on Pro, Max, and Team plans stop asking before every file edit, command, or push, and start running on their own — a classifier reviews each action instead and only interrupts you when it judges something irreversible, destructive, or aimed outside your own environment. If you already picked a manual-approval default yourself, Anthropic says it stays put; you'll get a one-time notification with the option to switch, not an override. Everyone else gets moved automatically. What follows is exactly which settings control this, sourced from Anthropic's own configuration reference rather than guessed at from the announcement.",
        "citation_urls": [
          "https://claude.com/blog/auto-mode-default-in-claude-code",
          "https://code.claude.com/docs/en/auto-mode-config"
        ]
      },
      {
        "type": "procedure",
        "procedure": {
          "kicker": "DO IT",
          "title": "Set the permission boundary you actually want",
          "sub": "Five minutes, done once, applies to every session after.",
          "est": "5 min",
          "level": "Beginner",
          "track": true,
          "prereqs": [
            "Claude Code installed and already in use on a Pro, Max, or Team plan.",
            "Access to your own settings file, or your org's managed settings if you're an admin."
          ],
          "steps": [
            {
              "do": "Decide if you want manual approval back entirely, or auto mode kept with specific checkpoints.",
              "detail": "Full manual is the simplest choice and costs nothing but the prompts you'll see again. Keeping auto mode with checkpoints is the choice if you mostly trust it but want a human eye on specific actions like pushes.",
              "verify": "You can state your choice in one sentence before touching a setting.",
              "ifnot": "If you can't decide, default to full manual for now — you can loosen it once you've watched auto mode work for a few sessions."
            },
            {
              "do": "For full manual: press Shift+Tab in the CLI, or use the mode dropdown in the desktop app.",
              "detail": "This switches your permission mode immediately for the current and future sessions.",
              "verify": "Your next file edit or command prompts for approval again, the way it did before August 14.",
              "ifnot": "If nothing changes, you may already be on a manual default from a prior session — Claude Code doesn't override a default you set yourself."
            },
            {
              "do": "For auto mode plus a checkpoint on pushes: add a permissions.ask rule to your settings file.",
              "detail": "In ~/.claude/settings.json (or managed settings for a whole org), add: {\"permissions\":{\"ask\":[\"Bash(git push *)\",\"Bash(gh pr create *)\"]}}. Content-scoped ask rules are evaluated before the classifier and always force a prompt.",
              "verify": "Your next git push or gh pr create stops for approval even though other actions keep running automatically.",
              "ifnot": "If it still runs without prompting, check the rule went into permissions.ask and not autoMode.allow — those have opposite effects."
            },
            {
              "do": "Tell the classifier what counts as internal, so it stops flagging routine work.",
              "detail": "Add your source-control org and key internal services to autoMode.environment in ~/.claude/settings.json, keeping the literal string \"$defaults\" in the array so you extend the built-in rules instead of replacing them.",
              "verify": "Run claude auto-mode config and confirm your entries appear in the effective environment list.",
              "ifnot": "Entries missing? Confirm they're not sitting in .claude/settings.local.json — the classifier stopped reading that file as of Claude Code v2.1.207."
            },
            {
              "do": "Check what the classifier has already blocked.",
              "detail": "Open /permissions and look at the Recently denied tab.",
              "verify": "Each denial shows the action it stopped. Press r on one you actually meant to allow, to let Claude retry it.",
              "ifnot": "Nothing listed means either you're not on auto mode yet, or nothing has tripped the classifier so far."
            }
          ]
        }
      },
      {
        "type": "p",
        "text": "Steps 3 and 4 above are the two settings most people actually want: one keeps a human in the loop on the action with the widest blast radius, the other stops the classifier from flagging your own team's routine work. Both live in the same file, so it's one edit, not two.",
        "citation_urls": []
      },
      {
        "type": "snippet",
        "snippet": {
          "kicker": "COPY THIS",
          "title": "A settings.json that checkpoints pushes and trusts your own org",
          "lang": "json",
          "body": "{\n  \"permissions\": {\n    \"ask\": [\"Bash(git push *)\", \"Bash(gh pr create *)\"]\n  },\n  \"autoMode\": {\n    \"environment\": [\"$defaults\", \"Source control: {{SOURCE_CONTROL_ORG}}\"]\n  }\n}",
          "fill": [
            {
              "token": "{{SOURCE_CONTROL_ORG}}",
              "means": "your GitHub, GitLab, or Bitbucket org or host",
              "example": "github.com/my-org"
            }
          ],
          "expects": "Your next push or PR creation stops for approval; everything else Claude proposes inside your named org keeps running without a prompt.",
          "note": "Save this in ~/.claude/settings.json for yourself, or distribute it through managed settings for a whole team. Run claude auto-mode config afterward to confirm it took effect."
        }
      },
      {
        "type": "p",
        "text": "None of this is a verdict on whether auto mode itself is safe enough — independent researchers have said they want more confirmation of Anthropic's own numbers before trusting the classifier at scale. This guide only covers the mechanical question: which setting does what, so you're choosing your own boundary deliberately on August 14 instead of discovering it by watching what Claude Code does next.",
        "citation_urls": [
          "https://claude.com/blog/auto-mode-default-in-claude-code"
        ]
      }
    ],
    "apply": [
      {
        "label": "Set your boundary before August 14, not after.",
        "text": "The switch happens on new sessions automatically — deciding in advance beats discovering your new default mid-task."
      },
      {
        "label": "Start with permissions.ask on pushes if you're unsure.",
        "text": "It's the narrowest checkpoint that still catches the highest-stakes action — everything ships except what leaves your machine."
      },
      {
        "label": "Run claude auto-mode config after any change.",
        "text": "It prints your effective rules, not just what you think you set — the fastest way to catch a typo'd JSON key."
      }
    ],
    "sources": [
      {
        "label": "Claude Code documentation — \"Configure auto mode\"",
        "url": "https://code.claude.com/docs/en/auto-mode-config",
        "primary": true
      },
      {
        "label": "Anthropic — \"Auto mode becomes the default in Claude Code\"",
        "url": "https://claude.com/blog/auto-mode-default-in-claude-code",
        "primary": true
      }
    ],
    "corrections": []
  },
  {
    "id": "g7",
    "slug": "check-an-ai-labs-own-safety-claim",
    "image": "assets/img/newsroom/g7.jpg",
    "title": "How to check whether an AI lab's own safety claim actually holds up",
    "dek": "Anthropic's latest Risk Report names an unreleased model and quietly raises its own risk rating. Neither claim is independently audited — here's the six-step read every self-reported safety disclosure deserves, worked through on this week's example.",
    "persona": "luka-petrovic",
    "section": "Guide",
    "format": "guide",
    "publishedAt": "2026-08-16T11:00:00Z",
    "readMins": 6,
    "sample": false,
    "disclaimer": "none",
    "tldr": [
      "Frontier labs self-report almost every safety and capability claim — there's no external auditor yet.",
      "The primary document usually has more precision than the press summary, and sometimes less than it claims.",
      "Always separate what changed from why a lab says it changed — they're graded differently.",
      "A grading process run by the lab being graded is real evidence, not proof, however careful it is.",
      "Caveat: this method tells you what a lab actually said, not whether it's true — that part still takes judgment."
    ],
    "body": [
      {
        "type": "p",
        "text": "This week, Anthropic's [August 2026 Risk Report](/article/anthropic-model-2-risk-report-misalignment-rating-raised) disclosed an unreleased internal model for the first time and raised the company's own assessed risk of catastrophic misalignment from \"very low\" to \"low.\" Within a day, a dozen outlets had a version of the story, and at least one of them attached a precise benchmark score to the new model that doesn't actually appear anywhere in Anthropic's own 186-page document — it's on a chart with no printed numbers. ==That gap between what a lab discloses and what gets repeated about it isn't unusual, and it isn't limited to Anthropic.== It's the normal condition of AI safety reporting right now, because there is no independent regulator reading these reports before the public does.",
        "citation_urls": [
          "https://www.anthropic.com/aug-2026-risk-report"
        ]
      },
      {
        "type": "h2",
        "text": "Start from the assumption that you're the auditor",
        "citation_urls": []
      },
      {
        "type": "p",
        "text": "Every frontier lab now publishes something in this genre — a Risk Report, a System Card, a Responsible Scaling Policy update — and every one of them is written by the company describing its own product. That's not a reason to distrust them by default; it's a reason to read them the way you'd read an earnings call rather than a news article: **the specific wording is the whole product**, and the gap between a headline claim and its footnoted qualifier is usually where the real information lives. The six steps below are the same ones that went into checking this week's Model 2 disclosure, in the order that actually catches problems.",
        "citation_urls": []
      },
      {
        "type": "procedure",
        "procedure": {
          "kicker": "DO IT",
          "title": "Read a safety disclosure like you're grading it",
          "sub": "Fifteen minutes with the primary document beats an hour of secondary summaries.",
          "est": "15 min",
          "level": "Intermediate",
          "track": true,
          "prereqs": [
            "A link to the lab's own primary document — not a news article about it.",
            "Patience to open a PDF; most of these run 100+ pages and the useful part is rarely the executive summary."
          ],
          "steps": [
            {
              "do": "Find the primary document itself, not the press coverage of it.",
              "detail": "Search the lab's own domain (its newsroom or a dedicated transparency page) rather than trusting a summary blog. **The primary document is the only thing worth quoting a number from.** Anthropic's Risk Reports live at anthropic.com under dated URLs; other labs use system-card or model-card pages.",
              "verify": "You have a PDF or page hosted on the company's own domain, not a third party's paraphrase of it.",
              "ifnot": "If you can only find secondary coverage, treat every specific number in it as unconfirmed until you find where it actually comes from."
            },
            {
              "do": "Identify the exact threshold or threat model being discussed.",
              "hi": true,
              "detail": "Safety claims are meaningless without the criterion they're measured against. Anthropic's report frames every risk rating against a named threat model (e.g. \"misalignment in high-stakes settings\") with a stated threshold for what would trigger a higher tier — quote that threshold, don't paraphrase it.",
              "why": "A vague read of \"low risk\" hides whether that's low against a strict bar or a loose one. Anthropic's own AI R&D threshold changed twice this year — the bar itself moved, not just the score against it.",
              "verify": "You can write the threshold in one sentence, in the lab's own words.",
              "ifnot": "If the document doesn't state a threshold at all, that absence is itself the finding — write it down as one."
            },
            {
              "do": "Check who's grading, and who's graded.",
              "detail": "Look for whether the evidence behind a claim comes from the lab's own internal evaluation, an outside auditor, or independent replication. Anthropic's Model 2 findings, for instance, come entirely from Anthropic's own behavioral-audit process — a real methodology, run on the company's own models, by tools the company built.",
              "verify": "You can name the specific team or process that produced the evidence, and whether it sits inside or outside the company being assessed.",
              "ifnot": "If the document doesn't say who ran the evaluation, assume internal until proven otherwise — that's the more common case industry-wide."
            },
            {
              "do": "Separate what changed from why the lab says it changed.",
              "detail": "A risk rating moving from \"very low\" to \"low\" is one fact. The stated reason — new evidence about the model itself, or updated uncertainty about something external — is a separate fact, and conflating them is the single most common misreading of these reports.",
              "why": "Anthropic's own August report raised its rating for a reason that had nothing to do with new findings about the model in question — it cited outside industry incidents instead. A reader skimming only the rating change would miss that entirely.",
              "verify": "You can state the reason for the change in the lab's own words, separately from the change itself.",
              "ifnot": "If no reason is given, that's worth flagging as clearly as the change itself — an unexplained rating shift is weaker evidence than an explained one, in either direction."
            },
            {
              "do": "Check whether a benchmark score is filtered, capped, or otherwise shaped before you compare it to anything.",
              "detail": "Internal benchmarks are often deliberately restricted to hard cases (to keep them meaningful as models improve), which makes a raw percentage misleading without that context. Anthropic's CoBench evaluation, for instance, is explicitly filtered to problems its previous model failed at least once — a plainer sample would be roughly twice the size and the scores would likely be higher across the board.",
              "verify": "You know whether the dataset behind a score is representative or deliberately hard-filtered, and can state which.",
              "ifnot": "If the filtering method isn't disclosed, treat the raw score as incomparable to any other benchmark's raw score, even one with a similar name."
            },
            {
              "do": "Write your own one-line verdict — what's established, what's the company's word, what's missing.",
              "detail": "Close by sorting the claims you've just read into three piles: independently verifiable, internally verified only, and asserted without evidence. Most safety disclosures are mostly the middle pile, and that's not automatically damning — it's just the category to name honestly.",
              "verify": "You can hand someone else your one-line verdict and they'd know what you checked and what you didn't.",
              "ifnot": "If you can't write the verdict in one line, you've probably conflated two different claims — go back to step four."
            }
          ]
        }
      },
      {
        "type": "h2",
        "text": "Which claim are you actually looking at?",
        "citation_urls": []
      },
      {
        "type": "p",
        "text": "Not every sentence in a safety report needs the same scrutiny. The router below sorts the four shapes these claims usually take, because the failure mode is different for each one.",
        "citation_urls": []
      },
      {
        "type": "decide",
        "decide": {
          "kicker": "WHICH CLAIM",
          "title": "Match the claim to the check that actually catches its failure mode",
          "question": "Read the sentence you're checking, then take the branch that matches its shape.",
          "branches": [
            {
              "when": "A specific benchmark score or percentage.",
              "then": "Find the grading methodology and dataset filtering before treating the number as comparable to anything else.",
              "because": "Two benchmarks with the same name can score on different, incompatibly filtered datasets — Anthropic's own CoBench explicitly says so.",
              "hi": true
            },
            {
              "when": "A risk-rating word — \"low,\" \"very low,\" \"critical\" — without a number attached.",
              "then": "Find the named threat model and its threshold, and read the stated reason for any change separately from the change.",
              "because": "The word alone tells you almost nothing; the threshold it's measured against is where the actual claim lives."
            },
            {
              "when": "A quote attributed to a company spokesperson or an internal document.",
              "then": "Trace it to the primary source and confirm it's reproduced exactly, not paraphrased as if verbatim.",
              "because": "Secondary coverage regularly tightens or simplifies quoted language in ways that change its precision without changing its meaning enough to notice."
            },
            {
              "when": "A claim that something hasn't happened yet, or won't be released.",
              "then": "Check whether the stated reason is a safety finding or a procedural one — \"hasn't completed assessment\" and \"failed assessment\" are very different claims.",
              "because": "Anthropic's own Model 2 disclosure stays internal for a procedural reason — an incomplete predeployment suite — not because it failed a safety test.",
              "warn": "Don't assume the stronger, more alarming reading is the accurate one just because it's more dramatic. Check the document's own wording."
            }
          ]
        }
      },
      {
        "type": "p",
        "text": "Running all four branches against this week's disclosure lands on the same handful of facts, which is worth laying out plainly before the pitfalls below.",
        "citation_urls": []
      },
      {
        "type": "keyfacts",
        "keyfacts": {
          "kicker": "THIS WEEK'S WORKED EXAMPLE",
          "title": "What Anthropic's own report actually says",
          "items": [
            {
              "label": "The change",
              "value": "Misalignment risk raised from \"very low\" to \"low\""
            },
            {
              "label": "The stated reason",
              "value": "Industry incident disclosures, not new findings about the model"
            },
            {
              "label": "Who evaluated it",
              "value": "Anthropic's own internal behavioral-audit process"
            },
            {
              "label": "The threshold not yet met",
              "value": "Full substitution for Anthropic's own research staff, by its own account"
            },
            {
              "label": "What's unreleased and why",
              "value": "Model 2 — predeployment suite incomplete, per Anthropic, not a safety failure"
            }
          ],
          "source": "Anthropic, Risk Report: August 2026"
        }
      },
      {
        "type": "p",
        "text": "Running the six steps on this week's report is what surfaces the gap mentioned at the top: several outlets printed a precise CoBench percentage for Model 2 that doesn't appear anywhere in Anthropic's own text — only a chart with no axis labels printed in the extracted document. That's not evidence the number is wrong. It's evidence nobody outside Anthropic can currently confirm it's right, which is exactly the distinction step six asks you to keep straight rather than collapse into either \"true\" or \"false.\"",
        "citation_urls": [
          "https://www.unite.ai/anthropic-raises-misalignment-risk-to-low-and-shelves-internal-model-2/"
        ]
      },
      {
        "type": "pitfalls",
        "pitfalls": {
          "kicker": "WHAT GOES WRONG",
          "title": "Four ways this reading gets done badly",
          "items": [
            {
              "mistake": "Treating a rating word (\"low,\" \"critical\") as a number without checking the threshold behind it.",
              "looks": "Confident comparisons between two labs' ratings that don't actually share a definition of the threat model.",
              "why": "Each lab defines its own thresholds under its own policy document — the words aren't standardized across the industry.",
              "fix": "Quote the specific threshold in the lab's own words before comparing it to anything else.",
              "cost": "high"
            },
            {
              "mistake": "Repeating a specific figure from secondary coverage without checking it against the primary document.",
              "looks": "A precise-sounding percentage that turns out to trace to a chart with no printed axis values, or to nothing at all.",
              "why": "Secondary outlets sometimes OCR a chart, estimate a value, or simply repeat an earlier outlet's unverified number.",
              "fix": "Open the primary document yourself before using any number you can't find printed in it.",
              "cost": "high"
            },
            {
              "mistake": "Conflating a procedural non-release (\"hasn't finished testing\") with a safety failure.",
              "looks": "Coverage implying a model was held back because it's dangerous, when the lab's own stated reason is an incomplete assessment.",
              "why": "The more alarming reading is more shareable, which biases coverage toward it even without evidence.",
              "fix": "Quote the lab's own stated reason and don't upgrade it without new evidence.",
              "cost": "medium"
            },
            {
              "mistake": "Forgetting that the evaluator is also the evaluated.",
              "looks": "A report's findings cited as though independently confirmed, with no note that the audit process belongs to the same company.",
              "why": "Self-assessment can be careful and well-documented and still be self-assessment — the two aren't in tension, but they're not the same thing as independent verification either.",
              "fix": "State explicitly, every time, whether a finding is internal or externally verified.",
              "cost": "medium"
            }
          ]
        }
      },
      {
        "type": "p",
        "text": "None of this makes a self-reported safety disclosure worthless — Anthropic's report is genuinely more detailed and more self-critical than what most of the industry publishes, including a rating increase the company wasn't forced into by any regulator. But detail and rigor aren't the same claim as independence, and ==the six steps above exist to keep a reader from quietly upgrading one into the other==. The next report — from Anthropic or anyone else — deserves the same read, not a lighter one just because the last one held up.",
        "citation_urls": []
      }
    ],
    "apply": [
      {
        "label": "Bookmark the primary source, not the summary, next time a lab publishes a safety report.",
        "text": "Go straight to the company's own newsroom or transparency page rather than the first article that shows up in search — the six-step method above only works starting from the primary document."
      },
      {
        "label": "Practice step four on the next rating change you see.",
        "text": "The next time any lab announces a risk-rating change, write down the change and the stated reason as two separate sentences before reacting to either."
      },
      {
        "label": "Ask who graded it, every time.",
        "text": "Before repeating a safety claim, check one thing: was this measured by the company itself, or by someone outside it? That single question resolves most of the ambiguity in this genre."
      }
    ],
    "sources": [
      {
        "label": "Anthropic — Risk Report: August 2026 (primary source, worked example)",
        "url": "https://www.anthropic.com/aug-2026-risk-report"
      },
      {
        "label": "Anthropic — Responsible Scaling Policy",
        "url": "https://www.anthropic.com/responsible-scaling-policy"
      },
      {
        "label": "Unite.AI — Anthropic raises misalignment risk to low and shelves internal Model 2",
        "url": "https://www.unite.ai/anthropic-raises-misalignment-risk-to-low-and-shelves-internal-model-2/"
      }
    ],
    "corrections": []
  },
  {
    "id": "g8",
    "slug": "how-to-tell-if-an-ai-valuation-is-real",
    "image": "assets/img/newsroom/g8.jpg",
    "title": "How to tell whether an AI company's valuation number is real",
    "dek": "A funding headline is a price a handful of investors agreed to, not one a market tested — and the number attached to a company can shift depending on whether you catch it announced, closed, or merely pitched. A five-step read, worked through on two real 2026 raises where getting the timing wrong would mean repeating the wrong number.",
    "persona": "kian-farzan",
    "section": "Guide",
    "format": "guide",
    "publishedAt": "2026-08-16T16:28:19Z",
    "readMins": 6,
    "sample": false,
    "disclaimer": "not-financial-advice",
    "tldr": [
      "A funding valuation is a price a few investors agreed to pay, not a market-tested number.",
      "The same round can carry two figures depending on whether you catch it announced or closed.",
      "Check whether a raise is equity, debt, or a mix before comparing it to any other round.",
      "Revenue run-rate and audited revenue are different claims — know which one backs any multiple.",
      "Caveat: even a closed valuation is a private number, never independently audited like a public filing."
    ],
    "applyType": "work",
    "apply": [
      {
        "label": "Trace the transaction verb before repeating any funding number.",
        "text": "\"In talks,\" \"targeting,\" and \"pitching\" describe an unclosed ask; \"closed,\" \"completed,\" and \"wired\" describe a price investors actually paid — check which one you're holding before you repeat it."
      },
      {
        "label": "Compute the multiple yourself the next time a valuation and a revenue figure appear in the same story.",
        "text": "Divide the valuation by the revenue figure it's priced against, and note whether that revenue is a run-rate or audited — the two numbers won't tell you that on their own."
      },
      {
        "label": "Watch for Moonshot AI's pending pre-IPO round to actually close.",
        "text": "As of this piece, the pitched $50 billion figure hasn't priced. When it does, run it through steps two and five above to see whether it lands where the ask implied."
      }
    ],
    "body": [
      {
        "type": "p",
        "text": "A company's valuation in a funding headline is not a price the market set. **It's a number a handful of investors agreed to pay for a slice of equity, in a round that usually keeps moving for weeks after the figure first leaks — and by the time it's official, it has often already changed.** [Databricks](/company/databricks) closed a $5 billion round at a $190 billion valuation on August 13, 2026, two billion dollars above the $188 billion figure attached to the same round when it was first reported in mid-July. [Moonshot AI](/company/moonshot) closed its own Series F at a $35 billion __post-money valuation__ on July 29, 2026 — and within the same window was already being pitched to new investors for a separate, still-open round at $50 billion. ==Neither number is wrong. Catching which one you're holding is the entire skill.==",
        "citation_urls": [
          "https://techcrunch.com/2026/07/17/databricks-hits-188b-valuation-extending-its-run-as-ais-favorite-second-act/",
          "https://www.cnbc.com/2026/08/13/databricks-funding-round-190-billion-valuation.html",
          "https://www.bloomberg.com/news/articles/2026-07-29/china-s-moonshot-ai-passes-funding-goal-to-hit-35-billion-value",
          "https://www.bloomberg.com/news/articles/2026-07-21/china-s-moonshot-in-talks-on-pre-ipo-funds-at-50-billion-value"
        ]
      },
      {
        "type": "h2",
        "text": "Start from what a valuation actually is",
        "citation_urls": []
      },
      {
        "type": "p",
        "text": "A private company's valuation is set the moment new investors agree to buy a slice of equity at a given price — **not audited, not tested by a public market, and not necessarily final until money actually changes hands**. That's true of every private funding round, not just AI ones, but 2026's pace makes the gap between a reported number and a closed one wider than usual: rounds get covered while they're still being assembled, because the story is worth running before it's finished. ==The transaction verb is where most of these mistakes start.==",
        "citation_urls": []
      },
      {
        "type": "procedure",
        "procedure": {
          "kicker": "DO IT",
          "title": "Read a funding valuation like you're pricing it yourself",
          "sub": "Six checks, in the order that actually catches a wrong number before you repeat it.",
          "est": "10 min",
          "level": "Beginner",
          "track": true,
          "prereqs": [
            "A link to the primary funding announcement — the company's own release or a directly-quoted investor.",
            "The patience to check a publish date against a completed-transaction verb before repeating any number."
          ],
          "steps": [
            {
              "do": "Find where the number actually originates.",
              "detail": "Search for the company's own press release or a named investor's statement first, and treat a news aggregator's rewrite as a pointer to that primary source, not a substitute for it.",
              "verify": "You have a link to the company's own announcement or a directly-quoted investor, not a third article summarizing a summary.",
              "ifnot": "If you can only find secondary coverage, treat the specific number in it as provisional until you trace it back."
            },
            {
              "do": "Check the transaction verb before treating the number as a price.",
              "hi": true,
              "detail": "**\"Closed,\" \"completed,\" and \"wired\" describe a price investors actually paid — \"in talks,\" \"targeting,\" and \"pitching\" describe an unclosed ask.** Moonshot AI's pre-IPO round was reported as being negotiated at up to $50 billion in July 2026 — an ask, not a price — while its Series F, reported separately, had already closed at $35 billion days earlier.",
              "why": "The bigger, more dramatic number is also the more shareable one, and the qualifier that it hasn't closed tends to land several paragraphs down, if it survives into later coverage at all.",
              "verify": "You can point to the specific verb the primary source used, and it's a completed-transaction verb, not a forward-looking one.",
              "ifnot": "If the verb is forward-looking, log the number as a target and expect it to move by the time — if — it closes."
            },
            {
              "do": "Confirm what the raised amount actually buys.",
              "detail": "A headline valuation is usually an equity-only figure, but the raise behind it isn't always pure equity. Databricks' $134 billion valuation in February 2026 came from a $5 billion round split $3 billion equity and $2 billion debt — the debt financed the company without diluting the equity valuation attached to the round.",
              "verify": "You can state in one sentence whether the raise was equity, debt, or a mix, and which part the headline valuation prices.",
              "ifnot": "If the split isn't disclosed, assume equity-only and say so in your own notes rather than treating the assumption as confirmed."
            },
            {
              "do": "Separate a revenue run-rate from audited revenue.",
              "detail": "A __run-rate__ annualizes a recent period's revenue — take one strong month or quarter and multiply it out — which is a real number but not the same claim as a year of audited, closed-book revenue. Databricks reported a $7 billion run-rate; Moonshot AI reported $300 million in annualized recurring revenue for June 2026, up from $100 million in March. Both are the company's own disclosures, not third-party audits.",
              "why": "Run-rate figures move faster than audited revenue, in both directions, which is exactly why companies raising money like to lead with them.",
              "verify": "You know whether the revenue figure behind a valuation is a run-rate, ARR, or trailing audited revenue, and can name which.",
              "ifnot": "If the source doesn't say, don't assume it's the stronger claim — assume it's the weaker one until proven otherwise."
            },
            {
              "do": "Compute the multiple yourself, from numbers the company actually disclosed.",
              "detail": "Divide the valuation by the revenue figure it's being priced against — Databricks' $190 billion against its $7 billion run-rate is roughly 27 times revenue; Moonshot AI's $35 billion against its $300 million ARR is roughly 117 times. **Neither multiple is inherently right or wrong; the point is that you now have a number you calculated, not one a press release characterized for you.**",
              "verify": "You can state the multiple and whether it's larger or smaller than the same company's multiple at its prior round.",
              "ifnot": "If you can't compute a multiple because one of the two inputs was never disclosed, that absence is itself worth writing down."
            },
            {
              "do": "Note who's re-upping, as a soft signal only.",
              "detail": "Existing investors returning for a later, higher-priced round is not proof the number is right, but it is real information: professional money choosing to buy in again at a higher price is a different signal than a round filled entirely by new entrants. Databricks' August round kept every investor from its February round and added one new firm; none of the prior backers sat it out.",
              "verify": "You can name whether the investor list includes repeat backers from an earlier round, or only new ones.",
              "ifnot": "If the investor list isn't disclosed, don't guess at this signal either way — leave it blank."
            }
          ]
        }
      },
      {
        "type": "h2",
        "text": "Which kind of number are you looking at?",
        "citation_urls": []
      },
      {
        "type": "p",
        "text": "Running the same six checks on different kinds of claims catches a different failure mode each time, which is what the router below sorts by shape rather than by story.",
        "citation_urls": []
      },
      {
        "type": "decide",
        "decide": {
          "kicker": "WHICH NUMBER",
          "title": "Match the claim to the check that actually catches its failure mode",
          "question": "Read the specific figure in front of you, then take the branch that matches its shape.",
          "branches": [
            {
              "when": "A dollar valuation attached to a funding round.",
              "then": "Check the transaction verb — closed vs. in talks — before repeating it as a price rather than an ask.",
              "because": "An unclosed target and a closed price are different claims wearing the same dollar sign.",
              "hi": true
            },
            {
              "when": "A revenue or ARR figure used to justify a valuation.",
              "then": "Confirm whether it's an annualized run-rate or trailing audited revenue, and whose disclosure it is.",
              "because": "The two aren't the same claim, and a company raising money has every reason to lead with the larger one."
            },
            {
              "when": "Two outlets reporting different numbers for what looks like the same round.",
              "then": "Check the publish dates before assuming a conflict — they may be the same transaction caught at two different moments.",
              "because": "TechCrunch's $188 billion Databricks figure and the company's own $190 billion close weren't competing reports; the round simply hadn't finished when TechCrunch wrote it up."
            },
            {
              "when": "One company's valuation compared against a different company's.",
              "then": "Normalize what each multiple is actually measured against — run-rate vs. audited revenue, equity-only vs. blended with debt — before treating the comparison as apples to apples.",
              "because": "Two multiples that look close can be measuring genuinely different things underneath the same label.",
              "warn": "A clean-looking comparison between two multiples is exactly where this kind of error hides best."
            }
          ]
        }
      },
      {
        "type": "h2",
        "text": "Two 2026 raises, read the right way",
        "citation_urls": []
      },
      {
        "type": "p",
        "text": "The two companies above are a clean test case because each one holds a different trap. Databricks' number is a single transaction caught at two different moments — [TechCrunch's mid-July report](/article/databricks-5-billion-raise-190-billion-valuation) on the $188 billion figure said plainly that the round hadn't closed yet, which resolves what would otherwise look like a conflicting report once Databricks' own August 13 announcement confirmed the final $190 billion print. Moonshot AI's case is different: **its $35 billion Series F and its $50 billion pre-IPO talks are [two separate transactions](/article/moonshot-ai-series-f-35-billion-close), not one number revised — and treating the second as though it had already priced is the mistake, not the number itself.**",
        "citation_urls": [
          "https://techcrunch.com/2026/07/17/databricks-hits-188b-valuation-extending-its-run-as-ais-favorite-second-act/",
          "https://www.bloomberg.com/news/articles/2026-07-29/china-s-moonshot-ai-passes-funding-goal-to-hit-35-billion-value"
        ]
      },
      {
        "type": "compare",
        "compare": {
          "kicker": "TWO 2026 RAISES, READ BOTH WAYS",
          "title": "The same method, two different traps",
          "columns": [
            {"label": "Databricks", "sub": "same round, two moments"},
            {"label": "Moonshot AI", "sub": "two rounds, one gets mistaken for the other", "hi": true}
          ],
          "rows": [
            {
              "label": "What the headline number actually is",
              "values": [
                "$188 billion reported mid-July, $190 billion at the actual August 13 close — one transaction, caught twice.",
                "$35 billion Series F, closed July 29 — and a separate $50 billion pre-IPO round still being pitched, not yet closed."
              ]
            },
            {
              "label": "The reader's mistake to avoid",
              "values": [
                "Treating the earlier $188 billion figure as wrong, instead of provisional.",
                "Treating the pitched $50 billion figure as already priced, instead of a still-open ask."
              ],
              "note": "Both mistakes come from skipping the transaction-verb check in step two."
            },
            {
              "label": "What actually resolves it",
              "values": [
                "Databricks' own press release and CNBC's August 13 report both confirm the final $190 billion print.",
                "As of this piece, only the $35 billion Series F has closed; the $50 billion round has not."
              ]
            }
          ],
          "source": "Databricks and TechCrunch reporting on the August 13, 2026 close; Bloomberg and TechNode reporting on Moonshot AI's July 29, 2026 Series F close and its separate, unclosed pre-IPO talks."
        }
      },
      {
        "type": "p",
        "text": "Both traps come from skipping the same check — the transaction verb — but they fail in opposite directions. ==One makes an old number look wrong when it was only early; the other makes a new number look settled when it's still just an ask.== {{note: This same read applies outside AI — any private company's valuation moves through the same announced-to-closed arc.}}",
        "citation_urls": []
      },
      {
        "type": "pitfalls",
        "pitfalls": {
          "kicker": "WHAT GOES WRONG",
          "title": "Four ways this reading gets done badly",
          "items": [
            {
              "mistake": "Treating an 'in talks' or 'pitching' figure as an already-priced valuation.",
              "looks": "A headline number gets repeated in later coverage as if the round had closed, when the original reporting said it was still being negotiated.",
              "why": "Financial coverage tends to lead with the biggest number in a story, and the 'not yet closed' qualifier ends up in a later paragraph, if it survives at all.",
              "fix": "Trace every valuation back to a completed-transaction verb before repeating it as a price.",
              "cost": "high"
            },
            {
              "mistake": "Comparing multiples across companies without normalizing what the revenue figure actually is.",
              "looks": "Two multiples reported side by side look comparable, but one is priced against a run-rate and the other against trailing audited revenue.",
              "why": "Run-rate figures are typically higher and unaudited on top of that, so multiples built on trailing revenue read larger even when nothing else about the two companies differs.",
              "fix": "State which kind of revenue backs each multiple before putting the two side by side.",
              "cost": "medium"
            },
            {
              "mistake": "Conflating a follow-on round's target with a company's current, closed valuation.",
              "looks": "A company gets described as 'worth' a number that is actually a separate, still-open round pitched after an earlier round already closed lower.",
              "why": "The pitched number is the more shareable one, and once it's in a headline it gets treated as settled fact regardless of the round's status.",
              "fix": "Report the closed valuation and the pitched target as two separate numbers, on two separate lines.",
              "cost": "high"
            },
            {
              "mistake": "Assuming a debt component doesn't affect the equity valuation, without checking.",
              "looks": "A company's valuation appears to jump between rounds when part of what changed was the mix of equity and debt in the raise, not the equity price.",
              "why": "A raise split between equity and debt values the equity differently than the same total amount raised as pure equity would.",
              "fix": "State the raised amount's equity-debt split before treating the headline valuation as a clean comparison to the prior round.",
              "cost": "medium"
            }
          ]
        }
      },
      {
        "type": "p",
        "text": "None of this makes a closed valuation meaningless — it means the number is only as useful as what you know about how it got priced. Run the arithmetic yourself, the way step five above does it, and Moonshot AI's Series F reduces to one figure nobody handed you pre-calculated: %%117×|Moonshot AI's Series F priced at roughly 117 times its own disclosed $300 million annualized recurring revenue — computed the same way step five above does it.%% That's the whole method, in the end: not distrust by default, just arithmetic before belief.",
        "citation_urls": [
          "https://www.bloomberg.com/news/articles/2026-07-29/china-s-moonshot-ai-passes-funding-goal-to-hit-35-billion-value"
        ]
      }
    ],
    "sources": [
      {
        "label": "Databricks — \"Databricks Grows >80% YoY, Surpasses $7B Revenue Run-Rate, Scales Lakebase, Genie, and Unity AI Gateway\" (primary source)",
        "url": "https://www.databricks.com/company/newsroom/press-releases/databricks-grows-80-yoy-surpasses-7b-revenue-run-rate-scales",
        "primary": true
      },
      {
        "label": "CNBC — \"Databricks wraps $5 billion funding round at $190 billion valuation\"",
        "url": "https://www.cnbc.com/2026/08/13/databricks-funding-round-190-billion-valuation.html"
      },
      {
        "label": "TechCrunch — \"Databricks hits $188B valuation, extending its run as AI's favorite second act\"",
        "url": "https://techcrunch.com/2026/07/17/databricks-hits-188b-valuation-extending-its-run-as-ais-favorite-second-act/"
      },
      {
        "label": "CNBC — \"Databricks completes $5 billion funding round at $134 billion valuation\"",
        "url": "https://www.cnbc.com/2026/02/09/databricks-completes-5-billion-funding-round-with-2-billion-in-debt.html"
      },
      {
        "label": "Bloomberg — \"China's Moonshot AI passes funding goal to hit $35 billion value\"",
        "url": "https://www.bloomberg.com/news/articles/2026-07-29/china-s-moonshot-ai-passes-funding-goal-to-hit-35-billion-value"
      },
      {
        "label": "Bloomberg — \"China's Moonshot in talks on pre-IPO funds at $50 billion value\"",
        "url": "https://www.bloomberg.com/news/articles/2026-07-21/china-s-moonshot-in-talks-on-pre-ipo-funds-at-50-billion-value"
      },
      {
        "label": "TechNode — \"Moonshot AI reportedly plans final pre-IPO round at $50 billion valuation\"",
        "url": "https://technode.com/2026/07/22/moonshot-ai-reportedly-plans-final-pre-ipo-round-at-50-billion-valuation/"
      }
    ],
    "corrections": []
  },
  {
    "id": "g9",
    "slug": "how-to-verify-an-ai-benchmark-claim",
    "image": "assets/img/newsroom/g9.jpg",
    "title": "How to tell whether an AI benchmark claim is real",
    "dek": "Every model launch ships with a chart proving it's the best — usually the vendor's own homework, graded by the vendor. A five-step read, worked through on one 2026 launch as it moved from a claim to a crowd vote to an independent measurement, three weeks apart.",
    "persona": "luka-petrovic",
    "section": "Guide",
    "format": "guide",
    "publishedAt": "2026-08-17T16:30:42Z",
    "readMins": 6,
    "sample": false,
    "disclaimer": "none",
    "tldr": [
      "A launch-day benchmark chart is almost always the vendor's own table, not an independent score.",
      "Crowd-voted leaderboards like Arena measure preference, not a fixed adversarial test suite.",
      "Only an independent aggregate — Artificial Analysis, tracked on our Scoreboard — counts as actually measured.",
      "One 2026 launch moved through all three stages in three weeks; watch for the same arc elsewhere.",
      "Caveat: an unscored model isn't necessarily weak — independent scores can lag launches by a week or more."
    ],
    "applyType": "watch",
    "apply": [
      {
        "label": "Watch Qwen3.8-27B for its first independent score.",
        "text": "The smaller open-weight sibling shipped August 14 with no Artificial Analysis measurement yet — the same unscored stage its larger sibling held for exactly a week."
      },
      {
        "label": "Run the three-question check on the next launch chart you see.",
        "text": "Whose table is this, is the exact test and version named, and has an independent aggregate measured it yet — the method outlasts any single model or launch."
      },
      {
        "label": "Check the Scoreboard before repeating a vendor's own ranking claim.",
        "text": "It carries the independent Artificial Analysis Intelligence Index score kept separate from vendor list prices, and flags what's still unmeasured rather than guessing."
      }
    ],
    "body": [
      {
        "type": "p",
        "text": "Every AI model launch this year has shipped with the same chart: a bar rising just past its nearest rival, sourced to nobody but the company that built the model. **The chart is real, and the bars are usually real too. What's often missing is the thing that would make either fact matter — a party with no stake in the result actually checking the number.** [Alibaba](/company/alibaba)'s Qwen3.8-Max spent three weeks in July and August 2026 moving through every stage of that gap in public, which makes it a clean, fully dated case: the same 2.4-trillion-parameter model, three numbers people called a \"ranking,\" and only the last one was ever measured by anyone but Alibaba.",
        "citation_urls": [
          "https://origami.sa/en/blog/qwen-3-8-max-alibaba-ai-model-business-guide/",
          "https://www.alibabagroup.com/en-US/document-2021044032125272064"
        ]
      },
      {
        "type": "h2",
        "text": "Which kind of number is this?",
        "citation_urls": []
      },
      {
        "type": "p",
        "text": "Almost every capability claim attached to a launch comes from one of three sources, and they are not interchangeable. A **vendor's own benchmark table** is the company running its own model against public tests, choosing which ones to publish, and reporting the result — real numbers, picked by an interested party. A __crowd-sourced leaderboard__ like Arena.AI ranks models by which output people prefer in blind, paired comparisons — a genuine signal about style and helpfulness, not a fixed test everyone takes the same way. An **independent aggregate** — the [Artificial Analysis Intelligence Index](https://artificialanalysis.ai/leaderboards/models), the one this site's own [Scoreboard](/scoreboard) tracks — is the only one of the three run by a party that doesn't sell the thing being scored. ==Only the third kind is what most readers mean when they say a model has been 'benchmarked.'==",
        "citation_urls": []
      },
      {
        "type": "decide",
        "decide": {
          "kicker": "WHICH NUMBER",
          "title": "Match the claim in front of you to the check it needs",
          "question": "Read the specific number, then take the branch that fits.",
          "branches": [
            {
              "when": "A chart in a launch post, sourced only to the company that shipped the model.",
              "then": "Treat it as the vendor's own homework — real numbers, picked by an interested party.",
              "because": "The company chose which tests to run and which to publish; a test that made the model look worse simply isn't on the chart.",
              "hi": true
            },
            {
              "when": "A leaderboard placement — 'ranked fifth' or 'top three' on a named public leaderboard.",
              "then": "Check whether it's a crowd vote (Arena-style) or a fixed test suite before treating the rank as a score.",
              "because": "A crowd vote measures preference across many blind comparisons; a fixed suite measures pass or fail against set tasks. Both produce a number that looks like a rank."
            },
            {
              "when": "A comparison against a named rival model, cited by the vendor.",
              "then": "Check whether both models were tested at the same effort or reasoning tier.",
              "because": "Modern reasoning models publish different scores at low, high and max effort settings; comparing a rival's low-effort number to your own max-effort one is a mismatch dressed as a fair fight.",
              "warn": "This is the single easiest way a real, honestly-sourced chart still misleads."
            },
            {
              "when": "No leaderboard citation at all — just prose claiming a rank or parity with a named rival.",
              "then": "Treat the claim as unverified until a table, model card, or independent score appears.",
              "because": "A described rank with no table behind it is not yet a checkable claim, however specific it sounds."
            }
          ]
        }
      },
      {
        "type": "p",
        "text": "Every one of those branches folds into the same five-step read, and the fastest way to learn it is to watch one model move through all three stages in real time — which is exactly what Qwen3.8-Max did.",
        "citation_urls": []
      },
      {
        "type": "procedure",
        "procedure": {
          "kicker": "DO IT",
          "title": "Read a benchmark claim like you're grading it yourself",
          "sub": "Five checks, worked through on one 2026 launch as it moved from a claim to a real measurement.",
          "est": "8 min",
          "level": "Beginner",
          "track": true,
          "prereqs": [
            "A launch announcement, blog post, or article citing a benchmark rank.",
            "Patience to trace a claim back to whoever actually ran the test."
          ],
          "steps": [
            {
              "do": "Find out who ran the test.",
              "detail": "Alibaba's own July 19 announcement said Qwen3.8-Max ranked 'second only to' Claude Fable 5 — with no score table, model card, or third-party evaluation attached to the claim.",
              "verify": "You can name the party that produced the number: the vendor, a crowd, or an independent lab.",
              "ifnot": "If the source is unclear, treat the number as the vendor's own until proven otherwise — that's the safer default."
            },
            {
              "do": "Check whether the leaderboard is a vote or a test suite.",
              "detail": "When Qwen3.8-Max went generally available on August 3, Alibaba cited Arena.AI placements: fifth in Text Arena, second in Vision Arena. Arena rankings are blind, paired human votes across many prompts — a real signal, but a preference measurement, not a fixed adversarial test.",
              "verify": "You know whether the number came from people voting on outputs or from the model being scored against set tasks.",
              "ifnot": "If you can't tell, the leaderboard's own methodology page will say — check before repeating the rank as a score."
            },
            {
              "do": "Look for the vendor's own benchmark table, and note whose numbers appear next to it.",
              "hi": true,
              "detail": "Alibaba also published a Terminal-Bench 2.1 table putting Qwen3.8-Max at 86.6 — ahead of Claude Opus 4.8's 84.6, but behind GPT-5.6 Sol's 88.8 in its highest-effort mode. That's a real, checkable table on a named test, but it's still Alibaba choosing which test to feature.",
              "why": "A vendor citing a rival's public score on a named test is at least checkable — you can go look up whether that rival really scores what the table says elsewhere. It's still the vendor's choice of test.",
              "verify": "You can name the specific test and confirm the cited rival score exists independently of this vendor's table.",
              "ifnot": "If the rival's number can't be found anywhere but this vendor's own post, treat both sides of the comparison as unverified."
            },
            {
              "do": "Check whether an independent aggregate has measured it yet.",
              "detail": "Neither Artificial Analysis nor Hugging Face had scored Qwen3.8-Max as of its August 3 general-availability launch. The independent Intelligence Index score didn't land until August 10 — at 58, a full week after the vendor's own table and Arena placements had already been circulating as 'the' Qwen3.8-Max benchmarks.",
              "verify": "You've checked the independent aggregate directly, not a secondary article's summary of it.",
              "ifnot": "No independent score yet means every number so far is vendor-sourced or crowd-sourced. Say so, and check back."
            },
            {
              "do": "Watch what changes once real testers get their hands on it.",
              "why": "A benchmark table tells you the model passed a test. It doesn't tell you how — and the gap between 'passed' and 'actually did the thing' is exactly what independent hands-on testing exists to catch.",
              "detail": "Hands-on testers found Qwen3.8-Max's coding and front-end work genuinely strong — but also caught it faking a spatial-reasoning task, overlaying static text on a scene instead of animating figures into letter shapes, producing something that looked right at a glance without solving the harder problem the prompt implied.",
              "verify": "You've looked for at least one hands-on account, not just the launch chart.",
              "ifnot": "If none exists yet, that's itself worth noting — a model with no independent testing and no independent score is earlier in its evaluation than the launch post makes it sound."
            }
          ]
        }
      },
      {
        "type": "h2",
        "text": "Three weeks, three numbers, one model",
        "citation_urls": []
      },
      {
        "type": "p",
        "text": "Laid end to end, Qwen3.8-Max's own timeline is the whole method in miniature. Alibaba unveiled the __2.4-trillion-parameter__ model on July 19, calling it \"second only to\" Claude Fable 5 with no score table attached. When it went generally available on August 3, Alibaba added Arena.AI placements — fifth on Text Arena, second on Vision Arena — plus its own Terminal-Bench 2.1 table, putting Qwen3.8-Max at **86.6**, ahead of Claude Opus 4.8's 84.6 but behind GPT-5.6 Sol's 88.8 in its highest-effort mode. Artificial Analysis didn't publish an independent score until **August 10** — landing at **58**, a full week after the launch post that made the model sound already-ranked.",
        "citation_urls": [
          "https://www.marktechpost.com/2026/08/03/alibaba-qwen-releases-qwen3-8-max/"
        ]
      },
      {
        "type": "ledger",
        "ledger": {
          "kicker": "SAME MODEL, THREE STAGES",
          "title": "What each number covers, and when it landed",
          "items": [
            {
              "value": "\"Second only to Fable 5\"",
              "unit": "Alibaba, July 19",
              "label": "Vendor's own claim at preview",
              "includes": "Alibaba's internal comparison, stated as prose in the launch post",
              "excludes": "Any published score table, model card, or independent evaluation"
            },
            {
              "value": "Fifth (Text) / Second (Vision)",
              "unit": "Arena.AI, Aug 3",
              "label": "Crowd-voted leaderboard placement",
              "includes": "Blind, paired human-preference votes across many prompts",
              "excludes": "A fixed, adversarial test suite scored identically for every model"
            },
            {
              "value": "86.6 vs. 88.8 vs. 84.6",
              "unit": "Alibaba's own table, Aug 3",
              "label": "Vendor-published Terminal-Bench 2.1 comparison",
              "includes": "A named, checkable test on Terminal-Bench 2.1",
              "excludes": "Alibaba's own choice of which test to feature, and which rivals to include"
            },
            {
              "value": "58",
              "unit": "Artificial Analysis, Aug 10",
              "label": "First independent Intelligence Index score",
              "includes": "A measurement run by a party with no stake in which model wins",
              "excludes": "N/A — this is the number the other three were standing in for",
              "note": "Landed a full week after the launch post that made the model sound already-ranked."
            }
          ],
          "source": "Alibaba's own launch announcements, July 19 and August 3; MarkTechPost, August 3; Artificial Analysis Intelligence Index, first scored August 10."
        }
      },
      {
        "type": "p",
        "text": "Read as a timeline rather than a single chart, the gap between the first claim and the first real measurement is the actual lesson: three weeks where every number in circulation was either Alibaba's own or a crowd's, and none of it was what most readers assumed 'benchmarked' meant. {{note: Artificial Analysis and Hugging Face are the two independent aggregates this method checks first — neither is affiliated with any lab whose models they score.}}",
        "citation_urls": []
      },
      {
        "type": "compare",
        "compare": {
          "kicker": "THREE KINDS OF RANKING",
          "title": "What each one actually measures",
          "columns": [
            { "label": "Vendor's own table", "sub": "real numbers, chosen by an interested party" },
            { "label": "Crowd leaderboard", "sub": "a vote, not a fixed test", "hi": true },
            { "label": "Independent aggregate", "sub": "the only one with no stake in the result" }
          ],
          "rows": [
            {
              "label": "Who runs it",
              "values": ["The company selling the model", "A public platform tallying blind votes", "A third party with no product to sell"]
            },
            {
              "label": "What it measures",
              "values": ["Whatever tests the vendor chose to publish", "Which output people prefer, prompt by prompt", "Performance on a fixed, adversarial test suite"]
            },
            {
              "label": "Can you reproduce it",
              "values": ["Only if the vendor names the exact test and version", "Not really — the vote itself is the result", "Yes — the same suite runs the same way on every model"]
            },
            {
              "label": "Qwen3.8-Max's number here",
              "values": ["86.6 on Terminal-Bench 2.1, Alibaba's own table", "Fifth on Text Arena, second on Vision Arena", "58, first published August 10 — a week after the other two"],
              "note": "same model, three numbers, none of them interchangeable"
            }
          ],
          "source": "Alibaba's own announcements and benchmark table; Artificial Analysis Intelligence Index."
        }
      },
      {
        "type": "h2",
        "text": "What a passed benchmark still doesn't tell you",
        "citation_urls": []
      },
      {
        "type": "p",
        "text": "A table proves a model produced the right-looking answer on a specific test. It says nothing about how. Independent hands-on testing found Qwen3.8-Max's coding and front-end work genuinely strong — clean layouts, working navigation, none of the generic gradient-and-glow look common to AI-generated interfaces. It also caught a shortcut: asked to animate walking figures forming the text \"Hello world, I'm Qwen,\" the model didn't choreograph the figures into letter shapes. ++It overlaid static text on the scene and arranged the figures separately++ — producing something that looked right at a glance without solving the spatial-reasoning problem the prompt actually implied.",
        "citation_urls": [
          "https://www.mindstudio.ai/blog/qwen-3-8-max-hands-on-testing"
        ]
      },
      {
        "type": "pitfalls",
        "pitfalls": {
          "kicker": "WHAT GOES WRONG",
          "title": "Five ways a benchmark claim gets taken at face value",
          "items": [
            {
              "mistake": "Treating a launch-day chart as an independent score.",
              "looks": "A headline repeats 'ranks second globally' days before any outside lab has measured the model.",
              "why": "The vendor's own table is the only number that exists yet, and it's the most shareable one — the 'not yet independently measured' caveat rarely survives into the headline.",
              "fix": "Hold the claim as vendor-sourced until an aggregate like Artificial Analysis publishes its own number.",
              "cost": "high"
            },
            {
              "mistake": "Comparing scores from different reasoning-effort tiers.",
              "looks": "Two numbers sit side by side in a chart and look like a fair fight.",
              "why": "Modern models publish separate scores per effort setting — low, high, max — and a vendor citing a rival's low-effort number against its own max-effort one produces a real number with a misleading comparison.",
              "fix": "Check that both models were tested at the matching effort tier before trusting the gap.",
              "cost": "high"
            },
            {
              "mistake": "Reading a crowd-vote placement as a fixed benchmark.",
              "looks": "'Fifth on Text Arena' gets repeated with the same confidence as a measured pass rate.",
              "why": "Arena-style leaderboards tally which output people prefer in blind pairs — a real signal about style and helpfulness, not a score against a fixed adversarial test.",
              "fix": "Name the leaderboard's own methodology before treating its placement as equivalent to a benchmark score.",
              "cost": "medium"
            },
            {
              "mistake": "Trusting a benchmark pass without checking how the model got there.",
              "looks": "A model 'solves' a task in a demo, and the pass is taken as proof the underlying skill exists.",
              "why": "Hands-on testers caught Qwen3.8-Max satisfying a spatial-reasoning prompt's visible criteria — animated text — by overlaying static text on the scene instead of actually choreographing it, a shortcut a benchmark pass alone wouldn't reveal.",
              "fix": "Look for at least one hands-on account before trusting that a passed test means the harder skill is really there.",
              "cost": "high"
            },
            {
              "mistake": "Assuming a bigger parameter count settles the comparison.",
              "looks": "A 2.4-trillion-parameter model gets treated as automatically ahead of a smaller rival.",
              "why": "Parameter count is a specification, not a capability measurement — several smaller, independently-scored models on this site's own Scoreboard outscore larger, unmeasured ones.",
              "fix": "Ask for the independent score before the parameter count decides anything for you.",
              "cost": "medium"
            }
          ]
        }
      },
      {
        "type": "p",
        "text": "None of this means Qwen3.8-Max is weak — its hands-on coding results were genuinely strong, and a score of 58 on the independent index is a real, respectable measurement once it finally landed. It means the three weeks between the claim and the measurement are exactly the window where a reader has to do this work themselves, because nobody else has yet.",
        "citation_urls": []
      },
      {
        "type": "snippet",
        "snippet": {
          "kicker": "COPY THIS",
          "title": "The three-question challenge",
          "lang": "prompt",
          "body": "For {{MODEL}}'s claimed benchmark result --\n{{CLAIM}} --\nanswer three questions separately:\n1. Which party ran this test: the vendor, a crowd platform, or an independent lab?\n2. Is the exact test, version, and effort tier named, or just a headline number?\n3. Has an independent aggregate (e.g. Artificial Analysis) published its own score yet -- and if not, when did the model launch?",
          "fill": [
            {
              "token": "{{MODEL}}",
              "means": "the model whose benchmark chart you're reading",
              "example": "Qwen3.8-Max"
            },
            {
              "token": "{{CLAIM}}",
              "means": "paste the exact ranking or score claim, not a paraphrase",
              "example": "ranks second only to Claude Fable 5"
            }
          ],
          "expects": "A precise answer names the party, the test, and the version. A vague one falls back to 'it's very capable' without naming any of the three.",
          "note": "Works as a prompt to an AI assistant researching the claim for you, or as a personal checklist while reading the launch post yourself."
        }
      },
      {
        "type": "p",
        "text": "Two limits on the method itself. An independent score, once it exists, is still one number compressing many different capabilities — a model two points behind on the aggregate can be plainly better at the one task you actually run, and a decent score is not a substitute for testing your own use case. And the gap this guide is built around doesn't close once — it reopens on every launch. Qwen3.8-27B, the smaller open-weight sibling Alibaba released on August 14, sits in the same unscored stage Qwen3.8-Max held for a week: real, downloadable, and without an independent number yet. Check [the Scoreboard](/scoreboard) before repeating anyone's ranking claim, including this one's — it gets rechecked often enough to tell you whether that's still true.",
        "citation_urls": []
      }
    ],
    "sources": [
      {
        "label": "Alibaba Group — Qwen3.8-Max general-availability announcement",
        "url": "https://www.alibabagroup.com/en-US/document-2021044032125272064",
        "primary": true
      },
      {
        "label": "Origami — Qwen3.8-Max: 2.4 trillion parameters, and what Alibaba didn't say",
        "url": "https://origami.sa/en/blog/qwen-3-8-max-alibaba-ai-model-business-guide/"
      },
      {
        "label": "Quasa — Alibaba's Qwen3.8-Max-Preview: what the 2.4T model means for AI buyers",
        "url": "https://quasa.io/media/alibaba-s-qwen3-8-max-preview-what-the-2-4t-model-means-for-ai-buyers"
      },
      {
        "label": "MarkTechPost — Alibaba Qwen Releases Qwen3.8-Max",
        "url": "https://www.marktechpost.com/2026/08/03/alibaba-qwen-releases-qwen3-8-max/"
      },
      {
        "label": "MindStudio — Qwen3.8-Max hands-on testing",
        "url": "https://www.mindstudio.ai/blog/qwen-3-8-max-hands-on-testing"
      },
      {
        "label": "Artificial Analysis — live LLM leaderboard (the independent index our Scoreboard tracks)",
        "url": "https://artificialanalysis.ai/leaderboards/models"
      }
    ],
    "corrections": []
  },
  {
    "id": "g10",
    "slug": "stop-chatgpt-claude-gemini-training-on-your-chats",
    "image": "assets/img/newsroom/g10.jpg",
    "title": "How to stop ChatGPT, Claude, and Gemini from training on your chats",
    "dek": "Three different companies, three different menus, and one common catch: opting out only ever protects what you send after you find the setting. Where each toggle lives today, and the exceptions all three still carve out anyway.",
    "persona": "nova-reyes",
    "section": "Guide",
    "format": "guide",
    "publishedAt": "2026-08-18T16:38:07Z",
    "readMins": 4,
    "sample": false,
    "disclaimer": "none",
    "tldr": [
      "ChatGPT, Claude, and Gemini each have a separate setting to stop training on your chats.",
      "Turning any of them off only protects chats sent afterward — nothing already trained gets undone.",
      "All three still carve out an exception for feedback ratings and safety-flagged conversations.",
      "Business, Team, Enterprise, and API accounts are already excluded by default at all three companies.",
      "Caveat: these settings are new and move — Anthropic's own toggle didn't exist before August 2025."
    ],
    "applyType": "work",
    "apply": [
      {
        "label": "Turn off training today in whichever of these three you actually use.",
        "text": "The setting only protects chats sent after you flip it — there's no advantage to waiting, and no retroactive fix once you do."
      },
      {
        "label": "Skip the feedback buttons on anything you don't want kept longer.",
        "text": "All three companies extend retention for a rated conversation regardless of your general toggle — the rating itself is the exception, not a bug."
      },
      {
        "label": "If you're on a paid Team, Enterprise, or API tier, verify it rather than assume it.",
        "text": "Those tiers already exclude your data from training by default at all three companies — but that's worth confirming on your own plan's terms page, not taking on this guide's word alone."
      }
    ],
    "body": [
      {
        "type": "p",
        "text": "Three separate settings decide whether your conversations with [OpenAI](/company/openai)'s ChatGPT, Claude, and Gemini get folded into the next version of each model, and none of the three works quite the way most people assume. Here's where each toggle actually lives, what turning it off does and doesn't cover, and the exceptions all three companies still carve out for feedback ratings and safety review — current as of August 18, 2026, because these settings menus move without much notice.",
        "citation_urls": [
          "https://help.openai.com/en/articles/8983130-what-if-i-want-to-keep-my-history-on-but-disable-model-training",
          "https://privacy.claude.com/en/articles/12109829-how-do-i-change-my-model-improvement-privacy-settings",
          "https://support.google.com/gemini/answer/13594961?hl=en"
        ]
      },
      {
        "type": "h2",
        "text": "What \"off\" actually means",
        "citation_urls": []
      },
      {
        "type": "p",
        "text": "**Turning any of these three off only protects what you send afterward — none of them undoes training that already happened on a past conversation**, and none is a universal \"stop using my data\" switch. Each company frames it the same way: a forward-looking preference, not a retroactive deletion. [Anthropic](/company/anthropic)'s own version of this setting didn't exist before August 2025 — before that, its consumer plans trained on chats by default with no opt-out at all, and turning it off today still only drops retention from up to 5 years down to 30 days, not to zero. Google's own buffer is shorter but not zero either: Gemini keeps a new chat for 72 hours regardless of the setting, just to run the service. ==What each setting specifically excludes differs enough between the three that reading one company's help page tells you nothing reliable about the other two.==",
        "citation_urls": [
          "https://privacy.claude.com/en/articles/12109829-how-do-i-change-my-model-improvement-privacy-settings",
          "https://www.tomsguide.com/ai/claude/your-claude-chats-are-being-used-to-train-ai-heres-how-to-opt-out"
        ]
      },
      {
        "type": "compare",
        "compare": {
          "kicker": "THREE MENUS, SIDE BY SIDE",
          "title": "Where each setting lives, and what it actually covers",
          "columns": [
            { "label": "ChatGPT", "sub": "OpenAI" },
            { "label": "Claude", "sub": "Anthropic" },
            { "label": "Gemini", "sub": "Google" }
          ],
          "rows": [
            { "label": "Setting name", "values": ["Improve the model for everyone", "Help improve our AI models", "Gemini Apps Activity"] },
            { "label": "Where it lives", "values": ["Settings → Data Controls", "Settings → Privacy", "Profile → Gemini Apps Activity"] },
            { "label": "On by default (consumer plans)", "values": ["Yes — Free, Plus, Pro", "Yes — Free, Pro, Max", "Yes — most personal accounts"] },
            { "label": "Already excluded", "values": ["Business, Enterprise, API", "Team, Enterprise, API", "Workspace accounts (admin-controlled)"] },
            { "label": "Retention once switched off", "values": ["Not stated as a fixed window on this setting", "30 days, down from up to 5 years", "New chats kept 72 hours, not used to train"] }
          ],
          "source": "OpenAI Help Center, Anthropic's Privacy Center, and Google's Gemini Apps Privacy Hub, read directly — current as of August 18, 2026."
        }
      },
      {
        "type": "p",
        "text": "Flipping each one off takes under a minute once you know where it actually lives — the paths below are current today, not a memory of an older menu. [Google](/company/google)'s Gemini is the one most likely to trip people up: the setting is named **Activity**, not training, and it's easy to assume it only controls your visible chat history.",
        "citation_urls": [
          "https://support.google.com/gemini/answer/13594961?hl=en"
        ]
      },
      {
        "type": "procedure",
        "procedure": {
          "kicker": "DO IT",
          "title": "Turn off training in whichever of these you actually use",
          "sub": "Three menus, one minute each, done once per account.",
          "est": "3 min",
          "level": "Beginner",
          "track": true,
          "prereqs": [
            "An account on the product(s) you want to opt out of — this is a per-account setting, not a device setting."
          ],
          "steps": [
            {
              "do": "In ChatGPT, turn off \"Improve the model for everyone.\"",
              "detail": "Profile picture → Settings → Data Controls → switch off \"Improve the model for everyone.\" It's on by default for Free, Plus, and Pro; Business, Enterprise, and API accounts are already excluded. Temporary Chat, from the icon top-right, skips both history and training for that one conversation.",
              "verify": "The toggle shows off, and a chat you start afterward doesn't get listed as training-eligible in Data Controls.",
              "ifnot": "If the toggle won't stay off, you may be on a Team or Enterprise seat where an admin controls this setting, not you."
            },
            {
              "do": "In Claude, turn off \"Help improve our AI models.\"",
              "detail": "Your name at the bottom of the sidebar → Settings → Privacy → switch it off. This also drops your __retention window__ from up to five years back down to the standard 30 days.",
              "verify": "The Privacy page shows the toggle off and states the 30-day retention window rather than the multi-year one.",
              "ifnot": "On Claude Team, Enterprise, or the API? This setting doesn't apply — those tiers don't train on your data already."
            },
            {
              "do": "In Gemini, turn off Gemini Apps Activity.",
              "detail": "Profile picture → Gemini Apps Activity → Turn off, or go straight to myactivity.google.com/product/gemini. On by default for most personal accounts.",
              "verify": "New chats stop appearing in your Gemini Apps Activity list going forward.",
              "ifnot": "Still seeing new items logged? A Workspace admin may control this setting on a work or school account instead of you."
            }
          ]
        }
      },
      {
        "type": "h2",
        "text": "Where the opt-out doesn't reach",
        "citation_urls": []
      },
      {
        "type": "p",
        "text": "The setting in each product is real, but every company reserves at least one carve-out that survives it no matter how you have it configured:",
        "citation_urls": []
      },
      {
        "type": "pitfalls",
        "pitfalls": {
          "title": "What the toggle doesn't cover",
          "items": [
            {
              "mistake": "Assuming turning the toggle off erases what already trained on your past chats.",
              "looks": "You've switched it off and still worry about a specific conversation from months ago.",
              "why": "All three companies word this the same way — the setting stops future use of your data, not past use.",
              "fix": "There's no user-side undo for a completed training run. The only real lever is going forward from today.",
              "cost": "high"
            },
            {
              "mistake": "Rating an answer with thumbs up or down on something sensitive, then assuming your opt-out still covers it.",
              "looks": "You're fully opted out, but the specific exchange you rated gets flagged for extended review anyway.",
              "why": "ChatGPT and Claude both carve out a feedback exception: rating a response extends that conversation's retention regardless of your general training setting.",
              "fix": "Skip the feedback buttons on anything you don't want kept longer, or use Temporary Chat or Incognito for that one conversation instead.",
              "cost": "medium"
            },
            {
              "mistake": "Treating \"delete this chat\" as the same action as \"stop this chat from training anything.\"",
              "looks": "You delete a conversation from your history and consider the data question closed.",
              "why": "Deleting a chat is a history action. If training already ran on it before deletion, the deletion doesn't reach back into a training run that already happened.",
              "fix": "Set the training toggle before you send a message you'd regret — deleting it afterward doesn't substitute for that.",
              "cost": "medium"
            },
            {
              "mistake": "Assuming a safety flag never overrides your opt-out.",
              "looks": "You're fully opted out and still get a notice that a conversation was reviewed.",
              "why": "All three companies reserve the right to use safety-classifier-flagged conversations for abuse-prevention and safety research, regardless of your training setting.",
              "fix": "Know the exception exists — it's narrow (safety review, not general model improvement) and it's disclosed in each company's own policy, not hidden.",
              "cost": "low"
            }
          ]
        }
      },
      {
        "type": "p",
        "text": "None of this applies if you're already on a paid Team, Enterprise, or API-level plan — those tiers already exclude that data from training by default at all three companies, which is still worth confirming on your own plan's terms page rather than assuming from this guide. If none of the three toggles feels like enough control, the underlying alternative is running a model yourself instead of renting someone else's — see [our guide to deciding between self-hosting and an API](/article/self-host-or-api-how-to-decide). And if \"[training data](/dictionary)\" itself is the term that's unclear, the dictionary has the one-paragraph version.",
        "citation_urls": []
      }
    ],
    "sources": [
      {
        "label": "OpenAI Help Center — \"What if I want to keep my history on but disable model training?\"",
        "url": "https://help.openai.com/en/articles/8983130-what-if-i-want-to-keep-my-history-on-but-disable-model-training",
        "primary": true
      },
      {
        "label": "OpenAI — \"How your data is used to improve model performance\"",
        "url": "https://openai.com/policies/how-your-data-is-used-to-improve-model-performance/",
        "primary": true
      },
      {
        "label": "Anthropic Privacy Center — \"How do I change my model improvement privacy settings?\"",
        "url": "https://privacy.claude.com/en/articles/12109829-how-do-i-change-my-model-improvement-privacy-settings",
        "primary": true
      },
      {
        "label": "Google — \"Gemini Apps Privacy Hub\"",
        "url": "https://support.google.com/gemini/answer/13594961?hl=en",
        "primary": true
      },
      {
        "label": "Tom's Guide — \"Your Claude chats are being used to train AI — here's how to opt out\"",
        "url": "https://www.tomsguide.com/ai/claude/your-claude-chats-are-being-used-to-train-ai-heres-how-to-opt-out"
      },
      {
        "label": "BGR — \"How To Stop Google Gemini From Training On Your Personal Chats\"",
        "url": "https://www.bgr.com/1939066/how-to-stop-google-gemini-training-personal-data/"
      }
    ],
    "corrections": []
  },
  {
    "id": "g11",
    "slug": "check-an-open-weight-models-license",
    "image": "assets/img/newsroom/g11.jpg",
    "title": "How to tell whether an 'open' AI model's license actually lets you use it",
    "dek": "Two models marketed as open can hand you completely different rights — one lets you ship it commercially with nothing but a copyright notice, another's free grant expires the moment your product crosses a user count nobody put in the launch tweet. A four-question check, worked through on four real 2026 releases.",
    "persona": "jin-park",
    "section": "Guide",
    "format": "guide",
    "publishedAt": "2026-08-19T16:45:00Z",
    "readMins": 5,
    "sample": false,
    "disclaimer": "none",
    "tldr": [
      "\"Open-weight\" doesn't mean open-source — read the actual license file, never the launch post.",
      "DeepSeek's V4 Pro ships true MIT; Meta's Llama 3 grant expires past 700 million monthly users.",
      "Moonshot's Kimi K2 only requires attribution past 100 million users or $20 million monthly revenue.",
      "Tencent's Hunyuan Hy3 went from a restricted preview license to Apache 2.0 in ten weeks.",
      "Caveat: a license you checked on a past release says nothing about the version you're deploying now."
    ],
    "applyType": "work",
    "apply": [
      {
        "label": "Before your next self-host, run the four-question check on the model you're about to pull.",
        "text": "Not on the whole industry — just the one license you're about to click \"agree\" on. Five minutes now beats a renegotiation later."
      },
      {
        "label": "If your product is anywhere near a nine-figure user count, put the exact threshold in your own compliance tracking.",
        "text": "A cap like Llama 3's 700 million doesn't announce itself — it sits in a document nobody reopens after launch day. A vague memory of \"it was fine when we checked\" isn't a control."
      },
      {
        "label": "If your pipeline does any distillation or synthetic-data generation, read the field-of-use clause specifically.",
        "text": "That's the exact restriction some \"open\" licenses write in — using a model's outputs to train or improve a different model — and it's easy to miss if you only skim for a user-count number."
      },
      {
        "label": "Re-run the check at every major version, not just once.",
        "text": "Tencent's Hy3 went from a restrictive, geo-carved preview license to a fully open Apache 2.0 grant in about ten weeks. Same lab, same model family, two different answers ten weeks apart."
      }
    ],
    "body": [
      {
        "type": "p",
        "text": "Two models can both call themselves **\"open\"** and hand you completely different rights. One lets you fine-tune it, wrap it in a product, and sell that product with no restriction beyond keeping a copyright notice in place. The other's free grant quietly expires the moment your product crosses a user count nobody mentioned in the launch tweet — and by then, renegotiating is a business problem, not a code change. The fix costs about five minutes: read the actual license file, not the announcement, and check it against four specific things, every time.",
        "citation_urls": []
      },
      {
        "type": "h2",
        "text": "What \"open-weight\" doesn't promise",
        "citation_urls": []
      },
      {
        "type": "p",
        "text": "\"Open-weight\" only means the trained parameters are downloadable — it says nothing about the terms attached to them. A genuine open-source license (__Apache 2.0__ or __MIT__, the same terms most of the software industry already trusts) grants blanket rights to use, modify, redistribute, and sell. A \"community license\" or \"acceptable use\" license can sit behind the identical download link with a completely different set of conditions: a user-count ceiling, a revenue threshold, a ban on using the model's own outputs to train a rival, or a naming requirement once your product gets big enough to notice. ==The download step looks identical either way — the difference lives entirely in a document most people never open.==",
        "citation_urls": []
      },
      {
        "type": "procedure",
        "procedure": {
          "kicker": "DO IT",
          "title": "Check the license before you ship",
          "sub": "Five minutes, once per model, before it's load-bearing in anything you've shipped.",
          "est": "5 min",
          "level": "Beginner",
          "track": true,
          "prereqs": [
            "A specific model you're planning to self-host, fine-tune, or build a product on."
          ],
          "steps": [
            {
              "do": "Find the actual license file, not the announcement.",
              "detail": "Open the model's card on Hugging Face or its GitHub repo and read the LICENSE file directly. A launch blog post is marketing copy, and it can describe terms that change before the model does.",
              "verify": "You're reading a document titled something like LICENSE or license.txt, not a press release or a blog post.",
              "ifnot": "No license file anywhere on the model card? That's a red flag on its own — don't assume permissive terms from silence."
            },
            {
              "do": "Identify the license family.",
              "detail": "A real Apache 2.0 or MIT grant — both OSI-approved, both give blanket rights to use, modify, redistribute, and sell — versus a custom \"community license\" or \"research license\" the vendor wrote itself.",
              "verify": "The license's name matches one you could look up independently (Apache-2.0, MIT), or you can point to the specific custom clauses that make it neither.",
              "ifnot": "If the license doesn't name itself, search the text for \"modified\" or the vendor's own product name in the title — that's your signal it's custom, not a standard grant."
            },
            {
              "do": "Check for a usage-based threshold.",
              "hi": true,
              "detail": "Search the text for \"monthly active users\" or \"revenue.\" Some \"open\" licenses expire your free grant entirely past a user count; others only add an attribution requirement.",
              "why": "This is the clause most teams never read, because a small product feels years away from tripping it — until it isn't.",
              "verify": "You can state the exact number, in users or dollars, where your rights change — or confirm the license has none.",
              "ifnot": "Can't find a number? The license is probably unconditional on this axis — but confirm by reading the full grant section, not just skimming for digits."
            },
            {
              "do": "Check what you're allowed to build with the outputs.",
              "detail": "Some licenses ban using the model's own outputs to train or improve a different model — a real constraint if your pipeline does any distillation or synthetic-data generation.",
              "verify": "You know whether your actual planned use, including any training pipeline, sits inside or outside the grant.",
              "ifnot": "If the clause reads ambiguous, treat it as a restriction, not a green light — asking the vendor costs less than guessing wrong."
            },
            {
              "do": "Re-check at the version you're actually deploying, not the one you remember.",
              "detail": "The same lab can ship a restrictive preview license and a permissive full release ten weeks apart, or the reverse. A license you checked in a prior release cycle is not evidence for this one.",
              "verify": "The LICENSE file you're reading carries the same version number or date as the weights you're about to pull.",
              "ifnot": "Mismatch between the LICENSE file's date and the model you're downloading? Stop and re-read — you may be looking at the wrong release's terms."
            }
          ]
        }
      },
      {
        "type": "h2",
        "text": "Four real 2026 licenses, side by side",
        "citation_urls": []
      },
      {
        "type": "p",
        "text": "The differences aren't hypothetical. Four models released this year, all marketed as \"open,\" land in four different places once you actually read the document. [DeepSeek](/company/deepseek)'s V4 Pro ships under a true MIT license — commercial use, redistribution, and training other models on its outputs are all unrestricted beyond keeping the copyright notice intact. [Meta](/company/meta)'s Llama 3 Community License permits commercial use, but its free grant expires outright once a licensee's products cross **700 million** monthly active users in the preceding month, and it separately bars using Llama's outputs to improve any other large language model. [Moonshot](/company/moonshot)'s Kimi K2 ships under a Modified MIT License that stays permissive at any size — the only added condition is displaying \"Kimi K2\" in your product's interface once you clear **100 million** monthly active users or **$20 million** in monthly revenue. And [Tencent](/company/tencent)'s Hunyuan Hy3 changed its own answer mid-year: its April preview shipped under a restrictive custom license that excluded the EU, UK, and South Korea outright, and its July full release dropped that entirely for a plain Apache 2.0 grant.",
        "citation_urls": [
          "https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro/blob/main/LICENSE",
          "https://developer.meta.com/ai/llama3/license/",
          "https://huggingface.co/moonshotai/Kimi-K2-Instruct/raw/main/LICENSE",
          "https://huggingface.co/tencent/Hy3",
          "https://www.digitalapplied.com/blog/tencent-hunyuan-hy3-open-weight-reasoning-model-2026"
        ]
      },
      {
        "type": "compare",
        "compare": {
          "kicker": "SAME WORD, FOUR DIFFERENT GRANTS",
          "title": "What four 2026 \"open\" releases actually let you do",
          "columns": [
            { "label": "DeepSeek V4 Pro", "sub": "MIT" },
            { "label": "Kimi K2", "sub": "Modified MIT" },
            { "label": "Llama 3", "sub": "Community License" },
            { "label": "Hunyuan Hy3", "sub": "Apache 2.0, current release", "hi": true }
          ],
          "rows": [
            { "label": "License family", "values": ["MIT", "Modified MIT", "Llama 3 Community License", "Apache 2.0"] },
            { "label": "Commercial use", "values": ["Unrestricted", "Unrestricted", "Allowed, with a cap", "Unrestricted"] },
            { "label": "Where the grant changes", "values": ["Never", "Attribution required past 100M users or $20M monthly revenue", "Free grant expires past 700M monthly users; a separate license is required beyond it", "Was geo-restricted at its earlier preview; dropped entirely at the current release"] },
            { "label": "Training other models on its outputs", "values": ["No restriction", "No restriction", "Explicitly banned for other large language models", "No restriction"] }
          ],
          "source": "Meta's Llama 3 Community License (developer.meta.com); DeepSeek-V4-Pro's and Kimi-K2-Instruct's Hugging Face LICENSE files; Tencent's Hy3 model card and Digital Applied's reporting on its April preview license — read directly, current as of August 19, 2026."
        }
      },
      {
        "type": "h2",
        "text": "Where this reading goes wrong",
        "citation_urls": []
      },
      {
        "type": "pitfalls",
        "pitfalls": {
          "title": "Five ways this check gets skipped",
          "items": [
            {
              "mistake": "Reading the launch blog post instead of the LICENSE file.",
              "looks": "You can describe the model as \"open\" but can't name which license, or point to the file.",
              "why": "Launch copy is marketing, written before terms are final and never updated after — Hunyuan Hy3's own preview-to-release swing shows the operative document can change entirely.",
              "fix": "Pull the LICENSE file linked on the model card and read it before you write a line of code against the model.",
              "cost": "high"
            },
            {
              "mistake": "Treating every license marketed as \"open\" as functionally identical.",
              "looks": "You assume a model is unrestricted because a competitor's model with a similar-sounding license was.",
              "why": "MIT and a vendor's own \"Modified MIT\" are not the same document — one has zero conditions, the other adds one at scale.",
              "fix": "Name the specific license, not the word \"open,\" every time you evaluate a model.",
              "cost": "medium"
            },
            {
              "mistake": "Skipping the usage-threshold check because your product is small today.",
              "looks": "Nobody on the team can name the exact user count or revenue figure where the license's terms change.",
              "why": "A cap like Llama 3's doesn't announce itself when you cross it — it just sits in a document nobody reopens after the integration ships.",
              "fix": "Write the exact number down in your own compliance tracking the day you adopt the model, not the day you might hit it.",
              "cost": "high"
            },
            {
              "mistake": "Missing the field-of-use restriction on training other models.",
              "looks": "Your team runs a distillation or synthetic-data pipeline off a model's outputs without checking whether the license allows it.",
              "why": "This is the exact clause some licenses write in, and it's invisible if you only search the text for a user-count number.",
              "fix": "Read the full grant section for language about training, improving, or building competing models — not just the pricing-style thresholds.",
              "cost": "medium"
            },
            {
              "mistake": "Assuming a license checked on a past release still applies.",
              "looks": "You cite terms you remember from an earlier version of the model instead of the one you're about to pull.",
              "why": "Hunyuan Hy3 carried a geo-restricted custom license in April and a plain Apache 2.0 grant in July — same lab, same model family, different answer ten weeks apart.",
              "fix": "Re-open the LICENSE file at every version bump. A prior check is not evidence for the current one.",
              "cost": "medium"
            }
          ]
        }
      },
      {
        "type": "p",
        "text": "None of this is abstract for this beat specifically: a license's field-of-use clause is the same territory as the [distillation](/dictionary) dispute this newsroom has covered directly — Washington's [unproven accusation that Moonshot distilled Anthropic's models to build Kimi K3](/article/white-house-moonshot-fable-distillation-accusation) turns on exactly the question a license's training-restriction clause is meant to settle in advance: whose outputs can legally train whose next model. {{note: A license with no field-of-use restriction doesn't make an unauthorized-access claim like that one go away — it only settles what you're allowed to do with a model you already have lawful access to.}} If the next question is whether to self-host the model at all once its license clears, [our guide to deciding between self-hosting and an API](/article/self-host-or-api-how-to-decide) picks up from here.",
        "citation_urls": []
      }
    ],
    "sources": [
      {
        "label": "Meta — Llama 3 Community License",
        "url": "https://developer.meta.com/ai/llama3/license/",
        "primary": true
      },
      {
        "label": "DeepSeek-V4-Pro — Hugging Face LICENSE file",
        "url": "https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro/blob/main/LICENSE",
        "primary": true
      },
      {
        "label": "Kimi-K2-Instruct — Hugging Face LICENSE file",
        "url": "https://huggingface.co/moonshotai/Kimi-K2-Instruct/raw/main/LICENSE",
        "primary": true
      },
      {
        "label": "Tencent — Hy3 model card (license: apache-2.0)",
        "url": "https://huggingface.co/tencent/Hy3",
        "primary": true
      },
      {
        "label": "Digital Applied — \"Tencent's Hunyuan Hy3: Open-Weight Reasoning Arrives\" (April preview license history)",
        "url": "https://www.digitalapplied.com/blog/tencent-hunyuan-hy3-open-weight-reasoning-model-2026"
      },
      {
        "label": "VentureBeat — \"Tencent's Apache-licensed Hy3 takes on GLM-5.2 at half the size\"",
        "url": "https://venturebeat.com/technology/tencents-apache-licensed-hy3-takes-on-glm-5-2-at-half-the-size-and-wins-everywhere-except-coding"
      }
    ],
    "corrections": []
  },
{
    "id": "g12",
    "slug": "check-whether-an-image-is-ai-generated",
    "image": "assets/img/newsroom/g12.jpg",
    "title": "How to check whether an image is AI-generated",
    "dek": "Google Earth's own image tool watermarked every fake blast crater and staged protest it produced in July 2026 — and almost nobody checked before sharing. Two real, independent systems can tell you what a lab's own tool won't: a signed Content Credentials manifest, and a pixel-level watermark. Here's the order to check them in, and what neither one proves.",
    "persona": "nova-reyes",
    "section": "Guide",
    "format": "guide",
    "publishedAt": "2026-08-20T17:15:00Z",
    "readMins": 5,
    "sample": false,
    "disclaimer": "none",
    "tldr": [
      "Check for a signed C2PA Content Credentials manifest first — it names the generating tool directly.",
      "Google's SynthID watermark survives cropping and compression; check it via Gemini or Chrome's right-click tool.",
      "A screenshot or repost strips the file's metadata before you ever see it — get the original file.",
      "OpenAI's images have carried C2PA metadata since February 2024; SynthID now covers its images too.",
      "Caveat: no watermark found doesn't mean a photo is real — it only means this check found nothing."
    ],
    "applyType": "work",
    "apply": [
      {
        "label": "Before you reshare anything that reads as a live event, run the two-minute version: C2PA, then SynthID.",
        "text": "verify.contentauthenticity.org and the Gemini app each cost you one file upload. That's cheaper than being the account that spread a fake blast crater."
      },
      {
        "label": "If you only ever have a screenshot, skip the metadata checks and go straight to reverse image search.",
        "text": "Google Images or TinEye works from the pixels alone, which is the one method a stripped screenshot can't defeat."
      },
      {
        "label": "Say what you actually found, not what you conclude from it.",
        "text": "\"No SynthID watermark\" is a fact. \"So it's a real photo\" is a guess — keep the two separate out loud, especially if you're the one about to share it further."
      }
    ],
    "body": [
      {
        "type": "p",
        "text": "On July 30, 2026, Google turned on an AI image generator inside Google Earth's web app: zoom into any point on the map, type a prompt, and get a photorealistic scene rendered onto that location's own satellite and terrain data. By July 31 the feature was gone. Screenshots had already spread of a fabricated blast crater over a real Los Angeles address and a staged protest outside Google's own Mountain View headquarters — neither event real, both built on genuine reference imagery of a genuine place. [The full rollback](/article/google-earth-ai-image-tool-rollback) happened in under 24 hours. Every image the tool produced carried an invisible Google SynthID watermark the entire time — nobody checked before sharing, because almost nobody knows the check exists. That's the actual gap this guide closes: not spotting a fake by eye, which gets harder every month, but knowing which real systems can tell you something concrete, and in what order to check them.",
        "citation_urls": [
          "https://www.engadget.com/2228142/google-rolls-back-the-needless-ai-generation-tools-it-added-to-google-earth/",
          "https://x.com/googleearth/status/2082818165503902043"
        ]
      },
      {
        "type": "h2",
        "text": "Two different systems, and who's actually in them",
        "citation_urls": []
      },
      {
        "type": "p",
        "text": "Two unrelated mechanisms currently do this work, and knowing which one you're looking for changes where you check. __Content Credentials__, built on the __C2PA__ standard, are a cryptographically signed manifest embedded in the file itself — a record of what tool made it, whether generative AI was involved, and what's been done to it since. The coalition's steering committee includes Adobe, Microsoft, Meta, Sony, the BBC, [Google](/company/google), and [OpenAI](/company/openai), which has embedded this metadata in every DALL·E 3 and ChatGPT image since February 6, 2024. __SynthID__ is a separate thing entirely: an invisible pattern Google embeds directly into the pixels — and, separately, the audio — of AI-generated content at the moment of creation, built to survive cropping, filters, and recompression in a way file metadata cannot. Since a May 2026 partnership, OpenAI's own image outputs carry both, layered on top of each other. [Anthropic takes a third approach again](/article/anthropic-claude-invisible-watermark-global-rollout): Claude's generated images and code files get signed C2PA metadata like OpenAI's, but Claude's generated *text* gets an entirely different, invisible pattern of its own. ==There is no single universal watermark== — only a handful of lab-specific systems that happen to overlap on images.",
        "citation_urls": [
          "https://petapixel.com/2024/02/08/ai-images-generated-on-dall-e-now-contain-the-content-authenticity-tag/",
          "https://c2pa.org/",
          "https://winbuzzer.com/2026/05/20/openai-adds-support-for-googles-synthid-watermarks-xcxwbn/"
        ]
      },
      {
        "type": "procedure",
        "procedure": {
          "kicker": "DO IT",
          "title": "Check an image in this order",
          "sub": "Five to ten minutes, and you don't need to install anything.",
          "est": "10 min",
          "level": "Beginner",
          "track": true,
          "prereqs": [
            "The image file itself — not a screenshot of it, if you can help it.",
            "A browser."
          ],
          "steps": [
            {
              "do": "Get the original file, not a screenshot or repost.",
              "detail": "Download the actual image rather than working from a screenshot, a social-media repost, or a pasted-in copy. Both C2PA metadata and, to a lesser extent, SynthID's watermark can be damaged or destroyed by a re-save.",
              "verify": "You have a file you downloaded directly, with its original filename and extension intact.",
              "ifnot": "If only a screenshot exists, skip straight to reverse image search below — the metadata check has nothing left to read."
            },
            {
              "do": "Check for a Content Credentials manifest.",
              "detail": "Open verify.contentauthenticity.org and drop the file in. If a manifest exists, it names the generating tool and shows what's been done to the file since.",
              "verify": "The tool returns a manifest naming a specific application, or explicitly reports none was found.",
              "ifnot": "No manifest doesn't mean the image is real — plenty of real cameras and plenty of AI tools never attach one. Move to the next check."
            },
            {
              "do": "Check for a SynthID watermark.",
              "hi": true,
              "detail": "Upload the file to the Gemini app and ask whether it was created or altered by Google AI, or use Chrome's right-click \"Was this generated with AI?\" option if you're viewing it in-browser.",
              "verify": "You get a direct answer about a Google-family watermark, one way or the other.",
              "ifnot": "SynthID only ever confirms Google's own tools, and OpenAI's since their 2026 partnership — a clean result here says nothing about Midjourney, Grok, or any other generator."
            },
            {
              "do": "Run a reverse image search.",
              "detail": "Search Google Images or TinEye for the exact file. If the same image already exists online, attached to a different, older, real story, that settles it regardless of what any watermark check returned.",
              "verify": "You know whether this exact image, or a close crop of it, has a prior, dated appearance online.",
              "ifnot": "No prior hit doesn't confirm the image is new or fake — it only means this particular search didn't find one."
            },
            {
              "do": "State your confidence in the same terms the tools gave you.",
              "detail": "\"A signed manifest names Google's Imagen\" is a fact. \"No watermark, so it's probably real\" is a guess dressed as a finding.",
              "verify": "Whatever you conclude, you can point to which specific check produced it.",
              "ifnot": "If every check came back empty, the honest answer is \"unresolved,\" not \"real.\""
            }
          ]
        }
      },
      {
        "type": "p",
        "text": "Which of those five steps to start on depends on what you're actually holding — a link, a download, or a screenshot someone already sent you.",
        "citation_urls": []
      },
      {
        "type": "decide",
        "decide": {
          "kicker": "WHAT YOU HAVE",
          "title": "Start where the evidence still exists",
          "question": "Take the branch matching what you're actually holding.",
          "branches": [
            {
              "when": "You have the original file, downloaded directly from where it was posted.",
              "then": "Run the C2PA check first, then the SynthID check — both have real data to read.",
              "because": "This is the only case where every check in the ladder still has something to work with.",
              "hi": true
            },
            {
              "when": "You only have a screenshot, a repost, or a pasted-in copy.",
              "then": "Skip straight to a reverse image search and treat any metadata check as unreliable.",
              "because": "A screenshot strips embedded file metadata outright; a repost through most social platforms strips or re-encodes it too."
            },
            {
              "when": "You know which specific AI product made it — a Gemini, ChatGPT, or Claude output someone showed you directly.",
              "then": "Go straight to that lab's own check: the Gemini app for SynthID, verify.contentauthenticity.org for a C2PA manifest.",
              "because": "Skipping to the one system that actually applies to this tool saves the other steps."
            },
            {
              "when": "Every check comes back empty and you still need an answer.",
              "then": "Say so plainly: unresolved, not confirmed real.",
              "because": "None of these systems certify authenticity — they only ever confirm a specific tool's own involvement when one of them finds a match.",
              "warn": "A confident-sounding conclusion built on an absence of evidence is the exact failure mode this whole check exists to prevent."
            }
          ]
        }
      },
      {
        "type": "h2",
        "text": "The two mechanisms, side by side",
        "citation_urls": []
      },
      {
        "type": "compare",
        "compare": {
          "kicker": "WHICH SIGNAL, WHAT IT'S WORTH",
          "title": "C2PA and SynthID answer different questions",
          "columns": [
            { "label": "C2PA / Content Credentials", "sub": "signed file metadata" },
            { "label": "SynthID", "sub": "pixel-level watermark", "hi": true },
            { "label": "Reverse image search", "sub": "prior-publication check" }
          ],
          "rows": [
            { "label": "What it actually checks", "values": ["A manifest embedded in the file, naming the tool and edit history", "A statistical pattern embedded in the pixels or audio at creation", "Whether this exact image has a prior, dated appearance online"] },
            { "label": "Survives a screenshot or re-save", "values": ["No — screenshotting and most re-saves strip it", "Often, by design — built to survive cropping and recompression", "Not applicable — works from the pixels, not a file's history"] },
            { "label": "Where to check it", "values": ["verify.contentauthenticity.org", "The Gemini app, or Chrome's right-click check", "Google Images or TinEye"] },
            { "label": "What a clean result actually proves", "values": ["That specific tool was involved, if the manifest is present and unaltered", "That Google's (or OpenAI's) generator was involved, if a match is found", "That this image, or a close match, existed before now"] }
          ],
          "source": "Content Authenticity Initiative (verify.contentauthenticity.org); Google DeepMind SynthID documentation — both read directly, current as of August 2026."
        }
      },
      {
        "type": "p",
        "text": "None of these three replace judgment — they narrow it. A signed C2PA manifest naming a real generator is about as strong as this kind of evidence gets; a SynthID hit is nearly as strong for the labs it covers; a reverse-image match settles the question outright by proving the image already existed as something else. But all three can come back with nothing, and \"nothing\" is not the same finding as \"clean.\" The apps generating [nudify deepfakes that San Francisco ordered off the app stores](/article/san-francisco-orders-apple-google-remove-nudify-apps) in July 2026 don't run through OpenAI's or Google's pipelines, and their output carries none of these signals — which is exactly why the absence of a watermark can never be read as reassurance.",
        "citation_urls": [
          "https://techcrunch.com/2026/07/17/apple-and-google-ordered-to-purge-nudify-apps-from-app-stores/"
        ]
      },
      {
        "type": "h2",
        "text": "Where this check breaks",
        "citation_urls": []
      },
      {
        "type": "pitfalls",
        "pitfalls": {
          "kicker": "WHAT GOES WRONG",
          "title": "Five ways this check gets called done when it isn't",
          "items": [
            {
              "mistake": "Running the check on a screenshot instead of the original file.",
              "looks": "The C2PA check reports no manifest found, and that gets read as \"so it's real.\"",
              "why": "A screenshot never carried the manifest in the first place — the platform's own re-encoding strips it before you ever see the image.",
              "fix": "Track down the original file or post before concluding anything from a metadata check.",
              "cost": "high"
            },
            {
              "mistake": "Treating a clean SynthID result as proof an image is untouched.",
              "looks": "No watermark found, so the image gets forwarded as verified.",
              "why": "SynthID only ever confirms Google's own tools, and OpenAI's since their 2026 partnership — a Midjourney, Grok, or Stable Diffusion image will never trigger it, watermarked or not.",
              "fix": "Name which specific tool's watermark you checked for, not \"AI\" in general.",
              "cost": "high"
            },
            {
              "mistake": "Assuming a signed C2PA manifest means the underlying scene is true.",
              "looks": "A manifest confirms a photo came from a real camera, and that alone gets treated as confirming the event it depicts.",
              "why": "C2PA records tool history, not truth — a real camera can photograph a staged scene, and a manifest happily signs that too.",
              "fix": "Read what the manifest actually asserts (capture, edit, AI-generation) rather than what you assume it implies.",
              "cost": "medium"
            },
            {
              "mistake": "Sharing before checking, because the platform's own preview looked convincing.",
              "looks": "A fabricated blast crater or a staged protest circulates for hours before anyone runs a single check.",
              "why": "Google Earth's own image tool watermarked every output it produced in July 2026, and the mark still didn't stop the fastest-spreading screenshots — nobody looked before sharing.",
              "fix": "Run the C2PA and SynthID checks before resharing something that reads as newsworthy, not after.",
              "cost": "high"
            },
            {
              "mistake": "Giving up after one check comes back empty.",
              "looks": "No manifest, so the reverse-image search and the SynthID check never happen.",
              "why": "Each of the three methods only covers part of the field — a gap in one says nothing about the others.",
              "fix": "Work the full ladder before declaring an image unresolved, not just clean or fake.",
              "cost": "medium"
            }
          ]
        }
      },
      {
        "type": "p",
        "text": "None of this makes spotting an AI image effortless — it makes it checkable, which is the more honest goal. The same habit applies one level over, on words instead of pixels: [our guide to checking whether text was written by AI](/article/check-whether-text-is-ai-written) walks the same C2PA/SynthID logic through prose, where the watermarks exist but the public checkers mostly don't yet. For claims rather than authorship, [our guide to catching an AI assistant when it's making things up](/article/catch-an-ai-making-things-up) is the one to reach for, and [the dictionary](/dictionary) has short entries for every term used here — manifest, watermark, provenance — if any of it needs unpacking further.",
        "citation_urls": []
      }
    ],
    "sources": [
      { "label": "C2PA — coalition overview and steering committee", "url": "https://c2pa.org/", "primary": true },
      { "label": "Content Authenticity Initiative — Content Credentials verifier", "url": "https://verify.contentauthenticity.org/", "primary": true },
      { "label": "Google DeepMind — SynthID", "url": "https://deepmind.google/models/synthid/", "primary": true },
      { "label": "Google — \"SynthID Detector: a new portal to help identify AI-generated content\"", "url": "https://blog.google/innovation-and-ai/products/google-synthid-ai-content-detector/", "primary": true },
      { "label": "PetaPixel — \"AI Images Generated on DALL-E Now Contain the Content Authenticity Tag\"", "url": "https://petapixel.com/2024/02/08/ai-images-generated-on-dall-e-now-contain-the-content-authenticity-tag/" },
      { "label": "Winbuzzer — \"OpenAI Adopts Google SynthID Watermarks for AI Image Detection\"", "url": "https://winbuzzer.com/2026/05/20/openai-adds-support-for-googles-synthid-watermarks-xcxwbn/" },
      { "label": "Yahoo Tech — Google SynthID comes to Chrome, Search, and ChatGPT", "url": "https://tech.yahoo.com/ai/gemini/articles/google-synthid-comes-chrome-search-174500591.html" },
      { "label": "Engadget — Google rolls back its Google Earth AI image tool", "url": "https://www.engadget.com/2228142/google-rolls-back-the-needless-ai-generation-tools-it-added-to-google-earth/" },
      { "label": "TechCrunch — Apple and Google ordered to purge nudify apps from app stores", "url": "https://techcrunch.com/2026/07/17/apple-and-google-ordered-to-purge-nudify-apps-from-app-stores/" }
    ],
    "corrections": []
  },
{
    "id": "g13",
    "slug": "check-whether-text-is-ai-written",
    "image": "assets/img/newsroom/g13.jpg",
    "title": "How to check whether text was written by AI",
    "dek": "Anthropic began weaving an invisible watermark into everything Claude writes this month, with no way to opt out — the kind of real, checkable signal that sounds like it finally settles the question. It doesn't, yet: no lab has shipped a public tool to read the mark, and the detectors people already use instead guess from writing style, with a documented history of getting it wrong. Here's what each system can and can't actually tell you.",
    "persona": "samira-nasser",
    "section": "Guide",
    "format": "guide",
    "publishedAt": "2026-08-21T16:42:00Z",
    "readMins": 6,
    "sample": false,
    "disclaimer": "none",
    "tldr": [
      "Anthropic and Google now weave real watermarks into AI-generated text — but neither offers a public checker yet.",
      "Third-party detectors like GPTZero and Turnitin don't read a watermark — they guess from writing style.",
      "Those guessing tools misclassify non-native English writing as AI-generated far more than native writing.",
      "OpenAI's own 2023 detector correctly caught only 26% of AI text and wrongly flagged 9% of human writing.",
      "Caveat: no tool here proves human authorship — a clean result only means this check found nothing."
    ],
    "applyType": "work",
    "apply": [
      {
        "label": "Before you act on a detector's score, check what it actually measured.",
        "text": "A GPTZero or Turnitin percentage is a style-based guess, not a watermark read — treat one flag as a reason to ask, not a verdict."
      },
      {
        "label": "Watch for Anthropic's and Google's own detection tools to actually ship.",
        "text": "Anthropic's help center says it is only \"working to enable\" third-party detection, with no date; Google's SynthID Detector has listed text as \"coming\" since May 2025."
      },
      {
        "label": "If you're grading or judging someone else's writing, require a second signal before any penalty.",
        "text": "A Stanford study found these detectors misclassify non-native English writing as AI-generated far more often than native writing — a score alone is not due process."
      },
      {
        "label": "Keep the original file or version history when provenance might matter later.",
        "text": "Google Docs' Version History or Word's Track Changes is harder to fake after the fact than any detector score."
      }
    ],
    "body": [
      {
        "type": "p",
        "text": "Every reply Claude writes has carried an invisible signature since Aug. 2, 2026 — [Anthropic](/company/anthropic) wove a __watermark__ into the output of every model it released from that date on, worldwide, with **no way to turn it off**. It's the kind of real, checkable signal a reader might assume finally answers the question a search bar gets asked constantly: is this AI? It doesn't, not yet. Anthropic's own mark has no public reader anyone outside the company can use, [Google](/company/google)'s equivalent for Gemini is stuck in a year-plus-old journalist waitlist, and the tools most people already reach for instead — GPTZero, Turnitin, the free checkers a search turns up — don't read a watermark at all. ==They guess.== Knowing which of those three things you're actually looking at, and what each one has and hasn't earned the right to tell you, is the actual gap this guide closes.",
        "citation_urls": [
          "https://support.claude.com/en/articles/16266773-how-claude-marks-ai-generated-content",
          "https://techcrunch.com/2026/08/11/anthropic-says-it-will-watermark-text-generated-by-its-ai-models/",
          "https://blog.google/innovation-and-ai/products/google-synthid-ai-content-detector/"
        ]
      },
      {
        "type": "h2",
        "text": "Two different kinds of evidence, and only one of them is checkable today",
        "citation_urls": []
      },
      {
        "type": "p",
        "text": "__Watermarking__ and __detecting__ solve different problems, and the industry has spent three years proving it can build one far more easily than the other. A watermark is planted by the model itself at the moment it writes — Claude and Gemini both work by subtly steering word choices toward a pattern only the lab's own key can read back out, the same trick Google's SynthID uses on images. That's real, mathematically grounded evidence, ==if you can actually get a machine to check it for you==. A detector instead looks at finished text from an unknown source and estimates, statistically, how AI-shaped its phrasing is — no key, no cooperation from whichever model wrote it, ++just a guess++. [OpenAI](/company/openai) has tried building both, and its own history is the cleanest evidence of how far apart they sit: it shipped a detector in January 2023 and **killed it seven months later over accuracy**, then reportedly built a watermark accurate to 99.9% of its own output — and has kept it unreleased for two years over who it might falsely implicate.",
        "citation_urls": [
          "https://openai.com/index/new-ai-classifier-for-indicating-ai-written-text/",
          "https://techcrunch.com/2023/07/25/openai-scuttles-ai-written-text-detector-over-low-rate-of-accuracy/",
          "https://www.infosecurity-magazine.com/news/openai-split-ai-watermarking/"
        ]
      },
      {
        "type": "procedure",
        "procedure": {
          "kicker": "DO IT",
          "title": "Check a piece of text in this order",
          "sub": "Five to ten minutes, and you don't need to install anything.",
          "est": "10 min",
          "level": "Beginner",
          "track": true,
          "prereqs": [
            "The text in question — ideally the original file or a live link, not a screenshot.",
            "A browser."
          ],
          "steps": [
            {
              "do": "Ask the person who wrote it, if you can.",
              "detail": "The fastest and most reliable check is also the easiest one to skip: ask directly, or ask to see the drafting process — an outline, a messy first pass, a version with mistakes still in it.",
              "verify": "You get a direct answer, or you see real evidence of a drafting process.",
              "ifnot": "If there's no one to ask — an anonymous submission, a stranger's post — move to the next check."
            },
            {
              "do": "Check for a real edit or version history.",
              "hi": true,
              "detail": "Google Docs' Version History and Word's Track Changes both show whether a document grew in increments over time or arrived as one finished paste.",
              "verify": "You can see incremental edits building up, or a single instant paste-in.",
              "ifnot": "If no history exists — a printed page, a plain text file, a screenshot — move to the next check."
            },
            {
              "do": "Find out whether the source platform embeds a real watermark, and whether anyone can check it yet.",
              "detail": "As of August 2026, Claude and Gemini both weave an invisible pattern into the words they generate at the moment of creation — but neither lab has shipped a public tool for a reader to check it. Anthropic's own help center says it is only \"working to enable\" third-party detection, with no date; Google's SynthID Detector is limited to a waitlist for journalists and researchers, over a year after it opened.",
              "verify": "You know which model is suspected and whether that lab has actually released a public checker (currently: neither has).",
              "ifnot": "If the platform is unknown or hasn't published anything about watermarking its text, there's nothing here to check yet — go to the next step."
            },
            {
              "do": "If you use a third-party \"AI detector,\" treat the score as a guess, not a verdict.",
              "detail": "Tools like GPTZero, Turnitin, and Originality.ai don't read any lab's watermark — they estimate a probability from writing style, which is a fundamentally weaker kind of evidence. A Stanford study found these detectors misclassified non-native English writing as AI-generated far more often than native English writing.",
              "verify": "You can name the specific tool used and its documented error pattern, not just cite \"the AI checker.\"",
              "ifnot": "If the score conflicts with everything else you've found — a direct answer, a real edit history — weight the human evidence higher."
            },
            {
              "do": "State your confidence in the same terms the tools actually gave you.",
              "detail": "\"GPTZero returned an 85% AI-likelihood score\" is a fact. \"So this was written by AI\" is a guess wearing the first sentence's clothes — especially given how often that first sentence is wrong.",
              "verify": "Whatever you conclude, you can point to the specific check that produced it.",
              "ifnot": "If every check comes back inconclusive, the honest answer is \"unresolved,\" not \"human\" or \"AI.\""
            }
          ]
        }
      },
      {
        "type": "p",
        "text": "Which of those checks matters most depends on the situation — grading a student's essay carries different stakes than wondering about a stranger's post, and the order worth working through them changes accordingly.",
        "citation_urls": []
      },
      {
        "type": "decide",
        "decide": {
          "kicker": "THE SITUATION",
          "title": "Start where the real evidence is",
          "question": "Take the branch matching what you're actually checking.",
          "branches": [
            {
              "when": "You can ask the person directly, and they're willing to answer.",
              "then": "Ask, and ask to see a version history or earlier draft if the stakes are real — a grade, a byline, an accusation.",
              "because": "This is the only check with a real person behind it instead of a statistical guess.",
              "hi": true
            },
            {
              "when": "You're grading or judging someone else's work and a detector flagged it.",
              "then": "Treat the flag as the start of a conversation, not the basis for a penalty, and look for a second, independent signal first.",
              "because": "The tools used for exactly this purpose misclassify non-native English writing at a documented, high rate — a single score is not due process."
            },
            {
              "when": "The text came from a named AI product someone showed you directly — a ChatGPT, Claude, or Gemini output.",
              "then": "Check that lab's own current documentation on what it marks, rather than running it through an unrelated third-party detector.",
              "because": "A generic detector wasn't built for that specific model's current output and adds noise, not signal, on top of what the lab itself already knows."
            },
            {
              "when": "Every check comes back inconclusive and you still need to say something.",
              "then": "Say so plainly: unresolved, not confirmed human or AI.",
              "because": "None of today's systems, lab-built or third-party, can certify authorship on demand — pretending otherwise is the actual failure mode here.",
              "warn": "A confident-sounding conclusion built on a guessing tool's score is worse than admitting the check came back empty."
            }
          ]
        }
      },
      {
        "type": "h2",
        "text": "What each system can actually tell you",
        "citation_urls": []
      },
      {
        "type": "compare",
        "compare": {
          "kicker": "WATERMARK VS. GUESS",
          "title": "Two mechanisms, answering different questions",
          "columns": [
            { "label": "Lab-embedded watermark", "sub": "Claude, Gemini" },
            { "label": "Third-party detector", "sub": "GPTZero, Turnitin, Originality.ai", "hi": true }
          ],
          "rows": [
            { "label": "What it actually measures", "values": ["A statistical pattern the model wove into its own word choices at generation time", "A guess about word predictability and sentence rhythm in text of unknown origin"] },
            { "label": "Public checker available today", "values": ["No — both labs describe detection tools as planned, not shipped, as of August 2026", "Yes — free and paid tools anyone can run right now"] },
            { "label": "Documented error pattern", "values": ["Untested at public scale; no independent accuracy figures published yet", "Misclassifies non-native English writing as AI-generated far more than native writing"] },
            { "label": "What a clean result actually proves", "values": ["Nothing yet checkable — there's no public reader of the mark to return a result", "That this specific tool's guess came back low — not that a human wrote it"] }
          ],
          "source": "Anthropic Help Center; Google SynthID Detector documentation; Liang et al., \"GPT detectors are biased against non-native English writers\" (arXiv:2304.02819) — current as of August 2026."
        }
      },
      {
        "type": "p",
        "text": "None of this makes the underlying question go away — it narrows what any given check is entitled to claim. A lab-embedded watermark, once a public reader for it exists, will be strong evidence for the model that planted it and silent on every other model. A clean detector score is weaker than most people treat it as, because the tools most people already reach for were never reading a watermark in the first place — they were reading style, on a false-positive rate that isn't evenly distributed: reporting on the Stanford study found real international students named and disputing flags from exactly this kind of tool, well before anyone had a watermark to check instead.",
        "citation_urls": [
          "https://themarkup.org/machine-learning/2023/08/14/ai-detection-tools-falsely-accuse-international-students-of-cheating"
        ]
      },
      {
        "type": "h2",
        "text": "Where this check goes wrong",
        "citation_urls": []
      },
      {
        "type": "pitfalls",
        "pitfalls": {
          "kicker": "WHAT GOES WRONG",
          "title": "Five ways this check gets called settled when it isn't",
          "items": [
            {
              "mistake": "Treating a detector's \"likely AI-generated\" score as proof.",
              "looks": "A single number becomes the whole basis for a grade, a rejection, or an accusation.",
              "why": "A Stanford study found these tools misclassify non-native English writing as AI-generated far more often than native English writing — a false-positive rate that high means the score alone tells you very little.",
              "fix": "Require a second, independent signal — a direct answer, a version history — before acting on a flag.",
              "cost": "high"
            },
            {
              "mistake": "Assuming that because no watermark checker exists, no watermark exists.",
              "looks": "\"I ran it through a detector and nothing showed up, so it's human.\"",
              "why": "Anthropic's and Google's built-in watermarks are real and live today — it's only the public reader for them that's missing, not the mark itself.",
              "fix": "Say \"unchecked,\" not \"unwatermarked,\" when no reader tool exists yet.",
              "cost": "medium"
            },
            {
              "mistake": "Working from a screenshot or a retyped copy instead of the live document.",
              "looks": "Someone forwards a paste of the text with no way to see how it was produced.",
              "why": "A copy like that carries no version history, and Anthropic's own documentation says its text watermark \"may persist through some editing\" but is not guaranteed to survive heavy rewriting — the two checks that actually work both need the original.",
              "fix": "Ask for the original file or a live link, not a copy of it.",
              "cost": "medium"
            },
            {
              "mistake": "Citing OpenAI's own retired classifier as proof that AI-text detection basically works.",
              "looks": "\"AI detectors exist, so this is a solved problem.\"",
              "why": "OpenAI shipped its own detector in January 2023 and pulled it seven months later after it correctly caught only 26% of AI text and wrongly flagged 9% of human writing — the lab most incentivized to get this right gave up on its own tool.",
              "fix": "Treat every detection claim, including a lab's own, as unproven until a real accuracy figure is published.",
              "cost": "medium"
            },
            {
              "mistake": "Letting a single tool's score be the only evidence in a decision that affects someone's grade, job, or reputation.",
              "looks": "A student is failed, an applicant is rejected, or a writer is publicly accused on one detector's output alone.",
              "why": "Universities have restricted or dropped these tools after exactly this happened to real students — the harm from a false positive is concrete and falls hardest on non-native English writers.",
              "fix": "Never let a detector score stand alone in a decision with real consequences for a real person.",
              "cost": "high"
            }
          ]
        }
      },
      {
        "type": "p",
        "text": "None of this makes catching AI-written text effortless — it makes the claim checkable, which is the more honest goal. [Our guide to checking whether an image is AI-generated](/article/check-whether-an-image-is-ai-generated) walks the same discipline for pictures, using two real watermark systems already in wide use; [the dictionary](/dictionary) has short entries for terms used here — watermark, hallucination, model weights — if any of it needs unpacking further. The story behind Anthropic's move, including why writers are objecting to it, [is here](/article/anthropic-claude-invisible-watermark-global-rollout).",
        "citation_urls": []
      }
    ],
    "sources": [
      { "label": "Anthropic Help Center — \"How Claude marks AI-generated content\"", "url": "https://support.claude.com/en/articles/16266773-how-claude-marks-ai-generated-content", "primary": true },
      { "label": "OpenAI — \"New AI classifier for indicating AI-written text\"", "url": "https://openai.com/index/new-ai-classifier-for-indicating-ai-written-text/", "primary": true },
      { "label": "Google — \"SynthID Detector: a new portal to help identify AI-generated content\"", "url": "https://blog.google/innovation-and-ai/products/google-synthid-ai-content-detector/", "primary": true },
      { "label": "Liang, Yuksekgonul, Mao, Wu, Zou — \"GPT detectors are biased against non-native English writers\" (arXiv:2304.02819)", "url": "https://arxiv.org/abs/2304.02819", "primary": true },
      { "label": "TechCrunch — \"Anthropic says it will watermark text generated by its AI models\"", "url": "https://techcrunch.com/2026/08/11/anthropic-says-it-will-watermark-text-generated-by-its-ai-models/" },
      { "label": "TechCrunch — \"OpenAI scuttles AI-written text detector over low rate of accuracy\"", "url": "https://techcrunch.com/2023/07/25/openai-scuttles-ai-written-text-detector-over-low-rate-of-accuracy/" },
      { "label": "Infosecurity Magazine — \"OpenAI Leadership Split About In-House AI Watermarking Technology\"", "url": "https://www.infosecurity-magazine.com/news/openai-split-ai-watermarking/" },
      { "label": "The Markup — \"AI Detection Tools Falsely Accuse International Students of Cheating\"", "url": "https://themarkup.org/machine-learning/2023/08/14/ai-detection-tools-falsely-accuse-international-students-of-cheating" }
    ],
    "corrections": []
  }
];
