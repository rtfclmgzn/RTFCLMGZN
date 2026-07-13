# 01 — Architecture Constitution

## 1. Purpose and authority

This document defines the canonical RTFCLMGZN system architecture. It supersedes conflicting architectural claims in earlier handover notes, diagrams, prompts, and business blueprints.

RTFCLMGZN is an **editorial operating system** whose first production client is a public AI-industry publication. “Operating system” here means a governed control plane for editorial work, artifacts, approvals, releases, and observability. It does not mean a desktop or device operating system.

## 2. Binding product definition

RTFCLMGZN produces evidence-backed business and AI-industry intelligence through named AI editorial roles. Its defensible product is not simply generated prose. It is the combination of:

- structured evidence and claim provenance
- differentiated editorial voices
- deterministic workflow control
- explicit risk and approval policy
- versioned artifacts and corrections
- transparent operating metrics
- high-quality publication and magazine presentation

The public website is one client. Future clients may include the Newsroom Studio, newsletters, magazines, social distribution, podcasts, APIs, and enterprise dashboards.

## 3. Canonical operating posture

> **AI-operated, human-governed, evidence-first, and auditable.**

This resolves the repository’s conflict between “no human in the loop” claims and documents that require human oversight.

### Phase-one rule

Every public release requires a deliberate human approval action after machine review. AI agents may research, draft, review, verify, classify risk, recommend disposition, and prepare release artifacts. They may not unilaterally make a public release.

### Later bounded autonomy

Low-risk content may become eligible for policy-based auto-publication only after:

- a representative evaluation suite meets defined thresholds over time
- source coverage and claim verification pass deterministically
- release rollback is tested
- rate and spend limits are active
- a kill switch exists
- the public disclosure accurately describes the level of autonomy

High-risk stories and irreversible external actions remain human-approved.

## 4. Core definitions

| Term | Canonical definition |
|---|---|
| Agent | A named, versioned editorial role with a bounded responsibility, input contract, output contract, policies, and no implicit authority to mutate production state |
| Persona | An authoring agent with a beat, voice, sourcing expectations, and the common draft contract |
| Workflow | A deterministic, durable sequence or DAG that invokes agents and tools according to policy |
| Tool | A bounded capability such as web retrieval, data analysis, image generation, email delivery, or publishing |
| Artifact | An immutable, versioned output such as a source set, claim map, draft, review, risk decision, image, or release package |
| Controller | Deterministic application code that owns state transitions, retries, policy checks, idempotency, and release authority |
| Registry | The machine-readable source of truth for agent identities, prompt versions, capabilities, policies, and routing |
| Release | A validated, immutable package approved for a target environment and tied to a rollback pointer |

## 5. Architectural principles

1. **The controller owns state.** Models propose; deterministic code validates and transitions.
2. **Agents produce artifacts, not side effects.** An agent cannot directly edit production files, publish, email, charge, or post socially.
3. **Every claim has provenance.** Material factual claims map to one or more sources and a support judgment.
4. **Every output is schema-bound.** Model prose is not trusted as an API contract.
5. **Prompts and models are versioned dependencies.** Exact model IDs are configuration, not prose scattered through agent files.
6. **Code deployment and content release are separate concerns.** A content approval does not grant permission to deploy arbitrary code.
7. **Human approval is a first-class event.** It is durable, attributable, and resumable rather than a chat message.
8. **Public metrics must be real.** Simulated or browser-local data is clearly labeled as such.
9. **Static-first public delivery, dynamic control plane.** Articles should be fast, crawlable, and resilient; newsroom operations can be stateful.
10. **No big-bang rewrite.** The current aesthetic remains available while the new stack reaches parity.
11. **Least privilege by default.** Each tool, token, worker, and agent receives only the authority it needs.
12. **Corrections are additive.** Published history is versioned; it is not silently overwritten.

## 6. Canonical system topology

```text
Signals / schedules / editor input
                 │
                 ▼
       Newsroom Orchestrator
   registry · policy · state machine
                 │
      ┌──────────┼───────────┐
      ▼          ▼           ▼
  Agent Runtime  Tool Layer  Approval Service
      │          │           │
      └──────────┼───────────┘
                 ▼
        Artifact + Event Store
          D1 state · R2 blobs
                 │
                 ▼
          Release Controller
        validate · package · sign
                 │
       ┌─────────┼──────────┐
       ▼         ▼          ▼
 Public site  Newsletter  Magazine/social
                 │
                 ▼
      Monitoring + corrections loop
```

## 7. Five architectural planes

### 7.1 Public Publication Plane

**Canonical target:** Astro + TypeScript, static-first, with selective interactive islands.

Responsibilities:

- real routes such as `/article/<slug>/`, `/person/<slug>/`, and `/issue/<slug>/`
- article-specific canonical, Open Graph, Twitter, RSS, and structured metadata
- prerendered public content for performance and resilience
- magazine reader, archive, resources, dictionary, company pages, and transparency views
- no embedded provider secrets or privileged release logic

The current vanilla SPA remains in service during migration. New routes are built in parallel and compared against the visual baseline before cutover.

### 7.2 Newsroom Studio Plane

A private TypeScript application for:

- candidate inbox and assignments
- source and claim inspection
- versioned draft comparison
- review and risk decisions
- approval/rejection with rationale
- run, cost, error, and queue visibility
- corrections and retractions
- release and rollback controls

Initial internal access is protected by Cloudflare Access. Public reader accounts are a separate later subsystem.

### 7.3 Orchestration and Control Plane

**Canonical target:** Cloudflare Worker APIs plus Cloudflare Workflows, scheduled triggers, and Queues.

Responsibilities:

- create and resume story workflows
- invoke agents through capability profiles
- enforce input/output schemas
- own state transitions and idempotency keys
- pause durably for approval
- retry transient failures
- route terminal failures to a dead-letter queue
- apply budgets, timeouts, concurrency limits, and circuit breakers
- emit append-only events

The workflow controller is the authority. Agent-to-agent “handoffs” are represented as controller-routed work, not uncontrolled recursive conversations.

### 7.4 Execution Plane

A provider-neutral model and tool adapter layer.

Responsibilities:

- invoke OpenAI Responses API or compatible providers
- request structured outputs and validate them
- expose bounded tools with allowlists and guardrails
- record prompt hash, model ID, reasoning profile, token usage, latency, and error class
- redact secrets and sensitive payloads from logs
- support model substitution without changing agent identity

The OpenAI Agents SDK may be used within a bounded workflow step for handoffs, tool execution, guardrails, or tracing. It is not the source of truth for story state or release authority.

### 7.5 Data and Observability Plane

**Canonical target:**

- **D1:** relational story state, assignments, claims, approvals, releases, events, and usage records
- **R2:** source snapshots where legally appropriate, generated assets, large artifacts, magazine builds, and immutable release packages
- **KV/cache:** non-authoritative cache and feature configuration only
- **Vector retrieval:** deferred until a measured retrieval use case exists; not required for v0

An append-only event stream feeds the real Pulse dashboard. Public operating-transparency numbers are calculated from actual run records, never typed into a static file.

## 8. Canonical model strategy

Agent identity is independent of model identity. The registry assigns a capability profile, and environment-specific configuration maps that profile to a current model.

| Capability profile | Intended work |
|---|---|
| `deterministic` | Validation, routing, counting, rendering, release checks; no model call |
| `structured-fast` | Extraction, classification, metadata, simple transformations |
| `general` | Routine drafting, summarization, distribution variants |
| `reasoning-high` | Research synthesis, verification, editorial review, data interpretation |
| `reasoning-pro` | Editor-in-Chief adjudication, standards, complex/high-risk investigations |

An initial OpenAI mapping may use GPT-5.6 Sol for the highest-complexity work and lower-cost GPT-5.6 family models for bounded tasks. Exact model IDs, reasoning effort, temperature-equivalent controls, and budgets live in deployment configuration and are recorded per run.

There is no rule that 26 logical agents produce 26 model calls. A workflow invokes only the roles required by its lane and risk tier.

## 9. Risk and authority model

| Tier | Typical activity | Phase-one authority |
|---|---|---|
| R0 | Deterministic validation, internal indexing, non-public transformations | Automatic |
| R1 | Routine low-risk announcements and explainers | Human release approval required |
| R2 | Market analysis, policy interpretation, consequential business claims | Human release approval required; enhanced verification |
| R3 | Health, legal, security, accusations, sensitive real-person quotations | Human approval always; specialist policy checks |
| R4 | Public social/email send, payment, entitlement mutation, deletion, or other irreversible external effect | Human approval always plus idempotency and audit event |

The AI Editor-in-Chief may return `approve_recommended`, `revise`, `spike_recommended`, or `escalate`. It cannot itself issue the final public-release transition in phase one.

## 10. Release architecture

### Code path

`feature branch → tests → pull request → review → main → Cloudflare preview/production deployment`

### Content path

`approved story record → deterministic release builder → immutable content bundle → validation → human release event → production publication → monitoring`

During the first implementation, approved content packages may be committed by a narrowly scoped release service to a dedicated content path/branch so the existing GitHub-to-Cloudflare deployment remains auditable. The release service, not a model, owns the commit.

Every release record contains:

- release ID and target environment
- story and artifact versions
- source/claim-map checksum
- agent, prompt, policy, and model versions
- validator results
- approver identity and timestamp
- cost and latency totals
- deployed content checksum
- prior release/rollback pointer

## 11. Security constitution

- No provider key, social token, email token, database credential, or signing secret may enter browser code or the repository.
- The credential found in the original archive must be rotated.
- Tool egress is allowlisted; URL retrieval blocks internal-address and redirect-based SSRF paths.
- External publishing, email, social, TTS, and image-generation endpoints require authentication, quotas, rate limits, and budget limits.
- Every external side effect uses an idempotency key.
- Raw chain-of-thought is not stored. The system stores concise decision rationales, evidence links, and structured review outcomes.
- Drafts and sources inherit retention policies; public releases are immutable and correction-linked.
- Internal Studio access and public customer identity are separate trust domains.
- Premium content is enforced server-side before payment launch.
- Binary assets are protected with `.gitattributes` and content checksums.

## 12. Target repository structure

```text
RTFCLMGZN/
├── apps/
│   ├── site/                 public Astro publication
│   └── studio/               private newsroom console
├── services/
│   └── orchestrator/         Worker API, Workflows, queues, schedules
├── packages/
│   ├── contracts/            schemas, lifecycle enums, event definitions
│   ├── agent-registry/       canonical 26-agent registry
│   ├── agents/               versioned role instructions
│   ├── policies/             risk, source, release, correction rules
│   ├── model-adapters/       provider-neutral execution layer
│   ├── release-builder/      deterministic public artifact builder
│   └── observability/        events, costs, traces, redaction
├── content/
│   ├── fixtures/             development/evaluation fixtures
│   └── releases/             generated, immutable release packages
├── docs/
│   ├── architecture/
│   ├── decisions/
│   └── operations/
├── infra/
│   └── cloudflare/           versioned deployment configuration
├── scripts/                  one-shot migration and verification utilities
├── tests/
│   ├── contracts/
│   ├── workflows/
│   ├── evals/
│   ├── security/
│   └── visual/
├── archive/
│   └── legacy-docs/          superseded blueprints retained for history
└── web/                      current site retained until cutover
```

This is the target, not an instruction to move every file immediately. The current `web/` remains deployable until `apps/site/` reaches parity.

## 13. Non-goals for the first core release

- Unsupervised high-risk publishing
- A general-purpose autonomous agent swarm
- Native desktop or mobile applications
- Enterprise multi-tenancy
- Full social-network automation
- Paid memberships before real entitlements and audience instrumentation
- Vector memory without a measured retrieval problem
- Rewriting the existing aesthetic before the control plane works

## 14. Amendment rule

A material change to the agent count, workflow stages, authority model, lifecycle, target runtime, data ownership, or release policy requires an Architecture Decision Record. Prompts and UI text cannot silently amend the constitution.
