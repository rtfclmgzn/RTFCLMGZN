from __future__ import annotations

import json
import sqlite3
import uuid
from dataclasses import dataclass
from typing import Any

from .contracts import content_hash, utc_now
from .database import Database
from .registry import Registry
from ..providers.base import Provider


class LifecycleError(RuntimeError):
    pass


@dataclass(frozen=True)
class StageResult:
    story_id: str
    checkpoint: int
    artifact_id: str
    status: str
    publishable: bool


class LifecycleController:
    """Deterministic owner of story state.

    Providers can create artifacts, but only this controller can advance a story.
    """

    def __init__(self, database: Database, registry: Registry):
        self.database = database
        self.registry = registry

    def run_checkpoint(self, story_id: str, provider: Provider) -> StageResult:
        with self.database.transaction() as connection:
            story_row = connection.execute(
                "SELECT * FROM stories WHERE id=?", (story_id,)
            ).fetchone()
            if story_row is None:
                raise LifecycleError(f"Unknown story: {story_id}")
            story = dict(story_row)
            checkpoint_number = int(story["current_checkpoint"])
            if checkpoint_number < 1 or checkpoint_number > 12:
                raise LifecycleError(f"Invalid checkpoint: {checkpoint_number}")
            checkpoint = self.registry.checkpoints[checkpoint_number]
            if checkpoint.requires_owner_approval:
                raise LifecycleError(
                    "Checkpoint 9 is an approval boundary. Use the owner approval action."
                )
            agent = self.registry.agent_for_checkpoint(
                checkpoint_number, story.get("persona_id")
            )
            sources = [
                dict(row)
                for row in connection.execute(
                    "SELECT * FROM sources WHERE story_id=? ORDER BY created_at", (story_id,)
                ).fetchall()
            ]
            artifacts = [
                self._decode_artifact(row)
                for row in connection.execute(
                    "SELECT * FROM artifacts WHERE story_id=? ORDER BY checkpoint, version",
                    (story_id,),
                ).fetchall()
            ]
            run_id = str(uuid.uuid4())
            started_at = utc_now()
            input_value = {
                "story": story,
                "sources": sources,
                "artifacts": artifacts,
                "checkpoint": checkpoint_number,
            }
            connection.execute(
                """
                INSERT INTO runs(
                  id, story_id, checkpoint, agent_id, provider, model, status,
                  started_at, input_hash, usage_json
                ) VALUES (?, ?, ?, ?, ?, '', 'running', ?, ?, '{}')
                """,
                (
                    run_id,
                    story_id,
                    checkpoint_number,
                    agent.id,
                    provider.name,
                    started_at,
                    content_hash(input_value),
                ),
            )

        try:
            result = provider.execute(
                checkpoint=checkpoint_number,
                agent_id=agent.id,
                story=story,
                context={"sources": sources, "artifacts": artifacts},
            )
        except Exception as exc:
            with self.database.transaction() as connection:
                connection.execute(
                    "UPDATE runs SET status='failed', finished_at=?, error=? WHERE id=?",
                    (utc_now(), str(exc), run_id),
                )
                self.database.add_event(
                    connection,
                    event_id=str(uuid.uuid4()),
                    story_id=story_id,
                    event_type="run.failed",
                    payload={
                        "run_id": run_id,
                        "checkpoint": checkpoint_number,
                        "agent_id": agent.id,
                        "error": str(exc),
                    },
                )
            raise

        with self.database.transaction() as connection:
            current = connection.execute(
                "SELECT * FROM stories WHERE id=?", (story_id,)
            ).fetchone()
            if current is None or int(current["current_checkpoint"]) != checkpoint_number:
                raise LifecycleError("Story changed while checkpoint was executing; retry safely")
            version_row = connection.execute(
                "SELECT COALESCE(MAX(version), 0) AS v FROM artifacts WHERE story_id=? AND checkpoint=?",
                (story_id, checkpoint_number),
            ).fetchone()
            version = int(version_row["v"]) + 1
            artifact_id = str(uuid.uuid4())
            output_hash = content_hash(result.content)
            connection.execute(
                """
                INSERT INTO artifacts(
                  id, story_id, checkpoint, agent_id, artifact_type, version,
                  content_json, sha256, publishable, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    artifact_id,
                    story_id,
                    checkpoint_number,
                    agent.id,
                    checkpoint.artifact_type,
                    version,
                    json.dumps(result.content, ensure_ascii=False),
                    output_hash,
                    1 if result.publishable else 0,
                    utc_now(),
                ),
            )
            next_checkpoint = min(12, checkpoint_number + 1)
            next_status = checkpoint.next_status
            publishable = bool(story["publishable"]) and result.publishable
            connection.execute(
                """
                UPDATE stories
                   SET current_checkpoint=?, status=?, publishable=?, version=version+1, updated_at=?
                 WHERE id=?
                """,
                (
                    next_checkpoint,
                    next_status,
                    1 if publishable else 0,
                    utc_now(),
                    story_id,
                ),
            )
            connection.execute(
                """
                UPDATE runs
                   SET status='succeeded', finished_at=?, provider=?, model=?, output_hash=?, usage_json=?
                 WHERE id=?
                """,
                (
                    utc_now(),
                    result.provider,
                    result.model,
                    output_hash,
                    json.dumps(result.usage, ensure_ascii=False),
                    run_id,
                ),
            )
            self.database.add_event(
                connection,
                event_id=str(uuid.uuid4()),
                story_id=story_id,
                event_type="checkpoint.completed",
                payload={
                    "checkpoint": checkpoint_number,
                    "checkpoint_id": checkpoint.id,
                    "agent_id": agent.id,
                    "artifact_id": artifact_id,
                    "artifact_sha256": output_hash,
                    "next_checkpoint": next_checkpoint,
                    "next_status": next_status,
                    "publishable": publishable,
                },
            )
            return StageResult(
                story_id=story_id,
                checkpoint=checkpoint_number,
                artifact_id=artifact_id,
                status=next_status,
                publishable=publishable,
            )

    @staticmethod
    def _decode_artifact(row: sqlite3.Row) -> dict[str, Any]:
        value = dict(row)
        value["content"] = json.loads(value.pop("content_json"))
        return value
