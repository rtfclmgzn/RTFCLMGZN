# 02 — Canonical Agent Registry

## 1. Registry decision

The canonical roster is **26 logical agents and 9 personas**.

The repository contains 30 files ending in `*.agent.md`. Four of those files describe scheduled workflows or substeps owned by an existing logical agent. They are not additional permanent identities. This resolves the apparent 26-versus-30 contradiction without deleting useful instructions.

An “agent” is a named role with a stable identity, bounded responsibility, and versioned contract. A scheduled recipe, transformation step, or channel-specific operation is a workflow or task, even when the current filename says `.agent.md`.

## 2. Authority rules applying to every agent

1. Agents return versioned structured artifacts.
2. Agents do not change story state directly.
3. Agents do not publish, email, post socially, spend money, or mutate entitlements directly.
4. The controller decides which agent runs next.
5. The release controller is the only component allowed to create a public release.
6. Every agent run records model, prompt, policy, input, output, token, cost, latency, and validation metadata.
7. Persona voice never overrides evidence, risk, or correction policy.

## 3. Official roster

| # | Canonical ID | Display name | Class | Primary responsibility | Required output | Capability profile | Public side-effect authority |
|---:|---|---|---|---|---|---|---|
| 1 | `editor-in-chief` | Editor-in-Chief | Executive | Editorial judgment, difficult tradeoffs, final AI recommendation, escalation | Adjudication record with rationale and required remediation | `reasoning-pro` | None |
| 2 | `business-strategy` | Business Strategy | Founding desk | Product strategy, audience/revenue hypotheses, portfolio review | Strategy memo with assumptions and measurable tests | `reasoning-high` | None |
| 3 | `operations-staffing` | Operations & Staffing | Founding desk | Capacity, roster health, workflow bottlenecks, role-change proposals | Operations review or registry-change proposal | `reasoning-high` | None |
| 4 | `managing-editor` | Managing Editor | Executive | Signal triage, assignment, lane selection, schedule, cross-desk coordination | Assignment brief and workflow plan | `reasoning-high` | None |
| 5 | `luka-petrovic` | Luka Petrović | Persona | Frontier labs, foundation models, model releases | Draft artifact using the common author contract | `general` / `reasoning-high` | None |
| 6 | `nova-reyes` | Nova Reyes | Persona | Consumer AI, culture, creative tools, user behavior | Draft artifact using the common author contract | `general` | None |
| 7 | `jin-park` | Jin Park | Persona | Chips, compute, infrastructure, quantum | Draft artifact using the common author contract | `reasoning-high` | None |
| 8 | `evelyn-zhao` | Evelyn Zhao | Persona | Policy, regulation, geopolitics | Draft artifact with policy-risk markers | `reasoning-high` | None |
| 9 | `priya-anand` | Dr. Priya Anand | Persona | Health, medicine, biotech | Draft artifact with clinical-evidence boundaries | `reasoning-high` | None |
| 10 | `kian-farzan` | Kian Farzan | Persona | Markets, finance, crypto, AI business | Draft artifact with financial-evidence boundaries | `reasoning-high` | None |
| 11 | `ash-lindqvist` | Ash Lindqvist | Persona | Robotics, hardware, embodied AI | Draft artifact using the common author contract | `general` / `reasoning-high` | None |
| 12 | `sage-okafor` | Sage Okafor | Persona | Opinion, institutional analysis, the long view | Clearly labeled analysis/opinion draft | `reasoning-high` | None |
| 13 | `samira-nasser` | Samira Nasser | Persona | Ethics, labor, human stakes | Clearly labeled analysis/opinion draft | `reasoning-high` | None |
| 14 | `research` | Research Agent | Evidence | Retrieve and organize primary/credible sources; identify unknowns | Source set, research brief, provenance metadata | `reasoning-high` | None |
| 15 | `verification` | Verification Agent | Evidence | Test claims against sources, numbers, dates, quotations, and uncertainty | Claim-verification matrix and discrepancies | `reasoning-pro` for R3; otherwise `reasoning-high` | None |
| 16 | `style` | Style Agent | Production | Copyediting, clarity, house style, accessibility, format conformance | Edited draft plus change set | `structured-fast` / `general` | None |
| 17 | `compliance` | Compliance Agent | Risk | Deterministic-plus-model risk classification against policy | Risk decision with triggered rules and required handling | `structured-fast`; escalate to `reasoning-pro` | None |
| 18 | `publishing` | Publishing Agent | Production | Metadata, internal links, SEO package, release preparation | Publication package candidate | `structured-fast` / `general` | None |
| 19 | `podcast` | Podcast Agent | Distribution | Script and narration-package adaptation | Podcast script, show notes, pronunciation list | `general` | None |
| 20 | `social` | Social Agent | Distribution | Channel-specific social variants and campaign plan | Social package with source/release references | `general` | None |
| 21 | `standards-editor` | Standards Editor | Oversight | Policy ownership, corrections, prediction grading, quality audits | Standards decision, correction record, or policy proposal | `reasoning-pro` | None |
| 22 | `data-desk` | Data Desk | Evidence | Quantitative analysis, tables, chart specifications, reproducibility | Data artifact, methods note, chart spec | `reasoning-high` plus deterministic tools | None |
| 23 | `newsletter-editor` | Newsletter Editor | Distribution | Edition curation, subject lines, email structure, send package | Newsletter edition package | `general` / `reasoning-high` | None |
| 24 | `curation-editor` | Magazine Curation Editor | Magazine | Issue thesis, table of contents, article selection, pacing | Issue manifest and commissioning plan | `reasoning-high` | None |
| 25 | `layout-production` | Magazine Layout & Production | Magazine | Spread plan, art direction, web/PDF parity, production packaging | Layout manifest, asset requirements, build package | `reasoning-high` plus deterministic layout tools | None |
| 26 | `editorial-review` | Editorial Review Agent | Oversight | Structural edit, usefulness test, coherence, originality, reader value | Editorial review with pass/revise recommendation | `reasoning-pro` | None |

## 4. The four non-agent `.agent.md` files

| Current file | Canonical classification | Owning agent | Disposition |
|---|---|---|---|
| `agents/buzz/buzz-hourly.agent.md` | Scheduled signal-intake workflow | Managing Editor, with Research and Publishing tasks | Rename/migrate to a workflow definition; do not count as agent 27 |
| `agents/email/daily-digest.agent.md` | Scheduled newsletter workflow | Newsletter Editor | Rename/migrate to a workflow definition; do not count as agent 28 |
| `agents/social/article-export.agent.md` | Deterministic/social transformation task | Social Agent | Fold into Social task library; do not count as agent 29 |
| `agents/social/social-posting.agent.md` | External-posting task | Social Agent | Fold into Social task library with approval; do not count as agent 30 |

## 5. Organizational topology

```text
Founding Desk
├── Business Strategy
└── Operations & Staffing

Editorial command
├── Editor-in-Chief
└── Managing Editor

Authoring desk
├── Sage Okafor
├── Nova Reyes
├── Jin Park
├── Marcus Webb
├── Dr. Priya Anand
├── Ronan Cole
├── Ash Lindqvist
├── Idris Vale
└── Maya Serrano

Evidence and production
├── Research
├── Data Desk
├── Verification
├── Style
├── Compliance
└── Publishing

Independent oversight
├── Editorial Review
└── Standards Editor

Channel desks
├── Newsletter Editor
├── Social
├── Podcast
├── Magazine Curation
└── Magazine Layout & Production
```

The chart expresses accountability, not unrestricted model-to-model communication. The workflow controller routes all work.

## 6. Story-lane routing

| Lane | Mandatory roles | Conditional roles |
|---|---|---|
| Brief | Managing Editor, Research, persona, Verification, Compliance, Publishing, human approver | Style, Editorial Review, Data Desk, EIC |
| Synthesis | Managing Editor, Research, persona, Editorial Review, Verification, Style, Compliance, Publishing, human approver | Data Desk, EIC, Standards |
| Research | Managing Editor, Research, Data Desk, one or more personas, Editorial Review, Verification, Style, Compliance, EIC, Standards, Publishing, human approver | Specialist tools, magazine/channel desks |
| Correction | Standards, Verification, Publishing, human approver | Original persona, EIC, Compliance |
| Magazine issue | Curation, relevant personas, Research/Data/Verification, Layout, Standards, Publishing, human approver | EIC, Social, Newsletter, Podcast |
| Newsletter edition | Newsletter Editor, Publishing validation, human send approval | Managing Editor, Social |
| Social post | Social, deterministic claim/release reference check, human send approval | Compliance for sensitive posts |

## 7. Prompt and registry lifecycle

Each registry entry will eventually carry:

- stable agent ID and semantic version
- display metadata and beat
- allowed workflow stages
- input and output schema IDs
- required policies
- model capability profile
- tool allowlist
- budget and timeout
- escalation targets
- prompt source and prompt hash
- status: active, experimental, deprecated, or retired

The public masthead and system map are generated from this registry. They do not maintain their own counts or role descriptions.
