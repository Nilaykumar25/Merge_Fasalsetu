"""
Router: data endpoints consumed by GovSchemes.tsx, Marketplace.tsx, SoilNPKPanel.tsx
  POST /schemes/search   — government scheme search
  POST /market/prices    — mandi price lookup
  POST /query            — general AI chat for soil/NPK panel and marketplace
"""
from __future__ import annotations

import os
import random
from datetime import datetime, timezone

from fastapi import APIRouter, Request
from pydantic import BaseModel

router = APIRouter(tags=["data"])


# ── /schemes/search ───────────────────────────────────────────────────────

SCHEMES = [
    {"scheme_name": "PM-KISAN",                  "level": "Central", "state": "All India",      "category": "Income Support & Credit",          "benefit_type": "Direct Cash Transfer",      "benefit_amount": "₹6,000/year",       "eligibility": "All small and marginal farmers with cultivable land",               "apply_url": "https://pmkisan.gov.in",               "summary": "₹2,000 every 4 months directly to farmer bank account.",                             "match_score": 95},
    {"scheme_name": "PM Fasal Bima Yojana",       "level": "Central", "state": "All India",      "category": "Crop Insurance & Risk Protection",  "benefit_type": "Crop Insurance",             "benefit_amount": "Up to full crop loss", "eligibility": "All farmers growing notified crops",                                   "apply_url": "https://pmfby.gov.in",                 "summary": "Low-premium crop insurance covering natural calamities, pests and diseases.",         "match_score": 90},
    {"scheme_name": "Kisan Credit Card",          "level": "Central", "state": "All India",      "category": "Income Support & Credit",          "benefit_type": "Credit/Loan",               "benefit_amount": "Up to ₹3 lakh @ 4%", "eligibility": "Farmers, sharecroppers, tenant farmers",                               "apply_url": "https://www.nabard.org/content1.aspx?id=584", "summary": "Short-term credit for crop cultivation at subsidised interest rates.",                "match_score": 88},
    {"scheme_name": "PMKSY – Drip/Sprinkler",     "level": "Central", "state": "All India",      "category": "Irrigation & Water",               "benefit_type": "Subsidy",                   "benefit_amount": "55–75% subsidy",    "eligibility": "Individual farmers, water user associations",                          "apply_url": "https://pmksy.gov.in",                 "summary": "Subsidy on micro-irrigation systems to improve water use efficiency.",                "match_score": 85},
    {"scheme_name": "Soil Health Card Scheme",    "level": "Central", "state": "All India",      "category": "Soil Health & Farming Practices",  "benefit_type": "Free Testing & Advisory",   "benefit_amount": "Free",             "eligibility": "All farmers",                                                          "apply_url": "https://soilhealth.dac.gov.in",        "summary": "Free soil testing and nutrient recommendation card issued every 2 years.",             "match_score": 82},
    {"scheme_name": "eNAM",                       "level": "Central", "state": "All India",      "category": "Market Access & Selling",          "benefit_type": "Market Linkage",            "benefit_amount": "Better price realization", "eligibility": "All farmers with produce",                                          "apply_url": "https://enam.gov.in",                  "summary": "Online trading platform connecting farmers to buyers across 1000+ mandis.",           "match_score": 80},
    {"scheme_name": "PKVY – Organic Farming",     "level": "Central", "state": "All India",      "category": "Soil Health & Farming Practices",  "benefit_type": "Financial Assistance",      "benefit_amount": "₹50,000/hectare/3yr", "eligibility": "Farmer groups (min 20 farmers, 50 acres)",                           "apply_url": "https://pgsindia-ncof.gov.in",         "summary": "Support for cluster-based organic farming with certification assistance.",             "match_score": 75},
    {"scheme_name": "Sub-Mission on Agri Mechanisation", "level": "Central", "state": "All India", "category": "Technology & Mechanisation",   "benefit_type": "Subsidy",                   "benefit_amount": "40–50% subsidy",    "eligibility": "Individual farmers, FPOs, SHGs",                                      "apply_url": "https://agrimachinery.nic.in",         "summary": "Subsidised farm machinery including tractors, harvesters, and implements.",           "match_score": 72},
    {"scheme_name": "Rashtriya Krishi Vikas Yojana", "level": "Central", "state": "All India",   "category": "Income Support & Credit",          "benefit_type": "Grant",                     "benefit_amount": "Project-based",    "eligibility": "State governments, FPOs, farm cooperatives",                           "apply_url": "https://rkvy.nic.in",                  "summary": "Flexible funding for agriculture infrastructure and value chain development.",         "match_score": 68},
    {"scheme_name": "PM Kusum Solar Pump",        "level": "Central", "state": "All India",      "category": "Irrigation & Water",               "benefit_type": "Subsidy",                   "benefit_amount": "60–90% subsidy",    "eligibility": "Individual farmers",                                                  "apply_url": "https://mnre.gov.in/pm-kusum",         "summary": "Solar-powered irrigation pumps with up to 90% subsidy for reliable water supply.",    "match_score": 78},
]

class SchemeSearchRequest(BaseModel):
    query: str = ""
    state: str = "All India"
    category: str = ""
    top_k: int = 6

@router.post("/schemes/search")
def search_schemes(req: SchemeSearchRequest):
    q = req.query.lower()
    results = []
    for s in SCHEMES:
        score = s["match_score"]
        # Boost score based on keyword match
        if q and any(q in field.lower() for field in [s["scheme_name"], s["summary"], s["category"], s["benefit_type"]]):
            score = min(100, score + 10)
        if req.category and req.category != "" and s["category"] != req.category:
            continue
        if req.state and req.state != "All India" and s["state"] not in ("All India", req.state):
            continue
        results.append({**s, "match_score": score})

    results.sort(key=lambda x: x["match_score"], reverse=True)
    return {"schemes": results[:req.top_k], "total": len(results)}


# ── /market/prices ────────────────────────────────────────────────────────

MSP_2024: dict[str, int] = {
    "Wheat": 2425, "Paddy": 2300, "Maize": 2090, "Gram": 5440,
    "Tur": 7550, "Moong": 8682, "Urad": 7400, "Groundnut": 6783,
    "Soybean": 4892, "Cotton": 7121, "Jowar": 3371, "Bajra": 2625,
    "Mustard": 5950, "Sugarcane": 340, "Ragi": 4290,
    "Tomato": 0, "Onion": 0, "Potato": 0,
}

BASE_PRICES: dict[str, int] = {
    "Wheat": 2380, "Paddy": 2250, "Maize": 2010, "Gram": 5200,
    "Tur": 7200, "Moong": 8400, "Urad": 7100, "Groundnut": 6500,
    "Soybean": 4700, "Cotton": 6900, "Jowar": 3200, "Bajra": 2500,
    "Mustard": 5750, "Sugarcane": 320, "Ragi": 4100,
    "Tomato": 1200, "Onion": 800, "Potato": 900,
}

class PriceRequest(BaseModel):
    crop: str = "Wheat"
    state: str = "Maharashtra"
    market: str = ""

@router.post("/market/prices")
def market_prices(req: PriceRequest):
    crop = req.crop.strip().title()
    base = BASE_PRICES.get(crop, 2000)
    msp  = MSP_2024.get(crop)

    # Simulate slight market variation per state/market
    seed = sum(ord(c) for c in (req.state + req.market + crop))
    rng  = random.Random(seed)
    variation = rng.randint(-200, 300)
    modal = max(base + variation, 100)
    low   = int(modal * 0.92)
    high  = int(modal * 1.08)

    below_msp = bool(msp and modal < msp)
    trend = "↑ Rising" if variation > 100 else "↓ Falling" if variation < -100 else "→ Stable"

    advice = ""
    if below_msp and msp:
        advice = f"Price is below MSP (₹{msp}/qtl). Consider selling through e-NAM or waiting for price rise. Contact your local APMC."
    elif modal > (msp or 0) * 1.1:
        advice = f"Price is well above MSP — good time to sell. Ensure quality grading for premium price."
    else:
        advice = f"Price is near MSP. Check e-NAM for better offers in nearby mandis."

    return {
        "crop":      crop,
        "market":    req.market or f"Main APMC, {req.state}",
        "state":     req.state,
        "price":     modal,
        "unit":      "₹/quintal",
        "msp":       msp,
        "below_msp": below_msp,
        "trend":     trend,
        "source":    "Agmarknet (simulated)",
        "advice":    advice,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "rows": [
            {"market": req.market or "Main APMC", "state": req.state, "min": low, "max": high, "modal": modal},
        ],
    }


# ── /query — general AI chat (soil panel + marketplace) ───────────────────

class QueryRequest(BaseModel):
    message: str = ""
    context: str = ""

@router.post("/query")
async def general_query(req: QueryRequest, request: Request):
    """
    Lightweight chat endpoint used by SoilNPKPanel and Marketplace.
    Delegates to Gemini via the orchestrator if available, otherwise returns
    a structured fallback so the UI never breaks.
    """
    from backend.app.core import config

    msg = req.message.strip() or req.context.strip()
    if not msg:
        return {"reply": "Please enter a question.", "source": "system"}

    try:
        import google.generativeai as genai
        genai.configure(api_key=config.GEMINI_API_KEY)
        model = genai.GenerativeModel(config.FS_MODEL_ORCHESTRATOR)
        system = (
            "You are FasalSetu, an expert AI farming advisor for Indian farmers. "
            "Give concise, practical advice in simple language. "
            "Focus on crops, soil health, NPK fertilizers, market prices, and government schemes. "
            "Keep responses under 150 words."
        )
        result = model.generate_content(f"{system}\n\nFarmer query: {msg}")
        return {"reply": result.text, "source": "gemini"}
    except Exception as exc:
        return {
            "reply": (
                "I'm having trouble connecting to the AI service right now. "
                "For soil queries: check NPK levels and pH. "
                "For market queries: visit eNAM (enam.gov.in) for live mandi prices. "
                f"(Error: {str(exc)[:60]})"
            ),
            "source": "fallback",
        }
