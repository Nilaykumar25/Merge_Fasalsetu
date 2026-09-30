"""
Router: compliance endpoints consumed by Compliance.tsx
  GET  /compliance/lists   — banned + restricted pesticide lists
  POST /compliance/check   — check a single pesticide name
  GET  /audit-log          — last N guardrail audit entries
"""
from __future__ import annotations

import json
import os
from pathlib import Path

from fastapi import APIRouter, Query
from pydantic import BaseModel

router = APIRouter(tags=["compliance"])

# ── Static pesticide data (mirrors what frontend has as fallback) ──────────

BANNED: list[str] = [
    "Endosulfan", "Monocrotophos", "Methyl Parathion", "Phosphamidon",
    "Triazophos", "Chlorpyrifos", "Dichlorvos", "Aluminium Phosphide",
    "Methomyl", "Carbofuran", "Aldrin", "Dieldrin", "DDT",
    "Heptachlor", "Chlordane", "Lindane", "Parathion", "Phorate",
]

RESTRICTED: dict[str, str] = {
    "Glyphosate":    "Not permitted on food crops without state approval",
    "Atrazine":      "Restricted to maize and sugarcane only",
    "2,4-D":         "Do not apply within 100m of water bodies",
    "Cypermethrin":  "Do not apply during flowering — toxic to pollinators",
    "Imidacloprid":  "Banned on flowering crops; restricted use on others",
    "Acephate":      "Pre-harvest interval of 7 days mandatory",
    "Mancozeb":      "Do not apply more than 3 times per season",
}

LICENSE_REQUIRED: list[str] = [
    "Methyl Bromide",
    "Aluminium Phosphide",
    "Sodium Cyanide",
]

ALTERNATIVES: dict[str, str] = {
    "endosulfan":        "Neem oil (3000 ppm), Spinosad, or Bt-based biopesticides",
    "chlorpyrifos":      "Profenofos with caution, or biological controls (Trichogramma)",
    "carbofuran":        "Chlorantraniliprole (Rynaxypyr) or Fipronil with restrictions",
    "monocrotophos":     "Dimethoate or Acephate (within PHI limits)",
    "glyphosate":        "Manual weeding, Paraquat (licensed), or mulching",
    "atrazine":          "Metolachlor for maize, hand weeding for other crops",
    "cypermethrin":      "Apply before or after flowering; use Spinosad as alternative",
}


# ── Routes ────────────────────────────────────────────────────────────────

@router.get("/compliance/lists")
def get_compliance_lists():
    """Return all banned, restricted, and license-required pesticide lists."""
    return {
        "banned":           BANNED,
        "restricted":       RESTRICTED,
        "license_required": LICENSE_REQUIRED,
        "source":           "Insecticides Act 1968 · Ministry of Agriculture, Govt. of India",
    }


class CheckRequest(BaseModel):
    pesticide_name: str


@router.post("/compliance/check")
def check_pesticide(req: CheckRequest):
    """Check a single pesticide name against the compliance lists."""
    name = req.pesticide_name.strip()
    name_lower = name.lower()

    banned_lower   = [b.lower() for b in BANNED]
    restricted_lower = {k.lower(): v for k, v in RESTRICTED.items()}
    license_lower  = [l.lower() for l in LICENSE_REQUIRED]

    alt = ALTERNATIVES.get(name_lower, "Consult your local KVK for approved alternatives.")

    if name_lower in banned_lower:
        return {
            "status":       "BANNED",
            "pesticide":    name,
            "message":      f"'{name}' is BANNED under the Insecticides Act 1968 and cannot be used in India.",
            "alternatives": alt,
        }

    if name_lower in license_lower:
        return {
            "status":       "LICENSE_REQUIRED",
            "pesticide":    name,
            "message":      f"'{name}' requires a valid license and trained operator. Obtain approval from your State Agriculture Department.",
            "alternatives": alt,
        }

    if name_lower in restricted_lower:
        return {
            "status":       "RESTRICTED",
            "pesticide":    name,
            "message":      restricted_lower[name_lower],
            "alternatives": alt,
        }

    return {
        "status":       "SAFE",
        "pesticide":    name,
        "message":      f"'{name}' is not on the banned or restricted list. Always follow label instructions and state guidelines.",
        "alternatives": "",
    }


@router.get("/audit-log")
def get_audit_log(last_n: int = Query(default=20, ge=1, le=200)):
    """Return the last N guardrail audit log entries from the JSONL file."""
    audit_path = os.environ.get("GUARDRAIL_AUDIT_LOG", "logs/guardrail_audit.jsonl")

    if not Path(audit_path).exists():
        return {"entries": [], "note": "No audit log found yet. Entries appear after AI Advisor use."}

    try:
        lines = Path(audit_path).read_text(encoding="utf-8").strip().splitlines()
        entries = []
        for line in lines[-last_n:]:
            try:
                raw = json.loads(line)
                entries.append({
                    "timestamp":  raw.get("ts", ""),
                    "agent":      raw.get("agent", raw.get("stage", "unknown")),
                    "violations": raw.get("rules_triggered", []),
                    "warnings":   raw.get("warnings", []),
                    "blocked":    raw.get("result", "pass") == "block",
                })
            except json.JSONDecodeError:
                continue
        return {"entries": list(reversed(entries))}
    except Exception as exc:
        return {"entries": [], "error": str(exc)}
