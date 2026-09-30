"""
Guardrail rule compilation — stub for Task 1.
Full implementation in Task 6.
Rules are loaded from the country pack so no substance names are hardcoded here.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field

logger = logging.getLogger("guardrail.rules")


@dataclass
class CompiledRule:
    substance: str
    source: str
    pattern: re.Pattern


@dataclass
class RuleSet:
    ruleset_id: str
    banned: list[CompiledRule] = field(default_factory=list)
    restricted: list[CompiledRule] = field(default_factory=list)
    regional: dict[str, list[CompiledRule]] = field(default_factory=dict)


def load_rules(pack) -> RuleSet:  # type: ignore[type-arg]
    """
    Compile pack compliance entries into regex patterns.
    Each entry must carry both substance and source (PACK_SPEC rule 2).
    """
    compliance = pack.raw.get("compliance", {})
    ruleset_id = compliance.get("ruleset", "unknown")
    rs = RuleSet(ruleset_id=ruleset_id)

    for entry in compliance.get("banned", []):
        rs.banned.append(CompiledRule(
            substance=entry["substance"],
            source=entry["source"],
            pattern=re.compile(re.escape(entry["substance"]), re.IGNORECASE),
        ))

    for entry in compliance.get("restricted", []):
        rs.restricted.append(CompiledRule(
            substance=entry["substance"],
            source=entry["source"],
            pattern=re.compile(re.escape(entry["substance"]), re.IGNORECASE),
        ))

    for region, data in compliance.get("regional", {}).items():
        rs.regional[region] = [CompiledRule(
            substance=region,
            source=data.get("source", ""),
            pattern=re.compile(region, re.IGNORECASE),
        )]

    return rs
