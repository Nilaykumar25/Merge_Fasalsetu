**Farm Revenue Copilot**

_Real-time crop guidance system — project spec & implementation plan_

# **1\. Problem & Objective**

Farmers currently receive advice at fixed, infrequent points while crop conditions change daily. Key revenue-determining decisions — when to intervene, when to harvest, how to grade produce — are made without a continuous view of crop state.

- **Objective:** maximize realised revenue, not just yield. Every recommendation must be expressed in terms of its expected rupee impact.
- **Core loop:** sense (imagery + sensors + weather) → interpret (crop state, risk) → recommend (action + revenue impact) → deliver (local language, low-connectivity channel) → log outcome → improve next season.

# **2\. Feature List & Implementation Notes**

## **Tier 1 — Core Loop (must work end-to-end)**

**2.1 Continuous Crop Condition Tracker**

Combines field imagery, sensor readings and weather into a single running 'crop state' score per plot.

- Inputs: soil moisture sensor stream, daily/periodic field photo, weather API (temperature, rainfall, humidity, forecast).
- Implementation: a scheduled job (cron / simple backend worker) pulls each source, normalizes into a common schema, and computes a composite health score (e.g. weighted rule-based index to start; can be swapped for a learned model later).
- Output: a time-series 'crop_state' record per plot per day, stored in a database — this becomes the backbone every other feature reads from.
- Dataset / prerequisites: live weather API key (OpenWeatherMap / IMD / Visual Crossing), moisture sensor data feed (hardware already available), a small set of sample field photos to prototype against before real capture is ready.

**2.2 Intervention Timing (nutrition / disease / weather cover)**

Recommends when to act — or explicitly recommends doing nothing — on low nutrients, disease risk, or bad-weather cover.

- Implementation: rule engine over the crop_state score plus thresholds (e.g. moisture below X + no rain forecast 48h → irrigation flag; leaf color/texture anomaly from photo → disease flag; forecasted storm/hail → cover flag).
- A 'do nothing' state must be a first-class output, not just an absence of alerts — reduces alert fatigue, which matters for adoption.
- Dataset / prerequisites: agronomic thresholds per crop type (can be sourced from extension-service guidelines or public agri datasets), weather forecast API.
- Stretch: replace static thresholds with a lightweight classifier trained on labeled examples of intervene/no-intervene outcomes, once logging (see §2.8) accumulates data.

**2.3 Irrigation Prediction**

Your strongest 'real data' feature — grounded in an actual moisture sensor rather than a proxy.

- Implementation: threshold-based model adjusted by weather forecast — do not recommend irrigation if rain is expected within the intervention window; factor in crop-specific moisture requirements and soil type if known.
- Can be upgraded to a simple regression/water-balance model (evapotranspiration estimate − rainfall − current soil moisture) if time allows.
- Dataset / prerequisites: moisture sensor stream (available), crop-specific water requirement reference tables (public agronomy sources), weather forecast API.

**2.4 Delivery Channel**

Guidance must reach the farmer through a channel they already use, in local language — this is what makes the system usable in the field rather than just a dashboard.

- Implementation: SMS or WhatsApp integration (Twilio, Gupshup, or WhatsApp Business API sandbox) triggered whenever a new recommendation is generated; message templates in local language with placeholders for crop, action, and revenue impact.
- For demo purposes, a simple text-to-speech read-out of the message can simulate a voice-call channel for low-literacy users.
- Dataset / prerequisites: Twilio/WhatsApp sandbox account, translated message templates (start with one local language, e.g. Hindi), TTS API (Google Cloud TTS / open-source alternative) if voice is demoed.

## **Tier 2 — Differentiators**

**2.5 Produce Grading via Image Processing**

Imitates hyperspectral-grade quality assessment using accessible RGB image processing, since real hyperspectral hardware isn't available.

- Implementation: OpenCV pipeline — contour detection for size/shape, color histogram analysis for ripeness/defect signals, edge/texture analysis (e.g. Laplacian variance, GLCM texture features) as a proxy for surface blemishes.
- Output a simple grade (A/B/C or numeric quality score) per captured item or batch.
- Framing for judges: explicitly note this is a constrained-hardware approximation of hyperspectral imaging principles, not a claim of equivalent accuracy.
- Dataset / prerequisites: labeled produce image datasets for calibration/testing — e.g. Fruits-360, PlantVillage (for disease/defect visuals), or a small self-captured set of good/damaged produce photos; OpenCV, scikit-image.

**2.6 Revenue Framing Layer**

The system's core differentiator — every alert and recommendation carries an estimated rupee impact, not just an instruction.

- Implementation: a formula-based estimator — expected revenue = predicted yield × grade-adjusted price − cost of action − weather/timing risk discount. Start with heuristic weights, refine using season-review data over time (§2.8).
- Requires a market price reference (even a static or scraped mandi price table is enough for a demo).
- Dataset / prerequisites: mandi/market price data (Agmarknet API or scraped sample data), rough cost estimates for common interventions (fertilizer cost, irrigation cost) — can be hardcoded for the demo crop.

**2.7 Harvest Window Recommender**

Recommends an optimal harvest window balancing maturity, weather risk and market timing.

- Implementation: combine (a) maturity estimate — from days-since-planting plus visual cues from captured photos, (b) weather forecast risk over the candidate window, (c) market price trend from §2.6's price feed. Score candidate windows and recommend the highest expected-revenue window.
- Dataset / prerequisites: approximate crop growth-stage/days-to-maturity reference table, weather forecast, market price feed (shared with §2.6).

## **Tier 3 — Bonus / Stretch**

**2.8 Season Review ('Crop Wrapped')**

Compares what was recommended, what the farmer actually did, and what was realised — so guidance improves for that specific farm each subsequent season.

- Implementation: log every recommendation event from day one (recommendation, timestamp, predicted revenue impact) plus a simple farmer action log (did they follow it — can be a single SMS reply or app tap). At season end, compare against realised outcome (actual grade/yield/sale price if available, or a demo-simulated value).
- Presented as a shareable, visually engaging summary card — this is a strong, low-cost demo closer if the recommendation log exists from the start.
- Dataset / prerequisites: no external dataset needed — this runs entirely on the system's own logged data. Requires committing to the recommendation-event schema (see §3) from hour one.

**2.9 Fertilizer Recommendation Model & Disease Flagger**

- Implementation: thin wrapper around a pretrained or lightly fine-tuned plant-disease classifier (e.g. built on the PlantVillage dataset); fertilizer suggestion can be a lookup table keyed on detected deficiency symptoms plus soil/crop type.
- Dataset / prerequisites: PlantVillage dataset (public, pretrained models widely available), basic fertilizer-by-deficiency reference table.

**2.10 Secondary Chatbot Interface**

- Implementation: lightweight wrapper over the same recommendation engine, exposed via WhatsApp/SMS free-text queries ('when should I water?') using a small LLM prompt or intent-matching layer. Lowest priority — overlaps with the delivery channel in §2.4.

**2.11 Soil Health Card (SHC) Integration**

Government-issued Soil Health Cards report 12 parameters per farm plot (macro-nutrients N/P/K, secondary and micro-nutrients, pH, EC, organic carbon, etc.). Feeding this in sharpens the fertilizer, intervention and crop-tracker features well beyond what sensor + imagery alone can infer.

- Implementation — manual entry path: simple form/SMS-based input where the farmer keys in their 12 SHC values (or photographs the card for OCR extraction) if they already have one issued.
- Implementation — lookup path: if the farmer has no card on hand, pull the nearest matching record from the government Soil Health Card database using location (village/block/survey number) as the key, falling back to a district-level average if an exact plot match isn't available.
- These 12 parameters feed directly into: intervention thresholds (§2.2, nutrient-specific rather than generic), fertilizer recommendation model (§2.9, exact deficiency-to-fertilizer mapping instead of a coarse lookup), and the crop condition tracker (§2.1, a static soil baseline layered under the daily-changing sensor/imagery signal).
- Dataset / prerequisites: SHC portal / data (soilhealth.dac.gov.in) for lookup by location; OCR pipeline (e.g. Tesseract or a cloud OCR API) if supporting photographed cards; a stored per-plot SHC record schema (12 fields + issue date, since cards are only reissued every couple of years and go stale).
- Note: treat SHC values as a slow-changing baseline, not a live signal — cards are typically 2–3 years old, so the system should flag when a plot's SHC record is stale and prompt the farmer to re-test or re-enter if available.

**2.12 Government Scheme / Policy Matcher**

Matches the farmer's crop, location, land size, and current activity (about to buy fertilizer, about to irrigate, planning to sell) against applicable central/state schemes, and surfaces only the ones relevant right now rather than a static list.

- What it does: checks eligibility against subsidies (fertilizer/seed/equipment), insurance (PMFBY crop insurance windows), MSP procurement schemes, and interest subvention on farm credit.
- Revenue framing tie-in: feeds directly into the revenue-impact layer rather than sitting as a separate feature — e.g. a harvest-timing recommendation can also flag "MSP procurement window opens next week for your crop; selling through that channel vs. open market adds ₹X."
- Implementation: a lookup/matching layer over a maintained scheme database (state + central), keyed by crop type, land size, location, and season/date. Since eligibility windows are time-bound, this is naturally an alert ("you qualify for X, deadline in Y days"), not a one-time lookup.
- Dataset / prerequisites: publicly available central scheme data (PMFBY, PM-KISAN, state agri department portals). Scope to 3–4 well-known schemes for the demo — keeping full coverage current isn't realistic in the timeframe.

# **3\. Data & Prerequisites Summary**

| **Data / Resource**               | **Used By**                                                      | **Source**                                                                      |
| --------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Weather API (current + forecast)  | Crop tracker, irrigation, intervention, harvest window           | OpenWeatherMap / IMD / Visual Crossing                                          |
| Soil moisture sensor stream       | Crop tracker, irrigation prediction                              | Existing hardware                                                               |
| Field photos (periodic capture)   | Crop tracker, disease flagger, grading, maturity estimate        | Self-captured; supplement with public datasets for prototyping                  |
| Produce image dataset             | Grading pipeline calibration                                     | Fruits-360, PlantVillage, or self-captured samples                              |
| Plant disease image dataset       | Disease flagger                                                  | PlantVillage (public)                                                           |
| Market / mandi price data         | Revenue layer, harvest window                                    | Agmarknet API or static sample table                                            |
| Crop agronomic reference tables   | Intervention thresholds, water requirements, days-to-maturity    | Public extension-service / agronomy references                                  |
| SMS / WhatsApp API access         | Delivery channel, chatbot                                        | Twilio / Gupshup / WhatsApp Business sandbox                                    |
| Translated message templates      | Delivery channel                                                 | Manual translation, start with one language                                     |
| TTS API (optional)                | Voice-read alerts                                                | Google Cloud TTS or open-source TTS                                             |
| Soil Health Card data (12 params) | Fertilizer model, intervention thresholds, crop tracker baseline | Farmer-entered / OCR from card, or lookup via soilhealth.dac.gov.in by location |

# **4\. Recommendation-Event Schema (build this first)**

This single log is what unlocks the season-review bonus and future model refinement — set it up before building individual features, and have every feature write to it.

- plot_id, crop_type, timestamp
- recommendation_type (irrigate / fertilize / disease-alert / cover / harvest / grade-report)
- recommendation_detail (free text / structured payload)
- predicted_revenue_impact (₹, with a short rationale string)
- delivery_channel, delivery_status
- farmer_action_taken (yes / no / partial — captured via reply or app input)
- realised_outcome (filled in later: actual grade, yield, sale price, or demo-simulated equivalent)

# **5\. Suggested Build Order**

- 1\. Recommendation-event schema + storage (§3) — enables logging from hour one.
- 2\. Crop condition tracker (§2.1) — ingestion pipeline for weather + sensor + photo.
- 3\. Irrigation prediction (§2.3) — fastest path to a real, defensible feature since sensor data already exists.
- 4\. Intervention alerts (§2.2) + delivery channel (§2.4) — completes the core demoable loop.
- 5\. Grading pipeline (§2.5) and revenue framing layer (§2.6) — main differentiators, build once core loop is stable.
- 6\. Harvest window recommender (§2.7) — depends on §2.5 and §2.6 outputs.
- 7\. Season review (§2.8) — assemble from logged data; highest-ROI bonus feature given low incremental build cost.
- 8\. Fertilizer/disease model (§2.9) and chatbot (§2.10) — only if time remains.
- 9\. SHC integration (§2.11) — manual-entry form is quick to add anytime after §2.9; location-based lookup depends on portal access and can be treated as stretch.

# **6\. Demo Narrative Checklist**

- One farmer/plot story: show a real alert → the revenue impact stated in ₹ → the farmer's action → the realised outcome.
- Show the 'do nothing' state at least once — proves the system isn't just alert spam.
- Close with the season review card — ties the whole system together and hits the bonus objective explicitly.