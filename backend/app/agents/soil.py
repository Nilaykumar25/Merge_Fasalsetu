"""
Soil / NPK Agent — Task 1 stub.
Preserves the public signatures predict_npk() and get_soil_health_report()
ported from legacy/FasalSetu/agents/soil_agent.py.
Full wiring with revenue layer in Task 2.
"""
from __future__ import annotations

import logging
from typing import Any

from backend.app.agents.base import BaseAgent, Candidate

logger = logging.getLogger("agents.soil")


# ── Public helper signatures preserved from legacy ─────────────────────────

def predict_npk(
    soil_conductivity: float,
    soil_humidity: float,
    soil_pH: float,
    soil_temperature: float,
    hour: int = 12,
    day_of_year: int = 180,
) -> dict[str, Any]:
    """
    Predict soil NPK levels from sensor readings.
    Preserved signature from legacy/FasalSetu/agents/soil_agent.py.
    Returns stub values until model artefacts are loaded (Task 2).
    """
    return {
        "nitrogen":   {"value": None, "unit": "mg/kg", "status": "unknown"},
        "phosphorus": {"value": None, "unit": "mg/kg", "status": "unknown"},
        "potassium":  {"value": None, "unit": "mg/kg", "status": "unknown"},
        "confidence": "model not loaded — run training script",
        "recommendation": "Model artefacts missing. Consult local KVK.",
    }


def get_soil_health_report(
    soil_conductivity: float,
    soil_humidity: float,
    soil_pH: float,
    soil_temperature: float,
    crop: str = "general",
    hour: int = 12,
    day_of_year: int = 180,
) -> dict[str, Any]:
    """
    Full soil health report.  Preserved signature from legacy.
    """
    npk = predict_npk(soil_conductivity, soil_humidity, soil_pH, soil_temperature, hour, day_of_year)
    return {
        "npk": npk,
        "ph_advice": "pH check not available — model not loaded.",
        "salinity_note": "Conductivity within submitted range.",
        "crop_tip": f"Consult your local KVK for {crop}-specific advice.",
        "kvk_referral": False,
    }


# ── Agent class ────────────────────────────────────────────────────────────

class SoilAgent(BaseAgent):
    """
    Wraps legacy soil logic.  Returns a do_nothing Candidate until Task 2 wiring.
    """

    def run(self, context: dict) -> list[Candidate]:
        return [
            Candidate(
                category="do_nothing",
                agent="soil",
                is_do_nothing=True,
                template_key="do_nothing",
                source="simulated",
            )
        ]
