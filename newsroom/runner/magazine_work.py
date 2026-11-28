#!/usr/bin/env python3
"""Carry a magazine draft between CI runs, and say which phase comes next.

Added 2026-11-27 for the Sep/Oct/Nov back issues. On a CI runner every phase
starts from a clean checkout, so the draft that BUILD writes (paid payload,
meta stub, art, state) is gone by the time VERIFY runs. The paid payload is
gitignored on purpose (this repo is public), so it cannot ride on a pushed
branch either. Instead each run packs its work into a private Actions
artifact named magazine-work-<YYYY-MM>, and the next run restores it.

    magazine_work.py restore <YYYY-MM>     unpack the newest artifact, if any
    magazine_work.py pack <YYYY-MM>        write magazine-work.tgz
    magazine_work.py next-phase <YYYY-MM>  gather|curate|build|verify|done|stuck
"""
from __future__ import annotations

import io
import json
import os
import subprocess
import sys
import tarfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "newsroom" / "runner"))
import pipeline_state as ps  # noqa: E402

ORDER = ["gather", "curate", "build", "verify"]
# A phase that keeps "succeeding" without marking itself complete would loop
# forever through the chain. Past these counts the chain stops and says so.
MAX_RUNS = {"gather": ps.GATHER_PASSES + 2, "curate": 3, "build": 3, "verify": 4}

ALWAYS = ["newsroom/runner/magazine-state", "functions/api/issue/_data",
          "newsroom/releases"]


def sh(*cmd: str) -> str:
    return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True).stdout


def changed_files() -> list[str]:
    """Everything this run produced: tracked changes, new files, and the
    ignored paid payloads, which git would otherwise leave behind."""
    files = set()
    for line in sh("git", "status", "--porcelain", "--untracked-files=all").splitlines():
        path = line[3:].split(" -> ")[-1].strip().strip('"')
        if path:
            files.add(path)
    # commits the agent made on its local draft branch
    base = sh("git", "merge-base", "HEAD", "origin/main").strip()
    if base:
        files.update(sh("git", "diff", "--name-only", base, "HEAD").split())
    for d in ALWAYS:
        p = ROOT / d
        if p.is_dir():
            files.update(str(f.relative_to(ROOT)) for f in p.rglob("*") if f.is_file())
    # Only carry the draft's OUTPUTS. Carrying code (workflows, scripts) would
    # let an old artifact roll back a fix pushed to main between phases.
    keep = ("newsroom/runner/magazine-state/", "functions/api/issue/_data/",
            "newsroom/releases/", "web/data/", "web/assets/img/", "agents/magazine/")
    skip = (".py", ".yml", ".yaml", ".md", "__pycache__", "primer.json")
    return sorted(f for f in files if (ROOT / f).is_file() and f.startswith(keep)
                  and (not f.endswith(skip) or f.startswith("newsroom/releases/")))


def pack(month: str) -> int:
    files = changed_files()
    with tarfile.open(ROOT / "magazine-work.tgz", "w:gz") as t:
        for f in files:
            t.add(ROOT / f, arcname=f)
    print("packed %d file(s) for %s" % (len(files), month))
    return 0


def restore(month: str) -> int:
    repo = os.environ.get("GITHUB_REPOSITORY", "rtfclmgzn/RTFCLMGZN")
    out = sh("gh", "api", "repos/%s/actions/artifacts?name=magazine-work-%s&per_page=5" % (repo, month))
    try:
        arts = [a for a in json.loads(out).get("artifacts", []) if not a.get("expired")]
    except Exception:
        arts = []
    if not arts:
        print("no carried work for %s yet - starting fresh" % month)
        return 0
    newest = max(arts, key=lambda a: a["created_at"])
    raw = subprocess.run(["gh", "api", newest["archive_download_url"]], cwd=ROOT,
                         capture_output=True).stdout
    try:
        tgz = zipfile.ZipFile(io.BytesIO(raw)).read("magazine-work.tgz")
        with tarfile.open(fileobj=io.BytesIO(tgz), mode="r:gz") as t:
            members = [m for m in t.getmembers()
                       if m.isfile() and not m.name.startswith(("/", "..")) and ".." not in m.name]
            t.extractall(ROOT, members=members)
        print("restored %d file(s) for %s from run artifact %s" % (len(members), month, newest["id"]))
    except Exception as e:  # noqa: BLE001
        print("::warning::could not restore carried work for %s: %s" % (month, e))
    return 0


def next_phase(month: str) -> int:
    st = ps.load(month)
    for ph in ORDER:
        if not ps.phase_done(st, ph):
            if ps.phase_runs(st, ph) >= MAX_RUNS[ph]:
                print("stuck")
                print("::error::%s %s ran %d times without completing - chain stopped"
                      % (month, ph, ps.phase_runs(st, ph)), file=sys.stderr)
                return 0
            print(ph)
            return 0
    print("done")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 3 or sys.argv[1] not in ("pack", "restore", "next-phase"):
        print(__doc__)
        sys.exit(2)
    cmd, month = sys.argv[1], sys.argv[2]
    sys.exit({"pack": pack, "restore": restore, "next-phase": next_phase}[cmd](month))
