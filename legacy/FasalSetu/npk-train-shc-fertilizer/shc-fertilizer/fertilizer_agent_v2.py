"""
FERTILIZER AGENT V2
Uses the richer 10,000-row miadul dataset. Key difference from v1's
fertilizer_agent.py: pH, Organic Carbon, and Electrical Conductivity are
taken as DIRECT numeric inputs (no bridging needed -- both SHC and this
dataset use the same real units), while N/P/K still go through
rating_bridge_v2's Low/Medium/High -> numeric bridge.

Also requires Crop_Growth_Stage now -- found during validation to be the
key feature separating SSP from NPK (see README_FERTILIZER.md).
"""

import pickle
import os
import pandas as pd
import numpy as np

from rating_bridge_v2 import _load_base_df, compute_tertile_bounds, shc_row_to_training_features
from coordinate_lookup import ShcCoordinateIndex

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'fertilizer_model_v2.pkl')

DEFAULT_TEMPERATURE = 25
DEFAULT_HUMIDITY = 60
DEFAULT_PH = 6.5           # near-neutral, matches this dataset's overall mean (6.49)
DEFAULT_OC = 0.8           # matches this dataset's overall mean
DEFAULT_EC = 1.5           # matches this dataset's overall mean
DEFAULT_GROWTH_STAGE = 'Vegetative'


class FertilizerAgentV2:
    def __init__(self, model_path=MODEL_PATH, shc_csv_path=None):
        with open(model_path, 'rb') as f:
            saved = pickle.load(f)

        self.model = saved['model']
        self.soil_encoder = saved['soil_encoder']
        self.crop_encoder = saved['crop_encoder']
        self.growth_stage_encoder = saved['growth_stage_encoder']
        self.fert_encoder = saved['fert_encoder']
        self.feature_cols = saved['feature_cols']
        self.known_soil_types = set(saved['soil_types'])
        self.known_crop_types = set(saved['crop_types'])
        self.known_growth_stages = set(saved['growth_stages'])

        self._base_df = _load_base_df()
        self._bounds = compute_tertile_bounds(self._base_df)

        self.coord_index = None
        if shc_csv_path and os.path.exists(shc_csv_path):
            self.coord_index = ShcCoordinateIndex(shc_csv_path)

    def _predict(self, nitrogen, phosphorous, potassium, moisture, crop, soil_type,
                 growth_stage=None, ph=None, organic_carbon=None, electrical_conductivity=None,
                 temperature=None, humidity=None):
        assumptions = []

        if temperature is None:
            temperature = DEFAULT_TEMPERATURE
            assumptions.append('temperature (defaulted)')
        if humidity is None:
            humidity = DEFAULT_HUMIDITY
            assumptions.append('humidity (defaulted)')
        if ph is None:
            ph = DEFAULT_PH
            assumptions.append('pH (defaulted to near-neutral -- get a real reading if possible, '
                               'pH is the #2 most important feature in this model)')
        if organic_carbon is None:
            organic_carbon = DEFAULT_OC
            assumptions.append('organic_carbon (defaulted)')
        if electrical_conductivity is None:
            electrical_conductivity = DEFAULT_EC
            assumptions.append('electrical_conductivity (defaulted)')
        if growth_stage is None:
            growth_stage = DEFAULT_GROWTH_STAGE
            assumptions.append(f'growth_stage (defaulted to {DEFAULT_GROWTH_STAGE})')

        if crop not in self.known_crop_types:
            return {'success': False,
                    'error': f"Unknown crop '{crop}'",
                    'known_crops': sorted(self.known_crop_types), '_assumptions': assumptions}
        if soil_type not in self.known_soil_types:
            soil_type = self._normalize_soil_type(soil_type)
        if soil_type not in self.known_soil_types:
            return {'success': False,
                    'error': f"Unknown soil type '{soil_type}'",
                    'known_soil_types': sorted(self.known_soil_types), '_assumptions': assumptions}
        if growth_stage not in self.known_growth_stages:
            return {'success': False,
                    'error': f"Unknown growth stage '{growth_stage}'",
                    'known_growth_stages': sorted(self.known_growth_stages), '_assumptions': assumptions}

        crop_enc = self.crop_encoder.transform([crop])[0]
        soil_enc = self.soil_encoder.transform([soil_type])[0]
        stage_enc = self.growth_stage_encoder.transform([growth_stage])[0]

        X = pd.DataFrame(
            [[ph, moisture, organic_carbon, electrical_conductivity,
              nitrogen, phosphorous, potassium, temperature, humidity, soil_enc, crop_enc, stage_enc]],
            columns=self.feature_cols
        )

        pred_enc = self.model.predict(X)[0]
        pred_proba = self.model.predict_proba(X)[0]
        fertilizer = self.fert_encoder.inverse_transform([pred_enc])[0]
        confidence = float(pred_proba[pred_enc])

        proba_breakdown = {
            self.fert_encoder.inverse_transform([i])[0]: float(p)
            for i, p in enumerate(pred_proba)
        }

        low_conf_note = None
        if fertilizer == 'SSP' or proba_breakdown.get('SSP', 0) > 0.15:
            low_conf_note = ("SSP is this model's weakest class (only 182/10,000 training rows, "
                             "precision ~0.12 in validation) -- treat an SSP recommendation, or a "
                             "high SSP probability in the breakdown, with extra skepticism.")

        return {
            'success': True,
            'fertilizer': fertilizer,
            'confidence': confidence,
            'probability_breakdown': proba_breakdown,
            'low_confidence_class_warning': low_conf_note,
            'inputs_used': {
                'nitrogen': nitrogen, 'phosphorous': phosphorous, 'potassium': potassium,
                'moisture': moisture, 'crop': crop, 'soil_type': soil_type,
                'growth_stage': growth_stage, 'pH': ph, 'organic_carbon': organic_carbon,
                'electrical_conductivity': electrical_conductivity,
                'temperature': temperature, 'humidity': humidity,
            },
            '_assumptions': assumptions,
        }

    def recommend_from_manual_npk(self, n_rating, p_rating, k_rating, moisture, crop, soil_type,
                                   growth_stage=None, ph=None, organic_carbon=None,
                                   electrical_conductivity=None, temperature=None, humidity=None):
        bridged = shc_row_to_training_features(
            {'N_rating': n_rating, 'P_rating': p_rating, 'K_rating': k_rating},
            df=self._base_df, bounds=self._bounds
        )
        result = self._predict(
            nitrogen=bridged['Nitrogen'], phosphorous=bridged['Phosphorous'],
            potassium=bridged['Potassium'], moisture=moisture, crop=crop, soil_type=soil_type,
            growth_stage=growth_stage, ph=ph, organic_carbon=organic_carbon,
            electrical_conductivity=electrical_conductivity, temperature=temperature, humidity=humidity,
        )
        result['bridged_training_scale_values'] = {k: v for k, v in bridged.items() if k != '_assumptions'}
        return result

    def recommend_from_coordinates(self, lat, lon, moisture, crop, growth_stage=None,
                                    max_distance_km=10.0, temperature=None, humidity=None,
                                    soil_type_override=None):
        if self.coord_index is None:
            return {'success': False, 'error': 'No SHC coordinate index loaded.'}

        shc_row, distance_km = self.coord_index.nearest_sample(lat, lon, max_distance_km)
        if shc_row is None:
            return {'success': False,
                     'error': f'No SHC sample within {max_distance_km}km of ({lat}, {lon}). '
                              f'Nearest is {distance_km:.1f}km away.'}

        bridged = shc_row_to_training_features(shc_row, df=self._base_df, bounds=self._bounds)
        soil_type = self._normalize_soil_type(soil_type_override or shc_row.get('soil_type') or 'Loamy')

        # pH/OC/EC come DIRECTLY from the real SHC row -- no bridging, same units
        ph = shc_row.get('pH_value')
        organic_carbon = shc_row.get('OC_value')
        electrical_conductivity = shc_row.get('EC_value')

        result = self._predict(
            nitrogen=bridged['Nitrogen'], phosphorous=bridged['Phosphorous'],
            potassium=bridged['Potassium'], moisture=moisture, crop=crop, soil_type=soil_type,
            growth_stage=growth_stage, ph=ph, organic_carbon=organic_carbon,
            electrical_conductivity=electrical_conductivity, temperature=temperature, humidity=humidity,
        )
        result['shc_source'] = {
            'distance_km': round(distance_km, 2),
            'sample_collection_date': shc_row.get('sample_collection_date'),
            'original_ratings': {k: shc_row.get(k) for k in ['N_rating', 'P_rating', 'K_rating']},
            'real_ph_oc_ec_used_directly': {'pH': ph, 'OC': organic_carbon, 'EC': electrical_conductivity},
        }
        return result

    def _normalize_soil_type(self, raw):
        if not raw:
            return 'Loamy'
        s = str(raw).strip().lower()
        for known in self.known_soil_types:
            if known.lower() in s or s in known.lower():
                return known
        if 'sand' in s:
            return 'Sandy'
        if 'silt' in s:
            return 'Silt'
        if 'clay' in s:
            return 'Clay'
        if 'loam' in s:
            return 'Loamy'
        return 'Loamy'


if __name__ == "__main__":
    import json
    agent = FertilizerAgentV2()

    print("=" * 70)
    print("V2 DEMO 1 -- Low N, Medium P, High K, acidic soil (pH 5.3), Vegetative")
    print("=" * 70)
    result = agent.recommend_from_manual_npk(
        n_rating='Low', p_rating='Medium', k_rating='High',
        moisture=45, crop='Wheat', soil_type='Loamy',
        growth_stage='Vegetative', ph=5.3,
    )
    print(json.dumps(result, indent=2))

    print("\n" + "=" * 70)
    print("V2 DEMO 2 -- everything adequate, alkaline soil (pH 7.8) -- expect Zinc Sulphate")
    print("=" * 70)
    result2 = agent.recommend_from_manual_npk(
        n_rating='High', p_rating='High', k_rating='High',
        moisture=45, crop='Wheat', soil_type='Loamy',
        growth_stage='Sowing', ph=7.8,
    )
    print(json.dumps(result2, indent=2))
