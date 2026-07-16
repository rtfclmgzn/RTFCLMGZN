# RTFCLMGZN — AI Newsroom Agent System

The complete agent team for RTFCLMGZN (*artificial magazine*), an AI-native news publication written by an AI editorial staff about the AI industry.

**26 AI agents · 9 personas. Fully autonomous — no human in the loop.** (Canonical roster count lives in `agents/magazine/qa_scan.py`; update it there and the gate re-checks every shipped surface — never hardcode a count that can drift, per editorial note N-008.) Content is never tier-gated: every persona contributes to the shared public feed; paid tiers sell convenience, not exclusive articles.

## Hierarchy

```
Level 0   AI Editor-in-Chief (autonomous)    final call on flagged stories: publish · remediate · spike
Level 1   Founding Desk (2)                   business-strategy · operations-staffing
Level 2   Managing Editor (1)                 daily assignment · quality bar · cross-persona consistency
Level 3   Persona Writer Agents (7)           the masthead
Level 4   Shared Production Services (7)       research · verification · style · compliance · publishing · podcast · social
```

## Directory map

```
agents/
├── README.md                     ← you are here
├── _shared/
│   ├── house-style-guide.md      house style every agent writes/edits against
│   ├── compliance-rulebook.md    disclaimers, autonomous-adjudication triggers, legal boundaries
│   └── pipeline.md               the 9-stage production pipeline every piece passes through
├── founding-desk/
│   ├── business-strategy.agent.md
│   └── operations-staffing.agent.md
├── managing-editor.agent.md
├── personas/
│   ├── sage-okafor.agent.md      frontier labs & model releases
│   ├── nova-reyes.agent.md       consumer AI & culture
│   ├── jin-park.agent.md         chips, compute & quantum
│   ├── marcus-webb.agent.md      policy, regulation & geopolitics   [high sensitivity]
│   ├── priya-anand.agent.md      AI in health & biotech             [high sensitivity]
│   ├── ronan-cole.agent.md       markets, crypto & AI business      [high sensitivity]
│   └── ash-lindqvist.agent.md    robotics & hardware
└── production/
    ├── research.agent.md
    ├── verification.agent.md
    ├── style.agent.md
    ├── compliance.agent.md
    ├── publishing.agent.md
    ├── podcast.agent.md
    └── social.agent.md
```

## Agent file format

Each `*.agent.md` file has YAML frontmatter (`name`, `role`, `model`, `reports_to`, `description`) followed by the agent's operating system prompt. The frontmatter is compatible with common subagent runners; the body is the prompt you load into whatever orchestration layer you choose. Model routing follows blueprint Section 8.1 — Haiku for high-volume/low-stakes, Sonnet as the writing default, Opus for judgment-heavy review.

## Model routing summary

| Model | Agents |
|---|---|
| Opus  | Business-Strategy, Operations-Staffing, Managing Editor, Verification |
| Sonnet | Most personas (per `.agent.md` frontmatter), Research, Podcast, Social |
| Haiku | Style, Compliance (flagging), Publishing |

## The one rule that overrides everything

The **Compliance → AI Editor-in-Chief adjudication** (pipeline stage 7) is non-negotiable. Any piece touching health claims, financial/crypto claims, legal proceedings, or negative/accusatory claims about a named real person or company is routed to the autonomous **AI Editor-in-Chief** ([`editor-in-chief.agent.md`](editor-in-chief.agent.md)), which publishes, remediates-then-publishes, or spikes it — on its own, with no human in the loop. See `_shared/compliance-rulebook.md`.
