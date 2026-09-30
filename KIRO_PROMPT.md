# Prompts for Kiro

## Before you start (human checklist)
1. Open this repo folder in Kiro (it already contains .kiro/steering/*, docs/, schemas/, db/, api/, country_packs/).
2. Copy your two existing projects in as read-only references:
   - legacy/fasalsetu/   (full FasalSetu repo: frontend, backend, models, guardrail)
   - legacy/annavriddhi/ (full AnnaVriddhi repo: decision engine, grading pipeline, SHC loaders)
3. Put any trained artefacts (.pkl, EfficientNet weights) under legacy/ too, or note where they live.
4. Add .env with GEMINI_API_KEY (keep it out of git).

## Prompt 1: generate the spec (paste into a new Kiro spec session)

I am merging two projects into one standalone open-source project called FasalSetu, for the hackathon "Build with AI: Code for Communities", Track 4 (AgriN and Regenerative Agricultural Intelligence, BRICS cooperation theme). Read .kiro/steering/*, docs/REPO_STRUCTURE.md, schemas/recommendation_event.schema.json, db/001_event_log.sql, api/openapi.yaml, and country_packs/PACK_SPEC.md first. They are the agreed contracts.

legacy/fasalsetu is the shell: frontend, chatbot/orchestrator, voice, disease, scheme RAG, market, weather, soil models, compliance guardrail. legacy/annavriddhi contributes backend logic only (no UI): recommendation event log, crop condition tracker, irrigation prediction, revenue formula with a do-nothing state, SMS/WhatsApp delivery, RGB produce grading, harvest window, season review. The UI is entirely FasalSetu's existing frontend; new features appear as cards in the chat. The LLM is the Gemini API via Google ADK.

New work beyond the two legacy repos: a Satellite agent (Sentinel-2 NDVI/NDWI as the fourth Crop Condition input), a Regenerative agent (cover crops, intercropping, residue management, reduced tillage, organic amendments, scored by the same revenue formula), and country packs (India full, Brazil thin).

Create a spec with requirements.md, design.md and tasks.md. Use EARS-style acceptance criteria. Organize tasks in this order, each independently demoable:
1. Event log: schema models, store (append only), every existing agent emits Candidates through the pipeline.
2. Crop Condition Tracker with satellite input.
3. Irrigation agent and the revenue layer including do-nothing.
4. Delivery: WhatsApp/SMS with mock provider, inbound replies writing response events.
5. Grading, harvest window, regenerative agent.
6. Country pack loader and validation, India pack, thin Brazil pack, per-country guardrail rules.
7. Season Review, demo data, model cards, DPG README.

Do not modify the four contract files without asking me. Where the legacy code conflicts with the contracts, flag it and propose a resolution. List open questions before writing tasks. Do not start implementing yet.

## Prompt 2: execute (one per task, after you approve the spec)

Implement task 1 from .kiro/specs/fasalsetu/tasks.md only. Port from legacy/ where applicable, following .kiro/steering/structure.md. Write the tests named in steering/tech.md that apply to this task, run them, and show me the results. Stop after this task and summarise what changed and anything that deviated from the contracts.

## Rules of thumb while using Kiro
- One task per session; review the diff before approving the next.
- If Kiro proposes changing a contract file, treat it as a design decision, not a code change.
- Ask it to mark anything it simulated or stubbed, so the demo labels stay honest.
