from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from typing import Any

LANES = {"brief", "synthesis", "research", "correction", "magazine", "newsletter", "social"}
FORMATS = {"brief", "synthesis", "research"}
SECTIONS = {
    "Frontier",
    "Products",
    "Compute",
    "Policy",
    "Health",
    "Markets",
    "Robotics",
    "Opinion",
    "Ethics",
    "Guide",
}
RISK_LEVELS = {"R1", "R2", "R3"}
DECISIONS = {"approve", "revise", "reject"}
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class ContractError(ValueError):
    pass


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def content_hash(value: Any) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


def require_string(value: Any, field: str, *, minimum: int = 1, maximum: int = 10000) -> str:
    if not isinstance(value, str):
        raise ContractError(f"{field} must be a string")
    result = value.strip()
    if len(result) < minimum:
        raise ContractError(f"{field} is required")
    if len(result) > maximum:
        raise ContractError(f"{field} is too long")
    return result


def validate_slug(value: Any) -> str:
    slug = require_string(value, "slug", maximum=120).lower()
    if not SLUG_RE.fullmatch(slug):
        raise ContractError("slug must use lowercase letters, numbers, and single hyphens")
    return slug


def validate_source(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise ContractError("every source must be an object")
    label = require_string(raw.get("label") or raw.get("title"), "source.label", maximum=300)
    url = require_string(raw.get("url"), "source.url", maximum=2000)
    if not (url.startswith("https://") or url.startswith("http://")):
        raise ContractError(f"source URL must begin with http:// or https://: {url}")
    return {
        "label": label,
        "url": url,
        "publisher": str(raw.get("publisher") or "").strip(),
        "source_class": str(raw.get("source_class") or "credible-secondary").strip(),
        "notes": str(raw.get("notes") or "").strip(),
    }


def validate_body_block(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise ContractError("every body block must be an object")
    block_type = require_string(raw.get("type"), "body.type", maximum=30)
    allowed = {"p", "h2", "quote", "chart", "list"}
    if block_type not in allowed:
        raise ContractError(f"unsupported body block type: {block_type}")
    if block_type == "chart":
        chart = raw.get("chart")
        if not isinstance(chart, dict):
            raise ContractError("chart blocks require a chart object")
        return {"type": "chart", "chart": chart}
    text = require_string(raw.get("text"), "body.text", maximum=20000)
    return {"type": block_type, "text": text}


def validate_article(raw: Any, persona_ids: set[str]) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise ContractError("story must be an object")
    persona = require_string(raw.get("persona"), "story.persona", maximum=80)
    if persona not in persona_ids:
        raise ContractError(f"unknown persona: {persona}")
    section = require_string(raw.get("section"), "story.section", maximum=80)
    if section not in SECTIONS:
        raise ContractError(f"unsupported section: {section}")
    fmt = require_string(raw.get("format"), "story.format", maximum=30)
    if fmt not in FORMATS:
        raise ContractError(f"unsupported format: {fmt}")
    body_raw = raw.get("body")
    if not isinstance(body_raw, list) or not body_raw:
        raise ContractError("story.body must contain at least one block")
    sources_raw = raw.get("sources")
    if not isinstance(sources_raw, list) or not sources_raw:
        raise ContractError("story.sources must contain at least one source")
    apply_raw = raw.get("apply") or []
    if not isinstance(apply_raw, list):
        raise ContractError("story.apply must be an array")
    apply: list[dict[str, str]] = []
    for item in apply_raw:
        if not isinstance(item, dict):
            raise ContractError("every apply item must be an object")
        apply.append(
            {
                "label": require_string(item.get("label"), "apply.label", maximum=300),
                "text": require_string(item.get("text"), "apply.text", maximum=3000),
            }
        )
    return {
        "slug": validate_slug(raw.get("slug")),
        "title": require_string(raw.get("title"), "story.title", maximum=240),
        "dek": require_string(raw.get("dek"), "story.dek", maximum=600),
        "brief": str(raw.get("brief") or "").strip(),
        "persona": persona,
        "section": section,
        "format": fmt,
        "disclaimer": str(raw.get("disclaimer") or "none").strip(),
        "body": [validate_body_block(v) for v in body_raw],
        "apply": apply,
        "sources": [validate_source(v) for v in sources_raw],
        "links": list(raw.get("links") or []),
        "corrections": list(raw.get("corrections") or []),
    }


def validate_story_package(raw: Any, persona_ids: set[str]) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise ContractError("story package must be an object")
    if raw.get("schema_version") != 1:
        raise ContractError("unsupported story package schema; expected schema_version 1")
    story = validate_article(raw.get("story"), persona_ids)
    workflow = raw.get("workflow")
    if not isinstance(workflow, dict):
        raise ContractError("workflow must be an object")
    risk_level = require_string(workflow.get("risk_level"), "workflow.risk_level", maximum=2)
    if risk_level not in RISK_LEVELS:
        raise ContractError(f"unsupported risk level: {risk_level}")
    recommendation = require_string(
        workflow.get("recommendation"), "workflow.recommendation", maximum=20
    )
    if recommendation not in DECISIONS:
        raise ContractError(f"unsupported recommendation: {recommendation}")
    artifacts = workflow.get("artifacts")
    if not isinstance(artifacts, list):
        raise ContractError("workflow.artifacts must be an array")
    normalized_artifacts: list[dict[str, Any]] = []
    for raw_artifact in artifacts:
        if not isinstance(raw_artifact, dict):
            raise ContractError("every workflow artifact must be an object")
        checkpoint = int(raw_artifact.get("checkpoint"))
        if checkpoint < 1 or checkpoint > 9:
            raise ContractError("imported workflow artifacts may only cover checkpoints 1-9")
        normalized_artifacts.append(
            {
                "checkpoint": checkpoint,
                "agent_id": require_string(raw_artifact.get("agent_id"), "artifact.agent_id", maximum=80),
                "artifact_type": require_string(
                    raw_artifact.get("artifact_type") or "stage-record",
                    "artifact.artifact_type",
                    maximum=100,
                ),
                "content": raw_artifact.get("content") if isinstance(raw_artifact.get("content"), dict) else {"summary": str(raw_artifact.get("content") or "")},
            }
        )
    return {
        "schema_version": 1,
        "story": story,
        "workflow": {
            "risk_level": risk_level,
            "recommendation": recommendation,
            "artifacts": normalized_artifacts,
            "notes": str(workflow.get("notes") or "").strip(),
        },
    }
