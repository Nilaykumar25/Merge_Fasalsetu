"""
Scheme Agent — Task 1 stub.
Preserves find_govt_schemes() signature ported from
legacy/FasalSetu/agents/scheme_agent.py.
ChromaDB wiring in Task 4.
"""
from __future__ import annotations

import logging
from typing import Any

from backend.app.agents.base import BaseAgent, Candidate

logger = logging.getLogger("agents.scheme")


def find_govt_schemes(query: str, state: str = "general") -> dict[str, Any]:
    """Stub. ChromaDB not yet initialised."""
    return {
        "schemes": [],
        "query": query,
        "state": state,
        "note": "Scheme agent stub — seed ChromaDB to enable.",
    }


class SchemeAgent(BaseAgent):
    def run(self, context: dict) -> list[Candidate]:
        return [
            Candidate(
                category="do_nothing",
                agent="scheme",
                is_do_nothing=True,
                template_key="do_nothing",
                source="simulated",
            )
        ]
