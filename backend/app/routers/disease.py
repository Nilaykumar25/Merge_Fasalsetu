"""
Router: disease detection via Gemini Vision
  POST /disease/detect  — accepts multipart image, returns structured diagnosis
"""
from __future__ import annotations

import base64
import json
import logging

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from backend.app.core import config

logger = logging.getLogger("routers.disease")
router = APIRouter(prefix="/disease", tags=["disease"])


class DiseaseResult(BaseModel):
    raw_class:   str
    disease:     str
    is_healthy:  bool
    confidence:  float          # 0.0 – 1.0
    treatment:   str
    organic_alternative: str
    model_used:  str
    crop_type:   str


@router.post("/detect")
async def detect_disease(file: UploadFile = File(...)):
    """
    Accept a crop/leaf image and return a structured disease diagnosis
    powered by Gemini Vision (gemini-2.0-flash).
    Falls back to a demo result if the API key is unavailable.
    """
    # ── Read image bytes ─────────────────────────────────────────────────
    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(status_code=413, detail="Image too large (max 10 MB)")

    mime_type = file.content_type or "image/jpeg"
    image_b64 = base64.b64encode(image_bytes).decode()

    # ── Try Gemini Vision ────────────────────────────────────────────────
    try:
        import google.generativeai as genai
        genai.configure(api_key=config.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.0-flash")

        prompt = """You are an expert plant pathologist AI. Analyze this crop/leaf image.

Return ONLY a valid JSON object with these exact keys:
{
  "raw_class": "<PlantName>___<DiseaseName> or <PlantName>___Healthy",
  "disease": "Full disease name or 'Healthy'",
  "is_healthy": true or false,
  "confidence": 0.0 to 1.0,
  "crop_type": "Detected crop name",
  "treatment": "2-3 concise treatment steps as a single string.",
  "organic_alternative": "One organic/biopesticide alternative if applicable, else empty string"
}

Rules:
- If the plant looks healthy, set is_healthy=true, disease="Healthy"
- confidence reflects how certain you are (0.95 = very certain)
- treatment should be actionable for an Indian farmer
- Do not include markdown, only raw JSON"""

        response = model.generate_content([
            prompt,
            {"mime_type": mime_type, "data": image_b64},
        ])

        text = response.text.strip()
        # Strip markdown code fences if present
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()

        data = json.loads(text)
        data["model_used"] = "Gemini Vision (gemini-2.0-flash)"
        return data

    except json.JSONDecodeError as exc:
        logger.error("Gemini returned non-JSON: %s", exc)
        return _demo_result("Could not parse Gemini response")
    except Exception as exc:
        logger.warning("Gemini Vision failed: %s", exc)
        return _demo_result(str(exc))


def _demo_result(note: str = "") -> dict:
    return {
        "raw_class":           "Unknown___Unknown",
        "disease":             "Analysis unavailable",
        "is_healthy":          False,
        "confidence":          0.0,
        "crop_type":           "Unknown",
        "treatment":           "Could not analyse image. Please ensure good lighting and a clear view of the leaf. Try again or consult your local KVK.",
        "organic_alternative": "",
        "model_used":          f"Fallback ({note[:80]})" if note else "Fallback",
    }
