"""
FERTILIZER RECOMMENDATION AGENT
Ties together: coordinate lookup (real SHC data) OR manual farmer entry,
the rating bridge (solves the unit-mismatch problem), and the trained
classifier, into one clean inference call for your hackathon demo.

Two entry points:
  recommend_from_coordinates(lat, lon, moisture, crop, ...)
      -> looks up nearest SHC sample, bridges its rating to the model's
         scale, predicts fertilizer

  recommend_from_manual_npk(n_rating, p_rating, k_rating, moisture, crop, ...)
      -> farmer typed in their own Low/Medium/High assessment (e.g. from
         a paper SHC they're holding, or just "not sure, guess Medium")
"""

import pickle
import os
import numpy as np

from rating_bridge import (
    _load_base_df, compute_tertile_bounds, shc_row_to_training_features,
    shc_numeric_to_rating
)
from coordinate_lookup import ShcCoordinateIndex

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'fertilizer_model.pkl')

DEFAULT_TEMPERATURE = 29   # °C -- dataset's own mean-ish value, used when
DEFAULT_HUMIDITY = 58      # %     the farmer/sensor doesn't supply these.
                            # Flagged in the response's `_assumptions` list.


class FertilizerAgent:
    def __init__(self, model_path=MODEL_PATH, shc_csv_path=None):
        with open(model_path, 'rb') as f:
            saved = pickle.load(f)

        self.model = saved['model']
        self.soil_encoder = saved['soil_encoder']
        self.crop_encoder = saved['crop_encoder']
        self.fert_encoder = saved['fert_encoder']
        self.feature_cols = saved['feature_cols']
        self.known_soil_types = set(saved['soil_types'])
        self.known_crop_types = set(saved['crop_types'])

        self._base_df = _load_base_df()
        self._bounds = compute_tertile_bounds(self._base_df)

        self.coord_index = None
        if shc_csv_path and os.path.exists(shc_csv_path):
            self.coord_index = ShcCoordinateIndex(shc_csv_path)

    # ----------------------------------------------------------------
    # Shared prediction core
    # ----------------------------------------------------------------

    def _predict(self, nitrogen, phosphorous, potassium, moisture, crop,
                 soil_type, temperature=None, humidity=None):
        assumptions = []

        if temperature is None:
            temperature = DEFAULT_TEMPERATURE
            assumptions.append('temperature (no sensor/forecast supplied, used dataset average)')
        if humidity is None:
            humidity = DEFAULT_HUMIDITY
            assumptions.append('humidity (no sensor/forecast supplied, used dataset average)')

        # Handle crop/soil types the model has never seen
        if crop not in self.known_crop_types:
            assumptions.append(
                f"crop '{crop}' not in training set {sorted(self.known_crop_types)} -- "
                f"prediction may be unreliable"
            )
            crop_enc = -1  # will be caught below
        else:
            crop_enc = self.crop_encoder.transform([crop])[0]

        if soil_type not in self.known_soil_types:
            assumptions.append(
                f"soil type '{soil_type}' not in training set {sorted(self.known_soil_types)} -- "
                f"prediction may be unreliable"
            )
            soil_enc = -1
        else:
            soil_enc = self.soil_encoder.transform([soil_type])[0]

        if crop_enc == -1 or soil_enc == -1:
            return {
                'success': False,
                'error': 'Cannot predict: crop or soil type outside model\'s known categories.',
                'known_crops': sorted(self.known_crop_types),
                'known_soil_types': sorted(self.known_soil_types),
                '_assumptions': assumptions,
            }

        import pandas as pd
        X = pd.DataFrame(
            [[temperature, humidity, moisture, soil_enc, crop_enc,
              nitrogen, potassium, phosphorous]],
            columns=self.feature_cols
        )

        pred_enc = self.model.predict(X)[0]
        pred_proba = self.model.predict_proba(X)[0]
        fertilizer = self.fert_encoder.inverse_transform([pred_enc])[0]
        confidence = float(pred_proba[pred_enc])

        # Full probability breakdown -- nice for a demo UI ("87% Urea,
        # 9% DAP, 4% other") rather than just a bare label
        proba_breakdown = {
            self.fert_encoder.inverse_transform([i])[0]: float(p)
            for i, p in enumerate(pred_proba)
        }

        return {
            'success': True,
            'fertilizer': fertilizer,
            'confidence': confidence,
            'probability_breakdown': proba_breakdown,
            'inputs_used': {
                'nitrogen': nitrogen, 'phosphorous': phosphorous, 'potassium': potassium,
                'moisture': moisture, 'crop': crop, 'soil_type': soil_type,
                'temperature': temperature, 'humidity': humidity,
            },
            '_assumptions': assumptions,
        }

    # ----------------------------------------------------------------
    # Entry point 1: coordinates -> real SHC lookup -> prediction
    # ----------------------------------------------------------------

    def recommend_from_coordinates(self, lat, lon, moisture, crop,
                                    max_distance_km=10.0,
                                    temperature=None, humidity=None,
                                    soil_type_override=None):
        if self.coord_index is None:
            return {
                'success': False,
                'error': 'No SHC coordinate index loaded. Pass shc_csv_path when '
                         'constructing FertilizerAgent, or use recommend_from_manual_npk() instead.'
            }

        shc_row, distance_km = self.coord_index.nearest_sample(lat, lon, max_distance_km)

        if shc_row is None:
            return {
                'success': False,
                'error': f'No SHC sample found within {max_distance_km}km of ({lat}, {lon}). '
                         f'Nearest available sample is {distance_km:.1f}km away -- either raise '
                         f'max_distance_km or fall back to recommend_from_manual_npk().',
            }

        bridged = shc_row_to_training_features(shc_row, df=self._base_df, bounds=self._bounds)

        soil_type = soil_type_override or shc_row.get('soil_type') or 'Loamy'
        # SHC soil_type strings may not exactly match the 5-class training
        # vocabulary (Sandy/Loamy/Black/Red/Clayey) -- do a loose match.
        soil_type = self._normalize_soil_type(soil_type)

        result = self._predict(
            nitrogen=bridged['Nitrogen'],
            phosphorous=bridged['Phosphorous'],
            potassium=bridged['Potassium'],
            moisture=moisture,
            crop=crop,
            soil_type=soil_type,
            temperature=temperature,
            humidity=humidity,
        )

        result['shc_source'] = {
            'distance_km': round(distance_km, 2),
            'sample_collection_date': shc_row.get('sample_collection_date'),
            'original_ratings': {
                'N_rating': shc_row.get('N_rating'),
                'P_rating': shc_row.get('P_rating'),
                'K_rating': shc_row.get('K_rating'),
            },
            'bridged_training_scale_values': {
                k: v for k, v in bridged.items() if k != '_assumptions'
            },
        }
        if bridged['_assumptions']:
            result.setdefault('_assumptions', []).extend(
                [f"SHC sample had no {a} rating -- assumed Medium" for a in bridged['_assumptions']]
            )

        return result

    # ----------------------------------------------------------------
    # Entry point 2: farmer-entered Low/Medium/High (no coordinates needed)
    # ----------------------------------------------------------------

    def recommend_from_manual_npk(self, n_rating, p_rating, k_rating, moisture, crop,
                                   soil_type, temperature=None, humidity=None):
        bridged = shc_row_to_training_features(
            {'N_rating': n_rating, 'P_rating': p_rating, 'K_rating': k_rating},
            df=self._base_df, bounds=self._bounds
        )

        soil_type = self._normalize_soil_type(soil_type)

        result = self._predict(
            nitrogen=bridged['Nitrogen'],
            phosphorous=bridged['Phosphorous'],
            potassium=bridged['Potassium'],
            moisture=moisture,
            crop=crop,
            soil_type=soil_type,
            temperature=temperature,
            humidity=humidity,
        )
        result['bridged_training_scale_values'] = {
            k: v for k, v in bridged.items() if k != '_assumptions'
        }
        return result

    # ----------------------------------------------------------------

    def _normalize_soil_type(self, raw_soil_type):
        """Loose-match an arbitrary soil-type string onto the model's
        5-class vocabulary (Sandy/Loamy/Black/Red/Clayey)."""
        if not raw_soil_type:
            return 'Loamy'
        s = str(raw_soil_type).strip().lower()
        for known in self.known_soil_types:
            if known.lower() in s or s in known.lower():
                return known
        # common SHC phrasing variants
        if 'sand' in s:
            return 'Sandy'
        if 'clay' in s:
            return 'Clayey'
        if 'loam' in s:
            return 'Loamy'
        if 'black' in s or 'regur' in s:
            return 'Black'
        if 'red' in s or 'laterite' in s:
            return 'Red'
        return 'Loamy'  # safest generic default


if __name__ == "__main__":
    print("=" * 70)
    print("FERTILIZER AGENT -- DEMO (manual entry path, no SHC CSV needed)")
    print("=" * 70)

    agent = FertilizerAgent(shc_csv_path=None)

    result = agent.recommend_from_manual_npk(
        n_rating='Low', p_rating='Medium', k_rating='High',
        moisture=45, crop='Wheat', soil_type='Loamy'
    )

    import json
    print(json.dumps(result, indent=2))
