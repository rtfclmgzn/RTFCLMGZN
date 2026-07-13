# RTFCLMGZN — Agent System Design
Companion document to `RTFCLMGZN_Business_Blueprint.pdf`. This is the approved agent org chart, roles, and pipeline. Design only — no implementation yet.

Approved 2026-07-09.

---

## 1. Hierarchy

```
Level 0   AI Editor-in-Chief (autonomous) final call on flagged stories: publish · remediate · spike
Level 1   Founding Desk (2 agents)       Business-Strategy · Operations/Staffing
Level 2   Managing Editor (1 agent)      quality bar + daily assignment + cross-persona consistency
Level 3   Persona Writer Agents (7)      the masthead
Level 4   Shared Production Services     Research · Verification · Style · Compliance · Publishing · Podcast · Social
```

Key principle carried through the whole design: **content is never tier-gated.** Free and paid readers see the same articles from the same personas. Plus/Pro tiers sell convenience and extras (ad-free reading, the PDF magazine issue, early podcast access, API access) — never exclusive editorial content. This means persona build order is driven by production readiness and beat coverage, not monetization sequencing.

---

## 2. Level 1 — Founding Desk (meta agent group)

| Agent | Role | Model |
|---|---|---|
| Business-Strategy Agent | Tracks competitive landscape, proposes new revenue lines/tiers, revisits financial assumptions against real traffic/revenue data | Opus |
| Operations/Staffing Agent | Owns the persona roster long-term — proposes new beats, retires/adjusts personas, evolves the pipeline itself | Opus |

Low volume, high judgment. Runs on a review cadence (e.g. monthly), not per-article.

## 3. Level 2 — Managing Editor (new layer)

One agent, Opus. Sits between Founding Desk and the writers. Responsibilities:

- Receives the day's news-cycle signal and assigns specific stories to the persona whose beat fits (tactical version of Founding Desk's strategic oversight)
- Sets format per story: brief / synthesis / deep dive
- Runs a **quality pass** on every draft before it reaches fact-check — checks voice consistency against the persona's brief, flags beat overlap between personas, flags underweight/rushed pieces
- Escalates to Founding Desk only when a structural issue recurs (a beat is consistently overloaded, a persona's voice is drifting, coverage gaps appear)

This is the layer that keeps 7 independently-voiced agents reading as one coherent, professional masthead rather than seven inconsistent streams.

## 4. Level 3 — Persona Writer Agents (7)

All Sonnet-driven, house style + persona brief cached as system prompt (prompt caching per Section 8.1 of blueprint).

| Persona | Beat | Voice | Topic share | Compliance sensitivity |
|---|---|---|---|---|
| Sage Okafor | Frontier labs & model releases | Analytical, measured, hype-averse | 55% (AI core) | Standard |
| Nova Reyes | Consumer AI & culture | Energetic, conversational | within AI core / broader tech | Standard |
| Jin Park | Chips, compute & quantum | Technical, detail-obsessed | 30% broader tech + 2% quantum | Standard |
| Marcus Webb | Policy, regulation & geopolitics | Formal, dry, careful with claims | 4% world/policy | **High** — defamation/geopolitics |
| Dr. Priya Anand | AI in health & biotech | Precise, cautious, evidence-first | 4% health | **High** — medical-advice liability |
| Ronan Cole | Markets, crypto & AI business | Brisk, numbers-driven | 5% crypto | **High** — financial-advice liability |
| Ash Lindqvist | Robotics & hardware | Curious, hands-on | within broader tech | Standard |

All 7 build in one wave. Each needs a full persona brief before build (voice, opening habit, recurring structure, boundaries — template in blueprint Section 14.1). "High" sensitivity personas route through Compliance → AI Editor-in-Chief more frequently by design; their writing quality bar is identical to the rest.

## 5. Level 4 — Shared Production Pipeline

Every piece of content — regardless of persona — passes through the same nine stages:

| # | Stage | Agent | Model |
|---|---|---|---|
| 1 | Assignment | Managing Editor | Opus |
| 2 | Research | Research Agent | Sonnet |
| 3 | Draft | Persona Writer Agent | Sonnet |
| 4 | Quality pass | Managing Editor | Opus |
| 5 | Fact-check | Verification Agent | Opus |
| 6 | Copyedit | Style Agent | Haiku |
| 7 | Risk screen | Compliance Agent → **autonomous AI Editor-in-Chief** | Haiku (flag) + Opus (adjudicate) |
| 8 | Publish | Publishing Agent | Haiku |
| 9 | Repurpose | Podcast Agent, Social Agent | Sonnet (script) + ElevenLabs (voice) |

The stage-7 adjudication is non-negotiable — it is the single highest-leverage control against hallucination and defamation risk (per blueprint Section 5.4 and 11.1) — but it is now performed by an **autonomous AI Editor-in-Chief**, not a human. It publishes, remediates-then-publishes, or spikes each flagged piece on its own. The newsroom is fully autonomous; no human is in the publishing loop.

---

## 6. Open items for next round (not yet decided)

- Full persona briefs for the 6 personas beyond Sage Okafor's sample (blueprint Section 14.1 has the template)
- House style guide and compliance rulebook content
- Whether Managing Editor and Founding Desk are separate model contexts/agents or a single agent operating at two altitudes — a technical/implementation decision, deferred until build phase
- Actual implementation path (Claude Code subagents, custom orchestration, etc.) — deferred per your "design only" scope call
