# Country Pack Specification v1

A country pack is **configuration only**. Adding a country must not require a code change
in `backend/app/`. Each pack is a folder `country_packs/<cc>/` (ISO 3166-1 alpha-2, lowercase)
containing `pack.yaml`, validated at startup against `pack.schema.json`. The app refuses to
start a country whose pack fails validation.

## What varies per country, and where it lives

| Concern | Pack key | Consumed by |
|---|---|---|
| Identity, completeness, provenance | `meta` | `/country-packs`, README |
| Languages, STT/TTS/translation codes | `locale` | voice agent, delivery render |
| Crops, seasons, yield baselines | `crops` | tracker, revenue layer |
| Banned / restricted substances, regional rules | `compliance` | guardrail pre + post |
| Price source and support-price source | `market` | market agent, revenue layer |
| Soil-card schema to internal schema | `soil_card` | soil agent, data loaders |
| Weather / satellite providers | `sensing` | weather, satellite agents |
| Revenue defaults | `revenue` | revenue layer |
| Delivery channels and templates | `delivery` | delivery |
| Schemes corpus | `schemes` | scheme agent |
| Data residency | `data` | storage, logging |

## Rules

1. **Shared:** code, schema (`schemas/`), model cards, pack format.
   **Stays in-country:** farm data, contacts, event log contents, raw SHC.
2. **Guardrail lists must cite an authority and a retrieval date.** Entries without a
   `source` fail validation. Lists in the bundled packs are **illustrative seeds and must be
   verified against the national regulator before any real use.**
3. **Models are not bundled per country.** A pack declares `models.<name>.status`:
   `reuse` (shared model is acceptable), `retrain_required` (e.g. fertilizer RF on local
   soil data), or `unavailable`. Model cards say what data each model was trained on.
4. **Completeness levels.**
   - `full`: all keys populated, local data loaded, end-to-end demo.
   - `thin`: meta, locale, compliance, market, revenue, delivery; other modules fall back
     to `generic` behaviour and say so to the user.
5. **Unknown is explicit.** Missing price source -> market advice `unknown`; missing
   baseline -> the revenue layer marks the figure low-confidence, never guesses silently.

## Adding a country (checklist)
1. Copy `br/pack.yaml` as a starting point; set `meta.code`.
2. Fill `locale`, `compliance` (with sources), `market`, `revenue`, `delivery`.
3. Map the national soil card to `soil_card.map` (internal names: `ph`, `oc`, `ec`, `n`, `p`, `k`, ...).
4. Run `pytest backend/tests/test_pack_schema.py`.
5. Add a row to `country_packs/README.md` stating completeness and data provenance.
