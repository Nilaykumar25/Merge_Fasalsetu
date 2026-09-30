"""
geo_cache.py — Local JSON cache for SHC portal geography data.

States, districts, and blocks on soilhealth4.dac.gov.in change
essentially never (government administrative boundaries are stable for
years).  Villages change rarely.  Fetching them fresh every run wastes
network calls and, more importantly, triggers the portal's rate-limiter.

Layout on disk  (all under data/geo_cache/)
───────────────────────────────────────────
  states.json                   – all states, keyed by numeric state code
  districts/<state_code>.json   – districts for one state
  blocks/<district_id>.json     – blocks for one district   (MongoDB _id)
  villages/<block_id>.json      – villages for one block    (MongoDB _id)

Each file is a JSON object:
  {
    "fetched_at": "2026-09-08T12:34:56",   # ISO-8601 UTC, for freshness checks
    "data": [ ... ]                         # list of records as returned by _gql()
  }

Public API
──────────
  get_states()                  → list | None
  set_states(records)
  get_districts(state_code)     → list | None
  set_districts(state_code, records)
  get_blocks(district_id)       → list | None
  set_blocks(district_id, records)
  get_villages(block_id)        → list | None
  set_villages(block_id, records)
  invalidate(level)             – wipe one level: 'states'|'districts'|'blocks'|'villages'|'all'

None is returned when the cache entry doesn't exist or is older than
MAX_AGE_DAYS.  Callers should treat None as a cache miss and fetch from
the GraphQL API, then call set_*() to populate the cache.
"""

import json
import logging
import os
import threading
from datetime import datetime, timezone, timedelta
from pathlib import Path

# ── Configuration ─────────────────────────────────────────────────────────────

_CACHE_ROOT = Path(os.environ.get('SHC_GEO_CACHE_DIR', './data/geo_cache'))

# Geography changes so rarely that 30 days is a safe TTL for districts/blocks.
# Villages are slightly more dynamic (new habitations get added) so use 7 days.
MAX_AGE_DAYS: dict = {
    'states':    90,
    'districts': 30,
    'blocks':    30,
    'villages':   7,
}

_lock = threading.Lock()   # single-process lock; fine for the local scraper


# ── Internal helpers ───────────────────────────────────────────────────────────

def _ensure_dirs() -> None:
    for sub in ('', 'districts', 'blocks', 'villages'):
        (_CACHE_ROOT / sub).mkdir(parents=True, exist_ok=True)


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S')


def _is_fresh(fetched_at: str, level: str) -> bool:
    """Return True if the cached timestamp is within MAX_AGE_DAYS for level."""
    try:
        dt = datetime.fromisoformat(fetched_at).replace(tzinfo=timezone.utc)
        age = datetime.now(timezone.utc) - dt
        return age < timedelta(days=MAX_AGE_DAYS[level])
    except Exception:
        return False


def _read(path: Path) -> dict | None:
    try:
        with path.open('r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def _write(path: Path, data: list) -> None:
    _ensure_dirs()
    tmp = path.with_suffix('.tmp')
    payload = {'fetched_at': _now_iso(), 'data': data}
    with tmp.open('w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    tmp.replace(path)   # atomic rename — no half-written files on interrupt
    logging.debug(f'geo_cache: wrote {len(data)} records to {path}')


def _get(path: Path, level: str) -> list | None:
    with _lock:
        entry = _read(path)
    if entry is None:
        return None
    if not _is_fresh(entry.get('fetched_at', ''), level):
        logging.debug(f'geo_cache: stale entry at {path}')
        return None
    return entry['data']


def _set(path: Path, records: list) -> None:
    with _lock:
        _write(path, records)


# ── Public API ─────────────────────────────────────────────────────────────────

def get_states() -> list | None:
    """Return cached state list, or None on miss/stale."""
    return _get(_CACHE_ROOT / 'states.json', 'states')


def set_states(records: list) -> None:
    """Persist state list to cache."""
    _set(_CACHE_ROOT / 'states.json', records)


def get_districts(state_code: str) -> list | None:
    """Return cached districts for a state, or None on miss/stale."""
    return _get(_CACHE_ROOT / 'districts' / f'{state_code}.json', 'districts')


def set_districts(state_code: str, records: list) -> None:
    """Persist districts for a state."""
    _set(_CACHE_ROOT / 'districts' / f'{state_code}.json', records)


def get_blocks(district_id: str) -> list | None:
    """Return cached blocks for a district (by MongoDB _id), or None on miss/stale."""
    return _get(_CACHE_ROOT / 'blocks' / f'{district_id}.json', 'blocks')


def set_blocks(district_id: str, records: list) -> None:
    """Persist blocks for a district."""
    _set(_CACHE_ROOT / 'blocks' / f'{district_id}.json', records)


def get_villages(block_id: str) -> list | None:
    """Return cached villages for a block (by MongoDB _id), or None on miss/stale."""
    return _get(_CACHE_ROOT / 'villages' / f'{block_id}.json', 'villages')


def set_villages(block_id: str, records: list) -> None:
    """Persist villages for a block."""
    _set(_CACHE_ROOT / 'villages' / f'{block_id}.json', records)


def invalidate(level: str = 'all') -> None:
    """Delete cached files for the given level.

    level: 'states' | 'districts' | 'blocks' | 'villages' | 'all'
    Useful when you want to force a refresh without deleting the whole data/ dir.
    """
    import shutil
    _ensure_dirs()
    targets = {
        'states':    [_CACHE_ROOT / 'states.json'],
        'districts': list((_CACHE_ROOT / 'districts').glob('*.json')),
        'blocks':    list((_CACHE_ROOT / 'blocks').glob('*.json')),
        'villages':  list((_CACHE_ROOT / 'villages').glob('*.json')),
    }
    if level == 'all':
        to_delete = [p for paths in targets.values() for p in paths]
    elif level in targets:
        to_delete = targets[level]
    else:
        raise ValueError(f'Unknown cache level: {level!r}. '
                         f'Choose from: {list(targets) + ["all"]}')

    with _lock:
        for p in to_delete:
            try:
                p.unlink()
                logging.info(f'geo_cache: invalidated {p}')
            except FileNotFoundError:
                pass


def cache_stats() -> dict:
    """Return a summary of what's currently cached (counts, not data)."""
    _ensure_dirs()
    return {
        'states':    1 if (_CACHE_ROOT / 'states.json').exists() else 0,
        'districts': len(list((_CACHE_ROOT / 'districts').glob('*.json'))),
        'blocks':    len(list((_CACHE_ROOT / 'blocks').glob('*.json'))),
        'villages':  len(list((_CACHE_ROOT / 'villages').glob('*.json'))),
    }
