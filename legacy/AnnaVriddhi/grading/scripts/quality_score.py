"""
quality_score.py — Hybrid RGB Quality Grading

Implements the weighted scoring pipeline described in the AnnaVriddhi
hackathon design:

                     CROP IMAGE
                         ↓
                  Crop segmentation  (reuses features.py)
                         ↓
        ┌────────────────┼────────────────┐
        ↓                ↓                ↓
     COLOR/RIPENESS   DEFECT          SHAPE / SIZE
     35%              25%             20% / 10%
        │                │                │
        └────────────────┼────────────────┘
                         ↓
            + Visual Quality Signal (sklearn model, 10%)
                         ↓
                  QUALITY SCORE 0-100
                         ↓
                   A (80-100) / B (60-79) / C (<60)

Public API
----------
    from quality_score import compute_quality_score
    result = compute_quality_score(img_bgr, features, thresholds, model_proba_A)

All subscores are returned so the UI can display them individually.
"""

from __future__ import annotations

import numpy as np
import cv2
from typing import Dict, Any, Optional


# ---------------------------------------------------------------------------
# Grade thresholds
# ---------------------------------------------------------------------------
GRADE_A_MIN = 80
GRADE_B_MIN = 60

# Default weights — can be overridden per-crop via config["rgb_grading"]["weights"]
DEFAULT_WEIGHTS = {
    "color_ripeness": 0.35,
    "defect":         0.25,
    "shape":          0.20,
    "size":           0.10,
    "model_signal":   0.10,
}


# ---------------------------------------------------------------------------
# 1. Color / Ripeness score  (0-100)
# ---------------------------------------------------------------------------

def _hue_pixel_fraction(hue_channel: np.ndarray, mask: np.ndarray, ranges: list[list[int]]) -> float:
    """Return the fraction of masked pixels whose hue falls in any of `ranges`."""
    if mask.sum() == 0:
        return 0.0
    combined = np.zeros_like(hue_channel, dtype=bool)
    for lo, hi in ranges:
        combined |= ((hue_channel >= lo) & (hue_channel <= hi))
    return float((combined & (mask > 0)).sum()) / float((mask > 0).sum())


def color_ripeness_score(
    img_bgr: np.ndarray,
    mask: np.ndarray,
    ripeness_cfg: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Computes a 0-100 color/ripeness score from:
      - fraction of pixels in the 'ripe' hue range          (+)
      - fraction of pixels in the 'unripe' hue range        (-)
      - saturation and value adequacy of the ripe pixels     (+)
      - colour uniformity (inverse of hue std-dev)           (+)

    Returns a dict with `score` (float) and diagnostic sub-fields.
    """
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    h, s, v = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]

    ripe_ranges   = ripeness_cfg.get("ripe_hue_ranges",   [])
    unripe_ranges = ripeness_cfg.get("unripe_hue_ranges", [])
    ripe_sat_min  = ripeness_cfg.get("ripe_sat_min", 60)
    ripe_val_min  = ripeness_cfg.get("ripe_val_min", 60)

    ripe_frac   = _hue_pixel_fraction(h, mask, ripe_ranges)   if ripe_ranges   else 0.5
    unripe_frac = _hue_pixel_fraction(h, mask, unripe_ranges) if unripe_ranges else 0.0

    # Colour uniformity — low hue std = uniform = better (cap at 40 degrees std)
    masked_hues = h[mask > 0].astype(float)
    hue_std = float(masked_hues.std()) if masked_hues.size > 0 else 40.0
    uniformity = max(0.0, 1.0 - hue_std / 40.0)

    # Saturation/Value adequacy among ALL masked pixels
    sat_vals = s[mask > 0].astype(float)
    val_vals = v[mask > 0].astype(float)
    sat_ok = float((sat_vals >= ripe_sat_min).mean()) if sat_vals.size > 0 else 0.5
    val_ok = float((val_vals >= ripe_val_min).mean()) if val_vals.size > 0 else 0.5

    # Weighted combination
    # ripe_frac: up to 50 pts; unripe penalty: up to -20; uniformity: 20 pts; sat/val: 10 pts
    raw = (
        ripe_frac   * 50.0
        - unripe_frac * 20.0
        + uniformity * 20.0
        + ((sat_ok + val_ok) / 2.0) * 10.0
    )
    score = float(np.clip(raw, 0, 100))

    # Ripeness % for display: based on ripe fraction vs unripe, normalised to 0-100
    ripeness_pct = round(ripe_frac * 100, 1)
    uniformity_pct = round(uniformity * 100, 1)

    return {
        "score": round(score, 1),
        "ripeness_pct": ripeness_pct,
        "color_uniformity_pct": uniformity_pct,
        "ripe_pixel_fraction": round(ripe_frac, 3),
        "unripe_pixel_fraction": round(unripe_frac, 3),
    }


# ---------------------------------------------------------------------------
# 2. Surface defect score  (0-100, higher = fewer defects)
# ---------------------------------------------------------------------------

def defect_score(
    img_bgr: np.ndarray,
    mask: np.ndarray,
    defect_cfg: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Detects dark/discoloured regions using:
      1. HSV value channel thresholding (dark spots)
      2. LAB colour-space deviation from median (discolouration)
      3. Contour-based counting of discrete blemish regions

    Returns `score` (0-100) and diagnostic fields.
    """
    dark_val_thresh = defect_cfg.get("dark_val_threshold", 40)
    dark_sat_thresh = defect_cfg.get("dark_sat_threshold", 25)
    max_A = defect_cfg.get("max_defect_pct_A", 3.0)
    max_B = defect_cfg.get("max_defect_pct_B", 10.0)

    total_pixels = int((mask > 0).sum())
    if total_pixels == 0:
        return {"score": 50.0, "defect_area_pct": 0.0, "defect_severity": "unknown",
                "blemish_count": 0}

    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    v_ch = hsv[:, :, 2]
    s_ch = hsv[:, :, 1]

    # Dark-spot mask: very low value (dark) AND low saturation (not just shadow)
    dark_mask = (
        (v_ch < dark_val_thresh) &
        (s_ch < dark_sat_thresh) &
        (mask > 0)
    ).astype(np.uint8) * 255

    # LAB deviation: pixels far from median L* of the object
    lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    l_ch = lab[:, :, 0].astype(float)
    obj_l = l_ch[mask > 0]
    median_l = float(np.median(obj_l))
    # Pixels deviating more than 35 L* units from median are anomalous
    discolor_mask = (
        (np.abs(l_ch - median_l) > 35) &
        (mask > 0)
    ).astype(np.uint8) * 255

    combined_defect = cv2.bitwise_or(dark_mask, discolor_mask)

    # Morphological cleanup — remove tiny noise < 0.1% of object area
    min_blob = max(4, int(total_pixels * 0.001))
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    cleaned = cv2.morphologyEx(combined_defect, cv2.MORPH_OPEN, kernel)

    defect_pixels = int((cleaned > 0).sum())
    defect_pct = (defect_pixels / total_pixels) * 100.0

    # Count discrete blemish contours
    contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    significant_contours = [c for c in contours if cv2.contourArea(c) >= min_blob]
    blemish_count = len(significant_contours)

    # Score: 100 when 0% defect, scales down linearly; extra penalty for many blemishes
    base_score = max(0.0, 100.0 - (defect_pct / max_B) * 60.0 - blemish_count * 3.0)
    score = float(np.clip(base_score, 0, 100))

    if defect_pct <= max_A:
        severity = "none" if defect_pct < 1.0 else "low"
    elif defect_pct <= max_B:
        severity = "moderate"
    else:
        severity = "high"

    return {
        "score": round(score, 1),
        "defect_area_pct": round(defect_pct, 2),
        "defect_severity": severity,
        "blemish_count": blemish_count,
    }


# ---------------------------------------------------------------------------
# 3. Shape score  (0-100)
# ---------------------------------------------------------------------------

def shape_score(
    features: Dict[str, float],
    shape_cfg: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Compares measured contour metrics to per-crop ideal values.
    Uses features already extracted by features.py (no extra OpenCV call needed).

    Components:
      - Circularity vs ideal_circularity
      - Aspect ratio vs ideal_aspect_ratio
      - Solidity vs ideal_solidity
    """
    circ     = features.get("circularity", 0.0)
    ar       = features.get("aspect_ratio", 1.0)
    solidity = features.get("solidity", 0.0)

    ideal_circ = shape_cfg.get("ideal_circularity", 0.75)
    ideal_ar   = shape_cfg.get("ideal_aspect_ratio", 1.0)
    ar_tol     = shape_cfg.get("aspect_tolerance", 0.35)
    ideal_sol  = shape_cfg.get("ideal_solidity", 0.92)

    # Circularity: gaussian-like penalty for deviation from ideal (max range ~1.0)
    circ_dev = abs(circ - ideal_circ)
    circ_score = max(0.0, 100.0 - (circ_dev / 0.4) * 100.0)

    # Aspect ratio: linear penalty outside tolerance band
    ar_dev = max(0.0, abs(ar - ideal_ar) - ar_tol)
    ar_score = max(0.0, 100.0 - (ar_dev / ideal_ar) * 120.0)

    # Solidity: how convex the silhouette is (depressions = damage)
    sol_dev = max(0.0, ideal_sol - solidity)
    sol_score = max(0.0, 100.0 - (sol_dev / 0.15) * 60.0)

    # Weighted: circularity 40%, aspect ratio 30%, solidity 30%
    combined = 0.40 * circ_score + 0.30 * ar_score + 0.30 * sol_score
    score = float(np.clip(combined, 0, 100))

    conformity_pct = round(score, 1)

    return {
        "score": conformity_pct,
        "shape_conformity_pct": conformity_pct,
        "circularity": round(circ, 3),
        "aspect_ratio": round(ar, 3),
        "solidity": round(solidity, 3),
    }


# ---------------------------------------------------------------------------
# 4. Size score  (0-100)
# ---------------------------------------------------------------------------

def size_score(
    features: Dict[str, float],
    img_bgr: np.ndarray,
    size_cfg: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Estimates relative size as fraction of image area occupied by the object.
    Does NOT claim physical dimensions — we have no calibration reference.

    Large → 100, Medium → 70, Small → 40
    """
    img_area = float(img_bgr.shape[0] * img_bgr.shape[1])
    obj_area = features.get("area", 0.0)
    area_pct = (obj_area / img_area) * 100.0 if img_area > 0 else 0.0

    large_min  = size_cfg.get("large_area_min_pct",  8.0)
    medium_min = size_cfg.get("medium_area_min_pct", 3.0)

    if area_pct >= large_min:
        grade_label = "Large"
        base = 100.0
    elif area_pct >= medium_min:
        grade_label = "Medium"
        # Interpolate from 70 to 100 within the medium band
        frac = (area_pct - medium_min) / max(large_min - medium_min, 1.0)
        base = 70.0 + frac * 30.0
    else:
        grade_label = "Small"
        frac = area_pct / max(medium_min, 1.0)
        base = frac * 70.0

    score = float(np.clip(base, 0, 100))
    size_grade = "A" if score >= 85 else ("B" if score >= 60 else "C")

    return {
        "score": round(score, 1),
        "size_label": grade_label,
        "size_grade": size_grade,
        "object_area_pct": round(area_pct, 2),
    }


# ---------------------------------------------------------------------------
# 5. Visual Quality Signal from existing model  (0-100)
# ---------------------------------------------------------------------------

def model_signal_score(model_proba: Optional[np.ndarray], classes: Optional[list]) -> Dict[str, Any]:
    """
    Converts the existing sklearn model's predict_proba output into a
    0-100 quality signal.

    Mapping: P(A) * 100  +  P(B) * 60  +  P(C) * 20
    This gives a continuous signal that respects grade ordering.
    No grade decision is made here — this is ONE input to the final scorer.
    """
    if model_proba is None or classes is None:
        return {"score": 50.0, "note": "model unavailable — using default signal"}

    grade_weights = {"A": 100.0, "B": 60.0, "C": 20.0}
    signal = 0.0
    for prob, cls in zip(model_proba, classes):
        signal += prob * grade_weights.get(str(cls).upper(), 50.0)

    return {
        "score": round(float(np.clip(signal, 0, 100)), 1),
        "predicted_class": str(classes[int(np.argmax(model_proba))]),
        "confidence": round(float(np.max(model_proba)), 3),
        "note": "Visual quality signal from learned image features (proxy label).",
    }


# ---------------------------------------------------------------------------
# Master scorer
# ---------------------------------------------------------------------------

def compute_quality_score(
    img_bgr: np.ndarray,
    mask: np.ndarray,
    features: Dict[str, float],
    thresholds: Dict[str, Any],
    model_proba: Optional[np.ndarray] = None,
    model_classes: Optional[list] = None,
) -> Dict[str, Any]:
    """
    Runs all five scoring components and returns a single quality result dict.

    Parameters
    ----------
    img_bgr        : BGR image (numpy array, as returned by cv2.imread)
    mask           : binary object mask from _largest_contour_mask in features.py
    features       : feature dict from extract_features() in features.py
    thresholds     : loaded {crop}_thresholds.json dict
    model_proba    : predict_proba output row from sklearn model (optional)
    model_classes  : model.classes_ list (optional)

    Returns
    -------
    Full result dict including subscores, final score, grade, and recommendation.
    """
    rgb_cfg = thresholds.get("rgb_grading", {})
    weights = {**DEFAULT_WEIGHTS, **rgb_cfg.get("weights", {})}

    # -- Run each component --
    cr  = color_ripeness_score(img_bgr, mask, rgb_cfg.get("ripeness", {}))
    def_= defect_score(img_bgr, mask, rgb_cfg.get("defect", {}))
    sh  = shape_score(features, rgb_cfg.get("shape", {}))
    sz  = size_score(features, img_bgr, rgb_cfg.get("size", {}))
    ms  = model_signal_score(model_proba, model_classes)

    # -- Weighted final score --
    final_score = (
        weights["color_ripeness"] * cr["score"]
        + weights["defect"]       * def_["score"]
        + weights["shape"]        * sh["score"]
        + weights["size"]         * sz["score"]
        + weights["model_signal"] * ms["score"]
    )
    final_score = round(float(np.clip(final_score, 0, 100)), 1)

    # -- Grade --
    if final_score >= GRADE_A_MIN:
        grade = "A"
    elif final_score >= GRADE_B_MIN:
        grade = "B"
    else:
        grade = "C"

    # -- Recommendation text --
    price_impact_pct = thresholds.get("price_impact_pct", {}).get(grade, 0)
    crop_name = thresholds.get("crop", "produce").capitalize()

    if grade == "A":
        recommendation = f"Premium quality {crop_name}. Suitable for direct market / export."
        price_note = f"Grade A — top grade, no price discount at mandi."
    elif grade == "B":
        pct = abs(price_impact_pct)
        recommendation = (
            f"Good quality {crop_name} with minor imperfections. "
            f"Suitable for local market. Address highlighted defects before next harvest."
        )
        price_note = f"Grade B typically sells ~{pct}% below top grade at mandi."
    else:
        pct = abs(price_impact_pct)
        recommendation = (
            f"{crop_name} shows significant quality issues. "
            f"Consider local/processing market. Review irrigation, nutrition, and harvest timing."
        )
        price_note = f"Grade C typically sells ~{pct}% below top grade at mandi."

    # -- Assemble display-ready signals for the frontend --
    signals = {
        "ripeness":           f"{cr['ripeness_pct']}%",
        "color_uniformity":   f"{cr['color_uniformity_pct']}%",
        "surface_quality":    f"{def_['score']}% ({def_['defect_severity']} defects, {def_['blemish_count']} blemish{'es' if def_['blemish_count'] != 1 else ''})",
        "shape_conformity":   f"{sh['shape_conformity_pct']}%",
        "size":               sz["size_label"],
        "size_grade":         sz["size_grade"],
        "visual_quality_signal": f"{ms['score']}%",
    }

    return {
        # Top-level result (matches existing infer.py response contract)
        "grade":             grade,
        "quality_score":     final_score,
        "confidence":        ms.get("confidence", 0.5),
        "recommendation":    recommendation,
        "price_impact_note": price_note,
        "status":            "ok",

        # Per-component subscores for UI display
        "subscores": {
            "color_ripeness":    cr["score"],
            "surface_defect":    def_["score"],
            "shape":             sh["score"],
            "size":              sz["score"],
            "visual_quality_signal": ms["score"],
        },
        "weights": weights,

        # Human-readable signal labels
        "signals": signals,

        # Raw diagnostic data (for debugging / future calibration)
        "_detail": {
            "color_ripeness": cr,
            "defect":         def_,
            "shape":          sh,
            "size":           sz,
            "model_signal":   ms,
        },
    }
