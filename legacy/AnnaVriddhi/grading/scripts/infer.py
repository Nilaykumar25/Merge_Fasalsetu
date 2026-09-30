"""
infer.py — Hybrid RGB Quality Grading inference entry point.

Orchestrates the full pipeline:
  1. Segment the produce item from the background       (features.py)
  2. Extract CV features (shape, HSV, GLCM)            (features.py)
  3. Run sklearn model → predict_proba visual signal   (per-crop .pkl)
  4. Run hybrid quality scorer                         (quality_score.py)
     Color/Ripeness 35% + Defect 25% + Shape 20%
     + Size 10% + Visual Quality Signal 10%
  5. Return the structured result dict

Public API (used by the Node.js backend via subprocess):
    from infer import grade_produce
    result = grade_produce("photo.jpg", crop="tomato")

CLI (for quick manual testing):
    python infer.py --image photo.jpg --crop tomato [--json]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import cv2
import joblib
import numpy as np
import pandas as pd

# Resolve sibling imports whether run as a script or imported as a module
_SCRIPTS_DIR = Path(__file__).resolve().parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from features import _largest_contour_mask, extract_features, FEATURE_NAMES
from quality_score import compute_quality_score


# ---------------------------------------------------------------------------
# Paths & caches
# ---------------------------------------------------------------------------
_REPO_ROOT   = _SCRIPTS_DIR.parent
MODELS_DIR   = _REPO_ROOT / "models_dedup"   # prefer deduplicated models
CONFIG_DIR   = _REPO_ROOT / "config"

# Fall back to original models/ if dedup models not present
_MODELS_DIR_FALLBACK = _REPO_ROOT / "models"

_model_cache     = {}
_threshold_cache = {}


def _load_model(crop: str):
    if crop not in _model_cache:
        for d in (MODELS_DIR, _MODELS_DIR_FALLBACK):
            p = d / f"{crop}_grader.pkl"
            if p.exists():
                _model_cache[crop] = joblib.load(p)
                break
        if crop not in _model_cache:
            raise FileNotFoundError(
                f"No trained model for crop '{crop}'. "
                f"Run train_classifier.py for this crop first."
            )
    return _model_cache[crop]


def _load_thresholds(crop: str) -> dict:
    if crop not in _threshold_cache:
        p = CONFIG_DIR / f"{crop}_thresholds.json"
        if not p.exists():
            raise FileNotFoundError(f"No threshold config for crop '{crop}' at {p}.")
        _threshold_cache[crop] = json.loads(p.read_text())
    return _threshold_cache[crop]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def grade_produce(image_path_or_array, crop: str) -> dict:
    """
    Full grading pipeline. Returns a dict matching the POST /grading/capture
    response shape in api-contract.md, extended with quality_score and subscores.

    Raises FileNotFoundError for unknown crop (no model / no config).
    The Node.js route handler should catch this and return HTTP 422.
    """
    crop = crop.lower().strip()
    thresholds = _load_thresholds(crop)

    # -- Load image --
    if isinstance(image_path_or_array, str):
        img = cv2.imread(image_path_or_array)
        if img is None:
            raise FileNotFoundError(f"Could not read image: {image_path_or_array}")
    else:
        img = image_path_or_array

    # -- Segmentation --
    mask, contour, bbox = _largest_contour_mask(img)
    if mask is None:
        return {
            "grade": None,
            "quality_score": 0,
            "confidence": 0.0,
            "signals": {},
            "subscores": {},
            "recommendation": None,
            "price_impact_note": None,
            "status": "no_object_detected",
            "message": (
                "Could not find the item against the background. "
                "Retake on a plain, contrasting background."
            ),
        }

    # -- Feature extraction (reuses already-computed mask) --
    features = extract_features(img)  # returns None on bad image
    if features is None:
        return {
            "grade": None,
            "quality_score": 0,
            "confidence": 0.0,
            "signals": {},
            "subscores": {},
            "recommendation": None,
            "price_impact_note": None,
            "status": "feature_extraction_failed",
            "message": "Feature extraction failed. Check image quality and lighting.",
        }

    # -- Visual quality signal from sklearn model --
    model_proba  = None
    model_classes = None
    try:
        model = _load_model(crop)
        fv = pd.DataFrame(
            [[features[n] for n in FEATURE_NAMES]], columns=FEATURE_NAMES
        )
        model_proba   = model.predict_proba(fv)[0]
        model_classes = list(model.classes_)
    except FileNotFoundError:
        # No model for this crop — degrade gracefully (model_signal will use default 50)
        pass
    except Exception:
        pass  # Any other model error — don't crash the whole pipeline

    # -- Hybrid quality score --
    result = compute_quality_score(
        img_bgr=img,
        mask=mask,
        features=features,
        thresholds=thresholds,
        model_proba=model_proba,
        model_classes=model_classes,
    )

    return result


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="AnnaVriddhi Hybrid RGB Quality Grader"
    )
    parser.add_argument("--image", required=True, help="Path to crop image")
    parser.add_argument("--crop",  required=True,
                        help="Crop name: tomato | banana | potato | onion")
    parser.add_argument("--json",  action="store_true",
                        help="Output full JSON (default: human-readable summary)")
    args = parser.parse_args()

    try:
        result = grade_produce(args.image, args.crop)
    except FileNotFoundError as e:
        print(json.dumps({"status": "error", "message": str(e)}))
        sys.exit(1)

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        # Pretty human-readable demo output
        crop_label = args.crop.capitalize()
        grade      = result.get("grade", "?")
        score      = result.get("quality_score", 0)
        subs       = result.get("subscores", {})
        sigs       = result.get("signals", {})
        status     = result.get("status", "")

        if status != "ok":
            print(f"\n⚠  {result.get('message', status)}\n")
            sys.exit(0)

        print(f"""
┌─────────────────────────────────────────────┐
│  {crop_label.upper()} QUALITY ASSESSMENT              │
├─────────────────────────────────────────────┤
│  Ripeness              {sigs.get('ripeness', '—'):>20s}  │
│  Color Uniformity      {sigs.get('color_uniformity', '—'):>20s}  │
│  Surface Quality       {sigs.get('surface_quality', '—'):>20s}  │
│  Shape Conformity      {sigs.get('shape_conformity', '—'):>20s}  │
│  Size                  {sigs.get('size', '—'):>20s}  │
│  Visual Quality Signal {sigs.get('visual_quality_signal', '—'):>20s}  │
├─────────────────────────────────────────────┤
│  QUALITY SCORE         {f'{score}/100':>20s}  │
│  FINAL GRADE           {f'  {grade}  ':>20s}  │
├─────────────────────────────────────────────┤
│  {result.get('price_impact_note', '')[:43]:43s}  │
└─────────────────────────────────────────────┘

  {result.get('recommendation', '')}
""")
