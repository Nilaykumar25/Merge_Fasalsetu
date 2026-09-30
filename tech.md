# Tech

- Backend: Python, FastAPI, pydantic v2, Google ADK, Gemini API (google-genai). Model ids come from env vars (FS_MODEL_ORCHESTRATOR, FS_MODEL_TRANSLATE), never hardcoded.
- DB: PostgreSQL 15+. Event store is append-only (trigger in db/001_event_log.sql). Do not add UPDATE/DELETE paths.
- Frontend: React + TypeScript + Vite, mobile-first, manual routing (NO React Router).
- ML: scikit-learn GradientBoosting (NPK), RandomForest (fertilizer v2), EfficientNet-B0 (disease), OpenCV (grading). Keep .pkl plus JSON export for in-browser NPK.
- Vector search: ChromaDB with paraphrase-multilingual-MiniLM-L12-v2.
- Satellite: Sentinel-2 via Copernicus or Google Earth Engine (NDVI/NDWI). Climate history: NASA POWER.
- Voice: Whisper (STT), gTTS (TTS).
- Delivery: WhatsApp and SMS via provider behind an interface; include a mock provider for demos.
- Contracts (source of truth, do not change without asking):
  - schemas/recommendation_event.schema.json
  - db/001_event_log.sql
  - api/openapi.yaml
  - country_packs/PACK_SPEC.md
- Tests: pytest. Required: event log append-only, revenue do-nothing logic, guardrail per-country rules, pack schema validation.
- Licence: Apache-2.0. No secrets in the repo; use .env.example.
