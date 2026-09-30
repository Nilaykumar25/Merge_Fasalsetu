"""
GRID SANITY-CHECK
CV accuracy on the training set tells you almost nothing about whether the
DEPLOYED pipeline (rating_bridge -> classifier) behaves sensibly, because
real inference always arrives via the bridge, not as raw training-set rows.

This script enumerates every combination of N/P/K rating (Low/Medium/High
-- 27 combos) x a representative sample of crops/soil types, runs each
through the ACTUAL fertilizer_agent.recommend_from_manual_npk() path (the
same code your app calls), and prints a compact table so you can eyeball
agronomic plausibility before you're on stage.

What to look for:
  - Low-N combos should skew toward Urea (or a high-N complex) more often
    than Low-K combos skew toward Urea.
  - Confidence should generally be reasonably high (>0.5) for combos that
    were actually observed in training; combos that needed a "borrowed"
    cell (see build_augmented_dataset.py output) may show lower confidence
    -- that's expected and fine, not a bug.
  - Nothing should crash or return None for a known crop/soil combination.

Run this AFTER every retrain, before you trust the model in a demo.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from fertilizer_agent import FertilizerAgent

RATINGS = ['Low', 'Medium', 'High']
SAMPLE_CROPS = ['Wheat', 'Paddy', 'Cotton']       # keep the grid readable;
SAMPLE_SOILS = ['Loamy', 'Sandy']                  # widen these lists if
                                                    # you want full coverage
MOISTURE_LEVELS = [30, 50]


def run_grid(model_path='fertilizer_model.pkl', low_confidence_threshold=0.4):
    agent = FertilizerAgent(model_path=model_path, shc_csv_path=None)

    print("=" * 100)
    print(f"GRID SANITY CHECK  --  model: {model_path}")
    print("=" * 100)
    header = f"{'N':<7}{'P':<7}{'K':<7}{'Crop':<12}{'Soil':<8}{'Moist':<7}{'-> Fertilizer':<15}{'Confidence':<12}"
    print(header)
    print("-" * len(header))

    total = 0
    low_confidence_count = 0
    results = []

    for n_rating in RATINGS:
        for p_rating in RATINGS:
            for k_rating in RATINGS:
                for crop in SAMPLE_CROPS:
                    for soil in SAMPLE_SOILS:
                        for moisture in MOISTURE_LEVELS:
                            total += 1
                            result = agent.recommend_from_manual_npk(
                                n_rating=n_rating, p_rating=p_rating, k_rating=k_rating,
                                moisture=moisture, crop=crop, soil_type=soil,
                            )
                            if not result['success']:
                                print(f"{n_rating:<7}{p_rating:<7}{k_rating:<7}{crop:<12}"
                                      f"{soil:<8}{moisture:<7}FAILED: {result.get('error')}")
                                continue

                            flag = ""
                            if result['confidence'] < low_confidence_threshold:
                                flag = "  <-- LOW CONFIDENCE"
                                low_confidence_count += 1

                            print(f"{n_rating:<7}{p_rating:<7}{k_rating:<7}{crop:<12}{soil:<8}"
                                  f"{moisture:<7}{result['fertilizer']:<15}"
                                  f"{result['confidence']:.2f}{flag}")

                            results.append({
                                'n_rating': n_rating, 'p_rating': p_rating, 'k_rating': k_rating,
                                'crop': crop, 'soil': soil, 'moisture': moisture,
                                'fertilizer': result['fertilizer'],
                                'confidence': result['confidence'],
                            })

    print("-" * len(header))
    print(f"\nTotal combinations tested: {total}")
    print(f"Low-confidence (<{low_confidence_threshold}) predictions: {low_confidence_count} "
          f"({100*low_confidence_count/total:.0f}%)")

    # Quick aggregate sanity signal: does Low-N skew toward Urea more than
    # Low-K does? (Urea is the N-only straight fertilizer in this taxonomy)
    import collections
    low_n_ferts = collections.Counter(r['fertilizer'] for r in results if r['n_rating'] == 'Low')
    low_k_ferts = collections.Counter(r['fertilizer'] for r in results if r['k_rating'] == 'Low')

    print(f"\nFertilizer distribution when N=Low:  {dict(low_n_ferts)}")
    print(f"Fertilizer distribution when K=Low:  {dict(low_k_ferts)}")
    urea_share_low_n = low_n_ferts.get('Urea', 0) / max(1, sum(low_n_ferts.values()))
    urea_share_low_k = low_k_ferts.get('Urea', 0) / max(1, sum(low_k_ferts.values()))
    print(f"\nUrea share when N=Low:  {urea_share_low_n:.0%}")
    print(f"Urea share when K=Low:  {urea_share_low_k:.0%}")
    if urea_share_low_n > urea_share_low_k:
        print("✓ Sanity check PASSED: Urea (N-specific) is recommended more often when N is the")
        print("  deficient nutrient than when K is -- the model has learned a directionally")
        print("  correct nutrient-specific pattern, not just noise.")
    else:
        print("⚠ Sanity check FAILED: Urea is not preferentially recommended for N deficiency.")
        print("  Investigate before demoing -- something's off in the bridge or training data.")

    return results


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="fertilizer_model.pkl",
                        help="Which .pkl to validate (e.g. fertilizer_model_augmented.pkl)")
    args = parser.parse_args()
    run_grid(model_path=args.model)
