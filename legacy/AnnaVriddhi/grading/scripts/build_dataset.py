"""
Phase 1c — Automated train/test split + feature extraction, one command per crop
(or all crops at once).

For each crop in data_processed/{crop}/{A,B,C}/:
  - collects all images with their grade label
  - stratified 70/30 train/test split (so each grade is proportionally
    represented in both splits, even with small per-class counts)
  - runs extract_features() on every image
  - writes features/{crop}_train.csv and features/{crop}_test.csv

Usage:
    python build_dataset.py --root ../data_processed --out ../features
    python build_dataset.py --root ../data_processed --out ../features --crop tomato
"""

import argparse
from pathlib import Path

import pandas as pd
from sklearn.model_selection import train_test_split, GroupShuffleSplit

from features import extract_features, FEATURE_NAMES


def collect_labeled_images(crop_dir: Path):
    rows = []
    for grade_dir in sorted(crop_dir.iterdir()):
        if not grade_dir.is_dir():
            continue
        grade = grade_dir.name
        for img_path in grade_dir.glob("*.*"):
            if img_path.suffix.lower() not in (".jpg", ".jpeg", ".png"):
                continue
            rows.append({"path": str(img_path), "grade": grade})
    return rows


def build_for_crop(crop_dir: Path, out_dir: Path):
    crop = crop_dir.name
    rows = collect_labeled_images(crop_dir)
    if len(rows) < 6:
        print(f"[{crop}] only {len(rows)} labeled images found — skipping "
              f"(need at least ~2 per class to split train/test meaningfully). "
              f"Add more via fetch_dataset.py and/or capture_label.html.")
        return

    df = pd.DataFrame(rows)
    grade_counts = df["grade"].value_counts()
    can_stratify = (grade_counts >= 2).all() and len(grade_counts) > 1

    # Attempt a grouped split so near-duplicate frames (same fruit instance)
    # don't leak between train and test. Group id derivation prefers the
    # immediate parent folder name (Fruits-360 uses variety folders like
    # Tomato_1), falling back to a filename prefix.
    def group_id_from_path(p: str):
        p = Path(p)
        name = p.name
        # If preprocess produced names like <instance>__<orig>, use instance
        if "__" in name:
            return name.split("__", 1)[0]

        # If filenames include the fetch prefix, attempt to extract the class
        # portion: fruits360_<class>_<orig> or freshrotten_<class>_<orig>
        for prefix in ("fruits360_", "freshrotten_"):
            if name.startswith(prefix):
                rest = name.split("_", 1)[1] if "_" in name else name
                if "_" in rest:
                    instance, _orig = rest.rsplit("_", 1)
                    return instance
                return rest

        # Fallback to parent folder (grade) if no instance info available
        return p.parent.name

    df["_group"] = df["path"].apply(group_id_from_path)

    # If there are meaningful groupings with multiple groups, use GroupShuffleSplit
    # to create a single train/test split that keeps groups intact. Otherwise
    # fallback to image-level split.
    unique_groups = df["_group"].nunique()
    if unique_groups > 1:
        # Try multiple random seeds so the group split preserves at least
        # two grade classes in the training set. If repeated attempts fail,
        # fallback to image-level stratified split.
        max_tries = 30
        success = False
        for seed in range(42, 42 + max_tries):
            gss = GroupShuffleSplit(n_splits=1, test_size=0.3, random_state=seed)
            train_idx, test_idx = next(gss.split(df, groups=df["_group"]))
            train_df = df.iloc[train_idx]
            test_df = df.iloc[test_idx]
            if train_df["grade"].nunique() >= 2:
                success = True
                break
        if not success:
            print(f"[{crop}] grouped split couldn't preserve multiple grades in training after {max_tries} tries; falling back to image-level split.")
            train_df, test_df = train_test_split(
                df, test_size=0.3, random_state=42,
                stratify=df["grade"] if can_stratify else None,
            )
    else:
        train_df, test_df = train_test_split(
            df, test_size=0.3, random_state=42,
            stratify=df["grade"] if can_stratify else None,
        )

    def extract_rows(split_df, split_name):
        feature_rows = []
        failed = 0
        for _, row in split_df.iterrows():
            feats = extract_features(row["path"])
            if feats is None:
                failed += 1
                continue
            feats["grade"] = row["grade"]
            feats["path"] = row["path"]
            feature_rows.append(feats)
        if failed:
            print(f"  [{crop}/{split_name}] {failed} image(s) failed feature extraction — "
                  f"likely a segmentation issue, check background/lighting.")
        return pd.DataFrame(feature_rows, columns=FEATURE_NAMES + ["grade", "path"])

    train_feats = extract_rows(train_df, "train")
    test_feats = extract_rows(test_df, "test")

    out_dir.mkdir(parents=True, exist_ok=True)
    train_feats.to_csv(out_dir / f"{crop}_train.csv", index=False)
    test_feats.to_csv(out_dir / f"{crop}_test.csv", index=False)

    print(f"[{crop}] train={len(train_feats)}  test={len(test_feats)}  "
          f"class balance train={dict(train_feats['grade'].value_counts())}")


def run(root: str, out: str, only_crop: str = None):
    root_p = Path(root)
    out_p = Path(out)
    if not root_p.exists():
        raise FileNotFoundError(f"{root_p} not found — run preprocess.py first.")

    for crop_dir in sorted(root_p.iterdir()):
        if not crop_dir.is_dir():
            continue
        if only_crop and crop_dir.name != only_crop:
            continue
        build_for_crop(crop_dir, out_p)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default="../data_processed")
    parser.add_argument("--out", default="../features")
    parser.add_argument("--crop", default=None)
    args = parser.parse_args()
    run(args.root, args.out, args.crop)
