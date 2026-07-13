# RTFCLMGZN — Codex Onboarding Blueprint

Status: preparation only. This document does not change the live site, agent prompts, or publishing workflow. It is the handoff plan to apply after the final Claude folder is copied in.

## North star

Make RTFCLMGZN a premium, unmistakably designed AI-industry publication with a dependable editorial operating system: strong enough to publish continuously, transparent enough to earn trust, and commercial enough to support several revenue lines without compromising the reporting.

## Preserve in the migration

- The nine named editorial personas, including their beats, voices, bylines, and editorial boundaries.
- The source-first reporting standard, reader doctrine, correction policy, and autonomous high-risk adjudication.
- The public trust features: sources, disclosure, corrections, prediction ledger, and usage transparency.
- Existing published content, magazine issues, art assets, URLs, and the static-site deployability that already works.

## Replace or simplify

- Translate overlapping operational agent prompts into a smaller set of reusable, traceable workflow capabilities.
- Replace file-editing-by-prompt as the primary integration point with validated structured story records.
- Separate intelligent editorial decisions from deterministic work such as RSS generation, cache versioning, schema validation, logging, image naming, and release checks.
- Decouple scheduling from a desktop app so unattended production does not depend on an open computer.

## Target operating system

### Control plane

One newsroom controller owns assignment, priorities, coverage balance, and story state. It is the only actor allowed to move a story between states.

### Editorial lanes

1. Flagship lane — one deeply researched daily synthesis.
2. Breaking lane — compact source-led updates when the event warrants speed.
3. Buzz lane — independent, high-frequency curation; never fabricated commentary.
4. Evergreen lane — guides, dossiers, research, and explainers.
5. Monthly issue lane — curation and art direction from the month’s proven work.

### Story state

`candidate → assigned → evidence → draft → verified → risk-reviewed → publish-ready → published → corrected/archived`

Research, coverage analysis, verification, style checking, image briefing, and distribution preparation can run in parallel. Publication is a single controlled convergence point after evidence and risk review.

## Visual and product direction

The existing site already has a large design system and content universe. The visual overhaul should refine it into a coherent editorial product rather than merely adding effects.

- Establish a recognizable art direction: typography, color, photography/illustration rules, motion restraint, and a clear grid.
- Redesign the home page as an editorial front page with a decisive flagship hierarchy, live signal, varied story modules, and clearer paths into sections, authors, dossiers, and magazine issues.
- Make article pages feel authored and premium: better type rhythm, source treatment, evidence callouts, relevant data/graphic modules, stronger image crops, readable mobile layouts, and intentional audio/share/save affordances.
- Rebuild dense secondary pages around reader intent: section pages, author pages, company dossiers, guides, Buzz, research, predictions, and usage.
- Upgrade magazine layout and art direction through a dedicated visual QA process: unique images, page-to-page variation, desktop and narrow-screen audits, no cropped type or empty composition.
- Improve accessibility, loading performance, SEO metadata, structured data, mobile navigation, and conversion paths as part of design—not as cleanup later.

## Commercial architecture to validate after editorial reliability

1. Newsletter sign-up and one high-quality daily flagship digest.
2. Sponsorship and carefully labeled display/direct placements.
3. Premium convenience: saved research, enhanced alerts, dossiers, audio, archives, data tools, and briefing formats—not paywalled core reporting.
4. Branded intelligence products: recurring reports, industry briefings, and research/data access.
5. Podcast and event sponsorships after audience evidence exists.

No pricing, claims, or paid tiers should be activated until traffic, retention, and audience behavior provide evidence.

## Sol operating policy

- Use Sol for the newsroom controller, flagship synthesis, verification, sensitive-risk decisions, architecture work, and weekly/monthly judgment.
- Use lower reasoning effort for repeatable work such as metadata, publishing checks, formatting, and curation.
- Keep prompts modular; pass the story/source record rather than every historical instruction on every action.
- Maintain written evaluation sets for factuality, sourcing, persona fidelity, reader usefulness, and visual-release defects before expanding automation.

## First migration sequence

1. Snapshot and compare the final Claude folder; preserve all incoming changes.
2. Inventory every page, data source, asset, prompt, integration, secret dependency, and scheduled routine.
3. Run a functional and visual baseline audit before altering anything.
4. Produce the target data schema, workflow graph, and migration map.
5. Build and test one complete flagship story end-to-end in the new system.
6. Introduce the breaking and Buzz lanes, then publishing automation.
7. Redesign the public experience in staged, reviewable page groups.
8. Add email/social/podcast and revenue systems only after the publishing core is stable.

## Definition of ready

- A story can be researched, drafted by one of the nine personas, verified, risk-reviewed, published, corrected, and audited without manual file surgery.
- No duplicate story or unsupported central claim can pass silently.
- The production system has a durable schedule, run history, failure alert, and rollback path.
- Every core public page is fast, polished, responsive, accessible, and visually intentional.
- Revenue features are labeled, measurable, and do not weaken trust in the editorial product.
