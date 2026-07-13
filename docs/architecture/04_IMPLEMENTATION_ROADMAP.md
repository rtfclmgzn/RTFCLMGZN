# 04 — Implementation Roadmap

## 1. Build strategy

The project will advance through validated vertical slices, not a simultaneous rewrite of every feature. The first proof is one real story moving through evidence, drafting, review, human approval, release validation, and staging publication with a complete audit trail.

The current `web/` deployment remains available until the replacement public app reaches parity.

## 2. Phase 0 — Truth, security, and repository safety

**Purpose:** remove avoidable risk before runtime code gains external authority.  
**Indicative effort:** 1–2 focused days.

### Deliverables

- Rotate the non-empty API credential found in the archived secret file
- Confirm the secret file is absent from Git history and deployments
- Add binary-safe `.gitattributes` rules and verify every PDF checksum after a clean checkout
- Replace or qualify inaccurate “fully autonomous / 0 humans” public claims
- Verify Cloudflare custom-domain status, production branch, preview behavior, and rollback
- Move or reconfigure Pages Functions so server routes are actually deployed from the expected project root
- Disable the public TTS proxy until authentication, rate limiting, quotas, and the client integration exist
- Mark prior architecture documents as superseded or historical
- Establish the architecture-decision folder and source-of-truth hierarchy
- Capture the current visual baseline and production smoke-test checklist

### Exit gate

- No exposed credentials
- Clean secret scan
- PDFs survive fresh clone byte-for-byte
- Public copy accurately describes current functionality
- Production and preview deployments are reproducible
- Architecture package approved

## 3. Phase 1 — Newsroom Core v0

**Purpose:** build the smallest real editorial operating system.  
**Indicative effort:** 3–7 focused engineering days.

### Deliverables

- TypeScript workspace and shared contracts
- Machine-readable 26-agent registry and policy versions
- D1 schema for stories, sources, claims, artifacts, reviews, approvals, releases, runs, and events
- R2 artifact and release storage
- Deterministic lifecycle controller
- Provider-neutral model adapter using structured outputs
- Budget, timeout, retry, and idempotency controls
- One workflow lane: synthesis article
- Private approval endpoint and minimal Studio review screen
- Append-only event and usage logging
- Unit, contract, state-transition, and security tests

### First vertical slice

1. Founder creates a candidate.
2. Managing Editor produces an assignment.
3. Research produces a source set.
4. Verification produces an initial claim map.
5. One persona produces a draft.
6. Editorial Review and Verification return decisions.
7. Compliance assigns risk.
8. EIC recommends disposition.
9. Founder approves a specific version.
10. Release builder creates a staging package.
11. Deterministic gates pass.
12. The staging article publishes with a real run timeline and cost record.

### Exit gate

- A process restart does not lose workflow state
- Repeated events do not duplicate work or publication
- Unsupported output cannot advance the state machine
- Human approval pauses/resumes durably
- Every public sentence’s material claims can be traced to evidence
- A failed publish can be retried or rolled back safely

## 4. Phase 2 — Public publication migration

**Purpose:** preserve the aesthetic while fixing maintainability and discoverability.  
**Indicative effort:** 5–10 focused engineering days.

### Deliverables

- `apps/site` Astro/TypeScript application
- Typed content collections and importers for current article/guide/persona data
- Real article, persona, company, issue, archive, and resource routes
- Per-page metadata, canonical URLs, RSS, sitemap, and structured data
- Shared design tokens and component library derived from current CSS
- Selective interactive islands for search, reader, theme, library, and dashboards
- Redirect map from hash URLs
- Automated accessibility and visual-regression coverage
- Release-package ingestion from Newsroom Core

### Exit gate

- Core current routes have visual parity or an approved improvement
- No critical console, accessibility, broken-link, or overflow failures
- Article pages have stable crawlable URLs and correct previews
- Current content imports without silent truncation or format relabeling
- Cloudflare preview and production deployments pass smoke tests

## 5. Phase 3 — Durable orchestration and real Pulse

**Purpose:** make the operating system observable and resilient.  
**Indicative effort:** 3–6 focused engineering days after Core v0.

### Deliverables

- Cloudflare Workflows for durable stage execution and approval waits
- Queues for fan-out, channel jobs, retries, and dead-letter handling
- Scheduled candidate intake and edition windows
- Real Pulse timeline from events
- Actual token, cost, latency, retry, and failure dashboards
- Alerting for stuck workflows, budget overruns, release failure, and DLQ growth
- Run replay against fixtures without external side effects

### Exit gate

- Workflows survive timeout/restart scenarios
- DLQ and retry behavior are tested
- Pulse shows only actual events
- Cost totals reconcile to provider usage within an accepted tolerance

## 6. Phase 4 — Audience infrastructure

**Purpose:** create real audience ownership before monetization.  
**Indicative effort:** 3–7 focused engineering days.

### Deliverables

- Server-side newsletter subscription endpoint and provider integration
- Double opt-in and unsubscribe handling
- Real privacy/cookie behavior and data retention policy
- Cookieless or consent-aware analytics
- Contact and correction forms with spam controls
- Professional domain email routing
- Newsletter edition approval and idempotent send workflow

### Exit gate

- Subscriptions persist outside the browser
- Consent, unsubscribe, and deletion flows work
- No duplicate sends on retry
- Audience metrics are real and documented

## 7. Phase 5 — Magazine production system

**Purpose:** make magazines reproducible rather than hand-maintained divergent artifacts.  
**Indicative effort:** 5–10 focused engineering days.

### Deliverables

- Canonical issue manifest
- Web reader and PDF generated from the same manifest
- Page-count, image uniqueness, fold, typography, asset, and parity validators
- Unique art commissioning/generation workflow with provenance
- Correct Primer and Issue 001 to the 40–80-page standard
- Exported Issue 001 PDF
- Magazine preview and approval flow

### Exit gate

- Web and PDF content/page checksums agree
- No duplicate primary art under the standard
- Visual QA passes wide desktop, standard desktop, tablet, and mobile
- Download filenames and metadata are deterministic

## 8. Phase 6 — Commercial foundation

**Purpose:** add monetization only after identity, entitlement, and audience systems are trustworthy.  
**Indicative effort:** 1–2 focused engineering weeks.

### Deliverables

- Public identity provider and account model
- Stripe product, checkout, webhook, refund, and reconciliation flows
- Server-side entitlements and protected premium delivery
- Subscriber archive and billing management
- Sponsor inventory, disclosure, and campaign records
- Revenue telemetry separated from forecasts

### Exit gate

- Client code cannot reveal protected content without valid entitlement
- Webhook replay is idempotent
- Refund/cancellation/expiry behavior is tested
- Financial and sponsorship disclosures are accurate

## 9. Phase 7 — Bounded autonomy and channel expansion

**Purpose:** increase throughput without weakening trust.  
**Timing:** only after a sufficient body of measured production runs.

### Deliverables

- Golden evaluation set and ongoing regression suite
- Policy-based R1 auto-release eligibility
- Automated rollback and kill switch
- Social and podcast adapters with approval policy
- Additional research lanes and specialist tools
- Retrieval/memory subsystem only where evaluation proves value
- Enterprise/API surfaces only after internal contracts stabilize

### Exit gate for any auto-publication

- Required evaluation thresholds sustained over an agreed sample window
- No unresolved high-severity incidents
- Source/claim coverage and policy checks pass automatically
- Rollback and kill-switch drills pass
- Public disclosure describes the actual autonomy level

## 10. Work that should not begin early

Do not begin these before their dependencies:

- paid membership before server-side entitlements
- social auto-posting before approvals, idempotency, and monitoring
- “global reader map” claims before aggregated analytics exist
- model fine-tuning before prompt/contract/evaluation baselines exist
- vector memory before a retrieval benchmark demonstrates need
- mobile/desktop apps before the public and Studio contracts stabilize
- a full visual redesign before the first end-to-end newsroom lane works

## 11. Critical risk register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Scope explosion across 26 agents | High | High | Implement one lane; agents are registry roles, not simultaneous processes |
| False confidence from generated prose | High | High | Claim maps, source classes, deterministic gates, human approval |
| Cost runaway | Medium | High | Capability profiles, per-run budgets, quotas, batch/offline work, alerts |
| Provider lock-in | Medium | Medium | Provider-neutral adapter and schema contracts |
| Workflow duplication after retry | Medium | High | Idempotency keys, expected-version transitions, durable checkpoints |
| Static site regression during migration | Medium | High | Strangler migration, preview deploys, visual regression, redirect plan |
| Public trust damage from autonomy claims | Medium | High | Truthful copy and evidence-backed transparency |
| Asset/PDF corruption | Medium | Medium | `.gitattributes`, checksums, generated manifests, clean-clone gate |
| Commercial launch before security | Medium | High | Phase gates and server-side entitlement tests |
