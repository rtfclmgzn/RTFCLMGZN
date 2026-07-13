// RTFCLMGZN — Cost configuration for the token/cost observability system.
// Rates are PER MILLION TOKENS (input/output), except image models (per image).
// The dashboard NEVER hardcodes prices — it reads them here. Update this file
// when API pricing changes, and bump `last_verified`.
//
// last_verified: 2026-07-09
// sources:
//   Anthropic: https://platform.claude.com/docs/en/about-claude/pricing
//   Gemini image: https://ai.google.dev/gemini-api/docs/pricing
//
// IMPORTANT — subscription vs. API billing:
//   On a Claude.ai Pro ($20) / Max ($100) subscription you are NOT billed per token;
//   you pay a flat fee against usage limits. The dollar figures this system shows are
//   "API-equivalent compute cost" — what the same work would cost on pay-as-you-go API.
//   That is (a) a universal yardstick for comparing articles/tasks, and (b) exactly the
//   number that tells you whether pay-as-you-go API would be cheaper than a Max plan.
//   See agents/_shared/observability.md.
window.RTFC_COST_CONFIG = {
  currency: "USD",
  last_verified: "2026-07-09",
  unit: "per_million_tokens",
  // Reference discount multipliers (applied only when a task record marks them used).
  discounts: {
    batch: 0.5,        // Batch API ≈ 50% off (non-time-sensitive jobs)
    cached_input: 0.1  // Prompt caching ≈ 90% off cached input (you pay 10%)
  },
  models: {
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
      note: "Frontier model used for founder-directed sessions and premium editorial work. Public list price per our own coverage (live-001 comparison)."
    },
    "gemini-2.5-flash-image": {
      label: "Gemini 2.5 Flash Image (Nano Banana, legacy)",
      per_image: 0.039, per_image_batch: 0.0195,
      note: "Legacy image model; superseded by 3.1 flash lite."
    },
    "gemini-3.1-flash-lite-image": {
      label: "Nano Banana 2 Lite (Gemini 3.1 Flash Lite Image)",
      per_image: 0.0336, per_image_batch: 0.0168,
      note: "Current default for all image generation — better quality, faster, cheaper than 2.5. Verified working 2026-07-10."
    }
  }
};
