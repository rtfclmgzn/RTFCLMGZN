from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any


class StructuredOutputError(RuntimeError):
    pass


@dataclass(frozen=True)
class StructuredResponse:
    data: dict[str, Any]
    provider: str
    model: str
    usage: dict[str, Any]
    citations: tuple[dict[str, Any], ...]
    response_id: str


def parse_json_text(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
    elif text.startswith("```"):
        text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
    try:
        value = json.loads(text.strip())
    except json.JSONDecodeError as exc:
        raise StructuredOutputError(f"Model output was not valid JSON: {exc}") from exc
    if not isinstance(value, dict):
        raise StructuredOutputError("Model output must be a JSON object")
    return value
