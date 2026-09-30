"""
infer.py — RGB-based produce quality grading
Usage: python infer.py --image <path> --crop <tomato|banana|potato|onion> --json

Returns a JSON object with:
  grade          : "A" | "B" | "C"
  quality_score  : 0-100
  subscores      : { color_ripeness, surface_defect, shape, freshness }
  status         : "success"
  notes          : human-readable summary
"""

import argparse
import json
import sys
import os
import math

import cv2
import numpy as np

# ── Per-crop grading configuration ────────────────────────────────────────────
CROP_CONFIG = {
    "tomato": {
        "ideal_hue_range": (0, 15),        # red hue in HSV (wraps 165-180 too)
        "ideal_sat_min": 120,
        "ideal_val_min": 100,
        "unripe_hue": (35, 85),            # green
        "overripe_hue": (0, 5),            # very dark red
        "size_weight": 0.20,
        "color_weight": 0.40,
        "surface_weight": 0.25,
        "freshness_weight": 0.15,
        "grade_thresholds": {"A": 78, "B": 58},
    },
    "banana": {
        "ideal_hue_range": (22, 38),       # yellow
        "ideal_sat_min": 100,
        "ideal_val_min": 120,
        "unripe_hue": (35, 75),            # green-yellow
        "overripe_hue": (10, 22),          # brown-orange
        "size_weight": 0.15,
        "color_weight": 0.45,
        "surface_weight": 0.25,
        "freshness_weight": 0.15,
        "grade_thresholds": {"A": 76, "B": 55},
    },
    "potato": {
        "ideal_hue_range": (15, 30),       # tan/beige
        "ideal_sat_min": 40,
        "ideal_val_min": 80,
        "unripe_hue": (30, 60),
        "overripe_hue": (0, 10),
        "size_weight": 0.30,
        "color_weight": 0.25,
        "surface_weight": 0.30,
        "freshness_weight": 0.15,
        "grade_thresholds": {"A": 75, "B": 55},
    },
    "onion": {
        "ideal_hue_range": (10, 25),       # yellow-brown
        "ideal_sat_min": 50,
        "ideal_val_min": 80,
        "unripe_hue": (30, 65),
        "overripe_hue": (0, 8),
        "size_weight": 0.25,
        "color_weight": 0.30,
        "surface_weight": 0.30,
        "freshness_weight": 0.15,
        "grade_thresholds": {"A": 74, "B": 54},
    },
}

# ── Helpers ────────────────────────────────────────────────────────────────────

def clamp(v, lo=0, hi=100):
    return max(lo, min(hi, v))


def load_image(path):
    img = cv2.imread(path)
    if img is None:
        raise ValueError(f"Cannot read image: {path}")
    # Resize to a standard analysis size while preserving aspect ratio
    h, w = img.shape[:2]
    scale = 512 / max(h, w)
    img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    return img


def get_foreground_mask(img):
    """
    Simple foreground segmentation using GrabCut or a center-crop heuristic.
    Falls back to center 60% crop if GrabCut fails.
    """
    try:
        mask = np.zeros(img.shape[:2], np.uint8)
        h, w = img.shape[:2]
        rect = (int(w * 0.1), int(h * 0.1), int(w * 0.8), int(h * 0.8))
        bgd = np.zeros((1, 65), np.float64)
        fgd = np.zeros((1, 65), np.float64)
        cv2.grabCut(img, mask, rect, bgd, fgd, 5, cv2.GC_INIT_WITH_RECT)
        fg_mask = np.where((mask == 2) | (mask == 0), 0, 1).astype(np.uint8)
        if fg_mask.sum() < 100:
            raise ValueError("GrabCut gave empty mask")
        return fg_mask
    except Exception:
        # Fallback: use center 60% of image
        h, w = img.shape[:2]
        mask = np.zeros((h, w), np.uint8)
        y0, y1 = int(h * 0.2), int(h * 0.8)
        x0, x1 = int(w * 0.2), int(w * 0.8)
        mask[y0:y1, x0:x1] = 1
        return mask


def score_color_ripeness(hsv, mask, cfg):
    """
    Score how close the dominant hue is to the crop's ideal ripe range.
    Returns 0-100.
    """
    fg_hue = hsv[:, :, 0][mask == 1].astype(float)
    if len(fg_hue) == 0:
        return 50.0

    lo, hi = cfg["ideal_hue_range"]

    # Handle red hue wraparound for tomatoes
    if lo <= 15:
        in_range = np.sum((fg_hue <= hi) | (fg_hue >= 165))
    else:
        in_range = np.sum((fg_hue >= lo) & (fg_hue <= hi))

    pct = in_range / len(fg_hue)

    # Saturation contribution
    fg_sat = hsv[:, :, 1][mask == 1].astype(float)
    sat_score = clamp(np.mean(fg_sat) / cfg["ideal_sat_min"] * 100)

    score = clamp(pct * 80 + sat_score * 0.2)
    return round(score, 1)


def score_surface_defect(img_bgr, mask):
    """
    Detect surface blemishes via edge density and local variance.
    Lower edge density on the foreground = better surface quality.
    Returns 0-100 (higher = better surface).
    """
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 40, 120)
    fg_edges = edges[mask == 1]
    if len(fg_edges) == 0:
        return 70.0

    edge_density = np.mean(fg_edges > 0)
    # Low edge density = smooth surface = high score
    # 0% edges → 100, 40%+ edges → 0
    score = clamp(100 - edge_density * 250)

    # Variance of pixel values (high variance = uneven colouring / spots)
    fg_gray = gray[mask == 1].astype(float)
    variance = np.std(fg_gray)
    var_penalty = clamp(variance / 2)
    score = clamp(score - var_penalty * 0.3)
    return round(score, 1)


def score_shape(img_bgr, mask):
    """
    Compactness / roundness of the produce silhouette.
    Circular/regular shapes score higher.
    Returns 0-100.
    """
    contours, _ = cv2.findContours(
        mask.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )
    if not contours:
        return 65.0

    c = max(contours, key=cv2.contourArea)
    area = cv2.contourArea(c)
    perimeter = cv2.arcLength(c, True)

    if perimeter == 0 or area == 0:
        return 65.0

    # Circularity: 4π·Area / Perimeter²  (1.0 = perfect circle)
    circularity = (4 * math.pi * area) / (perimeter ** 2)
    score = clamp(circularity * 100 * 1.1)  # slight boost
    return round(score, 1)


def score_freshness(hsv, mask):
    """
    Estimate freshness from value (brightness) and saturation uniformity.
    Dull, low-value produce tends to be older.
    Returns 0-100.
    """
    fg_val = hsv[:, :, 2][mask == 1].astype(float)
    fg_sat = hsv[:, :, 1][mask == 1].astype(float)
    if len(fg_val) == 0:
        return 60.0

    val_score = clamp(np.mean(fg_val) / 255 * 120)
    sat_uniformity = clamp(100 - np.std(fg_sat) * 0.5)
    score = clamp(val_score * 0.6 + sat_uniformity * 0.4)
    return round(score, 1)


def grade_produce(image_path, crop):
    crop = crop.lower().strip()
    if crop not in CROP_CONFIG:
        raise ValueError(f"Unsupported crop '{crop}'. Supported: {list(CROP_CONFIG.keys())}")

    cfg = CROP_CONFIG[crop]
    img = load_image(image_path)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    mask = get_foreground_mask(img)

    color_score   = score_color_ripeness(hsv, mask, cfg)
    surface_score = score_surface_defect(img, mask)
    shape_score   = score_shape(img, mask)
    freshness_score = score_freshness(hsv, mask)

    # Weighted composite
    quality_score = (
        color_score   * cfg["color_weight"] +
        surface_score * cfg["surface_weight"] +
        shape_score   * cfg["size_weight"] +
        freshness_score * cfg["freshness_weight"]
    )
    quality_score = round(clamp(quality_score), 1)

    # Assign grade
    t = cfg["grade_thresholds"]
    if quality_score >= t["A"]:
        grade = "A"
    elif quality_score >= t["B"]:
        grade = "B"
    else:
        grade = "C"

    # Human-readable notes
    issues = []
    if color_score < 55:
        issues.append("uneven colouring/ripeness")
    if surface_score < 55:
        issues.append("surface blemishes detected")
    if shape_score < 50:
        issues.append("irregular shape")
    if freshness_score < 50:
        issues.append("possible freshness concerns")

    if not issues:
        notes = f"Grade {grade} — good quality across all parameters."
    else:
        notes = f"Grade {grade} — issues found: {', '.join(issues)}."

    return {
        "status": "success",
        "grade": grade,
        "quality_score": quality_score,
        "subscores": {
            "color_ripeness": color_score,
            "surface_defect": surface_score,
            "shape": shape_score,
            "freshness": freshness_score,
        },
        "notes": notes,
        "crop": crop,
    }


# ── CLI entry point ────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Produce quality grader")
    parser.add_argument("--image",  required=True, help="Path to image file")
    parser.add_argument("--crop",   required=True, help="Crop type (tomato|banana|potato|onion)")
    parser.add_argument("--json",   action="store_true", help="Output JSON")
    args = parser.parse_args()

    if not os.path.exists(args.image):
        result = {"status": "error", "message": f"Image not found: {args.image}"}
        print(json.dumps(result))
        sys.exit(1)

    try:
        result = grade_produce(args.image, args.crop)
        print(json.dumps(result))
    except Exception as e:
        result = {"status": "error", "message": str(e)}
        print(json.dumps(result))
        sys.exit(1)


if __name__ == "__main__":
    main()
