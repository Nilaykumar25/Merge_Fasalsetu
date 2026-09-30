"""
Router: weather endpoints consumed by CalendarAlerts.tsx and weatherLocation.ts.
  POST /weather/current   — current conditions
  POST /weather/forecast  — N-day forecast
  POST /weather/spray     — spray safety check
Uses OpenWeatherMap free API (OPENWEATHER_API_KEY).
Falls back to demo data when the key is absent so the frontend never crashes.
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/weather", tags=["weather"])

OWM_BASE = "https://api.openweathermap.org/data/2.5"
GEO_BASE = "https://api.openweathermap.org/geo/1.0"


# ── Request / response models ─────────────────────────────────────────────

class LocationRequest(BaseModel):
    location: str = "India"


class ForecastRequest(BaseModel):
    location: str = "India"
    days: int = 5


# ── Helpers ───────────────────────────────────────────────────────────────

def _api_key() -> str:
    return os.environ.get("OPENWEATHER_API_KEY", "").strip()


async def _resolve_coords(location: str) -> tuple[float, float, str]:
    """Return (lat, lon, display_name). Accepts 'lat,lon' or city name."""
    if "," in location:
        parts = location.split(",")
        try:
            lat, lon = float(parts[0]), float(parts[1])
            return lat, lon, location
        except ValueError:
            pass

    key = _api_key()
    if not key:
        return 20.5937, 78.9629, "India"  # geographic centre of India

    async with httpx.AsyncClient(timeout=8) as client:
        r = await client.get(f"{GEO_BASE}/direct", params={"q": location, "limit": 1, "appid": key})
        r.raise_for_status()
        data = r.json()
        if data:
            name = f"{data[0].get('name', location)}, {data[0].get('state', data[0].get('country', ''))}"
            return data[0]["lat"], data[0]["lon"], name.strip(", ")
    return 20.5937, 78.9629, location


def _demo_current(location: str) -> dict:
    return {
        "location": location or "India",
        "temperature_c": 28.0,
        "feels_like_c": 30.0,
        "humidity_pct": 62,
        "wind_speed_kmh": 14.0,
        "wind_direction": "NW",
        "condition": "Partly Cloudy",
        "rain_expected": False,
        "clouds_pct": 35,
        "visibility_km": 10.0,
        "pressure_hpa": 1012,
        "source": "demo (no API key)",
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "note": "Set OPENWEATHER_API_KEY in .env for live data.",
    }


def _demo_forecast(days: int) -> dict:
    base = datetime.now(timezone.utc)
    forecast = []
    conditions = ["Clear", "Partly Cloudy", "Cloudy", "Light Rain", "Clear"]
    for i in range(min(days, 5)):
        d = base + timedelta(days=i)
        forecast.append({
            "date": d.strftime("%Y-%m-%d"),
            "day": d.strftime("%A"),
            "temperature": {"max_c": 32 - i, "min_c": 18 + i, "avg_c": 25},
            "humidity_pct": 60 + i * 2,
            "wind_speed_kmh": 12.0,
            "rainfall_mm": 2.0 if conditions[i] == "Light Rain" else 0.0,
            "condition": conditions[i % len(conditions)],
            "farming_notes": ["Demo forecast — add OPENWEATHER_API_KEY for live data."],
        })
    return {"forecast": forecast}


def _owm_condition(desc: str) -> str:
    """Capitalise OWM description."""
    return desc.title() if desc else "Clear"


# ── Routes ────────────────────────────────────────────────────────────────

@router.post("/current")
async def current_weather(req: LocationRequest):
    key = _api_key()
    if not key:
        return _demo_current(req.location)

    try:
        lat, lon, display = await _resolve_coords(req.location)
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(f"{OWM_BASE}/weather", params={
                "lat": lat, "lon": lon, "appid": key, "units": "metric",
            })
            r.raise_for_status()
            d = r.json()

        rain_1h = d.get("rain", {}).get("1h", 0)
        return {
            "location":       display or d.get("name", req.location),
            "temperature_c":  round(d["main"]["temp"], 1),
            "feels_like_c":   round(d["main"]["feels_like"], 1),
            "humidity_pct":   d["main"]["humidity"],
            "wind_speed_kmh": round(d["wind"]["speed"] * 3.6, 1),
            "wind_direction": _wind_dir(d["wind"].get("deg")),
            "condition":      _owm_condition(d["weather"][0]["description"]),
            "rain_expected":  rain_1h > 0 or d.get("rain") is not None,
            "clouds_pct":     d["clouds"]["all"],
            "visibility_km":  round(d.get("visibility", 10000) / 1000, 1),
            "pressure_hpa":   d["main"]["pressure"],
            "source":         "OpenWeatherMap",
            "timestamp":      datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        }
    except Exception as exc:
        demo = _demo_current(req.location)
        demo["note"] = f"Live fetch failed ({exc}). Showing demo data."
        return demo


@router.post("/forecast")
async def weather_forecast(req: ForecastRequest):
    key = _api_key()
    if not key:
        return _demo_forecast(req.days)

    try:
        lat, lon, _ = await _resolve_coords(req.location)
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"{OWM_BASE}/forecast", params={
                "lat": lat, "lon": lon, "appid": key, "units": "metric", "cnt": req.days * 8,
            })
            r.raise_for_status()
            data = r.json()

        # Group 3-hour slots by day
        days: dict[str, list] = {}
        for item in data["list"]:
            day = item["dt_txt"][:10]
            days.setdefault(day, []).append(item)

        forecast = []
        for date_str, slots in list(days.items())[:req.days]:
            temps = [s["main"]["temp"] for s in slots]
            rain_mm = sum(s.get("rain", {}).get("3h", 0) for s in slots)
            cond = _owm_condition(slots[len(slots) // 2]["weather"][0]["description"])
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            notes = []
            if rain_mm > 5:
                notes.append("Rain expected — avoid spraying.")
            if max(temps) > 38:
                notes.append("High heat — irrigate in the morning.")
            if not notes:
                notes.append("Conditions suitable for field work.")
            forecast.append({
                "date":          date_str,
                "day":           dt.strftime("%A"),
                "temperature":   {"max_c": round(max(temps), 1), "min_c": round(min(temps), 1), "avg_c": round(sum(temps)/len(temps), 1)},
                "humidity_pct":  round(sum(s["main"]["humidity"] for s in slots) / len(slots)),
                "wind_speed_kmh": round(slots[0]["wind"]["speed"] * 3.6, 1),
                "rainfall_mm":   round(rain_mm, 1),
                "condition":     cond,
                "farming_notes": notes,
            })
        return {"forecast": forecast}
    except Exception as exc:
        demo = _demo_forecast(req.days)
        demo["note"] = f"Live fetch failed ({exc}). Showing demo data."  # type: ignore[assignment]
        return demo


@router.post("/spray")
async def spray_check(req: LocationRequest):
    key = _api_key()
    fallback = {
        "safe_to_spray": True,
        "verdict": "Likely safe (demo)",
        "reasons": ["No live data — add OPENWEATHER_API_KEY for accurate spray guidance."],
        "best_time": "Early morning (6–8 AM) is generally safest.",
    }
    if not key:
        return fallback

    try:
        lat, lon, _ = await _resolve_coords(req.location)
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(f"{OWM_BASE}/weather", params={
                "lat": lat, "lon": lon, "appid": key, "units": "metric",
            })
            r.raise_for_status()
            d = r.json()

        wind_kmh  = d["wind"]["speed"] * 3.6
        humidity  = d["main"]["humidity"]
        rain_1h   = d.get("rain", {}).get("1h", 0)
        raining   = rain_1h > 0

        reasons: list[str] = []
        unsafe = False

        if raining:
            reasons.append("Rain is falling — spraying now will wash off the chemical.")
            unsafe = True
        if wind_kmh > 15:
            reasons.append(f"Wind speed {wind_kmh:.0f} km/h is too high (safe limit: <15 km/h).")
            unsafe = True
        if humidity > 85:
            reasons.append(f"Humidity {humidity}% — spray may not dry properly and could cause fungal risk.")
        if not reasons:
            reasons.append("Wind, humidity, and rain conditions are all within safe limits.")

        return {
            "safe_to_spray": not unsafe,
            "verdict":       "Not safe to spray" if unsafe else "Safe to spray",
            "reasons":       reasons,
            "best_time":     "Early morning (6–8 AM) when wind is calm and dew has dried.",
        }
    except Exception as exc:
        fallback["reasons"] = [f"Could not fetch live data ({exc}). {fallback['reasons'][0]}"]
        return fallback


def _wind_dir(deg: int | None) -> str:
    if deg is None:
        return ""
    dirs = ["N","NE","E","SE","S","SW","W","NW"]
    return dirs[round(deg / 45) % 8]
