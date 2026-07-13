from __future__ import annotations

import unittest

from newsroom.core.registry import Registry


class RegistryTests(unittest.TestCase):
    def test_canonical_counts_and_authority(self) -> None:
        registry = Registry()
        self.assertEqual(26, len(registry.agents))
        self.assertEqual(9, len(registry.persona_ids()))
        self.assertEqual(list(range(1, 13)), sorted(registry.checkpoints))
        self.assertTrue(all(not agent.public_side_effects for agent in registry.agents.values()))

    def test_every_checkpoint_has_valid_owner(self) -> None:
        registry = Registry()
        for number, checkpoint in registry.checkpoints.items():
            if checkpoint.owner == "persona":
                self.assertEqual(5, number)
            else:
                self.assertIn(checkpoint.owner, registry.agents)


if __name__ == "__main__":
    unittest.main()
