from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from ..core.contracts import utc_now
from ..core.database import Database


def _decode_json_fields(row: dict[str, Any], fields: tuple[str, ...]) -> dict[str, Any]:
    value = dict(row)
    for field in fields:
        raw = value.get(field)
        if isinstance(raw, str):
            try:
                value[field.removesuffix("_json")] = json.loads(raw)
            except json.JSONDecodeError:
                value[field.removesuffix("_json")] = {} if raw.strip().startswith("{") else []
    return value


class AutonomyRepository:
    """Persistence facade for autonomous cycles, budgets, policy, and distribution."""

    def __init__(self, database: Database):
        self.database = database

    def reconcile_stale_cycles(self, stale_before: str) -> int:
        """Fail cycles left running by a terminated process before a new lock owner starts."""
        with self.database.transaction() as connection:
            rows = connection.execute(
                "SELECT id FROM autonomy_cycles WHERE status='running' AND started_at<?",
                (stale_before,),
            ).fetchall()
            for row in rows:
                connection.execute(
                    """
                    UPDATE autonomy_cycles
                       SET status='failed', finished_at=?, error=?
                     WHERE id=?
                    """,
                    (utc_now(), "Recovered stale cycle after process termination", row["id"]),
                )
                self.database.add_event(
                    connection,
                    event_id=str(uuid.uuid4()),
                    story_id=None,
                    event_type="autonomy.cycle.recovered_stale",
                    payload={"cycle_id": row["id"]},
                )
            return len(rows)

    def begin_cycle(self, mode: str) -> str:
        cycle_id = str(uuid.uuid4())
        with self.database.transaction() as connection:
            connection.execute(
                "INSERT INTO autonomy_cycles(id, mode, status, started_at) VALUES (?, ?, 'running', ?)",
                (cycle_id, mode, utc_now()),
            )
            self.database.add_event(
                connection,
                event_id=str(uuid.uuid4()),
                story_id=None,
                event_type="autonomy.cycle.started",
                payload={"cycle_id": cycle_id, "mode": mode},
            )
        return cycle_id

    def finish_cycle(
        self,
        cycle_id: str,
        *,
        status: str,
        candidate_count: int = 0,
        selected_count: int = 0,
        packaged_count: int = 0,
        published_count: int = 0,
        summary: dict[str, Any] | None = None,
        error: str = "",
    ) -> None:
        actual_cost = self.cycle_cost(cycle_id)
        with self.database.transaction() as connection:
            connection.execute(
                """
                UPDATE autonomy_cycles
                   SET status=?, finished_at=?, candidate_count=?, selected_count=?,
                       packaged_count=?, published_count=?, actual_cost_usd=?,
                       summary_json=?, error=?
                 WHERE id=?
                """,
                (
                    status,
                    utc_now(),
                    int(candidate_count),
                    int(selected_count),
                    int(packaged_count),
                    int(published_count),
                    actual_cost,
                    json.dumps(summary or {}, ensure_ascii=False),
                    error[:4000],
                    cycle_id,
                ),
            )
            self.database.add_event(
                connection,
                event_id=str(uuid.uuid4()),
                story_id=None,
                event_type="autonomy.cycle.finished",
                payload={
                    "cycle_id": cycle_id,
                    "status": status,
                    "candidate_count": candidate_count,
                    "selected_count": selected_count,
                    "packaged_count": packaged_count,
                    "published_count": published_count,
                    "actual_cost_usd": actual_cost,
                    "error": error[:1000],
                },
            )

    def cycle_cost(self, cycle_id: str) -> float:
        row = self.database.fetch_one(
            "SELECT COALESCE(SUM(amount_usd), 0) AS total FROM budget_ledger WHERE cycle_id=?",
            (cycle_id,),
        )
        return float((row or {}).get("total") or 0)

    def spend_since(self, start: str) -> float:
        row = self.database.fetch_one(
            "SELECT COALESCE(SUM(amount_usd), 0) AS total FROM budget_ledger WHERE occurred_at>=?",
            (start,),
        )
        return float((row or {}).get("total") or 0)

    def daily_spend(self) -> float:
        now = datetime.now(timezone.utc)
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        return self.spend_since(start.isoformat().replace("+00:00", "Z"))

    def monthly_spend(self) -> float:
        now = datetime.now(timezone.utc)
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return self.spend_since(start.isoformat().replace("+00:00", "Z"))

    def recent_cycle(self) -> dict[str, Any] | None:
        return self.database.fetch_one(
            "SELECT * FROM autonomy_cycles ORDER BY started_at DESC LIMIT 1"
        )

    def running_cycle(self) -> dict[str, Any] | None:
        return self.database.fetch_one(
            "SELECT * FROM autonomy_cycles WHERE status='running' ORDER BY started_at DESC LIMIT 1"
        )

    def stories_created_today(self) -> int:
        now = datetime.now(timezone.utc)
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        row = self.database.fetch_one(
            "SELECT COUNT(*) AS n FROM stories WHERE created_at>=? AND origin='autonomy'",
            (start.isoformat().replace("+00:00", "Z"),),
        )
        return int((row or {}).get("n") or 0)

    def stories_created_today_by_lane(self) -> dict[str, int]:
        now = datetime.now(timezone.utc)
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        rows = self.database.fetch_all(
            """
            SELECT format, COUNT(*) AS n
              FROM stories
             WHERE created_at>=? AND origin='autonomy'
             GROUP BY format
            """,
            (start.isoformat().replace("+00:00", "Z"),),
        )
        return {str(row["format"]): int(row["n"]) for row in rows}

    def stories_created_this_week_by_lane(self) -> dict[str, int]:
        now = datetime.now(timezone.utc)
        start = (now - timedelta(days=now.weekday())).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        rows = self.database.fetch_all(
            """
            SELECT format, COUNT(*) AS n
              FROM stories
             WHERE created_at>=? AND origin='autonomy'
             GROUP BY format
            """,
            (start.isoformat().replace("+00:00", "Z"),),
        )
        return {str(row["format"]): int(row["n"]) for row in rows}

    def publishes_today(self) -> int:
        now = datetime.now(timezone.utc)
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        row = self.database.fetch_one(
            "SELECT COUNT(*) AS n FROM releases WHERE published_at>=?",
            (start.isoformat().replace("+00:00", "Z"),),
        )
        return int((row or {}).get("n") or 0)

    def owner_approved_releases_count(self) -> int:
        """Count published releases that passed a direct human approval gate.

        Policy-generated approvals are deliberately excluded. This prevents the
        first bounded-autopublish cycle from bootstrapping its own acceptance
        history and requires at least one owner-reviewed release by default.
        """
        row = self.database.fetch_one(
            """
            SELECT COUNT(DISTINCT r.id) AS n
              FROM releases r
              JOIN approvals a ON a.story_id=r.story_id
             WHERE r.status='published'
               AND a.decision='approve'
               AND a.approver NOT LIKE 'owner-policy:%'
            """
        )
        return int((row or {}).get("n") or 0)

    def provider_calls_in_cycle(self, cycle_id: str) -> int:
        row = self.database.fetch_one(
            "SELECT COUNT(*) AS n FROM provider_calls WHERE cycle_id=?", (cycle_id,)
        )
        return int((row or {}).get("n") or 0)

    def web_search_calls_in_cycle(self, cycle_id: str) -> int:
        row = self.database.fetch_one(
            "SELECT COALESCE(SUM(search_calls),0) AS n FROM provider_calls WHERE cycle_id=?",
            (cycle_id,),
        )
        return int((row or {}).get("n") or 0)

    def record_provider_call(
        self,
        *,
        cycle_id: str | None,
        story_id: str | None,
        checkpoint: int | None,
        agent_id: str,
        provider: str,
        model: str,
        request_hash: str,
        response_hash: str,
        status: str,
        usage: dict[str, Any],
        started_at: str,
        finished_at: str,
        error: str = "",
        cost_usd: float = 0.0,
        run_id: str | None = None,
    ) -> str:
        call_id = str(uuid.uuid4())
        try:
            with self.database.transaction() as connection:
                connection.execute(
                    """
                    INSERT INTO provider_calls(
                      id, run_id, cycle_id, story_id, checkpoint, agent_id, provider, model,
                      request_hash, response_hash, status, input_tokens, output_tokens,
                      search_calls, image_calls, cost_usd, started_at, finished_at, error
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        call_id,
                        run_id,
                        cycle_id,
                        story_id,
                        checkpoint,
                        agent_id,
                        provider,
                        model,
                        request_hash,
                        response_hash,
                        status,
                        int(usage.get("input_tokens") or 0),
                        int(usage.get("output_tokens") or 0),
                        int(usage.get("search_calls") or 0),
                        int(usage.get("image_calls") or 0),
                        float(cost_usd),
                        started_at,
                        finished_at,
                        error[:4000],
                    ),
                )
                if cost_usd:
                    connection.execute(
                        """
                        INSERT INTO budget_ledger(
                          id, cycle_id, provider_call_id, category, amount_usd,
                          occurred_at, metadata_json
                        ) VALUES (?, ?, ?, 'model', ?, ?, ?)
                        """,
                        (
                            str(uuid.uuid4()),
                            cycle_id,
                            call_id,
                            float(cost_usd),
                            finished_at,
                            json.dumps({"provider": provider, "model": model}, ensure_ascii=False),
                        ),
                    )
        except sqlite3.IntegrityError as exc:
            if run_id and "run_id" in str(exc):
                existing = self.database.fetch_one(
                    "SELECT id FROM provider_calls WHERE run_id=?", (run_id,)
                )
                if existing:
                    return str(existing["id"])
            raise
        return call_id

    def create_job(
        self,
        *,
        cycle_id: str,
        story_id: str | None,
        job_type: str,
        idempotency_key: str,
        payload: dict[str, Any] | None = None,
        max_attempts: int = 3,
    ) -> str:
        existing = self.database.fetch_one(
            "SELECT id FROM autonomy_jobs WHERE idempotency_key=?", (idempotency_key,)
        )
        if existing:
            return str(existing["id"])
        job_id = str(uuid.uuid4())
        now = utc_now()
        try:
            with self.database.transaction() as connection:
                connection.execute(
                    """
                    INSERT INTO autonomy_jobs(
                      id, cycle_id, story_id, job_type, idempotency_key, status,
                      attempt, max_attempts, available_at, payload_json,
                      created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, 'queued', 0, ?, ?, ?, ?, ?)
                    """,
                    (
                        job_id,
                        cycle_id,
                        story_id,
                        job_type,
                        idempotency_key,
                        max(1, min(int(max_attempts), 10)),
                        now,
                        json.dumps(payload or {}, ensure_ascii=False),
                        now,
                        now,
                    ),
                )
        except sqlite3.IntegrityError:
            row = self.database.fetch_one(
                "SELECT id FROM autonomy_jobs WHERE idempotency_key=?", (idempotency_key,)
            )
            if row:
                return str(row["id"])
            raise
        return job_id

    def start_job(self, job_id: str) -> dict[str, Any]:
        now = utc_now()
        with self.database.transaction() as connection:
            row = connection.execute(
                "SELECT * FROM autonomy_jobs WHERE id=?", (job_id,)
            ).fetchone()
            if row is None:
                raise ValueError(f"Unknown autonomy job: {job_id}")
            if row["status"] == "succeeded":
                return _decode_json_fields(dict(row), ("payload_json", "result_json"))
            attempt = int(row["attempt"]) + 1
            if attempt > int(row["max_attempts"]):
                raise RuntimeError("Autonomy job exceeded its retry limit")
            connection.execute(
                """
                UPDATE autonomy_jobs
                   SET status='running', attempt=?, locked_at=?, updated_at=?, error=''
                 WHERE id=?
                """,
                (attempt, now, now, job_id),
            )
        return self.job(job_id) or {}

    def finish_job(self, job_id: str, result: dict[str, Any] | None = None) -> None:
        self.database.execute(
            """
            UPDATE autonomy_jobs
               SET status='succeeded', result_json=?, finished_at=?, updated_at=?, error=''
             WHERE id=?
            """,
            (json.dumps(result or {}, ensure_ascii=False), utc_now(), utc_now(), job_id),
        )

    def fail_job(self, job_id: str, error: str, *, retryable: bool = False) -> None:
        row = self.database.fetch_one(
            "SELECT attempt, max_attempts FROM autonomy_jobs WHERE id=?", (job_id,)
        )
        if not row:
            return
        status = (
            "queued"
            if retryable and int(row["attempt"]) < int(row["max_attempts"])
            else "failed"
        )
        self.database.execute(
            """
            UPDATE autonomy_jobs
               SET status=?, error=?, finished_at=?, updated_at=?
             WHERE id=?
            """,
            (status, error[:4000], utc_now(), utc_now(), job_id),
        )

    def job(self, job_id: str) -> dict[str, Any] | None:
        row = self.database.fetch_one("SELECT * FROM autonomy_jobs WHERE id=?", (job_id,))
        return _decode_json_fields(row, ("payload_json", "result_json")) if row else None

    def job_counts(self) -> dict[str, int]:
        return {
            str(row["status"]): int(row["n"])
            for row in self.database.fetch_all(
                "SELECT status, COUNT(*) AS n FROM autonomy_jobs GROUP BY status"
            )
        }

    def reserve_dedupe_key(
        self,
        key: str,
        kind: str,
        *,
        story_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> bool:
        now = utc_now()
        with self.database.transaction() as connection:
            row = connection.execute("SELECT key FROM dedupe_keys WHERE key=?", (key,)).fetchone()
            if row is not None:
                connection.execute(
                    "UPDATE dedupe_keys SET last_seen_at=?, metadata_json=? WHERE key=?",
                    (now, json.dumps(metadata or {}, ensure_ascii=False), key),
                )
                return False
            connection.execute(
                """
                INSERT INTO dedupe_keys(key, kind, story_id, first_seen_at, last_seen_at, metadata_json)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (key, kind, story_id, now, now, json.dumps(metadata or {}, ensure_ascii=False)),
            )
            return True

    def dedupe_key_exists(self, key: str) -> bool:
        return bool(self.database.fetch_one("SELECT key FROM dedupe_keys WHERE key=?", (key,)))

    def attach_dedupe_key(self, key: str, story_id: str) -> None:
        self.database.execute(
            "UPDATE dedupe_keys SET story_id=?, last_seen_at=? WHERE key=?",
            (story_id, utc_now(), key),
        )

    def release_unattached_dedupe_key(self, key: str) -> bool:
        """Release a reservation only when no persisted story owns it.

        This makes a pre-story transient failure retryable without allowing a
        completed or blocked story to be duplicated by a later cycle.
        """
        return bool(
            self.database.execute(
                "DELETE FROM dedupe_keys WHERE key=? AND story_id IS NULL", (key,)
            )
        )

    def record_policy_decision(
        self,
        *,
        story_id: str,
        cycle_id: str | None,
        decision: str,
        reason_codes: list[str],
        metrics: dict[str, Any],
        policy_version: str,
        artifact_sha256: str = "",
    ) -> str:
        decision_id = str(uuid.uuid4())
        with self.database.transaction() as connection:
            connection.execute(
                """
                INSERT INTO policy_decisions(
                  id, story_id, cycle_id, decision, reason_codes_json,
                  metrics_json, policy_version, artifact_sha256, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    decision_id,
                    story_id,
                    cycle_id,
                    decision,
                    json.dumps(reason_codes, ensure_ascii=False),
                    json.dumps(metrics, ensure_ascii=False),
                    policy_version,
                    artifact_sha256,
                    utc_now(),
                ),
            )
            self.database.add_event(
                connection,
                event_id=str(uuid.uuid4()),
                story_id=story_id,
                event_type="policy.decision",
                payload={
                    "decision_id": decision_id,
                    "cycle_id": cycle_id,
                    "decision": decision,
                    "reason_codes": reason_codes,
                    "metrics": metrics,
                    "policy_version": policy_version,
                },
            )
        return decision_id

    def queue_distribution(
        self,
        *,
        story_id: str,
        release_id: str | None,
        channel: str,
        payload: dict[str, Any],
        scheduled_at: str | None = None,
        status: str = "held",
    ) -> str:
        job_id = str(uuid.uuid4())
        now = utc_now()
        schedule = scheduled_at or now
        if status not in {"held", "queued", "manual", "sent", "failed", "cancelled"}:
            raise ValueError(f"Unsupported distribution status: {status}")
        with self.database.transaction() as connection:
            connection.execute(
                """
                INSERT OR IGNORE INTO distribution_queue(
                  id, story_id, release_id, channel, payload_json, status,
                  scheduled_at, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    job_id,
                    story_id,
                    release_id,
                    channel,
                    json.dumps(payload, ensure_ascii=False),
                    status,
                    schedule,
                    now,
                    now,
                ),
            )
        return job_id


    def activate_distribution(self, story_id: str, release_id: str) -> int:
        """Release held distribution records after the matching story is published."""
        with self.database.transaction() as connection:
            cursor = connection.execute(
                """
                UPDATE distribution_queue
                   SET release_id=?, status='queued', updated_at=?
                 WHERE story_id=? AND status='held'
                """,
                (release_id, utc_now(), story_id),
            )
            count = int(cursor.rowcount)
            if count:
                self.database.add_event(
                    connection,
                    event_id=str(uuid.uuid4()),
                    story_id=story_id,
                    event_type="distribution.activated",
                    payload={"release_id": release_id, "count": count},
                )
            return count

    def update_distribution_status(
        self,
        item_id: str,
        *,
        status: str,
        error: str = "",
        remote_id: str | None = None,
    ) -> None:
        if status not in {"held", "queued", "manual", "sent", "failed", "cancelled"}:
            raise ValueError(f"Unsupported distribution status: {status}")
        sent_at = utc_now() if status == "sent" else None
        self.database.execute(
            """
            UPDATE distribution_queue
               SET status=?, error=?, remote_id=COALESCE(?, remote_id),
                   sent_at=COALESCE(?, sent_at), updated_at=?
             WHERE id=?
            """,
            (status, error[:2000], remote_id, sent_at, utc_now(), item_id),
        )

    def distribution_items(self, *, status: str | None = None, limit: int = 100) -> list[dict[str, Any]]:
        if status:
            rows = self.database.fetch_all(
                "SELECT * FROM distribution_queue WHERE status=? ORDER BY scheduled_at LIMIT ?",
                (status, max(1, min(limit, 1000))),
            )
        else:
            rows = self.database.fetch_all(
                "SELECT * FROM distribution_queue ORDER BY created_at DESC LIMIT ?",
                (max(1, min(limit, 1000)),),
            )
        return [_decode_json_fields(row, ("payload_json",)) for row in rows]

    def distribution_counts(self) -> dict[str, int]:
        return {
            str(row["status"]): int(row["n"])
            for row in self.database.fetch_all(
                "SELECT status, COUNT(*) AS n FROM distribution_queue GROUP BY status"
            )
        }

    def cycle_history(self, limit: int = 50) -> list[dict[str, Any]]:
        rows = self.database.fetch_all(
            "SELECT * FROM autonomy_cycles ORDER BY started_at DESC LIMIT ?",
            (max(1, min(limit, 500)),),
        )
        return [_decode_json_fields(row, ("summary_json",)) for row in rows]
