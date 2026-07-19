from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlparse

from .dedupe import canonical_url, is_public_http_url
from .review_gate import classify_compliance_blockers, split_contradictions
from ..quality.article_score import score_article

POLICY_VERSION = "bounded-publication-v1.0"

# A valid, fresh owner_preauthorization stands in for a real-time human click on
# these specific workflow/judgment-call flags -- that is the entire purpose of a
# standing preauthorization. It does NOT waive genuine content-safety topic
# blocks, the daily rate limit, or its own freshness check -- those remain real
# gates regardless of preauthorization.
_PREAUTH_WAIVABLE_OWNER_REVIEW_REASONS = frozenset(
    {
        "compliance-requires-owner-review",
        "compliance-auto-publish-restriction",
        "risk-level-requires-owner-review",
        "section-requires-owner-review",
        "autopublish-acceptance-history-insufficient",
    }
)


@dataclass(frozen=True)
class PolicyDecision:
    decision: str
    reason_codes: tuple[str, ...]
    metrics: dict[str, Any]

    @property
    def auto_publish(self) -> bool:
        return self.decision == "auto-publish"

    @property
    def release_ready(self) -> bool:
        return self.decision in {"auto-publish", "owner-review"} and not bool(
            self.metrics.get("hard_blocker_count")
        )


def _artifact_by_checkpoint(artifacts: list[dict[str, Any]]) -> dict[int, dict[str, Any]]:
    result: dict[int, dict[str, Any]] = {}
    for item in artifacts:
        number = int(item.get("checkpoint") or 0)
        if number:
            result[number] = item.get("content") or {}
    return result


_SECOND_LEVEL_PUBLIC_SUFFIXES = {
    "co.uk",
    "org.uk",
    "gov.uk",
    "ac.uk",
    "com.au",
    "net.au",
    "org.au",
    "com.br",
    "com.cn",
    "com.hk",
    "co.in",
    "co.jp",
    "co.kr",
    "com.mx",
    "co.nz",
    "com.sg",
    "com.tr",
}


def _domain(url: str) -> str:
    host = (urlparse(url).hostname or "").lower().removeprefix("www.")
    labels = [part for part in host.split(".") if part]
    if len(labels) < 2:
        return host
    suffix2 = ".".join(labels[-2:])
    if suffix2 in _SECOND_LEVEL_PUBLIC_SUFFIXES and len(labels) >= 3:
        return ".".join(labels[-3:])
    return suffix2


def _canonical_http_url(value: Any) -> str:
    text = str(value or "").strip()
    if not is_public_http_url(text):
        return ""
    try:
        return canonical_url(text)
    except (TypeError, ValueError):
        return ""


class PublicationPolicy:
    """Fail-closed deterministic release policy.

    Model outputs are evidence inputs. They never decide publication. This policy
    independently recomputes source diversity and evidence integrity, separates
    quality/safety blockers from governance-only owner-review requirements, and
    authorizes bounded autopublish only under explicit owner preauthorization.
    """

    def __init__(self, config: dict[str, Any]):
        self.config = config

    def decide(
        self,
        *,
        story: dict[str, Any],
        artifacts: list[dict[str, Any]],
        publishes_today: int,
        owner_approved_release_count: int = 0,
    ) -> PolicyDecision:
        editorial = self.config["editorial"]
        publication = self.config["publication"]
        mode = self.config["mode"]
        by_checkpoint = _artifact_by_checkpoint(artifacts)
        evidence = by_checkpoint.get(3, {})
        claim_map = by_checkpoint.get(4, {})
        draft = by_checkpoint.get(5, {})
        review = by_checkpoint.get(6, {})
        verification = by_checkpoint.get(7, {})
        compliance = by_checkpoint.get(8, {})

        hard: list[str] = []
        owner_review: list[str] = []

        evidence_sources = [
            item for item in evidence.get("sources", []) if isinstance(item, dict)
        ]
        source_urls = {
            canonical
            for item in evidence_sources
            if (canonical := _canonical_http_url(item.get("url")))
        }
        source_domains = {_domain(url) for url in source_urls if _domain(url)}
        primary_urls = {
            canonical
            for item in evidence_sources
            if str(item.get("source_class") or "").lower() in {"primary", "official"}
            and (canonical := _canonical_http_url(item.get("url")))
        }
        dates_present = (
            all(
                bool(str(item.get("published_at") or "").strip())
                and str(item.get("published_at") or "").strip().lower()
                not in {"unknown", "n/a", "none", "undated"}
                for item in evidence_sources
            )
            if evidence_sources
            else False
        )

        article = draft.get("article") if isinstance(draft.get("article"), dict) else {}
        article_source_urls = {
            canonical
            for item in article.get("sources", [])
            if isinstance(item, dict)
            and (canonical := _canonical_http_url(item.get("url")))
        }
        body_citation_urls = {
            canonical
            for block in article.get("body", [])
            if isinstance(block, dict)
            for url in block.get("citation_urls", [])
            if (canonical := _canonical_http_url(url))
        }
        unknown_article_urls = (article_source_urls | body_citation_urls) - source_urls

        claim_rows = [
            row for row in verification.get("claims", []) if isinstance(row, dict)
        ] or [row for row in claim_map.get("claims", []) if isinstance(row, dict)]
        material_claims = [row for row in claim_rows if bool(row.get("material", True))]
        supported_material: list[dict[str, Any]] = []
        for row in material_claims:
            claim_urls = {
                canonical
                for url in row.get("source_urls", [])
                if (canonical := _canonical_http_url(url))
            }
            if (
                row.get("status") == "supported"
                and claim_urls
                and claim_urls.issubset(source_urls)
            ):
                supported_material.append(row)
        deterministic_coverage = (
            len(supported_material) / len(material_claims) if material_claims else 0.0
        )

        risk = str(compliance.get("risk_level") or story.get("risk_level") or "R3")
        reported_verification = float(verification.get("verification_score") or 0)
        verification_score = min(reported_verification, deterministic_coverage)
        editorial_score = float(review.get("score") or 0)
        confidence = min(verification_score, editorial_score)
        unsupported_rows = [
            row for row in material_claims if row.get("status") != "supported"
        ]
        unsupported = [
            str(row.get("text") or row.get("claim_id") or "claim")
            for row in unsupported_rows
        ]
        if unsupported_rows:
            unsupported.extend(verification.get("unsupported_material_claims") or [])
        contradictions, resolved_contradictions = split_contradictions(
            list(verification.get("contradictions") or [])
            + list(claim_map.get("contradictions") or [])
        )
        blockers = list(compliance.get("auto_publish_blockers") or [])
        hard_compliance_blockers, owner_compliance_blockers = classify_compliance_blockers(
            blockers
        )
        section = str(story.get("section") or "")
        story_document = story.get("story") if isinstance(story.get("story"), dict) else {}
        topic_tags = story.get("topic_tags") or story_document.get("topic_tags") or []
        searchable = (
            str(story.get("title") or "")
            + " "
            + str(story.get("dek") or "")
            + " "
            + " ".join(str(tag) for tag in topic_tags)
        ).lower()

        required_checkpoints = set(range(3, 9))
        missing_checkpoints = sorted(required_checkpoints - set(by_checkpoint))
        if missing_checkpoints:
            hard.append("required-artifacts-missing")
        if not article or not bool(draft.get("publishable", True)):
            hard.append("draft-not-publishable")
        if article and article.get("slug") != story.get("slug"):
            hard.append("draft-identity-mismatch")
        if unknown_article_urls:
            hard.append("draft-contains-unverified-urls")
        if review.get("decision") != "approve":
            hard.append("editorial-review-not-approved")
        if editorial_score < float(editorial["minimum_editorial_score"]):
            hard.append("editorial-score-below-threshold")
        if verification.get("decision") != "approve":
            hard.append("verification-not-approved")
        if verification_score < float(editorial["minimum_verification_score"]):
            hard.append("verification-score-below-threshold")
        if confidence < float(editorial["minimum_confidence_score"]):
            hard.append("confidence-score-below-threshold")
        if len(source_urls) < int(editorial["minimum_sources"]):
            hard.append("insufficient-sources")
        if len(source_domains) < int(editorial["minimum_independent_sources"]):
            hard.append("insufficient-independent-sources")
        if len(primary_urls) < int(editorial["minimum_primary_sources"]):
            hard.append("missing-primary-source")
        if editorial.get("require_published_date") and not dates_present:
            hard.append("source-publication-date-missing")
        if not material_claims:
            hard.append("material-claim-map-empty")
        if unsupported:
            hard.append("unsupported-material-claims")
        if contradictions:
            hard.append("unresolved-contradictions")
        compliance_decision = str(compliance.get("decision") or "").lower()
        if compliance_decision == "reject":
            hard.append("compliance-rejected")
        elif compliance_decision != "approve":
            if hard_compliance_blockers or not bool(compliance.get("publishable", True)):
                hard.append("compliance-not-approved")
            else:
                owner_review.append("compliance-requires-owner-review")
        if hard_compliance_blockers:
            hard.append("compliance-hard-blockers")
        if owner_compliance_blockers:
            owner_review.append("compliance-auto-publish-restriction")

        if risk not in set(publication["allowed_risk_levels"]):
            owner_review.append("risk-level-requires-owner-review")
        if section in set(editorial["blocked_auto_publish_sections"]):
            owner_review.append("section-requires-owner-review")
        if any(topic.lower() in searchable for topic in editorial["blocked_auto_publish_topics"]):
            owner_review.append("topic-requires-owner-review")
        if publishes_today >= int(publication["maximum_auto_publishes_per_day"]):
            owner_review.append("daily-auto-publish-limit")

        preauth = publication.get("owner_preauthorization") or {}
        acknowledged_at = str(preauth.get("acknowledged_at") or "").strip()
        preauth_age_hours: float | None = None
        preauth_fresh = False
        if acknowledged_at:
            try:
                acknowledged = datetime.fromisoformat(
                    acknowledged_at.replace("Z", "+00:00")
                )
                if acknowledged.tzinfo is not None:
                    age = datetime.now(timezone.utc) - acknowledged.astimezone(timezone.utc)
                    preauth_age_hours = max(0.0, age.total_seconds() / 3600.0)
                    preauth_fresh = age <= timedelta(
                        hours=int(preauth.get("max_age_hours") or 0)
                    )
            except (TypeError, ValueError):
                preauth_fresh = False
        preauthorized = bool(
            preauth.get("enabled")
            and preauth.get("policy_version") == POLICY_VERSION
            and acknowledged_at
            and preauth_fresh
        )
        if preauth.get("enabled") and not preauth_fresh:
            owner_review.append("owner-preauthorization-expired-or-invalid")

        required_owner_approved = int(
            publication.get("minimum_owner_approved_releases_before_autopublish") or 0
        )
        if owner_approved_release_count < required_owner_approved:
            owner_review.append("autopublish-acceptance-history-insufficient")

        # ---- Article Score gate (handover System 2) -------------------------
        # A deterministic 0.00-10.00 grade over the same verified artifacts. It is
        # an ADDITIONAL floor, never a bypass: it can only ever add blockers, and
        # the existing hard blockers above still stand on their own.
        article_score = score_article(story=story, artifacts=list(artifacts or []))
        # Staged rollout (Rule 13): the score is ALWAYS computed and reported so we
        # can calibrate it against real traffic in observe-mode first. It only
        # blocks once `publication.article_score_gate_enabled` is switched on.
        if publication.get("article_score_gate_enabled"):
            if article_score.hard_fails:
                hard.append("article-score-hard-fail")
            elif not article_score.publishable:
                # 7.75-7.99 with strong accuracy AND sourcing is the only near-miss
                # the handover permits, and even then a human must own the call.
                if article_score.emergency_eligible:
                    owner_review.append("article-score-emergency-review")
                else:
                    hard.append("article-score-below-threshold")

        metrics = {
            "article_score": article_score.total,
            "article_score_band": article_score.band,
            "article_score_categories": article_score.by_name,
            "article_score_hard_fails": list(article_score.hard_fails),
            "article_score_evaluator": article_score.evaluator_version,
            "risk_level": risk,
            "verification_score": round(verification_score, 6),
            "reported_verification_score": reported_verification,
            "deterministic_claim_coverage": round(deterministic_coverage, 6),
            "editorial_score": editorial_score,
            "confidence_score": round(confidence, 6),
            "source_count": len(source_urls),
            "independent_source_count": len(source_domains),
            "primary_source_count": len(primary_urls),
            "material_claim_count": len(material_claims),
            "supported_material_claim_count": len(supported_material),
            "unsupported_material_claim_count": len(set(str(v) for v in unsupported)),
            "contradiction_count": len(contradictions),
            "resolved_contradiction_count": len(resolved_contradictions),
            "compliance_blocker_count": len(blockers),
            "compliance_hard_blocker_count": len(hard_compliance_blockers),
            "compliance_owner_review_blocker_count": len(owner_compliance_blockers),
            "unverified_url_count": len(unknown_article_urls),
            "missing_checkpoint_count": len(missing_checkpoints),
            "publishes_today": publishes_today,
            "hard_blocker_count": len(set(hard)),
            "owner_review_reason_count": len(set(owner_review)),
            "owner_preauthorized": preauthorized,
            "owner_preauthorization_age_hours": (
                round(preauth_age_hours, 3) if preauth_age_hours is not None else None
            ),
            "owner_approved_release_count": int(owner_approved_release_count),
            "required_owner_approved_release_count": required_owner_approved,
        }

        unwaived_owner_review = [
            reason
            for reason in owner_review
            if reason not in _PREAUTH_WAIVABLE_OWNER_REVIEW_REASONS
        ]

        if hard:
            decision = "blocked"
        elif (
            mode == "bounded_autopublish"
            and publication.get("auto_publish_enabled")
            and preauthorized
            and not unwaived_owner_review
        ):
            decision = "auto-publish"
        elif mode in {"draft_only", "approval_required", "bounded_autopublish"}:
            decision = "owner-review"
        else:
            decision = "blocked"
            owner_review.append("autonomy-mode-off")

        # Waived reasons still ride along in the record for transparency -- an
        # auto-published story's audit trail shows exactly which judgment-call
        # flags the standing preauthorization covered, never hides them.
        reasons = tuple(sorted(set(hard + owner_review)))
        return PolicyDecision(decision, reasons, metrics)
