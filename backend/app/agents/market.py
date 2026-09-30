"""
Market Agent — Task 1 stub.
Preserves get_market_prices() and list_supported_crops() signatures
ported from legacy/FasalSetu/agents/market_agent.py.
"""
from __future__ import annotations

import logging
from typing import Any

from backend.app.agents.base import BaseAgent, Candidate

logger = logging.getLogger("agents.market")


def get_market_prices(crop: str, state: str = "Maharashtra", city: str = "Pune") -> dict[str, Any]:
    """Stub. Returns placeholder market data."""
    return {
        "crop": crop,
        "market": city,
        "state": state,
        "price": None,
        "unit": "per quintal",
        "msp": None,
        "source": "stub",
        "advice": "Market agent stub — configure price source in pack.",
    }


def list_supported_crops() -> dict[str, Any]:
    """Stub."""
    return {"supported_crops": [], "msp_year": "stub", "note": "Market agent stub."}


class MarketAgent(BaseAgent):
    def run(self, context: dict) -> list[Candidate]:
        return [
            Candidate(
                category="do_nothing",
                agent="market",
                is_do_nothing=True,
                template_key="do_nothing",
                source="api",
            )
        ]
