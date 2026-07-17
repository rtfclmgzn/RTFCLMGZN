# RTFCLMGZN — open questions & roadmap notes (July 16 2026)

Answers to the three `(ask?)` items on the overhaul list, plus the Primer 000
outline. Written for review, not yet actioned.

---

## 1. Cloudflare cron — what it can and can't run

**Short version: the article pipeline cannot run on Cloudflare. Scheduling it is
a local-machine setting that already exists.**

The newsroom pipeline is local Python (`newsroom.cli`) with a SQLite database,
a git working tree, and a local Release Manager that commits and pushes. A
Cloudflare Worker has none of those — no filesystem, no git, no Python, no
subprocess. So:

- **5×/day article generation + publishing** — stays local. It's already built;
  it just needs the schedule turned on. `python -m newsroom.cli enable-schedule`
  registers a Windows Task Scheduler job (`newsroom/autonomy/scheduler.py`).
  For five runs a day, either set the interval to ~288 minutes or add explicit
  daily times. This machine has to be on for it to run. **I can wire this up on
  request** — it touches the autopilot config, so I'd rather you say go first.
- **OpenAI API** — yes, callable from a Worker in principle. But the value isn't
  the API call; it's the Python orchestration around it (schema-bound output,
  budget ledger, discovery, dedupe, the 12-stage pipeline). Porting that to JS
  is a rewrite, not a config change.
- **Buzz + Scoreboard auto-update** — these are hand-maintained data files today
  (`web/data/buzz.js`, `web/data/scoreboard.js`); there is no generator. Two
  paths:
  - *Local (recommended, consistent with everything else):* generate them in the
    same Python pipeline and publish via the Release Manager. The Scoreboard is
    now half-done — the Publishing agent is trained to ship a `scoreboard.js`
    delta whenever a published story moves a model's price/status/index (this
    session). A scheduled local job could also do a standalone benchmark refresh.
  - *Cloudflare Worker cron:* technically possible if the Worker commits via the
    GitHub API and pulls from a data source (e.g. Artificial Analysis). This is
    net-new code and a second source of truth. Only worth it if you want updates
    while your machine is off.

**Existing edge code, for reference:** the only Cloudflare Function in the repo
is `web/functions/api/tts.js`, an ElevenLabs text-to-speech proxy. So a Worker
*can* live here — it's just that the article engine isn't portable to one.

**Recommendation:** keep generation local; turn on the 5×/day schedule; let the
Scoreboard ride the publish pipeline (already trained). Revisit a Worker only if
"updates while the PC is off" becomes a hard requirement.

---

## 2. Primer 000 rebuild — curriculum outline

Goal (from the todo): make the Primer far more thorough — a true zero-to-fluent
guide, so that by the back cover a newcomer is genuinely caught up on the AI
world. Issue 001's spec unlocks the missing capability: **multi-page "runover"
features** (the Primer currently uses mostly single spreads). No renderer work
needed — this is content authoring: ~55–60 spreads, ~35 images (source ~half
from the new art library to hold cost down).

Structure — five acts, each a multi-spread feature with a worked example, a
"try it tonight" box, and a plain-English recap:

**ACT I — What Is This Thing? (8–10 spreads)**
- What an AI model actually is (prediction, not a mind) — the autocomplete
  analogy done properly
- Training vs. inference — the two halves, in kitchen terms
- Tokens, context, and why the model "forgets"
- What "parameters" and "weights" mean without math
- Why it hallucinates — the single most important concept for a newcomer
- Worked example: the same prompt, four ways, watching quality change

**ACT II — The Big Bang & the Climb (8–10 spreads)**
- The transformer moment and why 2022 was the hinge
- The four-year climb: capability, cost, and adoption curves
- What changed each year, told as a timeline a newcomer can hold
- The scaling bet — bigger, and the argument about whether it keeps working
- Where we actually are in mid-2026 (honest, not breathless)

**ACT III — The Players (10–12 spreads)**
- The labs that matter and what each is known for (OpenAI, Anthropic, Google,
  Meta, xAI, plus the open-weight and Chinese tiers)
- The model families and tiers — flagship/mid/budget, and why menus exist
- The face-off: how to actually compare them (link the live Scoreboard)
- Who's who: a plain map of the money and the alliances
- "Which one for you" — a decision flow by use case

**ACT IV — Speak the Language (10–12 spreads)**
- The 12 (now 20+) words that unlock any AI headline — expanded glossary
- Reading a benchmark without being fooled
- Prompting like briefing a colleague (adapt the existing Guide)
- Spotting a confident-wrong answer (adapt the existing Guide)
- Agents, RAG, fine-tuning, MCP — the next tier of vocabulary
- The honest page: what AI still can't do, stated plainly

**ACT V — Hands On & What's Next (8–10 spreads)**
- Six things to try tonight (expanded, with expected outcomes)
- Building a simple habit — where AI actually saves you time
- Safety, privacy, and what not to paste into a chatbot
- The near future: what to watch, what's hype
- Back-cover recap: the ten things you now understand

**Production notes**
- Reuse the existing `spread` reader; add `runover` multi-page features per the
  Issue-001 pattern.
- Regenerate the compiled PDF (`magazine/rtfclmgzn-the-primer-2026.pdf`) — this
  also clears the last "Dr. Priya" reference, which currently survives only
  inside that binary.
- ~35 images: pull ~half from `image-library/art` (per the new manifest), keep
  brand-visible images off any comparative spread.
- Estimate: a full focused session on its own.

---

## 3. "What else would make the site remarkable" — ranked ideas

Highest leverage first.

1. **Per-article share/OG images.** Right now every share falls back to one
   generic OG image. Auto-generating a per-article card (title + desk color +
   cover) would make every shared link look designed. Pairs perfectly with the
   Share button shipped this session.
2. **Email capture + weekly digest.** The single biggest growth lever a
   publication has and the site has no way to capture a returning reader. A
   simple "get the weekly briefing" with a generated digest page.
3. **Search upgrade.** The current search is a substring scan. A small
   client-side index (title/dek/body/tags) with ranked results and keyboard nav
   would make the archive feel like a real newsroom.
4. **Reading progress + "continue reading."** Persist scroll position and a
   read/unread state per article; a subtle home-page "pick up where you left
   off." Cheap, high retention value.
5. **Live model Scoreboard as a landing surface.** Now that it auto-updates,
   promote it — a always-current "state of the models" page is genuinely
   linkable and shareable, unlike most site pages.
6. **Performance & a11y pass.** Lazy-load images, preconnect tuning, a
   Lighthouse/axe sweep. The site is fast but not audited; discovery rewards it.
7. **"Today in AI" one-glance home strip.** A dense, scannable top-of-home
   band of the day's briefs — the thing a returning reader checks in 10 seconds.
8. **Author RSS + per-desk feeds.** Now that the masthead is nine sharp
   personas, per-editor and per-section feeds let readers follow a beat.
