# RTFCLMGZN Platform v0.3 operations

## Installed components

- Architecture Baseline v1.0
- Canonical registry of 26 logical agents and 9 editorial personas
- Deterministic 12-checkpoint editorial workflow
- SQLite Newsroom Core with additive schema migration
- Private local Newsroom Studio
- Provider-neutral model router
- OpenAI Responses and Gemini Interactions adapters
- Structured artifact schemas for discovery and checkpoints 1–8
- Persistent autonomy cycles, jobs, provider-call audit, budgets, source snapshots, policy decisions, dedupe keys, and distribution queue
- Windows DPAPI credential vault outside the repository
- Windows Task Scheduler manager
- Bounded publication policy and exact-version approval
- Editorial Release Manager v1.2
- Git safety rules, backup tooling, rollback, diagnostics, and root launchers

## Fail-closed defaults

Installation does not start a scheduler or call a model. The installed default configuration is:

```text
mode                       draft_only
schedule                   disabled
automatic publication      disabled
owner preauthorization     disabled
automatic social posting   disabled
editorial release bundled  no
provider credentials       not included
```

The machine-local configuration is stored outside Git. The installer does not overwrite an existing local configuration.

## Owner launchers

- `RTFCLMGZN_PLATFORM.bat` — owner menu
- `RTFCLMGZN_NEWSROOM.bat` — private Studio
- `CONFIGURE_RTFCLMGZN_AUTOPILOT.bat` — credentials, budgets, mode, and schedule wizard
- `RUN_RTFCLMGZN_AUTOPILOT.bat` — one controlled manual cycle
- `ENABLE_RTFCLMGZN_AUTOPILOT.bat` — enable the configured Windows scheduled task
- `DISABLE_RTFCLMGZN_AUTOPILOT.bat` — disable the scheduled task
- `RTFCLMGZN_RELEASE_MANAGER.bat` — editorial release dashboard
- `RTFCLMGZN_PLATFORM_DIAGNOSTICS.bat` — tests and platform doctor

## Controlled activation order

1. Install Platform v0.3 and keep the platform commit local.
2. Run diagnostics.
3. Open the Studio and verify the fixture demonstration.
4. Push the platform-only commit and confirm Cloudflare.
5. Run the configuration wizard and add one provider credential.
6. Select `draft_only` or `approval_required` first.
7. Run one dry cycle, inspect cost and artifacts, then run one real manual cycle.
8. Review a complete story through checkpoint 9.
9. Publish at least one release through direct owner approval; this is a hard acceptance-history gate.
10. Enable scheduling only after the manual cycle is accepted.
11. Consider bounded publication only after successful owner-reviewed cycles; owner preauthorization expires after the configured window and must be renewed.

## Recovery

Pre-install backups are written outside the repository under:

```text
%LOCALAPPDATA%\RTFCLMGZN\platform\backups\
```

If installation fails before a commit, the installer restores the previous files and staging state. If a local commit exists but GitHub push fails, the commit remains intact and can be retried.

Autonomy runtime data is local and ignored by Git:

```text
newsroom/data/newsroom.db*
newsroom/data/autopilot.lock
newsroom/data/uploads/
newsroom/releases/*.zip
newsroom/logs/
```

## Acceptance boundary

Package tests do not prove that the owner's API credentials, Windows Task Scheduler, GitHub authentication, provider account limits, or Cloudflare deployment are working. Those are explicit desktop acceptance checks. Until they pass, the platform is installed software—not an accepted production autonomous newsroom.
