# Structure

See docs/REPO_STRUCTURE.md for the full tree and request lifecycle.

- legacy/fasalsetu/ and legacy/annavriddhi/ are READ-ONLY reference copies of the two source projects. Port code from them into backend/ and frontend/; never edit or import from legacy/ at runtime.
- Ownership of sources: chatbot, voice, disease, scheme RAG, market, weather, soil models, guardrail, frontend -> from legacy/fasalsetu. Event log, condition tracker, irrigation, revenue layer, delivery, grading, harvest, season review -> from legacy/annavriddhi (backend logic only; ignore its UI).
- Agents return Candidate objects only. They never talk to the farmer or call delivery.
- All pipeline ordering lives in backend/app/orchestrator/pipeline.py: guardrail.pre -> tracker -> agents -> revenue -> guardrail.post -> eventlog.append -> delivery.
- One router file per tag in api/openapi.yaml.
