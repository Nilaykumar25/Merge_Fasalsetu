"""
Cluster-based de-duplication and train/test splitting.

For each crop, combine existing feature rows (train+test), compute aHash for
each image, cluster hashes with single-linkage threshold, then assign whole
clusters to train/test to avoid any perceptual-duplicate crossing the split.

Usage:
    python cluster_dedupe_split.py --features grading/features --out grading/features_dedup --threshold 5 --train_frac 0.7
"""
import argparse
from pathlib import Path
import json
import random
import cv2
import pandas as pd


def average_hash(p: Path, hash_size=8):
    img = cv2.imread(str(p), cv2.IMREAD_GRAYSCALE)
    if img is None:
        return None
    img = cv2.resize(img, (hash_size, hash_size), interpolation=cv2.INTER_AREA)
    avg = img.mean()
    bits = (img > avg).flatten()
    val = 0
    for b in bits:
        val = (val << 1) | int(b)
    return f"{val:0{hash_size*hash_size//4}x}"


def hex_hamming(a: str, b: str) -> int:
    va = int(a, 16)
    vb = int(b, 16)
    x = va ^ vb
    return x.bit_count()


def cluster_hashes(hash_list, threshold=5):
    # Single-link greedy clustering over unique hashes
    uniq = list({h for h in hash_list if h is not None})
    clusters = []  # list of sets of hashes
    for h in uniq:
        placed = False
        for c in clusters:
            # compare to representative (first element) for speed
            rep = next(iter(c))
            if hex_hamming(h, rep) <= threshold:
                c.add(h)
                placed = True
                break
        if not placed:
            clusters.append({h})
    # map hash -> cluster_id
    mapping = {}
    for i, c in enumerate(clusters):
        for h in c:
            mapping[h] = i
    return mapping, len(clusters)


def run(features_dir: str, out_dir: str, threshold: int = 5, train_frac: float = 0.7, seed: int = 42):
    features_p = Path(features_dir)
    out_p = Path(out_dir)
    out_p.mkdir(parents=True, exist_ok=True)
    crops = {p.stem.replace('_train', '') for p in features_p.glob('*_train.csv')}
    summary = {}
    random.seed(seed)

    for crop in sorted(crops):
        # combine train+test if both exist
        train_csv = features_p / f"{crop}_train.csv"
        test_csv = features_p / f"{crop}_test.csv"
        parts = []
        if train_csv.exists():
            parts.append(pd.read_csv(train_csv))
        if test_csv.exists():
            parts.append(pd.read_csv(test_csv))
        if not parts:
            print(f"[{crop}] no feature CSVs found, skipping")
            continue
        df = pd.concat(parts, ignore_index=True)
        df = df.drop_duplicates(subset=['path'])
        df = df.reset_index(drop=True)

        # compute hashes
        print(f"[{crop}] computing hashes for {len(df)} images...")
        hashes = []
        for p in df['path']:
            h = average_hash(Path(p))
            hashes.append(h)

        df['ahash'] = hashes

        # cluster hashes
        mapping, n_clusters = cluster_hashes(hashes, threshold=threshold)
        df['cluster_id'] = df['ahash'].map(mapping)

        # For images with missing hash (unreadable), assign unique clusters
        missing_mask = df['cluster_id'].isna()
        if missing_mask.any():
            next_id = n_clusters
            for idx in df[missing_mask].index:
                df.at[idx, 'cluster_id'] = next_id
                next_id += 1
            n_clusters = next_id

        df['cluster_id'] = df['cluster_id'].astype(int)

        # Aggregate cluster sizes
        cluster_sizes = df.groupby('cluster_id').size().to_dict()
        cluster_grades = df.groupby('cluster_id')['grade'].agg(lambda s: s.mode().iloc[0] if len(s.mode())>0 else s.iloc[0]).to_dict()

        # Shuffle clusters and pick train clusters to reach ~train_frac of images
        clusters = list(cluster_sizes.items())  # list of (cid, size)
        random.shuffle(clusters)
        total = len(df)
        train_target = total * train_frac
        train_clusters = set()
        acc = 0
        for cid, sz in clusters:
            if acc < train_target:
                train_clusters.add(cid)
                acc += sz
            else:
                break

        train_df = df[df['cluster_id'].isin(train_clusters)].reset_index(drop=True)
        test_df = df[~df['cluster_id'].isin(train_clusters)].reset_index(drop=True)

        # write out new CSVs
        train_df.to_csv(out_p / f"{crop}_train.csv", index=False)
        test_df.to_csv(out_p / f"{crop}_test.csv", index=False)

        summary[crop] = {
            'n_total': int(total),
            'n_clusters': int(n_clusters),
            'train_count': int(len(train_df)),
            'test_count': int(len(test_df)),
            'train_frac_actual': float(len(train_df)/total)
        }
        print(f"[{crop}] clusters={n_clusters} total={total} train={len(train_df)} test={len(test_df)}")

    out_p.joinpath('summary.json').write_text(json.dumps(summary, indent=2))
    print('Wrote deduped feature CSVs to', out_p)


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--features', required=True)
    p.add_argument('--out', required=True)
    p.add_argument('--threshold', type=int, default=5)
    p.add_argument('--train_frac', type=float, default=0.7)
    p.add_argument('--seed', type=int, default=42)
    args = p.parse_args()
    run(args.features, args.out, args.threshold, args.train_frac, args.seed)
