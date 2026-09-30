# FasalSetu – Repo Structure

Apache-2.0. Shell = FasalSetu. Spine = the recommendation-event log.

**Scope of the merge:** from AnnaVriddhi we take *backend logic and features only* (event log, condition tracker, irrigation, revenue layer, delivery, grading, harvest, season review). **No AnnaVriddhi UI is reused.** The entire frontend is FasalSetu's (React + TypeScript + Vite, mobile-first, manual routing, chatbot as the primary interface). AnnaVriddhi's screen spec is not used; new capabilities surface inside FasalSetu's chat-first UI.

**LLM:** Gemini API throughout (Google ADK + `google-genai`). Gemini routes queries and phrases replies; it never computes money figures, thresholds or guardrail decisions. Those come from deterministic code.
Rule: **no agent talks to a farmer directly.** Agents return a `Candidate`; the revenue layer prices it; the guardrail checks it; the event log records it; only then does delivery send it.

```
fasalsetu/
├── LICENSE                     # Apache-2.0
├── README.md                   # DPG-style: purpose, privacy, data ownership, interoperability
├── DATA_PROVENANCE.md          # SHC source, licence status, "demo dataset" labelling
├── docker-compose.yml          # api, postgres, chroma, worker, (optional) whatsapp-mock
│
├── schemas/                    # PUBLISHED, country-neutral, versioned
│   ├── recommendation_event.schema.json
│   └── model_cards/            # one .md per trained model (NPK, fertilizer, disease, grading)
│
├── api/
│   └── openapi.yaml            # the merged contract (frontend + backend + partners)
│
├── country_packs/              # config only, zero country logic in code
│   ├── PACK_SPEC.md
│   ├── pack.schema.json        # validates every pack at startup (to write)
│   ├── in/   (pack.yaml)      # full
│   └── br/   (pack.yaml)      # thin
│
├── db/
│   └── 001_event_log.sql       # append-only event store + views
│
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI app factory, loads country pack per request
│   │   ├── core/               # config.py, packs.py (loader+validation), i18n.py
│   │   ├── eventlog/           # <-- BUILD FIRST
│   │   │   ├── models.py       # pydantic mirror of the JSON schema
│   │   │   ├── store.py        # append(), query(); no update/delete
│   │   │   └── replay.py       # feeds Season Review + next-season tuning
│   │   ├── orchestrator/       # Google ADK root agent on Gemini API + pipeline.py
│   │   ├── llm/                # gemini client wrapper: model ids from env, retries, JSON mode, offline fallback hook
│   │   ├── agents/
│   │   │   ├── base.py         # Agent -> list[Candidate]
│   │   │   ├── soil.py         # NPK (GBR) + fertilizer (RF v2); rule-based offline fallback
│   │   │   ├── weather.py      # OpenWeatherMap + spray safety
│   │   │   ├── market.py       # Agmarknet / pack price source
│   │   │   ├── disease.py      # EfficientNet-B0
│   │   │   ├── scheme.py       # ChromaDB RAG
│   │   │   ├── voice.py        # Whisper / TTS / translation
│   │   │   ├── satellite.py    # Sentinel-2 NDVI/NDWI (NEW)
│   │   │   ├── irrigation.py   # sensor-driven (from AnnaVriddhi)
│   │   │   ├── harvest.py      # harvest window
│   │   │   ├── grading.py      # OpenCV, RGB only
│   │   │   └── regenerative.py # cover crop, intercrop, residue, tillage, amendments (NEW)
│   │   ├── tracker/condition.py   # daily composite score; inputs tagged real|simulated|satellite
│   │   ├── revenue/            # MANDATORY MIDDLEWARE
│   │   │   ├── formula.py      # yield x grade_price - action_cost - risk_discount
│   │   │   ├── do_nothing.py   # explicit no-action candidate; wins if net <= threshold
│   │   │   └── assumptions.py  # price source, yield baseline, risk rate -> shown to farmer
│   │   ├── guardrail/          # pre.py, post.py, rules.py (loads pack rules; JSONL audit)
│   │   ├── delivery/           # whatsapp.py, sms.py, render.py (templates), webhooks.py
│   │   ├── season/review.py    # "Crop Wrapped"
│   │   └── routers/            # one file per tag in openapi.yaml
│   ├── ml/                     # training scripts + artefacts (.pkl + JSON export)
│   └── tests/
│       ├── test_eventlog_append_only.py
│       ├── test_revenue_do_nothing.py
│       ├── test_guardrail_country_rules.py
│       └── test_pack_schema.py
│
├── frontend/                   # FasalSetu UI only. React + TS + Vite, chat-first, manual routing
│   └── src/
│       ├── chat/           # primary interface; renders recommendation cards inline
│       ├── components/cards/   # RecommendationCard, ConditionCard, GradeCard, SeasonCard
│       ├── plot/           # light secondary view (score history), not a dashboard
│       ├── season/         # Crop Wrapped, opened from chat
│       └── offline-npk/    # in-browser inference (existing)
│
├── edge/sensor_gateway/        # MQTT/HTTP ingest; every reading tagged source=real|simulated
│
└── data/
    ├── shc_demo/               # Haryana + Rajasthan, labelled DEMO
    └── sensor_demo/            # labelled SIMULATED where applicable
```

## Request lifecycle (enforced in `orchestrator/pipeline.py`)

1. `guardrail.pre`: block banned-substance queries (logs `pre=block`, stops).
2. `tracker.condition`: refresh plot score from latest inputs.
3. Agents propose `Candidate[]` (action, params, cost, expected yield delta, confidence).
4. `revenue.formula`: attach money impact + assumptions; add `do_nothing`; rank; pick winner.
5. `guardrail.post`: scan final text against the pack ruleset.
6. `eventlog.append(recommendation)` **before** delivery, so a failed send is still on record.
7. `delivery`: channel/language from farmer profile + pack.
8. Inbound reply or later check: `eventlog.append(response | outcome, parent_event_id)`.

## Build order mapped to folders
1. `db/`, `schemas/`, `backend/app/eventlog/`; make existing agents emit Candidates
2. `tracker/` + `agents/satellite.py`
3. `agents/irrigation.py` + `revenue/`
4. `delivery/`
5. grading, harvest, regenerative
6. `country_packs/` (in full, br thin) + `core/packs.py`
7. `season/`, demo data, pitch

## Frontend: how backend features appear in FasalSetu's UI

No new app shell. Each AnnaVriddhi-derived feature is a **card inside the chat** (or opened from one), using FasalSetu's existing components and styling.

| Backend feature | Where it shows in the FasalSetu UI |
|---|---|
| Recommendation (incl. do-nothing) | `RecommendationCard` in chat: action, rupee impact, "why / assumptions" expander, "Done / Not done" buttons (write `response` events) |
| Crop Condition score | `ConditionCard` in chat; tap opens the small score-history view |
| Irrigation / harvest / regenerative | Same `RecommendationCard`, different category chip |
| Grading | Photo upload in chat -> `GradeCard` (grade, price effect, "RGB-based, not hyperspectral" note) |
| Season Review | `SeasonCard` in chat; "Open full review" routes to `season/` |
| Real vs simulated data | Small badge on any card built from sensor input |
| SMS/WhatsApp | Not UI; replies map to the same Done / Not done events |

`/chat` returns `recommendations[]` alongside `reply`; the frontend renders one card per item. The frontend never calculates money figures.

## Gemini configuration

```
GEMINI_API_KEY=...            # Google AI Studio / Gemini API
FS_MODEL_ORCHESTRATOR=gemini-2.5-flash    # ids live in env, not code
FS_MODEL_TRANSLATE=gemini-2.5-flash
```
- Orchestrator routes to specialists via ADK; specialists that are trained models (NPK, fertilizer, disease, grading) stay non-LLM.
- Gemini is used for routing, multilingual phrasing of rendered templates, and scheme-answer synthesis.
- Every recommendation event records `model_versions.llm` so outputs are traceable.
- Offline/AI-unavailable path: rule-based fallback (existing FasalSetu Offline agent) with pack message templates; no LLM needed for SMS.
- Gemini API free-tier rate limits and data-use terms differ from paid; check before using real farmer data.
