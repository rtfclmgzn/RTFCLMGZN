#!/usr/bin/env python3
"""Put the agent's real error message on the run page (2026-10-17).

When anthropics/claude-code-action fails, the run page only says
"Claude execution failed: result is_error:true". The actual reason (expired
token, usage limit, API outage) sits inside the action's execution file,
which nobody reads. For three days every newsroom run failed and the only
visible signal was an inbox full of identical "Run failed" emails.

This prints the reason as a GitHub ::error annotation, so it shows in the
failure email preview and at the top of the run page. It never fails the
step itself; it only reports.

Usage: python3 report_agent_error.py <execution_file>
"""
import json
import sys


def texts(obj):
    """Yield every human-readable string that looks like an error."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in ("result", "error", "message", "text") and isinstance(v, str) and v.strip():
                yield v.strip()
            else:
                yield from texts(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from texts(v)


def main() -> int:
    path = sys.argv[1] if len(sys.argv) > 1 else ""
    if not path:
        print("::error title=Agent failed::no execution file was produced - the agent "
              "did not start. Most likely CLAUDE_CODE_OAUTH_TOKEN is missing, expired "
              "or revoked.")
        return 0
    try:
        data = json.load(open(path, encoding="utf-8", errors="replace"))
    except Exception as e:  # noqa: BLE001
        print("::error title=Agent failed::could not read execution file (%s)" % e)
        return 0

    events = data if isinstance(data, list) else [data]
    result = next((e for e in reversed(events)
                   if isinstance(e, dict) and e.get("type") == "result"), None)
    reasons = []
    if result:
        reasons += [t for t in texts({"result": result.get("result")}) if t]
        for k in ("subtype", "api_error_status", "error"):
            if result.get(k) not in (None, "", "success"):
                reasons.append("%s=%s" % (k, result.get(k)))
    # Also scan the last few events for API error text (auth / rate limit).
    for e in events[-6:]:
        for t in texts(e):
            low = t.lower()
            if any(w in low for w in ("error", "invalid", "expired", "limit",
                                      "unauthor", "credit", "overloaded", "401", "403", "429")):
                reasons.append(t)
    seen, uniq = set(), []
    for r in reasons:
        r = " ".join(r.split())[:400]
        if r not in seen:
            seen.add(r)
            uniq.append(r)
    msg = " | ".join(uniq[:4]) or "agent reported is_error with no message"
    print("::error title=Agent failed - real reason::%s" % msg)
    return 0


if __name__ == "__main__":
    sys.exit(main())
