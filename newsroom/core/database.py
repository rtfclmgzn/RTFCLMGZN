from __future__ import annotations

import json
import sqlite3
import threading
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

from .contracts import utc_now

SCHEMA_VERSION = 3


class DatabaseError(RuntimeError):
    pass


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  dek TEXT NOT NULL DEFAULT '',
  brief TEXT NOT NULL DEFAULT '',
  lane TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  section TEXT NOT NULL,
  format TEXT NOT NULL,
  status TEXT NOT NULL,
  current_checkpoint INTEGER NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'R1',
  recommendation TEXT NOT NULL DEFAULT 'revise',
  publishable INTEGER NOT NULL DEFAULT 1,
  origin TEXT NOT NULL DEFAULT 'operator',
  story_json TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  automation_mode TEXT NOT NULL DEFAULT 'manual',
  confidence_score REAL NOT NULL DEFAULT 0,
  priority_score REAL NOT NULL DEFAULT 0,
  auto_publish_eligible INTEGER NOT NULL DEFAULT 0,
  source_fingerprint TEXT NOT NULL DEFAULT '',
  cycle_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  publisher TEXT NOT NULL DEFAULT '',
  source_class TEXT NOT NULL DEFAULT 'credible-secondary',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'unreviewed',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  material INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'unverified',
  evidence_json TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  checkpoint INTEGER NOT NULL,
  agent_id TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  version INTEGER NOT NULL,
  content_json TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  publishable INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  UNIQUE(story_id, checkpoint, version)
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  artifact_id TEXT REFERENCES artifacts(id),
  agent_id TEXT NOT NULL,
  decision TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  artifact_id TEXT NOT NULL REFERENCES artifacts(id),
  artifact_sha256 TEXT NOT NULL,
  approver TEXT NOT NULL,
  decision TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  checkpoint INTEGER NOT NULL,
  agent_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  input_hash TEXT NOT NULL DEFAULT '',
  output_hash TEXT NOT NULL DEFAULT '',
  usage_json TEXT NOT NULL DEFAULT '{}',
  error TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS events (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  story_id TEXT REFERENCES stories(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS releases (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  release_id TEXT NOT NULL UNIQUE,
  artifact_id TEXT NOT NULL REFERENCES artifacts(id),
  package_path TEXT NOT NULL,
  status TEXT NOT NULL,
  commit_hash TEXT,
  live_url TEXT,
  created_at TEXT NOT NULL,
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS autonomy_cycles (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  candidate_count INTEGER NOT NULL DEFAULT 0,
  selected_count INTEGER NOT NULL DEFAULT 0,
  packaged_count INTEGER NOT NULL DEFAULT 0,
  published_count INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd REAL NOT NULL DEFAULT 0,
  actual_cost_usd REAL NOT NULL DEFAULT 0,
  summary_json TEXT NOT NULL DEFAULT '{}',
  error TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS autonomy_jobs (
  id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL REFERENCES autonomy_cycles(id) ON DELETE CASCADE,
  story_id TEXT REFERENCES stories(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  available_at TEXT NOT NULL,
  locked_at TEXT,
  finished_at TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  result_json TEXT NOT NULL DEFAULT '{}',
  error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS provider_calls (
  id TEXT PRIMARY KEY,
  run_id TEXT,
  cycle_id TEXT REFERENCES autonomy_cycles(id) ON DELETE SET NULL,
  story_id TEXT REFERENCES stories(id) ON DELETE SET NULL,
  checkpoint INTEGER,
  agent_id TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_hash TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  search_calls INTEGER NOT NULL DEFAULT 0,
  image_calls INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  error TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS source_snapshots (
  id TEXT PRIMARY KEY,
  story_id TEXT REFERENCES stories(id) ON DELETE CASCADE,
  cycle_id TEXT REFERENCES autonomy_cycles(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  publisher TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  source_class TEXT NOT NULL DEFAULT 'credible-secondary',
  fetched_at TEXT NOT NULL,
  published_at TEXT,
  content_sha256 TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  citation_json TEXT NOT NULL DEFAULT '{}',
  UNIQUE(story_id, canonical_url, content_sha256)
);

CREATE TABLE IF NOT EXISTS policy_decisions (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  cycle_id TEXT REFERENCES autonomy_cycles(id) ON DELETE SET NULL,
  decision TEXT NOT NULL,
  reason_codes_json TEXT NOT NULL DEFAULT '[]',
  metrics_json TEXT NOT NULL DEFAULT '{}',
  policy_version TEXT NOT NULL,
  artifact_sha256 TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS distribution_queue (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  release_id TEXT,
  channel TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  attempt INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  scheduled_at TEXT NOT NULL,
  sent_at TEXT,
  remote_id TEXT,
  error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(story_id, channel, scheduled_at)
);

CREATE TABLE IF NOT EXISTS budget_ledger (
  id TEXT PRIMARY KEY,
  cycle_id TEXT REFERENCES autonomy_cycles(id) ON DELETE SET NULL,
  provider_call_id TEXT REFERENCES provider_calls(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  amount_usd REAL NOT NULL,
  occurred_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS dedupe_keys (
  key TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  story_id TEXT REFERENCES stories(id) ON DELETE SET NULL,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

"""


INDEX_SQL = """
CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(status);
CREATE INDEX IF NOT EXISTS idx_stories_cycle ON stories(cycle_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_story_checkpoint ON artifacts(story_id, checkpoint);
CREATE INDEX IF NOT EXISTS idx_events_story_sequence ON events(story_id, sequence);
CREATE INDEX IF NOT EXISTS idx_runs_story_checkpoint ON runs(story_id, checkpoint);
CREATE INDEX IF NOT EXISTS idx_cycles_status_started ON autonomy_cycles(status, started_at);
CREATE INDEX IF NOT EXISTS idx_jobs_status_available ON autonomy_jobs(status, available_at);
CREATE INDEX IF NOT EXISTS idx_provider_calls_cycle ON provider_calls(cycle_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_calls_run_id ON provider_calls(run_id) WHERE run_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_source_snapshots_story ON source_snapshots(story_id);
CREATE INDEX IF NOT EXISTS idx_distribution_status_schedule ON distribution_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_budget_occurred ON budget_ledger(occurred_at);
"""


MIGRATION_1_TO_2_COLUMNS = {
    "automation_mode": "TEXT NOT NULL DEFAULT 'manual'",
    "confidence_score": "REAL NOT NULL DEFAULT 0",
    "priority_score": "REAL NOT NULL DEFAULT 0",
    "auto_publish_eligible": "INTEGER NOT NULL DEFAULT 0",
    "source_fingerprint": "TEXT NOT NULL DEFAULT ''",
    "cycle_id": "TEXT",
}


class Database:
    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._local = threading.local()
        self.initialize()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path, timeout=30, check_same_thread=False)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys=ON")
        connection.execute("PRAGMA journal_mode=WAL")
        connection.execute("PRAGMA synchronous=NORMAL")
        connection.execute("PRAGMA busy_timeout=30000")
        return connection

    @contextmanager
    def connection(self) -> Iterator[sqlite3.Connection]:
        connection = self._connect()
        try:
            yield connection
        finally:
            connection.close()

    @contextmanager
    def transaction(self) -> Iterator[sqlite3.Connection]:
        with self.connection() as connection:
            try:
                connection.execute("BEGIN IMMEDIATE")
                yield connection
                connection.commit()
            except Exception:
                connection.rollback()
                raise

    def initialize(self) -> None:
        with self.transaction() as connection:
            # Tables are additive. Version-dependent indexes are deliberately created
            # only after migrations so an old stories/provider_calls table cannot make
            # CREATE INDEX fail before its missing columns are added.
            connection.executescript(SCHEMA_SQL)
            row = connection.execute(
                "SELECT value FROM schema_meta WHERE key='schema_version'"
            ).fetchone()
            if row is None:
                version = SCHEMA_VERSION
                connection.execute(
                    "INSERT INTO schema_meta(key, value) VALUES('schema_version', ?)",
                    (str(version),),
                )
            else:
                try:
                    version = int(row["value"])
                except (TypeError, ValueError) as exc:
                    raise DatabaseError("Database schema version is invalid") from exc
                if version > SCHEMA_VERSION or version < 1:
                    raise DatabaseError(
                        f"Unsupported database schema {version}; expected {SCHEMA_VERSION}"
                    )
                # Enforce additive columns even if a historical database was
                # stamped with a newer version before all additive migrations had
                # completed. This is idempotent and keeps index creation safe.
                self._ensure_story_v2_columns(connection)
                if version == 1:
                    connection.execute(
                        "UPDATE schema_meta SET value=? WHERE key='schema_version'", ("2",)
                    )
                    version = 2
                if version == 2:
                    self._migrate_2_to_3(connection)
                    version = 3
            if version != SCHEMA_VERSION:
                raise DatabaseError(
                    f"Unsupported database schema {version}; expected {SCHEMA_VERSION}"
                )
            connection.executescript(INDEX_SQL)

    def _ensure_story_v2_columns(self, connection: sqlite3.Connection) -> None:
        columns = {
            row["name"]
            for row in connection.execute("PRAGMA table_info(stories)").fetchall()
        }
        for name, declaration in MIGRATION_1_TO_2_COLUMNS.items():
            if name not in columns:
                connection.execute(f"ALTER TABLE stories ADD COLUMN {name} {declaration}")

    def _migrate_1_to_2(self, connection: sqlite3.Connection) -> None:
        # Kept as a compatibility helper for callers/tests; initialize() uses the
        # idempotent column enforcer before advancing the schema version.
        self._ensure_story_v2_columns(connection)
        connection.execute(
            "UPDATE schema_meta SET value=? WHERE key='schema_version'", ("2",)
        )

    def _migrate_2_to_3(self, connection: sqlite3.Connection) -> None:
        columns = {
            row["name"]
            for row in connection.execute("PRAGMA table_info(provider_calls)").fetchall()
        }
        if "run_id" not in columns:
            connection.execute("ALTER TABLE provider_calls ADD COLUMN run_id TEXT")
        connection.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_calls_run_id "
            "ON provider_calls(run_id) WHERE run_id IS NOT NULL"
        )
        connection.execute(
            "UPDATE schema_meta SET value=? WHERE key='schema_version'", ("3",)
        )

    @staticmethod
    def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
        return dict(row) if row is not None else None

    def fetch_one(self, sql: str, parameters: tuple[Any, ...] = ()) -> dict[str, Any] | None:
        with self.connection() as connection:
            return self.row_to_dict(connection.execute(sql, parameters).fetchone())

    def fetch_all(self, sql: str, parameters: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
        with self.connection() as connection:
            return [dict(row) for row in connection.execute(sql, parameters).fetchall()]

    def execute(self, sql: str, parameters: tuple[Any, ...] = ()) -> int:
        with self.transaction() as connection:
            cursor = connection.execute(sql, parameters)
            return cursor.rowcount

    def add_event(
        self,
        connection: sqlite3.Connection,
        *,
        event_id: str,
        story_id: str | None,
        event_type: str,
        payload: dict[str, Any],
    ) -> None:
        connection.execute(
            """
            INSERT INTO events(id, story_id, event_type, payload_json, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (event_id, story_id, event_type, json.dumps(payload, ensure_ascii=False), utc_now()),
        )
