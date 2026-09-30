"""
FasalSetu FastAPI application factory.
Loads the country pack on startup, mounts all routers, applies CORS.
"""
from __future__ import annotations

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("fasalsetu")


def create_app() -> FastAPI:
    # Validate mandatory env vars early (will raise ImproperlyConfigured if absent)
    from backend.app.core import config  # noqa: F401 — side-effect: validates env

    from backend.app.core.packs import load as load_pack
    from backend.app.eventlog.store import EventStore
    from backend.app.routers.chat import router as chat_router
    from backend.app.routers.health import router as health_router
    from backend.app.routers.weather import router as weather_router

    app = FastAPI(
        title="FasalSetu API",
        version="1.0.0",
        description="Revenue-first, multilingual agro-advisory API (digital public good).",
        license_info={"name": "Apache-2.0"},
    )

    # ── CORS ────────────────────────────────────────────────────────────────
    cors_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ─────────────────────────────────────────────────────────────
    app.include_router(chat_router)
    app.include_router(health_router)
    app.include_router(weather_router)

    # ── Startup: load pack and initialise store ──────────────────────────────
    @app.on_event("startup")
    def startup() -> None:
        cc = os.environ.get("FS_COUNTRY_CODE", "IN").upper()
        try:
            app.state.pack = load_pack(cc)
            logger.info("Country pack loaded: %s", cc)
        except Exception as exc:
            logger.error("Failed to load country pack '%s': %s", cc, exc)
            app.state.pack = None

        try:
            app.state.store = EventStore()
            logger.info("EventStore initialised")
        except Exception as exc:
            logger.warning("EventStore not available at startup: %s", exc)
            app.state.store = None

        # Optional demo seed
        if os.environ.get("FS_SEED_DEMO", "").lower() == "true" and app.state.store and app.state.pack:
            try:
                from backend.app.demo.seed import seed
                seed(app.state.store, app.state.pack)
            except Exception as exc:
                logger.warning("Demo seed failed (non-fatal): %s", exc)

    return app


app = create_app()
