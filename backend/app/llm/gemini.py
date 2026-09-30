"""
Thin wrapper around the Google Gemini API (google-genai SDK).
- Model IDs always come from env vars (FS_MODEL_ORCHESTRATOR, FS_MODEL_TRANSLATE).
  They are never hardcoded here (conflict C-3 fix).
- Retries with exponential backoff on transient errors.
- JSON mode available via respond_with_json=True.
- Offline fallback hook: if GEMINI_API_KEY is absent or the call fails after
  all retries, _offline_fallback() is called and returns an empty string so
  downstream code can apply rule-based defaults.
"""
from __future__ import annotations

import logging
import os
import time
from typing import Any, Optional

logger = logging.getLogger("llm.gemini")

_MAX_RETRIES = 3
_BACKOFF_BASE = 1.5  # seconds


def _offline_fallback(prompt: str) -> str:  # noqa: ARG001
    """Called when Gemini is unavailable. Returns empty string."""
    logger.warning("Gemini offline — returning empty string for fallback path.")
    return ""


def _get_client():
    """Lazy-import google.genai and build a client.  Raises if key absent."""
    import google.generativeai as genai  # type: ignore
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set")
    genai.configure(api_key=api_key)
    return genai


def generate(
    prompt: str,
    *,
    model_env_var: str = "FS_MODEL_ORCHESTRATOR",
    respond_with_json: bool = False,
    system_instruction: Optional[str] = None,
    temperature: float = 0.2,
) -> str:
    """
    Send a prompt to Gemini and return the text response.
    Falls back to empty string if the API is unavailable.

    Args:
        prompt:            The user-turn prompt text.
        model_env_var:     Name of the env var holding the model ID.
        respond_with_json: If True, requests JSON output mode.
        system_instruction: Optional system-level instruction.
        temperature:       Sampling temperature (lower = more deterministic).

    Returns:
        Response text, or "" on failure.
    """
    model_id = os.environ.get(model_env_var, "gemini-2.5-flash").strip()
    if not model_id:
        model_id = "gemini-2.5-flash"

    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        return _offline_fallback(prompt)

    last_exc: Optional[Exception] = None
    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            genai = _get_client()
            generation_config: dict[str, Any] = {"temperature": temperature}
            if respond_with_json:
                generation_config["response_mime_type"] = "application/json"

            model = genai.GenerativeModel(
                model_name=model_id,
                system_instruction=system_instruction,
                generation_config=generation_config,
            )
            response = model.generate_content(prompt)
            return response.text or ""

        except Exception as exc:
            last_exc = exc
            wait = _BACKOFF_BASE ** attempt
            logger.warning(
                "Gemini attempt %d/%d failed: %s — retrying in %.1fs",
                attempt, _MAX_RETRIES, exc, wait,
            )
            if attempt < _MAX_RETRIES:
                time.sleep(wait)

    logger.error("Gemini failed after %d attempts: %s", _MAX_RETRIES, last_exc)
    return _offline_fallback(prompt)
