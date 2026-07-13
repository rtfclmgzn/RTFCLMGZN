# Sample Pipeline Run — Worked Example

> **⚠️ SYNTHETIC SYSTEM TEST — NOT FOR PUBLICATION.** Every company, number, quote, and study in this document is **fabricated** to exercise the pipeline. This file exists to prove the 17-agent system works and to show each agent's input/output. It deliberately routes a story through the *high-sensitivity* health beat so the compliance gate fires — demonstrating the safety machinery, not just the happy path. Nothing here describes real events.

**Story chosen:** a (fictional) startup claims its AI designed a drug candidate that cut tumor size in an early study. This lands on **Dr. Priya Anand's** beat and should trip both Verification and the autonomous AI Editor-in-Chief. Watch it happen.

---

## Stage 1 — Assignment (Managing Editor)

```
story_id: 2026-07-09-helixmind-onco
persona:  priya-anand   (health & biotech — HIGH sensitivity)
format:   synthesis  (600–1,200w; enough to properly caveat)
angle:    "An AI-designed oncology candidate posted early results — what the
           evidence actually supports, and what it doesn't yet."
note to persona: high-sensitivity beat; expect the gate. Establish evidentiary
           stage in the lede. Do not imply clinical benefit.
```
Managing Editor routes to Priya, sets synthesis (not a breaking brief — a medical claim needs room to caveat), and pre-flags the sensitivity.

## Stage 2 — Research (Research Agent)

```
research_brief:
  primary_sources:
    - [FABRICATED] HelixMind press release, 2026-07-08 (company blog)   <-- primary but self-interested
    - [FABRICATED] Preprint on bioRxiv, not yet peer-reviewed            <-- primary, unreviewed
  context_coverage:
    - [FABRICATED] two secondary write-ups repeating the press release
  key_facts:
    - "Candidate HM-407 designed with an in-house generative model"  [src: press release]
    - "Tumor volume reduced 41% in a mouse xenograft study, n=20"    [src: preprint]
    - "Company says it plans to file for a Phase 1 trial"             [src: press release]
  the_gap: "Every secondary source is just echoing the press release. Our value:
            grade the evidence honestly and state the translational stage."
  open_questions:
    - "The 41% figure appears only in the preprint; no peer review. FLAG."
    - "No human data exists. Claim must not imply patient benefit."
```
Note the Research Agent already flags the load-bearing number as preprint-only and warns against implying human benefit.

## Stage 3 — Draft (Dr. Priya Anand)

Priya drafts in her evidence-first voice. Opening habit — establish evidentiary weight before the claim:

> **An AI-designed cancer drug posted early numbers. Here's what a mouse study can and can't tell us.**
>
> HelixMind said this week that a tumor-targeting compound designed by its generative model shrank tumors by 41% in mice — a result that, if it holds, would be an encouraging data point for computational drug design. In a preprint that has not yet been peer-reviewed, the company reported the effect in a 20-animal xenograft study… *[what shipped → what the numbers show → what's unproven, per her recurring structure]*
>
> What this does **not** show: any benefit in humans. No clinical trial has begun…

Priya's draft carries the "not medical advice" disclaimer and never states clinical benefit. Good — but it still contains a load-bearing unreviewed number and a medical claim, so downstream stages must engage.

## Stage 4 — Quality pass (Managing Editor)

```
verdict: FORWARD (with note)
checks:
  voice_fidelity:  PASS — lede establishes stage before claim; structure matches brief
  depth_match:     PASS — synthesis length, properly caveated
  additive_test:   PASS — grades the evidence; not a press-release echo
  overlap:         PASS — nothing else in pipeline on this
note: "41% figure is preprint-only — Verification must confirm and, if it stays,
       it must be labeled unreviewed. This will trigger Compliance; that's correct."
```

## Stage 5 — Fact-check (Verification Agent — Opus)

```
flags:
  - claim: "41% tumor volume reduction, n=20"
    status: UNVERIFIED
    source_checked: preprint only; no peer review; no independent replication
    note: "Central claim rests on a single unreviewed preprint. May run ONLY if
           explicitly labeled 'unreviewed preprint, mouse study.' -> gate trigger."
  - claim: "designed with in-house generative model"
    status: VERIFIED (as company statement, attributed — not as independent fact)
  - claim: "plans to file for Phase 1"
    status: VERIFIED (as stated intent, attributed)
routing: return-not-required (claims are attributable), but UNVERIFIED central
         claim persists as a flag -> routes to the AI Editor-in-Chief at stage 7.
```
Verification doesn't kill the piece — the claims are honestly attributable — but it **stamps the central number UNVERIFIED**, and that flag is now permanent in the state object.

## Stage 6 — Copyedit (Style Agent — Haiku)

```
- Applied house style: "41%" numeral OK; "Phase 1" capitalization OK
- Headline: literal, non-clickbait — PASS. Alt offered:
  "HelixMind's AI-designed compound shrank tumors in mice. That's the whole claim."
- Boilerplate check:
    ai_disclosure: present
    byline: Dr. Priya Anand
    disclaimer: "not-medical-advice" PRESENT  (required for this beat)
- Did NOT alter the UNVERIFIED flag or any facts.
forward -> Compliance
```

## Stage 7 — Risk screen → AI EDITOR-IN-CHIEF (autonomous adjudication)

```
compliance.triggers:
  - HEALTH_MEDICAL_CLAIM     (efficacy result in a health context)
  - UNVERIFIABLE_CENTRAL_CLAIM (41% figure, preprint-only, from Verification)
routed_to: editor-in-chief (AI, Opus)   # not a human — adjudicated in the same run
```

The Compliance Agent flags; the **AI Editor-in-Chief** decides, immediately and on its own. It does not hold the piece or wait for anyone.

```
AI Editor-in-Chief verdict: REMEDIATE -> PUBLISH
rationale:
  "Publishable after a bounded fix. The draft already labels it a mouse study,
   states no human benefit, carries the not-medical-advice disclaimer, and
   attributes every claim. The two triggers are covered by remediation, not a hold."
remediation_applied:
  - Confirmed not-medical-advice disclaimer attached (health trigger satisfied).
  - Labeled the 41% figure 'unreviewed preprint, mouse study' inline (unverifiable-claim trigger satisfied).
  - Softened 'encouraging data point' -> 'very early signal'.
  - Added one line: xenograft results routinely fail to translate to humans.
disclaimer_attached: not-medical-advice
```

**No stop, no human, no queue.** This is the system working exactly as designed: a plausible, well-written health story carrying a medical claim and an unreviewed central number is not held — the AI Editor-in-Chief *remediates it into a sound piece and publishes it*, autonomously, in the same run. (Had the central claim been both unverifiable and impossible to reframe, the verdict would instead have been **SPIKE**, logged to the decision log — still the AI's call, still no human.)

## Stage 8 — Publish (Publishing Agent — Haiku)

```
preconditions: editor_in_chief.verdict in {publish, remediate} -> OK
actions:
  - formatted to web template
  - topic_section: Health;  author page: Dr. Priya Anand
  - metadata + ISO timestamp + preserved source links
  - correction_log: initialized
  - repurpose_signal: emitted to Podcast + Social
status: published
```

## Stage 9 — Repurpose (Podcast + Social)

```
social (X, in Priya's voice):
  "New: an AI-designed cancer compound shrank tumors in mice — 41%, in an
   unreviewed preprint. Promising method, very early signal, zero human data.
   Here's the honest read: <link>"   [carries the caveat, links the cleared piece]
podcast: queued for The Deep Dive (high-sensitivity beat -> flagged for a
         human listen-through before release, per podcast agent boundaries)
NOTE: both draw ONLY from the published, cleared article. No new claims added.
```

---

## What this run proves

1. **The voice works** — Priya's evidence-first structure produced a responsible draft from raw material, in-character.
2. **Every stage did its job** — Research flagged the weak source, Verification stamped it UNVERIFIED, Style confirmed the disclaimer, and none of them silently "fixed" facts.
3. **Adjudication is autonomous and remediating** — a good-looking article carrying a medical claim + unreviewed number wasn't waved through *or* held for a human. The AI Editor-in-Chief bounded the exposure (disclaimer, inline "unreviewed preprint" label, softened claim) and published it itself. Had it been unfixable, the same agent would have spiked it. Either way: the AI's call, recorded in the provenance record.
4. **Repurposing stayed safe** — social/podcast could only echo the cleared piece, caveat intact.

This is the difference between "an AI that writes articles" and "a newsroom." The value is in the judgment, and the judgment is fully autonomous.
