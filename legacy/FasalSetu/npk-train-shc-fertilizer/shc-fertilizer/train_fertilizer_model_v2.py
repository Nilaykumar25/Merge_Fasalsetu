"""
TRAIN FERTILIZER RECOMMENDER V2
Trains on the 10,000-row miadul dataset, which adds Soil_pH,
Organic_Carbon, and Electrical_Conductivity as real features -- directly
addressing the "no pH/OC used" limitation flagged for the v1 pipeline.

7 fertilizer classes: Urea, DAP, MOP, NPK, SSP, Compost, Zinc Sulphate
(a much more agronomically complete taxonomy than v1's -- MOP and Zinc
Sulphate specifically didn't exist as options before).
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score
import pickle
import os
import hashlib
import datetime

DATA_PATH = os.path.join(os.path.dirname(__file__), 'data', 'fertilizer_recommendation_miadul.csv')
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'fertilizer_model_v2.pkl')

FEATURE_COLS = ['Soil_pH', 'Soil_Moisture', 'Organic_Carbon', 'Electrical_Conductivity',
                 'Nitrogen_Level', 'Phosphorus_Level', 'Potassium_Level',
                 'Temperature', 'Humidity', 'Soil_enc', 'Crop_enc', 'GrowthStage_enc']


def _file_hash(path):
    with open(path, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()[:10]


def train(data_path=DATA_PATH, model_path=MODEL_PATH, label='miadul-v2-10000row'):
    print("=" * 70)
    print(f"TRAINING FERTILIZER RECOMMENDER V2  [{label}]")
    print("=" * 70)

    df = pd.read_csv(data_path)
    print(f"\nLoaded {len(df)} rows from {data_path}")

    class_counts = df['Recommended_Fertilizer'].value_counts()
    print("\nClass distribution:")
    for cls, n in class_counts.items():
        print(f"  {cls:<15} {n:>5} rows")

    soil_encoder = LabelEncoder()
    crop_encoder = LabelEncoder()
    growth_stage_encoder = LabelEncoder()
    fert_encoder = LabelEncoder()

    df['Soil_enc'] = soil_encoder.fit_transform(df['Soil_Type'])
    df['Crop_enc'] = crop_encoder.fit_transform(df['Crop_Type'])
    df['GrowthStage_enc'] = growth_stage_encoder.fit_transform(df['Crop_Growth_Stage'])
    df['Fert_enc'] = fert_encoder.fit_transform(df['Recommended_Fertilizer'])

    X = df[FEATURE_COLS]
    y = df['Fert_enc']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = RandomForestClassifier(
        n_estimators=300,
        max_depth=12,
        min_samples_split=4,
        min_samples_leaf=2,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    )

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(model, X, y, cv=cv)
    print(f"\n5-fold stratified CV accuracy: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")
    print("(With 10,000 rows this is a much more statistically stable estimate")
    print(" than the v1 pipeline's small-sample CV.)")

    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    test_acc = accuracy_score(y_test, y_pred)
    print(f"\nHeld-out test accuracy: {test_acc:.4f} ({len(X_test)} samples)")
    print("\nClassification report:")
    print(classification_report(
        y_test, y_pred,
        labels=range(len(fert_encoder.classes_)),
        target_names=fert_encoder.classes_,
        zero_division=0
    ))

    model.fit(X, y)  # refit on all data for deployment

    feature_importance = pd.DataFrame({
        'feature': FEATURE_COLS,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    print("\nFeature importance (full-data fit):")
    for _, row in feature_importance.iterrows():
        print(f"  {row['feature']:<25} {row['importance']:.3f}")

    with open(model_path, 'wb') as f:
        pickle.dump({
            'model': model,
            'soil_encoder': soil_encoder,
            'crop_encoder': crop_encoder,
            'growth_stage_encoder': growth_stage_encoder,
            'fert_encoder': fert_encoder,
            'feature_cols': FEATURE_COLS,
            'soil_types': list(soil_encoder.classes_),
            'crop_types': list(crop_encoder.classes_),
            'growth_stages': list(growth_stage_encoder.classes_),
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
    print(f"  Soil types: {list(soil_encoder.classes_)}")
    print(f"  Crop types: {list(crop_encoder.classes_)}")
    print(f"  Fertilizers: {list(fert_encoder.classes_)}")
    return model, {'cv_accuracy_mean': float(cv_scores.mean()),
                    'held_out_test_accuracy': float(test_acc)}


if __name__ == "__main__":
    train()
