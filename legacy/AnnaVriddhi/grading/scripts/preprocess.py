"""
Phase 1b — Automated preprocessing.

Runs on every image in data/{crop}/{grade}/ and writes a normalized version
to data_processed/{crop}/{grade}/. This is what lets self-captured photos
(imperfect lighting, inconsistent framing) sit in the same training set as
clean dataset images, without hand-fixing each one.

Steps: resize to a fixed max dimension, auto-crop to the segmented object's
bounding box (reuses features.py's segmentation), histogram-equalize the
value channel to reduce lighting inconsistency.

Usage:
    python preprocess.py --root ../data --out ../data_processed
    python preprocess.py --root ../data --out ../data_processed --crop tomato
"""

import argparse
from pathlib import Path

import cv2
import numpy as np

from features import _largest_contour_mask


MAX_DIM = 512


def normalize_lighting(bgr_img):
    hsv = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2HSV)
    h, s, v = cv2.split(hsv)
    v_eq = cv2.equalizeHist(v)
    hsv_eq = cv2.merge([h, s, v_eq])
    return cv2.cvtColor(hsv_eq, cv2.COLOR_HSV2BGR)


def resize_max_dim(img, max_dim=MAX_DIM):
    h, w = img.shape[:2]
    scale = max_dim / max(h, w)
    if scale < 1:
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    return img


def process_image(path: Path):
    img = cv2.imread(str(path))
    if img is None:
        return None, "unreadable"

    img = resize_max_dim(img)
    img = normalize_lighting(img)

    mask, contour, bbox = _largest_contour_mask(img)
    if mask is None:
        return None, "no_object_found"

    x, y, w, h = bbox
    pad = int(0.05 * max(w, h))
    x0, y0 = max(0, x - pad), max(0, y - pad)
    x1, y1 = min(img.shape[1], x + w + pad), min(img.shape[0], y + h + pad)
    cropped = img[y0:y1, x0:x1]

    return cropped, "ok"


def run(root: str, out: str, only_crop: str = None):
    root_p = Path(root)
    out_p = Path(out)
    stats = {"ok": 0, "no_object_found": 0, "unreadable": 0}

    for crop_dir in sorted(root_p.iterdir()):
        if not crop_dir.is_dir():
            continue
        if only_crop and crop_dir.name != only_crop:
            continue
        for grade_dir in sorted(crop_dir.iterdir()):
            if not grade_dir.is_dir():
                continue
            dest_dir = out_p / crop_dir.name / grade_dir.name
            dest_dir.mkdir(parents=True, exist_ok=True)
            for img_path in grade_dir.glob("*.*"):
                if img_path.suffix.lower() not in (".jpg", ".jpeg", ".png"):
                    continue
                processed, status = process_image(img_path)
                stats[status] = stats.get(status, 0) + 1
                if processed is not None:
                    # Preserve instance/class information from the original
                    # fetched filename so downstream grouping can keep
                    # all frames from the same instance together. Filenames
                    # produced by fetch_dataset.py follow the pattern:
                    #  fruits360_<class_name>_<origname> or
                    #  freshrotten_<class_name>_<origname>
                    # We prefix the saved filename with the class/instance id
                    # so the output becomes: <class_name>__<origname>
                    src_name = img_path.name
                    instance_key = None
                    if src_name.startswith('fruits360_') or src_name.startswith('freshrotten_'):
                        # remove the dataset prefix and split off the last underscore
                        rest = src_name.split('_', 1)[1] if '_' in src_name else src_name
                        if '_' in rest:
                            instance_key, orig = rest.rsplit('_', 1)
                        else:
                            instance_key = rest
                        dest_name = f"{instance_key}__{orig}"
                    else:
                        # fallback: use the original parent folder name plus original filename
                        instance_key = img_path.parent.name
                        dest_name = f"{instance_key}__{src_name}"

                    cv2.imwrite(str(dest_dir / dest_name), processed)

    print("Preprocessing summary:")
    for k, v in stats.items():
        print(f"  {k}: {v}")
    if stats.get("no_object_found", 0) > 0:
        print(
            "\nSome images had no clear object detected against the background — "
            "usually means the background wasn't plain/uniform enough. "
            "Reshoot those with the capture_label.html tool for a cleaner background."
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default="../data")
    parser.add_argument("--out", default="../data_processed")
    parser.add_argument("--crop", default=None, help="Process only this crop")
    args = parser.parse_args()
    run(args.root, args.out, args.crop)
