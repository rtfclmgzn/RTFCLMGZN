from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


class RegistryError(RuntimeError):
    pass


@dataclass(frozen=True)
class Agent:
    id: str
    name: str
    agent_class: str
    responsibility: str
    checkpoints: tuple[int, ...]
    output_contract: str
    capability_profile: str
    status: str
    public_side_effects: bool
    beat: str | None = None


@dataclass(frozen=True)
class Checkpoint:
    number: int
    id: str
    name: str
    owner: str
    artifact_type: str
    status: str
    next_status: str
    requires_owner_approval: bool = False


class Registry:
    def __init__(self, root: Path | None = None):
        self.root = root or Path(__file__).resolve().parents[1] / "registry"
        self.agent_document = self._load_json(self.root / "agents.json")
        self.workflow_document = self._load_json(self.root / "workflow.json")
        self.agents = self._parse_agents(self.agent_document)
        self.checkpoints = self._parse_checkpoints(self.workflow_document)
        self._validate()

    @staticmethod
    def _load_json(path: Path) -> dict[str, Any]:
        try:
            value = json.loads(path.read_text("utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RegistryError(f"Could not load registry file {path}: {exc}") from exc
        if not isinstance(value, dict):
            raise RegistryError(f"Registry file {path} must contain an object")
        return value

    @staticmethod
    def _parse_agents(document: dict[str, Any]) -> dict[str, Agent]:
        result: dict[str, Agent] = {}
        for raw in document.get("agents", []):
            agent = Agent(
                id=str(raw["id"]),
                name=str(raw["name"]),
                agent_class=str(raw["class"]),
                responsibility=str(raw["responsibility"]),
                checkpoints=tuple(int(v) for v in raw.get("checkpoints", [])),
                output_contract=str(raw["output_contract"]),
                capability_profile=str(raw["capability_profile"]),
                status=str(raw.get("status", "active")),
                public_side_effects=bool(raw.get("public_side_effects", False)),
                beat=str(raw["beat"]) if raw.get("beat") else None,
            )
            if agent.id in result:
                raise RegistryError(f"Duplicate agent ID: {agent.id}")
            result[agent.id] = agent
        return result

    @staticmethod
    def _parse_checkpoints(document: dict[str, Any]) -> dict[int, Checkpoint]:
        result: dict[int, Checkpoint] = {}
        for raw in document.get("checkpoints", []):
            checkpoint = Checkpoint(
                number=int(raw["number"]),
                id=str(raw["id"]),
                name=str(raw["name"]),
                owner=str(raw["owner"]),
                artifact_type=str(raw["artifact_type"]),
                status=str(raw["status"]),
                next_status=str(raw["next_status"]),
                requires_owner_approval=bool(raw.get("requires_owner_approval", False)),
            )
            if checkpoint.number in result:
                raise RegistryError(f"Duplicate checkpoint: {checkpoint.number}")
            result[checkpoint.number] = checkpoint
        return result

    def _validate(self) -> None:
        expected = int(self.agent_document.get("canonical_agent_count", -1))
        if len(self.agents) != expected or expected != 26:
            raise RegistryError(
                f"Canonical registry must contain exactly 26 agents; found {len(self.agents)}"
            )
        personas = [a for a in self.agents.values() if a.agent_class == "persona"]
        expected_personas = int(self.agent_document.get("persona_count", -1))
        if len(personas) != expected_personas or expected_personas != 9:
            raise RegistryError(
                f"Canonical registry must contain exactly 9 personas; found {len(personas)}"
            )
        if sorted(self.checkpoints) != list(range(1, 13)):
            raise RegistryError("Workflow registry must define checkpoints 1 through 12")
        for agent in self.agents.values():
            for number in agent.checkpoints:
                if number not in self.checkpoints:
                    raise RegistryError(
                        f"Agent {agent.id} references unknown checkpoint {number}"
                    )
            if agent.public_side_effects:
                raise RegistryError(
                    f"Agent {agent.id} violates v0 authority policy: public side effects are forbidden"
                )
        for checkpoint in self.checkpoints.values():
            if checkpoint.owner != "persona" and checkpoint.owner not in self.agents:
                raise RegistryError(
                    f"Checkpoint {checkpoint.number} references unknown owner {checkpoint.owner}"
                )

    def persona_ids(self) -> list[str]:
        return sorted(a.id for a in self.agents.values() if a.agent_class == "persona")

    def agent_for_checkpoint(self, number: int, persona_id: str | None = None) -> Agent:
        checkpoint = self.checkpoints[number]
        owner = persona_id if checkpoint.owner == "persona" else checkpoint.owner
        if not owner or owner not in self.agents:
            raise RegistryError(
                f"Checkpoint {number} requires a valid persona; received {persona_id!r}"
            )
        agent = self.agents[owner]
        if number not in agent.checkpoints:
            raise RegistryError(f"Agent {agent.id} is not allowed at checkpoint {number}")
        return agent

    def public_payload(self) -> dict[str, Any]:
        return {
            "registry_version": self.agent_document["registry_version"],
            "workflow_version": self.workflow_document["workflow_version"],
            "agent_count": len(self.agents),
            "persona_count": len(self.persona_ids()),
            "agents": [
                {
                    "id": a.id,
                    "name": a.name,
                    "class": a.agent_class,
                    "beat": a.beat,
                    "responsibility": a.responsibility,
                    "checkpoints": list(a.checkpoints),
                    "capability_profile": a.capability_profile,
                    "status": a.status,
                }
                for a in self.agents.values()
            ],
            "checkpoints": [
                {
                    "number": c.number,
                    "id": c.id,
                    "name": c.name,
                    "owner": c.owner,
                    "status": c.status,
                    "requires_owner_approval": c.requires_owner_approval,
                }
                for c in self.checkpoints.values()
            ],
        }
