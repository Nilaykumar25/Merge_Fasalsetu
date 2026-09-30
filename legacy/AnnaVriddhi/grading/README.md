# Produce Grading Module

CV-based external quality grading (shape, color, surface texture) with a
confidence score, giving the farmer an independent grade estimate before
selling. Built on standard computer vision + a lightweight classifier —
not a hyperspectral substitute; scoped explicitly to what RGB imaging can
reliably assess.

Validated end-to-end (folder structure, feature extraction, training,
inference, and the API contract response shape) using synthetic test images
during build. **The `data/`, `data_processed/`, `features/`, and `models/`
folders are intentionally empty (`.gitkeep` only) — real photos and trained
models are not included.** Run the pipeline below with real data before the
demo.

## Crops in scope

`tomato`, `potato`, `banana`, `onion`  (brinjal deferred — no dataset coverage).
See `config/crops.json` for the active allowlist.
Adding a 6th crop later: add data, add a `config/{crop}_thresholds.json`,
rerun the pipeline. No code changes needed.

## Datasets used

Two public datasets feed `fetch_dataset.py`, run once each (results accumulate
into the same `data/{crop}/{grade}/` folders):

- **`fruits360`** — used for tomato, onion, potato (variety/rotation-style
  dataset; watch for near-duplicate turntable frames inflating sample counts).
      Note: Fruits-360 generally lacks a true damage/defect axis for many
      vegetables. In practice treat grade C as "self-capture only" for
      `onion` and `potato` (and for `tomato` unless you find explicit
      defect-class folders during inspection). Don't rely on Fruits-360
      to supply C-class examples for these crops.
- **`freshrotten`** — "Fruits fresh and rotten for classification" (Kaggle) —
  used for banana. Real fresh/rotten quality variation, a better match for
  grade A and C than Fruits-360's rotation frames. It has **no mid-grade
  class**, so banana's grade B is entirely self-captured via `capture_label.html`.
- **brinjal** has weak coverage in both — plan to self-capture the majority
  of this crop's data.

## Flagged crops / class gaps

- **Tomato**: A/B present from Fruits-360; C (damage) is not present — C needs self-capture.
- **Potato**: A/B present from Fruits-360; C needs self-capture.
- **Banana**: Fresh-Rotten provides A and C; B is not present and requires self-capture.
- **Onion**: Only A present in Fruits-360 — not demo-ready; skip for live demo until B/C are collected.
- **Brinjal**: Deferred — no dataset coverage in the public mirrors; plan to self-capture if added later.

Note on class imbalance: a skewed A:B ratio (e.g., tomato ~82:18) or a
missing B/C will bias classifiers. `train_classifier.py` uses
`class_weight="balanced"`, but this cannot replace genuine missing
examples — add self-captured images to fix the issue.

```
python fetch_dataset.py --dataset fruits360   --source /path/to/fruits-360/Training --out ../data
python fetch_dataset.py --dataset freshrotten --source /path/to/fresh-rotten/train    --out ../data
```

## Pipeline order

```
1. fetch_dataset.py     Pull + filter public dataset(s) into data/{crop}/{grade}/.
                         Run once per dataset (see "Datasets used" above) — edit
                         DATASET_CLASS_MAPS inside the script to match real class
                         folder names once you've downloaded and inspected them.

2. capture_label.html   Open in a browser on any phone/laptop with a camera.
                         Standardizes capture (plain background guide) and
                         labels each photo (A/B/C) at capture time — saves
                         directly with the right filename convention. Drop
                         downloaded files into data/{crop}/{grade}/.

3. preprocess.py        Normalizes everything in data/ (resize, auto-crop to
                         object, lighting equalization) into data_processed/.
                         Run this after every new batch of images.

4. build_dataset.py     Stratified 70/30 train/test split + runs the CV
                         feature extraction pipeline on every image. Writes
                         features/{crop}_train.csv and _test.csv.

5. train_classifier.py  Trains a RandomForest per crop on the extracted
                         features, evaluates on the held-out test set, saves
                         models/{crop}_grader.pkl and {crop}_report.json.
                         >>> Read the report before the demo. Don't claim an
                         accuracy number you haven't checked.

6. infer.py              The production inference path — what the backend's
                          POST /grading/capture route calls. Takes an image +
                          crop, returns grade/confidence/signals/price note
                          in the exact api-contract.md response shape.
```

Run all of 1–5 once per crop (or all crops at once, most scripts accept
`--crop <name>` or default to "all crops found"). Step 6 is what runs live
in the app.

## Calibration checklist before the live demo (Phase 6)

- [ ] Re-test grading under the actual venue lighting, not just wherever
      photos were captured.
- [ ] Adjust `config/{crop}_thresholds.json` if signals (`size`/`color`/
      `surface`) look wrong under demo conditions — these are starter
      values, not tuned ones.
- [ ] Pre-stage 2–3 known-good items per demoed crop (one clear A, one
      clear B/C) so the live demo isn't a gamble on a random pick.
- [ ] Confirm the low-confidence path (`status: "low_confidence"` /
      `"no_object_detected"`) triggers correctly and the frontend shows the
      "retake photo" state — this is the safety net if a live capture goes
      wrong on stage.

## Integration point

`infer.grade_produce(image, crop)` returns exactly the JSON shape defined
in `docs/api-contract.md` §5 (`POST /grading/capture`). The backend route
handler should call this directly, catch `FileNotFoundError` (crop has no
trained model yet) and map it to a clean 4xx rather than a 500.

## Honest framing for judges

"CV-based external quality grading (shape, color, surface texture) with a
confidence score, giving the farmer an independent grade estimate before
selling — reducing information asymmetry with traders. Not a hyperspectral
substitute; scoped explicitly to what RGB imaging can reliably assess."
