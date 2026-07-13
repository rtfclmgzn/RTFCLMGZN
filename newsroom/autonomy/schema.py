from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


class SchemaValidationError(RuntimeError):
    pass


def load_schema(name: str) -> dict[str, Any]:
    path = Path(__file__).resolve().parents[1] / "schemas" / name
    try:
        value = json.loads(path.read_text("utf-8"))
    except Exception as exc:
        raise SchemaValidationError(f"Could not load schema {name}: {exc}") from exc
    if not isinstance(value, dict):
        raise SchemaValidationError(f"Schema {name} is not an object")
    return value


def validate(value: Any, schema: dict[str, Any], path: str = "$") -> None:
    expected = schema.get("type")
    if expected == "object":
        if not isinstance(value, dict):
            raise SchemaValidationError(f"{path} must be an object")
        required = schema.get("required") or []
        for key in required:
            if key not in value:
                raise SchemaValidationError(f"{path}.{key} is required")
        if schema.get("additionalProperties") is False:
            allowed = set((schema.get("properties") or {}).keys())
            extra = sorted(set(value) - allowed)
            if extra:
                raise SchemaValidationError(f"{path} contains unexpected fields: {', '.join(extra)}")
        for key, child_schema in (schema.get("properties") or {}).items():
            if key in value:
                validate(value[key], child_schema, f"{path}.{key}")
    elif expected == "array":
        if not isinstance(value, list):
            raise SchemaValidationError(f"{path} must be an array")
        if "minItems" in schema and len(value) < int(schema["minItems"]):
            raise SchemaValidationError(f"{path} has too few items")
        if "maxItems" in schema and len(value) > int(schema["maxItems"]):
            raise SchemaValidationError(f"{path} has too many items")
        item_schema = schema.get("items") or {}
        for index, item in enumerate(value):
            validate(item, item_schema, f"{path}[{index}]")
    elif expected == "string":
        if not isinstance(value, str):
            raise SchemaValidationError(f"{path} must be a string")
        if "pattern" in schema and not re.search(str(schema["pattern"]), value):
            raise SchemaValidationError(f"{path} does not match the required pattern")
        if "minLength" in schema and len(value) < int(schema["minLength"]):
            raise SchemaValidationError(f"{path} is too short")
        if "maxLength" in schema and len(value) > int(schema["maxLength"]):
            raise SchemaValidationError(f"{path} is too long")
    elif expected == "integer":
        if isinstance(value, bool) or not isinstance(value, int):
            raise SchemaValidationError(f"{path} must be an integer")
    elif expected == "number":
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise SchemaValidationError(f"{path} must be a number")
    elif expected == "boolean":
        if not isinstance(value, bool):
            raise SchemaValidationError(f"{path} must be a boolean")
    elif expected == "null":
        if value is not None:
            raise SchemaValidationError(f"{path} must be null")
    if "enum" in schema and value not in schema["enum"]:
        raise SchemaValidationError(f"{path} must be one of {schema['enum']}")
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in schema and value < schema["minimum"]:
            raise SchemaValidationError(f"{path} is below minimum")
        if "maximum" in schema and value > schema["maximum"]:
            raise SchemaValidationError(f"{path} is above maximum")
