"""
Application configuration.
Reads every env var listed in design.md §12.
Raises ImproperlyConfigured at import time if mandatory keys are absent,
so the server fails fast rather than crashing on the first request.
"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from the project root (two levels above this file: backend/app/core → root)
_env_path = Path(__file__).resolve().parents[3] / ".env"
load_dotenv(_env_path)


class ImproperlyConfigured(RuntimeError):
    """Raised when a required environment variable is missing."""


def _require(key: str) -> str:
    value = os.environ.get(key, "").strip()
    if not value:
        raise ImproperlyConfigured(
            f"Required environment variable '{key}' is not set. "
            f"Copy .env.example to .env and fill in all values."
        )
    return value


def _optional(key: str, default: str = "") -> str:
    return os.environ.get(key, default).strip()


# ── Mandatory ──────────────────────────────────────────────────────────────

GEMINI_API_KEY: str = _require("GEMINI_API_KEY")
DATABASE_URL: str   = _require("DATABASE_URL")

# ── LLM model IDs — never hardcoded, always from env ──────────────────────

FS_MODEL_ORCHESTRATOR: str = _optional("FS_MODEL_ORCHESTRATOR", "gemini-2.5-flash")
FS_MODEL_TRANSLATE: str    = _optional("FS_MODEL_TRANSLATE",    "gemini-2.5-flash")

# ── Country / locale ───────────────────────────────────────────────────────

FS_COUNTRY_CODE: str = _optional("FS_COUNTRY_CODE", "IN").upper()

# ── Delivery ───────────────────────────────────────────────────────────────

FS_DELIVERY_PROVIDER: str = _optional("FS_DELIVERY_PROVIDER", "mock")

TWILIO_ACCOUNT_SID: str  = _optional("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN: str   = _optional("TWILIO_AUTH_TOKEN")
TWILIO_FROM_NUMBER: str  = _optional("TWILIO_FROM_NUMBER")

# ── External data APIs ─────────────────────────────────────────────────────

OPENWEATHER_API_KEY: str = _optional("OPENWEATHER_API_KEY")
CDSE_CLIENT_ID: str      = _optional("CDSE_CLIENT_ID")
CDSE_CLIENT_SECRET: str  = _optional("CDSE_CLIENT_SECRET")

# ── Demo / seeding ─────────────────────────────────────────────────────────

FS_SEED_DEMO: bool = _optional("FS_SEED_DEMO", "false").lower() == "true"

# ── CORS ───────────────────────────────────────────────────────────────────

CORS_ORIGINS: list[str] = [
    o.strip()
    for o in _optional("CORS_ORIGINS", "*").split(",")
    if o.strip()
]
