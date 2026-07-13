# RTFCLMGZN — Token & Cost Observability (Priority 0)

The measurement layer. Every agent task logs a structured usage record; the public `/usage` page rolls those up. This is the basis for the real decision between the $20/mo Pro plan (optimize to fit) and $100/mo Max (if usage genuinely requires it) — and for the brand's operating transparency.

**Design rule #1: the measurement layer is plain code, never an LLM.** No agent is ever invoked to count tokens, describe a task, or summarize usage. Token counts come from API metadata; descriptions are templated; all rollups are arithmetic in the browser.

## Files

| File | Role |
|---|---|
| `web/data/cost-config.js` | Per-model rates (per-MTok, or per-image), discounts, `last_verified` date, sources. The ONLY place prices live. |
| `web/data/usage-log.js` | Append-only array of task records (`window.RTFC_USAGE_LOG`). |
| `web/assets/app.js` → `/usage` | Client-side rollups (day/7d/30d/all-time · per-article · per-model · per-task), CSV/JSON export. Pure arithmetic. |

## The `log_task` contract (what every agent appends)

On completing a task, an agent appends ONE object to the `window.RTFC_USAGE_LOG` array in `web/data/usage-log.js`:

```js
{ id:"u-XXXX",                 // sequential unique id
  ts:"<ISO timestamp>",
  article_id:"live-0NN",       // the article this belongs to, or "system"
  agent:"research",            // agent name
  task_type:"research",        // research|writing|quality|factcheck|copyedit|compliance|publishing|adjudication|image|social|review
  description:"Wrote 860-word synthesis on Grok 4.5 in Sage's voice",  // TEMPLATED, not LLM-generated
  model:"claude-sonnet-5",     // exact model used for THIS task
  input_tokens: 4000,          // from API usage metadata (see accuracy note)
  output_tokens: 1400,
  cached_input_tokens: 3000,   // optional — portion of input served from cache (billed at 10%)
  batch: false,                // optional — true if Batch API (50% off) was used
  images: 0,                   // optional — for image-gen tasks
  measured:"metered" }         // "metered" (exact) | "estimated" (approx; e.g. retrofits)
```

- **Descriptions are templated from known parameters** — e.g. `` `Wrote ${wordCount}-word ${format} on ${topic}` ``, `` `Generated ${n} images for ${platform}` ``, `` `Posted to ${platforms.join(' + ')}` ``. Never call a model to write them.
- **Cost is NOT stored.** The dashboard computes it from `cost-config.js` at render time, so a rate change re-prices all history consistently.

## Accuracy note — where token counts come from (read this)

The honesty of every number depends on the execution model:

- **Direct API calls (the correct architecture for accurate accounting):** every Anthropic response returns `usage.input_tokens` / `usage.output_tokens`, and each image call's count is known. Log those directly → `measured:"metered"`, exact, zero overhead. This is what the schema is built for.
- **Claude Code agent runs (the current bootstrap):** a run's true token consumption is the whole agent session (system prompts, tool results, reasoning), which a passive log file cannot cleanly decompose per task. Records from this path are best-effort `measured:"estimated"` and should be treated as directional, not exact. They also **undercount**, because agent-session overhead is much larger than the article text itself.

**Implication for the plan decision:** to get numbers accurate enough to decide $20 vs $100 vs pay-as-you-go API, the automated pipeline should run as **direct API calls** (own key, own token metadata). That is also the architecture the later cloud-migration phase points toward. Until then, treat `/usage` as a directional estimate and weight it toward "cost is at least this much."

## Subscription vs. API billing (so the dashboard isn't misread)

On a Claude Pro/Max **subscription** you are billed a flat fee against usage limits — **not** per token. The dashboard's dollar figures are **API-equivalent compute cost**: what the same work would cost at pay-as-you-go API rates. That number is still exactly what you need, because it answers "would pay-as-you-go API be cheaper than a Max subscription for my volume?" — and it's a stable yardstick for comparing articles and tasks regardless of how you're billed.

## Maintenance

- Re-verify rates in `cost-config.js` whenever Anthropic/Google change pricing; bump `last_verified`. **Sonnet intro pricing ends 2026-08-31** — update then (a `scheduled_change` is noted in the config).
- Every new agent (social, review, image, etc.) must call `log_task` from day one. No exceptions.
