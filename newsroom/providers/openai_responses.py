from __future__ import annotations

import hashlib
import json
from typing import Any

from ..security.vault import CredentialVault
from .http import post_json
from .structured import StructuredOutputError, StructuredResponse, parse_json_text


class OpenAIResponsesProvider:
    name = "openai"

    def __init__(self, config: dict[str, Any], vault: CredentialVault | None = None):
        self.config = config
        self.vault = vault or CredentialVault()

    @property
    def available(self) -> bool:
        return bool(self.config.get("enabled", True) and self.vault.get("openai_api_key"))

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
    ) -> StructuredResponse:
        api_key = self.vault.get("openai_api_key")
        if not api_key:
            raise StructuredOutputError(
                "OpenAI is not configured. Run the RTFCLMGZN configuration wizard."
            )
        body: dict[str, Any] = {
            "model": model,
            "instructions": instructions,
            "input": prompt,
            "store": bool(self.config.get("store", False)),
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": schema_name[:64],
                    "strict": True,
                    "schema": schema,
                }
            },
        }
        if use_web_search:
            body["tools"] = [{"type": "web_search"}]
        if reasoning_effort:
            body["reasoning"] = {"effort": reasoning_effort}
        response = post_json(
            str(self.config["endpoint"]),
            headers={"Authorization": f"Bearer {api_key}"},
            payload=body,
            timeout_seconds=int(self.config.get("timeout_seconds", 240)),
            max_retries=int(self.config.get("max_retries", 3)),
        ).json
        text, citations = self._extract_output(response)
        data = parse_json_text(text)
        usage = response.get("usage") if isinstance(response.get("usage"), dict) else {}
        usage = {
            "input_tokens": int(usage.get("input_tokens") or 0),
            "output_tokens": int(usage.get("output_tokens") or 0),
            "total_tokens": int(usage.get("total_tokens") or 0),
            "search_calls": sum(
                1
                for item in response.get("output", [])
                if isinstance(item, dict) and item.get("type") == "web_search_call"
            ),
            "request_sha256": hashlib.sha256(
                json.dumps(body, sort_keys=True, ensure_ascii=False).encode("utf-8")
            ).hexdigest(),
        }
        return StructuredResponse(
            data=data,
            provider=self.name,
            model=model,
            usage=usage,
            citations=tuple(citations),
            response_id=str(response.get("id") or ""),
        )

    @staticmethod
    def _extract_output(response: dict[str, Any]) -> tuple[str, list[dict[str, Any]]]:
        status = str(response.get("status") or "").lower()
        if status in {"failed", "cancelled"}:
            detail = response.get("error") or response.get("incomplete_details") or status
            raise StructuredOutputError(f"OpenAI response did not complete: {detail}")
        if status == "incomplete":
            detail = response.get("incomplete_details") or "unknown reason"
            raise StructuredOutputError(f"OpenAI response was incomplete: {detail}")
        if response.get("error"):
            raise StructuredOutputError(f"OpenAI returned an error: {response['error']}")

        texts: list[str] = []
        refusals: list[str] = []
        citations: list[dict[str, Any]] = []
        output = response.get("output")
        if not isinstance(output, list):
            output = []
        for item in output:
            if not isinstance(item, dict):
                continue
            if item.get("type") == "refusal" and item.get("refusal"):
                refusals.append(str(item["refusal"]))
            content_rows = item.get("content")
            if not isinstance(content_rows, list):
                content_rows = []
            for content in content_rows:
                if not isinstance(content, dict):
                    continue
                content_type = str(content.get("type") or "")
                if content_type == "refusal":
                    refusals.append(str(content.get("refusal") or content.get("text") or "refused"))
                    continue
                if content_type in {"output_text", "text"} and isinstance(
                    content.get("text"), str
                ):
                    texts.append(content["text"])
                annotations = content.get("annotations")
                if not isinstance(annotations, list):
                    annotations = []
                for annotation in annotations:
                    if isinstance(annotation, dict):
                        citation = {
                            "type": annotation.get("type", "citation"),
                            "url": annotation.get("url") or annotation.get("source_url"),
                            "title": annotation.get("title") or annotation.get("source_title"),
                        }
                        if citation["url"]:
                            citations.append(citation)
        if refusals:
            raise StructuredOutputError("OpenAI refused the structured newsroom task: " + " | ".join(refusals[:3]))
        if not texts and isinstance(response.get("output_text"), str):
            texts.append(response["output_text"])
        if not texts:
            raise StructuredOutputError("OpenAI returned no text output")
        return "\n".join(texts), citations
