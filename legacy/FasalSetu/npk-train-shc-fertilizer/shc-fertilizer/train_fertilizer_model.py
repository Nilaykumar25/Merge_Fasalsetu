"""
TRAIN FERTILIZER RECOMMENDER
Trains a classifier on the 99-row base dataset to predict Fertilizer Name
from Temperature, Humidity, Moisture, Soil Type, Crop Type, N, P, K.

This is intentionally a small, fast-training model appropriate for a
hackathon demo -- see README_FERTILIZER.md for the honest limitations
(99 rows, synthetic-scale N/P/K, only 7 fertilizer classes / 11 crops /
5 soil types).
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score
import pickle
import os
import hashlib
import datetime

DATA_PATH = os.path.join(os.path.dirname(__file__), 'data', 'fertilizer_prediction_base.csv')
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'fertilizer_model.pkl')


def load_data(data_path=DATA_PATH):
    df = pd.read_csv(data_path)
    df.columns = [c.strip() for c in df.columns]
    return df


def _file_hash(path):
    """Short hash of the training file -- so the saved model can tell you
    exactly which dataset version it was trained on. Matters once you have
    more than one candidate CSV (base vs. rule-augmented) floating around."""
    with open(path, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()[:10]


def train(data_path=DATA_PATH, model_path=MODEL_PATH, label='base-99row'):
    print("=" * 70)
    print(f"TRAINING FERTILIZER RECOMMENDER  [{label}]")
    print("=" * 70)

    df = load_data(data_path)
    print(f"\nLoaded {len(df)} rows from {data_path}")

    class_counts = df['Fertilizer Name'].value_counts()
    print("\nClass distribution:")
    for cls, n in class_counts.items():
        print(f"  {cls:<12} {n:>4} rows")
    if class_counts.min() < 5:
        print(f"\n  WARNING: '{class_counts.idxmin()}' has only {class_counts.min()} rows -- ")
        print("  cross-validation folds for this class will be very noisy. Consider")
        print("  the rule-augmented dataset (train_fertilizer_model_augmented.py) if")
        print("  this matters for your demo crops/soils.")

    # Encode categoricals
    soil_encoder = LabelEncoder()
    crop_encoder = LabelEncoder()
    fert_encoder = LabelEncoder()

    df['Soil_enc'] = soil_encoder.fit_transform(df['Soil Type'])
    df['Crop_enc'] = crop_encoder.fit_transform(df['Crop Type'])
    df['Fert_enc'] = fert_encoder.fit_transform(df['Fertilizer Name'])

    feature_cols = ['Temparature', 'Humidity', 'Moisture', 'Soil_enc', 'Crop_enc',
                     'Nitrogen', 'Potassium', 'Phosphorous']
    X = df[feature_cols]
    y = df['Fert_enc']

    # With only 99 rows, a held-out test split is small -- cross-validation
    # gives a more honest accuracy estimate than a single train/test split.
    # StratifiedKFold explicitly (not plain KFold) matters here: with the
    # smallest class having very few rows, an unstratified split can put
    # zero examples of that class in a fold entirely.
    from sklearn.model_selection import StratifiedKFold
    n_splits = min(5, class_counts.min())  # can't have more folds than the
                                            # smallest class has examples
    if n_splits < 5:
        print(f"\n  NOTE: smallest class only supports {n_splits}-fold CV (not 5) "
              f"-- reducing fold count so every fold sees every class.")
    cv = StratifiedKFold(n_splits=max(2, n_splits), shuffle=True, random_state=42)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=8,
        min_samples_split=2,
        min_samples_leaf=1,
        class_weight='balanced',   # matters more once class counts are uneven
        random_state=42,
        n_jobs=-1
    )

    cv_scores = cross_val_score(model, X, y, cv=cv)
    print(f"\n{cv.get_n_splits()}-fold stratified CV accuracy: {cv_scores.mean():.3f} "
          f"(+/- {cv_scores.std():.3f})")
    print("(Small-dataset caveat: with <100 rows this estimate has real variance --")
    print(" treat it as 'roughly plausible', not a precise production metric.)")

    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    test_acc = accuracy_score(y_test, y_pred)
    print(f"\nHeld-out test accuracy: {test_acc:.3f} ({len(X_test)} samples)")
    print("\nClassification report:")
    print(classification_report(
        y_test, y_pred,
        labels=range(len(fert_encoder.classes_)),
        target_names=fert_encoder.classes_,
        zero_division=0
    ))

    # Refit on ALL data for the deployed model (standard practice once
    # you've validated architecture via CV/held-out split above)
    model.fit(X, y)

    feature_importance = pd.DataFrame({
        'feature': feature_cols,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    print("\nFeature importance (full-data fit):")
    for _, row in feature_importance.iterrows():
        print(f"  {row['feature']:<15} {row['importance']:.3f}")

    with open(model_path, 'wb') as f:
        pickle.dump({
            'model': model,
            'soil_encoder': soil_encoder,
            'crop_encoder': crop_encoder,
            'fert_encoder': fert_encoder,
            'feature_cols': feature_cols,
            'soil_types': list(soil_encoder.classes_),
            'crop_types': list(crop_encoder.classes_),
            'fertilizer_names': list(fert_encoder.classes_),
            'metadata': {
                'label': label,
                'trained_at': datetime.datetime.now().isoformat(),
                'training_data_path': str(data_path),
                'training_data_hash': _file_hash(data_path),
                'n_rows': len(df),
                'cv_accuracy_mean': float(cv_scores.mean()),
                'cv_accuracy_std': float(cv_scores.std()),
                'held_out_test_accuracy': float(test_acc),
                'class_distribution': class_counts.to_dict(),
            },
        }, f)

    print(f"\n✓ Saved model -> {model_path}")
    print(f"  Dataset hash: {_file_hash(data_path)}  (compare this if you're not sure")
    print(f"  which CSV a deployed .pkl was actually trained on)")
    print(f"  Soil types the model knows: {list(soil_encoder.classes_)}")
    print(f"  Crop types the model knows: {list(crop_encoder.classes_)}")
    print(f"  Fertilizers the model can recommend: {list(fert_encoder.classes_)}")
    print("\n  NOTE: inputs outside these categories (e.g. a crop not in the")
    print("  11-crop list) cannot be encoded -- your inference layer needs a")
    print("  fallback for that case. See fertilizer_agent.py.")
    return model, {
        'cv_accuracy_mean': float(cv_scores.mean()),
        'held_out_test_accuracy': float(test_acc),
    }


if __name__ == "__main__":
    train()
