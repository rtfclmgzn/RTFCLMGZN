from __future__ import annotations

import hashlib
import json
from typing import Any, Iterable

from ..security.vault import CredentialVault
from .http import post_json
from .structured import StructuredOutputError, StructuredResponse, parse_json_text


class GeminiInteractionsProvider:
    name = "gemini"

    def __init__(self, config: dict[str, Any], vault: CredentialVault | None = None):
        self.config = config
        self.vault = vault or CredentialVault()

    @property
    def available(self) -> bool:
        return bool(self.config.get("enabled", True) and self.vault.get("gemini_api_key"))

    def generate(
        self,
        *,
        model: str,
        instructions: str,
        prompt: str,
        schema_name: str,
        schema: dict[str, Any],
        use_web_search: bool = False,
        reasoning_effort: str | None = None,
        max_output_tokens: int | None = None,
    ) -> StructuredResponse:
        del schema_name  # Gemini binds the JSON Schema directly to response_format.
        api_key = self.vault.get("gemini_api_key")
        if not api_key:
            raise StructuredOutputError(
                "Gemini is not configured. Run the RTFCLMGZN configuration wizard."
            )
        body: dict[str, Any] = {
            "model": model,
            "system_instruction": instructions.strip(),
            "input": prompt.strip(),
            "store": bool(self.config.get("store", False)),
            "response_format": {
                "type": "text",
                "mime_type": "application/json",
                "schema": schema,
            },
        }
        thinking_level = self._thinking_level(reasoning_effort)
        generation_config: dict[str, Any] = {}
        if thinking_level:
            generation_config.update({
                "thinking_level": thinking_level,
                "thinking_summaries": "none",
            })
        if max_output_tokens is not None:
            generation_config["max_output_tokens"] = max(256, min(int(max_output_tokens), 128000))
        if generation_config:
            body["generation_config"] = generation_config
        if use_web_search:
            body["tools"] = [{"type": "google_search"}]
        response = post_json(
            str(self.config["endpoint"]),
            headers={
                "x-goog-api-key": api_key,
                # Pin the post-May-2026 steps/response_format contract rather than
                # relying on a server-side default that could drift.
                "Api-Revision": "2026-05-20",
            },
            payload=body,
            timeout_seconds=int(self.config.get("timeout_seconds", 240)),
            max_retries=int(self.config.get("max_retries", 3)),
        ).json
        text, citations, search_calls = self._extract_output(response)
        data = parse_json_text(text)
        raw_usage = (
            response.get("total_usage")
            or response.get("usage")
            or response.get("usage_metadata")
            or {}
        )
        if not isinstance(raw_usage, dict):
            raw_usage = {}
        input_tokens = int(
            raw_usage.get("total_input_tokens")
            or raw_usage.get("input_tokens")
            or raw_usage.get("prompt_token_count")
            or raw_usage.get("promptTokenCount")
            or 0
        )
        output_tokens = int(
            raw_usage.get("total_output_tokens")
            or raw_usage.get("output_tokens")
            or raw_usage.get("candidates_token_count")
            or raw_usage.get("candidatesTokenCount")
            or 0
        )
        total_tokens = int(
            raw_usage.get("total_tokens")
            or raw_usage.get("total_token_count")
            or raw_usage.get("totalTokenCount")
            or input_tokens + output_tokens
        )
        search_calls = max(search_calls, self._grounding_count(raw_usage, "google_search"))
        usage = {
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": total_tokens,
            "search_calls": search_calls,
            "request_sha256": hashlib.sha256(
                json.dumps(body, sort_keys=True, ensure_ascii=False).encode("utf-8")
            ).hexdigest(),
        }
        return StructuredResponse(
            data=data,
            provider=self.name,
            model=model,
            usage=usage,
            citations=tuple(self._dedupe_citations(citations)),
            response_id=str(response.get("id") or response.get("interaction_id") or ""),
        )

    @staticmethod
    def _thinking_level(reasoning_effort: str | None) -> str | None:
        mapping = {
            "none": "minimal",
            "minimal": "minimal",
            "low": "low",
            "medium": "medium",
            "high": "high",
            "xhigh": "high",
            "max": "high",
        }
        return mapping.get(str(reasoning_effort or "").lower())

    @staticmethod
    def _grounding_count(usage: dict[str, Any], tool_name: str) -> int:
        total = 0
        for key in (
            "tool_use_tokens_by_modality",
            "grounding_tool_counts",
            "tool_counts",
        ):
            rows = usage.get(key) or []
            if isinstance(rows, dict):
                rows = [rows]
            if not isinstance(rows, list):
                continue
            for row in rows:
                if not isinstance(row, dict):
                    continue
                if str(row.get("type") or row.get("tool") or "") == tool_name:
                    total += int(row.get("count") or row.get("tokens") or 0)
        return total

    @staticmethod
    def _iter_steps(response: dict[str, Any]) -> Iterable[dict[str, Any]]:
        for key in ("steps", "outputs", "output"):
            value = response.get(key)
            if isinstance(value, list):
                for item in value:
                    if isinstance(item, dict):
                        yield item

    @classmethod
    def _extract_output(
        cls, response: dict[str, Any]
    ) -> tuple[str, list[dict[str, Any]], int]:
        status = str(response.get("status") or "").lower()
        if status in {"failed", "cancelled", "incomplete"}:
            detail = response.get("error") or response.get("incomplete_details") or status
            raise StructuredOutputError(f"Gemini interaction did not complete: {detail}")
        if response.get("error"):
            raise StructuredOutputError(f"Gemini returned an error: {response['error']}")

        texts: list[str] = []
        refusals: list[str] = []
        output_text = response.get("output_text")
        if isinstance(output_text, str) and output_text.strip():
            texts.append(output_text)

        citations: list[dict[str, Any]] = []
        search_calls = 0
        for item in cls._iter_steps(response):
            item_type = str(item.get("type") or "")
            if item_type == "google_search_call":
                search_calls += 1
            if item_type in {"refusal", "blocked"}:
                refusals.append(str(item.get("refusal") or item.get("text") or item_type))
                continue
            if item_type == "text" and isinstance(item.get("text"), str):
                texts.append(item["text"])
            for candidate_key in ("output_text", "content"):
                value = item.get(candidate_key)
                if isinstance(value, str):
                    texts.append(value)
                elif isinstance(value, list):
                    for part in value:
                        if not isinstance(part, dict):
                            continue
                        if isinstance(part.get("text"), str):
                            texts.append(part["text"])
                        citations.extend(cls._citations_from_mapping(part))
            citations.extend(cls._citations_from_mapping(item))
            if item_type == "google_search_result":
                result = item.get("result")
                if isinstance(result, dict):
                    url = result.get("url")
                    if isinstance(url, str) and url.startswith(("https://", "http://")):
                        citations.append(
                            {
                                "type": "google_search_result",
                                "url": url,
                                "title": result.get("title") or result.get("source_title"),
                            }
                        )
                    for source in result.get("sources", []) if isinstance(result.get("sources"), list) else []:
                        if isinstance(source, dict):
                            citations.extend(cls._citations_from_mapping(source))

        if refusals:
            raise StructuredOutputError(
                "Gemini refused or blocked the structured newsroom task: "
                + " | ".join(refusals[:3])
            )
        text = "\n".join(value for value in texts if value.strip()).strip()
        if not text:
            status = response.get("status")
            error = response.get("error")
            detail = f" (status={status})" if status else ""
            if error:
                detail += f": {error}"
            raise StructuredOutputError("Gemini returned no text output" + detail)
        return text, cls._dedupe_citations(citations), search_calls

    @staticmethod
    def _citations_from_mapping(value: dict[str, Any]) -> list[dict[str, Any]]:
        citations: list[dict[str, Any]] = []
        candidates: list[dict[str, Any]] = []
        annotations = value.get("annotations")
        if isinstance(annotations, list):
            candidates.extend(item for item in annotations if isinstance(item, dict))
        grounding = value.get("grounding_metadata") or value.get("groundingMetadata")
        if isinstance(grounding, dict):
            for key in ("grounding_chunks", "groundingChunks", "sources"):
                rows = grounding.get(key)
                if isinstance(rows, list):
                    candidates.extend(item for item in rows if isinstance(item, dict))
        candidates.append(value)
        for item in candidates:
            web = item.get("web") if isinstance(item.get("web"), dict) else {}
            url = (
                item.get("url")
                or item.get("source_url")
                or item.get("uri")
                or web.get("uri")
                or web.get("url")
            )
            if isinstance(url, str) and url.startswith(("https://", "http://")):
                citations.append(
                    {
                        "type": item.get("type") or "citation",
                        "url": url,
                        "title": (
                            item.get("title")
                            or item.get("source_title")
                            or web.get("title")
                        ),
                    }
                )
        return citations

    @staticmethod
    def _dedupe_citations(
        citations: Iterable[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        result: list[dict[str, Any]] = []
        seen: set[str] = set()
        for item in citations:
            url = str(item.get("url") or "").strip()
            if not url or url in seen:
                continue
            seen.add(url)
            result.append(
                {
                    "type": str(item.get("type") or "citation"),
                    "url": url,
                    "title": item.get("title"),
                }
            )
        return result
