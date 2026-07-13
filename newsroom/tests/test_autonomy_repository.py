from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from newsroom.autonomy.repository import AutonomyRepository
from newsroom.core.contracts import utc_now
from newsroom.core.service import NewsroomService
from newsroom.tests.helpers import make_repo


class AutonomyRepositoryTests(unittest.TestCase):
    def test_jobs_provider_calls_budget_and_distribution_are_idempotent(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            repo = make_repo(Path(temp) / "repo")
            service = NewsroomService(repo)
            store = AutonomyRepository(service.database)
            cycle_id = store.begin_cycle("approval_required")
            story = service.create_story(
                {
                    "title": "Repository state test",
                    "slug": "repository-state-test",
                    "brief": "Verify persisted autonomy state.",
                    "lane": "synthesis",
                    "persona_id": "sage-okafor",
                    "section": "Frontier",
                    "format": "synthesis",
                },
                origin="autonomy",
                cycle_id=cycle_id,
            )

            first = store.create_job(
                cycle_id=cycle_id,
                story_id=story["id"],
                job_type="test",
                idempotency_key="job:fixed",
                payload={"hello": "world"},
            )
            second = store.create_job(
                cycle_id=cycle_id,
                story_id=story["id"],
                job_type="test",
                idempotency_key="job:fixed",
                payload={"ignored": True},
            )
            self.assertEqual(first, second)
            started = store.start_job(first)
            self.assertEqual("running", started["status"])
            self.assertEqual(1, started["attempt"])
            store.finish_job(first, {"ok": True})
            self.assertEqual({"ok": True}, store.job(first)["result"])

            now = utc_now()
            call_one = store.record_provider_call(
                cycle_id=cycle_id,
                story_id=story["id"],
                checkpoint=1,
                agent_id="managing-editor",
                provider="fixture",
                model="fixture-v1",
                request_hash="a" * 64,
                response_hash="b" * 64,
                status="succeeded",
                usage={"input_tokens": 10, "output_tokens": 20, "search_calls": 1},
                started_at=now,
                finished_at=now,
                cost_usd=0.125,
                run_id="run:fixed",
            )
            call_two = store.record_provider_call(
                cycle_id=cycle_id,
                story_id=story["id"],
                checkpoint=1,
                agent_id="managing-editor",
                provider="fixture",
                model="fixture-v1",
                request_hash="c" * 64,
                response_hash="d" * 64,
                status="succeeded",
                usage={},
                started_at=now,
                finished_at=now,
                cost_usd=9.0,
                run_id="run:fixed",
            )
            self.assertEqual(call_one, call_two)
            self.assertAlmostEqual(0.125, store.cycle_cost(cycle_id))
            ledger = service.database.fetch_all("SELECT * FROM budget_ledger")
            self.assertEqual(1, len(ledger))

            for channel in ("x", "facebook"):
                store.queue_distribution(
                    story_id=story["id"],
                    release_id=None,
                    channel=channel,
                    payload={"text": channel},
                    status="held",
                )
            self.assertEqual({"held": 2}, store.distribution_counts())
            self.assertEqual(2, store.activate_distribution(story["id"], "release-123"))
            self.assertEqual({"queued": 2}, store.distribution_counts())

            store.finish_cycle(cycle_id, status="succeeded", selected_count=1)
            self.assertEqual("succeeded", store.recent_cycle()["status"])

    def test_stale_cycle_reconciliation_is_audited(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            repo = make_repo(Path(temp) / "repo")
            service = NewsroomService(repo)
            store = AutonomyRepository(service.database)
            cycle_id = store.begin_cycle("draft_only")
            service.database.execute(
                "UPDATE autonomy_cycles SET started_at='2000-01-01T00:00:00Z' WHERE id=?",
                (cycle_id,),
            )
            self.assertEqual(1, store.reconcile_stale_cycles("2001-01-01T00:00:00Z"))
            row = service.database.fetch_one("SELECT * FROM autonomy_cycles WHERE id=?", (cycle_id,))
            self.assertEqual("failed", row["status"])
            events = service.events(limit=20)
            self.assertTrue(any(event["event_type"] == "autonomy.cycle.recovered_stale" for event in events))


if __name__ == "__main__":
    unittest.main()
