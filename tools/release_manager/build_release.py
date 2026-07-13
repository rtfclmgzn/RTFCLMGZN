#!/usr/bin/env python3
"""Build a checksum-verified RTFCLMGZN editorial release ZIP from a JSON spec."""

from __future__ import annotations

import argparse
import json
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from release_manager import (
    ReleaseManagerError,
    is_allowed_release_path,
    normalize_release_path,
    sha256_file,
    validate_manifest,
)


def build(project: Path, spec_path: Path, output: Path) -> None:
    spec = json.loads(spec_path.read_text("utf-8"))
    raw_paths = spec.pop("paths", None)
    if not isinstance(raw_paths, list) or not raw_paths:
        raise ReleaseManagerError("Spec must contain a non-empty paths array.")

    files = []
    normalized_paths = []
    for raw in raw_paths:
        rel = normalize_release_path(raw)
        if not is_allowed_release_path(rel):
            raise ReleaseManagerError(f"Release path is not allowed: {rel}")
        source = project / rel
        if not source.is_file():
            raise ReleaseManagerError(f"Release source file is missing: {rel}")
        normalized_paths.append(rel)
        files.append({"path": rel, "sha256": sha256_file(source), "size": source.stat().st_size})

    manifest = {
        "schema_version": 1,
        **spec,
        "created_at": spec.get("created_at")
        or datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "files": files,
    }
    validate_manifest(manifest)

    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        archive.writestr("release.json", json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
        for rel in normalized_paths:
            archive.write(project / rel, f"payload/{rel}")
    print(f"Created {output}")
    print(f"Release: {manifest['release_id']}")
    print(f"Files: {len(files)}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", type=Path, required=True)
    parser.add_argument("--spec", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        build(args.project.resolve(), args.spec.resolve(), args.output.resolve())
        return 0
    except (ReleaseManagerError, json.JSONDecodeError, OSError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
