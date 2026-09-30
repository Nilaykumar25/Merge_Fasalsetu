"""
Pre-execution guardrail — Task 1 stub.
Passes everything; still writes a JSONL audit entry.
Full implementation replaces this in Task 6.
"""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone

logger = logging.getLogger("guardrail.pre")

_AUDIT_PATH = os.environ.get("GUARDRAIL_AUDIT_LOG", "logs/guardrail_audit.jsonl")


def _write_audit(entry: dict) -> None:
    os.makedirs(os.path.dirname(_AUDIT_PATH) or ".", exist_ok=True)
    try:
        with open(_AUDIT_PATH, "a") as fh:
            fh.write(json.dumps(entry) + "\n")
    except OSError as exc:
        logger.warning("Could not write audit log: %s", exc)


def check(query: str, pack) -> dict:  # type: ignore[type-arg]
    """
    Scan input query against the pack's banned-substance list.
    Returns {"result": "pass"|"block", "rules_triggered": [...], "ruleset": "..."}.

    Task 1: stub always returns "pass".
    """
    ruleset = pack.raw.get("compliance", {}).get("ruleset", "unknown")
    audit_entry = {
        "ts":        datetime.now(timezone.utc).isoformat(),
        "stage":     "pre",
        "result":    "pass",
        "ruleset":   ruleset,
        "rules_triggered": [],
    }
    _write_audit(audit_entry)
    return {"result": "pass", "rules_triggered": [], "ruleset": ruleset}
