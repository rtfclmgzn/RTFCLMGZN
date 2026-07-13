# RTFCLMGZN — Orchestration Runbook

How the 18-agent newsroom actually runs. The `.agent.md` files define *who each agent is*; this file defines *how the operation runs* — triggering, cadence, state, escalation, cost control, and the autonomous adjudication that replaces any human gate. This is the layer that turns a roster into a publication.

---

## 1. The shared state object

Every story is one object that flows through the pipeline. Each agent **appends**; no agent deletes another's fields or flags.

```jsonc
{
  "story_id": "2026-07-09-frontier-xyz",
  "status": "assigned | researching | drafting | quality | factcheck | copyedit | compliance | remediated | spiked | published",
  "persona": "sage-okafor",
  "format": "brief | synthesis | research",
  "assignment": { "angle": "...", "topic_section": "AI", "priority": "breaking | standard" },
  "research_brief": { "primary_sources": [], "context_coverage": [], "key_facts": [], "the_gap": "", "open_questions": [] },
  "draft": "…persona-voiced prose…",
  "sources": [ { "claim": "", "url": "", "type": "primary | secondary" } ],
  "flags": [ { "stage": "verification", "claim": "", "status": "verified | unverified | contradicted", "note": "" } ],
  "compliance": { "triggers": [], "decision": "clear | remediate | spike", "editor_in_chief": null },
  "correction_log": [],
  "boilerplate": { "ai_disclosure": true, "byline": true, "disclaimer": "none | not-medical-advice | not-financial-advice" }
}
```

The `flags[]` and `compliance.triggers[]` arrays are what the AI Editor-in-Chief reads at stage 7. They are the audit trail.

---

## 2. Triggering — how a story starts

Three entry points, all landing at the **Managing Editor** for assignment:

1. **News-cycle monitor** (standing job of the Managing Editor + Research support): watches primary feeds — lab blogs, filings, regulatory dockets, earnings calendars, major-outlet breaking alerts. A qualifying event creates a story stub.
2. **Beat pitch**: a persona surfaces a story on its own beat; Managing Editor accepts/declines and sets format.
3. **Founding Desk directive**: a strategic priority (e.g. "we under-cover data-center economics") converts to standing assignments.

**Breaking vs. standard.** Breaking briefs run an expedited path (Research → Draft → Verification → Compliance → Publish) targeting minutes-to-low-hours; the Quality and Copyedit passes compress but never skip Verification or Compliance. Synthesis/research pieces run the full nine stages on the editorial calendar.

---

## 3. Daily cadence (MVP → Growth)

| Time block | What runs |
|---|---|
| Continuous | News-cycle monitor; breaking briefs published as events warrant |
| Morning | Managing Editor sets the day's assignment slate against the topic budget; personas + Research begin synthesis pieces |
| Midday | Drafts hit Quality → Fact-check → Copyedit; the AI Editor-in-Chief adjudicates any flagged pieces autonomously |
| Afternoon | Publish window for the day's synthesis pieces; Social repurposes as pieces go live |
| End of day | Managing Editor reviews coverage balance vs. the 55/30/5/4/4/2 budget; flags gaps for tomorrow |
| 2×/week | Podcast Agent assembles *The Brief*; 1×/week *The Deep Dive* |
| Weekly | Managing Editor compiles the paid magazine issue candidate list |
| Monthly | Founding Desk review: business-strategy + operations-staffing report to the business owner |

---

## 4. Autonomous adjudication (no human in the loop)

The publishing pipeline is **fully autonomous**. No human approves, holds, or clears any story. Stage-7 decisions are made by the **AI Editor-in-Chief** ([`editor-in-chief.agent.md`](editor-in-chief.agent.md)):

- **Adjudicate flagged pieces.** The AI Editor-in-Chief handles only the pieces the Compliance Agent flagged — health/financial/legal/accusatory/unverifiable items. Most stories never trigger it. For each flagged piece it picks a verdict in the same run: **publish**, **remediate-then-publish** (attach a disclaimer, label or cut an unverifiable claim, reframe accusatory phrasing to sourced-neutral), or **spike**. No queue, no waiting, no human.
- **Corrections** are appended to the visible log by the pipeline as new facts arrive — never silent edits.

The only human role is **optional owner oversight, not operations**: the business owner may read the decision log (`#/review`) and the monthly Founding Desk strategy report, but is never required for anything to publish.

**Escalation ladder:** Agent → Managing Editor (editorial) → Founding Desk (structural/business) → AI Editor-in-Chief (final call on flagged pieces). Every path terminates at an agent; nothing terminates at a human.

---

## 5. Cost-control routing (live discipline, per blueprint §8)

- **Model routing is by stakes, not habit:** Haiku for style/compliance-flagging/publishing, Sonnet for research/drafting/repurposing, Opus only for Managing-Editor judgment and Verification. Don't let drafting drift onto Opus.
- **Prompt caching** on the house style guide + persona brief sent with every request (up to ~90% off repeated input).
- **Batch API** (~50% off) for all non-breaking drafting and repurposing — most of the volume.
- **Business-Strategy Agent** watches spend against the MVP/Growth/Scale envelopes and flags when routing or cadence should change before the bill does.

---

## 6. Failure handling

| Failure | Behavior |
|---|---|
| Verification can't confirm a central claim | Piece returns to Draft/Research; if it must run, the claim is cut or explicitly labeled unconfirmed — it never publishes as fact. An unverifiable central claim is itself a gate trigger. |
| Compliance adjudication backlog | Breaking items get priority; the AI Editor-in-Chief clears the rest in turn. Nothing waits on a human. |
| Persona voice drift (repeated) | Managing Editor escalates to Operations-Staffing for a brief tune. |
| A beat is chronically overloaded/starved | Operations-Staffing proposes a roster/beat change to the business owner. |
| Source later retracts/corrects | Correction Agent behavior: append to the visible correction log, notify Social/Podcast if the piece was repurposed. Never a silent edit. |
| Cost envelope exceeded | Business-Strategy flags; routing/cadence adjusted, not quality. |

---

## 7. What "running" looks like in one line

**Monitor → assign → research → draft in-voice → quality-gate → fact-check → style → risk-screen (AI Editor-in-Chief on triggers) → publish → repurpose**, with no human in the loop at any stage. The business owner's only optional touchpoint is the monthly strategy review. That is the whole company.
