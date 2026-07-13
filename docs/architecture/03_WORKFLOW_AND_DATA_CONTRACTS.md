# 03 — Workflow and Data Contracts

## 1. Canonical editorial workflow

The canonical workflow has **12 checkpoints**. It is a directed acyclic workflow with conditional and parallel branches; it is not a requirement to call 12 models for every item.

| # | Checkpoint | Primary owner | Required input | Required output | Blocking rule |
|---:|---|---|---|---|---|
| 1 | Signal intake | Managing Editor | Schedule, feed, tip, event, or editor request | Candidate record with origin and freshness | Candidate must have a unique ID and provenance |
| 2 | Assignment and lane selection | Managing Editor | Candidate | Assignment brief, beat/persona, format lane, risk pre-classification | No research begins without scope and lane |
| 3 | Evidence collection | Research; Data Desk when needed | Assignment | Source set, research brief, unknowns, source snapshots/metadata | Required source classes must be present |
| 4 | Claim-map construction | Research + Verification | Evidence set | Atomic claim list mapped to supporting/contradicting sources | No draft for consequential claims lacking evidence status |
| 5 | Draft | Assigned persona(s) | Assignment, brief, claim map, style/policy context | Draft v1 with claim references | Draft cannot introduce unregistered load-bearing claims |
| 6 | Editorial quality review | Editorial Review | Draft v1 and assignment | Structural review, usefulness/originality decision, revision request or pass | `revise` loops to stage 5 with a new artifact version |
| 7 | Fact verification | Verification; Data Desk | Reviewed draft and claim map | Verified claim map, quotation/number/date checks, discrepancy list | Unsupported material claims block progression |
| 8 | Risk and compliance classification | Compliance | Verified draft and claim results | Risk tier, triggered rules, required disclaimer/remediation/escalation | R3/R4 always escalates; policy violations block |
| 9 | Adjudication and approval | EIC/Standards recommendation; human approver | Complete review packet | Approval, rejection, revision, spike, or escalation event | Phase one requires human public-release approval |
| 10 | Packaging | Publishing; channel desks; magazine desks when applicable | Approved content version | Metadata, routes, links, assets, channel packages, layout manifests | Packaging may not alter claims without re-verification |
| 11 | Release validation and publish | Deterministic release controller | Complete package and approval | Signed release record and deployment result | All automated gates pass; idempotent publish only |
| 12 | Distribution, monitoring, and corrections | Publishing, Standards, channel desks | Published release and telemetry | Delivery events, alerts, correction/retraction records | Corrections link to original release and repeat required checks |

## 2. Lifecycle state machine

### Main path

```text
candidate
  → assigned
  → evidence_ready
  → claim_map_ready
  → draft_ready
  → editorially_reviewed
  → verified
  → risk_classified
  → approval_required
  → approved
  → release_ready
  → validated
  → published
  → monitored
```

### Exception and terminal states

- `needs_revision`
- `blocked`
- `rejected`
- `spiked`
- `publish_failed`
- `withdrawn`
- `corrected`
- `retracted`
- `archived`

Only the controller transitions state. Every transition stores the expected prior version, actor, timestamp, reason, and idempotency key. A stale or duplicated transition is rejected.

## 3. Story lanes and content bands

The earlier documents leave gaps between their stated length bands and the runtime’s actual classification. The canonical bands are:

| Lane | Valid range | Editorial target | Additional requirements |
|---|---:|---:|---|
| Brief | 250–649 words | ~350 | One clear development, direct evidence, concise “why it matters” |
| Synthesis | 650–2,199 words | ~1,200 | Multiple sources, context, counterpoint/uncertainty, useful conclusion |
| Research | 2,200+ words | ~3,500 | Two or more credited agents/authors, formal claim map, methods note, 2–3 substantive charts/data exhibits |

Rules:

- The declared lane is canonical; the UI must not silently relabel it.
- Below-target length can warn; outside the valid range fails unless a documented waiver is approved.
- Word count is derived by one shared parser used by the editor, validator, UI, and QA.
- Research has a 2,200-word floor. The 2,600-word hard-coded scanner threshold is retired.

## 4. Core entity contracts

These are conceptual contracts; implementation schemas must preserve these fields and relationships.

| Entity | Purpose | Required relationships/fields |
|---|---|---|
| Story | Canonical editorial object | ID, slug, title, lane, beat, lifecycle state, risk tier, current artifact versions, timestamps |
| Candidate | Signal before assignment | Origin, URL/event/tip metadata, observed time, freshness, deduplication key |
| Assignment | Scope and responsibility | Story ID, thesis/question, persona, lane, deadline, source requirements, risk pre-classification |
| Source | Evidence metadata | Canonical URL, publisher, title, author, publication/retrieval times, source class, access status, checksum |
| Evidence | Bounded support material | Source ID, relevant excerpt/data point, location, retrieval method, rights/retention status |
| Claim | Atomic factual proposition | Claim text, type, materiality, status, draft locations, linked evidence, uncertainty |
| ClaimSupport | Relationship judgment | Claim ID, source/evidence ID, supports/contradicts/context-only, strength, reviewer |
| ArtifactVersion | Immutable work product | Type, story ID, version, parent version, content/blob pointer, checksum, creator run, validation status |
| Review | Quality or fact assessment | Reviewer role, artifact version, rubric results, issues, decision, rationale |
| RiskDecision | Policy classification | Tier, triggers, rule versions, required actions, escalation status |
| Approval | Human or policy decision | Actor, artifact/release version, decision, rationale, time, expiry/conditions |
| Asset | Image/chart/audio/PDF | Type, provenance, license/status, prompt/data source, checksum, dimensions, issue/story use |
| Release | Deployable publication | Target, content versions, manifest, checksums, approval, validation, deployed time, rollback pointer |
| DistributionJob | Channel delivery | Release ID, channel, package, status, approval, idempotency key, provider receipt |
| AgentRun | One role execution | Agent/prompt/model/policy versions, inputs/outputs, usage, latency, result, error class, trace ID |
| Event | Append-only operational record | Aggregate ID, sequence, event type/version, actor, payload, timestamp, correlation ID |
| Correction | Post-publication change | Original release, corrected release, reason, materiality, public note, approval |
| Prediction | Public forecast | Statement, deadline, measurable resolution rule, evidence, status, grade history |
| MagazineIssue | Canonical issue manifest | Theme, schedule, article/assets list, spread plan, web/PDF build versions, QA results |
| User/Entitlement | Later commercial identity | User ID, provider identity, product, status, expiry, audit trail; never browser-only |

## 5. Claim and source contract

A publishable material claim must include:

- atomic wording that can be evaluated independently
- materiality: load-bearing or supporting
- claim type: observed fact, reported statement, calculation, forecast, opinion, or inference
- one or more source/evidence links
- support state: supported, partially supported, contradicted, unresolved, or not applicable
- confidence and uncertainty explanation
- exact draft locations
- verification actor and time

Primary sources are preferred for product releases, laws, filings, research papers, official data, and direct statements. Secondary sources may add context. A source count alone is not evidence quality.

The system stores only the source material required for audit and permitted by rights/retention policy. It does not indiscriminately archive entire copyrighted publications.

## 6. Artifact rules

- Artifacts are immutable; revision creates a new version.
- Every artifact has a checksum and parent lineage.
- Models cannot overwrite prior artifacts.
- A packaging step cannot silently change factual content. Any material change returns to verification.
- Generated images record prompt, model/provider, seed or generation ID where available, and editorial-use status.
- Magazine web and PDF editions derive from one issue manifest.
- A release references exact artifact versions; “latest” is not a valid release dependency.

## 7. Event and observability contract

Every meaningful action emits a versioned event. Minimum event families:

- `story.*`
- `assignment.*`
- `source.*`
- `claim.*`
- `artifact.*`
- `review.*`
- `risk.*`
- `approval.*`
- `workflow.*`
- `release.*`
- `distribution.*`
- `correction.*`
- `usage.*`
- `security.*`

Events include correlation and causation IDs so the Pulse UI can show a real timeline. Cost is computed from recorded provider usage and the price table active at execution time, with that price-table version preserved.

## 8. Approval contract

An approval is not a free-form chat acknowledgment. It contains:

- exact story, artifact, and release versions approved
- decision: approve, reject, request revision, spike, escalate
- actor and authentication context
- rationale and optional conditions
- created and expiry times
- risk tier and rule version
- idempotency key

Any material change after approval invalidates the approval and reopens the required checks.

## 9. Release-gate contract

A production release fails closed unless all applicable checks pass:

1. schema and reference integrity
2. unique IDs/slugs and route generation
3. claim/source coverage
4. quote, date, number, and link validation
5. editorial and style rubrics
6. risk-policy completion
7. valid approval for the exact package
8. asset provenance and duplicate-use rules
9. SEO/canonical/RSS/sitemap generation
10. security and secret scan
11. accessibility checks
12. unit/integration/workflow tests
13. browser route and console checks
14. visual regression at required viewports
15. magazine page/art/PDF parity checks when applicable
16. deployment smoke test and rollback pointer

The existing `qa_scan.py` becomes one component of this layered gate rather than claiming whole-system coverage.

## 10. Magazine contract

- Monthly flagship issue, plus deliberate special editions
- 40–80 rendered pages for a flagship issue
- One canonical issue manifest generates the web reader and PDF
- Unique primary artwork per page/spread under the existing quality rule
- Exactly one centerfold and one vertical fold where the format calls for them
- Page counts, agent counts, and issue metadata are derived
- PDF filename and download metadata are generated from the manifest
- A build cannot release when web and PDF page/content checksums diverge

## 11. Corrections and retractions

- Minor typo fixes still create a version and event, but may use a lightweight approval path.
- Material corrections rerun claim verification, risk classification, approval, packaging, and release validation.
- The public article displays a dated correction note and links the prior release history.
- Retractions preserve a tombstone page and rationale; they do not erase the audit record.
