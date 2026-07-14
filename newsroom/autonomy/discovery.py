from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from ..core.registry import Registry
from ..providers.router import ProviderRouter
from .dedupe import (
    canonical_url,
    is_public_http_url,
    read_existing_titles,
    source_fingerprint,
    title_similarity,
)
from .schema import load_schema, validate


class DiscoveryError(RuntimeError):
    pass


@dataclass(frozen=True)
class Candidate:
    title: str
    slug: str
    dek: str
    why_now: str
    section: str
    lane: str
    persona_id: str
    priority_score: float
    novelty_score: float
    impact_score: float
    risk_level: str
    source_leads: tuple[dict[str, Any], ...]
    topic_tags: tuple[str, ...]
    fingerprint: str

    @property
    def composite_score(self) -> float:
        return round(
            self.priority_score * 0.45
            + self.novelty_score * 0.25
            + self.impact_score * 0.30,
            6,
        )


def slugify(value: str, maximum: int = 100) -> str:
    normalized = value.lower()
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")
    if not normalized:
        normalized = "story-" + hashlib.sha256(value.encode("utf-8")).hexdigest()[:12]
    return normalized[:maximum].rstrip("-")


PERSONA_BY_SECTION = {
    "Frontier": "sage-okafor",
    "Products": "nova-reyes",
    "Compute": "jin-park",
    "Policy": "marcus-webb",
    "Health": "priya-anand",
    "Markets": "ronan-cole",
    "Robotics": "ash-lindqvist",
    "Opinion": "idris-vale",
    "Ethics": "maya-serrano",
    "Guide": "nova-reyes",
}


class DiscoveryEngine:
    def __init__(
        self,
        repo_root: Path,
        config: dict[str, Any],
        registry: Registry,
        router: ProviderRouter,
    ):
        self.repo_root = repo_root.resolve()
        self.config = config
        self.registry = registry
        self.router = router

    def discover(self) -> tuple[list[Candidate], dict[str, Any]]:
        limits = self.config["limits"]
        editorial = self.config["editorial"]
        now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
        schema = load_schema("discovery-batch.json")
        prompt = f"""Find the most consequential, verifiable AI and business-intelligence developments from the last {int(editorial['lookback_hours'])} hours as of {now}.
Return at most {int(limits['candidates_per_cycle'])} candidates for a shared newsroom scan. Use no more than 6 web-search tool calls total. Prefer primary documents, regulator or company filings, official announcements, reputable wire reporting, and independent corroboration. Avoid rumors, recycled announcements, thin listicles, sensationalism, and stories whose material facts cannot be verified. Every candidate must include at least two real source leads when possible, ideally one primary or official source plus one independent source. Aim for a useful mix dominated by briefs, with no more than two synthesis candidates and a research candidate only when the evidence and impact justify it. Scores must reflect actual news value, not promotional language. Assign one of the canonical sections and a suitable persona ID from: {', '.join(self.registry.persona_ids())}.
"""
        instructions = """You are the RTFCLMGZN signal-intake desk. Conduct one efficient shared scan rather than repeatedly researching each story. Return only the requested JSON. Never invent a URL or publication date. If fewer than the requested number meet the evidence threshold, return fewer candidates."""
        response = self.router.generate(
            capability_profile="structured-fast",
            instructions=instructions,
            prompt=prompt,
            schema_name="discovery_batch",
            schema=schema,
            use_web_search=True,
        )
        validate(response.data, schema)
        candidates: list[Candidate] = []
        cited_urls = {
            canonical_url(str(item.get("url") or ""))
            for item in response.citations
            if isinstance(item, dict)
            and is_public_http_url(str(item.get("url") or ""))
        }
        existing_titles = read_existing_titles(self.repo_root)
        max_similarity = float(editorial["maximum_title_similarity"])
        seen_titles: list[str] = []
        for raw in response.data.get("candidates", []):
            title = str(raw["title"]).strip()
            if not title:
                continue
            if any(title_similarity(title, old) >= max_similarity for old in existing_titles + seen_titles):
                continue
            section = str(raw["section"])
            # Beat ownership is deterministic. The discovery model proposes the story,
            # while the newsroom assigns the canonical editor for that section.
            persona = PERSONA_BY_SECTION.get(section, "sage-okafor")
            if persona not in self.registry.persona_ids():
                suggested = str(raw.get("persona_id") or "")
                persona = suggested if suggested in self.registry.persona_ids() else "sage-okafor"
            sources = tuple(
                source
                for source in raw.get("source_leads", [])
                if isinstance(source, dict)
                and is_public_http_url(str(source.get("url") or ""))
                and (
                    not cited_urls
                    or canonical_url(str(source.get("url") or "")) in cited_urls
                )
            )
            if len(sources) < int(editorial["minimum_sources"]):
                continue
            fingerprint = source_fingerprint(str(source["url"]) for source in sources)
            candidates.append(
                Candidate(
                    title=title,
                    slug=slugify(title),
                    dek=str(raw["dek"]).strip(),
                    why_now=str(raw["why_now"]).strip(),
                    section=section,
                    lane=str(raw["lane"]),
                    persona_id=persona,
                    priority_score=float(raw["priority_score"]),
                    novelty_score=float(raw["novelty_score"]),
                    impact_score=float(raw["impact_score"]),
                    risk_level=str(raw["risk_level"]),
                    source_leads=sources,
                    topic_tags=tuple(str(tag).strip() for tag in raw.get("topic_tags", []) if str(tag).strip()),
                    fingerprint=fingerprint,
                )
            )
            seen_titles.append(title)
        candidates.sort(key=lambda item: (item.composite_score, item.priority_score), reverse=True)
        usage = dict(response.usage)
        usage.update(
            {
                "provider": response.provider,
                "model": response.model,
                "response_id": response.response_id,
                "citations": list(response.citations),
            }
        )
        return candidates, usage
