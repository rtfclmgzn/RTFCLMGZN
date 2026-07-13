from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ProviderResult:
    content: dict[str, Any]
    provider: str
    model: str
    usage: dict[str, Any]
    publishable: bool


class Provider(ABC):
    """A bounded stage executor.

    Providers return structured artifacts. They never mutate workflow state and never
    perform publication side effects.
    """

    name = "base"

    @abstractmethod
    def execute(
        self,
        *,
        checkpoint: int,
        agent_id: str,
        story: dict[str, Any],
        context: dict[str, Any],
    ) -> ProviderResult:
        raise NotImplementedError
