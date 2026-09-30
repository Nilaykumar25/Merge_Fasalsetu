# FasalSetu — Requirements

**Hackathon:** Build with AI: Code for Communities  
**Track:** 4 — AgriN and Regenerative Agricultural Intelligence (BRICS Cooperation)  
**Goal:** Merge legacy/FasalSetu and legacy/AnnaVriddhi into one standalone, open-source AI farming companion. Target repo layout and request lifecycle are defined in `fasalsetu/docs/REPO_STRUCTURE.md`.

> **Contract files (source of truth — do not change without asking):**
> - `fasalsetu/schemas/recommendation_event.schema.json`
> - `fasalsetu/db/001_event_log.sql`
> - `fasalsetu/api/openapi.yaml`
> - `fasalsetu/country_packs/PACK_SPEC.md`

---

## Non-negotiable product rules (from fasalsetu/.kiro/steering/product.md)

1. No recommendation reaches a farmer without a money impact or an explicit do-nothing, and its assumptions.
2. Revenue formula: `expected_yield × grade_adjusted_price − action_cost − risk_discount`. All figures labelled **estimates**.
3. Gemini routes and phrases; it never produces money figures, thresholds, or guardrail decisions.
4. Every recommendation is written to the append-only event log **before** delivery.
5. Guardrail runs pre (block banned-substance queries) and post (scan outgoing text). Every check goes to the JSONL audit log.
6. Sensor data is always tagged `real` or `simulated`. Never present simulated data as real.
7. Produce grading is RGB/OpenCV-based. Never describe it as hyperspectral.
8. No country logic in code. Country differences live in `country_packs/<cc>/pack.yaml`.
9. Farm data and contacts never enter the event log or leave the country. Models and schemas are shared.
10. SHC data is a DEMO dataset pending licence confirmation. Keep it labelled as such.

---

## REQ-1 — Recommendation Event Log

### REQ-1.1 Schema and Storage

**WHEN** any agent completes a recommendation pipeline run,  
**THE SYSTEM SHALL** append one `recommendation` event to `recommendation_events` before any other action is taken.

**WHEN** any code path attempts to UPDATE or DELETE a row in `recommendation_events`,  
**THE SYSTEM SHALL** raise a PostgreSQL exception via the `forbid_mutation()` trigger defined in `db/001_event_log.sql`.

**WHEN** a farmer action (`yes | partial | no | unknown`) is received via any channel,  
**THE SYSTEM SHALL** append a new `response` event with `parent_event_id` set to the originating recommendation `event_id`.

**WHEN** a delivery is attempted,  
**THE SYSTEM SHALL** append a `delivery` event with `parent_event_id` set to the recommendation event, including `channel`, `language`, `status`, and optionally `provider_ref`.

**Acceptance criteria:**
- AC-1.1.1: Every event row validates against `schemas/recommendation_event.schema.json` (JSON Schema draft 2020-12) using `jsonschema.validate` in a pytest test.
- AC-1.1.2: A pytest test issues `UPDATE recommendation_events SET agent='x' WHERE …` via psycopg2 and receives a `psycopg2.errors.RaisedException`; separately issues `DELETE FROM recommendation_events WHERE …` and receives the same.
- AC-1.1.3: `recommendation` events have `parent_event_id IS NULL`; `delivery`, `response`, `outcome` events have `parent_event_id` pointing to their parent. The `CHECK` constraint in `db/001_event_log.sql` enforces this.
- AC-1.1.4: The `recommendation_lifecycle` view and `season_summary` view from `db/001_event_log.sql` are created and queryable after applying the migration.
- AC-1.1.5: `farm_id` is a pseudonymous identifier; no phone number or contact detail appears in any event row (product rule 9).

### REQ-1.2 Event Schema Fidelity

**WHEN** a `recommendation` event is written,  
**THE SYSTEM SHALL** populate the `payload.recommendation` object with all required fields from the schema: `agent`, `category`, `is_do_nothing`, `crop_condition` (with `score` and `components`), `revenue` (with `formula_version`, `currency`, `net_impact`, `assumptions`), `action` (with `template_key`), and `guardrail` (with `ruleset`, `pre`, `post`).

**Acceptance criteria:**
- AC-1.2.1: `payload.revenue.net_impact` is a number in the country's native currency (INR for India, BRL for Brazil); it is not integer paise.
- AC-1.2.2: `payload.revenue.assumptions.estimated` is always `true` (const in schema).
- AC-1.2.3: `payload.guardrail.ruleset` matches the pattern `<cc>@<YYYY.MM>` taken from the loaded country pack's `compliance.ruleset`.
- AC-1.2.4: `payload.crop_condition.components` has at least one `input_component` populated; each component has a `source` tag from `["real", "simulated", "satellite", "api", "farmer_reported"]`.

### REQ-1.3 Candidate Pipeline

**WHEN** any specialist agent produces a result,  
**THE SYSTEM SHALL** return a `Candidate` object only; no agent writes to the event log or calls delivery directly.

**WHEN** the pipeline runs the full sequence (`guardrail.pre → tracker → agents → revenue → guardrail.post → eventlog.append → delivery`),  
**THE SYSTEM SHALL** pass the winning Candidate (or an explicit `do_nothing` Candidate) through without deviation from that order.

**Acceptance criteria:**
- AC-1.3.1: Each agent module's `run()` method is typed to return `list[Candidate]`; mypy passes with no errors on those signatures.
- AC-1.3.2: A unit test mocks all agents and confirms `eventlog.store.append` is called with `event_type="recommendation"` exactly once per pipeline run, and strictly before `delivery.send`.
- AC-1.3.3: `do_nothing` is a first-class `Candidate` with `is_do_nothing=True`, `net_impact=0`, and a non-empty `loss_if_ignored` field showing the counterfactual cost.

---

## REQ-2 — Crop Condition Tracker with Satellite Input

### REQ-2.1 Four-Input Composite Score

**WHEN** the crop condition tracker runs for a plot,  
**THE SYSTEM SHALL** compute a composite score (0–100) from four input components: `soil_moisture`, `weather_stress`, `photo_health`, and `ndvi`, each carrying a `source` tag.

**WHEN** satellite data is unavailable (cloud cover > 20 % or no scene within 14 days),  
**THE SYSTEM SHALL** compute the score from the three remaining components and tag the `ndvi` component with `source="simulated"` and `value=null`.

**Acceptance criteria:**
- AC-2.1.1: The `CropCondition` API response matches the schema in `api/openapi.yaml` `CropCondition` component: `plot_id`, `date`, `score`, `band` (good/watch/stressed/critical), `components`.
- AC-2.1.2: Score uses weights `[soil=0.30, weather=0.20, photo=0.25, ndvi=0.25]` with all four inputs; falls back to `[soil=0.40, weather=0.25, photo=0.35]` when NDVI is null.
- AC-2.1.3: One snapshot row is written per tracker run; no row is overwritten.
- AC-2.1.4: Pytest parametrize: all-zero inputs → `score == 0`; all-optimal inputs → `score >= 90`.

### REQ-2.2 Satellite Agent

**WHEN** the Satellite agent is invoked for a plot with known GPS coordinates,  
**THE SYSTEM SHALL** fetch the most recent cloud-free (< 20 % cover) Sentinel-2 L2A scene within 14 days and return NDVI and NDWI as floats in [−1, 1].

**WHEN** no qualifying scene is found,  
**THE SYSTEM SHALL** return a `SatelliteObservation` with `ndvi=null`, `ndwi=null`, and a non-null `cloud_cover_pct` or a `provider` annotation explaining unavailability.

**Acceptance criteria:**
- AC-2.2.1: The `GET /plots/{plotId}/satellite` response matches the `SatelliteObservation` schema in `api/openapi.yaml`.
- AC-2.2.2: A mock Sentinel-2 provider is available for CI (`provider="mock"`); its output is tagged `source="simulated"` in the crop-condition event payload.
- AC-2.2.3: NDVI < 0.2 for a cereal crop triggers a `fertilize` or `disease_alert` Candidate (depending on other signals); verified by unit test.

---

## REQ-3 — Irrigation Agent and Revenue Layer

### REQ-3.1 Irrigation Agent

**WHEN** the irrigation agent evaluates a plot,  
**THE SYSTEM SHALL** compute a water-balance deficit using: `crop_daily_water_requirement − forecast_rainfall_72h − available_soil_moisture_contribution`.

**WHEN** the computed deficit is below the country pack's `revenue.do_nothing_threshold`,  
**THE SYSTEM SHALL** return a `do_nothing` Candidate with `is_do_nothing=True` and `loss_if_ignored` set to the yield loss if the threshold triggers wrongly.

**Acceptance criteria:**
- AC-3.1.1: Crop water requirements are loaded from the country pack's `crops.<name>` section, not hardcoded.
- AC-3.1.2: Pytest: mocked 20 mm forecast rain + 60 % moisture → `is_do_nothing=True`.
- AC-3.1.3: Pytest: mocked 0 mm rain (72 h) + 25 % moisture → `category="irrigate"`, `net_impact > 0`.
- AC-3.1.4: `source` tag on the soil moisture component is `"real"` when from a live sensor, `"simulated"` when from demo data.

### REQ-3.2 Revenue Layer

**WHEN** the revenue layer processes any Candidate,  
**THE SYSTEM SHALL** compute `net_impact = expected_yield_kg × grade_adjusted_price_per_kg − action_cost − risk_discount` in the country's native currency.

**WHEN** the Candidate is `do_nothing`,  
**THE SYSTEM SHALL** compute `loss_if_ignored` (the counterfactual loss from inaction) and include it in `payload.revenue`.

**WHEN** any Candidate's `net_impact` is below the country pack's `revenue.do_nothing_threshold`,  
**THE SYSTEM SHALL** replace it with a `do_nothing` Candidate (the `do_nothing.py` module owns this logic).

**Acceptance criteria:**
- AC-3.2.1: `payload.revenue.net_impact` is a float in native currency (not integer paise); `payload.revenue.currency` is a 3-letter ISO-4217 code matching the pack.
- AC-3.2.2: `payload.revenue.assumptions.estimated` is `true`; `price_source`, `yield_baseline`, `risk_discount_rate` are all non-empty.
- AC-3.2.3: Revenue layer never calls the Gemini API; all arithmetic is deterministic Python.
- AC-3.2.4: Pytest: drought scenario → `loss_if_ignored > 0` on the `do_nothing` Candidate.
- AC-3.2.5: Pytest: `net_impact` below `do_nothing_threshold` → winning Candidate has `is_do_nothing=True`.
- AC-3.2.6: Grade multipliers come from `crops.<name>.grade_price_factor` in the country pack.

---

## REQ-4 — Delivery: WhatsApp/SMS with Mock Provider, Inbound Replies

### REQ-4.1 Provider Interface

**WHEN** the delivery layer sends a message,  
**THE SYSTEM SHALL** route through a `DeliveryProvider` interface; the concrete implementation is selected by `FS_DELIVERY_PROVIDER` env var (`mock` or `twilio`).

**WHEN** `FS_DELIVERY_PROVIDER=mock`,  
**THE SYSTEM SHALL** log the rendered message to stdout and append a `delivery` event with `status="queued"` (no external API call).

**Acceptance criteria:**
- AC-4.1.1: `DeliveryProvider` is an ABC; `TwilioProvider` and `MockProvider` both implement it.
- AC-4.1.2: An integration test with `MockProvider` confirms one `delivery` event is appended per recommendation, with `parent_event_id` set to the recommendation's `event_id`.
- AC-4.1.3: Message text is rendered from `delivery.sms.template_set` / `channels` entries in the country pack; no template string is hardcoded in the delivery module.

### REQ-4.2 Inbound Replies

**WHEN** an inbound webhook (`POST /webhooks/sms` or `/webhooks/whatsapp`) receives a farmer reply,  
**THE SYSTEM SHALL** map it using the country pack's `delivery.reply_codes` dict and append a `response` event.

**WHEN** the reply is a free-text question rather than a reply code,  
**THE SYSTEM SHALL** route it to the chat orchestrator and return an AI-generated reply.

**Acceptance criteria:**
- AC-4.2.1: Reply code `"1"` maps to `acted="yes"` using `delivery.reply_codes` from the loaded pack.
- AC-4.2.2: A `response` event is appended for every parsed reply; the originating recommendation event is not mutated.
- AC-4.2.3: Pytest full round-trip: pipeline run with MockProvider → `POST /webhooks/sms {"Body": "1"}` → `response` event with `acted="yes"` and correct `parent_event_id`.

---

## REQ-5 — Grading, Harvest Window, Regenerative Agent

### REQ-5.1 Produce Grading

**WHEN** an image is submitted to `POST /grading`,  
**THE SYSTEM SHALL** run the OpenCV/RandomForest pipeline and return a `GradeResult` with `grade`, `confidence`, `method="rgb-opencv"`, `limitations` (must state "RGB only; not hyperspectral"), and `price_effect_per_kg`.

**WHEN** confidence is below 0.6 or no object is detected,  
**THE SYSTEM SHALL** not return a grade; instead return a response that prompts a retake.

**Acceptance criteria:**
- AC-5.1.1: `POST /grading` response matches the `GradeResult` schema in `api/openapi.yaml`.
- AC-5.1.2: `method` field is always `"rgb-opencv"`; the word "hyperspectral" never appears in any response field or log.
- AC-5.1.3: A `grade` recommendation event is appended to the event log after a successful grading.
- AC-5.1.4: Low-confidence synthetic image → no `grade` field in response.

### REQ-5.2 Harvest Window

**WHEN** the harvest agent evaluates a plot,  
**THE SYSTEM SHALL** return a `HarvestWindow` with `start`, `end` (ISO dates), `loss_per_day_delay` (in native currency), and an embedded `Recommendation`.

**Acceptance criteria:**
- AC-5.2.1: Response matches the `HarvestWindow` schema in `api/openapi.yaml`.
- AC-5.2.2: A thunderstorm in the weather forecast lowers the score of a window that includes it.
- AC-5.2.3: `loss_per_day_delay` is non-negative; denominated in the pack's currency.

### REQ-5.3 Regenerative Agent

**WHEN** the regenerative agent is invoked,  
**THE SYSTEM SHALL** rank at least five practice types — cover crops, intercropping, residue management, reduced tillage, organic amendments — using the same revenue formula as other agents.

**WHEN** a practice's short-term `net_impact` is negative,  
**THE SYSTEM SHALL** still surface it as a Candidate with a non-empty `long_term_note` and a `brics_relevance` string from the country pack.

**Acceptance criteria:**
- AC-5.3.1: The agent returns `category="regenerative"` Candidates; practice parameters come from `country_packs/<cc>/pack.yaml` (no hardcoding).
- AC-5.3.2: Negative `net_impact` does not suppress the Candidate; `long_term_note` is non-empty.
- AC-5.3.3: `brics_relevance` field is populated from the pack; the Brazil pack's soybean practice references REDD+/MAPA soil goals.
- AC-5.3.4: `GET /plots/{plotId}/regenerative` returns an array of `Recommendation` objects matching `api/openapi.yaml`.

---

## REQ-6 — Country Pack Loader and Per-Country Guardrail

### REQ-6.1 Pack Loader

**WHEN** the application starts,  
**THE SYSTEM SHALL** load `country_packs/<cc>/pack.yaml`, validate it against `country_packs/pack.schema.json`, and refuse to start if validation fails.

**WHEN** a pack has a missing optional field that another module needs,  
**THE SYSTEM SHALL** fall back to `generic` behaviour and surface a `data_quality: low_confidence` flag to the user, never guess silently (PACK_SPEC rule 5).

**Acceptance criteria:**
- AC-6.1.1: `PackLoader.load("IN")` returns a validated pack object; `PackLoader.load("ZZ")` raises `PackNotFoundError`.
- AC-6.1.2: A pack YAML missing `compliance.authority` raises `PackValidationError` with the field path in its message.
- AC-6.1.3: India pack and Brazil pack both pass validation; pytest parametrize over both.
- AC-6.1.4: The Brazil pack's `crops.soybean.yield_baseline.value_kg_per_ha = null` causes the revenue layer to emit a low-confidence flag rather than a numeric impact.

### REQ-6.2 Per-Country Guardrail

**WHEN** the guardrail runs post-execution,  
**THE SYSTEM SHALL** apply the country pack's `compliance.banned` and `compliance.restricted` lists in addition to any global baseline; every entry in those lists must have a `source` field (PACK_SPEC rule 2).

**WHEN** a regional override is defined (`compliance.regional.<state_code>`),  
**THE SYSTEM SHALL** apply it when the farm's region matches.

**Acceptance criteria:**
- AC-6.2.1: A response containing a substance in India pack's `compliance.banned` list triggers a `guardrail.post = "block"` event and is not delivered.
- AC-6.2.2: The same substance with the Brazil pack loaded does not trigger a block (unless also in Brazil's list).
- AC-6.2.3: Every guardrail check — pass or block — writes a JSONL entry with `ruleset` and `rules_triggered`.
- AC-6.2.4: Guardrail entries without a `source` field in the pack YAML cause `PackValidationError` at startup (PACK_SPEC rule 2).

---

## REQ-7 — Season Review, Demo Data, Model Cards, DPG README

### REQ-7.1 Season Review

**WHEN** `GET /plots/{plotId}/season-review` is called,  
**THE SYSTEM SHALL** aggregate `recommendation_lifecycle` and `season_summary` views from the event log and return a `SeasonReview` matching `api/openapi.yaml`.

**WHEN** fewer than 5 recommendation events exist for the season,  
**THE SYSTEM SHALL** return the review with a `data_quality` note that results are sparse.

**Acceptance criteria:**
- AC-7.1.1: Response matches the `SeasonReview` schema: `actions_recommended`, `actions_taken`, `do_nothing_calls`, `predicted_impact_taken`, `realized_impact`, `timeline`, `next_season_adjustments`.
- AC-7.1.2: `predicted_impact_taken` equals the sum of `net_impact` for events where `acted IN ('yes', 'partial')`, per the `season_summary` view definition.
- AC-7.1.3: Season review is driven from the event log views only; no separate summary table.

### REQ-7.2 Demo Data

**WHEN** `FS_SEED_DEMO=true` is set at startup,  
**THE SYSTEM SHALL** load a deterministic demo dataset covering all `category` values in the schema enum and at least one `do_nothing` event, tagged `source="simulated"`.

**Acceptance criteria:**
- AC-7.2.1: Demo events cover all 11 categories from the schema: `irrigate, fertilize, spray, cover, harvest, grade, sell, hold, scheme, regenerative, do_nothing`.
- AC-7.2.2: All demo events have `source="simulated"` (or equivalent `source` tags on components).
- AC-7.2.3: Season review over demo data returns `actions_recommended >= 10`, `actions_taken >= 8`.
- AC-7.2.4: Seeding is idempotent (second call does not duplicate rows).

### REQ-7.3 Model Cards and DPG README

**WHEN** the project is evaluated as a Digital Public Good,  
**THE SYSTEM SHALL** include `schemas/model_cards/` with one Markdown card per ML component, each stating training data, known limitations, and recommended use.

**Acceptance criteria:**
- AC-7.3.1: Four model cards exist: `npk.md`, `fertilizer_rf_v2.md`, `disease_efficientnet.md`, `grading_rgb.md` — matching the `models.*` keys referenced in `country_packs/in/pack.yaml`.
- AC-7.3.2: `grading_rgb.md` explicitly states the model is "RGB-based, not hyperspectral" and lists the class gaps from `legacy/AnnaVriddhi/grading/README.md`.
- AC-7.3.3: `README.md` at repo root meets the DPG standard: Apache-2.0 licence, no hidden dependencies, SDG 2 and SDG 13 relevance, `DATA_PROVENANCE.md` link, BRICS cooperation context.
- AC-7.3.4: `.env.example` lists every env variable; no secret values in the repo.

---

## Out of Scope

- A new UI shell or standalone dashboard — UI is FasalSetu's existing frontend only.
- Hyperspectral imaging — grading is explicitly RGB/OpenCV.
- Real money transfers or financial advice.
- PII in the event log.
- Onion grading (class gaps; see `legacy/AnnaVriddhi/grading/README.md`).
- Supabase SDK at runtime (legacy only; merged project uses plain PostgreSQL 15+).

---

## REQ-F — Frontend Integration Requirements

These requirements govern the porting of the existing FasalSetu React/TypeScript/Vite frontend to the merged API. No new screens are added; all new capabilities appear as cards inside the chat.

### REQ-F.1 Typed API Client

**WHEN** the frontend makes any call to the backend,  
**THE SYSTEM SHALL** use a typed client generated from `api/openapi.yaml` (`openapi-typescript`); no raw `fetch` calls with string URL literals may appear outside `frontend/src/api/client.ts`.

**Acceptance criteria:**
- AC-F.1.1: `npm run gen:api` generates `frontend/src/api/schema.d.ts` from `api/openapi.yaml` without errors.
- AC-F.1.2: `tsc --noEmit` and `npm run build` pass with zero errors at the end of every frontend task.
- AC-F.1.3: `npm run gen:api` is re-run and the updated `schema.d.ts` is committed whenever `api/openapi.yaml` changes.

### REQ-F.2 Chat is the primary entry point

**WHEN** the frontend calls any backend endpoint that produces a `Recommendation`,  
**THE SYSTEM SHALL** render the result as an inline card within the existing chat UI; no new top-level screens or dashboards are added.

**Acceptance criteria:**
- AC-F.2.1: `ChatResponse.recommendations[]` items are rendered as `RecommendationCard` components (or the appropriate specialised card subtype) in the message thread.
- AC-F.2.2: A `POST /chat` that is blocked by the guardrail (HTTP 422) renders a "🚫 Blocked:" message in the chat rather than a blank error.

### REQ-F.3 No money arithmetic in the frontend

**WHEN** the frontend displays a money figure,  
**THE SYSTEM SHALL** render exactly the value returned by the backend, formatted through `formatMoney(amount, currency)` only; no arithmetic on `net_impact` or `loss_if_ignored` is permitted in any component.

**Acceptance criteria:**
- AC-F.3.1: `formatMoney(amount, currency)` is the single source for money display; no `"₹"` or `"INR"` string literals appear outside `frontend/src/lib/currency.ts` and generated/test files.
- AC-F.3.2: Currency symbol is resolved from the `revenue.currency` field returned by the backend, not hardcoded.

### REQ-F.4 Real/simulated source badges

**WHEN** a card is built from sensor or satellite data,  
**THE SYSTEM SHALL** display a real / simulated / satellite / api badge derived from the `source` field of each `InputComponent`; the badge must never be omitted when `source="simulated"`.

**Acceptance criteria:**
- AC-F.4.1: `ConditionCard` renders a source badge for each of the four input components.
- AC-F.4.2: A `ConditionCard` built from demo-seeded data shows at least one "simulated" badge.

### REQ-F.5 Grading disclaimer

**WHEN** the frontend renders a `GradeCard`,  
**THE SYSTEM SHALL** always display the text "RGB-based grading only — not hyperspectral." — this text is mandatory and must not be conditional.

**Acceptance criteria:**
- AC-F.5.1: `frontend/src/components/cards/GradeCard.tsx` contains the exact string `"RGB-based grading only — not hyperspectral."`.
- AC-F.5.2: The disclaimer is visible in all render states of `GradeCard`, including the low-confidence retake-photo state.
