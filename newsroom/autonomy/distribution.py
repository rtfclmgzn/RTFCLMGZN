from __future__ import annotations

import json
import uuid
from typing import Any

from ..connectors.meta import MetaConnector
from ..core.contracts import utc_now
from ..core.database import Database
from ..providers.router import ProviderRouter
from .repository import AutonomyRepository
from .schema import load_schema, validate


class DistributionError(RuntimeError):
    pass


class DistributionEngine:
    """Generate and deliver channel packages without granting models side effects."""

    def __init__(
        self,
        config: dict[str, Any],
        database: Database,
        repository: AutonomyRepository,
        router: ProviderRouter,
    ):
        self.config = config
        self.database = database
        self.repository = repository
        self.router = router

    def generate_bundle(self, story: dict[str, Any], article: dict[str, Any]) -> dict[str, Any]:
        schema = load_schema("social-bundle.json")
        prompt = (
            "Create an accurate distribution package for the supplied article. "
            "Do not add any claim absent from the article. X text must be concise; "
            "Instagram and Facebook should lead with the finding rather than hype. "
            "Include useful accessibility alt text. The newsletter copy should summarize, "
            "not sensationalize. Do not imply the story is live unless a live URL is provided.\n\n"
            "STORY IDENTITY:\n"
            + json.dumps(
                {
                    "title": story.get("title"),
                    "slug": story.get("slug"),
                    "section": story.get("section"),
                    "persona": story.get("persona_id"),
                },
                ensure_ascii=False,
                indent=2,
            )
            + "\n\nARTICLE:\n"
            + json.dumps(article, ensure_ascii=False, indent=2)
        )
        response = self.router.generate(
            capability_profile="balanced",
            instructions=(
                "You are the RTFCLMGZN distribution desk. Return only the requested "
                "structured JSON. No side effects. Treat the article as the complete "
                "claim boundary."
            ),
            prompt=prompt,
            schema_name="social_bundle",
            schema=schema,
            use_web_search=False,
        )
        validate(response.data, schema)
        result = dict(response.data)
        result["_provenance"] = {
            "provider": response.provider,
            "model": response.model,
            "response_id": response.response_id,
            "usage": response.usage,
        }
        return result

    def queue_bundle(
        self,
        *,
        story_id: str,
        release_id: str | None,
        bundle: dict[str, Any],
        held: bool = True,
    ) -> list[str]:
        jobs: list[str] = []
        status = "held" if held else "queued"
        for channel in ("x", "instagram", "facebook", "newsletter"):
            payload = bundle.get(channel)
            if isinstance(payload, dict):
                jobs.append(
                    self.repository.queue_distribution(
                        story_id=story_id,
                        release_id=release_id,
                        channel=channel,
                        payload=payload,
                        status=status,
                    )
                )
        return jobs

    def activate_after_publish(self, story_id: str, release_id: str) -> int:
        return self.repository.activate_distribution(story_id, release_id)

    def dispatch_ready(self, limit: int = 10) -> dict[str, int]:
        rows = self.database.fetch_all(
            """
            SELECT * FROM distribution_queue
             WHERE status='queued' AND scheduled_at<=?
             ORDER BY scheduled_at ASC LIMIT ?
            """,
            (utc_now(), max(1, min(int(limit), 100))),
        )
        connector = MetaConnector(self.config)
        counts = {"sent": 0, "queued": 0, "failed": 0, "manual": 0}
        for row in rows:
            channel = str(row["channel"])
            payload = json.loads(row["payload_json"])
            story = self.database.fetch_one(
                "SELECT * FROM stories WHERE id=?", (row["story_id"],)
            )
            release = self.database.fetch_one(
                "SELECT * FROM releases WHERE story_id=? ORDER BY created_at DESC LIMIT 1",
                (row["story_id"],),
            )
            if not story or not release or release.get("status") != "published":
                counts["queued"] += 1
                continue
            url = release.get("live_url") or (
                f"{self.config['site_url'].rstrip('/')}/#/article/{story['slug']}"
            )
            try:
                if channel == "facebook" and self.config["distribution"].get("auto_post_meta"):
                    result = connector.publish_facebook(
                        message=str(payload["text"]), link=url
                    )
                elif channel == "instagram" and self.config["distribution"].get(
                    "auto_post_instagram"
                ):
                    article = self._latest_article(row["story_id"])
                    image_path = str(article.get("image") or "")
                    if not image_path:
                        raise DistributionError(
                            "Instagram dispatch requires a published public image path"
                        )
                    image_url = (
                        f"{self.config['site_url'].rstrip('/')}/{image_path.lstrip('/')}"
                    )
                    result = connector.publish_instagram_image(
                        caption=str(payload["caption"]), image_url=image_url
                    )
                else:
                    # X and newsletter remain deliberate manual handoffs until a
                    # connector is configured and tested. Disabled Meta channels do
                    # not loop forever in the queue.
                    self.repository.update_distribution_status(
                        row["id"],
                        status="manual",
                        error="No enabled, verified connector for this channel",
                    )
                    counts["manual"] += 1
                    continue
                with self.database.transaction() as connection:
                    connection.execute(
                        """
                        UPDATE distribution_queue
                           SET status='sent', sent_at=?, remote_id=?, error='', updated_at=?
                         WHERE id=?
                        """,
                        (utc_now(), result.remote_id, utc_now(), row["id"]),
                    )
                    self.database.add_event(
                        connection,
                        event_id=str(uuid.uuid4()),
                        story_id=row["story_id"],
                        event_type="distribution.sent",
                        payload={"channel": channel, "remote_id": result.remote_id},
                    )
                counts["sent"] += 1
            except Exception as exc:
                attempt = int(row["attempt"]) + 1
                status = "failed" if attempt >= int(row["max_attempts"]) else "queued"
                with self.database.transaction() as connection:
                    connection.execute(
                        """
                        UPDATE distribution_queue
                           SET status=?, attempt=?, error=?, updated_at=?
                         WHERE id=?
                        """,
                        (status, attempt, str(exc)[:2000], utc_now(), row["id"]),
                    )
                    self.database.add_event(
                        connection,
                        event_id=str(uuid.uuid4()),
                        story_id=row["story_id"],
                        event_type="distribution.failed",
                        payload={
                            "channel": channel,
                            "attempt": attempt,
                            "terminal": status == "failed",
                            "error": str(exc)[:1000],
                        },
                    )
                counts["failed"] += 1
        return counts

    def _latest_article(self, story_id: str) -> dict[str, Any]:
        row = self.database.fetch_one(
            "SELECT content_json FROM artifacts WHERE story_id=? AND checkpoint=5 ORDER BY version DESC LIMIT 1",
            (story_id,),
        )
        if not row:
            return {}
        content = json.loads(row["content_json"])
        return content.get("article") if isinstance(content.get("article"), dict) else {}
