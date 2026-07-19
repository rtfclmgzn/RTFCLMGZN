"""Publish-surface guard for the headless Claude newsroom runner.

Run this immediately before `git push` in every cycle. It inspects what's
actually STAGED (git diff --cached) and exits non-zero — refusing the push —
if anything outside the allowed surface is included. This is the one thing
standing between an unattended agent with git access and a mistake that
touches code, secrets, or config instead of content.

Usage: python -m newsroom.runner.verify_publish_surface
Exit 0  -> everything staged is in-surface, safe to push.
Exit 1  -> something out-of-surface is staged; push must NOT proceed.
Exit 2  -> nothing is staged at all (nothing to push; not itself an error,
           but distinct from "safe to push" so the caller can skip cleanly).
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

# Deliberately narrower than newsroom.autonomy.controller's publish-surface
# constant: the Claude runner ALSO writes cover art it selects/generates and
# the library manifest recording that use, so those are explicitly allowed
# here. It must NOT touch newsroom/ (pipeline code), agents/ (specs), or
# anything else -- a content-desk agent has no reason to edit its own rules.
ALLOWED_PREFIXES = (
    "web/",
    "docs/operations/releases/",
    "image-library/art/manifest.json",
)


def within_surface(path: str) -> bool:
    normalized = path.replace("\\", "/").lstrip("./")
    return any(normalized.startswith(prefix) for prefix in ALLOWED_PREFIXES)


def staged_paths(repo_root: Path) -> list[str]:
    result = subprocess.run(
        ["git", "diff", "--cached", "--name-only"],
        cwd=repo_root,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=30,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(f"git diff --cached failed: {result.stderr.strip()}")
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def main() -> int:
    repo_root = Path(__file__).resolve().parents[2]
    paths = staged_paths(repo_root)
    if not paths:
        print("Nothing staged. Nothing to push.")
        return 2

    out_of_surface = [p for p in paths if not within_surface(p)]
    print(f"Staged files ({len(paths)}):")
    for p in paths:
        flag = "  OK  " if within_surface(p) else " BLOCK"
        print(f"  [{flag}] {p}")

    if out_of_surface:
        print(
            "\nREFUSING TO PUSH: "
            f"{len(out_of_surface)} staged file(s) are outside the allowed publish surface "
            f"({', '.join(ALLOWED_PREFIXES)}). Unstage them (git restore --staged <path>) "
            "before pushing, or if this is intentional pipeline/spec work, that belongs "
            "in a human-reviewed commit, not an unattended cycle."
        )
        return 1

    print("\nAll staged files are within the allowed publish surface. Safe to push.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
