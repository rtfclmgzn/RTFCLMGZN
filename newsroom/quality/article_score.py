"""Article Score — the pre-publication quality gate (handover System 2).

A deterministic, reproducible 0.00–10.00 score computed from the artifacts the
pipeline already produces at checkpoints 3–8. Nothing here calls a model: every
input is a measurable property of the evidence dossier, claim map, draft,
editorial review, verification report, and compliance report, so the same inputs
always yield the same score and every number can be audited after the fact.

Weights (handover):
    Accuracy & Verification      30%
    Source Quality               25%
    Insight & Usefulness         20%
    Writing & Persona Fidelity   15%
    Production & Compliance      10%

An article below 8.00 fails by default. Hard fails reject regardless of average.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Iterable

EVALUATOR_VERSION = "article-score-v1.0"

WEIGHTS = {
    "accuracy": 0.30,
    "sources": 0.25,
    "insight": 0.20,
    "writing": 0.15,
    "production": 0.10,
}

PUBLISH_THRESHOLD = 8.00
EMERGENCY_FLOOR = 7.75

# Disclaimers the site actually renders; anything else is a production failure.
VALID_DISCLAIMERS = {"none", "not-financial-advice", "not-medical-advice"}
# Sections where an advice disclaimer is mandatory, not optional.
REQUIRED_DISCLAIMER = {
    "Health": "not-medical-advice",
    "Markets": "not-financial-advice",
}

# House rule (trained into style.agent.md + prompts.py): an article is about the
# news, never about the newsroom's own process.
SELF_REFERENTIAL = (
    "rtfclmgzn covered",
    "we declined",
    "why we didn't post",
    "here's the honest read",
    "we held this",
    "this desk could not",
    "this desk declined",
    "our desk",
)
# Filler that signals unedited model prose rather than edited copy.
GENERIC_FILLER = (
    "in today's fast-paced",
    "it's important to note that",
    "in conclusion,",
    "delve into",
    "in the ever-evolving",
    "landscape of artificial intelligence",
)

BANDS = (
    (9.50, "Exceptional"),
    (9.00, "Excellent"),
    (8.50, "Strong"),
    (8.00, "Publishable"),
    (7.75, "Failed — emergency eligibility only"),
    (0.00, "Rejected"),
)

# Word-count ladder, matching the site's own founder-locked format ruler.
FORMAT_RANGES = {"brief": (180, 650), "synthesis": (650, 2200), "research": (2200, 12000)}


def _clamp(value: float, low: float = 0.0, high: float = 10.0) -> float:
    if not isinstance(value, (int, float)) or math.isnan(value):
        return low
    return max(low, min(high, float(value)))


def _ratio(numerator: float, denominator: float) -> float:
    return (numerator / denominator) if denominator else 0.0


def _domain(url: str) -> str:
    match = re.match(r"^https?://([^/]+)", str(url or "").strip(), re.I)
    host = (match.group(1) if match else "").lower()
    return host[4:] if host.startswith("www.") else host


def _as_list(value: Any) -> list:
    return value if isinstance(value, list) else []


def _material_claims(claim_map: dict[str, Any]) -> list[dict[str, Any]]:
    return [c for c in _as_list(claim_map.get("claims")) if isinstance(c, dict) and c.get("material")]


def _unresolved_contradictions(*artifacts: dict[str, Any]) -> int:
    total = 0
    for art in artifacts:
        for row in _as_list(art.get("contradictions")):
            if isinstance(row, dict) and not row.get("resolved"):
                total += 1
    return total


def _body_text(article: dict[str, Any]) -> str:
    parts = []
    for block in _as_list(article.get("body")):
        if isinstance(block, dict) and block.get("text"):
            parts.append(str(block["text"]))
    return " ".join(parts)


def _word_count(article: dict[str, Any]) -> int:
    text = _body_text(article)
    return len([w for w in re.split(r"\s+", text) if w])


@dataclass(frozen=True)
class Category:
    name: str
    score: float
    weight: float
    signals: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class ArticleScore:
    total: float
    band: str
    publishable: bool
    emergency_eligible: bool
    hard_fails: tuple[str, ...]
    categories: tuple[Category, ...]
    evaluator_version: str
    computed_at: str

    @property
    def by_name(self) -> dict[str, float]:
        return {c.name: c.score for c in self.categories}

    def to_record(self) -> dict[str, Any]:
        """Flat, storable representation — enough to reproduce the decision."""
        return {
            "total": self.total,
            "band": self.band,
            "publishable": self.publishable,
            "emergency_eligible": self.emergency_eligible,
            "hard_fails": list(self.hard_fails),
            "categories": {
                c.name: {"score": c.score, "weight": c.weight, "signals": c.signals}
                for c in self.categories
            },
            "evaluator_version": self.evaluator_version,
            "computed_at": self.computed_at,
        }


# --------------------------------------------------------------------- categories
def _score_accuracy(claim_map: dict, verification: dict) -> Category:
    material = _material_claims(claim_map)
    verified = [c for c in material if str(c.get("status", "")).lower() == "supported"]
    support_ratio = _ratio(len(verified), len(material))
    unsupported = len(_as_list(verification.get("unsupported_material_claims")))
    unresolved = _unresolved_contradictions(claim_map, verification)

    raw_verif = verification.get("verification_score")
    verif = _clamp(float(raw_verif) * 10, 0, 10) if isinstance(raw_verif, (int, float)) else support_ratio * 10

    base = 0.5 * (support_ratio * 10) + 0.5 * verif
    penalty = 2.5 * unsupported + 3.0 * unresolved
    return Category(
        "accuracy",
        round(_clamp(base - penalty), 2),
        WEIGHTS["accuracy"],
        {
            "material_claims": len(material),
            "supported_claims": len(verified),
            "support_ratio": round(support_ratio, 3),
            "verification_score": round(verif / 10, 3),
            "unsupported_material_claims": unsupported,
            "unresolved_contradictions": unresolved,
        },
    )


def _score_sources(evidence: dict, claim_map: dict) -> Category:
    sources = [s for s in _as_list(evidence.get("sources")) if isinstance(s, dict)]
    total = len(sources)
    primary = sum(1 for s in sources if str(s.get("source_class", "")).lower() == "primary")
    domains = {d for d in (_domain(s.get("url")) for s in sources) if d}
    dated = sum(1 for s in sources if str(s.get("published_at") or "").strip() and str(s.get("published_at")).lower() != "unknown")

    material = _material_claims(claim_map)
    cited = sum(1 for c in material if _as_list(c.get("source_urls")))
    coverage = _ratio(cited, len(material))

    # Primary sourcing is rewarded up to a healthy share, not to 100% — a good
    # story pairs primary documents WITH independent corroboration. Source COUNT
    # alone is deliberately never rewarded (handover).
    primary_component = min(_ratio(primary, total) / 0.5, 1.0) if total else 0.0
    independence = 1.0 if len(domains) >= 2 else (0.4 if len(domains) == 1 else 0.0)
    freshness = _ratio(dated, total)

    score = (0.35 * coverage + 0.30 * primary_component + 0.20 * independence + 0.15 * freshness) * 10
    return Category(
        "sources",
        round(_clamp(score), 2),
        WEIGHTS["sources"],
        {
            "source_count": total,
            "primary_sources": primary,
            "distinct_domains": len(domains),
            "citation_coverage": round(coverage, 3),
            "dated_sources": dated,
        },
    )


def _score_insight(draft: dict) -> Category:
    article = draft.get("article") if isinstance(draft.get("article"), dict) else {}
    tldr = _as_list(article.get("tldr"))
    body = _as_list(article.get("body"))
    headings = [b for b in body if isinstance(b, dict) and b.get("type") == "h2"]
    text = _body_text(article).lower()

    tldr_ok = 4 <= len(tldr) <= 5 and all(len(str(b).split()) <= 20 for b in tldr)
    # A caveat in the final bullet is the house standard for honest summaries.
    caveat = bool(tldr) and any(
        k in str(tldr[-1]).lower()
        for k in ("caveat", "not ", "unverified", "self-reported", "preliminary", "unconfirmed", "could not")
    )
    has_apply = bool(_as_list(article.get("apply")))
    # Fact/inference separation — the newsroom's "what is not established" habit.
    limits = any(k in text for k in ("not established", "not confirm", "unverified", "remains unclear", "not yet"))
    structured = len(headings) >= 2

    score = (
        0.25 * (1.0 if tldr_ok else 0.4 if tldr else 0.0)
        + 0.15 * (1.0 if caveat else 0.0)
        + 0.25 * (1.0 if has_apply else 0.0)
        + 0.20 * (1.0 if limits else 0.0)
        + 0.15 * (1.0 if structured else 0.5 if headings else 0.0)
    ) * 10
    return Category(
        "insight",
        round(_clamp(score), 2),
        WEIGHTS["insight"],
        {
            "tldr_bullets": len(tldr),
            "tldr_well_formed": tldr_ok,
            "final_bullet_caveat": caveat,
            "has_takeaway_block": has_apply,
            "states_limitations": limits,
            "section_headings": len(headings),
        },
    )


def _score_writing(draft: dict, review: dict, story: dict) -> Category:
    article = draft.get("article") if isinstance(draft.get("article"), dict) else {}
    title = str(article.get("title") or "")
    dek = str(article.get("dek") or "")
    text = _body_text(article)
    lowered = (title + " " + dek + " " + text).lower()
    words = _word_count(article)

    raw_review = review.get("score")
    review_score = _clamp(float(raw_review) * 10, 0, 10) if isinstance(raw_review, (int, float)) else 6.0

    self_ref = [p for p in SELF_REFERENTIAL if p in lowered]
    filler = [p for p in GENERIC_FILLER if p in lowered]

    declared = str(story.get("lane") or story.get("format") or "").lower()
    low, high = FORMAT_RANGES.get(declared, (0, 100000))
    length_ok = low <= words <= high if declared in FORMAT_RANGES else True

    structure = (
        0.4 * (1.0 if 20 <= len(title) <= 120 else 0.3)
        + 0.3 * (1.0 if len(dek) >= 40 else 0.3)
        + 0.3 * (1.0 if length_ok else 0.2)
    )
    score = 0.55 * review_score + 0.45 * structure * 10
    score -= 2.0 * len(self_ref) + 0.75 * len(filler)
    return Category(
        "writing",
        round(_clamp(score), 2),
        WEIGHTS["writing"],
        {
            "editorial_review_score": round(review_score / 10, 3),
            "word_count": words,
            "declared_format": declared or None,
            "length_in_range": length_ok,
            "self_referential_phrases": self_ref,
            "generic_filler_phrases": filler,
        },
    )


def _score_production(draft: dict, compliance: dict, story: dict) -> Category:
    article = draft.get("article") if isinstance(draft.get("article"), dict) else {}
    disclaimer = str(article.get("disclaimer") or "")
    section = str(story.get("section") or "")
    required = REQUIRED_DISCLAIMER.get(section)

    disclaimer_valid = disclaimer in VALID_DISCLAIMERS
    disclaimer_correct = (disclaimer == required) if required else disclaimer_valid
    has_sources = bool(_as_list(article.get("sources")))
    has_slug = bool(str(article.get("slug") or "").strip())
    compliance_ok = str(compliance.get("decision", "")).lower() in {"approve", "approved", "pass"}
    blockers = len(_as_list(compliance.get("auto_publish_blockers")))
    cited_blocks = [b for b in _as_list(article.get("body")) if isinstance(b, dict) and b.get("type") == "p"]
    cited = sum(1 for b in cited_blocks if _as_list(b.get("citation_urls")))
    citation_density = _ratio(cited, len(cited_blocks))

    score = (
        0.30 * (1.0 if disclaimer_correct else 0.0)
        + 0.20 * (1.0 if compliance_ok else 0.0)
        + 0.15 * (1.0 if has_sources else 0.0)
        + 0.10 * (1.0 if has_slug else 0.0)
        + 0.25 * min(citation_density / 0.6, 1.0)
    ) * 10
    score -= 1.0 * blockers
    return Category(
        "production",
        round(_clamp(score), 2),
        WEIGHTS["production"],
        {
            "disclaimer": disclaimer or None,
            "disclaimer_required": required,
            "disclaimer_correct": disclaimer_correct,
            "compliance_approved": compliance_ok,
            "compliance_blockers": blockers,
            "paragraph_citation_density": round(citation_density, 3),
        },
    )


# ------------------------------------------------------------------- hard fails
def _hard_fails(story, evidence, claim_map, draft, verification, compliance) -> tuple[str, ...]:
    fails: list[str] = []
    article = draft.get("article") if isinstance(draft.get("article"), dict) else {}

    if _unresolved_contradictions(claim_map, verification):
        fails.append("unresolved-contradictions")
    if _as_list(verification.get("unsupported_material_claims")):
        fails.append("unsupported-material-claims")

    # Fabricated citation: any URL in the draft that never appeared in the
    # verified evidence dossier.
    allowed = {_canon(s.get("url")) for s in _as_list(evidence.get("sources")) if isinstance(s, dict)}
    allowed.discard("")
    used: set[str] = set()
    for block in _as_list(article.get("body")):
        if isinstance(block, dict):
            used.update(_canon(u) for u in _as_list(block.get("citation_urls")))
    for src in _as_list(article.get("sources")):
        if isinstance(src, dict):
            used.add(_canon(src.get("url")))
    used.discard("")
    if allowed and (used - allowed):
        fails.append("fabricated-citations")

    if str(compliance.get("decision", "")).lower() in {"reject", "rejected", "block", "blocked"}:
        fails.append("compliance-rejected")

    section = str(story.get("section") or "")
    required = REQUIRED_DISCLAIMER.get(section)
    if required and str(article.get("disclaimer") or "") != required:
        fails.append("missing-required-disclaimer")

    assigned = str(story.get("persona_id") or story.get("persona") or "").strip()
    drafted = str(article.get("persona") or article.get("persona_id") or "").strip()
    if assigned and drafted and assigned != drafted:
        fails.append("wrong-author-identity")

    return tuple(dict.fromkeys(fails))


def _canon(url: Any) -> str:
    text = str(url or "").strip()
    if not text:
        return ""
    text = re.sub(r"[?#].*$", "", text)  # drop query/fragment (utm etc.)
    return text.rstrip("/").lower()


def _band(total: float) -> str:
    for floor, name in BANDS:
        if total >= floor:
            return name
    return "Rejected"


# ------------------------------------------------------------------------ public
def score_article(
    *,
    story: dict[str, Any],
    artifacts: Iterable[dict[str, Any]],
) -> ArticleScore:
    """Compute the Article Score from pipeline artifacts (checkpoints 3–8)."""
    by_checkpoint: dict[int, dict[str, Any]] = {}
    for item in artifacts or []:
        if not isinstance(item, dict):
            continue
        try:
            number = int(item.get("checkpoint") or 0)
        except (TypeError, ValueError):
            continue
        content = item.get("content")
        if number and isinstance(content, dict):
            by_checkpoint[number] = content

    evidence = by_checkpoint.get(3, {})
    claim_map = by_checkpoint.get(4, {})
    draft = by_checkpoint.get(5, {})
    review = by_checkpoint.get(6, {})
    verification = by_checkpoint.get(7, {})
    compliance = by_checkpoint.get(8, {})
    story = story or {}

    categories = (
        _score_accuracy(claim_map, verification),
        _score_sources(evidence, claim_map),
        _score_insight(draft),
        _score_writing(draft, review, story),
        _score_production(draft, compliance, story),
    )
    total = round(sum(c.score * c.weight for c in categories), 2)
    fails = _hard_fails(story, evidence, claim_map, draft, verification, compliance)

    by_name = {c.name: c.score for c in categories}
    publishable = (not fails) and total >= PUBLISH_THRESHOLD
    # Dead-posting-period exception: only a near-miss with genuinely strong
    # accuracy and sourcing may be considered, and only when nothing hard-failed.
    emergency = (
        (not fails)
        and EMERGENCY_FLOOR <= total < PUBLISH_THRESHOLD
        and by_name["accuracy"] >= 9.00
        and by_name["sources"] >= 8.50
    )

    return ArticleScore(
        total=total,
        band="Rejected — hard fail" if fails else _band(total),
        publishable=publishable,
        emergency_eligible=emergency,
        hard_fails=fails,
        categories=categories,
        evaluator_version=EVALUATOR_VERSION,
        computed_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    )


def xp_multiplier(total: float) -> float:
    """Article Score → XP multiplier (handover System 1). Below 8.00 earns nothing."""
    if total < 8.00:
        return 0.0
    if total < 8.25:
        return 0.90
    if total < 8.50:
        return 1.00
    if total < 8.75:
        return 1.10
    if total < 9.00:
        return 1.20
    if total < 9.50:
        return 1.35
    return 1.50
