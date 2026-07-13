# RTFCLMGZN — Production Pipeline

Every piece of content, from any persona, passes through the same nine stages. Consistent quality and compliance checks across the whole publication.

| # | Stage | Owner | Model | Output |
|---|---|---|---|---|
| 1 | Assignment | Managing Editor | Opus | Story assigned to a persona; format set (brief/synthesis/research) |
| 2 | Research | Research Agent | Sonnet | Sourced research brief: primary sources, existing coverage, data, links |
| 3 | Draft | Persona Writer Agent | Sonnet | Draft in the assigned persona's voice, built from the research brief |
| 4 | Quality pass | Managing Editor | Opus | Voice/consistency/depth check; back to Draft or forward |
| 5 | Fact-check | Verification Agent | Opus | Every claim cross-checked vs. sources; unverifiable items flagged |
| 6 | Copyedit | Style Agent | Haiku | House style, headline, readability pass |
| 7 | Risk screen | Compliance Agent → **AI Editor-in-Chief** | Haiku + Opus | Cleared to publish, remediated-then-published, or spiked — autonomously |
| 8 | Publish | Publishing Agent | Haiku | Formatted, tagged, scheduled on-site with all boilerplate |
| 9 | Repurpose | Podcast + Social Agents | Sonnet + ElevenLabs | Podcast segment script + platform-native social posts |

## Flow control

- **Backward edges:** Stage 4 can return a draft to Stage 3. Stage 5 can return to Stage 3 (factual rework) or Stage 2 (missing sourcing). Stage 6 returns to Stage 3 only for substantive rewrites, otherwise fixes inline.
- **The adjudication point:** Stage 7. If Compliance flags any trigger from the compliance rulebook, the piece routes to the autonomous AI Editor-in-Chief, which decides in the same run — publish, remediate-then-publish, or spike. Nothing waits for a human; there is no human in the loop.
- **Repurpose is post-publish:** Stage 9 only runs on already-published pieces, so podcast/social never carry content the Editor-in-Chief hasn't cleared.

## Handoff contract between stages

Each stage passes forward a structured object: `{ story_id, persona, format, draft, sources[], claims[], flags[], correction_log }`. Every agent appends to it; no agent deletes another agent's flags. The `flags[]` array is what the Compliance Agent and AI Editor-in-Chief read at stage 7.
