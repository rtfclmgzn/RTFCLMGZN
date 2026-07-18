from __future__ import annotations

import os
import subprocess
from pathlib import Path
from typing import Any


class SchedulerError(RuntimeError):
    pass


TASK_NAME = "RTFCLMGZN Autopilot"
BUZZ_TASK_NAME = "RTFCLMGZN Buzz Desk"


def _run(args: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    try:
        result = subprocess.run(
            args,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=90,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise SchedulerError(f"Windows Task Scheduler command failed: {exc}") from exc
    if check and result.returncode != 0:
        detail = (result.stderr or result.stdout or "unknown error").strip()
        raise SchedulerError(detail)
    return result


def _require_windows() -> None:
    if os.name != "nt":
        raise SchedulerError("The bundled scheduler manager requires Windows Task Scheduler")


def _enable_minute_task(
    task_name: str, runner: Path, interval_minutes: int, *, min_interval: int, max_interval: int
) -> dict[str, Any]:
    _require_windows()
    interval = max(min_interval, min(int(interval_minutes), max_interval))
    if not runner.is_file():
        raise SchedulerError(f"Scheduled runner is missing: {runner}")
    # schtasks /TR receives one command string. cmd.exe /d /c prevents AutoRun
    # registry hooks and makes spaces in the project path safe.
    command = f'cmd.exe /d /c ""{runner}""'
    result = _run(
        [
            "schtasks",
            "/Create",
            "/F",
            "/TN",
            task_name,
            "/TR",
            command,
            "/SC",
            "MINUTE",
            "/MO",
            str(interval),
            "/RL",
            "LIMITED",
        ]
    )
    return {
        "ok": True,
        "task_name": task_name,
        "interval_minutes": interval,
        "runner": str(runner),
        "detail": result.stdout.strip(),
    }


def _disable_task(task_name: str, *, delete: bool = False) -> dict[str, Any]:
    _require_windows()
    action = "/Delete" if delete else "/Change"
    args = ["schtasks", action, "/TN", task_name]
    if delete:
        args.append("/F")
    else:
        args.append("/Disable")
    result = _run(args, check=False)
    if result.returncode != 0:
        text = (result.stderr or result.stdout or "").lower()
        if "cannot find" in text or "does not exist" in text:
            return {"ok": True, "task_name": task_name, "present": False}
        raise SchedulerError((result.stderr or result.stdout or "unknown error").strip())
    return {
        "ok": True,
        "task_name": task_name,
        "present": not delete,
        "disabled": not delete,
        "deleted": delete,
        "detail": result.stdout.strip(),
    }


def _task_status(task_name: str) -> dict[str, Any]:
    if os.name != "nt":
        return {
            "ok": False,
            "supported": False,
            "task_name": task_name,
            "detail": "Windows Task Scheduler is unavailable on this operating system",
        }
    result = _run(
        ["schtasks", "/Query", "/TN", task_name, "/FO", "LIST", "/V"],
        check=False,
    )
    if result.returncode != 0:
        return {
            "ok": True,
            "supported": True,
            "present": False,
            "task_name": task_name,
        }
    return {
        "ok": True,
        "supported": True,
        "present": True,
        "task_name": task_name,
        "detail": result.stdout.strip(),
    }


def enable_schedule(repo_root: Path, interval_minutes: int) -> dict[str, Any]:
    runner = repo_root.resolve() / "RTFCLMGZN_AUTOPILOT_TASK.bat"
    return _enable_minute_task(TASK_NAME, runner, interval_minutes, min_interval=30, max_interval=1439)


def disable_schedule(*, delete: bool = False) -> dict[str, Any]:
    return _disable_task(TASK_NAME, delete=delete)


def schedule_status() -> dict[str, Any]:
    return _task_status(TASK_NAME)


def enable_buzz_schedule(repo_root: Path, interval_minutes: int = 120) -> dict[str, Any]:
    runner = repo_root.resolve() / "RTFCLMGZN_BUZZ_TASK.bat"
    return _enable_minute_task(
        BUZZ_TASK_NAME, runner, interval_minutes, min_interval=30, max_interval=1439
    )


def disable_buzz_schedule(*, delete: bool = False) -> dict[str, Any]:
    return _disable_task(BUZZ_TASK_NAME, delete=delete)


def buzz_schedule_status() -> dict[str, Any]:
    return _task_status(BUZZ_TASK_NAME)
