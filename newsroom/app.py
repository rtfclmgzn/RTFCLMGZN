from __future__ import annotations

import argparse
import json
import mimetypes
import os
import secrets
import socket
import subprocess
import sys
import threading
import traceback
import urllib.parse
import webbrowser
from dataclasses import dataclass, field
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

from .autonomy.controller import AutonomyController, AutonomyError
from .core.package_importer import MAX_PACKAGE_BYTES
from .core.service import NewsroomError, NewsroomService

APP_NAME = "RTFCLMGZN Newsroom Core"
APP_VERSION = "0.3.2"
DEFAULT_PORT = 8787


def find_repo_root(start: Path) -> Path:
    configured = os.environ.get("RTFCLMGZN_PROJECT")
    if configured:
        candidate = Path(configured).expanduser().resolve()
        if (candidate / ".git").exists() and (candidate / "web" / "index.html").exists():
            return candidate
        raise NewsroomError(f"RTFCLMGZN_PROJECT is not a valid repository: {candidate}")
    for parent in [start.resolve(), *start.resolve().parents]:
        if (parent / ".git").exists() and (parent / "web" / "index.html").exists():
            return parent
    default = Path(r"D:\BUSINESS\RTFCLMGZN")
    if (default / ".git").exists() and (default / "web" / "index.html").exists():
        return default.resolve()
    raise NewsroomError(
        "Could not locate the RTFCLMGZN repository. Set RTFCLMGZN_PROJECT or run from inside the project."
    )


def choose_port(preferred: int) -> int:
    for port in range(preferred, preferred + 50):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            try:
                sock.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise NewsroomError("No available local port was found for Newsroom Core")


@dataclass
class Task:
    id: str
    kind: str
    story_id: str
    status: str = "running"
    logs: list[str] = field(default_factory=list)
    result: dict[str, Any] | None = None
    error: str | None = None
    lock: threading.Lock = field(default_factory=threading.Lock)

    def append(self, message: str) -> None:
        with self.lock:
            self.logs.append(message)
            if len(self.logs) > 500:
                self.logs = self.logs[-500:]

    def payload(self) -> dict[str, Any]:
        with self.lock:
            return {
                "id": self.id,
                "kind": self.kind,
                "story_id": self.story_id,
                "status": self.status,
                "logs": list(self.logs),
                "result": self.result,
                "error": self.error,
            }


class TaskStore:
    def __init__(self) -> None:
        self.tasks: dict[str, Task] = {}
        self.lock = threading.Lock()

    def create(self, kind: str, story_id: str) -> Task:
        task = Task(secrets.token_hex(12), kind, story_id)
        with self.lock:
            self.tasks[task.id] = task
        return task

    def get(self, task_id: str) -> Task | None:
        with self.lock:
            return self.tasks.get(task_id)


class NewsroomServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(
        self,
        address: tuple[str, int],
        handler: type[BaseHTTPRequestHandler],
        service: NewsroomService,
        token: str,
        ui_root: Path,
    ) -> None:
        super().__init__(address, handler)
        self.service = service
        self.token = token
        self.ui_root = ui_root
        self.tasks = TaskStore()


class Handler(BaseHTTPRequestHandler):
    server: NewsroomServer
    protocol_version = "HTTP/1.1"

    def log_message(self, format: str, *args: Any) -> None:
        return

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path.startswith("/api/"):
            if not self._authorized(parsed):
                return
            self._handle_api_get(parsed)
            return
        self._serve_static(parsed.path)

    def do_POST(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        if not parsed.path.startswith("/api/"):
            self._json_error(HTTPStatus.NOT_FOUND, "Not found")
            return
        if not self._authorized(parsed):
            return
        try:
            self._handle_api_post(parsed)
        except (NewsroomError, AutonomyError) as exc:
            self._json_error(HTTPStatus.BAD_REQUEST, str(exc))
        except Exception as exc:
            traceback.print_exc()
            self._json_error(HTTPStatus.INTERNAL_SERVER_ERROR, f"Unexpected error: {exc}")

    def _authorized(self, parsed: urllib.parse.ParseResult) -> bool:
        query_token = urllib.parse.parse_qs(parsed.query).get("token", [""])[0]
        header_token = self.headers.get("X-RTFCL-Token", "")
        if secrets.compare_digest(query_token or header_token, self.server.token):
            return True
        self._json_error(HTTPStatus.FORBIDDEN, "Invalid local session token")
        return False

    def _handle_api_get(self, parsed: urllib.parse.ParseResult) -> None:
        service = self.server.service
        path = parsed.path.rstrip("/")
        try:
            if path == "/api/health":
                self._json(service.health())
            elif path == "/api/stats":
                self._json(service.stats())
            elif path == "/api/registry":
                self._json(service.registry_payload())
            elif path == "/api/repository":
                self._json(service.repository_status())
            elif path == "/api/stories":
                self._json({"stories": service.list_stories()})
            elif path == "/api/events":
                self._json({"events": service.events(limit=200)})
            elif path == "/api/autonomy":
                self._json(AutonomyController(service).status())
            elif path == "/api/autonomy/cycles":
                controller = AutonomyController(service)
                self._json({"cycles": controller.repository.cycle_history(100)})
            elif path == "/api/distribution":
                controller = AutonomyController(service)
                self._json(
                    {
                        "counts": controller.repository.distribution_counts(),
                        "items": controller.repository.distribution_items(limit=200),
                    }
                )
            elif path.startswith("/api/stories/"):
                story_id = path.split("/")[3]
                self._json(service.get_story(story_id))
            elif path.startswith("/api/tasks/"):
                task_id = path.split("/")[3]
                task = self.server.tasks.get(task_id)
                if task is None:
                    self._json_error(HTTPStatus.NOT_FOUND, "Unknown task")
                else:
                    self._json(task.payload())
            else:
                self._json_error(HTTPStatus.NOT_FOUND, "Unknown API route")
        except (NewsroomError, AutonomyError) as exc:
            self._json_error(HTTPStatus.BAD_REQUEST, str(exc))
        except Exception as exc:
            traceback.print_exc()
            self._json_error(HTTPStatus.INTERNAL_SERVER_ERROR, f"Unexpected error: {exc}")

    def _handle_api_post(self, parsed: urllib.parse.ParseResult) -> None:
        service = self.server.service
        path = parsed.path.rstrip("/")
        if path == "/api/stories":
            self._json(service.create_story(self._read_json()), status=HTTPStatus.CREATED)
            return
        if path == "/api/demo":
            self._json(service.create_demo(), status=HTTPStatus.CREATED)
            return
        if path == "/api/import":
            length = self._content_length(MAX_PACKAGE_BYTES)
            filename = self.headers.get("X-Filename", "story-package.zip")
            data = self.rfile.read(length)
            self._json(service.import_package(data, filename), status=HTTPStatus.CREATED)
            return
        if path == "/api/autonomy/run":
            payload = self._read_json()
            allow_publish = bool(payload.get("allow_publish"))
            if allow_publish and str(payload.get("confirm") or "") != "RUN BOUNDED AUTOPILOT":
                raise NewsroomError(
                    "Publication-capable cycle confirmation did not match RUN BOUNDED AUTOPILOT"
                )
            task = self.server.tasks.create("autonomy-cycle", "")
            thread = threading.Thread(
                target=self._run_autonomy_task,
                args=(
                    task,
                    allow_publish,
                    bool(payload.get("dry_run")),
                    bool(payload.get("force")),
                ),
                daemon=True,
            )
            thread.start()
            self._json({"task_id": task.id, "status": task.status}, status=HTTPStatus.ACCEPTED)
            return
        if path == "/api/autonomy/dispatch":
            payload = self._read_json()
            limit = max(1, min(int(payload.get("limit") or 10), 100))
            self._json(AutonomyController(service).dispatch(limit=limit))
            return
        if path == "/api/autonomy/configure":
            launcher = service.repo_root / "CONFIGURE_RTFCLMGZN_AUTOPILOT.bat"
            if os.name != "nt" or not launcher.is_file():
                raise NewsroomError("The local Windows configuration launcher is unavailable")
            os.startfile(str(launcher))  # type: ignore[attr-defined]
            self._json({"ok": True, "message": "Autopilot configuration opened"})
            return
        if path == "/api/tools/release-manager":
            launcher = service.repo_root / "RTFCLMGZN_RELEASE_MANAGER.bat"
            script = service.repo_root / "tools" / "release_manager" / "release_manager.py"
            if os.name == "nt" and launcher.is_file():
                os.startfile(str(launcher))  # type: ignore[attr-defined]
            elif script.is_file():
                subprocess.Popen(
                    [sys.executable, str(script), "--project", str(service.repo_root)],
                    cwd=service.repo_root,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    start_new_session=True,
                )
            else:
                raise NewsroomError("Editorial Release Manager is not installed")
            self._json({"ok": True, "message": "Release Manager launched"})
            return
        if not path.startswith("/api/stories/"):
            self._json_error(HTTPStatus.NOT_FOUND, "Unknown API route")
            return
        parts = path.split("/")
        if len(parts) < 5:
            self._json_error(HTTPStatus.NOT_FOUND, "Missing story action")
            return
        story_id = parts[3]
        action = parts[4]
        if action == "sources":
            self._json(service.add_source(story_id, self._read_json()))
        elif action == "run-fixture":
            self._json(service.run_next_fixture(story_id))
        elif action == "approve":
            payload = self._read_json()
            self._json(
                service.approve_story(
                    story_id,
                    str(payload.get("approver") or "Owner"),
                    str(payload.get("note") or ""),
                )
            )
        elif action == "reject":
            payload = self._read_json()
            self._json(
                service.reject_story(
                    story_id,
                    str(payload.get("approver") or "Owner"),
                    str(payload.get("note") or ""),
                )
            )
        elif action == "package":
            self._json(service.package_story(story_id))
        elif action == "publish":
            payload = self._read_json()
            story = service.get_story(story_id)
            expected_slug = str(payload.get("confirm_slug") or "")
            if expected_slug != story["slug"]:
                raise NewsroomError("Publication confirmation did not match the story slug")
            task = self.server.tasks.create("publish", story_id)
            thread = threading.Thread(
                target=self._run_publish_task,
                args=(task,),
                daemon=True,
            )
            thread.start()
            self._json({"task_id": task.id, "status": task.status}, status=HTTPStatus.ACCEPTED)
        else:
            self._json_error(HTTPStatus.NOT_FOUND, "Unknown story action")

    def _run_autonomy_task(
        self,
        task: Task,
        allow_publish: bool,
        dry_run: bool,
        force: bool,
    ) -> None:
        try:
            task.append("Starting deterministic newsroom cycle.")
            result = AutonomyController(self.server.service).run_cycle(
                allow_publish=allow_publish,
                dry_run=dry_run,
                force=force,
                log=task.append,
            )
            with task.lock:
                task.result = result
                task.status = "succeeded"
        except Exception as exc:
            task.append(str(exc))
            with task.lock:
                task.error = str(exc)
                task.status = "failed"

    def _run_publish_task(self, task: Task) -> None:
        try:
            task.append("Owner confirmation accepted. Beginning governed release.")
            result = self.server.service.publish_story(task.story_id, task.append)
            with task.lock:
                task.result = result
                task.status = "succeeded"
        except Exception as exc:
            task.append(str(exc))
            with task.lock:
                task.error = str(exc)
                task.status = "failed"

    def _read_json(self) -> dict[str, Any]:
        length = self._content_length(2 * 1024 * 1024)
        raw = self.rfile.read(length)
        if not raw:
            return {}
        try:
            value = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise NewsroomError(f"Request body must be valid JSON: {exc}") from exc
        if not isinstance(value, dict):
            raise NewsroomError("Request JSON must be an object")
        return value

    def _content_length(self, maximum: int) -> int:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError as exc:
            raise NewsroomError("Invalid Content-Length") from exc
        if length < 0 or length > maximum:
            raise NewsroomError(f"Request body exceeds the {maximum // (1024 * 1024)} MB limit")
        return length

    def _serve_static(self, path: str) -> None:
        rel = "index.html" if path in {"", "/"} else path.lstrip("/")
        candidate = (self.server.ui_root / rel).resolve()
        if self.server.ui_root.resolve() not in [candidate, *candidate.parents] or not candidate.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        data = candidate.read_bytes()
        mime = mimetypes.guess_type(candidate.name)[0] or "application/octet-stream"
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", f"{mime}; charset=utf-8" if mime.startswith("text/") else mime)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",
        )
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.end_headers()
        self.wfile.write(data)

    def _json(self, value: Any, *, status: HTTPStatus = HTTPStatus.OK) -> None:
        data = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(data)

    def _json_error(self, status: HTTPStatus, message: str) -> None:
        self._json({"ok": False, "error": message}, status=status)


def serve(repo_root: Path, port: int, *, open_browser: bool = True) -> int:
    service = NewsroomService(repo_root)
    ui_root = Path(__file__).resolve().parent / "ui"
    if not (ui_root / "index.html").is_file():
        raise NewsroomError(f"Newsroom UI is missing from {ui_root}")
    token = secrets.token_urlsafe(32)
    selected_port = choose_port(port)
    server = NewsroomServer(("127.0.0.1", selected_port), Handler, service, token, ui_root)
    url = f"http://127.0.0.1:{selected_port}/?token={urllib.parse.quote(token)}"
    print(f"{APP_NAME} {APP_VERSION}")
    print(f"Project: {repo_root}")
    print(f"Private local Studio: {url}")
    print("Keep this window open. Press Ctrl+C to stop.")
    if open_browser:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever(poll_interval=0.25)
    except KeyboardInterrupt:
        print("\nNewsroom Core stopped.")
    finally:
        server.server_close()
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=APP_NAME)
    parser.add_argument("--project", type=Path)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--no-browser", action="store_true")
    parser.add_argument("--version", action="version", version=APP_VERSION)
    args = parser.parse_args(argv)
    try:
        repo_root = args.project.expanduser().resolve() if args.project else find_repo_root(Path(__file__))
        return serve(repo_root, args.port, open_browser=not args.no_browser)
    except NewsroomError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
