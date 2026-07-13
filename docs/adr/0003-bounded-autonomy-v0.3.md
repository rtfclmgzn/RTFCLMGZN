# ADR-0003: Bounded autonomy and provider-neutral execution

**Status:** Accepted  
**Date:** 2026-07-13  
**Supersedes:** The provider/scheduler limitation described in ADR-0002

## Decision

RTFCLMGZN Platform v0.3 adds a provider-neutral execution layer, persistent autonomy state, a local scheduler manager, deterministic publication policy, and controlled distribution queues.

Autonomy is **bounded**, not absolute:

- models may discover candidates and produce schema-validated artifacts;
- deterministic code owns lifecycle state, budgets, deduplication, retries, approval records, Git, publication, and distribution authority;
- the default mode is `draft_only`;
- scheduling, automatic publication, and automatic social posting are disabled by default;
- a public release requires either an exact-version owner approval or a separately recorded owner preauthorization under `bounded-publication-v1.0`;
- even with preauthorization, only low-risk R1 stories that pass every deterministic source, claim, editorial, verification, compliance, budget, Git, and rate-limit gate may publish automatically;
- blocked sections and topics always route to owner review;
- a command-line execution flag is required in addition to configuration before bounded publication can occur;
- owner preauthorization expires after a bounded period;
- the first automatic release is impossible until at least one Newsroom release has been directly owner-approved and successfully published.

## Provider architecture

The runtime supports:

- OpenAI Responses API with Structured Outputs and optional web search;
- Gemini Interactions API with JSON Schema output and optional Google Search grounding;
- deterministic fixtures for tests and demonstrations.

The provider router maps canonical capability profiles to configurable model IDs. Model names and pricing remain configuration, not architecture. Failed providers may be bypassed by the ordered router, but publication policy is recomputed locally from persisted artifacts.

## Credentials

Credentials are never stored in Git, browser JavaScript, release ZIPs, logs, prompts, or the SQLite database.

On Windows they are stored outside the repository using DPAPI, scoped to the current Windows user. Environment variables are supported for ephemeral execution. The installer contains no credentials and never makes a model API call.

## Existing Claude specifications

The original `agents/**/*.agent.md` files remain valuable domain and voice specifications. Platform v0.3 maps the canonical 26 logical agents to those files and loads them as bounded prompt guidance. The Architecture Constitution, machine-readable registry, schemas, and deterministic safety rules override any conflicting legacy instruction.

## Consequences

The system can prepare complete stories autonomously after credentials are configured. Automatic public release remains deliberately harder to enable than draft generation. Real-provider acceptance, Windows Task Scheduler acceptance, authenticated GitHub push, and Cloudflare deployment confirmation must be completed on the owner's computer before production autonomy is considered operational.
