from __future__ import annotations

import getpass
import json
import os
from copy import deepcopy
from pathlib import Path
from typing import Any, Callable

from ..core.contracts import utc_now
from ..security.vault import CredentialVault, VaultError
from .config import load_config, save_user_config
from .policy import POLICY_VERSION


class WizardError(RuntimeError):
    pass


AUTOPUBLISH_PHRASE = (
    "I AUTHORIZE BOUNDED AUTOPUBLISH UNDER POLICY " + POLICY_VERSION
)


def _yes_no(
    prompt: str,
    *,
    default: bool,
    input_fn: Callable[[str], str],
) -> bool:
    suffix = " [Y/n] " if default else " [y/N] "
    while True:
        value = input_fn(prompt + suffix).strip().lower()
        if not value:
            return default
        if value in {"y", "yes"}:
            return True
        if value in {"n", "no"}:
            return False


def _integer(
    prompt: str,
    *,
    default: int,
    minimum: int,
    maximum: int,
    input_fn: Callable[[str], str],
) -> int:
    while True:
        value = input_fn(f"{prompt} [{default}]: ").strip()
        if not value:
            return default
        try:
            number = int(value)
        except ValueError:
            continue
        if minimum <= number <= maximum:
            return number


def _money(
    prompt: str,
    *,
    default: float,
    minimum: float,
    maximum: float,
    input_fn: Callable[[str], str],
) -> float:
    while True:
        value = input_fn(f"{prompt} [{default:.2f}]: ").strip()
        if not value:
            return float(default)
        try:
            number = float(value)
        except ValueError:
            continue
        if minimum <= number <= maximum:
            return round(number, 2)


def _mode(input_fn: Callable[[str], str]) -> str:
    print(
        "\nOperating mode:\n"
        "  1. Off — no model cycles\n"
        "  2. Draft only — research and draft; never package or publish\n"
        "  3. Approval required — prepare owner review queue\n"
        "  4. Bounded autopublish — only R1 stories passing every deterministic gate\n"
    )
    mapping = {
        "1": "off",
        "2": "draft_only",
        "3": "approval_required",
        "4": "bounded_autopublish",
    }
    while True:
        selected = input_fn("Choose 1-4 [2]: ").strip() or "2"
        if selected in mapping:
            return mapping[selected]


def run_configuration_wizard(
    *,
    config_path: Path | None = None,
    vault: CredentialVault | None = None,
    input_fn: Callable[[str], str] = input,
    secret_fn: Callable[[str], str] = getpass.getpass,
    output_fn: Callable[[str], None] = print,
) -> dict[str, Any]:
    """Configure providers and bounded autonomy without writing secrets to Git."""

    config = deepcopy(load_config(config_path))
    credential_vault = vault or CredentialVault()
    output_fn("RTFCLMGZN Autopilot configuration")
    output_fn("Credentials are stored outside the repository. On Windows they are DPAPI-encrypted.")

    current = credential_vault.available()
    for key_name, label in (
        ("openai_api_key", "OpenAI API key"),
        ("gemini_api_key", "Gemini API key"),
    ):
        configured = bool(current.get(key_name))
        prompt = f"{label} ({'configured; Enter keeps it' if configured else 'optional; Enter skips'}): "
        value = secret_fn(prompt).strip()
        if value:
            try:
                credential_vault.set(key_name, value)
            except VaultError as exc:
                raise WizardError(str(exc)) from exc

    available = credential_vault.available()
    if not (available.get("openai_api_key") or available.get("gemini_api_key")):
        output_fn("No provider key is configured. The platform can still install, but cycles will remain blocked.")

    priority: list[str] = []
    if available.get("openai_api_key") and available.get("gemini_api_key"):
        prefer_openai = _yes_no(
            "Prefer OpenAI first and use Gemini as failover?",
            default=True,
            input_fn=input_fn,
        )
        priority = ["openai", "gemini"] if prefer_openai else ["gemini", "openai"]
    elif available.get("openai_api_key"):
        priority = ["openai", "gemini"]
    elif available.get("gemini_api_key"):
        priority = ["gemini", "openai"]
    else:
        priority = list(config["providers"]["priority"])
    config["providers"]["priority"] = priority

    mode = _mode(input_fn)
    config["mode"] = mode
    config["limits"]["stories_per_cycle"] = _integer(
        "Maximum stories prepared per cycle",
        default=int(config["limits"]["stories_per_cycle"]),
        minimum=1,
        maximum=5,
        input_fn=input_fn,
    )
    config["limits"]["stories_per_day"] = _integer(
        "Maximum stories prepared per UTC day",
        default=int(config["limits"]["stories_per_day"]),
        minimum=1,
        maximum=20,
        input_fn=input_fn,
    )
    config["limits"]["daily_budget_usd"] = _money(
        "Hard daily model budget in USD",
        default=float(config["limits"]["daily_budget_usd"]),
        minimum=0.01,
        maximum=1000,
        input_fn=input_fn,
    )
    config["limits"]["monthly_budget_usd"] = _money(
        "Hard monthly model budget in USD",
        default=max(
            float(config["limits"]["monthly_budget_usd"]),
            float(config["limits"]["daily_budget_usd"]),
        ),
        minimum=float(config["limits"]["daily_budget_usd"]),
        maximum=10000,
        input_fn=input_fn,
    )

    schedule_enabled = mode != "off" and _yes_no(
        "Create/enable a scheduled cycle after configuration?",
        default=False,
        input_fn=input_fn,
    )
    config["schedule"]["enabled"] = schedule_enabled
    if schedule_enabled:
        config["schedule"]["interval_minutes"] = _integer(
            "Scheduled interval in minutes",
            default=int(config["schedule"]["interval_minutes"]),
            minimum=60,
            maximum=1440,
            input_fn=input_fn,
        )

    publication = config["publication"]
    publication["auto_publish_enabled"] = False
    publication["owner_preauthorization"] = {
        "enabled": False,
        "owner": str(config.get("owner_name") or "0baak"),
        "acknowledged_at": "",
        "policy_version": POLICY_VERSION,
        "max_age_hours": int(
            (publication.get("owner_preauthorization") or {}).get(
                "max_age_hours", 168
            )
        ),
    }
    if mode == "bounded_autopublish":
        output_fn(
            "\nBounded autopublish can publish only R1 stories that pass all source, claim, "
            "verification, editorial, compliance, budget, rate, Git, and exact-version gates. "
            "Health, Markets, Policy, and configured sensitive topics still require owner review. "
            "At least one successfully published owner-approved Newsroom release is required "
            "before the first automatic release. Authorization expires and must be renewed."
        )
        typed = input_fn(
            "Type the following exact authorization phrase to continue:\n"
            + AUTOPUBLISH_PHRASE
            + "\n> "
        ).strip()
        if typed != AUTOPUBLISH_PHRASE:
            raise WizardError(
                "Authorization phrase did not match. No bounded publication authorization was saved."
            )
        owner = input_fn(
            f"Owner name [{publication['owner_preauthorization']['owner']}]: "
        ).strip() or publication["owner_preauthorization"]["owner"]
        publication["auto_publish_enabled"] = True
        publication["owner_preauthorization"] = {
            "enabled": True,
            "owner": owner[:120],
            "acknowledged_at": utc_now(),
            "policy_version": POLICY_VERSION,
            "max_age_hours": int(
                publication["owner_preauthorization"].get("max_age_hours", 168)
            ),
        }

    # Social connectors are independently gated and remain off unless explicitly
    # requested. Provider configuration alone cannot enable external posting.
    distribution = config["distribution"]
    distribution["auto_post_meta"] = False
    distribution["auto_post_instagram"] = False
    distribution["auto_post_x"] = False
    if _yes_no(
        "Configure optional Meta credentials now? (posting stays disabled)",
        default=False,
        input_fn=input_fn,
    ):
        for key_name, label in (
            ("meta_access_token", "Meta Page access token"),
            ("meta_page_id", "Facebook Page ID"),
            ("instagram_user_id", "Instagram professional account ID"),
        ):
            value = secret_fn(f"{label} (Enter skips): ").strip()
            if value:
                credential_vault.set(key_name, value)
        enable_facebook = _yes_no(
            "Enable verified Facebook Page auto-posting after article publication?",
            default=False,
            input_fn=input_fn,
        )
        enable_instagram = _yes_no(
            "Enable verified Instagram image auto-posting after article publication?",
            default=False,
            input_fn=input_fn,
        )
        distribution["auto_post_meta"] = enable_facebook
        distribution["auto_post_instagram"] = enable_instagram

    target = save_user_config(config, config_path)
    summary = {
        "ok": True,
        "config_path": str(target),
        "mode": config["mode"],
        "schedule_enabled": bool(config["schedule"]["enabled"]),
        "interval_minutes": int(config["schedule"]["interval_minutes"]),
        "provider_priority": list(config["providers"]["priority"]),
        "openai_configured": bool(credential_vault.available().get("openai_api_key")),
        "gemini_configured": bool(credential_vault.available().get("gemini_api_key")),
        "bounded_autopublish_authorized": bool(
            publication["owner_preauthorization"]["enabled"]
        ),
        "daily_budget_usd": float(config["limits"]["daily_budget_usd"]),
        "monthly_budget_usd": float(config["limits"]["monthly_budget_usd"]),
        "meta_auto_post": bool(distribution["auto_post_meta"]),
        "instagram_auto_post": bool(distribution["auto_post_instagram"]),
    }
    output_fn("\nConfiguration saved:\n" + json.dumps(summary, indent=2))
    return summary
