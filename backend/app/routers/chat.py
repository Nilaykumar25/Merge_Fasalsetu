"""
Router: chat tag (POST /chat).
Matches api/openapi.yaml ChatRequest / ChatResponse.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from backend.app.orchestrator.pipeline import run_pipeline

logger = logging.getLogger("routers.chat")
router = APIRouter(tags=["chat"])


# ── Request / response models matching openapi.yaml ────────────────────────

class ChatInput(BaseModel):
    text: Optional[str] = None
    audio_base64: Optional[str] = None
    image_base64: Optional[str] = None


class ChatRequest(BaseModel):
    farm_id: str
    plot_id: Optional[str] = None
    language: Optional[str] = None
    input: ChatInput


class ChatResponse(BaseModel):
    reply: str
    language: str
    audio_url: Optional[str] = None
    recommendations: list[dict[str, Any]] = []
    agents_used: list[str] = []


# ── Dependency: get pack from app.state ────────────────────────────────────

def get_pack(request: Request):
    pack = getattr(request.app.state, "pack", None)
    if pack is None:
        raise HTTPException(status_code=503, detail="Country pack not loaded")
    return pack


def get_store(request: Request):
    store = getattr(request.app.state, "store", None)
    if store is None:
        raise HTTPException(status_code=503, detail="Event store not initialised")
    return store


# ── Endpoint ───────────────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse, status_code=200)
def post_chat(
    body: ChatRequest,
    pack=Depends(get_pack),
    store=Depends(get_store),
):
    """
    Conversational entry point.  Routes through the full pipeline;
    returns reply plus any recommendation events created.
    """
    query = body.input.text or ""
    if not query and not body.input.audio_base64 and not body.input.image_base64:
        raise HTTPException(status_code=422, detail="input.text, audio_base64 or image_base64 required")

    context = {
        "farm_id": body.farm_id,
        "plot_id": body.plot_id,
        "country": pack.code,
    }

    try:
        event = run_pipeline(
            query=query,
            context=context,
            pack=pack,
            store=store,
            language=body.language,
            channel="chat",
        )
    except PermissionError as exc:
        raise HTTPException(status_code=422, detail={"code": "GUARDRAIL_BLOCK", "message": str(exc)})
    except Exception as exc:
        logger.exception("Pipeline error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))

    reply = "आपकी फसल की स्थिति ठीक है।" if (body.language or pack.default_language) == "hi" \
        else "Your crop is in normal condition. No action needed at this time."

    rec = {
        "event_id":    str(event.event_id),
        "agent":       event.agent,
        "category":    event.category,
        "is_do_nothing": event.is_do_nothing,
        "text":        reply,
        "revenue": {
            "currency":   event.currency,
            "net_impact": float(event.net_impact) if event.net_impact is not None else 0.0,
            "assumptions": event.payload.get("revenue", {}).get("assumptions", {}),
        },
        "guardrail": event.payload.get("guardrail", {}),
    }

    return ChatResponse(
        reply=reply,
        language=body.language or pack.default_language,
        recommendations=[rec],
        agents_used=[event.agent] if event.agent else [],
    )
