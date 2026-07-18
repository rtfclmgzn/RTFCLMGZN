from __future__ import annotations

import json
import re
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable

from .budget import BudgetError, BudgetGuard
from .config import load_config
from .costing import estimate_cost_usd
from .repository import AutonomyRepository
from ..core.database import Database
from ..providers.openai_responses import OpenAIResponsesProvider
from ..providers.structured import StructuredOutputError
from ..security.vault import CredentialVault, default_vault_path

BUZZ_FILE = Path("web/data/buzz.js")
USAGE_FILE = Path("web/data/usage-log-current.js")
STATE_FILE_NAME = "buzz-next-id.json"
RETIRE_AFTER_DAYS = 7
MAX_ITEMS = 48
# A cushion above the ~$0.09 observed real cost of a cycle -- checked against the
# SAME shared daily/monthly ledger the main newsroom pipeline uses, so buzz can
# never push combined spend over the owner's configured cap.
ESTIMATED_CYCLE_COST_USD = 0.15

SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "source_name": {"type": "string"},
                    "source_handle": {"type": "string"},
                    "platform": {"type": "string", "enum": ["x", "web"]},
                    "kind": {"type": "string", "enum": ["lab", "person", "news", "gov"]},
                    "text": {"type": "string"},
                    "why": {"type": "string"},
                    "heat": {"type": "integer"},
                    "topics": {"type": "array", "items": {"type": "string"}},
                    "url": {"type": "string"},
                    "date": {"type": "string"},
                },
                "required": [
                    "source_name",
                    "source_handle",
                    "platform",
                    "kind",
                    "text",
                    "why",
                    "heat",
                    "topics",
                    "url",
                    "date",
                ],
            },
        }
    },
    "required": ["items"],
}


class BuzzCycleError(RuntimeError):
    pass


def _find_matching_bracket(text: str, open_idx: int) -> int:
    open_ch = text[open_idx]
    close_ch = {"[": "]", "{": "}"}[open_ch]
    depth = 0
    in_string = False
    escape = False
    i = open_idx
    while i < len(text):
        ch = text[i]
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
        elif ch == '"':
            in_string = True
        elif ch == open_ch:
            depth += 1
        elif ch == close_ch:
            depth -= 1
            if depth == 0:
                return i
        i += 1
    raise BuzzCycleError("Unbalanced brackets while parsing a JS data file")


def _split_top_level_objects(body: str) -> list[str]:
    entries: list[str] = []
    depth = 0
    start: int | None = None
    in_string = False
    escape = False
    for i, ch in enumerate(body):
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
            continue
        if ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start is not None:
                entries.append(body[start : i + 1])
                start = None
    return entries


def _extract_array(text: str, marker_pattern: str) -> tuple[str, str, list[str]]:
    match = re.search(marker_pattern, text)
    if not match:
        raise BuzzCycleError(f"Could not locate an array matching {marker_pattern!r}")
    open_idx = match.end() - 1
    close_idx = _find_matching_bracket(text, open_idx)
    prefix = text[: open_idx + 1]
    body = text[open_idx + 1 : close_idx]
    suffix = text[close_idx:]
    return prefix, suffix, _split_top_level_objects(body)


def _esc(value: Any) -> str:
    return str(value).replace("\\", "\\\\").replace('"', '\\"')


def _format_entry(entry_id: str, item: dict[str, Any]) -> str:
    topics = ",".join(f'"{_esc(t)}"' for t in item.get("topics") or [])
    return (
        f'{{ id:"{entry_id}", date:"{_esc(item["date"])}",\n'
        f'    source:{{ name:"{_esc(item["source_name"])}", handle:"{_esc(item["source_handle"])}", '
        f'platform:"{_esc(item["platform"])}", kind:"{_esc(item["kind"])}" }},\n'
        f'    text:"{_esc(item["text"])}",\n'
        f'    why:"{_esc(item["why"])}",\n'
        f'    heat:{int(item["heat"])}, topics:[{topics}],\n'
        f'    url:"{_esc(item["url"])}" }}'
    )


def _entry_date(entry: str) -> str:
    match = re.search(r'date:"(\d{4}-\d{2}-\d{2})"', entry)
    return match.group(1) if match else "0000-00-00"


def _state_path() -> Path:
    return default_vault_path().parent / STATE_FILE_NAME


def _append_usage_row(
    repo_root: Path, *, model: str, usage: dict[str, Any], added: int, retired: int, ts: datetime
) -> None:
    path = repo_root / USAGE_FILE
    text = path.read_text(encoding="utf-8")
    prefix, suffix, rows = _extract_array(text, r"var rows\s*=\s*\[")
    ids = [int(m) for m in re.findall(r'id:"u-(\d+)"', text)]
    next_num = (max(ids) + 1) if ids else 1
    row_id = f"u-{next_num:04d}"
    description = f"Buzz Desk 2-hour refresh: added {added} card(s), retired {retired} stale card(s)"
    row = (
        f'{{ id:"{row_id}", ts:"{ts.strftime("%Y-%m-%dT%H:%M:%SZ")}", article_id:"system", '
        f'agent:"buzz-desk", task_type:"buzz-refresh", model:"{model}", '
        f'description:"{_esc(description)}", input_tokens:{int(usage.get("input_tokens") or 0)}, '
        f'output_tokens:{int(usage.get("output_tokens") or 0)}, measured:"metered" }}'
    )
    rows.append(row)
    new_body = "\n" + ",\n".join("    " + r for r in rows) + "\n  "
    path.write_text(prefix + new_body + suffix, encoding="utf-8")


def _git_commit_and_push(repo_root: Path, *, added: int, retired: int, log: Callable[[str], None]) -> None:
    def run(args: list[str]) -> str:
        result = subprocess.run(
            ["git", *args],
            cwd=repo_root,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=60,
        )
        if result.returncode != 0:
            raise BuzzCycleError(f"git {' '.join(args)} failed: {result.stderr.strip()}")
        return result.stdout

    run(["add", str(BUZZ_FILE), str(USAGE_FILE)])
    status = run(["status", "--porcelain", "--", str(BUZZ_FILE), str(USAGE_FILE)])
    if not status.strip():
        log("Buzz cycle: nothing staged, skipping commit")
        return
    message = f"Buzz Desk: +{added} fresh card(s), -{retired} retired (automated 2-hour refresh)"
    run(["commit", "-m", message])
    run(["push", "origin", "main"])
    log("Buzz cycle: committed and pushed")


def run_buzz_cycle(
    repo_root: Path,
    *,
    dry_run: bool = False,
    push: bool = True,
    log: Callable[[str], None] = lambda message: None,
) -> dict[str, Any]:
    config = load_config()
    vault = CredentialVault()
    if not vault.get("openai_api_key"):
        raise BuzzCycleError("OpenAI is not configured. Run the RTFCLMGZN configuration wizard.")

    buzz_path = repo_root / BUZZ_FILE
    text = buzz_path.read_text(encoding="utf-8")
    prefix, suffix, raw_entries = _extract_array(text, r"window\.RTFC_BUZZ\s*=\s*\[")

    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(days=RETIRE_AFTER_DAYS)).date()

    kept: list[str] = []
    retired = 0
    existing_urls: set[str] = set()
    max_num = 0
    for entry in raw_entries:
        id_match = re.search(r'id:"bz-(\d+)"', entry)
        url_match = re.search(r'url:"([^"]+)"', entry)
        if id_match:
            max_num = max(max_num, int(id_match.group(1)))
        if url_match:
            existing_urls.add(url_match.group(1))
        date_str = _entry_date(entry)
        try:
            entry_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            entry_date = None
        if entry_date is not None and entry_date < cutoff:
            retired += 1
            continue
        kept.append(entry)

    state_path = _state_path()
    next_id = max_num + 1
    if state_path.is_file():
        try:
            stored = json.loads(state_path.read_text("utf-8")).get("next")
            if isinstance(stored, int) and stored > next_id:
                next_id = stored
        except (json.JSONDecodeError, OSError):
            pass

    provider_cfg = config["providers"]["openai"]
    model = provider_cfg["models"]["utility"]
    reasoning_effort = provider_cfg.get("reasoning_effort", {}).get("utility")
    max_output_tokens = provider_cfg.get("max_output_tokens", {}).get("utility")

    provider = OpenAIResponsesProvider(provider_cfg, vault=vault)
    instructions = (
        "You are the RTFCLMGZN Buzz Desk. Curate real, currently-public AI-industry social "
        "signal -- launches, lab statements, executive remarks, notable data points -- from "
        "the last few hours. NEVER invent a quote, a post, a number, or a URL: every item's "
        "`url` must be a real, currently reachable link to the original post or a news report "
        "of it, found via web search. `text` paraphrases or briefly quotes only what that "
        "source verifiably said or did. If nothing genuinely new turned up, return an empty "
        "items list rather than padding with stale or fabricated material."
    )
    existing_summary = "; ".join(sorted(existing_urls)) or "none"
    prompt = (
        f"It is currently {now.strftime('%Y-%m-%d %H:%M UTC')}. Search for 3-6 genuinely fresh "
        "AI-industry social/news signal items from roughly the last 6 hours (a bit older is fine "
        "only if nothing newer exists). Do not repeat any of these already-covered URLs: "
        f"{existing_summary}. For each item return source_name, source_handle (the handle or "
        "outlet name, e.g. '@OpenAI' or 'Reuters'), platform ('x' or 'web'), kind ('lab', "
        "'person', 'news', or 'gov'), text (one or two sentences, may use **bold** or "
        "==highlight== markup on the load-bearing phrase), why (one sentence on why this is "
        "worth the feed's attention), heat (0-100, your judgment of how loud this is today), "
        "topics (2-4 short lowercase tags), url (the real source link), and date "
        "(YYYY-MM-DD, today or very recent)."
    )

    database = Database(repo_root / "newsroom" / "data" / "newsroom.db")
    repository = AutonomyRepository(database)
    budget = BudgetGuard(repository, config["limits"])
    try:
        budget.assert_cycle_allowed(reserve_usd=ESTIMATED_CYCLE_COST_USD)
    except BudgetError as exc:
        log(f"Buzz cycle: skipped, shared daily/monthly budget is exhausted ({exc})")
        return {"ok": True, "skipped": "budget_exhausted", "reason": str(exc)}

    call_started_at = now.isoformat().replace("+00:00", "Z")
    try:
        response = provider.generate(
            model=model,
            instructions=instructions,
            prompt=prompt,
            schema_name="buzz_cards",
            schema=SCHEMA,
            use_web_search=True,
            reasoning_effort=reasoning_effort,
            max_output_tokens=max_output_tokens,
        )
    except StructuredOutputError as exc:
        raise BuzzCycleError(f"Buzz generation failed: {exc}") from exc

    raw_items = response.data.get("items") or []
    new_entries: list[str] = []
    for item in raw_items:
        url = str(item.get("url") or "").strip()
        text_value = str(item.get("text") or "").strip()
        if not url.startswith("http") or not text_value or url in existing_urls:
            continue
        entry_id = f"bz-{next_id:03d}"
        next_id += 1
        new_entries.append(_format_entry(entry_id, item))
        existing_urls.add(url)

    usage = response.usage
    cost_usd = estimate_cost_usd(config, "openai", model, usage)

    # Recorded into the SAME budget_ledger table the main pipeline reads daily/monthly
    # spend from -- this is what makes the check above a genuinely shared budget rather
    # than two systems independently believing they have the full cap to themselves.
    repository.record_provider_call(
        cycle_id=None,
        story_id=None,
        checkpoint=None,
        agent_id="buzz-desk",
        provider="openai",
        model=model,
        request_hash=str(usage.get("request_sha256") or ""),
        response_hash=response.response_id,
        status="succeeded",
        usage=usage,
        started_at=call_started_at,
        finished_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        cost_usd=cost_usd,
    )

    all_entries = kept + new_entries
    if len(all_entries) > MAX_ITEMS:
        all_entries.sort(key=_entry_date)
        overflow = len(all_entries) - MAX_ITEMS
        all_entries = all_entries[overflow:]
        retired += overflow
    else:
        all_entries.sort(key=_entry_date)

    result: dict[str, Any] = {
        "ok": True,
        "added": len(new_entries),
        "retired": retired,
        "kept": len(kept),
        "total": len(all_entries),
        "cost_usd": cost_usd,
        "model": model,
    }

    if not new_entries and retired == 0:
        result["skipped"] = "no_change"
        log("Buzz cycle: no new items, nothing to retire -- skipping write/commit")
        return result

    new_body = "\n" + ",\n".join("  " + e for e in all_entries) + "\n"
    new_text = prefix + new_body + suffix

    if dry_run:
        result["dry_run"] = True
        log(
            f"[dry-run] would write buzz.js: +{len(new_entries)} / -{retired}, "
            f"cost ${cost_usd:.4f}"
        )
        return result

    buzz_path.write_text(new_text, encoding="utf-8")
    state_path.write_text(json.dumps({"next": next_id}), encoding="utf-8")
    _append_usage_row(
        repo_root, model=model, usage=usage, added=len(new_entries), retired=retired, ts=now
    )

    if push:
        _git_commit_and_push(repo_root, added=len(new_entries), retired=retired, log=log)

    log(f"Buzz cycle: +{len(new_entries)} added, -{retired} retired, ${cost_usd:.4f}")
    return result
