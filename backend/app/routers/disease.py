"""
Router: disease detection via Gemini Vision
  POST /disease/detect  — accepts multipart image, returns structured diagnosis
  GET  /disease/classes — list all 38 supported PlantVillage disease classes

Uses Gemini Vision with explicit PlantVillage class taxonomy for high accuracy.
The prompt mirrors the EfficientNet-B0 model trained on PlantVillage dataset.
"""
from __future__ import annotations

import base64
import json
import logging

from fastapi import APIRouter, File, HTTPException, UploadFile

from backend.app.core import config

logger = logging.getLogger("routers.disease")
router = APIRouter(prefix="/disease", tags=["disease"])

# ── PlantVillage 38-class taxonomy (same as trained EfficientNet-B0) ─────────
PLANTVILLAGE_CLASSES = [
    "Apple___Apple_scab",
    "Apple___Black_rot",
    "Apple___Cedar_apple_rust",
    "Apple___healthy",
    "Blueberry___healthy",
    "Cherry_(including_sour)___Powdery_mildew",
    "Cherry_(including_sour)___healthy",
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
    "Corn_(maize)___Common_rust_",
    "Corn_(maize)___Northern_Leaf_Blight",
    "Corn_(maize)___healthy",
    "Grape___Black_rot",
    "Grape___Esca_(Black_Measles)",
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",
    "Grape___healthy",
    "Orange___Haunglongbing_(Citrus_greening)",
    "Peach___Bacterial_spot",
    "Peach___healthy",
    "Pepper,_bell___Bacterial_spot",
    "Pepper,_bell___healthy",
    "Potato___Early_blight",
    "Potato___Late_blight",
    "Potato___healthy",
    "Raspberry___healthy",
    "Soybean___healthy",
    "Squash___Powdery_mildew",
    "Strawberry___Leaf_scorch",
    "Strawberry___healthy",
    "Tomato___Bacterial_spot",
    "Tomato___Early_blight",
    "Tomato___Late_blight",
    "Tomato___Leaf_Mold",
    "Tomato___Septoria_leaf_spot",
    "Tomato___Spider_mites Two-spotted_spider_mite",
    "Tomato___Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    "Tomato___Tomato_mosaic_virus",
    "Tomato___healthy",
]

# ── Treatment database (mirrors disease_agent.py) ────────────────────────────
TREATMENTS: dict[str, dict] = {
    "Apple___Apple_scab":             {"treatment": "Apply myclobutanil or captan fungicide at bud break. Remove fallen leaves.", "organic": "Neem oil spray every 7 days. Prune for air circulation.", "prevention": "Use scab-resistant varieties. Rake and destroy fallen leaves."},
    "Apple___Black_rot":              {"treatment": "Prune infected wood 8 inches below canopy. Apply captan fungicide.", "organic": "Copper-based spray. Remove mummified fruit.", "prevention": "Avoid wounds on bark. Remove dead wood promptly."},
    "Apple___Cedar_apple_rust":       {"treatment": "Apply myclobutanil from pink bud stage through petal fall.", "organic": "Sulfur spray during infection periods.", "prevention": "Remove nearby cedar trees. Plant resistant apple varieties."},
    "Cherry_(including_sour)___Powdery_mildew": {"treatment": "Apply sulfur or potassium bicarbonate fungicide.", "organic": "Neem oil or dilute baking soda spray.", "prevention": "Improve air circulation. Avoid overhead irrigation."},
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot": {"treatment": "Apply strobilurin or triazole fungicide at VT-R1 stage.", "organic": "Crop rotation. Remove infected debris.", "prevention": "Plant resistant hybrids. Reduce plant density."},
    "Corn_(maize)___Common_rust_":    {"treatment": "Apply propiconazole or azoxystrobin at first sign.", "organic": "Remove heavily infected leaves.", "prevention": "Plant resistant hybrids. Avoid late sowing."},
    "Corn_(maize)___Northern_Leaf_Blight": {"treatment": "Apply triazole fungicide at tassel stage.", "organic": "Crop rotation. Remove crop debris.", "prevention": "Use resistant varieties. Reduce plant density."},
    "Grape___Black_rot":              {"treatment": "Apply myclobutanil or mancozeb from budbreak. Remove mummified berries.", "organic": "Copper spray early season.", "prevention": "Prune for airflow. Remove infected material immediately."},
    "Grape___Esca_(Black_Measles)":   {"treatment": "No cure — remove infected wood. Apply wound sealant.", "organic": "Trichoderma-based wood protectants.", "prevention": "Avoid large pruning wounds. Disinfect pruning tools."},
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)": {"treatment": "Apply copper fungicide or mancozeb at first sign.", "organic": "Copper hydroxide spray.", "prevention": "Improve canopy airflow. Avoid wetting foliage."},
    "Orange___Haunglongbing_(Citrus_greening)": {"treatment": "No cure — remove and destroy infected trees. Control psyllid vector.", "organic": "Neem oil to manage Asian citrus psyllid.", "prevention": "Use certified disease-free planting material. Manage psyllid populations."},
    "Peach___Bacterial_spot":         {"treatment": "Apply copper bactericide from shuck split through harvest.", "organic": "Copper hydroxide spray.", "prevention": "Plant resistant varieties. Avoid overhead irrigation."},
    "Pepper,_bell___Bacterial_spot":  {"treatment": "Apply copper + mancozeb tank mix. Remove infected plants.", "organic": "Copper spray every 7 days.", "prevention": "Use certified disease-free seed. Avoid working in wet fields."},
    "Potato___Early_blight":          {"treatment": "Apply chlorothalonil or mancozeb every 7–10 days.", "organic": "Neem oil spray. Remove infected lower leaves.", "prevention": "Avoid overhead irrigation. Ensure adequate potassium levels."},
    "Potato___Late_blight":           {"treatment": "Apply metalaxyl + mancozeb or cymoxanil immediately.", "organic": "Copper sulfate spray. Destroy infected plants.", "prevention": "Use certified seed potato. Hill up soil around stems."},
    "Squash___Powdery_mildew":        {"treatment": "Apply sulfur or potassium bicarbonate fungicide.", "organic": "Neem oil or baking soda spray (1 tbsp/liter).", "prevention": "Improve plant spacing. Avoid nitrogen excess."},
    "Strawberry___Leaf_scorch":       {"treatment": "Apply captan or myclobutanil fungicide.", "organic": "Remove infected leaves. Copper spray.", "prevention": "Avoid overhead irrigation. Renovate planting annually."},
    "Tomato___Bacterial_spot":        {"treatment": "Apply copper + mancozeb tank mix every 5–7 days.", "organic": "Copper hydroxide spray.", "prevention": "Use certified disease-free seed. Avoid working in wet conditions."},
    "Tomato___Early_blight":          {"treatment": "Apply azoxystrobin or chlorothalonil fungicide.", "organic": "Neem oil or copper spray. Remove lower infected leaves.", "prevention": "Mulch around base. Rotate crops annually."},
    "Tomato___Late_blight":           {"treatment": "Apply chlorothalonil or mancozeb every 5–7 days.", "organic": "Copper hydroxide spray. Remove infected tissue immediately.", "prevention": "Avoid overhead watering. Plant resistant varieties."},
    "Tomato___Leaf_Mold":             {"treatment": "Apply mancozeb or chlorothalonil fungicide.", "organic": "Improve greenhouse ventilation. Reduce humidity.", "prevention": "Space plants well. Use drip irrigation."},
    "Tomato___Septoria_leaf_spot":    {"treatment": "Apply mancozeb or chlorothalonil at first sign.", "organic": "Copper spray. Remove infected leaves.", "prevention": "Avoid wetting foliage. Rotate crops."},
    "Tomato___Spider_mites Two-spotted_spider_mite": {"treatment": "Apply abamectin or bifenazate miticide. Spray undersides of leaves.", "organic": "Neem oil or insecticidal soap spray.", "prevention": "Maintain adequate soil moisture. Avoid dusty conditions."},
    "Tomato___Target_Spot":           {"treatment": "Apply azoxystrobin or chlorothalonil fungicide.", "organic": "Neem oil spray. Remove infected leaves.", "prevention": "Improve air circulation. Avoid leaf wetness."},
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus": {"treatment": "No cure — remove infected plants. Control whitefly vector with imidacloprid.", "organic": "Yellow sticky traps. Neem oil for whitefly.", "prevention": "Use virus-resistant varieties. Install reflective mulch."},
    "Tomato___Tomato_mosaic_virus":   {"treatment": "No cure — remove infected plants immediately.", "organic": "Control aphid vectors with neem oil.", "prevention": "Use virus-free seed. Disinfect tools with bleach solution."},
    "Wheat___Yellow_Rust":            {"treatment": "Apply propiconazole or tebuconazole at first sign.", "organic": "Remove volunteer wheat. Improve drainage.", "prevention": "Plant resistant varieties. Avoid dense sowing."},
    "Rice___Leaf_Blast":              {"treatment": "Apply tricyclazole or isoprothiolane at booting stage.", "organic": "Silicon fertiliser strengthens cell walls.", "prevention": "Avoid excess nitrogen. Maintain field drainage."},
}

DEFAULT_TREATMENT = {
    "treatment": "Consult your local Krishi Vigyan Kendra (KVK) for specific fungicide recommendation.",
    "organic": "Remove visibly infected leaves and improve air circulation.",
    "prevention": "Maintain good crop hygiene. Rotate crops annually.",
}


@router.get("/classes")
def get_disease_classes():
    """Return all 38 supported PlantVillage disease classes."""
    return {
        "classes": PLANTVILLAGE_CLASSES,
        "total":   len(PLANTVILLAGE_CLASSES),
        "crops":   sorted(set(c.split("___")[0].replace("_", " ") for c in PLANTVILLAGE_CLASSES)),
    }


@router.post("/detect")
async def detect_disease(file: UploadFile = File(...)):
    """
    Analyse a crop/leaf image using Gemini Vision with PlantVillage taxonomy.
    Returns structured diagnosis matching the trained EfficientNet-B0 format.
    """
    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image too large (max 10 MB)")

    mime_type = file.content_type or "image/jpeg"
    image_b64 = base64.b64encode(image_bytes).decode()

    try:
        import google.generativeai as genai
        genai.configure(api_key=config.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.0-flash")

        classes_str = "\n".join(f"  - {c}" for c in PLANTVILLAGE_CLASSES)

        prompt = f"""You are an expert plant pathologist AI trained on the PlantVillage dataset.
Analyse this crop/leaf image and classify it into EXACTLY ONE of these 38 classes:

{classes_str}

Return ONLY valid JSON with these exact keys — no markdown, no extra text:
{{
  "raw_class": "<exact class name from the list above>",
  "disease": "<human-readable disease name, or 'Healthy' if no disease>",
  "is_healthy": <true if class contains 'healthy', false otherwise>,
  "confidence": <float 0.0-1.0 reflecting your certainty>,
  "crop_type": "<crop name extracted from class>",
  "treatment": "<2-3 specific treatment steps as one string>",
  "organic_alternative": "<one organic/biopesticide option, empty string if healthy>"
}}

Rules:
- raw_class MUST be copied exactly from the list above
- confidence > 0.85 = very certain, 0.60-0.85 = moderate, < 0.60 = uncertain
- If image is not a plant leaf, set raw_class to the closest match with low confidence"""

        response = model.generate_content([
            prompt,
            {"mime_type": mime_type, "data": image_b64},
        ])

        text = response.text.strip()
        # Strip markdown fences if present
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()

        data = json.loads(text)

        # Enrich with treatment DB if available
        raw_class = data.get("raw_class", "")
        if raw_class in TREATMENTS:
            db = TREATMENTS[raw_class]
            # Only override if Gemini gave generic treatment
            if len(data.get("treatment", "")) < 30:
                data["treatment"] = db["treatment"]
            if not data.get("organic_alternative"):
                data["organic_alternative"] = db["organic"]
        elif not data.get("treatment"):
            data["treatment"] = DEFAULT_TREATMENT["treatment"]

        data["model_used"] = "Gemini Vision + PlantVillage taxonomy (gemini-2.0-flash)"
        return data

    except json.JSONDecodeError as exc:
        logger.error("Gemini returned non-JSON: %s", exc)
        return _demo_result("Could not parse model response")
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
        "treatment":           "Could not analyse image. Ensure good lighting and a clear leaf view. Try again or visit your local KVK.",
        "organic_alternative": "",
        "model_used":          f"Fallback ({note[:80]})" if note else "Fallback",
    }
