# Product: FasalSetu (merged)

AI farming companion for small and marginal farmers. Chat-first, multilingual, sensor-aware.
Submission: "Build with AI: Code for Communities", Track 4 (AgriN and Regenerative Agricultural Intelligence), BRICS theme: Cooperation. Long-term: a standalone open-source digital public good.

## Core loop
Sense (IoT soil sensor, weather, field photo, Sentinel-2 NDVI) -> Interpret (daily Crop Condition score) -> Recommend (specialist agents) -> Price (revenue layer) -> Check (guardrail) -> Log (event store) -> Deliver (chat/voice/SMS/WhatsApp) -> Improve (Season Review, next-season tuning).

## Non-negotiable rules
1. No recommendation reaches a farmer without a money impact or an explicit do-nothing, and its assumptions.
2. Revenue formula: expected_yield x grade_adjusted_price - action_cost - risk_discount. All figures are labelled estimates.
3. Gemini routes and phrases. It never produces money figures, thresholds, or guardrail decisions.
4. Every recommendation is written to the append-only event log BEFORE delivery.
5. Guardrail runs pre (block banned-substance queries) and post (scan outgoing text). Every check goes to the JSONL audit log.
6. Sensor data is always tagged real or simulated. Never present simulated data as real.
7. Produce grading is RGB/OpenCV based. Never describe it as hyperspectral.
8. No country logic in code. Country differences live in country_packs/<cc>/pack.yaml.
9. Farm data and contacts never enter the event log or leave the country. Models and schemas are shared.
10. SHC data is a DEMO dataset pending licence confirmation. Keep it labelled as such.

## UI
The UI is entirely FasalSetu's existing frontend. Do not build a new app shell or a dashboard. New features appear as cards inside the chat.
