from __future__ import annotations

import json
import math
import time
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable

from ..core.contracts import content_hash, utc_now
from ..core.service import NewsroomError, NewsroomService
from ..providers.agentic import AgenticProvider
from ..providers.router import ProviderRouter
from ..security.vault import CredentialVault
from .budget import BudgetError, BudgetGuard
from .config import load_config
from .costing import estimate_cost_usd
from .dedupe import canonical_url, is_public_http_url, normalize_text, story_key
from .discovery import Candidate, DiscoveryEngine
from .distribution import DistributionEngine
from .lock import CycleFileLock, CycleLockError
from .policy import POLICY_VERSION, PublicationPolicy
from .repository import AutonomyRepository


class AutonomyError(RuntimeError):
    pass


@dataclass(frozen=True)
class StoryCycleResult:
    story_id: str
    slug: str
    title: str
    outcome: str
    policy_decision: str
    decision_id: str | None
    packaged: bool
    published: bool
    release_id: str | None
    error: str = ""


@dataclass(frozen=True)
class CycleResult:
    cycle_id: str | None
    status: str
    mode: str
    started_at: str
    finished_at: str
    candidate_count: int
    selected_count: int
    packaged_count: int
    published_count: int
    cost_usd: float
    stories: tuple[StoryCycleResult, ...]
    reason: str = ""

    def to_dict(self) -> dict[str, Any]:
        value = asdict(self)
        value["stories"] = [asdict(item) for item in self.stories]
        return value


def _parse_utc(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed.astimezone(timezone.utc)


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    return number if math.isfinite(number) else default


class AutonomyController:
    """Deterministic controller for discovery through bounded publication.

    Model providers produce schema-validated artifacts. This controller owns all
    state transitions, budgets, deduplication, policy decisions, exact-version
    approvals, release packaging, publication, and distribution activation.
    """

    def __init__(
        self,
        service: NewsroomService,
        *,
        config: dict[str, Any] | None = None,
        router: ProviderRouter | None = None,
        agent_provider: AgenticProvider | None = None,
        discovery_engine: DiscoveryEngine | None = None,
        distribution_engine: DistributionEngine | None = None,
        vault: CredentialVault | None = None,
    ) -> None:
        self.service = service
        self.repo_root = service.repo_root
        self.config = config or load_config()
        self.vault = vault or CredentialVault()
        self.router = router or ProviderRouter(self.config, self.vault)
        self.repository = AutonomyRepository(service.database)
        self.budget = BudgetGuard(self.repository, self.config["limits"])
        self.agent_provider = agent_provider or AgenticProvider(
            self.repo_root, service.registry, self.config, self.router
        )
        self.discovery = discovery_engine or DiscoveryEngine(
            self.repo_root, self.config, service.registry, self.router
        )
        self.distribution = distribution_engine or DistributionEngine(
            self.config, service.database, self.repository, self.router
        )
        self.policy = PublicationPolicy(self.config)
        self.lock_path = service.data_root / "autopilot.lock"

    # ------------------------------------------------------------------ status
    def status(self) -> dict[str, Any]:
        budget = self.budget.status()
        provider_presence = self.vault.available()
        publication_config = self.config["publication"]
        preauth = publication_config.get("owner_preauthorization") or {}
        acknowledged = _parse_utc(str(preauth.get("acknowledged_at") or ""))
        expires_at = None
        if acknowledged:
            expires_at = (
                acknowledged
                + timedelta(hours=int(preauth.get("max_age_hours") or 0))
            ).replace(microsecond=0).isoformat().replace("+00:00", "Z")
        owner_approved_release_count = self.repository.owner_approved_releases_count()
        return {
            "ok": True,
            "version": "0.3.0",
            "mode": self.config["mode"],
            "schedule": dict(self.config["schedule"]),
            "publication": {
                "auto_publish_enabled": bool(
                    publication_config.get("auto_publish_enabled")
                ),
                "staging_only": bool(publication_config.get("staging_only")),
                "owner_preauthorized": bool(preauth.get("enabled")),
                "owner_preauthorization_expires_at": expires_at,
                "owner_approved_release_count": owner_approved_release_count,
                "required_owner_approved_release_count": int(
                    publication_config.get(
                        "minimum_owner_approved_releases_before_autopublish", 0
                    )
                ),
                "policy_version": POLICY_VERSION,
            },
            "providers": {
                "available": self.router.available_providers(),
                "openai_configured": bool(provider_presence.get("openai_api_key")),
                "gemini_configured": bool(provider_presence.get("gemini_api_key")),
            },
            "budget": {
                "daily_spend": budget.daily_spend,
                "monthly_spend": budget.monthly_spend,
                "daily_limit": budget.daily_limit,
                "monthly_limit": budget.monthly_limit,
                "remaining_daily": budget.remaining_daily,
                "remaining_monthly": budget.remaining_monthly,
            },
            "stories_created_today": self.repository.stories_created_today(),
            "publishes_today": self.repository.publishes_today(),
            "running_cycle": self.repository.running_cycle(),
            "recent_cycle": self.repository.recent_cycle(),
            "cycle_history": self.repository.cycle_history(20),
            "job_counts": self.repository.job_counts(),
            "distribution_counts": self.repository.distribution_counts(),
            "distribution": self.repository.distribution_items(limit=40),
        }

    # -------------------------------------------------------------- preflight
    def _skip_reason(self, *, scheduled: bool, force: bool) -> str | None:
        mode = self.config["mode"]
        if mode == "off":
            return "Autonomy mode is off"
        schedule = self.config["schedule"]
        if scheduled and not schedule.get("enabled"):
            return "The autonomy schedule is disabled"
        if scheduled and self._inside_quiet_hours():
            return "Current UTC hour is inside configured quiet hours"
        if not self.router.available_providers():
            return "No model provider credential is configured"
        if not force:
            recent = self.repository.recent_cycle()
            recent_time = _parse_utc((recent or {}).get("started_at"))
            spacing = timedelta(
                minutes=float(self.config["limits"]["minimum_cycle_spacing_minutes"])
            )
            if recent_time and datetime.now(timezone.utc) - recent_time < spacing:
                return "Minimum cycle spacing has not elapsed"
        if self.repository.stories_created_today() >= int(
            self.config["limits"]["stories_per_day"]
        ):
            return "Daily story-creation limit has been reached"
        try:
            self.budget.assert_cycle_allowed(reserve_usd=0.001)
        except BudgetError as exc:
            return str(exc)
        return None

    def _inside_quiet_hours(self) -> bool:
        quiet = self.config["schedule"].get("quiet_hours_utc") or {}
        start = int(quiet.get("start", 0)) % 24
        end = int(quiet.get("end", 0)) % 24
        if start == end:
            return False
        hour = datetime.now(timezone.utc).hour
        if start < end:
            return start <= hour < end
        return hour >= start or hour < end

    def _assert_call_capacity(self, cycle_id: str) -> None:
        limits = self.config["limits"]
        if self.repository.provider_calls_in_cycle(cycle_id) >= int(
            limits["provider_calls_per_cycle"]
        ):
            raise AutonomyError("Provider-call limit reached for this cycle")
        if self.repository.web_search_calls_in_cycle(cycle_id) >= int(
            limits["web_search_calls_per_cycle"]
        ):
            raise AutonomyError("Web-search-call limit reached for this cycle")
        self.budget.assert_cycle_allowed(reserve_usd=0.001)

    def _assert_publication_preconditions(self) -> None:
        publication = self.config["publication"]
        if publication.get("staging_only"):
            raise AutonomyError("Bounded publication is disabled while staging_only is true")
        if publication.get("require_clean_git_worktree"):
            status = self.service.repository_status()
            if not status.get("ok"):
                raise AutonomyError(
                    "Git repository status could not be verified: "
                    + str(status.get("error") or "unknown error")
                )
            if status.get("dirty"):
                raise AutonomyError(
                    "Automatic publication requires a clean Git working tree"
                )
            if status.get("branch") != "main":
                raise AutonomyError("Automatic publication is restricted to the main branch")
        minimum_seconds = int(publication.get("minimum_seconds_between_publishes") or 0)
        last = self.service.database.fetch_one(
            "SELECT MAX(published_at) AS published_at FROM releases WHERE published_at IS NOT NULL"
        )
        last_time = _parse_utc((last or {}).get("published_at"))
        if last_time and minimum_seconds > 0:
            elapsed = (datetime.now(timezone.utc) - last_time).total_seconds()
            if elapsed < minimum_seconds:
                raise AutonomyError(
                    "Minimum spacing between public releases has not elapsed"
                )

    # ----------------------------------------------------------------- cycles
    def run_cycle(
        self,
        *,
        scheduled: bool = False,
        allow_publish: bool = False,
        force: bool = False,
        dry_run: bool = False,
        log: Callable[[str], None] | None = None,
    ) -> dict[str, Any]:
        logger = log or (lambda _message: None)
        started = utc_now()
        try:
            with CycleFileLock(
                self.lock_path,
                stale_after_seconds=6 * 60 * 60,
                command="scheduled" if scheduled else "manual",
            ):
                return self._run_locked(
                    started=started,
                    scheduled=scheduled,
                    allow_publish=allow_publish,
                    force=force,
                    dry_run=dry_run,
                    logger=logger,
                )
        except CycleLockError as exc:
            raise AutonomyError(str(exc)) from exc

    def _run_locked(
        self,
        *,
        started: str,
        scheduled: bool,
        allow_publish: bool,
        force: bool,
        dry_run: bool,
        logger: Callable[[str], None],
    ) -> dict[str, Any]:
        stale_before = (
            datetime.now(timezone.utc) - timedelta(hours=6)
        ).replace(microsecond=0).isoformat().replace("+00:00", "Z")
        self.repository.reconcile_stale_cycles(stale_before)
        reason = self._skip_reason(scheduled=scheduled, force=force)
        if reason:
            result = CycleResult(
                cycle_id=None,
                status="skipped",
                mode=self.config["mode"],
                started_at=started,
                finished_at=utc_now(),
                candidate_count=0,
                selected_count=0,
                packaged_count=0,
                published_count=0,
                cost_usd=0.0,
                stories=(),
                reason=reason,
            )
            logger(reason)
            return result.to_dict()

        mode = self.config["mode"]
        cycle_id = self.repository.begin_cycle(mode)
        candidate_count = 0
        selected_count = 0
        packaged_count = 0
        published_count = 0
        story_results: list[StoryCycleResult] = []
        summary: dict[str, Any] = {
            "scheduled": scheduled,
            "allow_publish_requested": allow_publish,
            "dry_run": dry_run,
            "providers": self.router.available_providers(),
        }
        logger(f"Cycle {cycle_id[:8]} started in {mode} mode")
        try:
            self._assert_call_capacity(cycle_id)
            discovery_started = utc_now()
            candidates, discovery_usage = self.discovery.discover()
            discovery_finished = utc_now()
            candidate_count = len(candidates)
            self._record_direct_call(
                cycle_id=cycle_id,
                story_id=None,
                checkpoint=1,
                agent_id="managing-editor",
                usage=discovery_usage,
                request_value={"type": "discovery", "lookback_hours": self.config["editorial"]["lookback_hours"]},
                response_value={
                    "candidate_titles": [candidate.title for candidate in candidates],
                    "response_id": discovery_usage.get("response_id"),
                },
                started_at=discovery_started,
                finished_at=discovery_finished,
            )
            logger(f"Discovery returned {candidate_count} evidence-bearing candidates")

            remaining_today = max(
                0,
                int(self.config["limits"]["stories_per_day"])
                - self.repository.stories_created_today(),
            )
            take = min(
                int(self.config["limits"]["stories_per_cycle"]),
                remaining_today,
            )
            selected = self._select_unique_candidates(
                candidates, take, reserve=not dry_run
            )
            selected_count = len(selected)
            logger(f"Selected {selected_count} unique candidates")

            if dry_run:
                story_results = [
                    StoryCycleResult(
                        story_id="",
                        slug=item.slug,
                        title=item.title,
                        outcome="dry-run-selected",
                        policy_decision="not-run",
                        decision_id=None,
                        packaged=False,
                        published=False,
                        release_id=None,
                    )
                    for item in selected
                ]
            else:
                for candidate in selected:
                    try:
                        result = self._process_candidate(
                            cycle_id,
                            candidate,
                            allow_publish=allow_publish,
                            logger=logger,
                        )
                    except Exception as exc:
                        logger(f"Candidate failed safely: {candidate.title}: {exc}")
                        result = StoryCycleResult(
                            story_id="",
                            slug=candidate.slug,
                            title=candidate.title,
                            outcome="failed",
                            policy_decision="not-run",
                            decision_id=None,
                            packaged=False,
                            published=False,
                            release_id=None,
                            error=str(exc)[:2000],
                        )
                    story_results.append(result)
                    packaged_count += 1 if result.packaged else 0
                    published_count += 1 if result.published else 0

            status = "succeeded"
            if any(item.error for item in story_results):
                status = "partial"
            summary.update(
                {
                    "stories": [asdict(item) for item in story_results],
                    "candidate_count": candidate_count,
                    "selected_count": selected_count,
                }
            )
            self.repository.finish_cycle(
                cycle_id,
                status=status,
                candidate_count=candidate_count,
                selected_count=selected_count,
                packaged_count=packaged_count,
                published_count=published_count,
                summary=summary,
            )
            result = CycleResult(
                cycle_id=cycle_id,
                status=status,
                mode=mode,
                started_at=started,
                finished_at=utc_now(),
                candidate_count=candidate_count,
                selected_count=selected_count,
                packaged_count=packaged_count,
                published_count=published_count,
                cost_usd=self.repository.cycle_cost(cycle_id),
                stories=tuple(story_results),
            )
            logger(
                f"Cycle finished: {selected_count} stories, {published_count} published, "
                f"${result.cost_usd:.4f} recorded cost"
            )
            return result.to_dict()
        except Exception as exc:
            summary["stories"] = [asdict(item) for item in story_results]
            self.repository.finish_cycle(
                cycle_id,
                status="failed",
                candidate_count=candidate_count,
                selected_count=selected_count,
                packaged_count=packaged_count,
                published_count=published_count,
                summary=summary,
                error=str(exc),
            )
            raise AutonomyError(str(exc)) from exc

    def _select_unique_candidates(
        self, candidates: list[Candidate], maximum: int, *, reserve: bool = True
    ) -> list[Candidate]:
        selected: list[Candidate] = []
        selected_keys: set[str] = set()
        for candidate in candidates:
            if len(selected) >= maximum:
                break
            key = story_key(candidate.title, [s["url"] for s in candidate.source_leads])
            if key in selected_keys or self.repository.dedupe_key_exists(key):
                continue
            if reserve and not self.repository.reserve_dedupe_key(
                key,
                "story",
                metadata={
                    "title": candidate.title,
                    "slug": candidate.slug,
                    "fingerprint": candidate.fingerprint,
                },
            ):
                continue
            selected_keys.add(key)
            selected.append(candidate)
        return selected

    # ---------------------------------------------------------- story pipeline
    def _process_candidate(
        self,
        cycle_id: str,
        candidate: Candidate,
        *,
        allow_publish: bool,
        logger: Callable[[str], None],
    ) -> StoryCycleResult:
        idempotency_key = "pipeline:" + story_key(
            candidate.title, [s["url"] for s in candidate.source_leads]
        ).removeprefix("story:")
        job_id = self.repository.create_job(
            cycle_id=cycle_id,
            story_id=None,
            job_type="story-pipeline",
            idempotency_key=idempotency_key,
            payload={"title": candidate.title, "slug": candidate.slug},
            max_attempts=2,
        )
        job = self.repository.start_job(job_id)
        if job.get("status") == "succeeded":
            result = job.get("result") or {}
            return StoryCycleResult(**result)

        story: dict[str, Any] | None = None
        try:
            slug = self._available_slug(candidate.slug)
            story = self.service.create_story(
                {
                    "title": candidate.title,
                    "slug": slug,
                    "dek": candidate.dek,
                    "brief": candidate.why_now,
                    "lane": candidate.lane,
                    "persona_id": candidate.persona_id,
                    "section": candidate.section,
                    "format": candidate.lane,
                },
                origin="autonomy",
                automation_mode=self.config["mode"],
                cycle_id=cycle_id,
                confidence_score=candidate.composite_score,
                priority_score=candidate.priority_score,
                source_fingerprint=candidate.fingerprint,
            )
            self.service.database.execute(
                "UPDATE autonomy_jobs SET story_id=?, updated_at=? WHERE id=?",
                (story["id"], utc_now(), job_id),
            )
            dedupe_key = story_key(
                candidate.title, [source["url"] for source in candidate.source_leads]
            )
            self.repository.attach_dedupe_key(dedupe_key, story["id"])
            self._seed_story_metadata(story["id"], candidate)
            for source in candidate.source_leads:
                self._upsert_source(story["id"], source, cycle_id=cycle_id)
            logger(f"Running 8 governed checkpoints for {story['title']}")

            for checkpoint in range(1, 9):
                current = self.service.get_story(story["id"])
                if int(current["current_checkpoint"]) != checkpoint:
                    raise AutonomyError(
                        f"Story checkpoint drift: expected {checkpoint}, found {current['current_checkpoint']}"
                    )
                self._assert_call_capacity(cycle_id)
                stage = self.service.lifecycle.run_checkpoint(
                    story["id"], self.agent_provider
                )
                self._record_latest_run(story["id"], checkpoint, cycle_id)
                self._synchronize_checkpoint(story["id"], checkpoint, cycle_id)
                logger(
                    f"  checkpoint {checkpoint}/8 completed; artifact {stage.artifact_id[:8]}"
                )

            story = self.service.get_story(story["id"])
            draft = self._latest_artifact(story, 5)
            draft_hash = str(draft.get("sha256") or "")
            decision = self.policy.decide(
                story=story,
                artifacts=story["artifacts"],
                publishes_today=self.repository.publishes_today(),
                owner_approved_release_count=(
                    self.repository.owner_approved_releases_count()
                ),
            )
            decision_id = self.repository.record_policy_decision(
                story_id=story["id"],
                cycle_id=cycle_id,
                decision=decision.decision,
                reason_codes=list(decision.reason_codes),
                metrics=decision.metrics,
                policy_version=POLICY_VERSION,
                artifact_sha256=draft_hash,
            )
            risk = str(decision.metrics.get("risk_level") or "R3")
            confidence = _safe_float(decision.metrics.get("confidence_score"))
            story = self.service.apply_policy_outcome(
                story["id"],
                decision=decision.decision,
                risk_level=risk,
                confidence_score=confidence,
                release_ready=decision.release_ready,
            )

            self._generate_distribution_drafts(
                cycle_id=cycle_id,
                story=story,
                logger=logger,
            )

            packaged = False
            published = False
            release_id: str | None = None
            outcome = decision.decision
            # Publication requires both deterministic eligibility and an explicit
            # execution flag. The installed scheduler may pass that flag only after
            # the owner has configured bounded-autopublish preauthorization.
            if decision.auto_publish and allow_publish:
                self._assert_publication_preconditions()
                preauth = self.config["publication"]["owner_preauthorization"]
                self.service.policy_approve_story(
                    story["id"],
                    decision_id=decision_id,
                    policy_version=POLICY_VERSION,
                    owner=str(preauth.get("owner") or self.config.get("owner_name") or "Owner"),
                )
                packaged_story = self.service.package_story(story["id"])
                packaged = True
                release = (packaged_story.get("releases") or [None])[0]
                release_id = str((release or {}).get("release_id") or "") or None
                published_story = self.service.publish_story(
                    story["id"],
                    logger,
                    push=bool(self.config["publication"].get("push_to_github", True)),
                    verify=bool(self.config["publication"].get("verify_cloudflare", True)),
                )
                published = published_story.get("status") == "published"
                release = (published_story.get("releases") or [None])[0]
                release_id = str((release or {}).get("release_id") or release_id or "") or None
                if published and release_id:
                    self.distribution.activate_after_publish(story["id"], release_id)
                    if self.config["distribution"].get("dispatch_after_publish"):
                        self.distribution.dispatch_ready(limit=10)
                outcome = "published" if published else "packaged"
            elif decision.auto_publish and not allow_publish:
                outcome = "eligible-awaiting-execution-authorization"
            elif decision.release_ready:
                outcome = "awaiting-owner-approval"
            else:
                outcome = "blocked"

            result = StoryCycleResult(
                story_id=story["id"],
                slug=story["slug"],
                title=story["title"],
                outcome=outcome,
                policy_decision=decision.decision,
                decision_id=decision_id,
                packaged=packaged,
                published=published,
                release_id=release_id,
            )
            self.repository.finish_job(job_id, asdict(result))
            return result
        except Exception as exc:
            self.repository.fail_job(job_id, str(exc), retryable=False)
            if story:
                self._block_story_after_failure(story["id"], str(exc))
            else:
                # Selection reserves the dedupe key before pipeline execution. If
                # persistence failed before a story existed, release only that
                # unattached reservation so a later cycle can retry safely.
                self.repository.release_unattached_dedupe_key(
                    story_key(candidate.title, [s["url"] for s in candidate.source_leads])
                )
            raise

    def _available_slug(self, base: str) -> str:
        if not self.service.database.fetch_one("SELECT id FROM stories WHERE slug=?", (base,)):
            return base
        suffix = uuid.uuid4().hex[:8]
        return (base[:110].rstrip("-") + "-" + suffix)[:120]

    def _seed_story_metadata(self, story_id: str, candidate: Candidate) -> None:
        with self.service.database.transaction() as connection:
            row = connection.execute(
                "SELECT story_json FROM stories WHERE id=?", (story_id,)
            ).fetchone()
            if not row:
                return
            value = json.loads(row["story_json"])
            value["why_now"] = candidate.why_now
            value["topic_tags"] = list(candidate.topic_tags)
            value["discovery_scores"] = {
                "priority": candidate.priority_score,
                "novelty": candidate.novelty_score,
                "impact": candidate.impact_score,
                "composite": candidate.composite_score,
            }
            connection.execute(
                "UPDATE stories SET story_json=?, risk_level=?, updated_at=? WHERE id=?",
                (json.dumps(value, ensure_ascii=False), candidate.risk_level, utc_now(), story_id),
            )

    def _synchronize_checkpoint(
        self, story_id: str, checkpoint: int, cycle_id: str
    ) -> None:
        artifact = self.service.database.fetch_one(
            """
            SELECT * FROM artifacts
             WHERE story_id=? AND checkpoint=?
             ORDER BY version DESC LIMIT 1
            """,
            (story_id, checkpoint),
        )
        if not artifact:
            raise AutonomyError(f"Checkpoint {checkpoint} did not persist an artifact")
        content = json.loads(artifact["content_json"])
        if checkpoint == 1:
            for source in content.get("source_leads", []):
                if isinstance(source, dict):
                    self._upsert_source(story_id, source, cycle_id=cycle_id)
        elif checkpoint == 3:
            for source in content.get("sources", []):
                if isinstance(source, dict):
                    self._upsert_source(story_id, source, cycle_id=cycle_id)
        elif checkpoint in {4, 7}:
            claims = [item for item in content.get("claims", []) if isinstance(item, dict)]
            self._replace_claims(story_id, claims)
        elif checkpoint == 5:
            article = content.get("article")
            if not isinstance(article, dict):
                raise AutonomyError("Draft checkpoint did not contain an article object")
            self._store_article(story_id, article)
        elif checkpoint == 8:
            self.service.database.execute(
                """
                UPDATE stories
                   SET risk_level=?, recommendation=?, updated_at=?
                 WHERE id=?
                """,
                (
                    str(content.get("risk_level") or "R3"),
                    str(content.get("decision") or "revise"),
                    utc_now(),
                    story_id,
                ),
            )

    def _upsert_source(
        self,
        story_id: str,
        raw: dict[str, Any],
        *,
        cycle_id: str,
    ) -> None:
        url = str(raw.get("url") or "").strip()
        if not is_public_http_url(url):
            return
        canonical = canonical_url(url)
        label = str(raw.get("label") or raw.get("title") or canonical)[:300]
        publisher = str(raw.get("publisher") or "")[:300]
        source_class = str(raw.get("source_class") or "credible-secondary")[:80]
        notes = str(raw.get("notes") or "")[:4000]
        published_at = str(raw.get("published_at") or "").strip() or None
        existing = self.service.database.fetch_one(
            "SELECT id FROM sources WHERE story_id=? AND url=?",
            (story_id, url),
        )
        if existing:
            self.service.database.execute(
                """
                UPDATE sources
                   SET label=?, publisher=?, source_class=?, notes=?, status='collected'
                 WHERE id=?
                """,
                (label, publisher, source_class, notes, existing["id"]),
            )
        else:
            with self.service.database.transaction() as connection:
                connection.execute(
                    """
                    INSERT INTO sources(
                      id, story_id, label, url, publisher, source_class, notes,
                      status, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'collected', ?)
                    """,
                    (
                        str(uuid.uuid4()),
                        story_id,
                        label,
                        url,
                        publisher,
                        source_class,
                        notes,
                        utc_now(),
                    ),
                )
        snapshot_value = {
            "label": label,
            "url": canonical,
            "publisher": publisher,
            "source_class": source_class,
            "published_at": published_at,
            "notes": notes,
            "supports": list(raw.get("supports") or []),
        }
        snapshot_hash = content_hash(snapshot_value)
        with self.service.database.transaction() as connection:
            connection.execute(
                """
                INSERT OR IGNORE INTO source_snapshots(
                  id, story_id, cycle_id, url, canonical_url, publisher, title,
                  source_class, fetched_at, published_at, content_sha256,
                  excerpt, citation_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid.uuid4()),
                    story_id,
                    cycle_id,
                    url,
                    canonical,
                    publisher,
                    label,
                    source_class,
                    utc_now(),
                    published_at,
                    snapshot_hash,
                    notes[:1000],
                    json.dumps(snapshot_value, ensure_ascii=False),
                ),
            )

    def _replace_claims(self, story_id: str, claims: list[dict[str, Any]]) -> None:
        with self.service.database.transaction() as connection:
            connection.execute("DELETE FROM claims WHERE story_id=?", (story_id,))
            for raw in claims:
                evidence = [
                    str(url)
                    for url in raw.get("source_urls", [])
                    if is_public_http_url(str(url))
                ]
                connection.execute(
                    """
                    INSERT INTO claims(
                      id, story_id, text, material, status, evidence_json, notes, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(uuid.uuid4()),
                        story_id,
                        str(raw.get("text") or "")[:10000],
                        1 if raw.get("material", True) else 0,
                        str(raw.get("status") or "unverified")[:80],
                        json.dumps(evidence, ensure_ascii=False),
                        str(raw.get("notes") or "")[:4000],
                        utc_now(),
                    ),
                )

    def _store_article(self, story_id: str, article: dict[str, Any]) -> None:
        with self.service.database.transaction() as connection:
            row = connection.execute(
                "SELECT story_json FROM stories WHERE id=?", (story_id,)
            ).fetchone()
            if not row:
                raise AutonomyError(f"Unknown story: {story_id}")
            previous = json.loads(row["story_json"])
            stored = dict(article)
            if previous.get("artwork_path"):
                stored["artwork_path"] = previous["artwork_path"]
            if previous.get("topic_tags"):
                stored["topic_tags"] = previous["topic_tags"]
            connection.execute(
                """
                UPDATE stories
                   SET title=?, dek=?, story_json=?, updated_at=?
                 WHERE id=?
                """,
                (
                    str(article.get("title") or "")[:240],
                    str(article.get("dek") or "")[:600],
                    json.dumps(stored, ensure_ascii=False),
                    utc_now(),
                    story_id,
                ),
            )

    def _latest_artifact(self, story: dict[str, Any], checkpoint: int) -> dict[str, Any]:
        matches = [
            item for item in story.get("artifacts", []) if int(item.get("checkpoint") or 0) == checkpoint
        ]
        if not matches:
            raise AutonomyError(f"Story is missing checkpoint {checkpoint} artifact")
        return matches[-1]

    def _record_latest_run(self, story_id: str, checkpoint: int, cycle_id: str) -> None:
        run = self.service.database.fetch_one(
            """
            SELECT * FROM runs
             WHERE story_id=? AND checkpoint=?
             ORDER BY started_at DESC LIMIT 1
            """,
            (story_id, checkpoint),
        )
        if not run:
            raise AutonomyError("Provider run audit record is missing")
        usage = json.loads(run.get("usage_json") or "{}")
        cost = estimate_cost_usd(self.config, run["provider"], run["model"], usage)
        self.repository.record_provider_call(
            cycle_id=cycle_id,
            story_id=story_id,
            checkpoint=checkpoint,
            agent_id=run["agent_id"],
            provider=run["provider"],
            model=run["model"],
            request_hash=run.get("input_hash") or "",
            response_hash=run.get("output_hash") or "",
            status=run["status"],
            usage=usage,
            started_at=run["started_at"],
            finished_at=run.get("finished_at") or utc_now(),
            error=run.get("error") or "",
            cost_usd=cost,
            run_id=run["id"],
        )

    def _record_direct_call(
        self,
        *,
        cycle_id: str,
        story_id: str | None,
        checkpoint: int | None,
        agent_id: str,
        usage: dict[str, Any],
        request_value: dict[str, Any],
        response_value: dict[str, Any],
        started_at: str,
        finished_at: str,
    ) -> None:
        provider = str(usage.get("provider") or "unknown")
        model = str(usage.get("model") or "unknown")
        cost = estimate_cost_usd(self.config, provider, model, usage)
        self.repository.record_provider_call(
            cycle_id=cycle_id,
            story_id=story_id,
            checkpoint=checkpoint,
            agent_id=agent_id,
            provider=provider,
            model=model,
            request_hash=str(usage.get("request_sha256") or content_hash(request_value)),
            response_hash=content_hash(response_value),
            status="succeeded",
            usage=usage,
            started_at=started_at,
            finished_at=finished_at,
            cost_usd=cost,
        )

    def _generate_distribution_drafts(
        self,
        *,
        cycle_id: str,
        story: dict[str, Any],
        logger: Callable[[str], None],
    ) -> None:
        if not self.config["distribution"].get("generate_social_drafts"):
            return
        draft = self._latest_artifact(story, 5)
        article = (draft.get("content") or {}).get("article")
        if not isinstance(article, dict):
            return
        self._assert_call_capacity(cycle_id)
        started = utc_now()
        bundle = self.distribution.generate_bundle(story, article)
        finished = utc_now()
        provenance = bundle.get("_provenance") or {}
        usage = dict(provenance.get("usage") or {})
        usage.update(
            {
                "provider": provenance.get("provider"),
                "model": provenance.get("model"),
                "response_id": provenance.get("response_id"),
            }
        )
        self._record_direct_call(
            cycle_id=cycle_id,
            story_id=story["id"],
            checkpoint=12,
            agent_id="social",
            usage=usage,
            request_value={"story_id": story["id"], "draft_sha256": draft["sha256"]},
            response_value=bundle,
            started_at=started,
            finished_at=finished,
        )
        artifact_content = {key: value for key, value in bundle.items() if key != "_provenance"}
        with self.service.database.transaction() as connection:
            version_row = connection.execute(
                "SELECT COALESCE(MAX(version), 0) AS v FROM artifacts WHERE story_id=? AND checkpoint=12",
                (story["id"],),
            ).fetchone()
            version = int(version_row["v"]) + 1
            connection.execute(
                """
                INSERT INTO artifacts(
                  id, story_id, checkpoint, agent_id, artifact_type, version,
                  content_json, sha256, publishable, created_at
                ) VALUES (?, ?, 12, 'social', 'social-package', ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid.uuid4()),
                    story["id"],
                    version,
                    json.dumps(artifact_content, ensure_ascii=False),
                    content_hash(artifact_content),
                    1 if bundle.get("publishable", True) else 0,
                    utc_now(),
                ),
            )
        self.distribution.queue_bundle(
            story_id=story["id"], release_id=None, bundle=bundle, held=True
        )
        logger("  distribution drafts generated and held until publication")

    def _block_story_after_failure(self, story_id: str, error: str) -> None:
        with self.service.database.transaction() as connection:
            connection.execute(
                """
                UPDATE stories
                   SET status='blocked', publishable=0, recommendation='revise', updated_at=?
                 WHERE id=? AND status!='published'
                """,
                (utc_now(), story_id),
            )
            self.service.database.add_event(
                connection,
                event_id=str(uuid.uuid4()),
                story_id=story_id,
                event_type="autonomy.story.failed",
                payload={"error": error[:2000]},
            )

    # --------------------------------------------------------------- dispatch
    def dispatch(self, limit: int = 10) -> dict[str, Any]:
        return {
            "ok": True,
            "result": self.distribution.dispatch_ready(limit=limit),
            "counts": self.repository.distribution_counts(),
        }
