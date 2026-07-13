# Newsroom incident response

## Immediate containment

1. Disable the scheduled task.
2. Set operating mode to `off` or `draft_only`.
3. Do not delete the SQLite database, event trail, release ZIP, or Git commit.
4. If a credential may be exposed, revoke it at the provider and remove it from the local vault.
5. If a story is disputed, stop distribution and record a correction case before editing the public artifact.

## Evidence to preserve

- `newsroom/data/newsroom.db*`
- relevant `newsroom/releases/*.zip`
- `web/release.json`
- release record under `docs/operations/releases/`
- Git commit hash and Cloudflare deployment identifier
- Studio event export
- provider request/response hashes, model ID, usage, and citation metadata

Prompts and complete provider payloads are not recorded by default. Do not turn on full payload recording without reviewing privacy and credential implications.

## Recovery checks

- run `RTFCLMGZN_PLATFORM_DIAGNOSTICS.bat`;
- confirm Git is clean and on `main`;
- confirm no duplicate scheduled task or stale lock exists;
- confirm the provider model/API contract still matches the adapter;
- verify budgets and rate limits;
- repeat a dry cycle before a real cycle;
- require owner approval for the first post-incident release.

## Public correction principle

Do not silently overwrite a material factual error. Preserve the original event/release record, publish a clear correction note, identify what changed, and link the correction to the source and claim records that justified it.
