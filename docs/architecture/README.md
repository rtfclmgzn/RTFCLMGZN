# RTFCLMGZN Architecture Baseline v1.0

**Date:** 2026-07-13  
**Status:** Canonical architecture candidate; internally consistent and implementation-ready  
**Scope:** Repository audit, architecture constitution, agent registry, workflow/data contracts, contradiction resolution, and implementation roadmap  
**Source-code changes:** None

This package turns the existing RTFCLMGZN material into one coherent technical operating model. It does not pretend that the current static publication is already an autonomous newsroom. It separates the functioning publication prototype from the operating system that still needs to be built.

## Canonical verdict

RTFCLMGZN is now defined as an **AI-native business and AI-intelligence publication powered by an editorial operating system**.

The canonical numbers are:

- **26 logical agents**
- **9 editorial personas**
- **30 current `*.agent.md` files**, of which 4 are workflow/subtask wrappers rather than additional logical agents
- **12 editorial checkpoints** implemented as a governed directed workflow, not 12 unconditional serial model calls

The operating posture is:

> **AI-operated, human-governed, evidence-first, and auditable.**

During the first production phase, every public release requires a human approval action. Low-risk auto-publication may be introduced later only after measured evaluation thresholds, rollback controls, and a kill switch are in place. High-risk and irreversible actions remain human-approved.

## Reading order

1. [`00_EXECUTIVE_AUDIT.md`](00_EXECUTIVE_AUDIT.md) — what exists, what works, and what is simulated
2. [`01_ARCHITECTURE_CONSTITUTION.md`](01_ARCHITECTURE_CONSTITUTION.md) — the binding system design
3. [`02_CANONICAL_AGENT_REGISTRY.md`](02_CANONICAL_AGENT_REGISTRY.md) — the official 26-agent roster
4. [`03_WORKFLOW_AND_DATA_CONTRACTS.md`](03_WORKFLOW_AND_DATA_CONTRACTS.md) — stages, states, artifacts, and release rules
5. [`04_IMPLEMENTATION_ROADMAP.md`](04_IMPLEMENTATION_ROADMAP.md) — build sequence and acceptance gates
6. [`05_CONTRADICTION_AND_DECISION_LEDGER.md`](05_CONTRADICTION_AND_DECISION_LEDGER.md) — every material conflict and its resolution
7. [`06_EXISTING_DOCUMENT_DISPOSITION.md`](06_EXISTING_DOCUMENT_DISPOSITION.md) — what remains authoritative, what becomes historical
8. [`07_IMPLEMENTATION_ACCEPTANCE_GATE.md`](07_IMPLEMENTATION_ACCEPTANCE_GATE.md) — the exact conditions for beginning implementation
9. [`08_TECHNICAL_REFERENCES.md`](08_TECHNICAL_REFERENCES.md) — official platform references behind the target stack

## Source-of-truth order

After this package is adopted, conflicts are resolved in this order:

1. Versioned machine-readable contracts and agent registry
2. Architecture Constitution and recorded architecture decisions
3. Policy and risk rules
4. Agent prompts
5. Generated documentation and public UI copy
6. Historical plans, blueprints, and handover notes

No count, lifecycle state, model identifier, format label, page count, cost, or runtime metric may be maintained independently in prose when it can be derived from source data.
