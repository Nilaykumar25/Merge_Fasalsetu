"""
Weather Agent — Task 1 stub.
Preserves the public signatures get_weather_forecast(), check_spray_conditions(),
get_farming_weather_advice(), get_detailed_forecast() ported from
legacy/FasalSetu/agents/weather_agent.py.
Full wiring in Task 2.
"""
from __future__ import annotations

import logging
from typing import Any

from backend.app.agents.base import BaseAgent, Candidate

logger = logging.getLogger("agents.weather")


# ── Public helper signatures preserved from legacy ─────────────────────────

def get_weather_forecast(location: str) -> dict[str, Any]:
    """Stub. Returns seasonal estimate placeholder."""
    return {
        "location": location,
        "source": "stub",
        "temperature_c": None,
        "humidity_pct": None,
        "wind_speed_kmh": None,
        "rain_expected": None,
        "note": "Weather agent stub — add OPENWEATHER_API_KEY for live data.",
    }


def check_spray_conditions(location: str) -> dict[str, Any]:
    """Stub."""
    return {
        "location": location,
        "safe_to_spray": None,
        "verdict": "Unknown — weather agent stub.",
        "reasons": ["Live weather unavailable."],
    }


def get_farming_weather_advice(location: str, crop: str = "general") -> dict[str, Any]:
    """Stub."""
    return {
        "location": location,
        "crop": crop,
        "weather": get_weather_forecast(location),
        "actions": ["Weather agent stub — no advice available yet."],
    }


def get_detailed_forecast(location: str, days: int = 5) -> dict[str, Any]:
    """Stub."""
    return {
        "location": location,
        "forecast_days": 0,
        "forecast": [],
        "note": "Weather agent stub.",
    }


# ── Agent class ────────────────────────────────────────────────────────────

class WeatherAgent(BaseAgent):
    def run(self, context: dict) -> list[Candidate]:
        return [
            Candidate(
                category="do_nothing",
                agent="weather",
                is_do_nothing=True,
                template_key="do_nothing",
                source="simulated",
            )
        ]
