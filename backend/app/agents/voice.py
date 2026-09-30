"""
Voice Agent — Task 1 stub.
Whisper STT / gTTS TTS wiring in later tasks.
Ported from legacy/FasalSetu/agents/voice_agent.py (structure).
"""
from __future__ import annotations

import logging
from typing import Any

from backend.app.agents.base import BaseAgent, Candidate

logger = logging.getLogger("agents.voice")


def transcribe_audio(audio_path: str, language: str = "hi") -> dict[str, Any]:
    """Stub. Whisper not yet configured."""
    return {
        "text": "",
        "language": language,
        "note": "Voice agent stub — configure Whisper to enable STT.",
    }


def synthesise_speech(text: str, language: str = "hi") -> dict[str, Any]:
    """Stub. gTTS not yet configured."""
    return {
        "audio_url": None,
        "language": language,
        "note": "Voice agent stub — configure gTTS to enable TTS.",
    }


class VoiceAgent(BaseAgent):
    def run(self, context: dict) -> list[Candidate]:
        return []  # Voice does not produce Candidates; it handles I/O only
