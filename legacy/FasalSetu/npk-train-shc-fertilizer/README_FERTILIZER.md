# Fertilizer Recommender — Hackathon Component

Predicts a fertilizer product (Urea, DAP, 14-35-14, 28-28, 17-17-17, 20-20,
10-26-26) from soil NPK status + moisture + crop + soil type, sourcing NPK
either from a real scraped Soil Health Card (via coordinates) or manual
farmer entry.

This document is deliberately honest about what's real, what's a
workaround, and what to disclose to judges — better to control that
narrative yourself than have a judge find it first.

---

## How the Pieces Fit

```
data/fertilizer_prediction_base.csv   <- the training data (verified real,
                                          see "Where This Data Came From")
        ↓
train_fertilizer_model.py             <- trains + saves fertilizer_model.pkl
        ↓
rating_bridge.py                      <- solves the unit-mismatch problem
        ↑                               (see below)
coordinate_lookup.py                  <- nearest-SHC-sample by lat/lon
        ↓
fertilizer_agent.py                   <- ties it all together, 2 entry points:
                                          recommend_from_coordinates(...)
                                          recommend_from_manual_npk(...)
```

---

## Where This Training Data Came From

`data/fertilizer_prediction_base.csv` is the well-known **99-row Kaggle
"Fertilizer Prediction" dataset** (`gdabhishek/fertilizer-prediction`),
pulled from a public Hugging Face mirror
(`kaifahmad/Fertilizer-Prediction`) since Kaggle itself requires login to
download. Columns: `Temparature, Humidity, Moisture, Soil Type, Crop Type,
Nitrogen, Potassium, Phosphorous, Fertilizer Name`.

**Be upfront about this dataset's real limitations in your demo:**

1. **It's small.** 99 rows, 5 soil types, 11 crops, 7 fertilizer classes.
2. **The labels are rule-generated, not empirically observed.** A 5-fold
   cross-validated Random Forest hits ~98% accuracy on this data — that's
   not a sign of a great model, it's a sign the `Fertilizer Name` label was
   almost certainly *derived* from Nitrogen/Phosphorous/Potassium via a
   fixed rule when the dataset was created (an academic paper analyzing
   this exact dataset independently found "phosphorous and nitrogen [are]
   the optimal combination... for the fertilizer prediction" — i.e. the
   label is basically a function of those two columns). **Present this as
   "we validated the pipeline architecture on a public reference dataset,"
   not "our model achieves 98% accuracy in the field."**
3. **N/P/K are on a synthetic 0-42 scale, not real lab kg/ha values.** This
   is exactly the problem `rating_bridge.py` exists to solve — see below.

If you have time before the deadline, look for a larger/more realistic
replacement (candidates found but not verified firsthand: Kaggle's
`miadul/fertilizer-recommendation-dataset` from Dec 2025, or the
`Crop_and_Fertilizer_Dataset_for_WesternMaharashtra` — both need a Kaggle
account to actually download and inspect). Swapping the CSV is a one-line
change in `train_fertilizer_model.py`'s `DATA_PATH`, as long as the new
file has comparable columns (rename to match, or edit `feature_cols`).

---

## The Unit-Mismatch Problem — And How `rating_bridge.py` Solves It

Real Soil Health Cards report N/P/K as lab measurements (kg/ha), often
alongside a **Low / Medium / High rating** — this rating is already part of
the SHC's own published methodology, and it's the `N_rating`/`P_rating`/
`K_rating` columns your `shc-local-scraper` project's `Cards_info` table
produces.

The 99-row training set's N/P/K are on a small synthetic scale (roughly
0-42) that has nothing to do with real kg/ha values. Feeding a real SHC
value like "N = 280 kg/ha" straight into a model trained on 0-42 would put
the input wildly outside the training distribution and produce meaningless
predictions.

**The fix:** never compare raw numbers across the two datasets. Compare
**rank** instead:

1. `rating_bridge.compute_tertile_bounds()` splits the training set's own
   N/P/K columns into Low/Medium/High thirds (in *its own* units).
2. Given a real SHC sample's rating (e.g. "Low N"), `rating_to_value()`
   samples an actual value from the training set's own matching tertile.
3. That training-scale value — not the real-world kg/ha number — is what
   gets fed to the classifier.

**⚠️ CRITICAL SEMANTIC FIX (found via grid validation, see below):** the
first version of this bridge mapped SHC's "Low N" rating to the training
set's *low* Nitrogen values. That's backwards. Empirically verified against
the base dataset: `Urea` rows have Nitrogen clustered at 35-42 — the *top*
of the observed range — and `DAP` rows have Phosphorous clustered
similarly high. That only makes sense if the training set's N/P/K columns
represent **nutrient needed / to be applied**, not nutrient already present
in the soil. So: SHC "Low" (soil deficient → field needs a *lot* applied)
must map to the training set's **high** tertile, and SHC "High" (soil
already sufficient → field needs *little* applied) maps to the **low**
tertile. `rating_bridge.py`'s `rating_to_value()` now does this inversion
explicitly, with the reasoning documented inline in the function itself —
if you ever touch that function again, read the docstring first.

**One more data quirk this module handles:** Potassium in the training set
is heavily zero-inflated (median K = 0 — roughly two-thirds of rows have K
exactly 0). A naive quantile split collapses "Low" and "Medium" into the
same bucket. `compute_tertile_bounds()` detects this and falls back to
splitting the non-zero remainder by its own median so Medium/High stay
meaningfully distinct from Low.

---

## Model Training, Validation & Deployment — Deep Dive

### What you're actually training

A `RandomForestClassifier` (200 trees, max depth 8, `class_weight='balanced'`)
doing 7-class classification. Full feature list and where each comes from
in your app:

| Feature | Source at inference time |
|---|---|
| Temperature | sensor/forecast, or defaults to dataset average (flagged in `_assumptions`) |
| Humidity | same |
| Moisture | farmer-entered or sensor |
| Soil Type (encoded) | SHC lookup or farmer pick, loose-matched to the 5 known classes |
| Crop Type (encoded) | farmer pick, must be one of the 11 known classes |
| Nitrogen / Phosphorous / Potassium | **bridged** from an SHC Low/Medium/High rating via `rating_bridge.py` — see above |

Random Forest was chosen over anything fancier because: tiny dataset, mixed
categorical/numeric features, no benefit from deep representation learning,
and `predict_proba` gives you a confidence score for the demo UI almost for
free.

### Two training-data options — both built, pick based on time left

**`train_fertilizer_model.py`** trains on whichever CSV you point it at.

- **Base (`data/fertilizer_prediction_base.csv`, 99 rows)** — the original
  Kaggle set. Fast, already validated, but only covers 15 of the 27
  possible N/P/K-tertile combinations and gave **40% low-confidence
  predictions** on the grid sanity check (see below).
- **Augmented (`data/fertilizer_prediction_augmented.csv`, 999 rows,
  generated by `build_augmented_dataset.py`)** — derives a majority-vote
  fertilizer rule per N/P/K-tertile cell *from the base dataset itself*
  (not invented agronomy), fills the 12 unobserved cells by borrowing the
  nearest populated cell, then resamples ~900 synthetic rows with realistic
  crop/soil/moisture/temperature/humidity variation layered on top. Result:
  **8% low-confidence predictions** (down from 40%) and a cleaner
  directional signal on the sanity check. **This is now the default**
  (`fertilizer_model.pkl`) — the original is kept as
  `fertilizer_model_base99.pkl` for comparison.

Honest caveat on the augmented version: because crop/soil/moisture were
randomized independently of the label during augmentation, feature
importance shifted to **91% N/P/K combined** (up from 77% on the base
model) — crop and soil type now barely move the prediction. Within this
7-fertilizer-name taxonomy, the model is essentially a nutrient-tertile
rule engine dressed as a classifier, not a rich crop-aware recommender.
Say this plainly if a judge asks why crop type doesn't change much.

To retrain on either:
```bash
python train_fertilizer_model.py                          # base, saves fertilizer_model.pkl
python build_augmented_dataset.py                          # regenerates the augmented CSV
python -c "from train_fertilizer_model import train; train(data_path='data/fertilizer_prediction_augmented.csv', model_path='fertilizer_model.pkl', label='rule-augmented')"
```

Every saved `.pkl` now embeds a `metadata` dict — training data path, a
short hash of that exact CSV, timestamp, CV/held-out accuracy, and class
distribution. If you're ever unsure which dataset a deployed model file
was actually trained on, load the pickle and check `metadata['training_data_hash']`
against `_file_hash()` on your candidate CSVs.

### Validation that actually matters: `validate_model_grid.py`

Cross-validation accuracy on 99-999 rows tells you almost nothing about
whether the *deployed* pipeline (bridge → classifier) behaves sensibly,
because real inference always arrives via the bridge, not as raw training
rows. `validate_model_grid.py` enumerates all 27 N/P/K-rating combinations
across a few crops/soils/moisture levels, runs each through the actual
`FertilizerAgent.recommend_from_manual_npk()` call path, and checks:

1. **Low-confidence rate** — how often `predict_proba`'s top class is
   below 0.4. This is what caught the augmented model's improvement (40%
   → 8%).
2. **Directional sanity** — does `Urea` (the N-only straight fertilizer)
   get recommended more often when N is the deficient nutrient than when K
   is? This is what caught the semantic inversion bug above — the first
   version scored **0% Urea share when N=Low**, which is a hard fail you
   can't see from accuracy metrics alone.

Run this after every retrain, before trusting the model in a demo:
```bash
python validate_model_grid.py --model fertilizer_model.pkl
```

### Deployment / integration

- **Load once at startup, not per-request.** `FertilizerAgent.__init__()`
  unpickles the model and loads the base CSV/tertile bounds a single time;
  reuse one `FertilizerAgent` instance across requests in your FastAPI/
  Streamlit app rather than constructing a new one per call.
- **Confidence thresholding in the UI.** `result['confidence']` is right
  there — if it's below ~0.4, show a "low confidence, verify manually"
  badge rather than presenting the prediction as authoritative. The grid
  check tells you this will happen for roughly 8% of realistic inputs even
  with the improved model.
- **Always check `result['success']`** before touching `result['fertilizer']`
  — a crop or soil type outside the model's known 11/5 categories returns
  `success: False` with the valid category lists attached, not a crash.
- **Retraining workflow going forward:** swap the CSV path in
  `train_fertilizer_model.py`'s `train()` call, rerun, then immediately
  rerun `validate_model_grid.py` before replacing the deployed `.pkl` —
  don't trust a new dataset just because CV accuracy looks fine.
- **If you find a larger/real dataset before the deadline** (see the
  "Known Limitation" list at the bottom — unverified Kaggle/IEEE leads are
  listed there): the whole pipeline is designed so that's a data swap, not
  a rewrite — same column names in, same `train()` call, same validation
  script.

---

## Setup

```bash
cd shc-fertilizer
python3 -m venv venv && source venv/bin/activate
pip install pandas numpy scikit-learn

python train_fertilizer_model.py      # trains + saves fertilizer_model.pkl
python rating_bridge.py               # self-test of the bridge logic
python fertilizer_agent.py            # end-to-end demo (manual entry path)
```

---

## Usage

### Path A — Farmer manually enters (or reads off a paper SHC) Low/Medium/High

```python
from fertilizer_agent import FertilizerAgent

agent = FertilizerAgent()  # no SHC CSV needed for this path

result = agent.recommend_from_manual_npk(
    n_rating='Low', p_rating='Medium', k_rating='High',
    moisture=45,          # % -- from a sensor or farmer estimate
    crop='Wheat',
    soil_type='Loamy',
)
print(result['fertilizer'], result['confidence'])
```

### Path B — Coordinates, real SHC data (needs your scraper's EXPORT output)

```bash
# From the shc-local-scraper project:
python local_main.py EXPORT --out shc_haryana.csv
# copy or symlink shc_haryana.csv into shc-fertilizer/data/
```

```python
from fertilizer_agent import FertilizerAgent

agent = FertilizerAgent(shc_csv_path='data/shc_haryana.csv')

result = agent.recommend_from_coordinates(
    lat=29.06, lon=76.09,
    moisture=40, crop='Wheat',
    max_distance_km=10,   # reject matches further than this
)

if result['success']:
    print(f"Recommended: {result['fertilizer']} ({result['confidence']:.0%} confidence)")
    print(f"Based on SHC sample {result['shc_source']['distance_km']}km away, "
          f"collected {result['shc_source']['sample_collection_date']}")
else:
    print(f"No nearby data: {result['error']}")
    # -> fall back to recommend_from_manual_npk() in your UI here
```

Every response includes an `_assumptions` list — surface this in your demo
UI (e.g. small "⚠ assumed" badges) rather than hiding it. It's a strong,
honest signal for judges that the system knows the difference between
measured and inferred inputs.

---

## V2: The Richer 10,000-Row Dataset (`fertilizer_recommendation_miadul.csv`)

A much stronger dataset became available mid-project and is now the
**recommended default** going forward. Full comparison:

| | v1 (base 99-row) | v1 (augmented 999-row) | **v2 (miadul, 10,000-row)** |
|---|---|---|---|
| Rows | 99 | 999 | **10,000** |
| Fertilizer classes | 7 (no straight-K option) | 7 | **7, including MOP (straight potash) and Zinc Sulphate (micronutrient)** |
| Crops | 11 | 11 | 7 (fewer, but all major real crops) |
| Uses pH? | No | No | **Yes — 2nd most important feature** |
| Uses Organic Carbon / EC? | No | No | **Yes** |
| N/P/K semantics | Need-based (inverted — required a bridge fix) | Same | **Status-based (direct, verified correct)** |
| CV accuracy | ~99% (suspiciously high — rule-derived labels) | ~98% | **88% (far more believable — real class overlap exists)** |
| Missing values / duplicates | — | — | **Zero of either** |

### What's actually in it

Columns: `Soil_Type, Soil_pH, Soil_Moisture, Organic_Carbon,
Electrical_Conductivity, Nitrogen_Level, Phosphorus_Level, Potassium_Level,
Temperature, Humidity, Rainfall, Crop_Type, Crop_Growth_Stage, Season,
Irrigation_Type, Previous_Crop, Region, Fertilizer_Used_Last_Season,
Yield_Last_Season, Recommended_Fertilizer`. Only a subset is used by the
current model (see `FEATURE_COLS` in `train_fertilizer_model_v2.py`) —
`Season`, `Irrigation_Type`, `Previous_Crop`, `Region`, and the two
last-season columns are available if you want to extend further, but
weren't needed to hit the validation results below.

### Verified: this dataset's N/P/K are STATUS-based, not need-based —
### so the v1 bridge's inversion logic does NOT apply here

Checked directly against the data (not assumed): Urea rows average
Nitrogen_Level 43.9, far *below* the overall mean of 89.0 — i.e. Urea (an
N-only fertilizer) is recommended when soil N is actually low, exactly
matching what an SHC "Low N" rating means. Same pattern confirmed for
DAP/Phosphorus and MOP/Potassium. **`rating_bridge_v2.py` therefore maps
SHC ratings directly (Low→low tertile), with no inversion** — copying
`rating_bridge.py`'s inversion logic here would silently reintroduce a bug.
The reasoning is documented at the top of `rating_bridge_v2.py` specifically
so this isn't accidentally "fixed" backwards later.

### New architectural simplification: pH/OC/EC don't need bridging at all

Unlike N/P/K (where SHC only reliably gives a Low/Medium/High label), SHC's
`Cards_info` table (from `shc-local-scraper`) already carries real numeric
`pH_value` / `OC_value` / `EC_value` in the *same physical units* this
dataset uses (pH on the standard 0-14 scale, OC in %, EC in dS/m). So
`fertilizer_agent_v2.py`'s `recommend_from_coordinates()` passes these
straight through from a real SHC row — no rank-matching trick needed, only
N/P/K still go through the bridge.

### Discovery during validation: `Crop_Growth_Stage` was a missing feature

First training pass (pH/OC/EC/N/P/K/temp/humidity/soil/crop only) hit 86%
accuracy overall but SSP recall was 3% and NPK precision was 32% — the two
classes were being confused constantly. Checked every unused categorical
column against just these two classes; `Crop_Growth_Stage` was a clean,
large discriminator (NPK: 71% Vegetative-stage; SSP: 0% Vegetative-stage,
split across Flowering/Harvest/Sowing instead) — and it's agronomically
sensible (SSP's sulfur/calcium content matters most around flowering and
post-harvest soil conditioning, not general vegetative growth). Adding it
brought NPK precision to 0.94. `fertilizer_agent_v2.py` requires
`growth_stage` as an input (defaults to `'Vegetative'` if omitted, flagged
in `_assumptions`).

### Known remaining weak point: SSP

Even after adding growth stage, **SSP precision is still only ~0.12**
(vs. 0.94-1.00 for every other class) — it has just 182/10,000 rows
(1.8%), and `class_weight='balanced'` makes the model over-eager to predict
it. `fertilizer_agent_v2.py` actively flags this: any prediction result
where `fertilizer == 'SSP'` or SSP's probability exceeds 15% in the
breakdown carries a `low_confidence_class_warning` string — surface that in
your demo UI rather than hiding it. This is exactly the kind of thing worth
naming proactively to judges rather than waiting to be asked.

### Validation results (`validate_model_grid_v2.py`)

Extends the v1 grid check with two new directional tests specific to this
dataset (does Compost dominate at acidic pH, does Zinc Sulphate dominate at
alkaline pH — matching the means directly observed in the data: Compost pH
5.32, Zinc Sulphate pH 7.75, overall mean 6.49). **All 4 directional checks
pass** (N-deficiency→Urea over K-deficiency→Urea; K-deficiency→MOP over
N-deficiency→MOP; acidic→Compost over alkaline→Compost; alkaline→Zinc
Sulphate over acidic→Zinc Sulphate), and low-confidence rate across 972
tested combinations is **5%** (even better than v1's improved 8%).

```bash
python train_fertilizer_model_v2.py        # trains fertilizer_model_v2.pkl
python validate_model_grid_v2.py            # run after every retrain
python fertilizer_agent_v2.py               # demo: two worked examples,
                                              # including the pH-driven case
```

### Which version should you actually use?

**Use v2** (`fertilizer_agent_v2.py` / `fertilizer_model_v2.pkl`) as your
primary path — it's better-validated, uses real pH/OC/EC your scraper
already collects, and has a far more realistic accuracy profile. Keep v1
around as a fallback narrative ("we started with a small reference dataset,
found and fixed a semantic bug in it, then upgraded to a 10,000-row dataset
and re-validated everything the same way") — that's a genuinely good story
for judges about your validation process, not just your final number.

---

## Known Limitations To State Proactively

- **Training data is small and its labels are rule-derived** (see above) —
  frame this as "pipeline validated end-to-end," not "field-accurate model."
- **The rating bridge is an approximation.** Two farmers both rated "Low N"
  get mapped to different sampled values within the same bucket — this
  preserves the model's expected input distribution but loses precision
  within a tertile. Fine for a hackathon demo; a production version would
  retrain directly on real SHC-scale data.
- **Crop/soil vocabulary is fixed to the training set's 11 crops / 5 soil
  types.** `fertilizer_agent.py` detects and reports out-of-vocabulary
  inputs rather than silently guessing — check `result['success']` and
  `result['known_crops']` / `result['known_soil_types']` in your UI.
- **Coordinate matching has a distance cutoff** (`max_distance_km`,
  default 10km) — deliberately conservative so you don't hand a farmer a
  reading from a genuinely different field/soil type. Widen it if your
  scraped pilot data is sparse, but disclose the tradeoff.
- **No pH, Organic Carbon, or micronutrients used yet**, even though your
  scraper already captures them (`Cards_info.pH_value`, `OC_value`, `S_value`,
  `Zn_value`, etc.) — the base training set doesn't have those columns to
  train against. If you find/build a richer training set with pH included,
  that's a meaningful upgrade (pH strongly affects nutrient availability
  and would let you flag lime/gypsum needs, not just NPK fertilizer).
