"""
Disease Agent — Task 1 stub.
Preserves detect_crop_disease() and get_disease_info() signatures
ported from legacy/FasalSetu/agents/disease_agent.py.
EfficientNet-B0 model artefacts loaded lazily in Task 5.
"""
from __future__ import annotations

import logging
from typing import Any

from backend.app.agents.base import BaseAgent, Candidate

logger = logging.getLogger("agents.disease")


def detect_crop_disease(image_path: str) -> dict[str, Any]:
    """Stub. Model artefacts not yet loaded."""
    return {
        "disease": "unknown",
        "confidence": 0.0,
        "treatment": {"organic": "", "chemical": "", "prevention": ""},
        "urgent": False,
        "note": "Disease model not loaded — train EfficientNet-B0 first.",
    }


def get_disease_info(disease_name: str) -> dict[str, Any]:
    """Stub."""
    return {
        "disease": disease_name,
        "treatment": {
            "organic": "Consult local KVK.",
            "chemical": "Consult local KVK.",
            "prevention": "Maintain crop hygiene.",
        },
        "source": "stub",
    }


class DiseaseAgent(BaseAgent):
    def run(self, context: dict) -> list[Candidate]:
        return [
            Candidate(
                category="do_nothing",
                agent="disease",
                is_do_nothing=True,
                template_key="do_nothing",
                source="simulated",
            )
        ]
