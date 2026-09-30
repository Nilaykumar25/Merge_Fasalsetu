"""
test_pack_schema.py — Task 1.4.2

Tests:
  test_india_pack_valid                — IN pack loads without errors.
  test_brazil_pack_valid               — BR pack loads without errors.
  test_missing_source_on_banned_entry  — compliance entry without 'source' → PackValidationError.
  test_unknown_country_code            — PackLoader.load("ZZ") → PackNotFoundError.
"""
from __future__ import annotations

import json
import tempfile
from pathlib import Path

import pytest
import yaml

from backend.app.core.packs import (
    CountryPack,
    PackNotFoundError,
    PackValidationError,
    clear_cache,
    load,
)


@pytest.fixture(autouse=True)
def reset_cache():
    """Clear the pack cache before and after every test."""
    clear_cache()
    yield
    clear_cache()


# ── Valid packs ────────────────────────────────────────────────────────────

def test_india_pack_valid():
    """India (full) pack loads and validates successfully."""
    pack = load("IN")
    assert isinstance(pack, CountryPack)
    assert pack.code == "IN"
    assert pack.raw["meta"]["completeness"] == "full"
    assert pack.currency == "INR"


def test_brazil_pack_valid():
    """Brazil (thin) pack loads and validates successfully."""
    pack = load("BR")
    assert isinstance(pack, CountryPack)
    assert pack.code == "BR"
    assert pack.raw["meta"]["completeness"] == "thin"
    assert pack.currency == "BRL"


# ── Validation failures ────────────────────────────────────────────────────

def test_missing_source_on_banned_entry(tmp_path, monkeypatch):
    """
    A compliance.banned entry missing 'source' must raise PackValidationError.
    PACK_SPEC rule 2: entries without a source fail validation.
    """
    # Build a minimal valid pack then inject a bad banned entry
    bad_pack = {
        "pack_format": 1,
        "meta": {
            "code": "ZA",
            "name": "Test",
            "completeness": "thin",
            "maintainer": "test",
            "data_provenance": "test",
        },
        "locale": {
            "default_language": "en",
            "units": {"currency": "ZAR"},
        },
        "compliance": {
            "ruleset": "za@2026.09",
            "authority": "Test Authority",
            "retrieved_on": "2026-09-01",
            "banned": [
                {"substance": "paraquat"}  # <-- missing 'source'
            ],
            "restricted": [],
        },
        "market": {
            "price_source": {"name": "Test Market"},
        },
        "revenue": {
            "currency": "ZAR",
            "formula_version": "1.0",
            "risk_discount_rate": 0.10,
            "do_nothing_threshold": 10,
            "show_assumptions": True,
        },
        "delivery": {
            "channels": ["chat"],
            "reply_codes": {"1": "done"},
        },
        "data": {
            "residency": "za",
            "pii_in_event_log": False,
        },
    }

    # Create a temp country_packs/za/ directory
    za_dir = tmp_path / "za"
    za_dir.mkdir()
    (za_dir / "pack.yaml").write_text(yaml.dump(bad_pack))

    # Monkeypatch the pack root so PackLoader finds our temp dir
    import backend.app.core.packs as packs_module
    monkeypatch.setattr(packs_module, "_PACK_ROOT", tmp_path)

    with pytest.raises(PackValidationError) as exc_info:
        load("ZA")

    assert exc_info.value.field_path != "" or "source" in str(exc_info.value).lower()


def test_unknown_country_code():
    """PackLoader.load('ZZ') must raise PackNotFoundError."""
    with pytest.raises(PackNotFoundError):
        load("ZZ")


# ── PII safety ────────────────────────────────────────────────────────────

def test_pii_in_event_log_must_be_false(tmp_path, monkeypatch):
    """
    A pack with pii_in_event_log: true must raise PackValidationError.
    Schema constraint: data.pii_in_event_log must be const false.
    """
    bad_pack = {
        "pack_format": 1,
        "meta": {
            "code": "XX",
            "name": "Bad Pack",
            "completeness": "thin",
            "maintainer": "test",
            "data_provenance": "test",
        },
        "locale": {
            "default_language": "en",
            "units": {"currency": "USD"},
        },
        "compliance": {
            "ruleset": "xx@2026.09",
            "authority": "Test",
            "retrieved_on": "2026-09-01",
            "banned": [],
            "restricted": [],
        },
        "market": {"price_source": {"name": "Test"}},
        "revenue": {
            "currency": "USD",
            "formula_version": "1.0",
            "risk_discount_rate": 0.10,
            "do_nothing_threshold": 10,
            "show_assumptions": True,
        },
        "delivery": {
            "channels": ["chat"],
            "reply_codes": {},
        },
        "data": {
            "residency": "xx",
            "pii_in_event_log": True,   # <-- must fail
        },
    }

    xx_dir = tmp_path / "xx"
    xx_dir.mkdir()
    (xx_dir / "pack.yaml").write_text(yaml.dump(bad_pack))

    import backend.app.core.packs as packs_module
    monkeypatch.setattr(packs_module, "_PACK_ROOT", tmp_path)

    with pytest.raises(PackValidationError):
        load("XX")
