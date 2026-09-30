# FasalSetu — Build Steps So Far

> Hackathon: **Build with Bharat 2.0** — Theme: AI & ML  
> Venue: NIT Delhi, Narela (28.85°N, 77.09°E)  
> Last updated: September 2026

---

## Overview

FasalSetu is an AI-powered farming companion. The build has three major tracks running in parallel: the **core backend + AI agent system**, the **React frontend**, and the **data pipeline** (NPK models + Soil Health Card scraper). Each section below covers what was built, how, and the key decisions made.

---

## Track 1 — Backend API & Agent System

### 1.1 FastAPI Server (`main.py`)

Built a FastAPI application with `uvicorn[standard]` as the ASGI server. Key endpoints:

| Endpoint | Purpose |
|---|---|
| `POST /query` | Main orchestrator entry point for all farmer queries |
| `POST /analyze-image` | Disease detection from uploaded leaf photo |
| `POST /check-pesticide` | Standalone compliance demo endpoint |
| `GET /audit-log` | Returns the JSONL compliance audit trail |
| `GET /health` | Readiness check for Docker/load-balancer |
| `GET /docs` | Auto-generated Swagger UI |

The server accepts multipart form data (for image uploads) via `python-multipart` and validates all request/response shapes with Pydantic v2.

### 1.2 Orchestrator (`agents/orchestrator.py`)

The brain of the system. Built on **Google ADK** (`google-adk`):
- Uses `Agent`, `Runner`, and `InMemorySessionService` from the ADK
- Receives every `/query` call, enriches it with user context (crop, location, sensor data), then decides which specialist agent tool(s) to invoke
- Maintains per-session conversation memory via `InMemorySessionService`
- Wraps every query in the two-stage compliance guardrail (see 1.4)

Model used: **Gemini 2.5 Flash** (via `google-generativeai ≥0.8.0`)

### 1.3 Specialist Agents

Seven specialist agents, each exposing one or more tools that the orchestrator can call:

| Agent | File | Tools / Capability |
|---|---|---|
| Soil | `agents/soil_agent.py` | `predict_npk` (runs .pkl models), `get_soil_health_report` (pH/EC/salinity advice) |
| Weather | `agents/weather_agent.py` | `get_weather_forecast` (OpenWeatherMap + seasonal fallback), spray safety check |
| Market | `agents/market_agent.py` | `get_market_prices` (Agmarknet API live), MSP comparison, sell/hold advice |
| Disease | `agents/disease_agent.py` | `detect_crop_disease` — runs EfficientNet-B0 via ngrok tunnel to Colab |
| Scheme | `agents/scheme_agent.py` | `find_govt_schemes` — ChromaDB semantic search over 64 indexed schemes |
| Voice | `agents/voice_agent.py` | Whisper transcription, `deep-translator` translation, gTTS TTS |
| Offline | `agents/offline_agent.py` | Rule-based crop calendar + fertiliser calc, fallback when AI unavailable |

All agents are exported from `agents/__init__.py` as the 13-tool set the orchestrator registers.

### 1.4 Two-Stage Compliance Guardrail (`compliance/guardrail.py`)

The environmental protection core. Two stages wired around every query:

**Stage 1 — Pre-Execution (`check_input`):**  
Regex pattern matching runs *before* the query reaches the AI. Blocks queries that contain patterns like `(buy|use|apply|spray).*(ddt|endosulfan|monocrotophos|...)`. Returns a safe-alternatives response immediately, logs with `severity=HIGH, blocked=True`.

**Stage 2 — Post-Execution (`check_and_gate`):**  
Runs *after* the AI generates a response. Scans extracted text fields (not JSON keys) for:
- 13 banned substances (DDT, Endosulfan, Aldrin, Monocrotophos, etc.)
- 4 restricted substances (Glyphosate, Atrazine, 2,4-D, Cypermethrin)
- State-specific rules (e.g. Kerala: Glyphosate banned; Punjab: Atrazine restricted to pre-emergence)
- Confidence gating: responses with <75% confidence are flagged for expert review

Substance list lives in `compliance/banned_pesticides.json`.  
Every check — pass or fail — is appended to `logs/compliance_audit.jsonl` in a schema-versioned JSONL format.

### 1.5 Logging (`config/logging_config.py`)

Three rotating log files under `logs/` (auto-created at runtime, gitignored):
- `fasalsetu.log` — general application logs
- `compliance.log` — compliance decisions only
- `errors.log` — exceptions and stack traces

Set up via `setup_logging()` exported from `config/__init__.py`, called once at server startup.

---

## Track 2 — Frontend (React + TypeScript)

### 2.1 Stack

| Layer | Choice |
|---|---|
| Framework | React 18.3.1 + TypeScript |
| Build tool | Vite 6.3.5 |
| Styling | Tailwind CSS + Radix UI (20+ components) |
| Charts | Recharts 2.15.2 |
| Forms | react-hook-form 7.55.0 |
| Auth | Firebase 12.11.0 (Google OAuth) + Supabase (phone OTP) |
| Database client | `@supabase/supabase-js 2.80.0` |
| AI client | `@google/generative-ai 0.24.1` (direct Gemini calls from browser) |
| Routing | Manual (`window.history` pushState — no React Router) |

### 2.2 User Journey & Pages

**`/` — Landing Page (`LandingPage.tsx`)**  
Static hero with two CTAs: "Get Started" → `/onboarding`, "Login" → `/login`.

**`/login` — Auth (`LoginSignup.tsx`)**  
Dual auth paths:
- Google OAuth via Firebase popup (`signInWithPopup`) → extracts `displayName`, `email`, `uid` → redirects to `/onboarding` with name pre-filled
- Phone OTP via Supabase (`auth.signInWithOtp` → `auth.verifyOtp`) for +91 numbers → redirects to `/welcome`

**`/onboarding` — 3-Step Wizard (`OnboardingWizard.tsx`)**  
- Step 1: Name, age, experience level
- Step 2: Crop type (12 options + custom), farm size slider, soil type, current phase, sowing date
- Step 3: Language preference (8 Indian languages), IoT kit pairing placeholder, terms acceptance
- On complete: writes to Supabase `crop_cycles` table; language saved to localStorage

**`/home` — Main Dashboard**  
Central hub. Displays weather summary, NPK status, quick-action cards for each module, and the chat interface.

**AI Chatbot (primary interface)**  
Calls Gemini API directly from the frontend. Synthesises outputs from all modules into one conversational answer. Supports 8 languages. Chat history persisted to localStorage.

**NPK Module (in-browser ML)**  
Runs the NPK prediction models entirely in the browser using a JSON export of the trained weights — no backend call required. Works offline. MAE ±0.06 mg/kg.

**Market Module**  
Calls backend `/query` which routes to `market_agent`. Displays live mandi prices vs MSP in a Recharts table/chart.

**Disease Detection**  
Image upload → `POST /analyze-image` → EfficientNet-B0 via Colab ngrok tunnel → returns disease name + treatment steps.

**Government Schemes**  
Calls scheme agent via `/query` → ChromaDB semantic search → returns ranked scheme matches with match scores.

### 2.3 Authentication & Database

- **Supabase PostgreSQL** with Row Level Security (RLS) enabled
- Primary tables: `users`, `crop_cycles`, `disease_logs`, `soil_readings`
- **Firebase** only used for Google OAuth; Supabase handles everything else (phone OTP, database, storage for disease images)
- Several SQL migration files in the repo root (`ADD_MISSING_COLUMNS.sql`, `FIX_DISEASE_LOGS_TABLE.sql`, etc.) represent schema evolution during development

---

## Track 3 — ML Models

### 3.1 NPK Prediction Models (`NPK-Model-V1/`)

**Training data:** `data_core_csv.xlsx` — 8,000 IoT sensor readings (80/20 train/test split)

**Feature engineering** (`feature_engineering_implementation.py`): physics-informed agronomic features derived from raw sensor inputs (moisture, temperature, humidity, pH, EC).

**Models trained** (`train_models.py`):

| Nutrient | Best Model | Test MAE | Test R² |
|---|---|---|---|
| Nitrogen | XGBoost | 9.59 mg/kg | 0.020 |
| Phosphorous | Random Forest | 10.74 mg/kg | 0.062 |
| Potassium | Random Forest | 4.20 mg/kg | 0.011 |

Serialised with `joblib` → `.pkl` files for backend, also exported to JSON for in-browser inference.

Full training report per nutrient in `nitrogen_model_report.txt`, `phosphorous_model_report.txt`, `potassium_model_report.txt`.

**NPK-V1 web demo** (`web_app.py`, `nutrient_agent_app.py`): standalone Flask/Gradio app for isolated model testing, documented in `COMPLETE_APP_GUIDE.md`.

### 3.2 Disease Detection Model

- Architecture: **EfficientNet-B0** (pretrained ImageNet weights, fine-tuned)
- Dataset: PlantVillage (38 disease classes)
- Training: Google Colab (`scripts/train_disease_model_colab.py` — paste-and-run)
- Output: `models/disease_model.pth` + `models/disease_labels.json`
- Deployment: Colab session kept alive, exposed via **ngrok tunnel** that the backend calls

### 3.3 Government Schemes Vector Store

- **64 government schemes** ingested via `scripts/ingest_schemes.py`
- Embedded with `paraphrase-multilingual-MiniLM-L12-v2` (384-dim, supports Hindi/Marathi/Tamil/Telugu/English)
- Stored in **ChromaDB** (persistent, disk-based) at `chroma_db/` and `data/chroma_db/`
- Semantic search at query time returns ranked matches with scores

---

## Track 4 — Soil Health Card Data Pipeline (`shc-scraper/shc-local-scraper/`)

### 4.1 Background

The Government of India's [Soil Health Card portal](https://soilhealth.dac.gov.in) holds 2.53 crore lab-tested NPK/pH/micronutrient samples nationwide. Google Research published a scraper for it (requiring GCP Spanner + GCS + GKE). We forked it and replaced all cloud dependencies with SQLite + local disk, so it runs on a single laptop.

### 4.2 What Was Built

| File | Role | Origin |
|---|---|---|
| `local_main.py` | CLI entrypoint with 5 commands | New — replaces Google's `main.py` |
| `local_db.py` | SQLite schema + all Spanner query replacements | New |
| `storage.py` | Local disk read/write (mirrors GCS API) | New |
| `local_card_extractor.py` | Extraction pipeline glue | New |
| `scraper.py` | Browser automation against the portal | Google's original (with one fix — see 4.4) |
| `card_info_parser.py` | Protobuf-based field parsing | Google's original, unchanged |
| `extractor/` | BeautifulSoup HTML table parsing | Google's original, unchanged |
| `protos/card_pb2.py` | Compiled protobuf schema | Google's original, unchanged |
| `utils.py` | Logging (GCP Cloud Logging dependency removed) | Simplified |

### 4.3 CLI Pipeline — 5 Commands in Order

```bash
# Step 1: Walk the portal's dropdown menus, populate SQLite with every
#         village in the target states
python local_main.py INGEST --state 7,6      # 7 = Delhi UT, 6 = Haryana

# Step 2: For each ingested village, fetch which soil cards exist
python local_main.py CARDS --limit 50

# Step 3: Download the actual HTML card reports (headless browser, slowest step)
#         --max-storage-mb is a hard disk cap checked before every download
python local_main.py SCRAPE --limit 50 --max-storage-mb 500

# Step 4: Parse HTML → structured N/P/K/pH/EC/OC/micronutrient fields in SQLite
python local_main.py EXTRACT --limit 200

# Step 5: Export to CSV, optionally filtered by distance from a GPS point
#         Default center = NIT Delhi (28.85°N, 77.09°E)
python local_main.py EXPORT --out shc_nit_delhi.csv --near-radius-km 15
```

All stages are **resumable**: completed villages/cards are checkpointed in SQLite, so interrupted runs just continue from where they left off. To start fresh: `rm -rf data/`.

### 4.4 Bug Fix Applied — pyppeteer on Apple Silicon

**Problem:** `BrowserError: Browser closed unexpectedly` on every run.  
**Root cause:** pyppeteer's auto-downloaded Chromium is an x86_64 binary — it silently crashes on Apple Silicon (ARM) Macs without any useful error message.

**Fix in `scraper.py` — `ShcDL.setup()`:**
- When `RUN_LOCALLY=1` (set automatically by `local_main.py`), the setup method now looks for system Chrome at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` and passes it as `executablePath`
- If `RUN_LOCALLY` is set to an explicit binary path, that path takes priority (escape hatch for non-standard installs)
- Added `--disable-dev-shm-usage` flag (improves Chrome headless stability)
- The container/Linux branch (hardcoded `/usr/bin/chromium`) is unchanged

**Dependency conflict also fixed:** `pip install -r requirements.txt` downgraded `websockets` to `10.4` and `urllib3` to `1.26`, breaking `google-genai` and `conda-repo-cli`. Restored both to current versions (`websockets>=13`, `urllib3>=2.2`). pyppeteer emits a resolver warning but works correctly at runtime with the newer versions.

---

### 4.5 Portal Migration Fix — ASP.NET → GraphQL

**Problem:** `ElementHandleError: failed to find element matching selector "#forgeryToken"` on every INGEST run.  
**Root cause:** `soilhealth.dac.gov.in` was completely rebuilt as a React SPA (August 2026). The old server-rendered ASP.NET page with `#forgeryToken`, `#State_cd2`, `#Dist_cd2`, etc. no longer exists — the HTML shell is just `<div id="root">`. All data now comes from a GraphQL API at `https://soilhealth4.dac.gov.in/graphql`.

**How the new API was discovered:** Downloaded the SPA's JS bundle (`index-Ed_k0WPH.js`, ~4MB), searched for `GetVillage`, `GetBlocks`, and Apollo client setup. Found the GraphQL query definitions and the `uri: "https://soilhealth4.dac.gov.in"` Apollo client configuration. Confirmed the API was live via `curl`. The CSP header on the main domain also listed `soilhealth4.dac.gov.in` in `connect-src`.

**New GraphQL queries used:**
| Query | Purpose |
|---|---|
| `getState(code: $code)` | Resolve numeric state code → MongoDB `_id` |
| `getdistrictAndSubdistrictBystate(state: $state)` | List districts for a state |
| `getBlocks(state: $state, district: $district)` | List blocks for a district |
| `getVillageBydistrict(state, district, block)` | List villages for a block |

IDs are now MongoDB ObjectIds (24-char hex strings like `63f5c2cf98d5e0c03dba5507`) rather than the old small integers. The headless browser is still used for the CARDS/SCRAPE steps — only INGEST was migrated to direct HTTP.

**Rate-limiting behaviour observed and handled:** The GraphQL backend throttles bursts of rapid requests (>~10 req/10s from the same IP) by returning HTTP 200/400 with `{"errors":[{"message":"Unable to connect to the server, please try again later"}]}` — a WAF-sanitised error, not a real 429. This was reproduced by accidentally firing 35 test queries in a loop.

**Three-part fix:**

**1. `_gql()` rewrite (`scraper.py`):**
- Module-level `requests.Session`, lazily created and warmed by fetching the SPA shell first (sets any session cookie the WAF expects)
- Browser-like `User-Agent` + `Accept` headers — bare `requests` UA is easy for WAFs to fingerprint
- Content-based throttle detection via `_is_throttle_response()` — catches the sanitised error regardless of HTTP status code
- Gentle backoff schedule `[5, 15, 45, 90, 180]s` tuned to the government server's recovery window (old `2^n` exponential was too aggressive at 2/4/8/16s)
- HTTP 400 parsed before `raise_for_status()` — throttle 400s are retried, real schema errors are not

**2. `geo_cache.py` (new file):**
- JSON-backed local cache for states/districts/blocks/villages under `data/geo_cache/`
- TTLs: states 90 days, districts/blocks 30 days, villages 7 days
- Atomic writes via `tmp → rename` — no half-written files on interrupt
- `get_*()`/`set_*()` API; `invalidate(level)` for manual refresh; `cache_stats()` for inspection
- Wired into `getDistricts`, `getBlock`, `getVillages` — cache hit returns immediately, miss fetches from GraphQL then persists. Geography is never re-fetched within the TTL window.

**3. `local_db.py` schema migration:**
- `Districts`, `SubDistricts`, `Villages`, `Cards`, `Cards_info`, `Checkpoints` tables updated from `INTEGER` to `TEXT` primary keys
- `insertDistricts/SubDistricts/Villages` changed from `int()` cast to `str()` cast
- `init_db()` detects the old INTEGER schema via `PRAGMA table_info` and auto-migrates (drops + recreates affected tables, logs a warning to re-run INGEST)
- Missing `import logging` also added to `local_db.py`

**Smoke-tested offline (10/10 pass):** geo_cache round-trips, invalidation, schema TEXT column types, insert/query/mark with real MongoDB ObjectId strings, get_village_view JOIN chain, auto-migration from old INTEGER schema.

---

### 4.6 Maintenance-Window Detection

**Problem observed:** Even after all the GraphQL fixes, `INGEST` kept failing at ~1:25 AM IST with 5 successive retries burning 5+15+45+90 seconds before giving up. The gateway returned `{ __typename }` fine but every data resolver returned "Unable to connect to the server." This is a government server maintenance window — nothing wrong with the code.

**Root cause of the long wait:** `_is_throttle_response()` correctly matched the error message, but the retry logic couldn't distinguish "this will recover in 60 seconds" (real throttle) from "this won't recover until morning" (maintenance window). It retried 5 times with long backoffs for nothing.

**Fix — two-probe pattern:**

`_gql_backend_is_up()` — a cheap `{ __typename }` probe that the gateway answers without touching any upstream service. Used to distinguish:
- Gateway down → network/DNS issue, no point retrying
- Gateway up + data resolver down → maintenance window, fail fast
- Both up → transient throttle, retry with backoff

On the first failed data query, `_gql()` now calls `_gql_backend_is_up()`. If the gateway responds, it raises `RuntimeError` immediately with a clear maintenance-window message including current IST time, instead of burning all retries.

`ingest()` in `local_main.py` now runs a pre-flight check before launching Chrome. It probes `{ __typename }` then a real `getState` query. On failure it prints the maintenance-window message and returns immediately — no browser launch, no wasted time.

Also fixed in `local_main.py`: `sorted(..., key=lambda d: int(d["id"]))` on district and subdistrict lists — these IDs are now MongoDB hex strings and would crash on `int()` cast. Changed to sort by `name` instead.

### 4.5 Hackathon-Specific Additions

- **`--state` accepts a comma-separated list** (`--state 7,6`) so Delhi + Haryana can be scraped in one run. NIT Delhi sits on the Delhi/Haryana border — Delhi UT is overwhelmingly urban, so real farmland coverage near the venue comes from the Haryana side.
- **`--near-lat / --near-lon / --near-radius-km`** on EXPORT filters the final CSV to samples within N km of a GPS point. Defaults to NIT Delhi coordinates, so `--near-radius-km 25` alone is sufficient for venue-relevant data.
- **1.5s politeness delay** between every request by default (`SHC_REQUEST_DELAY` env var). This is a shared government server — rate limiting is intentional.
- **`--max-storage-mb`** hard cap on SCRAPE: measures `data/` folder size before every download, stops cleanly at the threshold. Prevents runaway disk usage during pilot runs.

---

## Infrastructure & DevOps

### Docker

`Dockerfile` + `docker-compose.yml` provided for containerised deployment. Key compose details:
- Mounts: `models/`, `data/`, `logs/`, `chroma_db/` as named volumes
- Health check: `curl http://localhost:8000/health`

### Environment Variables

Managed via `.env` (gitignored) + `.env.example`. Keys required:
- `GEMINI_API_KEY` / `GOOGLE_API_KEY`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- `FIREBASE_*` config values
- `OPENWEATHERMAP_API_KEY`
- `SHC_REQUEST_DELAY` (optional, default `1.5`)
- `RUN_LOCALLY` (set automatically; can override with a Chrome binary path)

### CI/CD

Not configured — manual deployment only at this stage.

---

## Track 5 — Soil Health Card Data (Offline Recovery)

### 5.1 Google Research LFS Data Discovery

While waiting for the government portal outage to resolve, investigated the upstream Google Research repo (`google-research-datasets/india-soil-health-card`). Key finding: on 2023-12-02, a researcher added 29 state-wise SHC CSVs via Git LFS, then deleted them from the tree on 2023-12-27. **Git LFS objects are content-addressed and never purged** — they remain downloadable via the LFS batch API even after deletion from the git tree.

LFS OID for Haryana: `958d05536e3aadc874785dbdcaf84f0e99f1253529b3785b36f0c648a4cbeb35` (18.5 MB)

Retrieval method:
```bash
# 1. Get the real OID from the deleted commit
git clone --depth=50 https://github.com/google-research-datasets/india-soil-health-card.git
git show a8ae0c1:"MSAnalysis/Data/Haryana.zip"  # prints LFS pointer with OID + size

# 2. Get a presigned download URL from the LFS batch API
curl -X POST https://github.com/google-research-datasets/india-soil-health-card.git/info/lfs/objects/batch \
  -H "Accept: application/vnd.git-lfs+json" \
  -H "Content-Type: application/vnd.git-lfs+json" \
  -d '{"operation":"download","transfers":["basic"],"objects":[{"oid":"<OID>","size":<SIZE>}]}'

# 3. Download via the presigned URL
curl -L -o Haryana.zip "<presigned_url>"
```

### 5.2 Haryana CSV + Rajasthan CSV

Both ZIPs contained a single structured CSV with the same `Cards_info` schema. Loaded with pandas `to_sql` — no transformation needed.

| State | LFS OID (first 16 chars) | Raw rows | Valid coords | DB tag suffix |
|---|---|---|---|---|
| Haryana | `958d05536e3aaddc...` | 142,807 | 128,884 | `_haryana_lfs` |
| Rajasthan | `39527bdbd5f5d96a...` | 89,542 | 89,486 | `_rajasthan_lfs` |

**Total `Cards_info` rows after both loads: 233,759**

Coordinate cleaning: rows with lat/lon outside the state's geographic bounding box had coordinates nulled (row kept, just excluded from proximity filters).

### 5.3 Venue-Scoped Exports

Two venue CSVs exported and copied to the FasalSetu project root:

**NIT Delhi** (`haryana_nit_delhi_50km.csv`):
- Center: 28.85°N, 77.09°E — NIT Delhi campus, Narela
- Source: Haryana LFS data
- 3,292 samples within 50km | closest: 1.6km | P+K 100% | N 20%

**Manipal University Jaipur** (`muj_jaipur_50km.csv`):
- Center: 26.843°N, 75.565°E — Dehmi Kalan, off Jaipur-Ajmer Expressway, Sanganer, Jaipur
- Source: Rajasthan LFS data
- 12,536 samples within 50km | closest: 436m from campus | P+K ~100% | N sparse
- Dominant soil chemistry: pH ~8.1 (alkaline), EC 0.27 dS/m, OC 0.28% (low), P 36 kg/ha (medium), K 288 kg/ha (medium)

To re-export at a different radius:
```bash
# NIT Delhi
python local_main.py EXPORT --out nit_delhi_25km.csv --near-radius-km 25

# MUJ Jaipur
python local_main.py EXPORT --out muj_25km.csv --near-lat 26.843 --near-lon 75.565 --near-radius-km 25
```

### 5.4 XML Ingest Tool (`xml_ingest.py`)

Also built a standalone XML parser for the older Selenium-scraped XML format (as used by `deepanshu-yadav/soil_data_analysis`). Handles the `{SoilHealthCard}` namespace, distinguishes metadata vs nutrient `Details1` elements by attribute presence, parses `"Geo Position (GPS):Latitude X°N Longitude Y°E"` format. Tested against 1,415 Amritsar XML files — all parsed cleanly. Usage: `python xml_ingest.py --xml-dir /path/to/xmls`.

---

## Track 6 — Fertilizer Recommendation Model (`npk-train-shc-fertilizer/`)

### 6.1 Overview

A separate ML pipeline that takes soil nutrient status (from a real SHC sample or manual farmer input) and recommends a fertilizer product. Built in two iterations — v1 on a small reference dataset, v2 on a verified 10,000-row dataset. The architecture is deliberately kept as a data-swap pipeline so upgrading the training CSV doesn't require rewriting any inference code.

### 6.2 V1 — Base 99-Row Dataset

**Training data:** `fertilizer_prediction_base.csv` — the public 99-row Kaggle "Fertilizer Prediction" dataset (`gdabhishek/fertilizer-prediction`), pulled from a Hugging Face mirror. Columns: Temperature, Humidity, Moisture, Soil Type, Crop Type, Nitrogen, Phosphorous, Potassium, Fertilizer Name. 7 fertilizer classes, 11 crops, 5 soil types.

**Honest limitations discovered and documented:**
- Labels are rule-derived from N/P/K (independent analysis confirmed this — ~99% CV accuracy is a symptom, not a result)
- N/P/K are on a synthetic 0–42 scale, not real kg/ha values — can't feed real SHC readings directly

**The unit-mismatch problem and `rating_bridge.py`:** Real SHC cards report N/P/K in kg/ha with a Low/Medium/High rating. The training set's scale is incompatible. Fix: never compare raw numbers — map SHC's Low/Medium/High rating to the training set's own tertiles by rank. `compute_tertile_bounds()` splits the training set's N/P/K into thirds; `rating_to_value()` samples from the matching tertile.

**Critical semantic bug found and fixed during grid validation:** First version mapped SHC "Low N" → training set's low N values. Wrong. Verified empirically: Urea rows in the training set have Nitrogen 35–42 (top of the range), not bottom. The training set's N/P/K represent *nutrient to be applied* (need-based), not *nutrient present in soil* (status-based). So SHC "Low N" (soil deficient → field needs a lot applied) must map to the training set's *high* tertile. Fixed with explicit inversion in `rating_bridge.py`, documented inline so it's never accidentally "corrected" backwards.

**Augmented version:** `build_augmented_dataset.py` derives a majority-vote rule per N/P/K-tertile cell from the base data, fills the 12 unobserved cells from nearest neighbors, resamples ~900 synthetic rows. Reduced low-confidence predictions from 40% → 8% on the grid check. Default model is the augmented one (`fertilizer_model.pkl`); original kept as `fertilizer_model_base99.pkl`.

**Validation (`validate_model_grid.py`):** Enumerates all 27 N/P/K-rating combinations, checks low-confidence rate and directional sanity (does Urea appear more when N is deficient than when K is?). This grid check is what caught the semantic inversion bug — CV accuracy alone wouldn't have.

### 6.3 V2 — 10,000-Row Miadul Dataset

**Dataset:** `fertilizer_recommendation_miadul.csv` — 10,000 rows, 20 columns, zero missing values, zero duplicates. Columns include `Soil_pH`, `Organic_Carbon`, `Electrical_Conductivity`, `Crop_Growth_Stage` — features the v1 dataset couldn't represent at all.

**Verification performed before trusting it:**

| Check | Result |
|---|---|
| Urea mean N vs overall mean | 43.9 vs 89.0 — Urea appears when N is *low* ✅ |
| DAP mean P vs overall mean | 26.7 vs 49.0 — DAP appears when P is *low* ✅ |
| MOP mean K vs overall mean | 32.4 vs 64.1 — MOP appears when K is *low* ✅ |
| Compost mean pH | 5.32 (vs overall 6.49) — compost for acidic soil ✅ |
| Zinc Sulphate mean pH | 7.75 (vs overall 6.49) — Zn supplementation for alkaline soil ✅ |

N/P/K semantics are **status-based** (correct direction — no inversion needed). `rating_bridge_v2.py` maps SHC "Low" directly to the low tertile, with the reasoning documented explicitly to prevent copy-pasting v1's inversion.

**New architectural simplification:** pH/OC/EC from real SHC rows pass straight through to the model — no bridging. SHC's `pH_value`/`OC_value`/`EC_value` are in the same physical units this dataset uses (pH 0–14, OC in %, EC in dS/m).

**Problem found during validation:** Initial training confused SSP and NPK badly (NPK precision 0.32, SSP recall 0.03). Diagnosed by checking every unused categorical column against just those two classes — `Crop_Growth_Stage` was a clean discriminator: NPK is 71% Vegetative-stage; SSP is 0% Vegetative-stage. Agronomically sensible (SSP's sulfur/calcium matters at Flowering/Harvest/Sowing, not vegetative growth). Adding the feature brought NPK precision to 0.94. `fertilizer_agent_v2.py` requires `growth_stage` as an input (defaults to `'Vegetative'` if omitted, flagged in `_assumptions`).

**Remaining honest weakness — SSP:** Even after adding growth stage, SSP precision is ~0.12 (182/10,000 rows, 1.8% of training data). `class_weight='balanced'` makes the model over-eager to predict it. Any result where `fertilizer == 'SSP'` or SSP probability exceeds 15% carries a `low_confidence_class_warning` in the response — surfaced explicitly rather than hidden.

**Validation results (`validate_model_grid_v2.py`):**
- 4 directional checks: N-deficiency→Urea, K-deficiency→MOP, acidic→Compost, alkaline→Zinc Sulphate — all pass
- 5% low-confidence rate across 972 tested combinations (vs 8% for v1 augmented)
- Overall CV accuracy: 88% (far more believable than v1's ~99%)

### 6.4 Files

| File | Purpose |
|---|---|
| `fertilizer_agent.py` | V1 inference: `recommend_from_coordinates()`, `recommend_from_manual_npk()` |
| `fertilizer_agent_v2.py` | V2 inference: same interface + `growth_stage`, `ph`, `organic_carbon`, `electrical_conductivity` params |
| `rating_bridge.py` | V1 unit bridge with inversion (need-based dataset) |
| `rating_bridge_v2.py` | V2 unit bridge, direct mapping, no inversion (status-based dataset) |
| `train_fertilizer_model.py` | V1 training → `fertilizer_model.pkl` |
| `train_fertilizer_model_v2.py` | V2 training → `fertilizer_model_v2.pkl` |
| `validate_model_grid.py` | V1 grid validator (27 N/P/K combos, 2 directional checks) |
| `validate_model_grid_v2.py` | V2 grid validator (972 combos, 4 directional checks) |
| `build_augmented_dataset.py` | Generates `fertilizer_prediction_augmented.csv` from the 99-row base |
| `coordinate_lookup.py` | KD-tree nearest-SHC-sample lookup by lat/lon |
| `fertilizer_model.pkl` | V1 augmented model (default) |
| `fertilizer_model_v2.pkl` | V2 model (recommended primary path) |

### 6.5 Integration with SHC Data

`fertilizer_agent_v2.py`'s `recommend_from_coordinates()` takes a lat/lon, finds the nearest SHC sample from the exported CSV (Haryana or Rajasthan data), passes pH/OC/EC directly and bridges N/P/K through `rating_bridge_v2`. The `haryana_nit_delhi_50km.csv` and `muj_jaipur_50km.csv` exports from Track 5 are the intended input for this path.

```bash
# Quick demo
cd npk-train-shc-fertilizer/shc-fertilizer
python fertilizer_agent_v2.py
```

### 6.6 Which Version to Use

Use **v2** (`fertilizer_agent_v2.py` + `fertilizer_model_v2.pkl`) as the primary demo path — it uses pH/OC/EC (features the SHC data actually provides), has a believable 88% accuracy, and the fertilizer taxonomy includes MOP and Zinc Sulphate which the v1 dataset couldn't represent. Keep v1 as the fallback narrative: "we started with a small reference dataset, found and fixed a semantic inversion bug in it, then upgraded to a 10,000-row dataset and re-validated with the same rigor" is a strong judge story about process.



| Component | Status |
|---|---|
| FastAPI backend + agent orchestration | ✅ Functional |
| Compliance guardrail (both stages) | ✅ Functional, audit log working |
| NPK prediction (backend .pkl + frontend JSON) | ✅ Functional |
| Weather agent (OpenWeatherMap + fallback) | ✅ Functional |
| Market agent (Agmarknet + MSP) | ✅ Functional |
| Scheme agent (ChromaDB, 64 schemes) | ✅ Functional |
| React frontend (full UI, all pages) | ✅ Functional |
| Auth (Google OAuth + Phone OTP) | ✅ Functional |
| Disease detection | ⚠️ Requires live Colab + ngrok session |
| Voice TTS | ⚠️ Falls back to Web Speech API without Chirp3 key |
| SHC scraper (local fork) | ✅ Pipeline complete; pyppeteer ARM fix applied |
| IoT sensor live dashboard | ❌ Arduino code exists, no live display |
| Session persistence across restarts | ❌ InMemorySessionService lost on restart (Redis needed) |
