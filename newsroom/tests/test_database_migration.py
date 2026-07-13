from __future__ import annotations

import sqlite3
import tempfile
import unittest
from pathlib import Path

from newsroom.core.database import Database, DatabaseError, SCHEMA_VERSION


_V1_STORIES = """
CREATE TABLE stories (
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
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT
);
"""


_V2_PROVIDER_CALLS = """
CREATE TABLE provider_calls (
  id TEXT PRIMARY KEY,
  cycle_id TEXT,
  story_id TEXT,
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
"""


class DatabaseMigrationTests(unittest.TestCase):
    def _create_versioned(self, path: Path, version: int, *, provider_v2: bool = False) -> None:
        connection = sqlite3.connect(path)
        try:
            connection.executescript(
                "CREATE TABLE schema_meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);"
                + _V1_STORIES
                + (_V2_PROVIDER_CALLS if provider_v2 else "")
            )
            connection.execute(
                "INSERT INTO schema_meta(key, value) VALUES('schema_version', ?)",
                (str(version),),
            )
            connection.commit()
        finally:
            connection.close()

    def test_version_one_migrates_before_version_dependent_indexes(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "newsroom.db"
            self._create_versioned(path, 1)
            database = Database(path)
            version = database.fetch_one(
                "SELECT value FROM schema_meta WHERE key='schema_version'"
            )
            self.assertEqual(str(SCHEMA_VERSION), version["value"])
            columns = {
                row["name"] for row in database.fetch_all("PRAGMA table_info(stories)")
            }
            self.assertTrue(
                {
                    "automation_mode",
                    "confidence_score",
                    "priority_score",
                    "auto_publish_eligible",
                    "source_fingerprint",
                    "cycle_id",
                }.issubset(columns)
            )
            indexes = {row["name"] for row in database.fetch_all("PRAGMA index_list(stories)")}
            self.assertIn("idx_stories_cycle", indexes)

    def test_version_two_adds_provider_run_id_and_unique_index(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "newsroom.db"
            self._create_versioned(path, 2, provider_v2=True)
            database = Database(path)
            columns = {
                row["name"] for row in database.fetch_all("PRAGMA table_info(provider_calls)")
            }
            self.assertIn("run_id", columns)
            indexes = {
                row["name"] for row in database.fetch_all("PRAGMA index_list(provider_calls)")
            }
            self.assertIn("idx_provider_calls_run_id", indexes)

    def test_future_schema_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "newsroom.db"
            self._create_versioned(path, 99)
            with self.assertRaisesRegex(DatabaseError, "Unsupported database schema"):
                Database(path)


if __name__ == "__main__":
    unittest.main()
