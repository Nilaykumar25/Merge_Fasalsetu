"""
Run GroupKFold cross-validation per crop using grouped samples (group derived
from file path) and report mean±std for accuracy and macro F1.

Usage:
    python group_cv.py --features ../features --folds 5
"""
import argparse
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import GroupKFold, cross_val_score
from sklearn.metrics import make_scorer, f1_score, accuracy_score

FEATURES = None


def group_id_from_path(p: str):
    from pathlib import Path
    p = Path(p)
    name = p.name
    if "__" in name:
        return name.split("__", 1)[0]
    for prefix in ("fruits360_", "freshrotten_"):
        if name.startswith(prefix):
            rest = name.split("_", 1)[1] if "_" in name else name
            if "_" in rest:
                instance, _orig = rest.rsplit("_", 1)
                return instance
            return rest
    return p.parent.name


def run(features_dir: str, folds: int = 5):
    features_p = Path(features_dir)
    crops = {p.stem.replace('_train', '') for p in features_p.glob('*_train.csv')}
    results = {}
    for crop in sorted(crops):
        csv_path = features_p / f"{crop}_train.csv"
        if not csv_path.exists():
            print(f"[{crop}] no features CSV, skipping")
            continue
        df = pd.read_csv(csv_path)
        if df.empty or df['grade'].nunique() < 2:
            print(f"[{crop}] not enough classes for CV, skipping")
            continue
        # Drop non-feature columns that may be present (path, hashes, cluster ids)
        X = df.drop(columns=['grade', 'path', 'ahash', 'cluster_id'], errors='ignore')
        y = df['grade']
        groups = df['path'].apply(group_id_from_path)
        clf = RandomForestClassifier(n_estimators=150, max_depth=6, random_state=42, class_weight='balanced')
        n_groups = groups.nunique()
        if n_groups < 2:
            print(f"[{crop}] not enough groups for GroupKFold (need >=2), skipping")
            continue

        gkf = GroupKFold(n_splits=min(folds, n_groups))
        acc_list = []
        f1_list = []
        for train_idx, test_idx in gkf.split(X, y, groups=groups):
            X_tr, X_te = X.iloc[train_idx], X.iloc[test_idx]
            y_tr, y_te = y.iloc[train_idx], y.iloc[test_idx]
            if y_te.nunique() < 2:
                # skip folds where test has only one class — can't compute macro-F1
                continue
            clf.fit(X_tr, y_tr)
            y_pred = clf.predict(X_te)
            acc_list.append(accuracy_score(y_te, y_pred))
            f1_list.append(f1_score(y_te, y_pred, average='macro'))

        results[crop] = {
            'acc_mean': float(np.mean(acc_list)) if acc_list else float('nan'),
            'acc_std': float(np.std(acc_list)) if acc_list else float('nan'),
            'f1_mean': float(np.mean(f1_list)) if f1_list else float('nan'),
            'f1_std': float(np.std(f1_list)) if f1_list else float('nan'),
            'n_groups': int(n_groups),
            'n_samples': int(len(df)),
            'n_valid_folds': len(acc_list),
        }
        print(f"[{crop}] GroupKFold (groups={n_groups}, valid_folds={len(acc_list)}): acc={results[crop]['acc_mean']:.4f}±{results[crop]['acc_std']:.4f}, f1_macro={results[crop]['f1_mean']:.4f}±{results[crop]['f1_std']:.4f}")
    return results


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--features', default='../features')
    p.add_argument('--folds', type=int, default=5)
    args = p.parse_args()
    run(args.features, args.folds)
