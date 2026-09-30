"""
PackLoader — reads country_packs/<cc>/pack.yaml, validates against
country_packs/pack.schema.json, and caches the result.

Errors:
  PackNotFoundError      — country code directory / pack.yaml not found.
  PackValidationError    — YAML is present but fails schema validation;
                           includes the JSON Schema field path.
"""
from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import jsonschema
import yaml

logger = logging.getLogger("core.packs")

def _repo_root() -> Path:
    """Walk up from this file until we find country_packs/ — robust to any install depth."""
    candidate = Path(__file__).resolve()
    for _ in range(10):
        candidate = candidate.parent
        if (candidate / "country_packs").is_dir():
            return candidate
    raise RuntimeError("Cannot locate repo root (country_packs/ not found in any parent directory)")


_PACK_ROOT = _repo_root() / "country_packs"
_SCHEMA_PATH = _PACK_ROOT / "pack.schema.json"

_cache: dict[str, "CountryPack"] = {}


class PackNotFoundError(KeyError):
    """Raised when country_packs/<cc>/pack.yaml does not exist."""


class PackValidationError(ValueError):
    """Raised when pack.yaml fails JSON Schema validation."""

    def __init__(self, message: str, field_path: str = "") -> None:
        super().__init__(message)
        self.field_path = field_path


@dataclass
class CountryPack:
    """Parsed, validated country pack.  All config access goes through this."""
    code: str
    raw: dict[str, Any]

    # ── Convenience accessors ──────────────────────────────────────────────

    @property
    def currency(self) -> str:
        return self.raw["revenue"]["currency"]

    @property
    def formula_version(self) -> str:
        return self.raw["revenue"]["formula_version"]

    @property
    def risk_discount_rate(self) -> float:
        return float(self.raw["revenue"]["risk_discount_rate"])

    @property
    def do_nothing_threshold(self) -> float:
        return float(self.raw["revenue"]["do_nothing_threshold"])

    @property
    def ruleset(self) -> str:
        return self.raw["compliance"]["ruleset"]

    @property
    def default_language(self) -> str:
        return self.raw["locale"]["default_language"]

    @property
    def reply_codes(self) -> dict[str, str]:
        return self.raw["delivery"].get("reply_codes", {})

    def crop(self, crop_name: str) -> dict[str, Any]:
        return self.raw.get("crops", {}).get(crop_name, {})


def _load_schema() -> dict:
    with open(_SCHEMA_PATH) as fh:
        return json.load(fh)


def load(cc: str) -> CountryPack:
    """
    Load and return the CountryPack for country code *cc* (e.g. "IN", "BR").
    Results are cached in-process.  Raises PackNotFoundError or PackValidationError.
    """
    cc_upper = cc.upper()
    if cc_upper in _cache:
        return _cache[cc_upper]

    pack_path = _PACK_ROOT / cc.lower() / "pack.yaml"
    if not pack_path.exists():
        raise PackNotFoundError(
            f"No pack found for country code '{cc}'. "
            f"Expected: {pack_path}"
        )

    with open(pack_path) as fh:
        raw = yaml.safe_load(fh)

    schema = _load_schema()
    validator = jsonschema.Draft202012Validator(schema)
    errors = list(validator.iter_errors(raw))
    if errors:
        # Report the first (most fundamental) error with its field path
        err = errors[0]
        field_path = " > ".join(str(p) for p in err.absolute_path) or "(root)"
        raise PackValidationError(
            f"Pack '{cc}' failed validation at '{field_path}': {err.message}",
            field_path=field_path,
        )

    pack = CountryPack(code=cc_upper, raw=raw)
    _cache[cc_upper] = pack
    logger.info("Loaded country pack: %s (completeness=%s)", cc_upper, raw["meta"]["completeness"])
    return pack


def clear_cache() -> None:
    """Clear the in-process pack cache (used in tests)."""
    _cache.clear()
