"""
FasalSetu — FastAPI application.
All query endpoints are sync (def, not async def) because Runner.run()
is a sync generator that manages its own asyncio thread internally.
"""
import logging
import os
import shutil
import traceback

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from agents.soil_agent import predict_npk, get_soil_health_report
from agents.market_agent import get_market_prices, list_supported_crops
from agents.weather_agent import get_weather_forecast, check_spray_conditions, get_farming_weather_advice, get_detailed_forecast

# orchestrator + guardrail imported lazily inside endpoints
# so the server starts even without GEMINI_API_KEY

# ── Scheme search (lazy — only loads ChromaDB when first called) ──────────
_scheme_collection = None

def _get_scheme_collection():
    global _scheme_collection
    if _scheme_collection is not None:
        return _scheme_collection
    try:
        import chromadb
        from chromadb.utils import embedding_functions
        from pathlib import Path
        db_path = Path(__file__).parent / "chroma_db"
        client = chromadb.PersistentClient(path=str(db_path))
        ef = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="paraphrase-multilingual-MiniLM-L12-v2"
        )
        _scheme_collection = client.get_collection(
            name="government_farmer_schemes", embedding_function=ef
        )
        return _scheme_collection
    except Exception as e:
        raise RuntimeError(f"ChromaDB not ready: {e}. Run: python seed_chromadb.py")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("fasalsetu")

app = FastAPI(title="FasalSetu Agricultural AI", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(_static_dir):
    app.mount("/static", StaticFiles(directory=_static_dir), name="static")


class QueryRequest(BaseModel):
    query:      str
    location:   str = ""
    crop:       str = ""
    soil_data:  dict = {}
    session_id: str = "default"


class PesticideCheckRequest(BaseModel):
    pesticide_name: str


class NPKPredictRequest(BaseModel):
    soil_humidity:     float
    soil_temperature:  float
    soil_pH:           float
    soil_conductivity: float
    hour:              int = 12
    day_of_year:       int = 180
    crop:              str = "general"


class SchemeSearchRequest(BaseModel):
    query:    str
    state:    str = ""
    category: str = ""
    top_k:    int = 5


class MarketPriceRequest(BaseModel):
    crop:  str
    state: str = "Maharashtra"
    city:  str = "Pune"


class WeatherRequest(BaseModel):
    location: str          # city/state name or "lat,lon"
    crop:     str = "general"
    days:     int = 5


@app.get("/")
def root():
    index = os.path.join(_static_dir, "index.html")
    if os.path.exists(index):
        return FileResponse(index)
    return {"message": "FasalSetu API running. See /docs"}


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)


@app.get("/health")
def health():
    return {
        "status":    "ok",
        "agents":    ["soil", "disease", "market", "weather"],
        "model":     "gemini-2.5-flash",
        "framework": "google-adk",
    }


@app.post("/query")
def query(req: QueryRequest):
    """Main orchestrator — sync def required, do not change to async def."""
    try:
        from agents.orchestrator import run_query
        context = {k: v for k, v in {
            "location":  req.location,
            "crop":      req.crop,
            "soil_data": req.soil_data,
        }.items() if v}
        return run_query(req.query, context=context or None, session_id=req.session_id)
    except Exception as e:
        logger.error("Query error: %s\n%s", e, traceback.format_exc())
        raise HTTPException(status_code=500, detail={"error": str(e), "traceback": traceback.format_exc()})


@app.post("/analyze-image")
def analyze_image(file: UploadFile = File(...)):
    from agents.orchestrator import run_query
    tmp_path = f"/tmp/{file.filename}"
    try:
        with open(tmp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        return run_query(
            "Analyze this crop image for disease and recommend treatment.",
            context={"image_path": tmp_path},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.post("/compliance/check")
def compliance_check(req: PesticideCheckRequest):
    """Check if a pesticide is banned/restricted using guardrail.py"""
    try:
        from compliance.guardrail import check_and_gate, ComplianceViolation, _BANNED
        name = req.pesticide_name.strip()
        banned_list   = [b.lower() for b in _BANNED.get("banned", [])]
        restricted    = {k.lower(): v for k, v in _BANNED.get("restricted", {}).items()}
        license_req   = [l.lower() for l in _BANNED.get("license_required", [])]
        name_lower    = name.lower()

        if name_lower in banned_list:
            return {
                "status": "BANNED",
                "pesticide": name,
                "message": f"'{name}' is BANNED under the Insecticides Act 1968. Do not use.",
                "alternatives": "Use neem oil, Trichoderma, or consult your local KVK for safe alternatives.",
            }
        if name_lower in restricted:
            return {
                "status": "RESTRICTED",
                "pesticide": name,
                "message": restricted[name_lower],
                "alternatives": "Use with caution and follow state guidelines.",
            }
        if name_lower in license_req:
            return {
                "status": "LICENSE_REQUIRED",
                "pesticide": name,
                "message": f"'{name}' requires a certified operator licence.",
                "alternatives": "Contact a licensed pest control operator.",
            }
        return {
            "status": "SAFE",
            "pesticide": name,
            "message": f"'{name}' is not on the banned or restricted list.",
            "alternatives": "",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/compliance/lists")
def compliance_lists():
    """Return full banned/restricted lists from banned_pesticides.json"""
    try:
        from compliance.guardrail import _BANNED
        return _BANNED
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    from agents.orchestrator import run_query
    return run_query(f"Is {req.pesticide_name} safe to use on crops in India?")


@app.post("/predict-npk")
def predict_npk_endpoint(req: NPKPredictRequest):
    """
    Direct NPK prediction from the trained GradientBoosting model.
    Returns structured N, P, K values with status and recommendation.
    Used by the SoilNPKPanel frontend component.
    """
    try:
        result = predict_npk(
            soil_conductivity=req.soil_conductivity,
            soil_humidity=req.soil_humidity,
            soil_pH=req.soil_pH,
            soil_temperature=req.soil_temperature,
            hour=req.hour,
            day_of_year=req.day_of_year,
        )
        if "error" in result:
            raise HTTPException(status_code=503, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("predict-npk error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/soil-report")
def soil_report_endpoint(req: NPKPredictRequest):
    """
    Full soil health report: NPK prediction + pH advice + salinity note + crop tip.
    """
    try:
        result = get_soil_health_report(
            soil_conductivity=req.soil_conductivity,
            soil_humidity=req.soil_humidity,
            soil_pH=req.soil_pH,
            soil_temperature=req.soil_temperature,
            crop=req.crop,
            hour=req.hour,
            day_of_year=req.day_of_year,
        )
        if "error" in result:
            raise HTTPException(status_code=503, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("soil-report error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/weather/current")
def weather_current(req: WeatherRequest):
    """Current weather via weather_agent.py (OpenWeatherMap or seasonal fallback)."""
    try:
        return get_weather_forecast(req.location)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/weather/forecast")
def weather_forecast(req: WeatherRequest):
    """5-day forecast via weather_agent.py."""
    try:
        return get_detailed_forecast(req.location, req.days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/weather/advice")
def weather_advice(req: WeatherRequest):
    """Crop-specific farming advice based on weather."""
    try:
        return get_farming_weather_advice(req.location, req.crop)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/weather/spray")
def weather_spray(req: WeatherRequest):
    """Check if conditions are safe for spraying."""
    try:
        return check_spray_conditions(req.location)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/market/prices")
def market_prices(req: MarketPriceRequest):
    """Get market price for a crop via market_agent.py (MSP + live agmarknet)."""
    try:
        result = get_market_prices(req.crop, req.state, req.city)
        return result
    except Exception as e:
        logger.error("market/prices error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/market/crops")
def market_crops():
    """List all crops with MSP data."""
    return list_supported_crops()


@app.post("/schemes/search")
def schemes_search(req: SchemeSearchRequest):
    """Semantic search over government farmer schemes via ChromaDB."""
    try:
        col = _get_scheme_collection()
        full_query = f"{req.query} {req.state} {req.category} farmer scheme".strip()

        # Build where filter
        conditions = []
        if req.state and req.state.lower() not in ("all", "all india", ""):
            conditions.append({"$or": [
                {"level": {"$eq": "Central"}},
                {"state": {"$eq": req.state}},
            ]})
        if req.category:
            conditions.append({"category": {"$eq": req.category}})

        where = None
        if len(conditions) == 1:
            where = conditions[0]
        elif len(conditions) > 1:
            where = {"$and": conditions}

        kwargs = {
            "query_texts": [full_query],
            "n_results": min(req.top_k, col.count()),
            "include": ["documents", "metadatas", "distances"],
        }
        if where:
            kwargs["where"] = where

        results = col.query(**kwargs)
        schemes = []
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            schemes.append({
                "scheme_name":   meta.get("scheme_name", "Unknown"),
                "level":         meta.get("level", "—"),
                "state":         meta.get("state", "—"),
                "category":      meta.get("category", "—"),
                "benefit_type":  meta.get("benefit_type", "—"),
                "benefit_amount":meta.get("benefit_amount", "—"),
                "eligibility":   meta.get("eligibility", "—"),
                "apply_url":     meta.get("apply_url", "—"),
                "summary":       doc[:300],
                "match_score":   round((1 - dist) * 100, 1),
            })
        return {"schemes": schemes, "query": req.query, "total": len(schemes)}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error("schemes/search error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/schemes/categories")
def schemes_categories():
    return {"categories": [
        "Income Support & Credit",
        "Crop Insurance & Risk Protection",
        "Irrigation & Water",
        "Soil Health & Farming Practices",
        "Market Access & Selling",
        "Infrastructure & Storage",
        "Technology & Mechanisation",
        "Specialised Crop Missions",
    ]}


@app.get("/audit-log")
def audit_log(last_n: int = 20):
    from compliance.guardrail import get_audit_log
    log = get_audit_log(last_n)
    return {"total": len(log), "entries": log}


@app.get("/audit")
def audit(last_n: int = 20):
    return audit_log(last_n)
