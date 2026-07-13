from __future__ import annotations

from typing import Any

from .base import Provider, ProviderResult


class FixtureProvider(Provider):
    """Deterministic provider used to prove lifecycle, persistence, and approval gates.

    Fixture output is always marked non-publishable. It cannot be used to release a
    story, which prevents a demo run from masquerading as reported journalism.
    """

    name = "fixture"

    def execute(
        self,
        *,
        checkpoint: int,
        agent_id: str,
        story: dict[str, Any],
        context: dict[str, Any],
    ) -> ProviderResult:
        title = story["title"]
        source_count = len(context.get("sources", []))
        stage_text = {
            1: f"Candidate signal recorded for: {title}",
            2: f"Assigned as a {story['lane']} story to {story['persona_id']}.",
            3: f"Fixture research inventory contains {source_count} source(s).",
            4: "Fixture claim map created. No factual claim has been independently verified.",
            5: "Fixture draft created only to exercise the system. It is not publishable reporting.",
            6: "Fixture editorial review: structure is demonstrative; evidence threshold is not met.",
            7: "Fixture verification: BLOCKED because demo artifacts are not external evidence.",
            8: "Risk classified R1 for the software demo itself; publication remains prohibited.",
            9: "EIC demo recommendation: retain as a non-publishable systems test.",
            10: "Fixture packaging record.",
            11: "Fixture release validation record.",
            12: "Fixture monitoring record.",
        }[checkpoint]
        content: dict[str, Any] = {
            "summary": stage_text,
            "demo": True,
            "checkpoint": checkpoint,
            "agent_id": agent_id,
        }
        if checkpoint == 5:
            content["article"] = {
                "slug": story["slug"],
                "title": title,
                "dek": "A non-publishable fixture proving the RTFCLMGZN workflow engine.",
                "persona": story["persona_id"],
                "section": story["section"],
                "format": story["format"],
                "body": [
                    {
                        "type": "p",
                        "text": "This is a deterministic test artifact. It contains no reported claims and cannot pass the release gate.",
                    }
                ],
                "sources": [],
            }
        return ProviderResult(
            content=content,
            provider=self.name,
            model="deterministic-fixture-v1",
            usage={"tokens": 0, "cost_usd": 0},
            publishable=False,
        )
