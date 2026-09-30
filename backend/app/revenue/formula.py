"""
Revenue formula — Task 1 stub.
Returns net_impact=0, is_do_nothing=True for all candidates.
Full implementation in Task 3.
Gemini is never called from this module (product rule 3, conflict C-1 fix).
"""
from __future__ import annotations

from backend.app.agents.base import Candidate


def apply_revenue(candidate: Candidate, plot: dict, pack) -> Candidate:  # type: ignore[type-arg]
    """
    Attach money impact to a Candidate.
    Task 1 stub: net_impact=0, is_do_nothing=True.
    """
    return candidate.__class__(
        category=candidate.category,
        agent=candidate.agent,
        is_do_nothing=True,
        net_impact=0.0,
        loss_if_ignored=None,
        confidence=candidate.confidence,
        currency=pack.currency,
        template_key=candidate.template_key,
        params=candidate.params,
        act_by=candidate.act_by,
        reference=candidate.reference,
        source=candidate.source,
        meta=candidate.meta,
    )
