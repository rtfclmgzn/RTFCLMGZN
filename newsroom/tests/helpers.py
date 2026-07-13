from __future__ import annotations

import json
from pathlib import Path


def make_repo(root: Path) -> Path:
    (root / ".git").mkdir(parents=True, exist_ok=True)
    (root / "web" / "data").mkdir(parents=True, exist_ok=True)
    (root / "web" / "assets" / "img").mkdir(parents=True, exist_ok=True)
    (root / "web" / "index.html").write_text(
        """<!doctype html><html><body>
<script src=\"data/articles.js?b=1\"></script>
<script src=\"data/live-articles.js?b=1\"></script>
<script src=\"data/newsroom-articles.js?b=1\"></script>
<script src=\"assets/app.js?b=1\"></script>
</body></html>\n""",
        "utf-8",
    )
    (root / "web" / "assets" / "app.js").write_text(
        "var ARTICLES=(window.RTFC_ARTICLES||[]).concat(window.RTFC_LIVE_ARTICLES||[]).concat(window.RTFC_NEWSROOM_ARTICLES||[]);\n",
        "utf-8",
    )
    (root / "web" / "data" / "articles.js").write_text("window.RTFC_ARTICLES = [];\n", "utf-8")
    (root / "web" / "data" / "live-articles.js").write_text("window.RTFC_LIVE_ARTICLES = [];\n", "utf-8")
    (root / "web" / "data" / "research.js").write_text("window.RTFC_RESEARCH = [];\n", "utf-8")
    (root / "web" / "data" / "newsroom-articles.js").write_text(
        "window.RTFC_NEWSROOM_ARTICLES = [];\n", "utf-8"
    )
    (root / "web" / "rss.xml").write_text(
        """<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<rss version=\"2.0\"><channel><title>RTFCLMGZN</title><link>https://rtfclmgzn.com/</link><description>Feed</description><lastBuildDate>Mon, 13 Jul 2026 00:00:00 +0000</lastBuildDate></channel></rss>\n""",
        "utf-8",
    )
    (root / "web" / "sitemap.xml").write_text(
        "<?xml version=\"1.0\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"></urlset>\n",
        "utf-8",
    )
    return root


def valid_story_package(slug: str = "governed-story-test") -> dict:
    assignments = {
        1: "managing-editor",
        2: "managing-editor",
        3: "research",
        4: "verification",
        5: "sage-okafor",
        6: "editorial-review",
        7: "verification",
        8: "compliance",
        9: "editor-in-chief",
    }
    return {
        "schema_version": 1,
        "story": {
            "slug": slug,
            "title": "A governed test story",
            "dek": "A verified package used to test exact-version approval and release construction.",
            "brief": "Prove the full workflow without external side effects.",
            "persona": "sage-okafor",
            "section": "Frontier",
            "format": "synthesis",
            "disclaimer": "none",
            "body": [
                {"type": "p", "text": "This test story contains a controlled body block."},
                {"type": "h2", "text": "Why the gate matters"},
                {"type": "p", "text": "The approval is attached to an exact artifact digest."},
            ],
            "apply": [
                {"label": "Use exact-version approval.", "text": "Never approve a moving draft."}
            ],
            "sources": [
                {
                    "label": "RTFCLMGZN architecture baseline",
                    "url": "https://rtfclmgzn.com/",
                    "source_class": "primary",
                }
            ],
            "links": [],
            "corrections": [],
        },
        "workflow": {
            "risk_level": "R1",
            "recommendation": "approve",
            "notes": "Test package",
            "artifacts": [
                {
                    "checkpoint": number,
                    "agent_id": agent,
                    "artifact_type": f"checkpoint-{number}-record",
                    "content": {"summary": f"Checkpoint {number} passed in test fixture."},
                }
                for number, agent in assignments.items()
            ],
        },
    }
