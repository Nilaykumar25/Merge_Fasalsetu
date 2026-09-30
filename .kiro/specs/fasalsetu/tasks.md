# FasalSetu — Implementation Tasks

**Prerequisite:** All five SOQs resolved (see `design.md §0`).  
**Contracts (do not modify without asking):** `schemas/recommendation_event.schema.json`, `db/001_event_log.sql`, `api/openapi.yaml`, `country_packs/PACK_SPEC.md`, `country_packs/in/pack.yaml`, `country_packs/br/pack.yaml`.  
**Source for ports:** read from `legacy/`; never import from it at runtime.  
**After each backend task:** run `pytest` and hit the backend demo checkpoint.  
**After each frontend task (N-F):** run `tsc --noEmit` and `npm run build` — both must pass with zero errors. Regenerate the typed API client (`npm run gen:api`) whenever `api/openapi.yaml` changes.

---

## Removed Endpoint Decisions

The frontend audit found 10 endpoints the UI currently calls that no longer exist in `api/openapi.yaml`. This section records the disposition of each.

| Old endpoint | Frontend surface | Decision | Rationale |
|---|---|---|---|
| `POST /query` | Chatbot, SoilNPKPanel chat, Marketplace chat | **Replace with `POST /chat`** (Task 1-F) | Direct functional equivalent; new shape adds `farm_id` and `recommendations[]` |
| `POST /market/prices` | Marketplace price lookup | **Replace with `GET /market/prices`** (Task 3-F) | Same data, method+field rename only |
| `POST /schemes/search` | GovSchemes search | **Replace with `GET /schemes/search`** (Task 3-F) | Same data, method+shape change |
| `POST /weather/current` | CalendarAlerts, weatherLocation.ts | **Drop the standalone weather panel; serve weather via chat** | Weather is now an internal tracker input; `GET /plots/{plotId}/condition` surfaces the weather stress component. CalendarAlerts becomes a ConditionCard (Task 2-F). See ⚠️ note below. |
| `POST /weather/forecast` | CalendarAlerts | **Drop** — same as above | |
| `POST /weather/spray` | CalendarAlerts | **Drop** — no equivalent in spec | Spray-safety advice can be requested via `POST /chat` free text; no structured endpoint exists. |
| `POST /compliance/check` | Compliance.tsx | **Drop the check UI; guardrail is server-side** | See ⚠️ note below. |
| `GET /compliance/lists` | Compliance.tsx (lists tab) | **Replace with `GET /country-packs/{code}`** (Task 6-F) | `PackSummary` now includes `compliance_substances` (PC-1 approved). Full substance list with `verified=false` flag is returned. |
| `GET /audit-log` | Compliance.tsx (audit tab) | **Replace with `GET /guardrail/audit`** (Task 6-F) | New endpoint approved (PC-2). Gated behind `FS_EXPOSE_AUDIT=true`. |
| `POST /predict` (VITE_MODEL_API_URL) | diseaseDetectionService.ts | **Replace with `POST /diagnose`** (Task 5-F) | Direct replacement in the merged API |

⚠️ **Demo selling-point note — all three Compliance tabs now preserved:**
1. **Check-a-pesticide** — type the query in chat; `422 Blocked` with `rules_triggered` renders in the UI (Task 6-F).
2. **Banned list** — `GET /country-packs/IN` now returns `compliance_substances` with `verified=false` flags (PC-1 approved and implemented in `api/openapi.yaml`). Task 6-F wires the UI.
3. **Audit log** — `GET /guardrail/audit` is now in `api/openapi.yaml` (PC-2 approved). Enabled when `FS_EXPOSE_AUDIT=true` (automatically true with `FS_SEED_DEMO=true`). Task 6 backend + Task 6-F wire this end-to-end.

The weather panel currently powers the "CalendarAlerts" component surfaced from HomePage. The static seasonal fallback shim (tagged `source="simulated"`) bridges the gap between Task 1-F and Task 2-F. Task 2-F is scheduled immediately after 1-F (OQ-FE-2 resolved).

---

## Compatibility: Shim Strategy

Until each frontend sub-task lands, the **merged backend should keep the following thin shims** to avoid breaking the UI mid-demo. Remove each shim when its N-F task is done.

| Shim endpoint | Keep until | Cost |
|---|---|---|
| `POST /query` → forwards to `POST /chat` (ignores `session_id`, returns `{ answer: reply }` shape) | Task 1-F done | ~15 lines in a `routers/compat.py`; remove after Task 1-F |
| `POST /market/prices` → reads `crop`/`state` from body, calls `GET /market/prices` handler, returns old shape | Task 3-F done | ~20 lines |
| `POST /schemes/search` → reads body, calls `GET /schemes/search` handler, returns old `{ schemes: [] }` wrapper | Task 3-F done | ~20 lines |
| `GET /weather/current`, `/weather/forecast`, `/weather/spray` → return static seasonal fallback data tagged `source="simulated"` | Task 2-F done | ~30 lines total; avoids blank CalendarAlerts during the gap |

The compliance endpoints (`/compliance/check`, `/compliance/lists`, `/audit-log`) are demo-facing. **Keep them as shims until Task 6-F** rather than dropping them mid-demo:
- `POST /compliance/check` → wrap guardrail.pre + post, return old `{ status, pesticide, message, alternatives }` shape
- `GET /compliance/lists` → return pack `compliance.banned`/`restricted` in old `{ banned: string[], restricted: {} }` shape
- `GET /audit-log` → forwards to `GET /guardrail/audit` handler (same data); remove after Task 6-F

All shims live in `backend/app/routers/compat.py` and are gated behind `FS_COMPAT_SHIMS=true` (default `true` until Task 6-F, then default `false`).

---

## Task 1 — Event Log: pack schema, Pydantic models, append-only store, pipeline skeleton

*(Backend complete. Frontend sub-task 1-F still to do.)*

### 1.1–1.4 (backend — complete)

See prior content; all checklist items done.

**Backend demo checkpoint:** `POST /chat {"farm_id":"demo","plot_id":"p1","language":"hi","input":{"text":"how is my crop?"}}` → reply is non-empty, one `recommendation` event in DB with `is_do_nothing=True`, audit JSONL has one entry.

---

## Task 1-F — API client, /chat wiring, guardrail 422 handling

**Goal:** The UI can send a chat message, receive a reply and a (possibly empty) `recommendations[]` array, and render it without 404s. `tsc` and `npm run build` pass clean. The three legacy `/query` callers are replaced.

**Depends on:** Task 1 backend ✓

### 1-F.1 Generate typed API client

- [ ] **1-F.1.1** Add `openapi-typescript` (or `orval`) as a dev dependency:
  ```
  npm install --save-dev openapi-typescript
  ```
  Add to `package.json` scripts:
  ```json
  "gen:api": "openapi-typescript api/openapi.yaml -o frontend/src/api/schema.d.ts"
  ```
- [ ] **1-F.1.2** Run `npm run gen:api`; commit `frontend/src/api/schema.d.ts`. This file is generated — do not hand-edit it.
- [ ] **1-F.1.3** Create `frontend/src/api/client.ts` — a thin typed fetch wrapper built on the generated types:
  - Base URL from `VITE_API_BASE_URL` env var (default `http://localhost:8000`).
  - `chatPost(req: ChatRequest): Promise<ChatResponse>`
  - `conditionGet(plotId: string): Promise<CropCondition>`
  - `recommendationsGet(plotId: string): Promise<Recommendation[]>`
  - `eventsPost(req: EventAppend): Promise<EventEnvelope>`
  - `marketPricesGet(crop: string, market?: string): Promise<MarketView>`
  - `schemesSearchGet(q: string, language?: string): Promise<Scheme[]>`
  - All types imported from `schema.d.ts`.
  - No raw `fetch` calls with string URLs outside this file.
- [ ] **1-F.1.4** Add `VITE_API_BASE_URL` to `.env.example`. Remove `VITE_SOIL_NPK_API_URL` references from frontend components (replaced by `client.ts`).

### 1-F.2 Replace /query callers with POST /chat

Three components currently POST to `/query`. Each must be updated to use `client.chatPost()`.

- [ ] **1-F.2.1** `frontend/src/components/Chatbot.tsx` — replace `cropAdvisoryAI.generateAdvice()` path:
  - When the user sends a text message (no image), call `client.chatPost({ farm_id, plot_id, language, input: { text } })` instead of `cropAdvisoryAI.generateAdvice()`.
  - When the user sends an image, pass it as `input.image_base64` in the same `chatPost` call.
  - Remove the import of `cropAdvisoryAI`, `CropAdvisoryResponse`, and `@google/generative-ai` entirely — **OQ-FE-1 resolved: the frontend no longer calls Gemini directly**. The `backend/app/llm/gemini.py` wrapper is the sole Gemini consumer.
  - Keep Supabase calls (`users`, `farm_soil_data`, `crop_cycles`) only for resolving `farm_id` / `plot_id` and auth context (**OQ-FE-1: Supabase stays for auth/profile only**). If `farm_id` is unavailable, fall back to `"demo"`. Full migration to `POST /farms` happens in Task 2-F.
  - Remove `VITE_GEMINI_API_KEY` from `frontend/.env.example`; it is no longer needed once this step lands.
- [ ] **1-F.2.2** `frontend/src/components/SoilNPKPanel.tsx` `SoilChatbot.send()` — replace `fetch(${CHAT_API}/query, …)` with `client.chatPost()`. Pass soil sensor values as part of `input.text` context string (same approach, different transport).
- [ ] **1-F.2.3** `frontend/src/components/Marketplace.tsx` `sendChat()` — replace `fetch(${API}/query, …)` with `client.chatPost()`.

### 1-F.3 Render recommendations[] in chat

- [ ] **1-F.3.1** `ChatResponse.recommendations[]` may contain zero or more `Recommendation` objects. For Task 1-F, render each as a plain text message bubble showing `recommendation.text` and `recommendation.revenue.net_impact` formatted with the currency symbol. Full card components come in Tasks 2-F through 7-F.
- [ ] **1-F.3.2** If `ChatResponse.recommendations` contains an `is_do_nothing=true` item, render the text with a neutral "✓ All clear" prefix so the demo can show the do-nothing state.

### 1-F.4 Handle the 422 guardrail block

- [ ] **1-F.4.1** `client.chatPost()` must catch HTTP 422 and return a typed `{ blocked: true, code, message, rules_triggered }` object (using the `Problem` schema from `api/openapi.yaml`).
- [ ] **1-F.4.2** In `Chatbot.tsx`, when `blocked=true`, render the bot message with a red "🚫 Blocked:" prefix and show `message`. Do not show `rules_triggered` to the farmer (internal detail); log it to console.

### 1-F.5 Compat shims

- [ ] **1-F.5.1** `backend/app/routers/compat.py` — add `POST /query` shim (forwards to pipeline, returns `{ answer }` shape). Mount only when `FS_COMPAT_SHIMS=true`.
- [ ] **1-F.5.2** Add `FS_COMPAT_SHIMS=true` to `.env.example` with note: "Set false once all N-F frontend tasks are complete."

### 1-F.6 Build verification

- [ ] **1-F.6.1** `tsc --noEmit` passes with zero errors in `frontend/`.
- [ ] **1-F.6.2** `npm run build` in `frontend/` completes without errors.
- [ ] **1-F.6.3** Remove `VITE_SOIL_NPK_API_URL` and `VITE_MODEL_API_URL` from `frontend/.env.example` (superseded by `VITE_API_BASE_URL`). Remove `VITE_GEMINI_API_KEY` (OQ-FE-1: direct Gemini SDK removed). Keep them under a `# Legacy — remove after all N-F tasks complete` comment until Task 7-F.
- [ ] **1-F.6.4** Grep check: no `import.*@google/generative-ai` anywhere in `frontend/src/` (OQ-FE-1).
- [ ] **1-F.6.5** Grep check: no raw `fetch(.*\/query` calls remain in `frontend/src/`.

> **Scheduling note (OQ-FE-2 resolved):** Task 2-F is scheduled immediately after Task 1-F. The static weather fallback shim in `compat.py` (returning seasonal data tagged `source="simulated"`) bridges the CalendarAlerts gap for exactly one sprint.

**Demo checkpoint (browser):** Open the app; type "how is my crop?" in the chat; Network tab shows one request to `POST /chat` (no `/query`, no 404s); reply appears in the message thread. Type "buy DDT" → bot shows "🚫 Blocked:" message.

---

## Task 2 — Crop Condition Tracker with Satellite Input

*(Full backend spec unchanged — see prior content.)*

**Backend demo checkpoint:** `GET /plots/p1/condition` returns `score`, `band`, `components` with source tags.

---

## Task 2-F — ConditionCard, sensor ingest, farms/plots registration

**Goal:** The chat can display a live crop condition card. The farmer can also register a farm and plot through the UI so that `farm_id` / `plot_id` are real rather than the "demo" fallback from Task 1-F.

**Depends on:** Task 1-F ✓, Task 2 backend ✓

### 2-F.1 Farm and plot registration

- [ ] **2-F.1.1** `frontend/src/api/client.ts` — add `farmsPost(req: FarmCreate): Promise<Farm>` and `plotsPost(farmId: string, req: PlotCreate): Promise<Plot>`.
- [ ] **2-F.1.2** `frontend/src/components/OnboardingWizard.tsx` — on the final onboarding step, call `farmsPost` then `plotsPost` with the user's crop, GPS coordinates (from `geolocationService.ts`), and area. Store `farm_id` and `plot_id` in `localStorage` (key: `fs_farm_id`, `fs_plot_id`). This replaces the Supabase direct insert path.
- [ ] **2-F.1.3** `frontend/src/api/client.ts` — update `chatPost` to read `farm_id` / `plot_id` from `localStorage` instead of the "demo" fallback.
- [ ] **2-F.1.4** `frontend/src/api/client.ts` — add `readingsPost(plotId: string, reading: SensorReading): Promise<void>` for future sensor ingest (used in Task 3-F for the demo soil moisture reading).

### 2-F.2 ConditionCard component

- [ ] **2-F.2.1** `frontend/src/components/cards/ConditionCard.tsx` — renders a `CropCondition` object:
  - Score (0–100) as a radial gauge or filled progress bar.
  - `band` chip: good (green), watch (amber), stressed (orange), critical (red).
  - Four component rows: soil_moisture, weather_stress, photo_health, ndvi — each shows value and a **real / simulated / satellite / api** badge derived from `component.source`. Never omit the badge when `source` is `"simulated"`.
  - NDVI value formatted as two decimal places; if `null`, show "NDVI unavailable".
  - Tap anywhere on the card → opens score-history view (2-F.3).
- [ ] **2-F.2.2** `frontend/src/components/cards/ConditionCard.tsx` — low-data state: when `data_quality` is absent or components are all null, show "Waiting for first sensor reading" placeholder.

### 2-F.3 Condition history view

- [ ] **2-F.3.1** `frontend/src/components/plot/ConditionHistory.tsx` — opened from the ConditionCard tap (not a new screen; overlay or slide-up panel within the chat view):
  - Calls `GET /plots/{plotId}/condition/history?from=<30d ago>&to=<today>`.
  - Renders a simple SVG sparkline of `score` over time (port the existing `TrendChart` SVG from `Marketplace.tsx` — same pattern, different data).
  - Shows a "simulated data" banner if any data point has a simulated source component.
- [ ] **2-F.3.2** Add `conditionHistoryGet(plotId: string, from: string, to: string): Promise<CropCondition[]>` to `client.ts`.

### 2-F.4 Wire ConditionCard into chat

- [ ] **2-F.4.1** In `frontend/src/components/Chatbot.tsx`, when the user types "crop condition", "स्थिति", or clicks a quick-action chip "Crop Status", call `conditionGet(plotId)` and render the result as a `ConditionCard` in the message thread.
- [ ] **2-F.4.2** If `ChatResponse.recommendations[]` contains a `recommendation` whose `agent` is `"satellite"`, extract the NDVI from `crop_condition.components.ndvi` and render a ConditionCard inline with that data.
- [ ] **2-F.4.3** Remove `CalendarAlerts.tsx` weather API calls (`/weather/current`, `/weather/forecast`, `/weather/spray`). Replace the weather section of `CalendarAlerts` with a `ConditionCard` whose `weather_stress` component surfaces the same information. The compat weather shims (from 1-F.5) can be removed once this lands.

### 2-F.5 Build verification

- [ ] **2-F.5.1** `tsc --noEmit` passes; `npm run build` passes.
- [ ] **2-F.5.2** No raw `/weather/*` fetch calls remain in `src/` (grep check).

**Demo checkpoint (browser):** Say "show my crop condition" in chat → a ConditionCard appears in the message thread with score, band chip, four component rows each showing a source badge. Tap the card → score-history sparkline slides up. If no real sensor is available, all components show "simulated" badges (not blank).

---

## Task 3 — Irrigation Agent and Revenue Layer (including do-nothing)

*(Full backend spec as previously written — irrigation agent, revenue formula, do-nothing logic, routers. See prior version for full checklist.)*

### 3.3 Scheme search backend — populate new optional fields (PC-3)

- [ ] **3.3.1** `backend/app/agents/scheme.py` — when returning `Scheme` objects from the ChromaDB search, populate `benefit_type`, `benefit_amount`, `level`, and `state` from the ChromaDB metadata fields (`benefit_type`, `benefit_amount`, `level`, `state`). These map directly from the existing `legacy/FasalSetu/agents/scheme_agent.py` response which already has them; the router was previously dropping them.
- [ ] **3.3.2** `backend/app/routers/specialists.py` `GET /schemes/search` — include `benefit_type`, `benefit_amount`, `level`, `state` in the response `Scheme` objects when present in the metadata. Fields are optional — `null` is acceptable for schemes that don't have them.
- [ ] **3.3.3** Pytest check: `GET /schemes/search?q=irrigation` returns at least one scheme with a non-null `benefit_type` field (uses demo/seeded schemes data).

**Backend demo checkpoint:** `POST /plots/p1/recommendations` → irrigation recommendation with `net_impact > 0` and `assumptions.estimated=true`.

---

## Task 3-F — RecommendationCard, Done/Not-done, market + schemes fixes

**Goal:** Every recommendation the backend produces is rendered as a structured card. The farmer can tap Done/Not done. Market and schemes callers use the new endpoint shapes.

**Depends on:** Task 1-F ✓, Task 3 backend ✓

### 3-F.1 RecommendationCard component

- [ ] **3-F.1.1** `frontend/src/components/cards/RecommendationCard.tsx`:
  - Props: `recommendation: Recommendation` (from `api/openapi.yaml`).
  - Header: `category` chip (irrigate / fertilize / spray / cover / harvest / grade / sell / hold / scheme / regenerative / do_nothing), `agent` label.
  - Body: `recommendation.text` (Gemini-phrased, language-aware).
  - Revenue row: `revenue.net_impact` formatted as `{currency_symbol}{value}` — currency symbol resolved from `revenue.currency` (INR → ₹, BRL → R$; see 3-F.3 for the lookup). **Never hardcode ₹.**
  - `loss_if_ignored` row (only when `> 0`): "Cost of inaction: {symbol}{value}".
  - Assumptions expander (collapsed by default): renders `revenue.assumptions` fields — `price_source`, `yield_baseline`, `risk_discount_rate` — with a prominent "These are estimates" label. The label must be visible; it is not optional.
  - Do-nothing variant: when `is_do_nothing=true`, replace revenue row with "No action needed right now" and show `loss_if_ignored` as "Potential risk if conditions change".
  - Simulated-data badge: show if any `crop_condition.components.*source` equals `"simulated"`.
- [ ] **3-F.1.2** Guard: the card component must never perform arithmetic on `net_impact` or `loss_if_ignored`. It only formats and displays the numbers it receives.

### 3-F.2 Done / Not done buttons → POST /events

- [ ] **3-F.2.1** `RecommendationCard.tsx` — add "Done ✓" and "Not done ✗" buttons below the card body.
- [ ] **3-F.2.2** On tap, call `client.eventsPost({ parent_event_id: recommendation.event_id, event_type: "response", payload: { acted: "yes" | "no", reported_via: "chat" } })`.
- [ ] **3-F.2.3** On success, replace the buttons with a muted confirmation label ("Response recorded"). On API error, show a retry option.
- [ ] **3-F.2.4** Add `eventsPost(req: EventAppend): Promise<EventEnvelope>` to `client.ts` if not already present from Task 1-F.
- [ ] **3-F.2.5** The `acted` value from the Done button must be `"yes"` and from Not-done must be `"no"` — these are the schema enum values. Do not use `"done"` or `"not_now"`.

### 3-F.3 Currency symbol helper

- [ ] **3-F.3.1** `frontend/src/lib/currency.ts` — `formatMoney(amount: number, currency: string): string`. Lookup: `{ INR: "₹", BRL: "R$", USD: "$", EUR: "€" }`. Unknown currency → prepend the ISO code (e.g. `"XOF 1,200"`). No hardcoded ₹ anywhere else in the codebase after this lands.
- [ ] **3-F.3.2** Grep check: no string literal `"₹"` or `"INR"` outside `currency.ts` and test files.

### 3-F.4 Wire RecommendationCard into chat

- [ ] **3-F.4.1** In `Chatbot.tsx`, after receiving a `ChatResponse`, render each item in `recommendations[]` as a `RecommendationCard` (not plain text as in Task 1-F). Replace the plain text fallback from 1-F.3.1.
- [ ] **3-F.4.2** Also call `recommendationsGet(plotId)` when the user types "recommendations", "सलाह", or clicks a "Today's advice" quick-action chip; render results as `RecommendationCard` stack.

### 3-F.5 Fix market prices caller

- [ ] **3-F.5.1** `frontend/src/components/Marketplace.tsx` `fetchPrices()`:
  - Replace `fetch(${API}/market/prices, { method:'POST', body: JSON.stringify({crop, state, city}) })` with `client.marketPricesGet(crop, state || undefined)`.
  - Update field mapping in the component: `data.price_per_quintal` (not `data.price`), `data.support_price` (not `data.msp`), `data.observed_at` (ISO; format for display).
  - `below_msp` is no longer in the response — compute it in the component: `price_per_quintal < support_price` (this is display logic, not money arithmetic).
  - `data.advice` is now `"sell" | "hold" | "unknown"` enum — map to human-readable strings in the component.
- [ ] **3-F.5.2** Remove the `POST /market/prices` compat shim from `compat.py` once this lands.

### 3-F.6 Fix schemes search caller

- [ ] **3-F.6.1** `frontend/src/components/GovSchemes.tsx` `search()`:
  - Replace `fetch(${API}/schemes/search, { method:'POST', body: JSON.stringify({query, state, category, top_k}) })` with `client.schemesSearchGet(query, language)`.
  - Update field mapping: `s.name` (not `s.scheme_name`), `s.score` (not `s.match_score`).
  - **PC-3 resolved:** `benefit_type`, `benefit_amount`, `level`, `state` are now in the `Scheme` schema. Restore `SchemeCard` display of these four fields — they were in the legacy component and can be re-enabled from the typed response. Treat each as optional (`?? "—"` fallback).
  - Add `data_quality` handling: if the response contains `data_quality: "unavailable"`, show a "Schemes not available for this country" message instead of an empty list.
- [ ] **3-F.6.2** Remove the `POST /schemes/search` compat shim from `compat.py` once this lands.

### 3-F.7 Build verification

- [ ] **3-F.7.1** `tsc --noEmit` passes; `npm run build` passes.
- [ ] **3-F.7.2** No raw `fetch(${API}/market/prices` or `fetch(${API}/schemes/search` calls remain (grep check).
- [ ] **3-F.7.3** No `"₹"` string literal outside `currency.ts` (grep check).

**Demo checkpoint (browser):** Chat shows an irrigation `RecommendationCard` with category chip, formatted money impact (₹ from `currency.ts`), assumptions expander, Done/Not-done buttons. Tap Done → buttons replaced by "Response recorded". Marketplace shows `price_per_quintal` and `support_price` correctly. GovSchemes search works with new GET endpoint.

---

## Task 4 — Delivery: WhatsApp/SMS with Mock Provider, Inbound Replies

*(Full backend spec unchanged — see prior content.)*

**Backend demo checkpoint:** `POST /webhooks/sms {"From":"+91xxx","Body":"1"}` → `response` event with `acted="yes"`.

---

## Task 4-F — Delivery status display, Done/Not-done consistency

**Goal:** The UI shows the delivery status of a recommendation, and the Done/Not-done button result is consistent with what an inbound SMS reply writes.

**Depends on:** Task 3-F ✓, Task 4 backend ✓

### 4-F.1 Delivery status in RecommendationCard

- [ ] **4-F.1.1** `frontend/src/api/client.ts` — add `eventsGet(params: { farm_id?: string; plot_id?: string; event_type?: string; since?: string }): Promise<EventEnvelope[]>`.
- [ ] **4-F.1.2** `RecommendationCard.tsx` — fetch the `delivery` child event for a recommendation via `eventsGet({ plot_id, event_type: "delivery" })` filtered to `parent_event_id == recommendation.event_id`. Display a small delivery-status chip:
  - `queued` → grey clock icon
  - `sent` → blue send icon
  - `delivered` → green tick
  - `failed` → red warning (with "Retry" button — out of scope for now, just label it)
- [ ] **4-F.1.3** Only fetch delivery status for recommendations shown in the last 24 hours (limit the event query with `since`). Do not poll continuously — fetch once when the card mounts.

### 4-F.2 Consistency check: chat button vs SMS reply

The Done button in the UI (Task 3-F) posts `acted="yes"` via `POST /events`. An SMS reply of "1" also writes `acted="yes"` via the webhook. Both paths must write the same `acted` value and the same `reported_via` semantics.

- [ ] **4-F.2.1** Verify that `RecommendationCard`'s Done button sends `reported_via: "chat"` and the webhook handler sends `reported_via: "sms_reply"` or `"whatsapp_reply"` — both are valid enum values from the schema. Confirm no mismatch.
- [ ] **4-F.2.2** After a `response` event is appended (either from the button or via the webhook), `eventsGet` for that recommendation must show a `response` child event. Write a Playwright smoke test or a manual test script that:
  1. Sends a recommendation via `POST /chat`.
  2. Taps Done in the UI.
  3. Queries `GET /events/{eventId}` and asserts a `response` child with `acted="yes"` exists.

### 4-F.3 Build verification

- [ ] **4-F.3.1** `tsc --noEmit` passes; `npm run build` passes.

**Demo checkpoint (browser):** Open a recommendation card — a delivery-status chip appears (should show "queued" or "sent" depending on provider). Tap Done → chip updates to show response recorded alongside the delivery chip.

---

## Task 5 — Grading, Harvest Window, Regenerative Agent

*(Full backend spec unchanged — see prior content.)*

**Backend demo checkpoint:** `POST /grading` returns `method="rgb-opencv"`. `GET /plots/p1/harvest-window` returns `loss_per_day_delay > 0`.

---

## Task 5-F — GradeCard, HarvestCard, RegenerativeCard, replace /predict caller

**Goal:** Grading, harvest, and regenerative recommendations render as distinct cards. Disease detection uses `POST /diagnose` instead of the legacy Flask `/predict`.

**Depends on:** Task 3-F ✓, Task 5 backend ✓

### 5-F.1 GradeCard component

- [ ] **5-F.1.1** `frontend/src/components/cards/GradeCard.tsx`:
  - Props: `result: GradeResult` (from `api/openapi.yaml`).
  - Shows grade badge: A (green), B (amber), C (red).
  - Confidence bar (0–100%).
  - `price_effect_per_kg` formatted with `formatMoney()` and "per kg".
  - Mandatory disclaimer line, verbatim: **"RGB-based grading only — not hyperspectral."** This text must always render; it is not optional.
  - Low-confidence state: when the backend sends no `grade` field, show "Photo unclear — please retake in good lighting" with a camera icon.
- [ ] **5-F.1.2** `frontend/src/components/Chatbot.tsx` — photo upload: when user attaches a photo via the camera icon, pass it as `input.image_base64` in `chatPost`. If `ChatResponse.recommendations[]` contains a `category="grade"` item, render as `GradeCard`. If the backend returns a low-confidence result, render the retake prompt.
- [ ] **5-F.1.3** `frontend/src/api/client.ts` — add `gradingPost(image: File, crop: string, plotId: string): Promise<GradeResult>` using `multipart/form-data`.

### 5-F.2 Replace /predict disease caller

- [ ] **5-F.2.1** `frontend/src/services/diseaseDetectionService.ts` — replace `fetch(${MODEL_API_URL}/predict, …)` with `client.diagnosePost(image)` using the new `POST /diagnose` endpoint.
- [ ] **5-F.2.2** `frontend/src/api/client.ts` — add `diagnosePost(image: File, plotId?: string): Promise<DiseaseResult>`.
- [ ] **5-F.2.3** `DiseaseResult` shape from `api/openapi.yaml`: `label`, `confidence`, `top_k[]`, `recommendation`. Map `label` → `diseaseName`, `confidence * 100` → percentage, `recommendation.text` → treatment text. Remove the old `callBackend()` function from `diseaseDetectionService.ts`.
- [ ] **5-F.2.4** Remove `VITE_MODEL_API_URL` from `frontend/.env.example` (no longer needed).

### 5-F.3 HarvestCard component

- [ ] **5-F.3.1** `frontend/src/components/cards/HarvestCard.tsx`:
  - Props: `window: HarvestWindow`.
  - Shows `start` and `end` dates as a range.
  - `loss_per_day_delay` formatted with `formatMoney()` and "/day".
  - Embeds `window.recommendation` as a `RecommendationCard` (reuse component).
- [ ] **5-F.3.2** `frontend/src/api/client.ts` — add `harvestWindowGet(plotId: string): Promise<HarvestWindow>`.
- [ ] **5-F.3.3** Wire to chat: when user types "when to harvest" or "कटाई", call `harvestWindowGet(plotId)` and render `HarvestCard`.

### 5-F.4 RegenerativeCard component

- [ ] **5-F.4.1** `frontend/src/components/cards/RegenerativeCard.tsx`:
  - Props: `recommendation: Recommendation` where `category="regenerative"`.
  - Header chip: "[REGENERATIVE]" label (distinct visual treatment — e.g. leaf-green outlined chip).
  - Body: `recommendation.text`.
  - Money row: same as `RecommendationCard` but if `net_impact < 0`, show it as "Short-term cost" in amber, not as a loss.
  - Long-term note row (only when present): leaf icon + `long_term_note` text.
  - BRICS relevance row (only when present): globe icon + `brics_relevance` text, styled as a secondary note.
  - Done / Not-done buttons — same `POST /events` call as `RecommendationCard`.
- [ ] **5-F.4.2** `frontend/src/api/client.ts` — add `regenerativeGet(plotId: string): Promise<Recommendation[]>`.
- [ ] **5-F.4.3** Wire to chat: when user types "regenerative" or "टिकाऊ खेती", call `regenerativeGet` and render each result as a `RegenerativeCard`.

### 5-F.5 Build verification

- [ ] **5-F.5.1** `tsc --noEmit` passes; `npm run build` passes.
- [ ] **5-F.5.2** No `VITE_MODEL_API_URL` reference remains in `src/` (grep check).
- [ ] **5-F.5.3** No raw `fetch(${MODEL_API_URL}/predict` call remains (grep check).
- [ ] **5-F.5.4** `GradeCard.tsx` contains the string `"RGB-based grading only — not hyperspectral."` verbatim (grep check).

**Demo checkpoint (browser):** Attach a tomato photo in chat → `GradeCard` appears with grade badge, confidence, price effect, and the RGB disclaimer. Type "when to harvest" → `HarvestCard` with date range and loss-per-day. Type "regenerative" → at least one `RegenerativeCard` with `[REGENERATIVE]` chip, long-term note, and BRICS relevance.

> **OQ-FE-3 resolved:** `SoilNPKPanel.tsx` keeps its in-browser `predictNPK()` call (the JSON model export stays in `frontend/src/services/npkModel.json`). The soil chat (`SoilChatbot.send()`) uses `POST /chat` as wired in Task 1-F. `POST /soil/fertilizer` is optional — wire it in 5-F only if time permits as a secondary path; the panel works without it.

---

## Task 6 — Country Pack Loader, India Full Pack, Brazil Thin Pack, Per-Country Guardrail

*(Full backend spec as previously written — pack loader, guardrail full implementation, pack additions, tests. See prior version for full checklist.)*

### 6.5 Audit endpoint backend (PC-2 approved)

- [ ] **6.5.1** `backend/app/routers/compliance.py` — implement `GET /guardrail/audit`:
  - Reads `logs/compliance_audit.jsonl` (the JSONL file written by `guardrail/pre.py` and `guardrail/post.py`).
  - Returns `403` with `Problem` schema when `FS_EXPOSE_AUDIT` env var is not `"true"`.
  - When `FS_SEED_DEMO=true`, automatically sets `FS_EXPOSE_AUDIT=true` at startup (wire in `backend/main.py`).
  - Parses JSONL entries; returns the `last_n` most recent as `AuditEntry` objects matching `api/openapi.yaml` — fields: `event_id`, `occurred_at`, `ruleset`, `pre`, `post`, `rules_triggered`.
  - Strips all fields that could contain raw query text or personal data before returning (whitelist approach — only the six listed fields pass through).
  - Mount under the `compliance` tag.
- [ ] **6.5.2** Add `FS_EXPOSE_AUDIT` to `.env.example` with description: `"true when FS_SEED_DEMO=true; keep false in production"`.
- [ ] **6.5.3** Pytest: `test_audit_endpoint_requires_flag` — `GET /guardrail/audit` returns 403 when `FS_EXPOSE_AUDIT=false`; returns 200 with entries when `true`.
- [ ] **6.5.4** Pytest: `test_audit_no_pii` — response entries contain no `query`, `user_input`, `farm_id`, or `phone` fields.

### 6.6 PackSummary compliance_substances backend (PC-1 approved)

- [ ] **6.6.1** `backend/app/routers/packs.py` `GET /country-packs/{code}` — populate `PackSummary.compliance_substances` from the loaded pack:
  - Map `pack.compliance.banned[]` → `compliance_substances.banned[]` with fields `substance`, `source`, `retrieved_on`, and `verified=False` (all current seed entries are unverified).
  - Map `pack.compliance.restricted[]` → `compliance_substances.restricted[]` same shape.
  - Return only substance names and sources — no `regional` overrides in this field (those are server-side only).
- [ ] **6.6.2** Pytest: `test_pack_summary_includes_substances` — `GET /country-packs/IN` returns `compliance_substances.banned` with at least one entry where `verified=False`.

**Backend demo checkpoint:** Switching `FS_COUNTRY_CODE` changes currency and templates without code changes. `GET /guardrail/audit?last_n=5` returns recent guardrail entries (when `FS_EXPOSE_AUDIT=true`). `GET /country-packs/IN` returns `compliance_substances` with `verified=false` entries.

---

## Task 6-F — Currency/language from pack, compliance view update, remove compat shims

**Goal:** No hardcoded INR or Hindi strings remain in frontend components. The compliance view works against pack-level data. All compat shims are removed.

**Depends on:** Task 3-F ✓, Task 6 backend ✓

### 6-F.1 Currency and language from pack

- [ ] **6-F.1.1** `frontend/src/api/client.ts` — add `packGet(code: string): Promise<PackSummary>` and `auditGet(lastN?: number): Promise<{ entries: AuditEntry[] }>`.
- [ ] **6-F.1.2** `frontend/src/lib/packContext.tsx` — React context + hook `usePack()`:
  - On app mount, calls `packGet(country_code)` where `country_code` is read from `VITE_COUNTRY_CODE` env var (default `"IN"`).
  - Stores `{ currency, languages, guardrail_ruleset, completeness, compliance_substances }`.
  - All components that need currency or language call `usePack()` rather than hardcoding.
- [ ] **6-F.1.3** `frontend/src/components/cards/RecommendationCard.tsx` and `RegenerativeCard.tsx` — replace any remaining hardcoded `"₹"` with `formatMoney(amount, pack.currency)`.
- [ ] **6-F.1.4** Add `VITE_COUNTRY_CODE=IN` to `.env.example` with description.
- [ ] **6-F.1.5** Grep check: zero occurrences of string literal `"INR"` or `"₹"` outside `currency.ts`, test files, and generated `schema.d.ts`.

### 6-F.2 Compliance view — fully wired against approved endpoints

**PC-1, PC-2 are approved and implemented.** All three Compliance tabs now have real backend endpoints.

- [ ] **6-F.2.1** `frontend/src/components/Compliance.tsx` — **Banned List tab** (PC-1):
  - Replace `GET /compliance/lists` shim with `packGet(country_code)`.
  - Render `pack.compliance_substances.banned[]` — for each entry show `substance`, `source`, and a ⚠️ `verified=false` warning chip ("Illustrative — verify before use").
  - Render `pack.compliance_substances.restricted[]` similarly with a "Restricted" chip.
  - Remove `BANNED_STATIC` and `RESTRICTED_STATIC` hardcoded fallbacks; use `compliance_substances` from the pack response instead. Keep a loading/error state for when the pack fetch fails.
- [ ] **6-F.2.2** `frontend/src/components/Compliance.tsx` — **Audit Log tab** (PC-2):
  - Replace `GET /audit-log` shim with `client.auditGet(20)`.
  - Render each `AuditEntry` as a row: `occurred_at` (formatted), `ruleset`, `pre` chip (pass=green/block=red), `post` chip (pass=green/modified=amber/block=red), `rules_triggered` tags.
  - Show a "Audit disabled — set FS_EXPOSE_AUDIT=true" empty state when the endpoint returns 403.
  - Poll every 10 seconds while the tab is open so judges see live guardrail checks.
- [ ] **6-F.2.3** `frontend/src/components/Compliance.tsx` — **Check Pesticide tab**:
  - Replace `POST /compliance/check` shim with `client.chatPost({ …, input: { text: "is ${name} safe to use on crops?" } })`.
  - On `422` response, display `Problem.message` with a red "🚫 Blocked" header and list `rules_triggered` tags.
  - On `200` response, display the chat `reply` text directly.
  - Remove the old `check()` function and its `fetch` call.

### 6-F.3 Remove compat shims

- [ ] **6-F.3.1** Remove `POST /query` shim from `compat.py` (was removed in Task 1-F but confirm gone).
- [ ] **6-F.3.2** Remove `POST /market/prices` shim (was removed in Task 3-F but confirm gone).
- [ ] **6-F.3.3** Remove `POST /schemes/search` shim (was removed in Task 3-F but confirm gone).
- [ ] **6-F.3.4** Remove weather shims (`GET /weather/current`, `/weather/forecast`, `/weather/spray`) — CalendarAlerts no longer calls them since Task 2-F.
- [ ] **6-F.3.5** Remove compliance shims (`POST /compliance/check`, `GET /compliance/lists`, `GET /audit-log`) now that 6-F.2 replaces them.
- [ ] **6-F.3.6** Set `FS_COMPAT_SHIMS=false` as the new default in `.env.example`. Delete `compat.py` if empty.

### 6-F.4 Build verification

- [ ] **6-F.4.1** `tsc --noEmit` passes; `npm run build` passes.
- [ ] **6-F.4.2** Grep checks: no `"₹"` or `"INR"` outside `currency.ts`; no `VITE_SOIL_NPK_API_URL` or `VITE_MODEL_API_URL` references in `src/`; no `compat.py` routes mounted.

**Demo checkpoint (browser):** Restart server with `FS_COUNTRY_CODE=BR`. App loads with `R$` currency in all cards and Portuguese pack templates. Compliance "Banned List" tab shows `paraquat` entry with ⚠️ "verify before use" chip. Compliance "Audit Log" tab shows live guardrail entries updating every 10 s. Compliance "Check Pesticide" tab: type "endosulfan" → 🚫 Blocked with `rules_triggered`. No compat shims visible in Network tab.

---

## Task 7 — Season Review, Demo Data, Model Cards, DPG README

*(Full backend spec unchanged — see prior content.)*

**Backend demo checkpoint:** `GET /plots/demo_plot/season-review?season=kharif-2026` returns full review with `actions_recommended >= 10`.

---

## Task 7-F — SeasonReviewCard

**Goal:** The season review is surfaced in the chat as a card, completing the full demo loop: sense → recommend → act → review.

**Depends on:** Task 3-F ✓, Task 7 backend ✓

### 7-F.1 SeasonReviewCard component

- [ ] **7-F.1.1** `frontend/src/components/cards/SeasonReviewCard.tsx`:
  - Props: `review: SeasonReview`.
  - Summary row: `actions_taken` / `actions_recommended` as a fraction with a progress bar.
  - `do_nothing_calls` row: "System recommended no action {N} times" — shows that do-nothing is working.
  - Money row: `predicted_impact_taken` formatted with `formatMoney(amount, review.currency)`. Show `realized_impact` if non-null with a "Realised" label; if null, show "Realised impact not yet recorded".
  - Timeline section (collapsed by default): list of `timeline[]` items, each as a mini `RecommendationCard` (read-only, no buttons).
  - Next-season adjustments section: bullet list of `next_season_adjustments[]` strings.
  - If `next_season_adjustments` contains the sparse-data note, show a yellow "Limited data" banner at the top of the card.
- [ ] **7-F.1.2** `frontend/src/api/client.ts` — add `seasonReviewGet(plotId: string, season?: string): Promise<SeasonReview>`.

### 7-F.2 Wire SeasonReviewCard into chat

- [ ] **7-F.2.1** In `Chatbot.tsx`, when user types "season review", "Crop Wrapped", "सीज़न रिव्यू", or clicks a "Season Review" quick-action chip, call `seasonReviewGet(plotId)` and render the result as a `SeasonReviewCard`.
- [ ] **7-F.2.2** Add "Season Review" to the `quickActions` array in `Chatbot.tsx` (alongside existing "Check Disease", "What to Sow" etc.).

### 7-F.3 Build verification

- [ ] **7-F.3.1** `tsc --noEmit` passes; `npm run build` passes.
- [ ] **7-F.3.2** No hardcoded season strings (e.g. literal `"kharif-2026"`); the season parameter is derived from the current date or left undefined.

**Demo checkpoint (browser):** With demo data seeded (`FS_SEED_DEMO=true`), type "season review" in chat → `SeasonReviewCard` appears showing `actions_taken/actions_recommended` fraction, formatted money impact, and a timeline of past recommendations. Tap the timeline → mini cards expand. The "simulated data" note is visible if the demo seed data is active.

---

## Dependency Graph

```
Task 1 backend ──────────────────────────────────────────────────────────────┐
  └─► Task 1-F (API client, /chat wiring)                                    │
        └─► Task 2-F (ConditionCard, farm/plot reg)                          │
Task 2 backend ──────────────────────────────────────────────────────────────┤
  └─► Task 2-F (needs Task 2 backend)                                        │
        └─► Task 3-F (RecommendationCard, Done/Not-done)                     │
Task 3 backend ──────────────────────────────────────────────────────────────┤
  └─► Task 3-F (needs Task 3 backend)                                        │
        ├─► Task 4-F (delivery status)      Task 4 backend ──────────────────┤
        └─► Task 5-F (GradeCard, HarvestCard, RegenerativeCard)              │
              Task 5 backend ────────────────────────────────────────────────┤
              └─► Task 6-F (pack/currency, remove shims)                     │
                    Task 6 backend ──────────────────────────────────────────┤
                    └─► Task 7-F (SeasonReviewCard)                          │
                          Task 7 backend ────────────────────────────────────┘
```

**Key parallelism notes:**
- Backend tasks 4 and 5 can run in parallel after Task 3 backend.
- Frontend tasks 4-F and 5-F can run in parallel after Task 3-F.
- Backend tasks proceed independently of frontend tasks: Task 2 backend can start the moment Task 1 backend is done, regardless of Task 1-F status. Frontend tasks only block on their corresponding backend task being done, not on the previous frontend task (except for the dependency chain above).
- The compat shims exist precisely so backend tasks can advance without waiting for their N-F counterparts.

---

## Required Test and Build Checks

### Backend (from tech.md — must pass before any backend task is "done")

| Suite | Task |
|-------|------|
| `test_eventlog_append_only.py` | 1 |
| `test_revenue_do_nothing.py` | 3 |
| `test_guardrail_country_rules.py` | 6 |
| `test_pack_schema.py` | 1 (basic), 6 (full) |
| `test_audit_endpoint_requires_flag` (in `test_guardrail_country_rules.py`) | 6 |
| `test_audit_no_pii` (in `test_guardrail_country_rules.py`) | 6 |
| `test_pack_summary_includes_substances` (in `test_pack_schema.py`) | 6 |

### Frontend (must pass before any N-F task is "done")

| Check | When |
|-------|------|
| `tsc --noEmit` (zero errors) | End of every N-F task |
| `npm run build` (zero errors) | End of every N-F task |
| `npm run gen:api` (regenerate client types) | Whenever `api/openapi.yaml` changes |
| Grep: no `import.*@google/generative-ai` in `src/` | Task 1-F |
| Grep: no raw `fetch(.*\/query` calls | Task 1-F |
| Grep: no `"₹"` outside `currency.ts` | Tasks 3-F, 6-F |
| Grep: no raw `/market/prices` or `/schemes/search` fetch calls | Task 3-F |
| Grep: no `VITE_MODEL_API_URL` | Task 5-F |
| Grep: no `VITE_SOIL_NPK_API_URL` | Task 6-F |
| `GradeCard.tsx` contains RGB disclaimer verbatim | Task 5-F |
