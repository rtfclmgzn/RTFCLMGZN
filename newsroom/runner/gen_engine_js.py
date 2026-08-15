#!/usr/bin/env python3
"""Emit web/data/engine.js from engine.config.json.

WHY A GENERATED FILE AND NOT A FETCH (2026-08-15). The app reads its data as
JS globals — no build step, no fetch — so the site still opens by double-
clicking index.html, a design goal since the first commit. That means the
browser cannot read engine.config.json directly. So the config stays JSON
(one file the Python checks, the Cloudflare Functions and this script can all
read natively), and this turns it into the one JS global the app consumes:

    window.RTFC_ENGINE = { ... };

Deterministic and idempotent: same config in, same bytes out, so it can run
before every ship and in every CI pass without ever churning a commit.
site_guard.py::check_engine_config fails the build if web/data/engine.js is
not byte-identical to what this script would write, so the two can never
drift — which is the entire point of having one source.

Keys beginning with "$comment" are documentation for humans and are stripped;
readers do not need to download the reasoning.
"""

from __future__ import annotations

import io
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
CONFIG = ROOT / "engine.config.json"
OUT = ROOT / "web" / "data" / "engine.js"

HEADER = (
    "// GENERATED from engine.config.json by newsroom/runner/gen_engine_js.py.\n"
    "// Do not edit. Edit engine.config.json and rerun; the guard fails the\n"
    "// build if this file and the config disagree.\n"
)


def strip_comments(node):
    if isinstance(node, dict):
        return {k: strip_comments(v) for k, v in node.items()
                if not str(k).startswith("$comment")}
    if isinstance(node, list):
        return [strip_comments(v) for v in node]
    return node


def render() -> str:
    cfg = json.loads(io.open(CONFIG, encoding="utf-8").read())
    body = json.dumps(strip_comments(cfg), indent=2, ensure_ascii=False)
    return HEADER + "window.RTFC_ENGINE = " + body + ";\n"


def main() -> int:
    if not CONFIG.is_file():
        print("gen_engine_js: engine.config.json missing - nothing to emit")
        return 2
    text = render()
    old = io.open(OUT, encoding="utf-8").read() if OUT.is_file() else None
    if old == text:
        print("gen_engine_js: web/data/engine.js already current")
        return 0
    io.open(OUT, "w", encoding="utf-8", newline="\n").write(text)
    print("gen_engine_js: wrote web/data/engine.js (%d bytes)" % len(text.encode("utf-8")))
    return 0


if __name__ == "__main__":
    sys.exit(main())
