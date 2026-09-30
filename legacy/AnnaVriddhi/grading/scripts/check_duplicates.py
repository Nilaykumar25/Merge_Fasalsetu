"""
Check for exact and aHash near-duplicates between train and test splits
for each crop using the generated features CSVs.

Usage:
    python check_duplicates.py --features ../features --out /tmp/dup_report.json
"""
import argparse
import hashlib
import json
from pathlib import Path
import cv2
import numpy as np
import pandas as pd


def sha256_of_file(p: Path):
    h = hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            h.update(chunk)
    return h.hexdigest()


def average_hash(p: Path, hash_size=8):
    img = cv2.imread(str(p), cv2.IMREAD_GRAYSCALE)
    if img is None:
        return None
    img = cv2.resize(img, (hash_size, hash_size), interpolation=cv2.INTER_AREA)
    avg = img.mean()
    bits = (img > avg).flatten()
    # return as hex string
    val = 0
    for b in bits:
        val = (val << 1) | int(b)
    return f"{val:0{hash_size*hash_size//4}x}"


def find_duplicates(train_paths, test_paths):
    train_hashes = {}
    test_hashes = {}
    exact_dups = []
    ahash_near = []

    for p in train_paths:
        pth = Path(p)
        if not pth.exists():
            continue
        s = sha256_of_file(pth)
        train_hashes.setdefault(s, []).append(str(pth))
    for p in test_paths:
        pth = Path(p)
        if not pth.exists():
            continue
        s = sha256_of_file(pth)
        test_hashes.setdefault(s, []).append(str(pth))

    # exact duplicates
    for h in train_hashes:
        if h in test_hashes:
            for a in train_hashes[h]:
                for b in test_hashes[h]:
                    exact_dups.append((a, b))

    # aHash near-duplicates: compute hash map of train/test and compare Hamming distance
    def hex_to_bits(hx):
        val = int(hx, 16)
        bits = bin(val)[2:]
        return bits.zfill(len(hx)*4)

    train_ah = {}
    test_ah = {}
    for p in train_paths:
        pth = Path(p)
        if not pth.exists():
            continue
        ah = average_hash(pth)
        if ah:
            train_ah.setdefault(ah, []).append(str(pth))
    for p in test_paths:
        pth = Path(p)
        if not pth.exists():
            continue
        ah = average_hash(pth)
        if ah:
            test_ah.setdefault(ah, []).append(str(pth))

    # compare all pairs of train/test a-hashes for small Hamming distance
    train_items = list(train_ah.items())
    test_items = list(test_ah.items())
    for ah_t, train_list in train_items:
        for ah_s, test_list in test_items:
            # compute hamming distance
            b1 = hex_to_bits(ah_t)
            b2 = hex_to_bits(ah_s)
            if len(b1) != len(b2):
                continue
            ham = sum(ch1 != ch2 for ch1, ch2 in zip(b1, b2))
            # threshold: <= 5 bits different for 64-bit hash
            if ham <= 5:
                for a in train_list:
                    for b in test_list:
                        ahash_near.append((a, b, ham))
    return exact_dups, ahash_near


def run(features_dir: str, out: Path):
    features_p = Path(features_dir)
    crops = {p.stem.replace('_train', '') for p in features_p.glob('*_train.csv')}
    report = {}
    for crop in sorted(crops):
        train_csv = features_p / f"{crop}_train.csv"
        test_csv = features_p / f"{crop}_test.csv"
        train_paths = pd.read_csv(train_csv)['path'].tolist() if train_csv.exists() else []
        test_paths = pd.read_csv(test_csv)['path'].tolist() if test_csv.exists() else []
        exact, near = find_duplicates(train_paths, test_paths)
        report[crop] = {'n_train': len(train_paths), 'n_test': len(test_paths), 'exact_duplicates': exact[:20], 'near_duplicates_sample': near[:20], 'exact_count': len(exact), 'near_count': len(near)}
        print(f"[{crop}] train={len(train_paths)} test={len(test_paths)} exact_dup={len(exact)} near_dup={len(near)}")
    out.write_text(json.dumps(report, indent=2))
    print('Wrote report to', out)


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--features', default='../features')
    p.add_argument('--out', default='/tmp/dup_report.json')
    args = p.parse_args()
    run(args.features, Path(args.out))
