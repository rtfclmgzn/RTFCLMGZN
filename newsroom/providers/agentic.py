from __future__ import annotations

from pathlib import Path
from typing import Any

from ..autonomy.config import load_config
from ..autonomy.dedupe import is_public_http_url
from ..autonomy.prompts import PromptLibrary
from ..autonomy.schema import load_schema, validate
from ..core.contracts import utc_now
from ..core.registry import Registry
from .base import Provider, ProviderResult
from .router import ProviderRouter


CHECKPOINT_SCHEMAS = {
    1: ("signal-intake.json", "signal_intake"),
    2: ("assignment-brief.json", "assignment_brief"),
    3: ("evidence-dossier.json", "evidence_dossier"),
    4: ("claim-map.json", "claim_map"),
    5: ("article-draft.json", "article_draft"),
    6: ("editorial-review.json", "editorial_review"),
    7: ("verification-report.json", "verification_report"),
    8: ("compliance-report.json", "compliance_report"),
}


class AgenticProvider(Provider):
    """Bounded model adapter for checkpoints 1-8.

    The adapter validates schema, cross-checks URLs and immutable story identity,
    and returns a versioned artifact. It has no database or publication authority.
    """

    name = "agentic-router"

    def __init__(
        self,
        repo_root: Path,
        registry: Registry,
        config: dict[str, Any] | None = None,
        router: ProviderRouter | None = None,
    ):
        self.repo_root = repo_root.resolve()
        self.registry = registry
        self.config = config or load_config()
        self.router = router or ProviderRouter(self.config)
        self.prompts = PromptLibrary(self.repo_root)

    def execute(
        self,
        *,
        checkpoint: int,
        agent_id: str,
        story: dict[str, Any],
        context: dict[str, Any],
    ) -> ProviderResult:
        if checkpoint not in CHECKPOINT_SCHEMAS:
            raise RuntimeError(
                f"The model provider only executes checkpoints 1-8, not checkpoint {checkpoint}"
            )
        schema_file, schema_name = CHECKPOINT_SCHEMAS[checkpoint]
        schema = load_schema(schema_file)
        agent = self.registry.agents.get(agent_id)
        if agent is None:
            raise RuntimeError(f"Unknown canonical agent: {agent_id}")
        response = self.router.generate(
            capability_profile=agent.capability_profile,
            instructions=self.prompts.agent_instructions(agent_id),
            prompt=self.prompts.stage_prompt(
                checkpoint, story=story, context=context, current_time=utc_now()
            ),
            schema_name=schema_name,
            schema=schema,
            use_web_search=checkpoint in {1, 3, 7},
        )
        validate(response.data, schema)
        content = dict(response.data)
        self._cross_validate(
            checkpoint,
            content=content,
            story=story,
            context=context,
            cited_urls={
                str(item.get("url") or "").strip()
                for item in response.citations
                if is_public_http_url(str(item.get("url") or ""))
            },
        )
        content["_provenance"] = {
            "provider": response.provider,
            "model": response.model,
            "response_id": response.response_id,
            "citations": list(response.citations),
        }
        publishable = bool(content.get("publishable", True))
        return ProviderResult(
            content=content,
            provider=response.provider,
            model=response.model,
            usage=response.usage,
            publishable=publishable,
        )

    @staticmethod
    def _context_urls(context: dict[str, Any]) -> set[str]:
        urls = {
            str(item.get("url") or "").strip()
            for item in context.get("sources", [])
            if isinstance(item, dict)
            and is_public_http_url(str(item.get("url") or ""))
        }
        for artifact in context.get("artifacts", []):
            content = artifact.get("content") or {}
            for source in content.get("sources", []) if isinstance(content, dict) else []:
                if isinstance(source, dict):
                    url = str(source.get("url") or "").strip()
                    if is_public_http_url(url):
                        urls.add(url)
            for source in content.get("source_leads", []) if isinstance(content, dict) else []:
                if isinstance(source, dict):
                    url = str(source.get("url") or "").strip()
                    if is_public_http_url(url):
                        urls.add(url)
        return urls

    def _cross_validate(
        self,
        checkpoint: int,
        *,
        content: dict[str, Any],
        story: dict[str, Any],
        context: dict[str, Any],
        cited_urls: set[str],
    ) -> None:
        known_urls = self._context_urls(context)

        if checkpoint in {1, 3}:
            key = "source_leads" if checkpoint == 1 else "sources"
            output_urls = {
                str(item.get("url") or "").strip()
                for item in content.get(key, [])
                if isinstance(item, dict)
            }
            # Grounded providers expose citations. When they are available, every
            # newly introduced URL must be in the grounding annotations.
            newly_introduced = output_urls - known_urls
            if cited_urls and not newly_introduced.issubset(cited_urls):
                unknown = sorted(newly_introduced - cited_urls)
                raise RuntimeError(
                    "The evidence artifact introduced URLs absent from provider grounding: "
                    + ", ".join(unknown[:5])
                )
            if checkpoint == 3 and len(output_urls) < 2:
                content["publishable"] = False

        if checkpoint in {4, 7}:
            for claim in content.get("claims", []):
                if not isinstance(claim, dict):
                    continue
                claim_urls = {str(url).strip() for url in claim.get("source_urls", [])}
                if not claim_urls.issubset(known_urls):
                    raise RuntimeError(
                        "A claim referenced a URL outside the governed evidence set"
                    )

        if checkpoint == 5:
            article = content.get("article")
            if not isinstance(article, dict):
                raise RuntimeError("Draft artifact did not contain a structured article")
            # Identity is deterministic and cannot be reassigned by a model.
            article["slug"] = str(story["slug"])
            article["persona"] = str(story["persona_id"])
            article["section"] = str(story["section"])
            article["format"] = str(story["format"])
            article_urls = {
                str(item.get("url") or "").strip()
                for item in article.get("sources", [])
                if isinstance(item, dict)
            }
            citation_urls = {
                str(url).strip()
                for block in article.get("body", [])
                if isinstance(block, dict)
                for url in block.get("citation_urls", [])
            }
            if not (article_urls | citation_urls).issubset(known_urls):
                raise RuntimeError(
                    "The draft introduced a source URL outside the governed evidence set"
                )
            if len(article_urls) < 2:
                content["publishable"] = False
