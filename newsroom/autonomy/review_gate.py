from __future__ import annotations

import re
from copy import deepcopy
from typing import Any, Iterable

from .dedupe import canonical_url, is_public_http_url

_STATUS_WEIGHT = {
    "supported": 1.0,
    "partially-supported": 0.62,
    "uncertain": 0.25,
    "unsupported": 0.0,
    "contradicted": 0.0,
}
_RISK_RANK = {"R1": 1, "R2": 2, "R3": 3}
_HARD_COMPLIANCE_TERMS = (
    "do-not-publish",
    "do not publish",
    "unverified allegation",
    "defamation",
    "private personal data",
    "privacy breach",
    "medical advice",
    "financial advice",
    "investment advice",
    "legal advice",
    "election persuasion",
    "minor identity",
    "breaking casualty",
    "operational security",
    "copyright infringement",
)

_OWNER_COMPLIANCE_TERMS = (
    "owner-review",
    "owner review",
    "manual-review",
    "manual review",
    "section-requires",
    "risk-level",
    "policy-section",
    "government",
    "political",
    "regulatory",
    "autopublish-disabled",
    "auto-publish-disabled",
    "acceptance",
)


def classify_compliance_blockers(values: Iterable[Any]) -> tuple[list[str], list[str]]:
    """Separate content/safety failures from owner-review-only restrictions."""

    hard: list[str] = []
    owner_review: list[str] = []
    for raw in values:
        value = str(raw or "").strip()
        if not value:
            continue
        lowered = value.lower()
        if any(term in lowered for term in _HARD_COMPLIANCE_TERMS):
            hard.append(value)
        elif any(term in lowered for term in _OWNER_COMPLIANCE_TERMS):
            owner_review.append(value)
        else:
            # Unknown auto-publish blockers fail closed until a repair pass clarifies them.
            hard.append(value)
    return _dedupe_text(hard), _dedupe_text(owner_review)


def _clamp(value: Any, default: float = 0.0) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    if number != number or number in {float("inf"), float("-inf")}:
        return default
    return max(0.0, min(1.0, number))


def _text_key(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()


def _dedupe_text(values: Iterable[Any]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        text = str(value or "").strip()
        key = _text_key(text)
        if text and key and key not in seen:
            seen.add(key)
            result.append(text)
    return result


def _canonical_urls(values: Iterable[Any], allowed: set[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        text = str(value or "").strip()
        if not is_public_http_url(text):
            continue
        try:
            canonical = canonical_url(text)
        except (TypeError, ValueError):
            continue
        if canonical not in allowed or canonical in seen:
            continue
        seen.add(canonical)
        result.append(canonical)
    return result


def _risk_max(*values: Any) -> str:
    risks = [str(value or "R3") for value in values]
    return max(risks, key=lambda item: _RISK_RANK.get(item, 3))


def normalize_review_bundle(
    *,
    candidate: Any,
    compose_row: dict[str, Any],
    review_row: dict[str, Any],
    config: dict[str, Any],
) -> dict[str, Any]:
    """Reconcile model review output with governed claims and sources.

    The independent review model may be cautious or internally inconsistent. This
    function does not invent approval. It derives final decisions from structured
    scores, issue severities, canonical claim IDs, allowed source URLs, and risk
    flags so minor wording comments cannot masquerade as hard blockers.
    """

    editorial_cfg = config["editorial"]
    allowed_urls = {
        canonical_url(str(item.get("url") or ""))
        for item in getattr(candidate, "source_leads", ())
        if isinstance(item, dict) and is_public_http_url(str(item.get("url") or ""))
    }

    editorial = deepcopy(review_row.get("editorial_review") or {})
    verification = deepcopy(review_row.get("verification") or {})
    compliance = deepcopy(review_row.get("compliance") or {})
    claim_map = deepcopy(compose_row.get("claim_map") or {})

    issues = [item for item in editorial.get("issues", []) if isinstance(item, dict)]
    blocker_issues = [item for item in issues if item.get("severity") == "blocker"]
    major_issues = [item for item in issues if item.get("severity") == "major"]
    editorial_score = _clamp(editorial.get("score"))
    minimum_editorial = float(editorial_cfg["minimum_editorial_score"])
    original_editorial_decision = str(editorial.get("decision") or "reject")
    if blocker_issues or editorial_score < 0.65:
        editorial_decision = "reject"
    elif major_issues or editorial_score < minimum_editorial:
        editorial_decision = "revise"
    elif original_editorial_decision == "reject":
        editorial_decision = "revise"
    else:
        editorial_decision = "approve"
    editorial["decision"] = editorial_decision
    editorial["publishable"] = editorial_decision == "approve"

    review_claims = [item for item in verification.get("claims", []) if isinstance(item, dict)]
    review_by_id = {
        str(item.get("claim_id") or "").strip(): item
        for item in review_claims
        if str(item.get("claim_id") or "").strip()
    }
    review_by_text = {
        _text_key(item.get("text")): item
        for item in review_claims
        if _text_key(item.get("text"))
    }
    governed_claims = [item for item in claim_map.get("claims", []) if isinstance(item, dict)]
    normalized_claims: list[dict[str, Any]] = []
    for governed in governed_claims:
        claim_id = str(governed.get("claim_id") or "").strip()
        matched = review_by_id.get(claim_id) or review_by_text.get(_text_key(governed.get("text")))
        status = str((matched or {}).get("status") or governed.get("status") or "uncertain")
        if status not in _STATUS_WEIGHT:
            status = "uncertain"
        source_urls = _canonical_urls(
            (matched or {}).get("source_urls") or governed.get("source_urls") or [],
            allowed_urls,
        )
        if status in {"supported", "partially-supported"} and not source_urls:
            status = "uncertain"
        confidence = _clamp(
            (matched or {}).get("confidence"),
            _clamp(governed.get("confidence"), 0.0),
        )
        normalized_claims.append(
            {
                "claim_id": claim_id,
                "text": str(governed.get("text") or "").strip(),
                "material": bool(governed.get("material", True)),
                "status": status,
                "source_urls": source_urls,
                "confidence": confidence,
                "notes": str((matched or {}).get("notes") or governed.get("notes") or "").strip(),
            }
        )

    material = [item for item in normalized_claims if item["material"]]
    weights = [_STATUS_WEIGHT[item["status"]] for item in material]
    coverage = sum(weights) / len(weights) if weights else 0.0
    confidence_average = (
        sum(item["confidence"] for item in material) / len(material) if material else 0.0
    )
    deterministic_score = _clamp(coverage * 0.9 + confidence_average * 0.1)
    hard_unsupported = [
        item for item in material if item["status"] in {"unsupported", "contradicted"}
    ]
    soft_uncertain = [
        item for item in material if item["status"] in {"partially-supported", "uncertain"}
    ]
    contradictions = _dedupe_text(
        list(verification.get("contradictions") or [])
        + list(claim_map.get("contradictions") or [])
    )
    minimum_verification = float(editorial_cfg["minimum_verification_score"])
    if hard_unsupported or contradictions:
        verification_decision = "reject"
    elif soft_uncertain or deterministic_score < minimum_verification:
        verification_decision = "revise"
    else:
        verification_decision = "approve"
    verification["decision"] = verification_decision
    verification["verification_score"] = round(deterministic_score, 6)
    verification["claims"] = normalized_claims
    verification["unsupported_material_claims"] = _dedupe_text(
        [item["text"] for item in hard_unsupported]
    )
    verification["contradictions"] = contradictions
    verification["publishable"] = verification_decision == "approve"

    candidate_risk = str(getattr(candidate, "risk_level", "R3") or "R3")
    risk_level = _risk_max(candidate_risk, compliance.get("risk_level"))
    compliance["risk_level"] = risk_level
    auto_blockers = _dedupe_text(compliance.get("auto_publish_blockers") or [])
    hard_auto_blockers, owner_review_blockers = classify_compliance_blockers(auto_blockers)
    all_flags = _dedupe_text(
        list(compliance.get("risk_flags") or [])
        + list(compliance.get("privacy_flags") or [])
        + list(compliance.get("legal_flags") or [])
        + list(compliance.get("financial_flags") or [])
        + list(compliance.get("health_flags") or [])
    )
    searchable_flags = " | ".join(all_flags).lower()
    explicit_hard = bool(hard_auto_blockers) or any(
        term in searchable_flags for term in _HARD_COMPLIANCE_TERMS
    )
    original_compliance_decision = str(compliance.get("decision") or "reject")
    if risk_level == "R3" or explicit_hard or original_compliance_decision == "reject":
        compliance_decision = "reject"
    else:
        compliance_decision = "approve"
    compliance["auto_publish_blockers"] = hard_auto_blockers + owner_review_blockers
    compliance["_hard_auto_publish_blockers"] = hard_auto_blockers
    compliance["_owner_review_blockers"] = owner_review_blockers
    compliance["decision"] = compliance_decision
    compliance["publishable"] = compliance_decision == "approve"

    return {
        "candidate_key": str(review_row.get("candidate_key") or getattr(candidate, "slug", "")),
        "editorial_review": editorial,
        "verification": verification,
        "compliance": compliance,
        "review_provenance": deepcopy(review_row.get("review_provenance") or {}),
    }


def review_needs_repair(
    *,
    candidate: Any,
    compose_row: dict[str, Any],
    review_row: dict[str, Any],
    config: dict[str, Any],
) -> bool:
    """Return True only for fixable quality failures, never R3/safety rejects."""

    normalized = normalize_review_bundle(
        candidate=candidate,
        compose_row=compose_row,
        review_row=review_row,
        config=config,
    )
    if normalized["compliance"].get("decision") == "reject":
        return False
    return any(
        normalized[name].get("decision") != "approve"
        for name in ("editorial_review", "verification")
    )
