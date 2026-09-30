"""
Do-nothing evaluation — Task 1 stub.
Full implementation in Task 3.
"""
from __future__ import annotations

from backend.app.agents.base import Candidate


def evaluate(candidates: list[Candidate], pack) -> Candidate:  # type: ignore[type-arg]
    """
    If no candidate has net_impact >= do_nothing_threshold, return an
    explicit do_nothing Candidate with loss_if_ignored set.
    Task 1 stub: always returns a do_nothing Candidate.
    """
    return Candidate(
        category="do_nothing",
        agent="orchestrator",
        is_do_nothing=True,
        net_impact=0.0,
        loss_if_ignored=0.0,
        currency=pack.currency,
        template_key="do_nothing",
    )
