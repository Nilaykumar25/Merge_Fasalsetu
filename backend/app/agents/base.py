"""
Agent base types.
Every specialist agent returns list[Candidate].
Candidates never talk to a farmer or call delivery directly.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class Candidate:
    """
    A proposed action priced and ranked by the revenue layer.
    Before revenue.apply_revenue() is called, net_impact is None.
    """
    category: str                        # must be a CategoryEnum value
    agent: str                           # must be an AgentEnum value
    is_do_nothing: bool = False

    # Revenue fields — filled by revenue.formula.apply_revenue
    net_impact: Optional[float] = None
    loss_if_ignored: Optional[float] = None
    confidence: float = 1.0
    currency: Optional[str] = None

    # Action descriptor
    template_key: str = "do_nothing"
    params: dict[str, Any] = field(default_factory=dict)
    act_by: Optional[str] = None
    reference: Optional[str] = None

    # Source tag for traceability
    source: Optional[str] = None        # "real" | "simulated" | "api" | ...

    # Pass-through metadata (agents may add arbitrary keys)
    meta: dict[str, Any] = field(default_factory=dict)


class BaseAgent(ABC):
    """
    All specialist agents inherit from this.
    run() returns a list of Candidates; never calls delivery or the LLM directly.
    """

    @abstractmethod
    def run(self, context: dict) -> list[Candidate]:
        """
        Args:
            context: dict containing keys relevant to this agent
                     (plot_id, farm_id, crop, pack, sensor readings, …).
        Returns:
            List of Candidates (may be empty if the agent has nothing to say).
        """
        ...
