from __future__ import annotations

from typing import Any

from ..security.vault import CredentialVault
from .gemini_interactions import GeminiInteractionsProvider
from .openai_responses import OpenAIResponsesProvider
from .structured import StructuredResponse


class ProviderRoutingError(RuntimeError):
    pass


class ProviderRouter:
    def __init__(self, config: dict[str, Any], vault: CredentialVault | None = None):
        self.config = config
        self.vault = vault or CredentialVault()
        providers = config["providers"]
        self.providers = {
            "openai": OpenAIResponsesProvider(providers["openai"], self.vault),
            "gemini": GeminiInteractionsProvider(providers["gemini"], self.vault),
        }

    def available_providers(self) -> list[str]:
        return [
            name
            for name in self.config["providers"]["priority"]
            if name in self.providers and self.providers[name].available
        ]

    def generate(
        self,
        *,
        capability_profile: str,
        instructions: str,
        prompt: str,
        schema_name: str,
        schema: dict[str, Any],
        use_web_search: bool,
        preferred_provider: str | None = None,
    ) -> StructuredResponse:
        priority = list(self.config["providers"]["priority"])
        if preferred_provider:
            priority = [preferred_provider] + [p for p in priority if p != preferred_provider]
        failures: list[str] = []
        for provider_name in priority:
            provider = self.providers.get(provider_name)
            provider_config = self.config["providers"].get(provider_name, {})
            if provider is None or not provider.available:
                continue
            model_map = provider_config.get("models") or {}
            model = model_map.get(capability_profile) or model_map.get("balanced")
            if not model:
                failures.append(f"{provider_name}: no model for {capability_profile}")
                continue
            reasoning = (provider_config.get("reasoning_effort") or {}).get(
                capability_profile
            )
            try:
                return provider.generate(
                    model=model,
                    instructions=instructions,
                    prompt=prompt,
                    schema_name=schema_name,
                    schema=schema,
                    use_web_search=use_web_search,
                    reasoning_effort=reasoning,
                )
            except Exception as exc:
                failures.append(f"{provider_name}: {exc}")
                continue
        if not failures:
            raise ProviderRoutingError(
                "No configured model provider is available. Run the configuration wizard."
            )
        raise ProviderRoutingError("All configured providers failed: " + " | ".join(failures))
