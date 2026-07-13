from __future__ import annotations

import json
import os
import socket
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from ..core.contracts import utc_now


class CycleLockError(RuntimeError):
    """Raised when another valid autonomy cycle already owns the lock."""


@dataclass(frozen=True)
class LockOwner:
    pid: int
    host: str
    created_at: str
    created_unix: float
    command: str


class CycleFileLock:
    """Small cross-platform, crash-recoverable exclusive lock.

    The lock is created atomically with O_EXCL. A stale lock may be reclaimed only
    after ``stale_after_seconds`` and, when it belongs to this host, after its PID
    can no longer be observed. This avoids overlapping scheduled and manual runs.
    """

    def __init__(
        self,
        path: Path,
        *,
        stale_after_seconds: int = 6 * 60 * 60,
        command: str = "autonomy-cycle",
    ) -> None:
        self.path = path.resolve()
        self.stale_after_seconds = max(300, int(stale_after_seconds))
        self.command = command
        self._owned = False

    @staticmethod
    def _pid_alive(pid: int) -> bool:
        if pid <= 0:
            return False
        if os.name == "nt":
            try:
                # os.kill(pid, 0) is supported on modern Python/Windows and does
                # not send a signal; it tests process existence/permission.
                os.kill(pid, 0)
                return True
            except OSError:
                return False
        try:
            os.kill(pid, 0)
            return True
        except OSError:
            return False

    def _read_existing(self) -> dict[str, Any] | None:
        try:
            value = json.loads(self.path.read_text("utf-8"))
        except (FileNotFoundError, UnicodeDecodeError, json.JSONDecodeError, OSError):
            return None
        return value if isinstance(value, dict) else None

    def _is_stale(self, value: dict[str, Any] | None) -> bool:
        if value is None:
            try:
                age = time.time() - self.path.stat().st_mtime
            except OSError:
                return False
            return age >= self.stale_after_seconds
        created = value.get("created_unix")
        try:
            age = time.time() - float(created)
        except (TypeError, ValueError):
            age = self.stale_after_seconds + 1
        if age < self.stale_after_seconds:
            return False
        host = str(value.get("host") or "")
        pid = int(value.get("pid") or 0)
        if host and host == socket.gethostname() and self._pid_alive(pid):
            return False
        return True

    def acquire(self) -> "CycleFileLock":
        self.path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "pid": os.getpid(),
            "host": socket.gethostname(),
            "created_at": utc_now(),
            "created_unix": time.time(),
            "command": self.command,
        }
        for attempt in range(2):
            try:
                fd = os.open(
                    self.path,
                    os.O_CREAT | os.O_EXCL | os.O_WRONLY,
                    0o600,
                )
            except FileExistsError:
                existing = self._read_existing()
                if attempt == 0 and self._is_stale(existing):
                    try:
                        self.path.unlink()
                    except OSError as exc:
                        raise CycleLockError(
                            f"A stale autonomy lock could not be removed: {exc}"
                        ) from exc
                    continue
                detail = ""
                if existing:
                    detail = (
                        f" (PID {existing.get('pid')}, host {existing.get('host')}, "
                        f"since {existing.get('created_at')})"
                    )
                raise CycleLockError(
                    "Another newsroom autonomy cycle is already running" + detail
                )
            else:
                try:
                    os.write(fd, (json.dumps(payload, indent=2) + "\n").encode("utf-8"))
                    try:
                        os.fsync(fd)
                    except OSError:
                        pass
                finally:
                    os.close(fd)
                self._owned = True
                return self
        raise CycleLockError("Could not acquire autonomy cycle lock")

    def release(self) -> None:
        if not self._owned:
            return
        try:
            existing = self._read_existing()
            if existing and int(existing.get("pid") or -1) != os.getpid():
                # A replacement lock is not ours to remove.
                return
            self.path.unlink(missing_ok=True)
        finally:
            self._owned = False

    def __enter__(self) -> "CycleFileLock":
        return self.acquire()

    def __exit__(self, exc_type: object, exc: object, traceback: object) -> None:
        self.release()
