"""
Router: health check (GET /health).
Ported from legacy/FasalSetu/main.py.
"""
from __future__ import annotations

from fastapi import APIRouter, Request

router = APIRouter(tags=["health"])


@router.get("/health")
def get_health(request: Request):
    """Liveness probe plus which data sources are real vs demo."""
    pack = getattr(request.app.state, "pack", None)
    return {
        "status": "ok",
        "models": {
            "npk":      "stub",
            "disease":  "stub",
            "grading":  "stub",
        },
        "data": {
            "sensor":    "demo",
            "satellite": "simulated",
        },
        "country_pack": pack.code if pack else None,
    }
