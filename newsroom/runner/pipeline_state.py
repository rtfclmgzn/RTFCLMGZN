#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""RTFCLMGZN — cross-run state for the four-phase magazine pipeline.

The pipeline (GATHER x3 -> CURATE -> BUILD -> VERIFY) is six separate headless
Claude sessions spread over six days. None of them remembers the last one. This
module is the ONLY memory they share:

    newsroom/runner/magazine-state/<YYYY-MM>.json

Everything a later phase needs from an earlier one lives in that file: which
phases have run and when, the accumulated gather dossier, the chosen slate and
page map, where the art manifest is, what the audit measured, and the running
`lessons` array.

Usage from a phase run (Python):

    import pipeline_state as ps
    st = ps.load()                                  # current cycle month
    ok, why = ps.require_phase(st, "gather")        # prerequisite check
    if not ok:
        ps.log(st, why); ps.save(st); sys.exit(2)
    ps.append_gather_pass(st, {...})
    ps.mark_phase_complete(st, "gather", summary="pass 2 of 3")
    ps.save(st)

Usage from a .bat / shell (CLI):

    python pipeline_state.py month                  -> 2026-08
    python pipeline_state.py path                   -> full path to the state file
    python pipeline_state.py init  --phase gather   -> create/refresh, record run start
    python pipeline_state.py require --phase curate -> exit 0 if OK to run, 3 if blocked
    python pipeline_state.py complete --phase build --summary "80pp, 57 images"
    python pipeline_state.py show                   -> human-readable status
    python pipeline_state.py dump                   -> raw JSON to stdout
    python pipeline_state.py lesson --text "..." [--symptom .. --cause .. --check ..]

Everything is UTF-8. Saves are ATOMIC: written to a temp file in the same
directory, flushed and fsynced, then os.replace()d over the real one — so a run
that dies mid-write (or a Scheduled Task killed by a reboot) can never leave a
truncated JSON behind that bricks the rest of the month.
"""

from __future__ import annotations

import argparse
import datetime as _dt
import json
import os
import sys
import tempfile

# --------------------------------------------------------------------------
# phases, in order. A phase may only run if everything before it has run.
# --------------------------------------------------------------------------
PHASES = ("gather", "curate", "build", "verify")

# GATHER is the only phase that runs more than once (25th, 26th, 27th).
GATHER_PASSES = 3

STATE_DIRNAME = os.path.join("newsroom", "runner", "magazine-state")

ISO = "%Y-%m-%dT%H:%M:%SZ"


def _now() -> str:
    return _dt.datetime.now(_dt.timezone.utc).strftime(ISO)


# --------------------------------------------------------------------------
# repo root + cycle month
# --------------------------------------------------------------------------
def repo_root(start: str | None = None) -> str:
    """Locate the repo root.

    Order: $RTFCLMGZN_ROOT, then walk up from this file looking for the
    web/ + agents/ pair that only the repo root has. Falls back to cwd so the
    module is still importable from a scratch directory during development.
    """
    env = os.environ.get("RTFCLMGZN_ROOT")
    if env and os.path.isdir(env):
        return os.path.abspath(env)

    here = os.path.abspath(start or os.path.dirname(os.path.abspath(__file__)))
    cur = here
    while True:
        if os.path.isdir(os.path.join(cur, "web")) and os.path.isdir(os.path.join(cur, "agents")):
            return cur
        parent = os.path.dirname(cur)
        if parent == cur:
            break
        cur = parent
    return os.path.abspath(os.getcwd())


def resolve_cycle_month(now: _dt.datetime | None = None) -> str:
    """Which issue cycle a run belongs to, as 'YYYY-MM'.

    The pipeline drafts the month it is standing in: GATHER starts on the 25th
    of month M and the issue covers month M. The only wrinkle is FEBRUARY —
    there is no Feb 30, so VERIFY for the February cycle is scheduled on
    March 1 (see SETUP_MAGAZINE_PIPELINE.bat). A run on days 1-4 therefore
    belongs to the PREVIOUS month's cycle, not a brand new one; nothing else
    ever fires that early in a month.
    """
    now = now or _dt.datetime.now()
    if now.day <= 4:
        first = now.replace(day=1)
        prev = first - _dt.timedelta(days=1)
        return f"{prev.year:04d}-{prev.month:02d}"
    return f"{now.year:04d}-{now.month:02d}"


def state_dir(root: str | None = None) -> str:
    return os.path.join(root or repo_root(), STATE_DIRNAME)


def state_path(month: str | None = None, root: str | None = None) -> str:
    month = month or resolve_cycle_month()
    return os.path.join(state_dir(root), f"{month}.json")


# --------------------------------------------------------------------------
# the document
# --------------------------------------------------------------------------
def blank_state(month: str) -> dict:
    return {
        "month": month,
        "schema": 1,
        "created_utc": _now(),
        "updated_utc": _now(),
        # Filled in by CURATE. BUILD and VERIFY read it rather than guessing.
        "issue": {
            "number": None,        # e.g. 3
            "id": None,            # e.g. "issue-003"
            "title": None,
            "dateline": None,      # e.g. "September 2026"
            "prev_id": None,       # the control for the audit, e.g. "issue-002"
            "branch": None,        # magazine-draft-issue-003
        },
        "phases": {
            p: {
                "complete": False,
                "completed_utc": None,
                "runs": [],        # [{started_utc, finished_utc, summary, ok}]
            }
            for p in PHASES
        },
        # GATHER appends here, once per pass. CURATE reads the whole thing.
        "dossier": {
            "passes": [],          # [{pass, date_utc, window, notes}]
            "candidates": [],      # [{slug, headline, published, significance, why, developments}]
            "connections": [],     # [{name, stories:[slug], thesis}]
            "predictions_pending": [],   # carried from the previous issue's Ledger
            "prediction_evidence": [],   # [{prediction, evidence, leaning}]
            "gaps": [],            # what is still missing, read by the NEXT gather pass
        },
        # CURATE writes these.
        "slate": {
            "cover_story": None,
            "arc": None,           # the four acts / throughline
            "features": [],        # [{slug, headline, pages, layout_open, runovers}]
            "graded_predictions": [],   # [{prediction, verdict, evidence}]
            "new_predictions": [],      # 5-7 falsifiable calls
            "page_map": [],        # [{page, kind, layout, folio, working_title}]
            "target_pages": None,
            "budget_source": None, # which issue the copy budgets were measured off
        },
        # BUILD writes these.
        "art": {
            "manifest_path": None,       # art prompt manifest handed to gen_issue_art.py
            "run_manifest_path": None,   # web/assets/img/_issue-art-manifest.json
            "images_planned": 0,
            "images_generated": 0,
            "images_failed": [],
            "cost_usd": 0.0,
            "gatefolds_chopped": False,
            "payload_path": None,        # functions/api/issue/_data/issue-NNN.json
            "meta_path": None,           # web/data/issue-NNN-meta.js
        },
        # VERIFY writes these.
        "audit": {
            "qa_scan": None,       # {"exit": 0, "problems": 0, "run_utc": ...}
            "windows": {},         # {"1320x780": {"pages":80,"void":0,"cutoff":0}, ...}
            "control": {},         # same shape, run against issue.prev_id
            "iterations": [],      # [{round, fixed:[...], remaining:{...}}]
            "note_path": None,     # newsroom/releases/DRAFT-READY-issue-NNN.md
            "clean": False,
        },
        # Appended by any phase. Seeded from LESSONS.md; promoted back into it
        # by hand when a lesson proves durable.
        "lessons": [],
        # Every phase logs here. This is the record that survives; the .log file
        # in %LOCALAPPDATA% is per-phase and easy to lose.
        "log": [],
    }


def _migrate(st: dict, month: str) -> dict:
    """Fill in anything a newer schema added, without destroying existing data."""
    base = blank_state(month)
    for k, v in base.items():
        if k not in st:
            st[k] = v
    for p in PHASES:
        st.setdefault("phases", {}).setdefault(
            p, {"complete": False, "completed_utc": None, "runs": []}
        )
    for k, v in base["dossier"].items():
        st["dossier"].setdefault(k, v)
    for k, v in base["slate"].items():
        st["slate"].setdefault(k, v)
    for k, v in base["art"].items():
        st["art"].setdefault(k, v)
    for k, v in base["audit"].items():
        st["audit"].setdefault(k, v)
    return st


# --------------------------------------------------------------------------
# load / save
# --------------------------------------------------------------------------
def load(month: str | None = None, root: str | None = None) -> dict:
    """Read the cycle's state, creating a blank one in memory if absent.

    Never raises on a missing file — the first GATHER pass of the month is
    supposed to find nothing. A CORRUPT file does raise, loudly: silently
    starting over would throw away three days of dossier.
    """
    month = month or resolve_cycle_month()
    p = state_path(month, root)
    if not os.path.isfile(p):
        return blank_state(month)
    with open(p, "r", encoding="utf-8") as fh:
        raw = fh.read()
    if not raw.strip():
        return blank_state(month)
    try:
        st = json.loads(raw)
    except json.JSONDecodeError as e:
        raise RuntimeError(
            f"magazine state at {p} is corrupt ({e}). It holds the accumulated "
            f"dossier — do NOT delete it and start over. A .bak copy from the "
            f"last good save is beside it if one exists."
        ) from e
    return _migrate(st, month)


def save(st: dict, root: str | None = None) -> str:
    """Write the state ATOMICALLY. Returns the path written.

    Temp file in the same directory (so os.replace stays on one filesystem and
    is a real atomic rename), flush + fsync, then replace. A crash can leave a
    stray .tmp; it can never leave a half-written state file.
    """
    st["updated_utc"] = _now()
    p = state_path(st.get("month"), root)
    d = os.path.dirname(p)
    os.makedirs(d, exist_ok=True)

    # keep one generation back — cheap insurance for a file that is three days
    # of irreplaceable editorial judgment
    if os.path.isfile(p):
        try:
            with open(p, "r", encoding="utf-8") as fh:
                prev = fh.read()
            if prev.strip():
                with open(p + ".bak", "w", encoding="utf-8", newline="\n") as fh:
                    fh.write(prev)
        except OSError:
            pass

    fd, tmp = tempfile.mkstemp(prefix=".state-", suffix=".tmp", dir=d)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as fh:
            json.dump(st, fh, ensure_ascii=False, indent=2)
            fh.write("\n")
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp, p)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise
    return p


# --------------------------------------------------------------------------
# logging
# --------------------------------------------------------------------------
def log(st: dict, msg: str, phase: str | None = None, echo: bool = True) -> None:
    """Append to the state's own log AND stdout (which the .bat tees to file)."""
    row = {"utc": _now(), "phase": phase, "msg": msg}
    st.setdefault("log", []).append(row)
    if echo:
        tag = f"[{phase}] " if phase else ""
        try:
            print(f"{row['utc']} {tag}{msg}", flush=True)
        except UnicodeEncodeError:      # a console codepage that cannot cope
            print(f"{row['utc']} {tag}{msg}".encode("ascii", "replace").decode(), flush=True)


# --------------------------------------------------------------------------
# phase bookkeeping
# --------------------------------------------------------------------------
def phase_done(st: dict, phase: str) -> bool:
    if phase not in PHASES:
        raise ValueError(f"unknown phase {phase!r}; expected one of {PHASES}")
    return bool(st["phases"][phase]["complete"])


def phase_runs(st: dict, phase: str) -> int:
    return len(st["phases"][phase]["runs"])


def start_run(st: dict, phase: str, note: str = "") -> dict:
    """Record that a phase run has begun. Call before doing any work."""
    if phase not in PHASES:
        raise ValueError(f"unknown phase {phase!r}; expected one of {PHASES}")
    run = {"started_utc": _now(), "finished_utc": None, "summary": note, "ok": None}
    st["phases"][phase]["runs"].append(run)
    log(st, f"run started ({note})" if note else "run started", phase)
    return run


def mark_phase_complete(st: dict, phase: str, summary: str = "", ok: bool = True, **details) -> dict:
    """Mark a phase finished.

    GATHER is deliberately NOT marked complete until it has recorded
    GATHER_PASSES dossier passes — the 25th and 26th runs finish, but the phase
    is not done, and CURATE's prerequisite check knows the difference.
    """
    if phase not in PHASES:
        raise ValueError(f"unknown phase {phase!r}; expected one of {PHASES}")
    ph = st["phases"][phase]
    if ph["runs"] and ph["runs"][-1]["finished_utc"] is None:
        ph["runs"][-1]["finished_utc"] = _now()
        ph["runs"][-1]["ok"] = ok
        if summary:
            ph["runs"][-1]["summary"] = summary
    else:
        ph["runs"].append(
            {"started_utc": _now(), "finished_utc": _now(), "summary": summary, "ok": ok}
        )
    if details:
        ph.setdefault("details", {}).update(details)

    if phase == "gather":
        passes = len(st["dossier"]["passes"])
        if passes >= GATHER_PASSES and ok:
            ph["complete"] = True
            ph["completed_utc"] = _now()
            log(st, f"GATHER complete after {passes} dossier passes", phase)
        else:
            log(st, f"gather pass recorded ({passes}/{GATHER_PASSES}) — phase not complete yet", phase)
    elif ok:
        ph["complete"] = True
        ph["completed_utc"] = _now()
        log(st, f"{phase.upper()} complete: {summary}" if summary else f"{phase.upper()} complete", phase)
    else:
        log(st, f"{phase.upper()} run FAILED: {summary}", phase)
    return ph


def require_phase(st: dict, phase: str) -> tuple[bool, str]:
    """Can `phase` legally run right now? Returns (ok, human reason).

    This is the check that stops CURATE from inventing a dossier it never
    gathered. If GATHER did not run, CURATE does not "do its best" from the raw
    article feed — it refuses, says so, and leaves the month for a human. A
    curated slate built from no accumulated evidence is worse than no issue,
    because it looks exactly like a real one.
    """
    if phase not in PHASES:
        return False, f"unknown phase {phase!r}; expected one of {', '.join(PHASES)}"

    idx = PHASES.index(phase)

    if phase == "gather":
        passes = len(st["dossier"]["passes"])
        if passes >= GATHER_PASSES:
            return False, (
                f"GATHER already has {passes}/{GATHER_PASSES} dossier passes for "
                f"{st['month']} — nothing left to gather. No-op."
            )
        return True, f"GATHER pass {passes + 1} of {GATHER_PASSES} for {st['month']}."

    if phase_done(st, phase):
        return False, (
            f"{phase.upper()} already completed for {st['month']} at "
            f"{st['phases'][phase]['completed_utc']} — this firing is a duplicate "
            f"(catch-up trigger or a short-month fallback). No-op."
        )

    for need in PHASES[:idx]:
        if not phase_done(st, need):
            if need == "gather":
                passes = len(st["dossier"]["passes"])
                return False, (
                    f"BLOCKED: {phase.upper()} cannot run because GATHER is not complete "
                    f"for {st['month']} ({passes}/{GATHER_PASSES} dossier passes recorded). "
                    f"There is no accumulated dossier to curate from and this phase must "
                    f"NOT invent one — a slate assembled without the three gather passes "
                    f"has no significance scoring, no cross-story connections, and no "
                    f"graded predictions behind it. Fix the gather schedule, or run "
                    f"RTFCLMGZN_MAGAZINE_PIPELINE.bat gather manually {GATHER_PASSES - passes} "
                    f"more time(s), then re-run {phase}."
                )
            return False, (
                f"BLOCKED: {phase.upper()} requires {need.upper()}, which has not completed "
                f"for {st['month']}. Run the pipeline phases in order: "
                f"{' -> '.join(PHASES)}."
            )

    return True, f"{phase.upper()} clear to run for {st['month']}."


def assert_prerequisite(st: dict, phase: str) -> bool:
    """require_phase + log the refusal into the state. Returns False to stop."""
    ok, why = require_phase(st, phase)
    log(st, why, phase)
    return ok


# --------------------------------------------------------------------------
# dossier / slate / art / audit writers
# --------------------------------------------------------------------------
def append_gather_pass(st: dict, record: dict) -> dict:
    """Append one GATHER pass to the running dossier.

    `record` is free-form but should carry at least:
      window        — the date range read this pass
      candidates    — [{slug, headline, published, significance, why, developments}]
      connections   — [{name, stories, thesis}]
      predictions   — evidence for/against the previous issue's pending calls
      gaps          — what is still missing, for the NEXT pass to chase
      notes         — prose the curator will actually read

    Candidates/connections/evidence are also merged into the flat top-level
    lists, de-duplicated on slug/name, so CURATE gets one accumulated view
    instead of having to diff three passes itself. Late-breaking stories are
    exactly why this runs three times: a story that lands on the 27th still
    gets into the dossier before the slate is picked on the 28th.
    """
    d = st["dossier"]
    n = len(d["passes"]) + 1
    rec = dict(record)
    rec.setdefault("pass", n)
    rec.setdefault("date_utc", _now())
    d["passes"].append(rec)

    def merge(dst_key, items, key):
        if not items:
            return
        index = {x.get(key): i for i, x in enumerate(st["dossier"][dst_key]) if isinstance(x, dict)}
        for it in items:
            if not isinstance(it, dict):
                continue
            k = it.get(key)
            if k is not None and k in index:
                st["dossier"][dst_key][index[k]].update(it)
            else:
                st["dossier"][dst_key].append(it)
                if k is not None:
                    index[k] = len(st["dossier"][dst_key]) - 1

    merge("candidates", rec.get("candidates"), "slug")
    merge("connections", rec.get("connections"), "name")
    merge("prediction_evidence", rec.get("predictions"), "prediction")
    if rec.get("pending_predictions"):
        d["predictions_pending"] = rec["pending_predictions"]
    # gaps are REPLACED each pass, not accumulated: a gap the next pass filled
    # is no longer a gap, and a stale gap list makes the curator chase ghosts.
    d["gaps"] = rec.get("gaps", [])

    log(st, f"dossier pass {n}: +{len(rec.get('candidates') or [])} candidates, "
            f"{len(d['candidates'])} total, {len(d['gaps'])} open gap(s)", "gather")
    return rec


def set_slate(st: dict, **fields) -> dict:
    st["slate"].update(fields)
    log(st, f"slate updated: {', '.join(sorted(fields))}", "curate")
    return st["slate"]


def set_issue(st: dict, **fields) -> dict:
    st["issue"].update(fields)
    log(st, f"issue identity: {st['issue'].get('id')} — {st['issue'].get('title')}", "curate")
    return st["issue"]


def set_art(st: dict, **fields) -> dict:
    st["art"].update(fields)
    log(st, f"art: {st['art'].get('images_generated')} generated, "
            f"chopped={st['art'].get('gatefolds_chopped')}", "build")
    return st["art"]


def record_audit(st: dict, window: str, result: dict, control: bool = False) -> dict:
    """Store one window's audit numbers. `window` is like '1440x900'."""
    bucket = st["audit"]["control"] if control else st["audit"]["windows"]
    bucket[window] = dict(result, run_utc=_now())
    log(st, f"audit{' (control)' if control else ''} {window}: "
            f"{result.get('pages')} pages, void={result.get('void')}, "
            f"cutoff={result.get('cutoff')}", "verify")
    return bucket[window]


def audit_clean(st: dict) -> bool:
    """True when qa_scan passed and every measured window has 0 void / 0 cutoff."""
    qa = st["audit"].get("qa_scan") or {}
    if qa.get("exit") != 0:
        return False
    wins = st["audit"].get("windows") or {}
    if not wins:
        return False
    return all(int(v.get("void", 1)) == 0 and int(v.get("cutoff", 1)) == 0 for v in wins.values())


def add_lesson(st: dict, symptom: str, cause: str = "", check: str = "", phase: str = "") -> dict:
    """Record a lesson in the shape LESSONS.md uses: symptom / cause / enforced check."""
    row = {
        "utc": _now(),
        "phase": phase or None,
        "symptom": symptom,
        "root_cause": cause,
        "enforced_check": check,
    }
    st.setdefault("lessons", []).append(row)
    log(st, f"lesson recorded: {symptom[:90]}", phase or None)
    return row


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------
def _summarize(st: dict) -> str:
    out = [f"cycle month : {st['month']}",
           f"state file  : {state_path(st['month'])}",
           f"issue       : {st['issue'].get('id') or '(not chosen)'} "
           f"{st['issue'].get('title') or ''}".rstrip()]
    for p in PHASES:
        ph = st["phases"][p]
        mark = "DONE" if ph["complete"] else "----"
        extra = ""
        if p == "gather":
            extra = f"  ({len(st['dossier']['passes'])}/{GATHER_PASSES} passes)"
        when = ph["completed_utc"] or (ph["runs"][-1]["started_utc"] if ph["runs"] else "")
        out.append(f"  {mark}  {p:<7} runs={len(ph['runs'])}{extra}  {when}")
    out.append(f"candidates  : {len(st['dossier']['candidates'])}")
    out.append(f"connections : {len(st['dossier']['connections'])}")
    out.append(f"open gaps   : {len(st['dossier']['gaps'])}")
    out.append(f"art manifest: {st['art'].get('manifest_path') or '(none)'}")
    qa = st["audit"].get("qa_scan") or {}
    out.append(f"qa_scan     : {qa.get('exit', '(not run)')}")
    out.append(f"audit clean : {audit_clean(st)}")
    out.append(f"lessons     : {len(st['lessons'])}")
    return "\n".join(out)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="RTFCLMGZN magazine pipeline state")
    ap.add_argument("cmd", choices=["month", "path", "init", "require", "complete",
                                    "show", "dump", "lesson", "log"])
    ap.add_argument("--phase", choices=list(PHASES))
    ap.add_argument("--month", help="override the cycle month (YYYY-MM)")
    ap.add_argument("--summary", default="")
    ap.add_argument("--text", default="")
    ap.add_argument("--symptom", default="")
    ap.add_argument("--cause", default="")
    ap.add_argument("--check", default="")
    ap.add_argument("--failed", action="store_true", help="mark the run failed, not complete")
    a = ap.parse_args(argv)

    month = a.month or resolve_cycle_month()

    if a.cmd == "month":
        print(month)
        return 0
    if a.cmd == "path":
        print(state_path(month))
        return 0

    st = load(month)

    if a.cmd == "show":
        print(_summarize(st))
        return 0
    if a.cmd == "dump":
        print(json.dumps(st, ensure_ascii=False, indent=2))
        return 0

    if a.cmd == "require":
        if not a.phase:
            ap.error("--phase is required for 'require'")
        ok, why = require_phase(st, a.phase)
        print(why)
        if not ok:
            # persist the refusal so the reason survives the session, then
            # exit 3 — the .bat treats 3 as "declined on purpose", not a crash.
            log(st, why, a.phase, echo=False)
            save(st)
            return 3
        return 0

    if a.cmd == "init":
        if not a.phase:
            ap.error("--phase is required for 'init'")
        start_run(st, a.phase, a.summary)
        save(st)
        print(state_path(month))
        return 0

    if a.cmd == "complete":
        if not a.phase:
            ap.error("--phase is required for 'complete'")
        mark_phase_complete(st, a.phase, a.summary, ok=not a.failed)
        save(st)
        return 0

    if a.cmd == "lesson":
        add_lesson(st, a.symptom or a.text, a.cause, a.check, a.phase or "")
        save(st)
        return 0

    if a.cmd == "log":
        log(st, a.text or a.summary, a.phase)
        save(st)
        return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
