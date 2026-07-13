from __future__ import annotations

import os
import subprocess
from pathlib import Path
from typing import Any


class SchedulerError(RuntimeError):
    pass


TASK_NAME = "RTFCLMGZN Autopilot"


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


def enable_schedule(repo_root: Path, interval_minutes: int) -> dict[str, Any]:
    _require_windows()
    interval = max(30, min(int(interval_minutes), 1439))
    runner = (repo_root.resolve() / "RTFCLMGZN_AUTOPILOT_TASK.bat")
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
            TASK_NAME,
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
        "task_name": TASK_NAME,
        "interval_minutes": interval,
        "runner": str(runner),
        "detail": result.stdout.strip(),
    }


def disable_schedule(*, delete: bool = False) -> dict[str, Any]:
    _require_windows()
    action = "/Delete" if delete else "/Change"
    args = ["schtasks", action, "/TN", TASK_NAME]
    if delete:
        args.append("/F")
    else:
        args.append("/Disable")
    result = _run(args, check=False)
    if result.returncode != 0:
        text = (result.stderr or result.stdout or "").lower()
        if "cannot find" in text or "does not exist" in text:
            return {"ok": True, "task_name": TASK_NAME, "present": False}
        raise SchedulerError((result.stderr or result.stdout or "unknown error").strip())
    return {
        "ok": True,
        "task_name": TASK_NAME,
        "present": not delete,
        "disabled": not delete,
        "deleted": delete,
        "detail": result.stdout.strip(),
    }


def schedule_status() -> dict[str, Any]:
    if os.name != "nt":
        return {
            "ok": False,
            "supported": False,
            "task_name": TASK_NAME,
            "detail": "Windows Task Scheduler is unavailable on this operating system",
        }
    result = _run(
        ["schtasks", "/Query", "/TN", TASK_NAME, "/FO", "LIST", "/V"],
        check=False,
    )
    if result.returncode != 0:
        return {
            "ok": True,
            "supported": True,
            "present": False,
            "task_name": TASK_NAME,
        }
    return {
        "ok": True,
        "supported": True,
        "present": True,
        "task_name": TASK_NAME,
        "detail": result.stdout.strip(),
    }
