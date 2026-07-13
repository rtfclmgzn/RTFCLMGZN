# Newsroom Core and Studio v0.3

Newsroom Core is the executable local control plane for RTFCLMGZN. Newsroom Studio is its private owner interface. Both bind only to `127.0.0.1` and use a random per-launch API token.

## Operational capabilities

- canonical 26-agent registry and 9 personas
- deterministic 12-checkpoint lifecycle
- OpenAI Responses and Gemini Interactions adapters with structured outputs
- original Claude agent specifications loaded as bounded guidance
- persistent story, source, claim, artifact, approval, cycle, job, provider-call, budget, policy, release, distribution, and event records
- source/citation URL integrity guards, claim-to-source checks, and exact-version approvals
- local Windows scheduler manager with overlap lock and stale-cycle reconciliation
- checksum-sealed release packages and controlled GitHub/Cloudflare publication
- private command center with cost, provider, queue, policy, and incident visibility

## Safety boundary

Models may create structured evidence and editorial artifacts only. They cannot change lifecycle state, read credentials, edit repository files, commit, push, publish, email, post socially, or spend outside configured limits. Those actions are owned by deterministic code and explicit policy.

The installation default is `draft_only`; schedule and automatic publication are off.

## Owner workflow

1. Run diagnostics and the non-publishable fixture demonstration.
2. Configure one provider credential outside Git.
3. Run a dry cycle.
4. Run a manual cycle in `draft_only` or `approval_required`.
5. Review sources, claims, artifacts, policy reasons, and spend in Studio.
6. Approve or reject the exact draft artifact.
7. Publish through the Release Manager.
8. Enable scheduling only after repeated successful manual cycles.

See `AUTOPILOT.md`, `PROVIDER_SETUP.md`, and `INCIDENT_RESPONSE.md` in this directory.
