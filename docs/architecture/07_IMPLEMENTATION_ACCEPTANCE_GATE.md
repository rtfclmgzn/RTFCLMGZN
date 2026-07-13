# 07 — Implementation Acceptance Gate

## 1. Architecture-consistency verdict

The architecture in this package is internally consistent. The following decisions form one compatible system:

- 26 logical agents and 9 personas
- four extra `.agent.md` files reclassified as workflows/subtasks
- 12-checkpoint governed workflow
- deterministic controller ownership of lifecycle and side effects
- AI-operated, human-governed release policy
- static-first Astro public plane
- Cloudflare Worker/Workflows/Queues control plane
- D1 state and event store, R2 artifact store
- provider-neutral model capability profiles
- versioned claim, artifact, approval, and release contracts
- separate code deployment and content release paths
- strangler migration from the current site

No source code should be written against a different count, lifecycle, authority model, or source-of-truth hierarchy without an ADR.

## 2. Founder sign-off items

Implementation can proceed once these five high-impact decisions are accepted as the project baseline:

1. **Roster:** 26 logical agents, 9 personas, 30 current spec files with four reclassified workflows/subtasks.
2. **Governance:** all public releases require human approval in Phase one; R3/R4 always remain human-approved.
3. **Stack:** Astro/TypeScript public app; Cloudflare Worker + Workflows + Queues; D1/R2.
4. **Workflow:** the 12 checkpoints and controller-owned state machine.
5. **Content contract:** Brief 250–649, Synthesis 650–2,199, Research 2,200+ with a ~3,500 target and additional evidence/data requirements.

A simple approval of Architecture Baseline v1.0 is sufficient; no additional design session is required before Phase 0.

## 3. Phase-0 preflight checklist

Before implementation begins:

- [ ] Rotate the archived non-empty API key
- [ ] Confirm no secret is present in Git history or Cloudflare deployment output
- [ ] Add/verify binary-safe `.gitattributes`
- [ ] Record current production and preview deployment settings
- [ ] Correct misleading autonomy/metric claims on the live site
- [ ] Verify or disable `/api/tts`
- [ ] Create architecture/decision/operations documentation directories
- [ ] Mark superseded documents clearly
- [ ] Preserve the visual baseline and smoke tests

## 4. Newsroom Core v0 definition of done

- [ ] Registry is machine-readable and validates to exactly 26 logical agents and 9 personas
- [ ] Every public count is derived from the registry
- [ ] Story transitions use expected versions and idempotency keys
- [ ] Workflows resume after interruption
- [ ] Model output is schema-validated before persistence
- [ ] Material claims map to evidence and verification status
- [ ] Human approval binds to exact artifact/release versions
- [ ] Agents cannot directly publish or invoke uncontrolled side effects
- [ ] Secrets never enter source, browser, or unredacted logs
- [ ] Costs and tokens come from actual run records
- [ ] One synthesis article completes the full vertical slice to staging
- [ ] Publish retry and rollback are tested
- [ ] Security, contract, workflow, and smoke tests pass

## 5. Change-control rule

During implementation, a proposed shortcut is rejected when it would:

- place lifecycle authority inside a prompt
- let a model write directly to production
- bypass approval for an R3/R4 action
- create a second source for counts or state
- store secrets in files
- publish unvalidated model output
- present simulated telemetry as real
- expose premium content through client-only controls
- make the migration dependent on an all-at-once cutover

## 6. Immediate next implementation unit

The first implementation unit is **Phase 0: Truth, Security, and Repository Safety**. The first code-producing unit after Phase 0 is **Newsroom Core v0’s story contracts, registry, and lifecycle controller**, followed immediately by the single synthesis-story vertical slice.
