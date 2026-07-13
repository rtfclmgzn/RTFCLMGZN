# RTFCLMGZN Newsroom Core and Studio v0.3

A dependency-free, local-first control plane for the canonical RTFCLMGZN editorial operating system.

## Core properties

- 26 logical agents and 9 editorial personas
- original Claude agent specifications retained as bounded domain/voice guidance
- 12 deterministic checkpoints
- provider-neutral OpenAI/Gemini execution for checkpoints 1–8
- SQLite persistence, additive migration, idempotent jobs, dedupe, budgets, source snapshots, and audit events
- exact-version owner approval and checksum-sealed release packages
- fail-closed bounded publication policy
- private Studio bound only to `127.0.0.1` with a random session token

Autonomy, scheduling, public release, and social posting are disabled by default. Provider credentials are stored outside Git.

Launch from the repository root:

```text
RTFCLMGZN_PLATFORM.bat
```

Read `docs/operations/PLATFORM_V0_3.md` and `docs/operations/AUTOPILOT.md` before enabling a schedule.
