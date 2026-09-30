"""
Phase 3 — Train one small, interpretable classifier per crop.

Reads features/{crop}_train.csv and features/{crop}_test.csv (from
build_dataset.py), trains a RandomForest (robust to small/uneven data,
gives feature importances for free, outputs predict_proba for confidence
scores), evaluates on the held-out test set, and saves the model.

Usage:
    python train_classifier.py --features ../features --out ../models
    python train_classifier.py --features ../features --out ../models --crop tomato
"""

import argparse
import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import confusion_matrix, classification_report

from features import FEATURE_NAMES


def train_for_crop(crop: str, features_dir: Path, out_dir: Path):
    train_path = features_dir / f"{crop}_train.csv"
    test_path = features_dir / f"{crop}_test.csv"
    if not train_path.exists():
        print(f"[{crop}] no train CSV found — run build_dataset.py first. Skipping.")
        return

    train_df = pd.read_csv(train_path)
    test_df = pd.read_csv(test_path) if test_path.exists() else pd.DataFrame()

    if train_df.empty or train_df["grade"].nunique() < 2:
        print(f"[{crop}] not enough class diversity in training data to train a classifier. "
              f"Need at least 2 grades represented — collect more data. Skipping.")
        return

    X_train, y_train = train_df[FEATURE_NAMES], train_df["grade"]

    # n_estimators kept modest — this runs on small datasets, no need for a huge forest
    clf = RandomForestClassifier(n_estimators=150, max_depth=6, random_state=42,
                                  class_weight="balanced")
    clf.fit(X_train, y_train)

    out_dir.mkdir(parents=True, exist_ok=True)
    model_path = out_dir / f"{crop}_grader.pkl"
    joblib.dump(clf, model_path)

    report = {"crop": crop, "train_size": len(train_df)}

    if not test_df.empty and test_df["grade"].nunique() >= 1:
        X_test, y_test = test_df[FEATURE_NAMES], test_df["grade"]
        y_pred = clf.predict(X_test)
        report["test_size"] = len(test_df)
        report["accuracy"] = float((y_pred == y_test.values).mean())
        report["confusion_matrix"] = confusion_matrix(
            y_test, y_pred, labels=sorted(y_train.unique())
        ).tolist()
        report["labels_order"] = sorted(y_train.unique())
        report["classification_report"] = classification_report(
            y_test, y_pred, output_dict=True, zero_division=0
        )
        print(f"[{crop}] test accuracy: {report['accuracy']:.2f}  "
              f"(n_test={report['test_size']})")
    else:
        print(f"[{crop}] no test set to evaluate against — accuracy unknown. "
              f"Collect more data so build_dataset.py can hold out a test split.")

    importances = dict(zip(FEATURE_NAMES, clf.feature_importances_.round(4).tolist()))
    report["feature_importances"] = importances

    report_path = out_dir / f"{crop}_report.json"
    report_path.write_text(json.dumps(report, indent=2))
    print(f"[{crop}] model saved -> {model_path}")
    print(f"[{crop}] report saved -> {report_path}  "
          f"(review before demo — do not claim accuracy you haven't checked)")


def run(features_dir: str, out_dir: str, only_crop: str = None):
    features_p = Path(features_dir)
    out_p = Path(out_dir)
    crops = {only_crop} if only_crop else {
        p.stem.replace("_train", "") for p in features_p.glob("*_train.csv")
    }
    for crop in sorted(crops):
        train_for_crop(crop, features_p, out_p)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--features", default="../features")
    parser.add_argument("--out", default="../models")
    parser.add_argument("--crop", default=None)
    args = parser.parse_args()
    run(args.features, args.out, args.crop)
