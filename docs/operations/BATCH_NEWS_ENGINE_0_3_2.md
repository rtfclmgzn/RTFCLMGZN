# Batch News Engine 0.3.2

## Purpose

The Batch News Engine replaces the expensive one-story/eight-model-call acceptance path with a shared-scan architecture designed for a variable newsroom cadence.

## Operating target

- Scan every four hours: six possible windows per UTC day.
- Select zero to three qualified stories per scan.
- Maximum twelve autonomy-created stories per UTC day.
- Daily mix target: approximately 65–75% briefs and 20–30% synthesis.
- Research stories: no more than two per week by default.
- Never force filler to satisfy a count.

## Cost architecture

1. One Luna-class web discovery call scans for multiple candidates.
2. Candidate source URLs are downloaded once and cached for twelve hours.
3. Briefs in the same scan share one compose call and one independent review call.
4. Synthesis stories in the same scan share one compose call and one independent review call.
5. Lifecycle checkpoints consume cached structured artifacts without additional model calls.
6. Social and newsletter drafts are generated deterministically from the approved article boundary.
7. A hard daily model budget remains authoritative.

This is an engineering target, not a guaranteed per-article price. Real usage is recorded in the budget ledger and must be observed before scheduling or automatic publication is enabled.

## Source policy

- Every candidate needs at least two governed source leads.
- Primary or official evidence is preferred.
- Source pages are treated as untrusted data, never instructions.
- Redirects, local/private network destinations, oversized responses, and unsupported content types are rejected.
- At least one source page must be fetched directly and two independent source domains must be present before a story can become release-ready. If direct fetching fails, metadata notes may still support a draft for review, but deterministic publication remains blocked.

## Safety state after installation

- Existing credentials are preserved outside the repository.
- Operating mode remains `draft_only` unless the owner previously selected another safe mode.
- Scheduling remains disabled.
- Automatic publication remains disabled.
- No editorial release is bundled or published by the installer.

## Acceptance sequence

1. Apply the 0.3.2 patch.
2. Run diagnostics.
3. Run one real batch in `draft_only` mode after the UTC budget has enough room.
4. Inspect actual cost, source coverage, article quality, and policy outcomes.
5. Tune thresholds and budgets before enabling any schedule.
6. Keep automatic publication disabled until repeated batches pass acceptance.
