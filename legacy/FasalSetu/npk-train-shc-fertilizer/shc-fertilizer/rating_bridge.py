"""
SHC RATING BRIDGE
Solves the core problem: real Soil Health Card N/P/K values (kg/ha lab
measurements) live on a completely different numeric scale than the small
99-row fertilizer-training dataset's N/P/K columns (which are a synthetic
0-42 teaching scale, not real lab units).

Feeding real SHC kg/ha numbers straight into a classifier trained on the
0-42 scale would put every input wildly outside the training distribution
-> garbage predictions.

THE FIX: don't match on raw value. Match on RELATIVE DEFICIENCY RANK.

Soil Health Cards already classify each nutrient as Low / Medium / High
(this is literally in the government's own rating methodology, and it's the
`N_rating` / `P_rating` / `K_rating` columns already present in the
Cards_info schema from shc-local-scraper's local_db.py).

This module:
  1. Computes the same Low/Medium/High tertile bucket *within* the training
     dataset's own N/P/K distributions.
  2. Given a real SHC row's rating (Low/Medium/High) for each nutrient,
     samples a representative *numeric* value from the matching bucket in
     the training dataset's scale.
  3. That synthetic-but-rank-correct value is what actually gets fed to the
     classifier -- so the model always sees inputs from its own training
     distribution, regardless of what the real-world lab value was.

This is a legitimate, if approximate, domain-adaptation technique for a
hackathon timeline. It is NOT a substitute for retraining on real SHC-scale
data long-term -- see the README section "Known Limitation" for the honest
caveat to disclose to judges.
"""

import pandas as pd
import numpy as np
import json
import os

TRAINING_CSV = os.path.join(os.path.dirname(__file__), 'data', 'fertilizer_prediction_base.csv')


def _load_base_df():
    df = pd.read_csv(TRAINING_CSV)
    df.columns = [c.strip() for c in df.columns]
    return df


def compute_tertile_bounds(df=None):
    """
    For each of Nitrogen / Phosphorous / Potassium, compute the value
    boundaries that split the training set into Low / Medium / High thirds.
    Returns a dict like:
        {'Nitrogen': {'low_max': 10.0, 'medium_max': 21.0}, ...}
    (anything <= low_max is Low, <= medium_max is Medium, else High)

    NOTE -- Potassium in this 99-row dataset is heavily zero-inflated
    (median K = 0; roughly two-thirds of rows have K exactly 0). A naive
    quantile(1/3)/quantile(2/3) split collapses Low and Medium into the
    same bucket (both land on 0), which would make "Medium K" and "Low K"
    indistinguishable. We detect that collapse and fall back to splitting
    the non-zero remainder by its own median, so Medium/High stay
    meaningfully distinct from Low.
    """
    if df is None:
        df = _load_base_df()

    bounds = {}
    for col in ['Nitrogen', 'Phosphorous', 'Potassium']:
        low_max = df[col].quantile(1/3)
        medium_max = df[col].quantile(2/3)

        if medium_max <= low_max:
            # Degenerate/zero-inflated case -- split the remainder above
            # low_max by its own median instead.
            remainder = df[df[col] > low_max][col]
            if len(remainder) > 0:
                medium_max = float(remainder.median())
                if medium_max <= low_max:
                    # still degenerate (e.g. only one distinct nonzero
                    # value) -- nudge it up so Medium isn't empty
                    medium_max = low_max + 1e-9
            else:
                medium_max = low_max  # every value is identical; buckets
                                       # will all resolve to the same value,
                                       # which is honestly correct here

        bounds[col] = {'low_max': float(low_max), 'medium_max': float(medium_max)}
    return bounds


def rating_to_value(nutrient_col, rating, df=None, bounds=None, rng=None):
    """
    Given a Low/Medium/High SHC RATING (soil nutrient status -- Low means
    the soil is DEFICIENT in that nutrient), return a representative
    numeric value on the TRAINING SET's scale.

    IMPORTANT SEMANTIC INVERSION -- read this before changing anything:
    The base training set's Nitrogen/Phosphorous/Potassium columns do NOT
    represent nutrient present in soil. Empirically verified (see
    train_fertilizer_model.py's grid sanity check output, and directly:
    Urea rows have Nitrogen clustered at 35-42, the TOP of the observed
    4-42 range; DAP rows have Phosphorous clustered at 35-42 similarly).
    That only makes sense if these columns represent nutrient NEEDED /
    TO BE APPLIED -- i.e. "how much N does this field need" -- not "how
    much N is already in the soil."

    So: SHC "Low" (soil deficient, field needs a LOT of that nutrient
    applied) must map to the training set's HIGH tertile, and SHC "High"
    (soil already sufficient, field needs LITTLE applied) maps to the
    training set's LOW tertile. Medium maps to Medium either way.

    Getting this backwards (as an earlier version of this function did)
    silently produces agronomically-inverted recommendations that still
    run without error -- it will only surface as "the model recommends
    Urea for High-N soil" if you specifically grid-check it. Always run
    validate_model_grid.py's Urea-share sanity check after touching this
    function.

    nutrient_col: one of 'Nitrogen', 'Phosphorous', 'Potassium'
    rating: 'Low' / 'Medium' / 'High' (case-insensitive; also accepts
            SHC's sometimes-used 'L'/'M'/'H' shorthand)
    """
    if df is None:
        df = _load_base_df()
    if bounds is None:
        bounds = compute_tertile_bounds(df)
    if rng is None:
        rng = np.random.default_rng()

    rating_norm = rating.strip().lower()[0]  # 'l', 'm', or 'h'

    # INVERSION: soil-deficiency rating -> application-need tertile
    inverted = {'l': 'h', 'm': 'm', 'h': 'l'}
    tertile_to_sample = inverted.get(rating_norm)
    if tertile_to_sample is None:
        raise ValueError(f"Unrecognized rating '{rating}' -- expected Low/Medium/High")

    b = bounds[nutrient_col]
    if tertile_to_sample == 'l':
        subset = df[df[nutrient_col] <= b['low_max']]
    elif tertile_to_sample == 'm':
        subset = df[(df[nutrient_col] > b['low_max']) & (df[nutrient_col] <= b['medium_max'])]
    else:  # 'h'
        subset = df[df[nutrient_col] > b['medium_max']]

    if len(subset) == 0:
        # tertile edge case (can happen with heavily tied values) -- fall
        # back to the full column's median rather than crashing
        return float(df[nutrient_col].median())

    return float(rng.choice(subset[nutrient_col].values))


def shc_row_to_training_features(shc_row: dict, df=None, bounds=None, rng=None):
    """
    Bridge a real scraped SHC row (as produced by shc-local-scraper's
    EXPORT command -- has N_rating/P_rating/K_rating columns) into the
    {Nitrogen, Phosphorous, Potassium} feature space the fertilizer
    classifier expects.

    shc_row expected keys (all optional except at least one rating):
        'N_rating', 'P_rating', 'K_rating'  -- 'Low'/'Medium'/'High'
        (if a rating is missing/null, defaults to 'Medium' -- flagged in
         the returned dict's '_assumptions' list so the UI can show the
         farmer which values were assumed rather than measured)

    Returns:
        dict with Nitrogen/Phosphorous/Potassium (numeric, training-scale)
        plus '_assumptions': list of any nutrients that had to default
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

    for col, rating in rating_map.items():
        if not rating or (isinstance(rating, float) and pd.isna(rating)):
            rating = 'Medium'
            assumptions.append(col)
        result[col] = rating_to_value(col, rating, df=df, bounds=bounds, rng=rng)

    result['_assumptions'] = assumptions
    return result


def shc_numeric_to_rating(value, min_normal, max_normal):
    """
    Fallback path: if an SHC row has numeric N_value/min_normal/max_normal
    but no explicit text rating (some card formats report differently),
    derive Low/Medium/High from where the value sits relative to the
    card's own stated normal range -- this mirrors what the government
    portal's own rating logic does internally.
    """
    if value is None or min_normal is None or max_normal is None:
        return 'Medium'
    if value < min_normal:
        return 'Low'
    elif value > max_normal:
        return 'High'
    else:
        return 'Medium'


if __name__ == "__main__":
    # Quick self-test / demonstration
    df = _load_base_df()
    bounds = compute_tertile_bounds(df)
    print("Tertile bounds computed from the 99-row training set:")
    print(json.dumps(bounds, indent=2))

    print("\nExample: bridging a real SHC row rated Low-N / High-P / Medium-K")
    example_shc_row = {'N_rating': 'Low', 'P_rating': 'High', 'K_rating': 'Medium'}
    bridged = shc_row_to_training_features(example_shc_row, df=df, bounds=bounds)
    print(json.dumps(bridged, indent=2))

    print("\nExample: SHC row missing a rating (defaults to Medium, flagged)")
    example_missing = {'N_rating': 'Low', 'P_rating': None, 'K_rating': 'Low'}
    bridged2 = shc_row_to_training_features(example_missing, df=df, bounds=bounds)
    print(json.dumps(bridged2, indent=2))
