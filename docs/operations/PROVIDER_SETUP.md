# Model-provider setup

Platform v0.3 includes provider adapters but no credentials.

## Supported adapters

### OpenAI

- Endpoint family: Responses API
- Structured output: strict JSON Schema through `text.format`
- Optional research tool: web search
- Default capability profiles: GPT-5.6 Sol, Terra, and Luna

### Gemini

- Endpoint family: Interactions API
- Request revision pinned to the post-May-2026 `steps` and polymorphic `response_format` contract
- Structured output: JSON Schema
- Optional research tool: Google Search grounding
- Default capability profiles: Gemini 3.1 Pro Preview, Gemini 3.5 Flash, and Gemini 3.1 Flash-Lite

Model IDs and prices are configuration and can change. Review provider documentation and account availability before activating a model. Provider endpoints are pinned to the official OpenAI, Google, and Meta hosts so a tampered local configuration cannot redirect credentials to an arbitrary server. HTTP redirects are rejected by the provider client.

## Credential storage

Use `CONFIGURE_RTFCLMGZN_AUTOPILOT.bat`. On Windows, secrets are encrypted with DPAPI and stored outside the Git repository under the current user's local application-data directory. They are readable only by that Windows user on that machine.

Environment variables are also supported:

```text
OPENAI_API_KEY
GEMINI_API_KEY
META_PAGE_ACCESS_TOKEN
META_PAGE_ID
META_INSTAGRAM_BUSINESS_ACCOUNT_ID
```

Never place credentials in `.js`, `.json`, `.md`, `.bat`, `.env` committed to Git, article packages, or ChatGPT/Claude handover archives.

## First acceptance sequence

1. Configure one provider, not both.
2. Keep the mode at `draft_only`.
3. Run diagnostics.
4. Run a dry cycle.
5. Run one real manual cycle.
6. Review provider model, citations, token use, search-call count, estimated spend, and all artifacts.
7. Add the second provider only after the first path is stable.

## Provider failure behavior

HTTP retries are bounded. Invalid JSON, schema mismatch, refusals, incomplete responses, ungrounded URLs, private/local URLs, and provider errors fail closed. The router may try the next configured provider, but the deterministic policy still recomputes evidence and release eligibility from persisted artifacts.
