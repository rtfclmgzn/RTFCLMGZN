# RTFCLMGZN — Loop Doctrine: iterate in one context, don't multiply agents

Mandatory context for the cycle runner, the breaking scan, and anyone editing agent specs.

## The decision, stated plainly

This newsroom's next capability gain comes from **loops inside one agent**, not from more agents. The 21 named "agents" in `agents/` are editorial ROLES — voices, checklists, standards. They are prompt material, not processes. The actual workers are three runbook-driven runs (cycle, breaking scan, pulse scan), each a single model following a script. That architecture is correct, and here is why it stays:

1. **Handoffs lose context; loops keep it.** A verifier agent reading a draft cold re-derives everything the drafter knew. The same model re-reading its own draft against a checklist already has full context — the revision pass is where quality actually appears.
2. **Coordination is the expensive part.** Every additional autonomous process needs its own schedule slot, lock, budget guard, failure mode, and log. The catch-up-gate and mojibake incidents in the runbooks all came from process boundaries, never from a model thinking too little.
3. **Bounded loops are auditable.** "Draft, critique once, revise once, gate" is a fixed cost with a visible trail in the pipeline record. "Spawn agents until it's good" is neither.

When a genuinely parallel workload appears (say, translating the archive), revisit. Until then: any proposal that adds a scheduled process must show why a loop inside an existing run can't do it.

## The mandated loops

Every article a run produces goes through these, in order. Each is ONE bounded pass — never iterate to exhaustion; a second full revision means the story wasn't ready and should be dropped or downgraded, not polished harder.

### Loop 1 — Draft → Critique → Revise (per article)
After drafting, re-read your own draft ONCE, adversarially, as if you were the Standards Editor, against exactly this list:
- Self-referential language ban (title, dek, body) — the recurring burn.
- Every citation URL real and load-bearing; every claim traceable; conflicts reconciled in prose, not silently resolved.
- §3a depth: apply block earned, cross-links natural, prior context phrased about the event.
- §3b visual floor: components present, every value traceable to the article's own text, no decoration, `sourcecheck` if reporting hit conflicting figures.
- TL;DR: 4-5 bullets, final bullet carries the load-bearing caveat.
Then revise once. Record "critique found: X, revised: Y" (or honestly: "critique found nothing") in the pipeline block — a critique that never finds anything is not being run.

### Loop 2 — Component provenance check (mechanical)
For every component block: walk its numeric values and confirm each appears in the article's title/dek/tldr/body text. One that doesn't gets fixed or deleted — never explained away.

### Loop 3 — Publish gate (already in the runbooks)
Surface guard → UTF-8 check → cache-buster → push → deploy verification. Never reordered, never skipped on a "small" change.

## Model routing stays tiered, not multiplied

- **Pulse scan** (3-hourly): haiku-class. Maintains live surfaces; flags, never judges. Its runbook forbids editorial decisions — escalation IS the loop boundary.
- **Cycle** (3x daily): sonnet-class, full runbook with Loops 1–3.
- **Breaking scan**: same standards as the cycle; the bar for publishing is higher, not lower, because speed pressure is exactly when the critique pass earns its cost.

## What was deliberately NOT built

- No "editor agent reviews writer agent" process pair — Loop 1 replaces it at zero coordination cost.
- No persistent daemon; Task Scheduler + gates is boring and survives reboots.
- No queue between runs; git is the queue and the audit log.
