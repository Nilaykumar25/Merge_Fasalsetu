# FasalSetu — Design

**Status:** Finalised. All open questions resolved — by contract files in `fasalsetu/` or by default answers accepted on 2026-09-30. No blocking decisions remain before Task 1.

---

## 0. Open Questions — Resolved vs Still Open

| # | Question | Status | Resolution source |
|---|----------|--------|-------------------|
| OQ-1 | Do the four contract files exist? | **Resolved** | Yes — in `fasalsetu/schemas/`, `fasalsetu/db/`, `fasalsetu/api/`, `fasalsetu/country_packs/` |
| OQ-2 | Port Node.js to Python? | **Resolved** | Yes — target is Python/FastAPI only |
| OQ-3 | Farmer actions: separate table vs appended events? | **Resolved** | Appended events — `response` event type in schema |
| OQ-4 | Integer paise or float native currency? | **Resolved** | Float in native currency — schema uses `net_impact: number`, `currency: string` |
| OQ-5 | Satellite: Copernicus or GEE? | **Resolved** | Both listed in country packs `sensing.satellite.provider`; Copernicus default |
| OQ-6 | Global guardrail baseline? | **Resolved** | Each pack's `compliance.banned` is authoritative; there is no separate global list — pack entries must cite a `source` |
| OQ-7 | Model ID hardcoding? | **Resolved** | Env vars `FS_MODEL_ORCHESTRATOR`, `FS_MODEL_TRANSLATE` per `tech.md` |
| OQ-8 | Grading crop allowlist? | **Resolved** | tomato, potato, banana (per `legacy/AnnaVriddhi/grading/README.md`); onion excluded |
| OQ-9 | Brazil pack minimum? | **Resolved** | `meta`, `locale`, `compliance` (with sources), `market`, `revenue`, `delivery`; all others `thin` fallback |
| OQ-10 | Phone numbers in event log? | **Resolved** | `farm_id` is pseudonymous; `contact` stored in-country per `FarmCreate` schema; never in event log |

### Resolved by default (all five accepted)

| # | Decision | Applies to |
|---|----------|-----------|
| SOQ-1 | `country_packs/pack.schema.json` is created in Task 1.2 alongside the pack loader. | Task 1 |
| SOQ-2 | `schemas/model_cards/` folder and the four `.md` files are created in Task 7.3. | Task 7 |
| SOQ-3 | Regional guardrail rules use ISO state code **prefix match** — `"KL"` matches any `region` value starting with `"KL"`. | Task 6, guardrail/rules.py |
| SOQ-4 | Delivery message templates live **inline in `pack.yaml`** under `delivery.templates`, keyed by `category` then `language`. The `delivery.sms.template_set` key is informational only; the actual strings are the `delivery.templates` block added in Task 4.2. | Task 4, both packs |
| SOQ-5 | `GET /schemes/search` with Brazil's `schemes.corpus: null` returns **HTTP 200** with an empty `items` array and a top-level `data_quality: "unavailable"` field. | Task 6, specialists router |

### Frontend open questions — resolved 2026-09-30

| # | Question | Resolution |
|---|----------|-----------|
| OQ-FE-1 | Supabase dependency and direct Gemini SDK | **Supabase stays for auth/profile only.** Farm/plot data moves to the backend API (`POST /farms`, `POST /farms/{farmId}/plots`); `farm_id` is stored in the Supabase user profile. The `@google/generative-ai` SDK import and `VITE_GEMINI_API_KEY` are removed from the frontend in Task 1-F — the backend's `llm/gemini.py` wrapper is the sole Gemini consumer. Supabase `fetchFarmContext()` is retained only for resolving `farm_id`/`plot_id` until Task 2-F completes the migration. |
| OQ-FE-2 | CalendarAlerts weather gap between Task 1-F and 2-F | **Task 2-F is scheduled immediately after Task 1-F.** The compat shim for `/weather/current` serves static seasonal fallback data tagged `source="simulated"` — never presented as real — bridging the gap for exactly one sprint. |
| OQ-FE-3 | In-browser NPK prediction vs `POST /soil/fertilizer` | **Keep in-browser `predictNPK()` using the JSON model export** (`npkModel.json`). The soil chat uses `POST /chat` (wired in Task 1-F). `POST /soil/fertilizer` is wired in Task 5-F only as an optional secondary path; the panel functions without it. |

---

## 1. Conflict Register

Conflicts between legacy code and the actual contracts are listed here. Each has a proposed resolution.

### C-1: Money representation — paise vs native currency float

**Legacy:** `legacy/AnnaVriddhi` `revenueService.js` stores money as INR floats. Earlier spec draft said "integer paise."  
**Contract (`recommendation_event.schema.json`):** `revenue.net_impact` is `type: number` in native currency; `currency` is a 3-letter ISO-4217 string.  
**Resolution:** Revenue layer Python port uses floats in native currency. No paise conversion needed. The earlier spec draft's "Paise = int" type alias is dropped.

### C-2: Farmer-action mutability

**Legacy:** `legacy/AnnaVriddhi/smsWhatsapp.js handleReply()` issues `UPDATE recommendation_events SET status …`.  
**Contract (`db/001_event_log.sql`):** `forbid_mutation()` trigger blocks all UPDATE and DELETE.  
**Resolution:** Port `handleReply` to Python. Replace UPDATE with INSERT of a `response` event. `farmer_actions` table from legacy schema is not created.

### C-3: Orchestrator model ID hardcoding

**Legacy:** `legacy/FasalSetu/agents/orchestrator.py` hardcodes `model="gemini-2.5-flash"`.  
**Contract (`tech.md`):** Model IDs from env vars only.  
**Resolution:** Replace with `os.getenv("FS_MODEL_ORCHESTRATOR", "gemini-2.5-flash")`; emit a startup `WARNING` if unset.

### C-4: Guardrail country logic in code

**Legacy:** `legacy/FasalSetu/compliance/guardrail.py` has hardcoded `_STATE_OVERRIDES` dict.  
**Contract (product.md rule 8, country pack `compliance.regional`):** No country logic in code.  
**Resolution:** Read regional overrides from `pack.compliance.regional`. Remove `_STATE_OVERRIDES` dict.

### C-5: Node.js runtime

**Legacy:** `legacy/AnnaVriddhi` backend is Express/Node.  
**Contract (`tech.md`):** Python, FastAPI, pydantic v2.  
**Resolution:** All service logic ported to Python. Node files are read-only references.

### C-6: Supabase vs PostgreSQL

**Legacy:** `legacy/AnnaVriddhi` uses Supabase SDK with RLS.  
**Contract (`tech.md`):** PostgreSQL 15+; no Supabase SDK.  
**Resolution:** psycopg2 (or SQLAlchemy core) against a standard `DATABASE_URL`. Supabase-specific tables and RLS policies are dropped.

### C-7: OpenAPI tag structure and endpoint naming

**Earlier spec draft** used tags from `legacy/AnnaVriddhi/api-contract.md`: `plots`, `crop-state`, `recommendations`, `irrigation`, `grading`, etc.  
**Contract (`api/openapi.yaml`):** Tags are `chat`, `farms`, `sensing`, `tracker`, `recommendations`, `events`, `specialists`, `season`, `delivery`, `packs`.  
**Resolution:** Router files follow the real OpenAPI tags. Earlier spec endpoint names (`/plots/{id}/crop-state`) are replaced with contract names (`/plots/{plotId}/condition`).

### C-8: Recommendation schema field names

**Earlier spec draft** used flat fields: `recommendation_type`, `severity`, `revenue_impact_paise`, `data_source`, etc.  
**Contract schema:** Nested `payload` with `oneOf` (`recommendation | delivery | response | outcome`). Top-level fields are `event_id`, `schema_version`, `event_type`, `country`, `farm_id`, `plot_id`, `occurred_at`, `parent_event_id`.  
**Resolution:** All Pydantic models and tests use the contract field names. No flat `revenue_impact_paise` field.

---

## 1b. Approved Contract Changes (api/openapi.yaml amendments)

These were proposed during the frontend audit phase and approved by the project owner on 2026-09-30. The changes are implemented in `fasalsetu/api/openapi.yaml` and `api/openapi.yaml` (synced). `frontend/src/api/schema.d.ts` was regenerated immediately after.

### PC-1: `compliance_substances` added to `PackSummary` — **APPROVED ✓**

**Problem:** The Compliance UI "Banned List" tab needs the full substance list, but `PackSummary` only returned `guardrail_ruleset`.  
**Change:** Added `compliance_substances: { banned: ComplianceSubstance[], restricted: ComplianceSubstance[] }` to the `PackSummary` schema. Added new `ComplianceSubstance` schema with fields `substance`, `source`, `retrieved_on`, `verified` (all seed entries have `verified=false`).  
**Impact:** `GET /country-packs/{code}` now includes the substance lists. Backend: Task 6.6. Frontend: Task 6-F.2.1.  
**Constraint:** `verified=false` on all current entries — they are illustrative seeds and must be verified against the national regulator before any real use. This is enforced in both the schema description and the frontend rendering (⚠️ chip on each entry).

### PC-2: `GET /guardrail/audit` added under `compliance` tag — **APPROVED ✓**

**Problem:** The Compliance UI "Audit Log" tab had no real backend endpoint; it was served by a shim that read the JSONL file directly.  
**Change:** Added `GET /guardrail/audit?last_n=20` returning `{ entries: AuditEntry[] }`. `AuditEntry` schema has: `event_id`, `occurred_at`, `ruleset`, `pre`, `post`, `rules_triggered`. Returns `403` when `FS_EXPOSE_AUDIT=false` (default). Automatically enabled when `FS_SEED_DEMO=true`.  
**PII rule:** The endpoint never returns raw query text, farm_id, or phone numbers — the backend strips everything except the six whitelisted fields before returning.  
**Impact:** Backend: Task 6.5. Frontend: Task 6-F.2.2 (live-polling audit tab).

### PC-3: `benefit_type`, `benefit_amount`, `level`, `state` added to `Scheme` as optional — **APPROVED ✓**

**Problem:** The legacy `GovSchemes.tsx` showed these four fields from ChromaDB metadata, but the new `Scheme` schema had dropped them.  
**Change:** Added four optional fields to the `Scheme` schema. No `GET /schemes/{id}` endpoint added (deferred).  
**Impact:** Backend: Task 3.3 (scheme router passes through these fields from ChromaDB metadata). Frontend: Task 3-F.6.1 (`SchemeCard` restores display of these fields with `?? "—"` fallback).

---

## 2. Repository Structure (target)

As defined in `fasalsetu/docs/REPO_STRUCTURE.md`. Key additions are noted.

```
fasalsetu/   ← contracts (READ-ONLY after Task 1)
└── schemas/, db/, api/, country_packs/

[merged repo root]/
├── LICENSE
├── README.md
├── DATA_PROVENANCE.md
├── docker-compose.yml
├── schemas/
│   ├── recommendation_event.schema.json  ← from fasalsetu/
│   └── model_cards/                      ← create in Task 7
│       ├── npk.md
│       ├── fertilizer_rf_v2.md
│       ├── disease_efficientnet.md
│       └── grading_rgb.md
├── api/
│   └── openapi.yaml                      ← from fasalsetu/
├── country_packs/
│   ├── PACK_SPEC.md                      ← from fasalsetu/
│   ├── pack.schema.json                  ← create in Task 1
│   ├── in/pack.yaml                      ← from fasalsetu/
│   └── br/pack.yaml                      ← from fasalsetu/
├── db/
│   └── 001_event_log.sql                 ← from fasalsetu/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── config.py                 # env var loading
│   │   │   ├── packs.py                  # PackLoader, PackValidationError, PackNotFoundError
│   │   │   └── i18n.py                   # language resolution
│   │   ├── eventlog/                     # BUILD FIRST
│   │   │   ├── models.py                 # Pydantic mirror of schema.json
│   │   │   ├── store.py                  # append(), query(); no update/delete paths
│   │   │   └── replay.py                 # feeds Season Review
│   │   ├── orchestrator/
│   │   │   └── pipeline.py               # full ordered sequence
│   │   ├── llm/
│   │   │   └── gemini.py                 # client wrapper; model ids from env
│   │   ├── agents/
│   │   │   ├── base.py                   # Candidate dataclass + BaseAgent ABC
│   │   │   ├── soil.py                   # NPK (GBR) + fertilizer (RF v2)
│   │   │   ├── weather.py
│   │   │   ├── market.py
│   │   │   ├── disease.py                # EfficientNet-B0
│   │   │   ├── scheme.py                 # ChromaDB RAG
│   │   │   ├── voice.py                  # Whisper / TTS
│   │   │   ├── satellite.py              # NEW — Sentinel-2
│   │   │   ├── irrigation.py             # from AnnaVriddhi
│   │   │   ├── harvest.py                # from AnnaVriddhi
│   │   │   ├── grading.py                # from AnnaVriddhi grading/
│   │   │   └── regenerative.py           # NEW
│   │   ├── tracker/
│   │   │   └── condition.py              # daily composite score
│   │   ├── revenue/
│   │   │   ├── formula.py                # yield × grade_price − cost − risk
│   │   │   ├── do_nothing.py             # threshold check; produces do_nothing Candidate
│   │   │   └── assumptions.py            # price_source, yield_baseline, risk_rate
│   │   ├── guardrail/
│   │   │   ├── pre.py                    # block on banned-substance intent
│   │   │   ├── post.py                   # scan final text; modified | block
│   │   │   └── rules.py                  # loads pack compliance + regional
│   │   ├── delivery/
│   │   │   ├── base.py                   # DeliveryProvider ABC
│   │   │   ├── mock_provider.py
│   │   │   ├── twilio_provider.py
│   │   │   ├── render.py                 # template rendering from pack
│   │   │   └── webhooks.py               # inbound reply → response event
│   │   ├── season/
│   │   │   └── review.py                 # "Crop Wrapped" from event log views
│   │   └── routers/                      # one file per OpenAPI tag
│   │       ├── chat.py
│   │       ├── farms.py
│   │       ├── sensing.py
│   │       ├── tracker.py
│   │       ├── recommendations.py
│   │       ├── events.py
│   │       ├── specialists.py
│   │       ├── season.py
│   │       ├── delivery.py
│   │       └── packs.py
│   ├── ml/
│   └── tests/
│       ├── test_eventlog_append_only.py
│       ├── test_revenue_do_nothing.py
│       ├── test_guardrail_country_rules.py
│       └── test_pack_schema.py
├── frontend/                             # FasalSetu UI unchanged
├── legacy/                               # READ-ONLY at runtime
│   ├── FasalSetu/
│   └── AnnaVriddhi/
├── .env.example
└── Makefile
```

---

## 3. Core Data Models

### 3.1 Candidate (agents → pipeline, never persisted directly)

```python
# backend/app/agents/base.py
from enum import Enum
from typing import Optional
from pydantic import BaseModel

class Category(str, Enum):
    irrigate     = "irrigate"
    fertilize    = "fertilize"
    spray        = "spray"
    cover        = "cover"
    harvest      = "harvest"
    grade        = "grade"
    sell         = "sell"
    hold         = "hold"
    scheme       = "scheme"
    regenerative = "regenerative"
    do_nothing   = "do_nothing"

class Candidate(BaseModel):
    agent: str                       # matches schema `agent` enum
    category: Category
    is_do_nothing: bool
    crop: Optional[str] = None
    # crop_condition is filled in by tracker, not by agents
    crop_condition_score: float      # 0–100
    # Revenue — filled in by revenue layer
    net_impact: float = 0.0          # native currency
    loss_if_ignored: Optional[float] = None
    currency: str = "INR"
    formula_version: str = "1.0"
    price_source: str = ""
    yield_baseline: str = ""
    risk_discount_rate: float = 0.10
    action_cost: float = 0.0
    risk_discount: float = 0.0
    # Action
    template_key: str = ""           # key into pack message_templates
    params: dict = {}
    act_by: Optional[str] = None
    reference: str = ""
    # Metadata
    confidence: float = 1.0
    long_term_note: Optional[str] = None    # regenerative only
    brics_relevance: Optional[str] = None   # regenerative only
```

### 3.2 Event envelope (persisted to recommendation_events)

The full schema is the authoritative definition (`schemas/recommendation_event.schema.json`). The Pydantic models in `backend/app/eventlog/models.py` mirror it exactly. Key top-level fields:

| Field | Type | Notes |
|-------|------|-------|
| `event_id` | uuid | PK, generated |
| `schema_version` | const "1.0.0" | |
| `event_type` | enum | recommendation \| delivery \| response \| outcome |
| `parent_event_id` | uuid \| null | null for recommendations |
| `country` | char(2) | ISO 3166-1 alpha-2 uppercase |
| `farm_id` | string | pseudonymous |
| `plot_id` | string \| null | |
| `occurred_at` | datetime | |
| `payload` | object | oneOf the four payload schemas |

Denormalised columns (in SQL, for querying; payload is source of truth): `agent`, `category`, `is_do_nothing`, `net_impact`, `currency`.

### 3.3 CountryPack (loaded from YAML, validated against pack.schema.json)

Top-level keys exactly as in `fasalsetu/country_packs/in/pack.yaml`:

```
pack_format, meta, locale, crops, compliance, market, soil_card,
sensing, revenue, models, delivery, schemes, data
```

Key nested types:
- `compliance.banned[]`: each entry has `substance` and `source` (required by PACK_SPEC).
- `compliance.restricted[]`: same shape.
- `compliance.regional`: dict keyed by ISO state code; each entry has `notes` and `source`.
- `revenue.do_nothing_threshold`: minimum net gain (native currency) to justify alerting.
- `delivery.reply_codes`: dict mapping inbound string → `acted` value.
- `models.<name>.status`: `reuse | retrain_required | unavailable`.

---

## 4. Pipeline Design (enforced in `orchestrator/pipeline.py`)

```
Request / Scheduled Trigger
        │
        ▼
┌─────────────────┐
│ guardrail.pre   │  pre.py: block banned-substance intent → logs pre=block, stops
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ tracker         │  condition.py: refresh composite score from soil + weather + photo + NDVI
└────────┬────────┘
         │
         ▼
┌───────────────────────────────────────┐
│  Specialist Agents (parallel)          │
│  soil · weather · market · disease     │
│  scheme · satellite · irrigation       │
│  harvest · grading (on demand)         │
│  regenerative                          │
│  Each returns list[Candidate]          │
└────────┬──────────────────────────────┘
         │
         ▼
┌─────────────────┐
│ revenue         │  formula.py: attach net_impact + assumptions to each Candidate
│                 │  do_nothing.py: if net_impact < threshold → replace with do_nothing Candidate
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ guardrail.post  │  post.py: scan final text against pack rules → pass | modified | block
│                 │  rules.py: writes JSONL audit entry regardless of outcome
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ eventlog.append │  store.py: INSERT recommendation event BEFORE delivery
│  (recommendation)│  event_id returned for use in delivery and response events
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ delivery        │  render.py: template from pack; DeliveryProvider.send()
│                 │  store.py: INSERT delivery event (parent_event_id = recommendation event_id)
└─────────────────┘

Later (inbound reply or sensor check):
  webhooks.py → store.py: INSERT response | outcome event (parent_event_id = recommendation event_id)
```

**Gemini's role:** Called only by the orchestrator to route queries to specialist agents and to phrase `action.template_key` rendered text in the farmer's language. Gemini never receives `net_impact`, thresholds, or guardrail decisions.

---

## 5. API Surface (maps to `api/openapi.yaml` tags)

One router file per tag in `backend/app/routers/`.

| Tag | Router | Key endpoints |
|-----|--------|---------------|
| chat | `chat.py` | POST /chat |
| farms | `farms.py` | POST /farms, POST /farms/{farmId}/plots |
| sensing | `sensing.py` | POST /plots/{plotId}/readings, POST /plots/{plotId}/photos |
| tracker | `tracker.py` | GET /plots/{plotId}/condition, GET …/condition/history |
| recommendations | `recommendations.py` | GET /plots/{plotId}/recommendations, POST /plots/{plotId}/recommendations |
| events | `events.py` | POST /events, GET /events, GET /events/{eventId}, GET /events/schema |
| specialists | `specialists.py` | GET /plots/{plotId}/irrigation, GET …/harvest-window, GET …/regenerative, GET …/satellite, POST /grading, POST /diagnose, POST /soil/fertilizer, GET /market/prices, GET /schemes/search |
| season | `season.py` | GET /plots/{plotId}/season-review |
| delivery | `delivery.py` | POST /webhooks/whatsapp, POST /webhooks/sms |
| packs | `packs.py` | GET /country-packs, GET /country-packs/{code} |
| (no tag) | `health.py` | GET /health |

---

## 6. Satellite Agent

**Primary source:** Copernicus Data Space Ecosystem (CDSE) — OAuth2 (`CDSE_CLIENT_ID`, `CDSE_CLIENT_SECRET`).  
**Fallback:** Google Earth Engine Python client when CDSE unavailable.  
**CI / demo:** Mock provider returning fixed values, tagged `source="simulated"`.

```
satellite.py fetch(lat, lon, date_range=(today-14d, today))
  → query STAC API for Sentinel-2 L2A tiles covering (lat, lon)
  → filter: cloud_cover_pct < 20, within date_range
  → select most recent qualifying scene
  → download B03, B04, B08 band windows at 10 m resolution
  → NDVI = (B08 − B04) / (B08 + B04)
  → NDWI = (B03 − B08) / (B03 + B08)
  → return SatelliteObservation(ndvi, ndwi, observed_at, cloud_cover_pct, provider="Sentinel-2 L2A")

  on failure:
  → return SatelliteObservation(ndvi=None, ndwi=None, provider="unavailable")
```

NDVI → crop condition band mapping (for `tracker/condition.py`):
- `ndvi < 0.2` → band `"critical"`, component score 10
- `0.2 ≤ ndvi < 0.4` → band `"stressed"`, component score 40
- `0.4 ≤ ndvi < 0.6` → band `"watch"`, component score 70
- `ndvi ≥ 0.6` → band `"good"`, component score 100

---

## 7. Revenue Formula

```python
# backend/app/revenue/formula.py

net_impact = (
    expected_yield_kg
    * grade_adjusted_price_per_kg       # market_price × crops[crop].grade_price_factor[grade]
    - action_cost                       # from pack intervention_costs
    - risk_discount                     # net_impact_before_discount × revenue.risk_discount_rate
)

# do_nothing counterfactual
loss_if_ignored = base_yield_kg * base_price_per_kg * crop_loss_pct_if_no_action

# threshold check (in do_nothing.py)
if net_impact < pack.revenue.do_nothing_threshold:
    return do_nothing_candidate(loss_if_ignored=loss_if_ignored)
```

All constants come from the active country pack. Gemini never receives these numbers. The `assumptions` sub-object is always populated and always has `estimated: true`.

**Brazil special case:** When `crops[crop].yield_baseline.value_kg_per_ha is null`, `expected_yield_kg` is null → revenue layer sets `confidence = 0.0` and marks the impact as low-confidence rather than guessing.

---

## 8. Guardrail Design

Split across three files in `backend/app/guardrail/`:

```
pre.py      — check_input(query, pack) → pass | raise GuardrailBlock
              Scans intent patterns against pack.compliance.banned substances.
              Writes JSONL entry with pre=block before raising.

post.py     — check_output(response_text, pack, region) → "pass" | "modified" | "block"
              Scans rendered text.
              Applies pack.compliance.banned, .restricted, .regional[region].
              Returns "modified" if warnings were added; "block" if a banned substance appears.

rules.py    — load_rules(pack) → compiled set of regex patterns + metadata
              All substance lists come from pack. No hardcoded names.
              Each rule entry carries source and retrieval date from the pack.
```

Audit log: `logs/compliance_audit.jsonl`. Each entry includes `ruleset`, `event_id`, `pre`, `post`, `rules_triggered`. Written for every check, pass or block.

---

## 9. Country Pack Format

Full spec in `fasalsetu/country_packs/PACK_SPEC.md`. The `pack.schema.json` (to be created in Task 1) validates against this spec. Key structural rules:

- `compliance.banned[].source` is required (validation fails without it).
- `models.<name>.status` must be `reuse | retrain_required | unavailable`.
- `meta.completeness` must be `full | thin`.
- `revenue.do_nothing_threshold` is in native currency units.
- Thin packs (Brazil) have `crops[crop].yield_baseline.value_kg_per_ha: null`; revenue layer handles null gracefully.

---

## 10. Frontend Integration

Shell unchanged — FasalSetu React/TypeScript/Vite. New features are cards in the chat, as defined in `fasalsetu/docs/REPO_STRUCTURE.md §Frontend`.

| Backend capability | Chat card |
|-------------------|-----------|
| Any recommendation (incl. do-nothing) | `RecommendationCard` — action, net_impact, "why/assumptions" expander, Done/Not-done buttons |
| Crop condition score | `ConditionCard` — score + band + NDVI chip |
| Grading | `GradeCard` — grade, confidence, "RGB-based, not hyperspectral" note |
| Season review | `SeasonCard` → opens `season/` view |
| Real vs simulated | Source badge on any card with sensor input |

`POST /chat` returns `recommendations[]` alongside `reply`; frontend renders one card per item. Frontend never calculates money figures.

---

## 11. Testing Strategy

Required test files (from `REPO_STRUCTURE.md`):

| File | Tests |
|------|-------|
| `tests/test_eventlog_append_only.py` | UPDATE → trigger fires; DELETE → trigger fires; valid INSERT succeeds; views queryable |
| `tests/test_revenue_do_nothing.py` | net_impact < threshold → do_nothing Candidate; null yield_baseline → low_confidence; loss_if_ignored ≥ 0; Gemini not called |
| `tests/test_guardrail_country_rules.py` | India banned substance → block; Brazil pack → same substance passes; regional override fires on matching region; every check writes JSONL |
| `tests/test_pack_schema.py` | India pack validates; Brazil pack validates; missing `source` on compliance entry → PackValidationError; unknown country code → PackNotFoundError |

Additional tests per task are specified in `tasks.md`.

---

## 12. Environment Variables

All documented in `.env.example`. No default values in `.env.example` — only key names and descriptions.

| Variable | Module | Notes |
|----------|--------|-------|
| `GEMINI_API_KEY` | llm/gemini.py | Required |
| `FS_MODEL_ORCHESTRATOR` | llm/gemini.py | Default: gemini-2.5-flash |
| `FS_MODEL_TRANSLATE` | llm/gemini.py | Default: gemini-2.5-flash |
| `FS_DELIVERY_PROVIDER` | delivery/base.py | `mock` or `twilio` |
| `TWILIO_ACCOUNT_SID` | delivery/twilio_provider.py | Required if provider=twilio |
| `TWILIO_AUTH_TOKEN` | delivery/twilio_provider.py | Required if provider=twilio |
| `TWILIO_PHONE_NUMBER` | delivery/twilio_provider.py | E.164 format |
| `CDSE_CLIENT_ID` | agents/satellite.py | Copernicus OAuth2 |
| `CDSE_CLIENT_SECRET` | agents/satellite.py | Copernicus OAuth2 |
| `DATABASE_URL` | eventlog/store.py | PostgreSQL connection string |
| `FS_SEED_DEMO` | main.py | `true` loads demo data |
| `FS_COUNTRY_CODE` | core/packs.py | Default: IN |
| `OPENWEATHER_API_KEY` | agents/weather.py | |
| `CHROMADB_PATH` | agents/scheme.py | Path to ChromaDB on disk |
| `FS_COMPAT_SHIMS` | routers/compat.py | `true` keeps legacy endpoint shims active; default `true` until all N-F tasks complete, then `false` |

**Frontend env vars (in `frontend/.env.example`):**

| Variable | Module | Notes |
|----------|--------|-------|
| `VITE_API_BASE_URL` | api/client.ts | Base URL for merged backend; default `http://localhost:8000` |
| `VITE_COUNTRY_CODE` | lib/packContext.tsx | ISO 3166-1 alpha-2; default `IN` |
| `VITE_GEMINI_API_KEY` | services/cropAdvisoryAI.ts | Legacy direct Gemini SDK key — keep until fully replaced by `POST /chat` |
| `VITE_WEATHER_API_KEY` | services/weatherService.ts | WeatherAPI.com key — retained for direct third-party calls |
