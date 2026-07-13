from __future__ import annotations

import json
import random
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any


class _NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Reject redirects so credentials never cross an unexpected origin."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):  # type: ignore[override]
        return None


_NO_REDIRECT_OPENER = urllib.request.build_opener(_NoRedirectHandler())
MAX_RESPONSE_BYTES = 25 * 1024 * 1024


def _retry_after_seconds(value: str | None) -> float | None:
    if not value:
        return None
    text = value.strip()
    try:
        return max(0.0, min(120.0, float(text)))
    except ValueError:
        pass
    try:
        parsed = parsedate_to_datetime(text)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        seconds = (parsed.astimezone(timezone.utc) - datetime.now(timezone.utc)).total_seconds()
        return max(0.0, min(120.0, seconds))
    except (TypeError, ValueError, OverflowError):
        return None


class ProviderHTTPError(RuntimeError):
    def __init__(self, message: str, *, status: int | None = None, retryable: bool = False):
        super().__init__(message)
        self.status = status
        self.retryable = retryable


@dataclass(frozen=True)
class HTTPResponse:
    status: int
    headers: dict[str, str]
    json: dict[str, Any]


def _redact_error_body(body: str) -> str:
    body = body.strip().replace("\r", " ").replace("\n", " ")
    if len(body) > 1200:
        body = body[:1200] + "…"
    return body


def post_json(
    url: str,
    *,
    headers: dict[str, str],
    payload: dict[str, Any],
    timeout_seconds: int,
    max_retries: int,
) -> HTTPResponse:
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request_headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "RTFCLMGZN-Newsroom/0.3",
        **headers,
    }
    last_error: Exception | None = None
    for attempt in range(max_retries + 1):
        retry_after: float | None = None
        request = urllib.request.Request(
            url, data=data, method="POST", headers=request_headers
        )
        try:
            with _NO_REDIRECT_OPENER.open(request, timeout=timeout_seconds) as response:
                body = response.read(MAX_RESPONSE_BYTES + 1)
                if len(body) > MAX_RESPONSE_BYTES:
                    raise ProviderHTTPError(
                        "Provider response exceeded the 25 MiB safety limit",
                        status=response.status,
                    )
                try:
                    value = json.loads(body.decode("utf-8"))
                except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                    raise ProviderHTTPError(
                        "Provider returned invalid JSON", status=response.status
                    ) from exc
                if not isinstance(value, dict):
                    raise ProviderHTTPError(
                        "Provider returned a non-object JSON response", status=response.status
                    )
                return HTTPResponse(
                    status=response.status,
                    headers={key.lower(): value for key, value in response.headers.items()},
                    json=value,
                )
        except urllib.error.HTTPError as exc:
            try:
                body = exc.read(16 * 1024).decode("utf-8", errors="replace")
            except Exception:
                body = ""
            retryable = exc.code in {408, 409, 425, 429, 500, 502, 503, 504}
            retry_after = _retry_after_seconds(exc.headers.get("Retry-After"))
            message = f"Provider HTTP {exc.code}"
            if body:
                message += ": " + _redact_error_body(body)
            error = ProviderHTTPError(message, status=exc.code, retryable=retryable)
            last_error = error
            if not retryable or attempt >= max_retries:
                raise error from exc
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            last_error = exc
            if attempt >= max_retries:
                raise ProviderHTTPError(
                    f"Provider network request failed: {exc}", retryable=True
                ) from exc
        exponential = min(30.0, (2**attempt) + random.random())
        delay = max(exponential, retry_after or 0.0)
        time.sleep(delay)
    raise ProviderHTTPError(f"Provider request failed: {last_error}", retryable=True)
