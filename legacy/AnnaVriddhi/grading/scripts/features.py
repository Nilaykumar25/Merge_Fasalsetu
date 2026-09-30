"""
Crop-agnostic feature extraction for produce grading.

This module is shared across ALL crops. Nothing crop-specific lives here —
crop-specific logic (thresholds, labels) lives in config/{crop}_thresholds.json
and is applied downstream in infer.py.

extract_features(image_path) -> dict of numeric features
extract_signal_labels(features, thresholds) -> dict of plain-language labels
    ("good" / "fair" / "poor") for the UI's `signals` field
"""

import cv2
import numpy as np
from skimage.feature import graycomatrix, graycoprops


FEATURE_NAMES = [
    "area", "perimeter", "aspect_ratio", "circularity", "solidity",
    "hue_mean", "hue_std", "sat_mean", "sat_std", "val_mean", "val_std",
    "laplacian_var", "glcm_contrast", "glcm_homogeneity", "glcm_energy",
]


def _largest_contour_mask(bgr_img):
    """Segment the produce item from a plain background using Otsu threshold
    + largest-contour selection. Returns (mask, contour, bbox) or (None, None, None)
    if no clear foreground object was found."""
    gray = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # If the background is lighter than the foreground this works directly;
    # if inverted, Otsu will pick the wrong side — guard by checking which
    # threshold yields a more "object-like" (smaller, centered) blob.
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        thresh = cv2.bitwise_not(thresh)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return None, None, None

    contour = max(contours, key=cv2.contourArea)
    if cv2.contourArea(contour) < 0.01 * gray.shape[0] * gray.shape[1]:
        return None, None, None  # too small to be the real object — likely noise

    mask = np.zeros(gray.shape, dtype=np.uint8)
    cv2.drawContours(mask, [contour], -1, 255, thickness=cv2.FILLED)
    bbox = cv2.boundingRect(contour)
    return mask, contour, bbox


def extract_features(image_path_or_array):
    """Runs the full CV pipeline on one image and returns a flat feature dict.
    Accepts a file path (str) or an already-loaded BGR numpy array.
    Returns None if no produce item could be segmented from the background."""
    if isinstance(image_path_or_array, str):
        img = cv2.imread(image_path_or_array)
        if img is None:
            raise FileNotFoundError(f"Could not read image: {image_path_or_array}")
    else:
        img = image_path_or_array

    mask, contour, bbox = _largest_contour_mask(img)
    if mask is None:
        return None

    x, y, w, h = bbox
    crop = img[y:y + h, x:x + w]
    crop_mask = mask[y:y + h, x:x + w]

    # --- Shape features ---
    area = cv2.contourArea(contour)
    perimeter = cv2.arcLength(contour, True)
    aspect_ratio = w / h if h > 0 else 0
    circularity = (4 * np.pi * area / (perimeter ** 2)) if perimeter > 0 else 0
    hull = cv2.convexHull(contour)
    hull_area = cv2.contourArea(hull)
    solidity = area / hull_area if hull_area > 0 else 0

    # --- Color features (HSV, masked to the object only) ---
    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    obj_pixels = hsv[crop_mask > 0]
    if obj_pixels.size == 0:
        return None
    hue_mean, sat_mean, val_mean = obj_pixels.mean(axis=0)
    hue_std, sat_std, val_std = obj_pixels.std(axis=0)

    # --- Texture / surface features ---
    gray_crop = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    laplacian_var = cv2.Laplacian(gray_crop, cv2.CV_64F).var()

    # GLCM needs a quantized, masked grayscale patch
    masked_gray = np.where(crop_mask > 0, gray_crop, 0).astype(np.uint8)
    glcm = graycomatrix(masked_gray, distances=[1], angles=[0], levels=256,
                         symmetric=True, normed=True)
    glcm_contrast = graycoprops(glcm, "contrast")[0, 0]
    glcm_homogeneity = graycoprops(glcm, "homogeneity")[0, 0]
    glcm_energy = graycoprops(glcm, "energy")[0, 0]

    return {
        "area": float(area),
        "perimeter": float(perimeter),
        "aspect_ratio": float(aspect_ratio),
        "circularity": float(circularity),
        "solidity": float(solidity),
        "hue_mean": float(hue_mean),
        "hue_std": float(hue_std),
        "sat_mean": float(sat_mean),
        "sat_std": float(sat_std),
        "val_mean": float(val_mean),
        "val_std": float(val_std),
        "laplacian_var": float(laplacian_var),
        "glcm_contrast": float(glcm_contrast),
        "glcm_homogeneity": float(glcm_homogeneity),
        "glcm_energy": float(glcm_energy),
    }


def extract_signal_labels(features, thresholds):
    """Maps raw features to plain-language labels for the UI `signals` field,
    e.g. {"size": "good", "color": "fair", "surface": "minor blemish"}.
    `thresholds` comes from config/{crop}_thresholds.json.
    """
    signals = {}

    circ = features["circularity"]
    sol = features["solidity"]
    size_band = thresholds.get("size_bands", {})
    if circ >= size_band.get("good_circularity_min", 0.75) and sol >= size_band.get("good_solidity_min", 0.9):
        signals["size"] = "good"
    elif circ >= size_band.get("fair_circularity_min", 0.55):
        signals["size"] = "fair"
    else:
        signals["size"] = "irregular"

    sat = features["sat_mean"]
    color_band = thresholds.get("color_bands", {})
    if sat >= color_band.get("good_saturation_min", 90):
        signals["color"] = "good"
    elif sat >= color_band.get("fair_saturation_min", 60):
        signals["color"] = "fair"
    else:
        signals["color"] = "poor"

    contrast = features["glcm_contrast"]
    texture_band = thresholds.get("texture_bands", {})
    if contrast <= texture_band.get("good_contrast_max", 150):
        signals["surface"] = "smooth"
    elif contrast <= texture_band.get("fair_contrast_max", 400):
        signals["surface"] = "minor blemish"
    else:
        signals["surface"] = "visible damage"

    return signals
