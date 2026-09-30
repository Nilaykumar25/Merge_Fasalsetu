"""
Assumptions builder — Task 1 stub.
Full implementation in Task 3.
estimated is always True (product rule 2).
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def build_assumptions(pack, price_observed_at: datetime | None = None) -> dict[str, Any]:
    """
    Build the assumptions sub-object that goes into every revenue payload.
    Always sets estimated=True.
    """
    return {
        "price_source":      pack.raw.get("market", {}).get("price_source", {}).get("name", "unknown"),
        "price_observed_at": (price_observed_at or datetime.now(timezone.utc)).isoformat(),
        "yield_baseline":    "stub — full formula in Task 3",
        "risk_discount_rate": pack.risk_discount_rate,
        "estimated":         True,
    }
