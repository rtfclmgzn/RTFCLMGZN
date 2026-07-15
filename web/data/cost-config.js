// RTFCLMGZN — Cost configuration for the token/cost observability system.
// Rates are PER MILLION TOKENS (input/output), except image models (per image).
// The dashboard NEVER hardcodes prices — it reads them here. Update this file
// when API pricing changes, and bump `last_verified`.
//
// IMPORTANT — subscription vs. API billing:
//   ChatGPT/Claude subscription sessions are not billed per token. Records generated in
//   those sessions are marked estimated and priced here only as an API-equivalent yardstick.
window.RTFC_COST_CONFIG = {
  currency: "USD",
  last_verified: "2026-07-14",
  unit: "per_million_tokens",
  discounts: {
    batch: 0.5,
    cached_input: 0.1
  },
  models: {
    "gpt-5.6-sol": {
      label: "GPT-5.6 Sol",
      input: 5, output: 25,
      note: "API-equivalent estimate for work performed through a ChatGPT subscription session; not an additional per-token subscription charge."
    },
    "gpt-5.6-terra": {
      label: "GPT-5.6 Terra",
      input: 2.5, output: 15,
      note: "Newsroom Core compose/review model for brief and synthesis lanes. Rates mirror the autonomy provider table in newsroom/config/autonomy.default.json; billed per token via the OpenAI API, not a subscription."
    },
    "gpt-5.6-luna": {
      label: "GPT-5.6 Luna",
      input: 1, output: 6,
      note: "Newsroom Core discovery and structured-fast lane. Rates mirror the autonomy provider table in newsroom/config/autonomy.default.json; billed per token via the OpenAI API, not a subscription."
    },
    "openai-web-search": {
      label: "OpenAI web search (per call)",
      per_image: 0.01, per_image_batch: 0.01,
      note: "Per-call web-search tool billing, not an image model. Priced through the per-call field because the ledger has no separate search-call rate; `images` carries the search-call count."
    },
    "claude-opus-4-8": {
      label: "Claude Opus 4.8",
      input: 5, output: 25,
      note: "Judgment/verification/adjudication passes."
    },
    "claude-sonnet-5": {
      label: "Claude Sonnet 5",
      input: 2, output: 10,
      note: "Introductory pricing in effect through 2026-08-31. Rises to $3/$15 after — update this config and re-verify then.",
      scheduled_change: { on: "2026-09-01", input: 3, output: 15 }
    },
    "claude-haiku-4-5": {
      label: "Claude Haiku 4.5",
      input: 1, output: 5,
      note: "High-volume/low-stakes: style, compliance flagging, publishing, tagging, social copy."
    },
    "claude-fable-5": {
      label: "Claude Fable 5",
      input: 10, output: 50,
      note: "Frontier model used for founder-directed sessions and premium editorial work."
    },
    "gemini-2.5-flash-image": {
      label: "Gemini 2.5 Flash Image (Nano Banana, legacy)",
      per_image: 0.039, per_image_batch: 0.0195,
      note: "Legacy image model; superseded by 3.1 flash lite."
    },
    "gemini-3.1-flash-lite-image": {
      label: "Nano Banana 2 Lite (Gemini 3.1 Flash Lite Image)",
      per_image: 0.0336, per_image_batch: 0.0168,
      note: "Current default for image generation."
    }
  }
};
