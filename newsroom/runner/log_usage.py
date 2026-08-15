#!/usr/bin/env python3
"""Append a MEASURED usage row to the public ledger. Run by CI, not by agents.

WHY THIS EXISTS (2026-08-14, owner escalation).
The ledger had 86 of 117 rows carrying `input_tokens:0, output_tokens:0`.
Every scheduled run since the move to GitHub Actions logged THAT it ran and
never what it cost, so the site's "run to date" figure froze at $11.48 while
the newsroom kept publishing several times a day. The published number was a
floor presented as a total — on a page whose entire promise is that it isn't.

The root cause is structural, not a missing instruction: an agent inside the
run cannot see its own token accounting. Asking it to self-report in a runbook
produced exactly what self-reporting always produces — a zero. So measurement
moves OUT of the agent and into the harness: this script runs as a workflow
step AFTER the agent finishes, reads the run's own execution transcript, sums
the real usage, and writes the row itself.

If it cannot find a transcript it does NOT invent numbers. It writes the row
with `measured:"unmetered"` and zero tokens, and the site counts and displays
those separately from the metered total, so an unmeasurable run is visible as
an unmeasurable run rather than silently discounted to $0.

Usage:
  python3 newsroom/runner/log_usage.py --agent newsroom-cycle \
      --task-type publish --model claude-sonnet-5 \
      --description "..." [--article-id system] [--transcript PATH]

Deterministic, no network. Idempotent per GitHub run id: a second invocation
for the same run replaces nothing and adds nothing.
"""

from __future__ import annotations

import argparse
import io
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# One run of one agent. A figure past this is not a newsroom cycle, it is a
# transcript from somewhere else — refuse it and say so rather than publish a
# number nobody can defend.
SANE_OUTPUT_CEILING = 2_000_000

ROOT = Path(__file__).resolve().parent.parent.parent
LEDGER = ROOT / "web" / "data" / "usage-log-current.js"

# Every place a Claude Code run is known to leave a transcript, most explicit
# first. Extra candidates are harmless: the first one that yields a usage
# figure wins, and the chosen path is printed so a future change of layout
# shows up in the run log instead of silently zeroing the ledger again.
def transcript_candidates(explicit: str | None) -> list[Path]:
    out: list[Path] = []
    if explicit:
        out.append(Path(explicit))
    for env in ("RTFC_CLAUDE_TRANSCRIPT", "CLAUDE_EXECUTION_FILE",
                "CLAUDE_CODE_EXECUTION_FILE"):
        v = os.environ.get(env)
        if v:
            out.append(Path(v))
    tmp = os.environ.get("RUNNER_TEMP") or "/tmp"
    ws = os.environ.get("GITHUB_WORKSPACE") or str(ROOT)
    for base in (tmp, ws):
        for name in ("claude-execution-output.json", "claude-execution-output.jsonl",
                     "execution-output.json", "output.json"):
            out.append(Path(base) / name)
    # The home-directory transcript store is a LAST resort and only inside CI.
    # Locally it holds unrelated sessions, and this script's first test run
    # happily attributed 248,966 output tokens from a developer's own session
    # to a newsroom run. Overstating the bill is exactly as dishonest as
    # understating it, so: CI only, and only files touched during this run's
    # own lifetime.
    if os.environ.get("GITHUB_ACTIONS") == "true":
        home = Path(os.path.expanduser("~"))
        cutoff = time.time() - 6 * 3600
        cands = []
        for pat in ("**/*.jsonl", "**/*.json"):
            for p in (home / ".claude" / "projects").glob(pat):
                try:
                    if p.stat().st_mtime >= cutoff:
                        cands.append(p)
                except OSError:
                    continue
        out.extend(sorted(cands, key=lambda x: x.stat().st_mtime, reverse=True)[:6])
    seen, uniq = set(), []
    for p in out:
        s = str(p)
        if s not in seen:
            seen.add(s)
            uniq.append(p)
    return uniq


def walk_usage(node, acc: dict, seen_ids: set):
    """Recursively collect every {usage:{...}} in a transcript.

    Deduped by the enclosing message id where one exists — a transcript that
    repeats a message (streaming deltas, replayed context) would otherwise
    double-count and OVERSTATE the bill. Overstating is as dishonest as
    understating; this page only works if the number is the number.
    """
    if isinstance(node, list):
        for x in node:
            walk_usage(x, acc, seen_ids)
        return
    if not isinstance(node, dict):
        return
    u = node.get("usage")
    if isinstance(u, dict) and any(k in u for k in
                                   ("input_tokens", "output_tokens")):
        mid = node.get("id") or node.get("message_id") or node.get("uuid")
        key = str(mid) if mid else None
        if key is None or key not in seen_ids:
            if key is not None:
                seen_ids.add(key)
            acc["input"] += int(u.get("input_tokens") or 0)
            acc["output"] += int(u.get("output_tokens") or 0)
            acc["cached"] += int(u.get("cache_read_input_tokens") or 0)
            acc["cache_write"] += int(u.get("cache_creation_input_tokens") or 0)
            acc["msgs"] += 1
    for v in node.values():
        walk_usage(v, acc, seen_ids)


def measure(paths: list[Path]) -> tuple[dict, str | None]:
    acc = {"input": 0, "output": 0, "cached": 0, "cache_write": 0, "msgs": 0}
    for p in paths:
        try:
            if not p.is_file():
                continue
            text = io.open(p, encoding="utf-8", errors="replace").read()
        except OSError:
            continue
        seen: set = set()
        local = {"input": 0, "output": 0, "cached": 0, "cache_write": 0, "msgs": 0}
        try:
            walk_usage(json.loads(text), local, seen)
        except json.JSONDecodeError:
            for line in text.splitlines():          # JSONL transcript
                line = line.strip()
                if not line or line[0] not in "{[":
                    continue
                try:
                    walk_usage(json.loads(line), local, seen)
                except json.JSONDecodeError:
                    continue
        if local["input"] or local["output"]:
            return local, str(p)
        acc = acc if acc["msgs"] else local
    return acc, None


def next_id(rows_text: str) -> str:
    ids = [int(m) for m in re.findall(r'id:"u-(\d+)"', rows_text)]
    return "u-%04d" % ((max(ids) + 1) if ids else 1)


def js_string(s: str) -> str:
    return (s.replace("\\", "\\\\").replace('"', '\\"')
             .replace("\r", " ").replace("\n", " ").replace("\t", " "))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--agent", required=True)
    ap.add_argument("--task-type", required=True)
    ap.add_argument("--model", default="")
    ap.add_argument("--article-id", default="system")
    ap.add_argument("--description", default="")
    ap.add_argument("--transcript", default=None)
    a = ap.parse_args()

    if not LEDGER.is_file():
        print("log_usage: ledger missing at %s — nothing written" % LEDGER)
        return 0

    text = io.open(LEDGER, encoding="utf-8", newline="").read()
    run_id = os.environ.get("GITHUB_RUN_ID", "")
    run_tag = ("gh-%s" % run_id) if run_id else ""

    # THE AGENT'S OWN WORDS, WITHOUT THE AGENT TOUCHING THE LEDGER.
    # The workflow exports RTFC_RUN_SUMMARY=<runner temp>/rtfc_run_summary.txt.
    # The runbook tells the agent to write its one honest sentence there — what
    # it checked, what it did, what it deferred — and nothing else. This step
    # then writes the ONE row for the run: measured tokens from the finished
    # transcript, the agent's sentence as the description. Two writers was the
    # bug: 35 of the 38 rows since 2026-08-14 were the agent's hand-written
    # duplicate of a run the harness had also logged, each carrying zero tokens.
    summary_path = os.environ.get("RTFC_RUN_SUMMARY", "")
    if summary_path and os.path.isfile(summary_path):
        try:
            said = io.open(summary_path, encoding="utf-8", errors="replace").read().strip()
            said = " ".join(said.split())
            if said:
                a.description = said[:600]
                print("log_usage: description taken from the agent's summary file")
        except OSError:
            pass

    if run_tag and ('run:"%s"' % run_tag) in text:
        print("log_usage: run %s already logged — no duplicate row" % run_tag)
        return 0

    acc, src = measure(transcript_candidates(a.transcript))
    if acc["output"] > SANE_OUTPUT_CEILING or acc["input"] > SANE_OUTPUT_CEILING * 40:
        print("log_usage: REFUSING a figure of %d in / %d out from %s — that is "
              "not one run of one agent, so it is almost certainly someone "
              "else's transcript. Logging the run as unmetered instead."
              % (acc["input"], acc["output"], src))
        acc = {"input": 0, "output": 0, "cached": 0, "cache_write": 0, "msgs": 0}
        src = None
    metered = bool(acc["input"] or acc["output"])
    if metered:
        print("log_usage: measured %d in / %d out (%d cached) from %s"
              % (acc["input"], acc["output"], acc["cached"], src))
    else:
        print("log_usage: NO transcript with usage found — writing an "
              "explicitly UNMETERED row (the site shows these separately; "
              "it never counts them as $0 of real work)")

    desc = a.description or ("%s run" % a.agent)
    if not metered:
        desc += (" [unmetered: this run's token accounting was not available "
                 "to the harness, so its cost is not included in the total]")

    fields = [
        'id:"%s"' % next_id(text),
        'ts:"%s"' % datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        'article_id:"%s"' % js_string(a.article_id),
        'agent:"%s"' % js_string(a.agent),
        'task_type:"%s"' % js_string(a.task_type),
    ]
    if a.model:
        fields.append('model:"%s"' % js_string(a.model))
    fields += [
        "input_tokens:%d" % acc["input"],
        "output_tokens:%d" % acc["output"],
    ]
    if acc["cached"]:
        fields.append("cached_input_tokens:%d" % acc["cached"])
    fields.append('description:"%s"' % js_string(desc))
    fields.append('measured:"%s"' % ("metered" if metered else "unmetered"))
    if run_tag:
        fields.append('run:"%s"' % run_tag)

    row = "    { " + ", ".join(fields) + " },\n"

    # Insert before the array's closing bracket line — the file is an
    # append-only continuation, so position is the whole contract.
    m = None
    for m in re.finditer(r"^\s*\];\s*$", text, re.M):
        pass
    if not m:
        print("log_usage: could not find the rows array terminator — "
              "REFUSING to write rather than corrupt the ledger")
        return 1
    out = text[:m.start()] + row + text[m.start():]
    io.open(LEDGER, "w", encoding="utf-8", newline="").write(out)
    print("log_usage: appended %s row for agent=%s"
          % ("metered" if metered else "UNMETERED", a.agent))
    return 0


if __name__ == "__main__":
    sys.exit(main())
