from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import threading
import uuid
from pathlib import Path
from typing import Any, Callable

from .contracts import (
    ContractError,
    LANES,
    SECTIONS,
    content_hash,
    require_string,
    utc_now,
    validate_slug,
)
from .database import Database
from .lifecycle import LifecycleController, LifecycleError
from .package_importer import ImportedStoryPackage, PackageImportError, StoryPackageImporter
from .registry import Registry, RegistryError
from .release_builder import BuiltRelease, ReleaseBuildError, ReleaseBuilder
from ..autonomy.dedupe import is_public_http_url
from ..providers.fixture import FixtureProvider


class NewsroomError(RuntimeError):
    pass


class NewsroomService:
    def __init__(self, repo_root: Path):
        self.repo_root = repo_root.resolve()
        self.newsroom_root = self.repo_root / "newsroom"
        self.data_root = self.newsroom_root / "data"
        self.upload_root = self.data_root / "uploads"
        self.release_root = self.newsroom_root / "releases"
        self.upload_root.mkdir(parents=True, exist_ok=True)
        self.release_root.mkdir(parents=True, exist_ok=True)
        self.registry = Registry()
        self.database = Database(self.data_root / "newsroom.db")
        self.lifecycle = LifecycleController(self.database, self.registry)
        self.importer = StoryPackageImporter(set(self.registry.persona_ids()))
        self.release_builder = ReleaseBuilder(self.repo_root, self.release_root)
        self._publish_lock = threading.Lock()

    def health(self) -> dict[str, Any]:
        return {
            "ok": True,
            "version": "0.3.3",
            "repo_root": str(self.repo_root),
            "database": str(self.database.path),
            "agent_count": len(self.registry.agents),
            "persona_count": len(self.registry.persona_ids()),
            "workflow_checkpoints": len(self.registry.checkpoints),
            "provider_mode": "fixture + OpenAI Responses + Gemini Interactions",
            "publication_authority": "owner-approved exact artifact version",
            "release_manager_installed": (self.repo_root / "tools" / "release_manager" / "release_manager.py").is_file(),
        }

    def stats(self) -> dict[str, Any]:
        counts = {
            row["status"]: row["count"]
            for row in self.database.fetch_all(
                "SELECT status, COUNT(*) AS count FROM stories GROUP BY status"
            )
        }
        totals = self.database.fetch_one(
            """
            SELECT
              COUNT(*) AS stories,
              SUM(CASE WHEN status='awaiting-approval' THEN 1 ELSE 0 END) AS awaiting_approval,
              SUM(CASE WHEN status='published' THEN 1 ELSE 0 END) AS published,
              SUM(CASE WHEN publishable=0 THEN 1 ELSE 0 END) AS non_publishable
            FROM stories
            """
        ) or {}
        event_count = self.database.fetch_one("SELECT COUNT(*) AS count FROM events") or {"count": 0}
        return {
            "agent_count": len(self.registry.agents),
            "persona_count": len(self.registry.persona_ids()),
            "checkpoint_count": len(self.registry.checkpoints),
            "stories": int(totals.get("stories") or 0),
            "awaiting_approval": int(totals.get("awaiting_approval") or 0),
            "published": int(totals.get("published") or 0),
            "non_publishable": int(totals.get("non_publishable") or 0),
            "events": int(event_count.get("count") or 0),
            "status_counts": counts,
        }

    def create_story(
        self,
        raw: dict[str, Any],
        *,
        demo: bool = False,
        origin: str | None = None,
        automation_mode: str = "manual",
        cycle_id: str | None = None,
        confidence_score: float = 0.0,
        priority_score: float = 0.0,
        source_fingerprint: str = "",
    ) -> dict[str, Any]:
        try:
            title = require_string(raw.get("title"), "title", maximum=240)
            slug = validate_slug(raw.get("slug"))
            brief = require_string(raw.get("brief") or title, "brief", maximum=4000)
            lane = require_string(raw.get("lane") or "synthesis", "lane", maximum=30)
            if lane not in LANES:
                raise ContractError(f"unsupported lane: {lane}")
            persona_id = require_string(raw.get("persona_id") or "sage-okafor", "persona_id", maximum=80)
            if persona_id not in self.registry.persona_ids():
                raise ContractError(f"unknown persona: {persona_id}")
            section = require_string(raw.get("section") or "Frontier", "section", maximum=80)
            if section not in SECTIONS:
                raise ContractError(f"unsupported section: {section}")
            fmt = require_string(raw.get("format") or "synthesis", "format", maximum=30)
            if fmt not in {"brief", "synthesis", "research"}:
                raise ContractError(f"unsupported format: {fmt}")
        except ContractError as exc:
            raise NewsroomError(str(exc)) from exc

        story_id = str(uuid.uuid4())
        now = utc_now()
        story_json = {
            "slug": slug,
            "title": title,
            "dek": str(raw.get("dek") or brief[:400]).strip(),
            "brief": brief,
            "persona": persona_id,
            "section": section,
            "format": fmt,
            "disclaimer": str(raw.get("disclaimer") or "none").strip(),
            "body": [],
            "apply": [],
            "sources": [],
            "links": [],
            "corrections": [],
        }
        try:
            with self.database.transaction() as connection:
                connection.execute(
                    """
                    INSERT INTO stories(
                      id, slug, title, dek, brief, lane, persona_id, section, format,
                      status, current_checkpoint, risk_level, recommendation,
                      publishable, origin, story_json, automation_mode,
                      confidence_score, priority_score, source_fingerprint, cycle_id,
                      created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'candidate', 1, 'R1', 'revise',
                              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        story_id,
                        slug,
                        title,
                        story_json["dek"],
                        brief,
                        lane,
                        persona_id,
                        section,
                        fmt,
                        0 if demo else 1,
                        origin or ("fixture-demo" if demo else "operator"),
                        json.dumps(story_json, ensure_ascii=False),
                        automation_mode,
                        max(0.0, min(1.0, float(confidence_score))),
                        max(0.0, min(1.0, float(priority_score))),
                        source_fingerprint,
                        cycle_id,
                        now,
                        now,
                    ),
                )
                self.database.add_event(
                    connection,
                    event_id=str(uuid.uuid4()),
                    story_id=story_id,
                    event_type="story.created",
                    payload={
                        "title": title,
                        "slug": slug,
                        "lane": lane,
                        "persona_id": persona_id,
                        "demo": demo,
                    },
                )
        except Exception as exc:
            if "UNIQUE constraint failed: stories.slug" in str(exc):
                raise NewsroomError(f"A newsroom story already uses slug {slug}") from exc
            raise
        return self.get_story(story_id)

    def create_demo(self) -> dict[str, Any]:
        suffix = uuid.uuid4().hex[:6]
        story = self.create_story(
            {
                "title": "Newsroom Core vertical-slice proof",
                "slug": f"newsroom-core-demo-{suffix}",
                "brief": "Exercise all deterministic checkpoints without producing publishable journalism.",
                "lane": "synthesis",
                "persona_id": "sage-okafor",
                "section": "Frontier",
                "format": "synthesis",
            },
            demo=True,
        )
        self.add_source(
            story["id"],
            {
                "label": "Fixture source — not external evidence",
                "url": "https://rtfclmgzn.com/",
                "source_class": "fixture",
                "notes": "Used only to exercise persistence and state transitions.",
            },
        )
        provider = FixtureProvider()
        for _ in range(8):
            current = self.get_story(story["id"])
            if int(current["current_checkpoint"]) >= 9:
                break
            self.lifecycle.run_checkpoint(story["id"], provider)
        return self.get_story(story["id"])

    def run_next_fixture(self, story_id: str) -> dict[str, Any]:
        story = self._story_row(story_id)
        if story["origin"] != "fixture-demo":
            raise NewsroomError("Fixture execution is restricted to demo stories")
        try:
            self.lifecycle.run_checkpoint(story_id, FixtureProvider())
        except LifecycleError as exc:
            raise NewsroomError(str(exc)) from exc
        return self.get_story(story_id)

    def add_source(self, story_id: str, raw: dict[str, Any]) -> dict[str, Any]:
        self._story_row(story_id)
        try:
            label = require_string(raw.get("label"), "source.label", maximum=300)
            url = require_string(raw.get("url"), "source.url", maximum=2000)
            if not is_public_http_url(url):
                raise ContractError("source URL must be a public http:// or https:// URL")
        except ContractError as exc:
            raise NewsroomError(str(exc)) from exc
        source_id = str(uuid.uuid4())
        with self.database.transaction() as connection:
            connection.execute(
                """
                INSERT INTO sources(
                  id, story_id, label, url, publisher, source_class, notes, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'unreviewed', ?)
                """,
                (
                    source_id,
                    story_id,
                    label,
                    url,
                    str(raw.get("publisher") or "").strip(),
                    str(raw.get("source_class") or "credible-secondary").strip(),
                    str(raw.get("notes") or "").strip(),
                    utc_now(),
                ),
            )
            self.database.add_event(
                connection,
                event_id=str(uuid.uuid4()),
                story_id=story_id,
                event_type="source.added",
                payload={"source_id": source_id, "label": label, "url": url},
            )
        return self.get_story(story_id)

    def import_package(self, data: bytes, filename: str) -> dict[str, Any]:
        try:
            imported = self.importer.inspect(data, filename)
        except PackageImportError as exc:
            raise NewsroomError(str(exc)) from exc
        package = imported.document
        article = package["story"]
        workflow = package["workflow"]
        checkpoint_set = {int(a["checkpoint"]) for a in workflow["artifacts"]}
        if len(checkpoint_set) != len(workflow["artifacts"]):
            raise NewsroomError("A publishable import may contain only one artifact per checkpoint")
        missing = sorted(set(range(1, 10)) - checkpoint_set)
        if missing:
            raise NewsroomError(
                "A publishable import must include checkpoint artifacts 1-9; missing "
                + ", ".join(str(v) for v in missing)
            )
        if workflow["recommendation"] != "approve":
            raise NewsroomError("Only packages recommended for approval can enter the owner gate")
        for artifact in workflow["artifacts"]:
            agent_id = artifact["agent_id"]
            if agent_id not in self.registry.agents:
                raise NewsroomError(f"Artifact references unknown agent: {agent_id}")
            checkpoint = int(artifact["checkpoint"])
            allowed = self.registry.agents[agent_id].checkpoints
            # At checkpoint 5, the selected persona must own the draft.
            if checkpoint == 5 and agent_id != article["persona"]:
                raise NewsroomError("Checkpoint 5 must be owned by the selected persona")
            if checkpoint not in allowed:
                raise NewsroomError(
                    f"Agent {agent_id} is not allowed to produce checkpoint {checkpoint}"
                )

        story_id = str(uuid.uuid4())
        now = utc_now()
        artwork_rel: str | None = None
        if imported.artwork_bytes is not None and imported.artwork_suffix:
            artwork_rel = f"newsroom/data/uploads/{story_id}{imported.artwork_suffix}"
            artwork_path = self.repo_root / artwork_rel
            artwork_path.parent.mkdir(parents=True, exist_ok=True)
            temp_path = artwork_path.with_suffix(artwork_path.suffix + ".tmp")
            temp_path.write_bytes(imported.artwork_bytes)
            os.replace(temp_path, artwork_path)
        article_for_storage = {**article, "artwork_path": artwork_rel}
        try:
            with self.database.transaction() as connection:
                connection.execute(
                    """
                    INSERT INTO stories(
                      id, slug, title, dek, brief, lane, persona_id, section, format,
                      status, current_checkpoint, risk_level, recommendation,
                      publishable, origin, story_json, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'awaiting-approval', 9, ?, ?, 1, 'story-package', ?, ?, ?)
                    """,
                    (
                        story_id,
                        article["slug"],
                        article["title"],
                        article["dek"],
                        article.get("brief") or article["dek"],
                        article["format"],
                        article["persona"],
                        article["section"],
                        article["format"],
                        workflow["risk_level"],
                        workflow["recommendation"],
                        json.dumps(article_for_storage, ensure_ascii=False),
                        now,
                        now,
                    ),
                )
                for source in article["sources"]:
                    connection.execute(
                        """
                        INSERT INTO sources(
                          id, story_id, label, url, publisher, source_class, notes, status, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'attached', ?)
                        """,
                        (
                            str(uuid.uuid4()),
                            story_id,
                            source["label"],
                            source["url"],
                            source.get("publisher") or "",
                            source.get("source_class") or "credible-secondary",
                            source.get("notes") or "",
                            now,
                        ),
                    )
                for artifact_raw in sorted(workflow["artifacts"], key=lambda v: int(v["checkpoint"])):
                    checkpoint = int(artifact_raw["checkpoint"])
                    artifact_id = str(uuid.uuid4())
                    content = dict(artifact_raw["content"])
                    if checkpoint == 5:
                        content["article"] = article
                    connection.execute(
                        """
                        INSERT INTO artifacts(
                          id, story_id, checkpoint, agent_id, artifact_type, version,
                          content_json, sha256, publishable, created_at
                        ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, 1, ?)
                        """,
                        (
                            artifact_id,
                            story_id,
                            checkpoint,
                            artifact_raw["agent_id"],
                            artifact_raw["artifact_type"],
                            json.dumps(content, ensure_ascii=False),
                            content_hash(content),
                            now,
                        ),
                    )
                self.database.add_event(
                    connection,
                    event_id=str(uuid.uuid4()),
                    story_id=story_id,
                    event_type="story.package_imported",
                    payload={
                        "filename": filename,
                        "risk_level": workflow["risk_level"],
                        "recommendation": workflow["recommendation"],
                        "artifact_count": len(workflow["artifacts"]),
                        "artwork": bool(artwork_rel),
                    },
                )
        except Exception as exc:
            if artwork_rel:
                (self.repo_root / artwork_rel).unlink(missing_ok=True)
            if "UNIQUE constraint failed: stories.slug" in str(exc):
                raise NewsroomError(f"A newsroom story already uses slug {article['slug']}") from exc
            raise
        return self.get_story(story_id)

    def approve_story(self, story_id: str, approver: str, note: str = "") -> dict[str, Any]:
        approver = require_string(approver, "approver", maximum=120)
        with self.database.transaction() as connection:
            story = connection.execute("SELECT * FROM stories WHERE id=?", (story_id,)).fetchone()
            if story is None:
                raise NewsroomError(f"Unknown story: {story_id}")
            if story["status"] != "awaiting-approval" or int(story["current_checkpoint"]) != 9:
                raise NewsroomError("Story is not at the owner approval checkpoint")
            if not bool(story["publishable"]):
                raise NewsroomError("Non-publishable fixture or blocked work cannot be approved")
            if story["recommendation"] != "approve":
                raise NewsroomError("EIC recommendation is not approve")
            draft = connection.execute(
                """
                SELECT * FROM artifacts
                 WHERE story_id=? AND checkpoint=5 AND publishable=1
                 ORDER BY version DESC LIMIT 1
                """,
                (story_id,),
            ).fetchone()
            if draft is None:
                raise NewsroomError("No publishable draft artifact exists")
            existing = connection.execute(
                "SELECT * FROM approvals WHERE story_id=? AND artifact_id=? AND decision='approve'",
                (story_id, draft["id"]),
            ).fetchone()
            if existing is None:
                connection.execute(
                    """
                    INSERT INTO approvals(
                      id, story_id, artifact_id, artifact_sha256, approver, decision, note, created_at
                    ) VALUES (?, ?, ?, ?, ?, 'approve', ?, ?)
                    """,
                    (
                        str(uuid.uuid4()),
                        story_id,
                        draft["id"],
                        draft["sha256"],
                        approver,
                        note.strip(),
                        utc_now(),
                    ),
                )
            connection.execute(
                "UPDATE stories SET status='packaging', current_checkpoint=10, updated_at=? WHERE id=?",
                (utc_now(), story_id),
            )
            self.database.add_event(
                connection,
                event_id=str(uuid.uuid4()),
                story_id=story_id,
                event_type="story.approved",
                payload={
                    "approver": approver,
                    "artifact_id": draft["id"],
                    "artifact_sha256": draft["sha256"],
                    "note": note.strip(),
                },
            )
        return self.get_story(story_id)

    def apply_policy_outcome(
        self,
        story_id: str,
        *,
        decision: str,
        risk_level: str,
        confidence_score: float,
        release_ready: bool,
    ) -> dict[str, Any]:
        if decision not in {"blocked", "owner-review", "auto-publish"}:
            raise NewsroomError(f"Unsupported policy decision: {decision}")
        recommendation = "approve" if release_ready else "revise"
        status = "awaiting-approval" if release_ready else "blocked"
        publishable = 1 if release_ready else 0
        with self.database.transaction() as connection:
            story = connection.execute(
                "SELECT * FROM stories WHERE id=?", (story_id,)
            ).fetchone()
            if story is None:
                raise NewsroomError(f"Unknown story: {story_id}")
            if int(story["current_checkpoint"]) != 9:
                raise NewsroomError("Policy may be applied only at checkpoint 9")
            connection.execute(
                """
                UPDATE stories
                   SET status=?, risk_level=?, recommendation=?, publishable=?,
                       confidence_score=?, auto_publish_eligible=?, updated_at=?
                 WHERE id=?
                """,
                (
                    status,
                    risk_level,
                    recommendation,
                    publishable,
                    max(0.0, min(1.0, float(confidence_score))),
                    1 if decision == "auto-publish" and release_ready else 0,
                    utc_now(),
                    story_id,
                ),
            )
            self.database.add_event(
                connection,
                event_id=str(uuid.uuid4()),
                story_id=story_id,
                event_type="story.policy_applied",
                payload={
                    "decision": decision,
                    "risk_level": risk_level,
                    "confidence_score": confidence_score,
                    "release_ready": release_ready,
                },
            )
        return self.get_story(story_id)

    def policy_approve_story(
        self,
        story_id: str,
        *,
        decision_id: str,
        policy_version: str,
        owner: str,
    ) -> dict[str, Any]:
        """Create an exact-version approval under explicit owner preauthorization.

        The model cannot invoke this directly. The deterministic AutonomyController
        must present a matching stored policy decision and approved draft checksum.
        """
        with self.database.transaction() as connection:
            story = connection.execute(
                "SELECT * FROM stories WHERE id=?", (story_id,)
            ).fetchone()
            if story is None:
                raise NewsroomError(f"Unknown story: {story_id}")
            if (
                story["status"] != "awaiting-approval"
                or int(story["current_checkpoint"]) != 9
                or not bool(story["publishable"])
                or not bool(story["auto_publish_eligible"])
            ):
                raise NewsroomError("Story is not eligible for bounded policy publication")
            policy = connection.execute(
                "SELECT * FROM policy_decisions WHERE id=? AND story_id=?",
                (decision_id, story_id),
            ).fetchone()
            if policy is None:
                raise NewsroomError("Stored publication policy decision is missing")
            if policy["decision"] != "auto-publish" or policy["policy_version"] != policy_version:
                raise NewsroomError("Policy decision does not authorize bounded publication")
            draft = connection.execute(
                """
                SELECT * FROM artifacts
                 WHERE story_id=? AND checkpoint=5 AND publishable=1
                 ORDER BY version DESC LIMIT 1
                """,
                (story_id,),
            ).fetchone()
            if draft is None:
                raise NewsroomError("No publishable draft artifact exists")
            if policy["artifact_sha256"] != draft["sha256"]:
                raise NewsroomError("Policy authorization does not match the exact draft version")
            existing = connection.execute(
                "SELECT id FROM approvals WHERE story_id=? AND artifact_id=? AND decision='approve'",
                (story_id, draft["id"]),
            ).fetchone()
            if existing is None:
                connection.execute(
                    """
                    INSERT INTO approvals(
                      id, story_id, artifact_id, artifact_sha256, approver, decision, note, created_at
                    ) VALUES (?, ?, ?, ?, ?, 'approve', ?, ?)
                    """,
                    (
                        str(uuid.uuid4()),
                        story_id,
                        draft["id"],
                        draft["sha256"],
                        f"owner-policy:{owner}",
                        f"Explicit owner preauthorization; {policy_version}; decision {decision_id}",
                        utc_now(),
                    ),
                )
            connection.execute(
                "UPDATE stories SET status='packaging', current_checkpoint=10, updated_at=? WHERE id=?",
                (utc_now(), story_id),
            )
            self.database.add_event(
                connection,
                event_id=str(uuid.uuid4()),
                story_id=story_id,
                event_type="story.policy_approved",
                payload={
                    "decision_id": decision_id,
                    "policy_version": policy_version,
                    "artifact_id": draft["id"],
                    "artifact_sha256": draft["sha256"],
                    "owner": owner,
                },
            )
        return self.get_story(story_id)

    def reject_story(self, story_id: str, approver: str, note: str) -> dict[str, Any]:
        approver = require_string(approver, "approver", maximum=120)
        note = require_string(note, "note", maximum=2000)
        with self.database.transaction() as connection:
            story = connection.execute("SELECT * FROM stories WHERE id=?", (story_id,)).fetchone()
            if story is None:
                raise NewsroomError(f"Unknown story: {story_id}")
            draft = connection.execute(
                "SELECT * FROM artifacts WHERE story_id=? AND checkpoint=5 ORDER BY version DESC LIMIT 1",
                (story_id,),
            ).fetchone()
            if draft is None:
                raise NewsroomError("No draft exists to reject")
            connection.execute(
                """
                INSERT INTO approvals(
                  id, story_id, artifact_id, artifact_sha256, approver, decision, note, created_at
                ) VALUES (?, ?, ?, ?, ?, 'reject', ?, ?)
                """,
                (
                    str(uuid.uuid4()),
                    story_id,
                    draft["id"],
                    draft["sha256"],
                    approver,
                    note,
                    utc_now(),
                ),
            )
            connection.execute(
                "UPDATE stories SET status='blocked', publishable=0, updated_at=? WHERE id=?",
                (utc_now(), story_id),
            )
            self.database.add_event(
                connection,
                event_id=str(uuid.uuid4()),
                story_id=story_id,
                event_type="story.rejected",
                payload={"approver": approver, "note": note},
            )
        return self.get_story(story_id)

    def package_story(self, story_id: str) -> dict[str, Any]:
        story_row = self._story_row(story_id)
        if story_row["status"] not in {"packaging", "release-validation"}:
            raise NewsroomError("Story must be owner-approved before packaging")
        existing = self.database.fetch_one(
            "SELECT * FROM releases WHERE story_id=? ORDER BY created_at DESC LIMIT 1", (story_id,)
        )
        if existing and existing["status"] in {"ready", "publishing", "published"}:
            return self.get_story(story_id)

        stored_story_document = json.loads(story_row["story_json"])
        artifacts = self._artifacts(story_id)
        approval = self.database.fetch_one(
            "SELECT * FROM approvals WHERE story_id=? AND decision='approve' ORDER BY created_at DESC LIMIT 1",
            (story_id,),
        )
        if approval is None:
            raise NewsroomError("Exact-version owner approval is missing")
        latest_draft = next(
            (a for a in reversed(artifacts) if int(a["checkpoint"]) == 5), None
        )
        if latest_draft is None or latest_draft["sha256"] != approval["artifact_sha256"]:
            raise NewsroomError("Approval no longer matches the latest draft artifact")
        approved_article = (latest_draft.get("content") or {}).get("article")
        if not isinstance(approved_article, dict):
            raise NewsroomError("The exact approved draft does not contain a structured article")
        story_document = dict(approved_article)
        story_document["artwork_path"] = stored_story_document.get("artwork_path")
        artwork_path = None
        artwork_rel = story_document.get("artwork_path")
        if artwork_rel:
            artwork_path = self.repo_root / artwork_rel
        try:
            built = self.release_builder.build(
                story_id=story_id,
                story=story_document,
                artifacts=artifacts,
                approval=approval,
                artwork_path=artwork_path,
            )
        except ReleaseBuildError as exc:
            raise NewsroomError(str(exc)) from exc

        with self.database.transaction() as connection:
            checkpoint_content = {
                "summary": f"Release package {built.release_id} built and checksum-sealed.",
                "release_id": built.release_id,
                "archive_path": str(built.archive_path),
                "files": list(built.files),
            }
            artifact_id = str(uuid.uuid4())
            connection.execute(
                """
                INSERT INTO artifacts(
                  id, story_id, checkpoint, agent_id, artifact_type, version,
                  content_json, sha256, publishable, created_at
                ) VALUES (?, ?, 10, 'publishing', 'publication-package', 1, ?, ?, 1, ?)
                """,
                (
                    artifact_id,
                    story_id,
                    json.dumps(checkpoint_content, ensure_ascii=False),
                    content_hash(checkpoint_content),
                    utc_now(),
                ),
            )
            connection.execute(
                """
                INSERT INTO releases(
                  id, story_id, release_id, artifact_id, package_path, status, created_at
                ) VALUES (?, ?, ?, ?, ?, 'ready', ?)
                """,
                (
                    str(uuid.uuid4()),
                    story_id,
                    built.release_id,
                    artifact_id,
                    str(built.archive_path),
                    utc_now(),
                ),
            )
            connection.execute(
                "UPDATE stories SET status='release-validation', current_checkpoint=11, updated_at=? WHERE id=?",
                (utc_now(), story_id),
            )
            self.database.add_event(
                connection,
                event_id=str(uuid.uuid4()),
                story_id=story_id,
                event_type="release.built",
                payload={
                    "release_id": built.release_id,
                    "package_path": str(built.archive_path),
                    "files": list(built.files),
                },
            )
        return self.get_story(story_id)

    def publish_story(
        self,
        story_id: str,
        log: Callable[[str], None] | None = None,
        *,
        push: bool = True,
        verify: bool = True,
    ) -> dict[str, Any]:
        logger = log or (lambda message: None)
        if not self._publish_lock.acquire(blocking=False):
            raise NewsroomError("Another release is currently publishing")
        try:
            story = self._story_row(story_id)
            release = self.database.fetch_one(
                "SELECT * FROM releases WHERE story_id=? ORDER BY created_at DESC LIMIT 1",
                (story_id,),
            )
            if release is None or release["status"] != "ready":
                raise NewsroomError("Build and validate a release package before publishing")
            package_path = Path(release["package_path"])
            if not package_path.is_file():
                raise NewsroomError("Release package file is missing")
            release_manager = self.repo_root / "tools" / "release_manager" / "release_manager.py"
            if not release_manager.is_file():
                raise NewsroomError("Editorial Release Manager is not installed")
            with self.database.transaction() as connection:
                connection.execute(
                    "UPDATE releases SET status='publishing' WHERE id=?", (release["id"],)
                )
                self.database.add_event(
                    connection,
                    event_id=str(uuid.uuid4()),
                    story_id=story_id,
                    event_type="release.publish_started",
                    payload={"release_id": release["release_id"]},
                )
            command = [
                sys.executable,
                str(release_manager),
                "--project",
                str(self.repo_root),
                "--publish",
                str(package_path),
                "--yes",
            ]
            if not push:
                command.append("--no-push")
            if not verify:
                command.append("--no-verify")
            logger("Launching checksum validation, Git commit, GitHub push, and Cloudflare confirmation…")
            process = subprocess.Popen(
                command,
                cwd=self.repo_root,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
                bufsize=1,
            )
            output_lines: list[str] = []
            assert process.stdout is not None
            try:
                for line in process.stdout:
                    clean = line.rstrip()
                    output_lines.append(clean)
                    logger(clean)
            finally:
                process.stdout.close()
            return_code = process.wait()
            if return_code != 0:
                with self.database.transaction() as connection:
                    connection.execute(
                        "UPDATE releases SET status='failed' WHERE id=?", (release["id"],)
                    )
                    self.database.add_event(
                        connection,
                        event_id=str(uuid.uuid4()),
                        story_id=story_id,
                        event_type="release.publish_failed",
                        payload={
                            "release_id": release["release_id"],
                            "exit_code": return_code,
                            "tail": output_lines[-20:],
                        },
                    )
                raise NewsroomError(
                    "Release Manager stopped the publication. Review the activity log; no unsafe partial release should remain."
                )

            commit_hash = self._git_output("rev-parse", "--short=12", "HEAD")
            live_url = f"https://rtfclmgzn.com/#/article/{story['slug']}"
            with self.database.transaction() as connection:
                connection.execute(
                    """
                    UPDATE releases
                       SET status='published', commit_hash=?, live_url=?, published_at=?
                     WHERE id=?
                    """,
                    (commit_hash, live_url, utc_now(), release["id"]),
                )
                connection.execute(
                    """
                    UPDATE stories
                       SET status='published', current_checkpoint=12, published_at=?, updated_at=?
                     WHERE id=?
                    """,
                    (utc_now(), utc_now(), story_id),
                )
                monitoring_content = {
                    "summary": "Release committed, pushed, and handed to Cloudflare deployment verification.",
                    "release_id": release["release_id"],
                    "commit_hash": commit_hash,
                    "live_url": live_url,
                }
                connection.execute(
                    """
                    INSERT INTO artifacts(
                      id, story_id, checkpoint, agent_id, artifact_type, version,
                      content_json, sha256, publishable, created_at
                    ) VALUES (?, ?, 11, 'publishing', 'release-record', 1, ?, ?, 1, ?)
                    """,
                    (
                        str(uuid.uuid4()),
                        story_id,
                        json.dumps(monitoring_content, ensure_ascii=False),
                        content_hash(monitoring_content),
                        utc_now(),
                    ),
                )
                self.database.add_event(
                    connection,
                    event_id=str(uuid.uuid4()),
                    story_id=story_id,
                    event_type="release.published",
                    payload={
                        "release_id": release["release_id"],
                        "commit_hash": commit_hash,
                        "live_url": live_url,
                    },
                )
            return self.get_story(story_id)
        finally:
            self._publish_lock.release()

    def list_stories(self, *, limit: int = 100) -> list[dict[str, Any]]:
        rows = self.database.fetch_all(
            "SELECT * FROM stories ORDER BY updated_at DESC LIMIT ?", (max(1, min(limit, 500)),)
        )
        return [self._story_summary(row) for row in rows]

    def get_story(self, story_id: str) -> dict[str, Any]:
        row = self._story_row(story_id)
        result = self._story_summary(row)
        result["story"] = json.loads(row["story_json"])
        result["sources"] = self.database.fetch_all(
            "SELECT * FROM sources WHERE story_id=? ORDER BY created_at", (story_id,)
        )
        result["claims"] = self.database.fetch_all(
            "SELECT * FROM claims WHERE story_id=? ORDER BY created_at", (story_id,)
        )
        result["artifacts"] = self._artifacts(story_id)
        result["approvals"] = self.database.fetch_all(
            "SELECT * FROM approvals WHERE story_id=? ORDER BY created_at", (story_id,)
        )
        result["releases"] = self.database.fetch_all(
            "SELECT * FROM releases WHERE story_id=? ORDER BY created_at DESC", (story_id,)
        )
        result["policy_decisions"] = self.database.fetch_all(
            "SELECT * FROM policy_decisions WHERE story_id=? ORDER BY created_at DESC", (story_id,)
        )
        for decision in result["policy_decisions"]:
            decision["reason_codes"] = json.loads(decision.pop("reason_codes_json"))
            decision["metrics"] = json.loads(decision.pop("metrics_json"))
        result["events"] = self.events(story_id=story_id, limit=200)
        return result

    def events(self, *, story_id: str | None = None, limit: int = 100) -> list[dict[str, Any]]:
        if story_id:
            rows = self.database.fetch_all(
                "SELECT * FROM events WHERE story_id=? ORDER BY sequence DESC LIMIT ?",
                (story_id, max(1, min(limit, 1000))),
            )
        else:
            rows = self.database.fetch_all(
                "SELECT * FROM events ORDER BY sequence DESC LIMIT ?",
                (max(1, min(limit, 1000)),),
            )
        for row in rows:
            row["payload"] = json.loads(row.pop("payload_json"))
        return rows

    def registry_payload(self) -> dict[str, Any]:
        return self.registry.public_payload()

    def repository_status(self) -> dict[str, Any]:
        try:
            status = self._git_output("status", "--porcelain")
            branch = self._git_output("branch", "--show-current")
            remote = self._git_output("remote", "get-url", "origin")
            head = self._git_output("rev-parse", "--short=12", "HEAD")
            return {
                "ok": True,
                "branch": branch,
                "remote": remote,
                "head": head,
                "dirty": bool(status.strip()),
            }
        except NewsroomError as exc:
            return {"ok": False, "error": str(exc)}

    def _git_output(self, *args: str) -> str:
        try:
            result = subprocess.run(
                ["git", *args],
                cwd=self.repo_root,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=60,
                check=False,
            )
        except (OSError, subprocess.TimeoutExpired) as exc:
            raise NewsroomError(f"Git command failed: {exc}") from exc
        if result.returncode != 0:
            raise NewsroomError((result.stderr or result.stdout or "Git failed").strip())
        return result.stdout.strip()

    def _story_row(self, story_id: str) -> dict[str, Any]:
        row = self.database.fetch_one("SELECT * FROM stories WHERE id=?", (story_id,))
        if row is None:
            raise NewsroomError(f"Unknown story: {story_id}")
        return row

    def _story_summary(self, row: dict[str, Any]) -> dict[str, Any]:
        checkpoint = self.registry.checkpoints.get(int(row["current_checkpoint"]))
        result = {key: value for key, value in row.items() if key != "story_json"}
        result["publishable"] = bool(result["publishable"])
        result["auto_publish_eligible"] = bool(result.get("auto_publish_eligible"))
        result["checkpoint_name"] = checkpoint.name if checkpoint else "Unknown"
        result["checkpoint_id"] = checkpoint.id if checkpoint else "unknown"
        return result

    def _artifacts(self, story_id: str) -> list[dict[str, Any]]:
        rows = self.database.fetch_all(
            "SELECT * FROM artifacts WHERE story_id=? ORDER BY checkpoint, version", (story_id,)
        )
        for row in rows:
            row["content"] = json.loads(row.pop("content_json"))
            row["publishable"] = bool(row["publishable"])
        return rows
