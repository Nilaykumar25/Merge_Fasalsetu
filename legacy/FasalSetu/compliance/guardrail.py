"""
FasalSetu Compliance Guardrail — v1.1
Improvements over v1.0:
  1. Whole-word regex matching on extracted text only (no JSON serialisation false positives)
  2. Pre-execution input screening (check_input)
  3. Richer audit entries: schema_ver, session_id, phase, crop, state, severity
  4. State-aware restricted substances (_STATE_OVERRIDES)
  5. Confidence-gated uncertainty handling
"""
import json
import logging
import re
from datetime import datetime
from pathlib import Path

logger = logging.getLogger("guardrail")

_BASE_DIR   = Path(__file__).parent.parent
_LOG_DIR    = _BASE_DIR / "logs"
_AUDIT_FILE = _LOG_DIR / "compliance_audit.jsonl"
_LOG_DIR.mkdir(exist_ok=True)

_BANNED_PATH = Path(__file__).parent / "banned_pesticides.json"
try:
    with open(_BANNED_PATH) as f:
        _BANNED = json.load(f)
except FileNotFoundError:
    logger.warning("banned_pesticides.json not found — using built-in list")
    _BANNED = {
        "banned": [
            "Endosulfan", "Monocrotophos", "Methyl Parathion", "Phosphamidon",
            "Triazophos", "Chlorpyrifos", "Dichlorvos", "Aluminium Phosphide",
            "Methomyl", "Carbofuran", "Aldrin", "Dieldrin", "DDT",
        ],
        "restricted": {
            "Glyphosate":   "Not permitted on food crops without state approval",
            "Atrazine":     "Restricted to maize and sugarcane only",
            "2,4-D":        "Do not apply within 100m of water bodies",
            "Cypermethrin": "Do not apply during flowering — toxic to pollinators",
        },
        "license_required": ["Methyl Bromide", "Aluminium Phosphide"],
    }

# ── 4. State-level overrides ──────────────────────────────────────────────────
_STATE_OVERRIDES: dict = {
    "Kerala": {
        "banned_extra": ["Glyphosate"],
    },
    "Maharashtra": {
        "restricted_extra": {
            "Glyphosate": "Requires district officer approval in Maharashtra",
        },
    },
    "Punjab": {
        "restricted_extra": {
            "Atrazine": "Restricted to pre-emergence application only in Punjab",
        },
    },
    "Himachal Pradesh": {
        "banned_extra": ["Chlorpyrifos"],  # apple orchards ban
    },
}

# ── 2. Pre-execution intent patterns ─────────────────────────────────────────
_INTENT_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r'\b(buy|get|use|apply|mix|spray|purchase)\b.{0,50}\b(ddt|endosulfan|aldrin|dieldrin)\b', re.I),
     "Query requests use of a globally banned substance"),
    (re.compile(r'\b(buy|get|use|apply|mix|spray)\b.{0,50}\b(monocrotophos|methyl\s*parathion|phosphamidon)\b', re.I),
     "Query requests use of a banned organophosphate"),
    (re.compile(r'\b(buy|get|use|apply|mix|spray)\b.{0,50}\b(carbofuran|methomyl)\b', re.I),
     "Query requests use of a banned carbamate pesticide"),
]

# ── 5. Confidence threshold ───────────────────────────────────────────────────
CONFIDENCE_THRESHOLD = 0.75


class ComplianceViolation(Exception):
    pass


# ── Helpers ───────────────────────────────────────────────────────────────────

def _extract_text_fields(response: dict) -> str:
    """Recursively pull only string values — not keys or metadata."""
    parts: list[str] = []
    for v in response.values():
        if isinstance(v, str):
            parts.append(v)
        elif isinstance(v, dict):
            parts.append(_extract_text_fields(v))
        elif isinstance(v, list):
            parts.extend(str(i) for i in v if isinstance(i, str))
    return " ".join(parts)


def _word_match(substance: str, text: str) -> bool:
    """Whole-word, case-insensitive match — avoids partial-word false positives."""
    pattern = re.compile(r'\b' + re.escape(substance) + r'\b', re.IGNORECASE)
    return bool(pattern.search(text))


def _write_audit_entry(entry: dict) -> None:
    try:
        with open(_AUDIT_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception as e:
        logger.error("Failed to write audit entry: %s", e)


def _apply_state_rules(
    state: str,
    violations: list[str],
    warnings: list[str],
    text: str,
) -> None:
    """Apply state-specific bans and restrictions on top of the national list."""
    overrides = _STATE_OVERRIDES.get(state, {})
    for substance in overrides.get("banned_extra", []):
        if _word_match(substance, text):
            violations.append(
                f"STATE BAN ({state}): '{substance}' is banned in this state."
            )
    for substance, msg in overrides.get("restricted_extra", {}).items():
        if _word_match(substance, text):
            warnings.append(
                f"STATE RESTRICTION ({state}): '{substance}' — {msg}"
            )


# ── Public API ────────────────────────────────────────────────────────────────

def get_audit_log(last_n: int = 50) -> list:
    if not _AUDIT_FILE.exists():
        return []
    try:
        lines = _AUDIT_FILE.read_text(encoding="utf-8").strip().splitlines()
        entries = []
        for line in lines:
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError:
                continue
        return entries[-last_n:]
    except Exception as e:
        logger.error("Failed to read audit log: %s", e)
        return []


def check_input(user_query: str, session_id: str = "") -> None:
    """
    Pre-execution guardrail — call BEFORE passing the query to the LLM.
    Raises ComplianceViolation if the input requests use of a banned substance.
    """
    for pattern, reason in _INTENT_PATTERNS:
        if pattern.search(user_query):
            entry = {
                "timestamp":  datetime.now().isoformat(timespec="seconds"),
                "schema_ver": "1.1",
                "phase":      "pre_execution",
                "session_id": session_id,
                "reason":     reason,
                "query":      user_query[:200],
                "blocked":    True,
                "severity":   "HIGH",
            }
            _write_audit_entry(entry)
            logger.warning("INPUT BLOCKED | session=%s reason=%s", session_id, reason)
            raise ComplianceViolation(f"Input blocked: {reason}")


def check_and_gate(
    agent_name: str,
    response: dict,
    session_id: str = "",
) -> dict:
    """
    Post-execution guardrail — call on the agent's response dict.
    Returns the (possibly annotated) response, or raises ComplianceViolation.
    """
    violations: list[str] = []
    warnings:   list[str] = []

    # ── 1. Extract text fields only (no key names, no metadata) ──────────────
    text = _extract_text_fields(response)

    # ── National banned list ──────────────────────────────────────────────────
    for substance in _BANNED.get("banned", []):
        if _word_match(substance, text):
            violations.append(
                f"BANNED: '{substance}' is banned under the Insecticides Act 1968."
            )

    # ── National restricted list ──────────────────────────────────────────────
    for substance, restriction in _BANNED.get("restricted", {}).items():
        if _word_match(substance, text):
            warnings.append(f"RESTRICTED: '{substance}' — {restriction}")

    # ── License-required substances ───────────────────────────────────────────
    for substance in _BANNED.get("license_required", []):
        if _word_match(substance, text):
            warnings.append(
                f"LICENSE REQUIRED: '{substance}' requires a certified operator licence."
            )

    # ── 4. State-level overrides ──────────────────────────────────────────────
    farmer_state = response.get("farmer_state") or response.get("state", "")
    if farmer_state:
        _apply_state_rules(farmer_state, violations, warnings, text)

    # ── 5. Confidence gate ────────────────────────────────────────────────────
    confidence = response.get("confidence", 1.0)
    if isinstance(confidence, (int, float)) and confidence < CONFIDENCE_THRESHOLD and not violations:
        warnings.append(
            f"LOW CONFIDENCE ({confidence:.0%}): Recommend human agronomist review."
        )
        response["_requires_expert_review"] = True

    # ── 3. Richer audit entry ─────────────────────────────────────────────────
    entry = {
        "timestamp":  datetime.now().isoformat(timespec="seconds"),
        "schema_ver": "1.1",
        "agent":      agent_name,
        "session_id": session_id,
        "phase":      "post_execution",
        "crop":       response.get("crop"),
        "state":      farmer_state or None,
        "violations": violations,
        "warnings":   warnings,
        "blocked":    bool(violations),
        "severity":   "HIGH" if violations else ("MEDIUM" if warnings else "OK"),
    }
    _write_audit_entry(entry)
    logger.info(
        "AUDIT | agent=%s session=%s violations=%d warnings=%d severity=%s",
        agent_name, session_id, len(violations), len(warnings), entry["severity"],
    )

    if violations:
        raise ComplianceViolation("Response blocked:\n" + "\n".join(violations))

    if warnings:
        response["_compliance_warnings"] = warnings

    return response
