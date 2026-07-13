from __future__ import annotations

import io
import json
import os
import re
import shutil
import tempfile
import zipfile
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Any

from .contracts import ContractError, validate_story_package

MAX_PACKAGE_BYTES = 30 * 1024 * 1024
ALLOWED_IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"}


class PackageImportError(RuntimeError):
    pass


@dataclass(frozen=True)
class ImportedStoryPackage:
    document: dict[str, Any]
    artwork_bytes: bytes | None
    artwork_suffix: str | None
    source_name: str


class StoryPackageImporter:
    def __init__(self, persona_ids: set[str]):
        self.persona_ids = persona_ids

    def inspect(self, data: bytes, filename: str) -> ImportedStoryPackage:
        if not data:
            raise PackageImportError("The uploaded package is empty")
        if len(data) > MAX_PACKAGE_BYTES:
            raise PackageImportError("Story packages are limited to 30 MB")
        suffix = Path(filename).suffix.lower()
        if suffix == ".json":
            return self._from_json(data, filename)
        if suffix == ".zip":
            return self._from_zip(data, filename)
        raise PackageImportError("Upload a .json or .zip newsroom story package")

    def _from_json(self, data: bytes, filename: str) -> ImportedStoryPackage:
        try:
            raw = json.loads(data.decode("utf-8"))
            document = validate_story_package(raw, self.persona_ids)
        except (UnicodeDecodeError, json.JSONDecodeError, ContractError, ValueError) as exc:
            raise PackageImportError(f"Invalid story package: {exc}") from exc
        return ImportedStoryPackage(document, None, None, filename)

    def _from_zip(self, data: bytes, filename: str) -> ImportedStoryPackage:
        try:
            archive = zipfile.ZipFile(io.BytesIO(data), "r")
        except zipfile.BadZipFile as exc:
            raise PackageImportError("The uploaded ZIP is invalid") from exc
        with archive:
            infos = [info for info in archive.infolist() if not info.is_dir()]
            if len(infos) > 20:
                raise PackageImportError("Story packages may contain at most 20 files")
            total_size = sum(info.file_size for info in infos)
            if total_size > MAX_PACKAGE_BYTES:
                raise PackageImportError("The extracted package is too large")
            normalized: dict[str, zipfile.ZipInfo] = {}
            for info in infos:
                raw_name = info.filename.replace("\\", "/")
                path = PurePosixPath(raw_name)
                if path.is_absolute() or ".." in path.parts or ":" in raw_name:
                    raise PackageImportError(f"Unsafe path in ZIP: {raw_name}")
                if ((info.external_attr >> 16) & 0o170000) == 0o120000:
                    raise PackageImportError("Symlinks are not allowed in story packages")
                normalized[str(path)] = info
            story_info = normalized.get("story.json")
            if story_info is None:
                raise PackageImportError("ZIP packages must contain story.json at the root")
            try:
                raw = json.loads(archive.read(story_info).decode("utf-8"))
                document = validate_story_package(raw, self.persona_ids)
            except (UnicodeDecodeError, json.JSONDecodeError, ContractError, ValueError) as exc:
                raise PackageImportError(f"Invalid story.json: {exc}") from exc
            artwork_candidates = [
                (name, info)
                for name, info in normalized.items()
                if name.startswith("assets/") and Path(name).suffix.lower() in ALLOWED_IMAGE_SUFFIXES
            ]
            if len(artwork_candidates) > 1:
                raise PackageImportError("A story package may contain only one hero artwork file")
            artwork_bytes = None
            artwork_suffix = None
            if artwork_candidates:
                name, info = artwork_candidates[0]
                artwork_bytes = archive.read(info)
                artwork_suffix = Path(name).suffix.lower()
                self._validate_image(artwork_bytes, artwork_suffix)
            return ImportedStoryPackage(document, artwork_bytes, artwork_suffix, filename)

    @staticmethod
    def _validate_image(data: bytes, suffix: str) -> None:
        if suffix in {".jpg", ".jpeg"} and not data.startswith(b"\xff\xd8\xff"):
            raise PackageImportError("Artwork does not contain a valid JPEG signature")
        if suffix == ".png" and not data.startswith(b"\x89PNG\r\n\x1a\n"):
            raise PackageImportError("Artwork does not contain a valid PNG signature")
        if suffix == ".gif" and not data.startswith((b"GIF87a", b"GIF89a")):
            raise PackageImportError("Artwork does not contain a valid GIF signature")
        if suffix == ".webp" and not (data[:4] == b"RIFF" and data[8:12] == b"WEBP"):
            raise PackageImportError("Artwork does not contain a valid WebP signature")
        if suffix == ".svg":
            try:
                text = data.decode("utf-8")
            except UnicodeDecodeError as exc:
                raise PackageImportError("SVG artwork must be UTF-8") from exc
            lowered = text.lower()
            if "<svg" not in lowered or "<script" in lowered or "onload=" in lowered:
                raise PackageImportError("SVG artwork is missing <svg> or contains executable content")
