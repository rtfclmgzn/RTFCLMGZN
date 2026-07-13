from __future__ import annotations

import copy
import json
import tempfile
import unittest
from pathlib import Path

from newsroom.autonomy.config import (
    ConfigError,
    default_config_path,
    load_config,
    validate_config,
)


def default_config() -> dict:
    return json.loads(default_config_path().read_text("utf-8"))


class AutonomyConfigTests(unittest.TestCase):
    def test_default_is_fail_closed(self) -> None:
        config = validate_config(default_config())
        self.assertEqual("draft_only", config["mode"])
        self.assertFalse(config["schedule"]["enabled"])
        self.assertFalse(config["publication"]["auto_publish_enabled"])
        self.assertFalse(config["publication"]["owner_preauthorization"]["enabled"])
        self.assertFalse(config["distribution"]["auto_post_meta"])
        self.assertFalse(config["distribution"]["auto_post_instagram"])
        self.assertFalse(config["distribution"]["auto_post_x"])

    def test_bounded_mode_requires_explicit_policy_authorization(self) -> None:
        config = default_config()
        config["mode"] = "bounded_autopublish"
        config["publication"]["auto_publish_enabled"] = True
        with self.assertRaisesRegex(ConfigError, "preauthorization"):
            validate_config(config)

        config["publication"]["owner_preauthorization"].update(
            {
                "enabled": True,
                "acknowledged_at": "2026-07-13T12:00:00Z",
                "policy_version": "bounded-publication-v1.0",
            }
        )
        validated = validate_config(config)
        self.assertEqual("bounded_autopublish", validated["mode"])

    def test_provider_and_distribution_endpoints_are_pinned_to_official_hosts(self) -> None:
        config = default_config()
        config["providers"]["openai"]["endpoint"] = "https://example.com/v1/responses"
        with self.assertRaisesRegex(ConfigError, "api.openai.com"):
            validate_config(config)
        config = default_config()
        config["providers"]["gemini"]["endpoint"] = "https://example.com/interactions"
        with self.assertRaisesRegex(ConfigError, "generativelanguage.googleapis.com"):
            validate_config(config)
        config = default_config()
        config["distribution"]["meta_graph_base"] = "https://example.com"
        with self.assertRaisesRegex(ConfigError, "graph.facebook.com"):
            validate_config(config)

    def test_ambiguous_auto_publish_and_x_posting_are_rejected(self) -> None:
        config = default_config()
        config["publication"]["auto_publish_enabled"] = True
        with self.assertRaisesRegex(ConfigError, "bounded_autopublish"):
            validate_config(config)
        config = default_config()
        config["distribution"]["auto_post_x"] = True
        with self.assertRaisesRegex(ConfigError, "not implemented"):
            validate_config(config)

    def test_limits_and_editorial_invariants_are_enforced(self) -> None:
        config = default_config()
        config["limits"]["stories_per_cycle"] = 7
        config["limits"]["stories_per_day"] = 6
        with self.assertRaisesRegex(ConfigError, "may not exceed"):
            validate_config(config)
        config = default_config()
        config["editorial"]["minimum_independent_sources"] = 3
        config["editorial"]["minimum_sources"] = 2
        with self.assertRaisesRegex(ConfigError, "minimum_independent_sources"):
            validate_config(config)

    def test_partial_user_override_merges_without_widening_defaults(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "autonomy.json"
            path.write_text(
                json.dumps(
                    {
                        "schedule": {"interval_minutes": 240},
                        "limits": {"daily_budget_usd": 12.5},
                    }
                ),
                "utf-8",
            )
            config = load_config(path)
            self.assertEqual(240, config["schedule"]["interval_minutes"])
            self.assertFalse(config["schedule"]["enabled"])
            self.assertEqual(12.5, config["limits"]["daily_budget_usd"])
            self.assertFalse(config["publication"]["auto_publish_enabled"])


if __name__ == "__main__":
    unittest.main()
