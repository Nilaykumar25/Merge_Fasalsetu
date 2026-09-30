"""
RATING BRIDGE V2 -- for the richer 10,000-row miadul dataset.

DO NOT copy rating_bridge.py's inversion logic here. That inversion was
specifically needed because the OLD 99-row dataset's N/P/K columns
represented "nutrient needed" (need-based). This NEW dataset's N/P/K
columns are verified STATUS-based (soil deficiency), confirmed directly:
Urea rows have Nitrogen_Level averaging 43.9, far BELOW the overall mean
of 89.0 -- i.e. Urea (an N fertilizer) is recommended when N is actually
LOW in the soil, exactly matching what SHC's own "Low N rating" means.
So here, SHC "Low" maps DIRECTLY to this dataset's low tertile -- no
inversion. (Verified for P via DAP, and K via MOP the same way -- see
README_FERTILIZER.md's "miadul dataset" section for the full table.)

ALSO NEW: pH, Organic_Carbon, and Electrical_Conductivity do NOT need
bridging at all. Unlike N/P/K (where SHC only reliably gives a Low/Medium/
High label), SHC's Cards_info schema (from shc-local-scraper) already
carries real numeric pH_value / OC_value / EC_value in the same physical
units this dataset uses (pH 0-14 scale, OC in %, EC in dS/m) -- so those
three can be fed straight through from a real SHC row with no rank-matching
trick required. rating_bridge_v2 only exists for N/P/K.
"""

import pandas as pd
import numpy as np
import json
import os

TRAINING_CSV = os.path.join(os.path.dirname(__file__), 'data',
                             'fertilizer_recommendation_miadul.csv')

NUTRIENT_COLS = {'Nitrogen': 'Nitrogen_Level', 'Phosphorous': 'Phosphorus_Level',
                  'Potassium': 'Potassium_Level'}


def _load_base_df():
    return pd.read_csv(TRAINING_CSV)


def compute_tertile_bounds(df=None):
    if df is None:
        df = _load_base_df()
    bounds = {}
    for key, col in NUTRIENT_COLS.items():
        low_max = df[col].quantile(1/3)
        medium_max = df[col].quantile(2/3)
        if medium_max <= low_max:  # zero-inflation guard, same pattern as v1
            remainder = df[df[col] > low_max][col]
            medium_max = float(remainder.median()) if len(remainder) else low_max + 1e-9
        bounds[key] = {'low_max': float(low_max), 'medium_max': float(medium_max)}
    return bounds


def rating_to_value(nutrient_key, rating, df=None, bounds=None, rng=None):
    """Direct (non-inverted) mapping: SHC 'Low' -> this dataset's low
    tertile, matching this dataset's verified status-based semantics."""
    if df is None:
        df = _load_base_df()
    if bounds is None:
        bounds = compute_tertile_bounds(df)
    if rng is None:
        rng = np.random.default_rng()

    col = NUTRIENT_COLS[nutrient_key]
    rating_norm = rating.strip().lower()[0]
    b = bounds[nutrient_key]

    if rating_norm == 'l':
        subset = df[df[col] <= b['low_max']]
    elif rating_norm == 'm':
        subset = df[(df[col] > b['low_max']) & (df[col] <= b['medium_max'])]
    elif rating_norm == 'h':
        subset = df[df[col] > b['medium_max']]
    else:
        raise ValueError(f"Unrecognized rating '{rating}'")

    if len(subset) == 0:
        return float(df[col].median())
    return float(rng.choice(subset[col].values))


def shc_row_to_training_features(shc_row: dict, df=None, bounds=None, rng=None):
    """
    shc_row expected keys: 'N_rating', 'P_rating', 'K_rating' (Low/Medium/High)
    Returns Nitrogen_Level / Phosphorus_Level / Potassium_Level on this
    dataset's scale, plus '_assumptions' for any defaulted nutrient.
    """
    if df is None:
        df = _load_base_df()
    if bounds is None:
        bounds = compute_tertile_bounds(df)

    assumptions = []
    result = {}
    rating_map = {
        'Nitrogen': shc_row.get('N_rating'),
        'Phosphorous': shc_row.get('P_rating'),
        'Potassium': shc_row.get('K_rating'),
    }
    for key, rating in rating_map.items():
        if not rating or (isinstance(rating, float) and pd.isna(rating)):
            rating = 'Medium'
            assumptions.append(key)
        result[key] = rating_to_value(key, rating, df=df, bounds=bounds, rng=rng)

    result['_assumptions'] = assumptions
    return result


if __name__ == "__main__":
    df = _load_base_df()
    bounds = compute_tertile_bounds(df)
    print("Tertile bounds (v2, direct/non-inverted mapping):")
    print(json.dumps(bounds, indent=2))

    print("\nExample: Low-N / High-P / Medium-K")
    print(json.dumps(
        shc_row_to_training_features({'N_rating': 'Low', 'P_rating': 'High', 'K_rating': 'Medium'},
                                      df=df, bounds=bounds),
        indent=2
    ))
