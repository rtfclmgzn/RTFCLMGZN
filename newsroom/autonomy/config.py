from __future__ import annotations

import json
import os
import re
import sys
from copy import deepcopy
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


class ConfigError(RuntimeError):
    pass


ALLOWED_MODES = {"off", "draft_only", "approval_required", "bounded_autopublish"}
_TRUE_FALSE = (True, False)
_GRAPH_VERSION_RE = re.compile(r"^v\d+\.\d+$")


def user_config_path() -> Path:
    if os.name == "nt":
        base = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local"))
    elif sys.platform == "darwin":
        base = Path.home() / "Library" / "Application Support"
    else:
        base = Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config"))
    path = base / "RTFCLMGZN" / "autonomy.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def default_config_path() -> Path:
    return Path(__file__).resolve().parents[1] / "config" / "autonomy.default.json"


def _load_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text("utf-8"))
    except FileNotFoundError as exc:
        raise ConfigError(f"Configuration file not found: {path}") from exc
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ConfigError(f"Invalid JSON in {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise ConfigError(f"Configuration must be a JSON object: {path}")
    return value


def _deep_merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    result = deepcopy(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = deepcopy(value)
    return result


def _number(value: Any, field: str, minimum: float, maximum: float) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ConfigError(f"{field} must be a number")
    number = float(value)
    if not minimum <= number <= maximum:
        raise ConfigError(f"{field} must be between {minimum} and {maximum}")
    return number


def _integer(value: Any, field: str, minimum: int, maximum: int) -> int:
    number = _number(value, field, minimum, maximum)
    if not number.is_integer():
        raise ConfigError(f"{field} must be an integer")
    return int(number)


def _boolean(value: Any, field: str) -> bool:
    if value not in _TRUE_FALSE:
        raise ConfigError(f"{field} must be true or false")
    return bool(value)


def _nonempty_string(value: Any, field: str, maximum: int = 500) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ConfigError(f"{field} must be a non-empty string")
    if len(value.strip()) > maximum:
        raise ConfigError(f"{field} must be at most {maximum} characters")
    return value.strip()


def _https_url(value: Any, field: str) -> str:
    text = _nonempty_string(value, field, 2000)
    parsed = urlparse(text)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ConfigError(f"{field} must be an HTTPS URL without embedded credentials")
    return text


def _string_list(value: Any, field: str, *, allow_empty: bool = True) -> list[str]:
    if not isinstance(value, list) or (not allow_empty and not value):
        qualifier = "a non-empty" if not allow_empty else "an"
        raise ConfigError(f"{field} must be {qualifier} array")
    if not all(isinstance(item, str) and item.strip() for item in value):
        raise ConfigError(f"{field} must contain only non-empty strings")
    return [item.strip() for item in value]


def _validate_iso_timestamp(value: Any, field: str) -> str:
    text = _nonempty_string(value, field, 80)
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ConfigError(f"{field} must be an ISO-8601 timestamp") from exc
    if parsed.tzinfo is None:
        raise ConfigError(f"{field} must include a timezone")
    return text


def validate_config(config: dict[str, Any]) -> dict[str, Any]:
    """Validate the complete effective autonomy configuration.

    Validation is intentionally strict and fail-closed. A malformed or ambiguous
    setting must not silently widen publication or distribution authority.
    """

    if config.get("schema_version") != 1:
        raise ConfigError("Unsupported autonomy configuration schema")
    mode = config.get("mode")
    if mode not in ALLOWED_MODES:
        raise ConfigError(f"mode must be one of: {', '.join(sorted(ALLOWED_MODES))}")
    _https_url(config.get("site_url"), "site_url")
    _nonempty_string(config.get("owner_name"), "owner_name", 120)

    providers = config.get("providers")
    if not isinstance(providers, dict):
        raise ConfigError("providers must be an object")
    priority = _string_list(providers.get("priority"), "providers.priority", allow_empty=False)
    if len(priority) != len(set(priority)):
        raise ConfigError("providers.priority may not contain duplicates")
    for provider_name in priority:
        if provider_name not in {"openai", "gemini"}:
            raise ConfigError(f"Unsupported provider in priority list: {provider_name}")
    for provider_name in ("openai", "gemini"):
        provider = providers.get(provider_name)
        if not isinstance(provider, dict):
            raise ConfigError(f"providers.{provider_name} must be an object")
        _boolean(provider.get("enabled"), f"providers.{provider_name}.enabled")
        endpoint = _https_url(provider.get("endpoint"), f"providers.{provider_name}.endpoint")
        endpoint_host = (urlparse(endpoint).hostname or "").lower()
        expected_host = {
            "openai": "api.openai.com",
            "gemini": "generativelanguage.googleapis.com",
        }[provider_name]
        if endpoint_host != expected_host:
            raise ConfigError(
                f"providers.{provider_name}.endpoint must use the official {expected_host} host"
            )
        _boolean(provider.get("store"), f"providers.{provider_name}.store")
        models = provider.get("models")
        if not isinstance(models, dict) or not models:
            raise ConfigError(f"providers.{provider_name}.models must be an object")
        if not all(
            isinstance(key, str)
            and key.strip()
            and isinstance(value, str)
            and value.strip()
            for key, value in models.items()
        ):
            raise ConfigError(f"providers.{provider_name}.models contains an invalid mapping")
        reasoning_map = provider.get("reasoning_effort") or {}
        if not isinstance(reasoning_map, dict):
            raise ConfigError(f"providers.{provider_name}.reasoning_effort must be an object")
        allowed_effort = {"none", "minimal", "low", "medium", "high", "xhigh", "max"}
        for profile, effort in reasoning_map.items():
            _nonempty_string(profile, f"providers.{provider_name}.reasoning profile", 120)
            if not isinstance(effort, str) or effort not in allowed_effort:
                raise ConfigError(
                    f"providers.{provider_name}.reasoning_effort.{profile} is invalid"
                )
        max_output_tokens = provider.get("max_output_tokens") or {}
        if not isinstance(max_output_tokens, dict):
            raise ConfigError(f"providers.{provider_name}.max_output_tokens must be an object")
        for profile, limit in max_output_tokens.items():
            _nonempty_string(profile, f"providers.{provider_name}.max_output profile", 120)
            _integer(
                limit,
                f"providers.{provider_name}.max_output_tokens.{profile}",
                256,
                128000,
            )
        _integer(
            provider.get("timeout_seconds"),
            f"providers.{provider_name}.timeout_seconds",
            10,
            900,
        )
        _integer(
            provider.get("max_retries"),
            f"providers.{provider_name}.max_retries",
            0,
            8,
        )
        prices = provider.get("pricing_per_million")
        if not isinstance(prices, dict):
            raise ConfigError(f"providers.{provider_name}.pricing_per_million must be an object")
        for model_name, price in prices.items():
            _nonempty_string(model_name, f"providers.{provider_name}.pricing model", 200)
            if not isinstance(price, dict):
                raise ConfigError(
                    f"providers.{provider_name}.pricing_per_million.{model_name} must be an object"
                )
            _number(
                price.get("input"),
                f"providers.{provider_name}.pricing_per_million.{model_name}.input",
                0,
                1000,
            )
            _number(
                price.get("output"),
                f"providers.{provider_name}.pricing_per_million.{model_name}.output",
                0,
                1000,
            )
        _number(
            provider.get("web_search_per_call"),
            f"providers.{provider_name}.web_search_per_call",
            0,
            10,
        )

    schedule = config.get("schedule")
    if not isinstance(schedule, dict):
        raise ConfigError("schedule must be an object")
    _boolean(schedule.get("enabled"), "schedule.enabled")
    _boolean(schedule.get("run_on_start"), "schedule.run_on_start")
    _integer(schedule.get("interval_minutes"), "schedule.interval_minutes", 30, 1440)
    quiet = schedule.get("quiet_hours_utc")
    if not isinstance(quiet, dict):
        raise ConfigError("schedule.quiet_hours_utc must be an object")
    _integer(quiet.get("start"), "schedule.quiet_hours_utc.start", 0, 23)
    _integer(quiet.get("end"), "schedule.quiet_hours_utc.end", 0, 23)

    limits = config.get("limits")
    if not isinstance(limits, dict):
        raise ConfigError("limits must be an object")
    integer_limits = {
        "stories_per_cycle": (1, 10),
        "stories_per_day": (1, 30),
        "candidates_per_cycle": (1, 50),
        "provider_calls_per_cycle": (1, 100),
        "web_search_calls_per_cycle": (1, 100),
        "minimum_cycle_spacing_minutes": (0, 1440),
    }
    for field, (minimum, maximum) in integer_limits.items():
        _integer(limits.get(field), f"limits.{field}", minimum, maximum)
    _number(limits.get("daily_budget_usd"), "limits.daily_budget_usd", 0, 1000)
    _number(limits.get("monthly_budget_usd"), "limits.monthly_budget_usd", 0, 10000)
    if int(limits["stories_per_cycle"]) > int(limits["stories_per_day"]):
        raise ConfigError("limits.stories_per_cycle may not exceed stories_per_day")
    if float(limits["daily_budget_usd"]) > float(limits["monthly_budget_usd"]):
        raise ConfigError("limits.daily_budget_usd may not exceed monthly_budget_usd")

    batch = config.get("batch")
    if not isinstance(batch, dict):
        raise ConfigError("batch must be an object")
    _boolean(batch.get("enabled"), "batch.enabled")
    _integer(batch.get("scan_interval_minutes"), "batch.scan_interval_minutes", 60, 1440)
    _integer(batch.get("maximum_stories_per_scan"), "batch.maximum_stories_per_scan", 0, 3)
    _integer(batch.get("research_articles_per_week"), "batch.research_articles_per_week", 0, 7)
    _number(batch.get("budget_reserve_usd"), "batch.budget_reserve_usd", 0, 100)
    for object_name in (
        "minimum_composite_score",
        "daily_lane_caps",
        "estimated_cost_per_story_usd",
        "model_profiles",
    ):
        if not isinstance(batch.get(object_name), dict):
            raise ConfigError(f"batch.{object_name} must be an object")
    for lane in ("brief", "synthesis", "research"):
        _number(
            batch["minimum_composite_score"].get(lane),
            f"batch.minimum_composite_score.{lane}",
            0,
            1,
        )
        _integer(
            batch["daily_lane_caps"].get(lane),
            f"batch.daily_lane_caps.{lane}",
            0,
            30,
        )
        _number(
            batch["estimated_cost_per_story_usd"].get(lane),
            f"batch.estimated_cost_per_story_usd.{lane}",
            0,
            100,
        )
        for stage in ("compose", "review"):
            _nonempty_string(
                batch["model_profiles"].get(f"{lane}_{stage}"),
                f"batch.model_profiles.{lane}_{stage}",
                120,
            )
    source_fetch = batch.get("source_fetch")
    if not isinstance(source_fetch, dict):
        raise ConfigError("batch.source_fetch must be an object")
    _boolean(source_fetch.get("enabled"), "batch.source_fetch.enabled")
    _integer(source_fetch.get("timeout_seconds"), "batch.source_fetch.timeout_seconds", 2, 120)
    _integer(source_fetch.get("max_bytes"), "batch.source_fetch.max_bytes", 16384, 5242880)
    _integer(
        source_fetch.get("max_excerpt_chars"),
        "batch.source_fetch.max_excerpt_chars",
        500,
        20000,
    )
    _number(source_fetch.get("cache_ttl_hours"), "batch.source_fetch.cache_ttl_hours", 0.25, 168)
    _integer(
        source_fetch.get("max_unique_sources_per_cycle"),
        "batch.source_fetch.max_unique_sources_per_cycle",
        2,
        50,
    )
    if int(batch["maximum_stories_per_scan"]) > int(limits["stories_per_cycle"]):
        raise ConfigError("batch.maximum_stories_per_scan may not exceed limits.stories_per_cycle")

    editorial = config.get("editorial")
    if not isinstance(editorial, dict):
        raise ConfigError("editorial must be an object")
    _integer(editorial.get("lookback_hours"), "editorial.lookback_hours", 1, 336)
    for field in (
        "minimum_verification_score",
        "minimum_editorial_score",
        "minimum_confidence_score",
        "maximum_title_similarity",
    ):
        _number(editorial.get(field), f"editorial.{field}", 0, 1)
    for field in ("minimum_sources", "minimum_independent_sources", "minimum_primary_sources", "minimum_fetched_sources"):
        _integer(editorial.get(field), f"editorial.{field}", 0, 20)
    if int(editorial["minimum_independent_sources"]) > int(editorial["minimum_sources"]):
        raise ConfigError("editorial.minimum_independent_sources may not exceed minimum_sources")
    if int(editorial["minimum_primary_sources"]) > int(editorial["minimum_sources"]):
        raise ConfigError("editorial.minimum_primary_sources may not exceed minimum_sources")
    if int(editorial["minimum_fetched_sources"]) > int(editorial["minimum_sources"]):
        raise ConfigError("editorial.minimum_fetched_sources may not exceed minimum_sources")
    _boolean(editorial.get("require_published_date"), "editorial.require_published_date")
    _string_list(
        editorial.get("blocked_auto_publish_sections"),
        "editorial.blocked_auto_publish_sections",
    )
    _string_list(
        editorial.get("blocked_auto_publish_topics"),
        "editorial.blocked_auto_publish_topics",
    )

    publication = config.get("publication")
    if not isinstance(publication, dict):
        raise ConfigError("publication must be an object")
    for field in (
        "auto_publish_enabled",
        "require_exact_version_gate",
        "push_to_github",
        "verify_cloudflare",
        "staging_only",
        "require_clean_git_worktree",
    ):
        _boolean(publication.get(field), f"publication.{field}")
    if not publication.get("require_exact_version_gate"):
        raise ConfigError("publication.require_exact_version_gate may not be disabled")
    _integer(
        publication.get("maximum_auto_publishes_per_day"),
        "publication.maximum_auto_publishes_per_day",
        0,
        20,
    )
    _integer(
        publication.get("minimum_seconds_between_publishes"),
        "publication.minimum_seconds_between_publishes",
        0,
        86400,
    )
    allowed_risks = _string_list(
        publication.get("allowed_risk_levels"),
        "publication.allowed_risk_levels",
        allow_empty=False,
    )
    if not set(allowed_risks).issubset({"R1", "R2", "R3"}):
        raise ConfigError("publication.allowed_risk_levels contains an invalid risk level")
    preauthorization = publication.get("owner_preauthorization")
    if not isinstance(preauthorization, dict):
        raise ConfigError("publication.owner_preauthorization must be an object")
    _boolean(preauthorization.get("enabled"), "publication.owner_preauthorization.enabled")
    _nonempty_string(preauthorization.get("owner"), "publication.owner_preauthorization.owner", 120)
    _nonempty_string(
        preauthorization.get("policy_version"),
        "publication.owner_preauthorization.policy_version",
        120,
    )
    _integer(
        preauthorization.get("max_age_hours"),
        "publication.owner_preauthorization.max_age_hours",
        1,
        8760,
    )
    _integer(
        publication.get("minimum_owner_approved_releases_before_autopublish"),
        "publication.minimum_owner_approved_releases_before_autopublish",
        0,
        1000,
    )

    if publication.get("auto_publish_enabled") and mode != "bounded_autopublish":
        raise ConfigError("publication.auto_publish_enabled is valid only in bounded_autopublish mode")
    if mode == "bounded_autopublish":
        if not publication.get("auto_publish_enabled"):
            raise ConfigError(
                "bounded_autopublish requires publication.auto_publish_enabled=true"
            )
        if not preauthorization.get("enabled"):
            raise ConfigError(
                "bounded_autopublish requires explicit owner preauthorization"
            )
        if preauthorization.get("policy_version") != "bounded-publication-v1.0":
            raise ConfigError("bounded autopublish authorization uses an unsupported policy")
        _validate_iso_timestamp(
            preauthorization.get("acknowledged_at"),
            "publication.owner_preauthorization.acknowledged_at",
        )

    distribution = config.get("distribution")
    if not isinstance(distribution, dict):
        raise ConfigError("distribution must be an object")
    for field in (
        "generate_social_drafts",
        "auto_post_meta",
        "auto_post_instagram",
        "auto_post_x",
        "queue_only_until_published",
        "dispatch_after_publish",
    ):
        _boolean(distribution.get(field), f"distribution.{field}")
    _integer(
        distribution.get("maximum_posts_per_channel_per_day"),
        "distribution.maximum_posts_per_channel_per_day",
        0,
        100,
    )
    graph_version = _nonempty_string(
        distribution.get("meta_graph_version"), "distribution.meta_graph_version", 30
    )
    if not _GRAPH_VERSION_RE.fullmatch(graph_version):
        raise ConfigError("distribution.meta_graph_version must look like v25.0")
    meta_graph_base = _https_url(
        distribution.get("meta_graph_base"), "distribution.meta_graph_base"
    )
    if (urlparse(meta_graph_base).hostname or "").lower() != "graph.facebook.com":
        raise ConfigError("distribution.meta_graph_base must use graph.facebook.com")
    if distribution.get("auto_post_x"):
        raise ConfigError("X auto-posting is not implemented; leave auto_post_x=false")

    observability = config.get("observability")
    if not isinstance(observability, dict):
        raise ConfigError("observability must be an object")
    level = _nonempty_string(observability.get("log_level"), "observability.log_level", 20)
    if level.upper() not in {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}:
        raise ConfigError("observability.log_level is invalid")
    _integer(observability.get("retain_days"), "observability.retain_days", 1, 3650)
    for field in ("redact_prompts", "record_provider_payloads", "audit_provider_calls"):
        _boolean(observability.get(field), f"observability.{field}")

    return config


def load_config(path: Path | None = None) -> dict[str, Any]:
    base = _load_json(default_config_path())
    override_path = path or user_config_path()
    override = _load_json(override_path) if override_path.exists() else {}
    merged = _deep_merge(base, override)
    return validate_config(merged)


def save_user_config(config: dict[str, Any], path: Path | None = None) -> Path:
    validated = validate_config(config)
    target = path or user_config_path()
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix(target.suffix + ".tmp")
    temporary.write_text(json.dumps(validated, indent=2, ensure_ascii=False) + "\n", "utf-8")
    os.replace(temporary, target)
    return target
