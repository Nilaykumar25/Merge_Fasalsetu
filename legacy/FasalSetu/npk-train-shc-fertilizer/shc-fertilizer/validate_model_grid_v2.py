"""
GRID SANITY-CHECK V2
Same purpose as v1's validate_model_grid.py -- test the DEPLOYED
bridge -> classifier path, not just training accuracy -- extended with a
second directional check specific to v2: does Compost dominate at low
(acidic) pH, and Zinc Sulphate at high (alkaline) pH, matching the pattern
verified directly against the training data (Compost mean pH 5.32,
Zinc Sulphate mean pH 7.75, overall mean 6.49)?
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from fertilizer_agent_v2 import FertilizerAgentV2
import collections

RATINGS = ['Low', 'Medium', 'High']
SAMPLE_CROPS = ['Wheat', 'Rice', 'Cotton']
SAMPLE_SOILS = ['Loamy', 'Sandy']
SAMPLE_STAGES = ['Vegetative', 'Flowering']
PH_LEVELS = {'acidic': 5.3, 'neutral': 6.5, 'alkaline': 7.8}


def run_grid(model_path='fertilizer_model_v2.pkl', low_confidence_threshold=0.4):
    agent = FertilizerAgentV2(model_path=model_path, shc_csv_path=None)

    print("=" * 100)
    print(f"GRID SANITY CHECK V2  --  model: {model_path}")
    print("=" * 100)

    results = []
    total = 0
    low_conf = 0

    for n_rating in RATINGS:
        for p_rating in RATINGS:
            for k_rating in RATINGS:
                for ph_label, ph_val in PH_LEVELS.items():
                    for crop in SAMPLE_CROPS:
                        for soil in SAMPLE_SOILS:
                            for stage in SAMPLE_STAGES:
                                total += 1
                                r = agent.recommend_from_manual_npk(
                                    n_rating=n_rating, p_rating=p_rating, k_rating=k_rating,
                                    moisture=45, crop=crop, soil_type=soil,
                                    growth_stage=stage, ph=ph_val,
                                )
                                if not r['success']:
                                    continue
                                if r['confidence'] < low_confidence_threshold:
                                    low_conf += 1
                                results.append({
                                    'n': n_rating, 'p': p_rating, 'k': k_rating,
                                    'ph_label': ph_label, 'crop': crop, 'soil': soil, 'stage': stage,
                                    'fertilizer': r['fertilizer'], 'confidence': r['confidence'],
                                })

    print(f"\nTotal combinations tested: {total}")
    print(f"Low-confidence (<{low_confidence_threshold}) predictions: {low_conf} "
          f"({100*low_conf/total:.0f}%)")

    # Check 1: N/P/K directionality (same test as v1)
    low_n = collections.Counter(r['fertilizer'] for r in results if r['n'] == 'Low')
    low_k = collections.Counter(r['fertilizer'] for r in results if r['k'] == 'Low')
    urea_low_n = low_n.get('Urea', 0) / max(1, sum(low_n.values()))
    urea_low_k = low_k.get('Urea', 0) / max(1, sum(low_k.values()))
    print(f"\n[Check 1] Urea share when N=Low: {urea_low_n:.0%}  |  when K=Low: {urea_low_k:.0%}")
    check1 = urea_low_n > urea_low_k
    print("  ✓ PASSED" if check1 else "  ⚠ FAILED")

    mop_low_k = low_k.get('MOP', 0) / max(1, sum(low_k.values()))
    mop_low_n = low_n.get('MOP', 0) / max(1, sum(low_n.values()))
    print(f"[Check 1b] MOP share when K=Low: {mop_low_k:.0%}  |  when N=Low: {mop_low_n:.0%}")
    check1b = mop_low_k > mop_low_n
    print("  ✓ PASSED" if check1b else "  ⚠ FAILED")

    # Check 2: pH directionality (new for v2)
    acidic = collections.Counter(r['fertilizer'] for r in results if r['ph_label'] == 'acidic')
    alkaline = collections.Counter(r['fertilizer'] for r in results if r['ph_label'] == 'alkaline')
    compost_acidic = acidic.get('Compost', 0) / max(1, sum(acidic.values()))
    compost_alkaline = alkaline.get('Compost', 0) / max(1, sum(alkaline.values()))
    zinc_acidic = acidic.get('Zinc Sulphate', 0) / max(1, sum(acidic.values()))
    zinc_alkaline = alkaline.get('Zinc Sulphate', 0) / max(1, sum(alkaline.values()))

    print(f"\n[Check 2] Compost share at acidic pH: {compost_acidic:.0%}  |  at alkaline pH: {compost_alkaline:.0%}")
    check2 = compost_acidic > compost_alkaline
    print("  ✓ PASSED" if check2 else "  ⚠ FAILED")

    print(f"[Check 2b] Zinc Sulphate share at alkaline pH: {zinc_alkaline:.0%}  |  at acidic pH: {zinc_acidic:.0%}")
    check2b = zinc_alkaline > zinc_acidic
    print("  ✓ PASSED" if check2b else "  ⚠ FAILED")

    all_passed = check1 and check1b and check2 and check2b
    print("\n" + "=" * 100)
    print("ALL DIRECTIONAL CHECKS PASSED ✓" if all_passed else "SOME CHECKS FAILED ⚠ -- investigate before demoing")
    print("=" * 100)

    return results


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="fertilizer_model_v2.pkl")
    args = parser.parse_args()
    run_grid(model_path=args.model)
