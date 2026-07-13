from __future__ import annotations

from typing import Any


def estimate_cost_usd(
    config: dict[str, Any], provider: str, model: str, usage: dict[str, Any]
) -> float:
    provider_config = config.get("providers", {}).get(provider, {})
    pricing = (provider_config.get("pricing_per_million") or {}).get(model) or {}
    input_rate = float(pricing.get("input") or 0)
    output_rate = float(pricing.get("output") or 0)
    input_tokens = int(usage.get("input_tokens") or 0)
    output_tokens = int(usage.get("output_tokens") or 0)
    search_calls = int(usage.get("search_calls") or 0)
    search_rate = float(provider_config.get("web_search_per_call") or 0)
    cost = (
        input_tokens / 1_000_000 * input_rate
        + output_tokens / 1_000_000 * output_rate
        + search_calls * search_rate
    )
    return round(cost, 6)
