from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from .app import find_repo_root, serve
from .autonomy.config import ConfigError, load_config, save_user_config
from .autonomy.controller import AutonomyController, AutonomyError
from .autonomy.scheduler import (
    SchedulerError,
    disable_schedule,
    enable_schedule,
    schedule_status,
)
from .autonomy.wizard import WizardError, run_configuration_wizard
from .core.database import SCHEMA_VERSION
from .core.service import NewsroomError, NewsroomService
from .security.vault import VaultError

PLATFORM_VERSION = "0.3.3"


def doctor(repo_root: Path, service: NewsroomService) -> tuple[bool, dict[str, Any]]:
    checks: list[dict[str, Any]] = []

    def record(name: str, ok: bool, detail: Any) -> None:
        checks.append({"name": name, "ok": bool(ok), "detail": detail})

    health = service.health()
    record(
        "canonical_registry",
        health.get("agent_count") == 26
        and health.get("persona_count") == 9
        and health.get("workflow_checkpoints") == 12,
        {
            "agents": health.get("agent_count"),
            "personas": health.get("persona_count"),
            "checkpoints": health.get("workflow_checkpoints"),
        },
    )
    schema_row = service.database.fetch_one(
        "SELECT value FROM schema_meta WHERE key='schema_version'"
    )
    record(
        "database",
        Path(health["database"]).is_file()
        and int((schema_row or {}).get("value") or 0) == SCHEMA_VERSION,
        {"path": health["database"], "schema_version": (schema_row or {}).get("value")},
    )

    platform_path = repo_root / "platform" / "platform.json"
    try:
        platform = json.loads(platform_path.read_text("utf-8"))
        record(
            "platform_contract",
            platform.get("platform_version") == PLATFORM_VERSION
            and platform.get("editorial_release_included") is False
            and platform.get("canonical_agent_count") == 26
            and platform.get("external_model_provider_included") is True,
            platform,
        )
    except Exception as exc:
        record("platform_contract", False, str(exc))

    try:
        config = load_config()
        record(
            "autonomy_config",
            config.get("mode") in {
                "off",
                "draft_only",
                "approval_required",
                "bounded_autopublish",
            },
            {
                "mode": config.get("mode"),
                "schedule_enabled": config.get("schedule", {}).get("enabled"),
            },
        )
        controller = AutonomyController(service, config=config)
        autonomy_status = controller.status()
        record(
            "provider_adapters",
            (repo_root / "newsroom" / "providers" / "openai_responses.py").is_file()
            and (repo_root / "newsroom" / "providers" / "gemini_interactions.py").is_file(),
            {
                "available": autonomy_status["providers"]["available"],
                "configuration_required": not bool(
                    autonomy_status["providers"]["available"]
                ),
            },
        )
    except Exception as exc:
        record("autonomy_config", False, str(exc))

    index_path = repo_root / "web" / "index.html"
    app_path = repo_root / "web" / "assets" / "app.js"
    index = index_path.read_text("utf-8") if index_path.is_file() else ""
    app = app_path.read_text("utf-8") if app_path.is_file() else ""
    record(
        "public_integration",
        "data/newsroom-articles.js" in index and "window.RTFC_NEWSROOM_ARTICLES" in app,
        "newsroom article store is loaded and joined",
    )
    release_manager = repo_root / "tools" / "release_manager" / "release_manager.py"
    record("release_manager", release_manager.is_file(), str(release_manager))
    record("repository", bool(service.repository_status().get("ok")), service.repository_status())
    record(
        "scheduler",
        True,
        schedule_status(),
    )

    ok = all(item["ok"] for item in checks)
    return ok, {"ok": ok, "platform_version": PLATFORM_VERSION, "checks": checks}


def _json(value: Any) -> None:
    print(json.dumps(value, indent=2, ensure_ascii=False))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="RTFCLMGZN Newsroom Platform CLI")
    parser.add_argument("--project", type=Path)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("init")
    sub.add_parser("status")
    sub.add_parser("doctor")
    sub.add_parser("demo")
    sub.add_parser("configure")
    sub.add_parser("autonomy-status")

    serve_parser = sub.add_parser("serve")
    serve_parser.add_argument("--port", type=int, default=8787)

    cycle = sub.add_parser("run-cycle")
    cycle.add_argument("--scheduled", action="store_true")
    cycle.add_argument(
        "--allow-publish-if-authorized",
        dest="allow_publish",
        action="store_true",
        help=(
            "Permit execution only when bounded-autopublish configuration, exact-version "
            "policy, and owner preauthorization all independently pass"
        ),
    )
    cycle.add_argument(
        "--allow-publish",
        dest="allow_publish",
        action="store_true",
        help=argparse.SUPPRESS,
    )
    cycle.add_argument("--force", action="store_true")
    cycle.add_argument("--dry-run", action="store_true")

    dispatch = sub.add_parser("dispatch")
    dispatch.add_argument("--limit", type=int, default=10)

    schedule = sub.add_parser("enable-schedule")
    schedule.add_argument("--interval", type=int)

    disable = sub.add_parser("disable-schedule")
    disable.add_argument("--delete", action="store_true")

    args = parser.parse_args(argv)
    try:
        repo_root = (
            args.project.expanduser().resolve()
            if args.project
            else find_repo_root(Path(__file__))
        )
        if args.command == "serve":
            return serve(repo_root, args.port)
        service = NewsroomService(repo_root)

        if args.command == "init":
            _json(service.health())
        elif args.command == "status":
            controller = AutonomyController(service)
            _json(
                {
                    "health": service.health(),
                    "stats": service.stats(),
                    "repository": service.repository_status(),
                    "autonomy": controller.status(),
                }
            )
        elif args.command == "doctor":
            ok, result = doctor(repo_root, service)
            _json(result)
            return 0 if ok else 1
        elif args.command == "demo":
            _json(service.create_demo())
        elif args.command == "configure":
            result = run_configuration_wizard()
            config = load_config()
            if config["schedule"].get("enabled"):
                try:
                    result["scheduler"] = enable_schedule(
                        repo_root, int(config["schedule"]["interval_minutes"])
                    )
                except SchedulerError:
                    # Do not leave the machine-local configuration claiming a
                    # schedule is active when Windows rejected task creation.
                    config["schedule"]["enabled"] = False
                    save_user_config(config)
                    raise
            else:
                result["scheduler"] = schedule_status()
            _json(result)
        elif args.command == "autonomy-status":
            _json(AutonomyController(service).status())
        elif args.command == "run-cycle":
            controller = AutonomyController(service)
            result = controller.run_cycle(
                scheduled=bool(args.scheduled),
                allow_publish=bool(args.allow_publish),
                force=bool(args.force),
                dry_run=bool(args.dry_run),
                log=lambda message: print(message, file=sys.stderr, flush=True),
            )
            _json(result)
        elif args.command == "dispatch":
            _json(AutonomyController(service).dispatch(limit=args.limit))
        elif args.command == "enable-schedule":
            config = load_config()
            interval = args.interval or int(config["schedule"]["interval_minutes"])
            scheduler_result = enable_schedule(repo_root, interval)
            config["schedule"]["enabled"] = True
            config["schedule"]["interval_minutes"] = int(interval)
            save_user_config(config)
            _json(scheduler_result)
        elif args.command == "disable-schedule":
            scheduler_result = disable_schedule(delete=bool(args.delete))
            config = load_config()
            config["schedule"]["enabled"] = False
            save_user_config(config)
            _json(scheduler_result)
        return 0
    except (
        NewsroomError,
        AutonomyError,
        ConfigError,
        WizardError,
        SchedulerError,
        VaultError,
    ) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
