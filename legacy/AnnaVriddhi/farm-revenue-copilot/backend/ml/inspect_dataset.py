"""
AnnaVriddhi - Fast Parallel PlantVillage Dataset Inspection
Uses multiprocessing for rapid dataset analysis
"""

import os
import sys
import time
import argparse
from pathlib import Path
from collections import defaultdict, Counter
from multiprocessing import Pool, cpu_count, Manager
from functools import partial
from PIL import Image

# Dataset path
DATASET_PATH = Path(__file__).parent.parent / 'data' / 'PlantVillage'

# Supported image extensions
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'}


def process_image_batch(image_paths, progress_counter=None, lock=None):
    """
    Process a batch of images and return metadata
    
    Returns: list of dicts with image metadata
    """
    results = []
    
    for img_path_str in image_paths:
        img_path = Path(img_path_str)
        
        metadata = {
            'path': str(img_path),
            'filename': img_path.name,
            'class_name': img_path.parent.name,
            'split': img_path.parent.parent.name,
            'extension': img_path.suffix.lower(),
            'file_size': 0,
            'width': None,
            'height': None,
            'readable': False,
            'error': None
        }
        
        try:
            # Get file size (cheap operation)
            metadata['file_size'] = img_path.stat().st_size
            
            # Open image to get dimensions and verify readability
            with Image.open(img_path) as img:
                metadata['width'] = img.width
                metadata['height'] = img.height
                metadata['readable'] = True
                
        except Exception as e:
            metadata['error'] = str(e)[:100]
        
        results.append(metadata)
        
        # Update progress
        if progress_counter is not None and lock is not None:
            with lock:
                progress_counter.value += 1
    
    return results


def discover_images(dataset_path):
    """Quickly discover all image files in the dataset"""
    
    print(f"Discovering images in {dataset_path}...")
    
    splits_data = {}
    
    for split_name in ['train', 'val', 'test']:
        split_path = dataset_path / split_name
        
        if not split_path.exists():
            splits_data[split_name] = {'exists': False, 'images': [], 'classes': set()}
            continue
        
        images = []
        classes = set()
        
        # Find all class directories
        class_dirs = [d for d in split_path.iterdir() if d.is_dir()]
        
        for class_dir in class_dirs:
            class_name = class_dir.name
            classes.add(class_name)
            
            # Find all image files
            for ext in IMAGE_EXTENSIONS:
                images.extend(class_dir.glob(f'*{ext}'))
        
        splits_data[split_name] = {
            'exists': True,
            'images': [str(img) for img in images],
            'classes': classes
        }
        
        print(f"  {split_name:5s}: {len(images):6,d} images, {len(classes):2d} classes")
    
    return splits_data


def inspect_dataset_parallel(workers=None, batch_size=500):
    """
    Fast parallel dataset inspection
    
    Args:
        workers: Number of worker processes (None = auto-detect)
        batch_size: Images per batch for each worker
    """
    
    start_time = time.time()
    
    print("=" * 80)
    print("ANNAVRIDDHI - PlantVillage Dataset Inspection (Parallel)")
    print("=" * 80)
    
    # Check dataset exists
    if not DATASET_PATH.exists():
        print(f"\n❌ ERROR: Dataset not found at {DATASET_PATH}")
        return None
    
    print(f"\nDataset: {DATASET_PATH}")
    
    # Determine worker count
    available_cpus = cpu_count()
    if workers is None:
        workers = max(1, available_cpus - 1)  # Leave one CPU free
    workers = min(workers, available_cpus, 16)  # Cap at 16 workers
    
    print(f"Workers: {workers}")
    print(f"Batch size: {batch_size}")
    print()
    
    # Phase 1: Discover all images (fast filesystem scan)
    discovery_start = time.time()
    splits_data = discover_images(DATASET_PATH)
    discovery_time = time.time() - discovery_start
    
    print(f"\nDiscovery completed in {discovery_time:.2f}s")
    
    # Collect all images to process
    all_images = []
    for split_name, split_info in splits_data.items():
        if split_info['exists']:
            all_images.extend(split_info['images'])
    
    total_images = len(all_images)
    
    if total_images == 0:
        print("\n❌ ERROR: No images found in dataset")
        return None
    
    print(f"\nProcessing {total_images:,} images with {workers} workers...")
    
    # Phase 2: Parallel image inspection
    inspection_start = time.time()
    
    # Create batches
    batches = [all_images[i:i + batch_size] for i in range(0, len(all_images), batch_size)]
    
    # Progress tracking
    manager = Manager()
    progress_counter = manager.Value('i', 0)
    lock = manager.Lock()
    
    # Process batches in parallel
    process_func = partial(process_image_batch, progress_counter=progress_counter, lock=lock)
    
    all_results = []
    
    with Pool(processes=workers) as pool:
        # Start processing
        async_results = [pool.apply_async(process_func, (batch,)) for batch in batches]
        
        # Monitor progress
        last_progress = 0
        while any(not ar.ready() for ar in async_results):
            current_progress = progress_counter.value
            if current_progress > last_progress:
                pct = (current_progress / total_images) * 100
                print(f"  Progress: {current_progress:6,d} / {total_images:6,d} ({pct:5.1f}%)", end='\r')
                last_progress = current_progress
            time.sleep(0.1)
        
        # Collect results
        for ar in async_results:
            all_results.extend(ar.get())
    
    print(f"  Progress: {total_images:6,d} / {total_images:6,d} (100.0%)")
    
    inspection_time = time.time() - inspection_start
    
    print(f"\nInspection completed in {inspection_time:.2f}s")
    print(f"Speed: {total_images / inspection_time:.0f} images/second")
    
    # Phase 3: Aggregate results
    print("\nAggregating results...")
    
    class_stats = defaultdict(lambda: defaultdict(int))
    format_counts = Counter()
    dimension_counts = Counter()
    corrupted = []
    filename_overlaps = []
    
    # Split-specific tracking
    train_filenames = set()
    val_filenames = set()
    train_filesizes = defaultdict(list)  # size -> list of (filename, class)
    val_filesizes = defaultdict(list)
    
    for result in all_results:
        split = result['split']
        class_name = result['class_name']
        
        if result['readable']:
            class_stats[class_name][split] += 1
            format_counts[result['extension']] += 1
            
            if result['width'] and result['height']:
                dimension_counts[(result['width'], result['height'])] += 1
            
            # Track for overlap detection
            if split == 'train':
                train_filenames.add(result['filename'])
                train_filesizes[result['file_size']].append((result['filename'], class_name))
            elif split == 'val':
                val_filenames.add(result['filename'])
                val_filesizes[result['file_size']].append((result['filename'], class_name))
        else:
            corrupted.append(result)
    
    # Detect potential overlaps (lightweight check)
    filename_overlap_set = train_filenames & val_filenames
    
    # Check for identical file sizes (suspicious)
    size_overlaps = []
    for size in train_filesizes.keys():
        if size in val_filesizes:
            if len(train_filesizes[size]) == 1 and len(val_filesizes[size]) == 1:
                train_file, train_class = train_filesizes[size][0]
                val_file, val_class = val_filesizes[size][0]
                if train_file == val_file or train_class == val_class:
                    size_overlaps.append({
                        'train_file': train_file,
                        'train_class': train_class,
                        'val_file': val_file,
                        'val_class': val_class,
                        'size': size
                    })
    
    # Get statistics
    all_classes = sorted(class_stats.keys())
    num_classes = len(all_classes)
    
    train_count = sum(stats['train'] for stats in class_stats.values())
    val_count = sum(stats['val'] for stats in class_stats.values())
    test_count = sum(stats['test'] for stats in class_stats.values())
    
    train_classes = {c for c, stats in class_stats.items() if stats['train'] > 0}
    val_classes = {c for c, stats in class_stats.items() if stats['val'] > 0}
    
    missing_in_val = train_classes - val_classes
    missing_in_train = val_classes - train_classes
    
    total_time = time.time() - start_time
    
    # Print results
    print("\n" + "=" * 80)
    print("INSPECTION RESULTS")
    print("=" * 80)
    
    print(f"\nDataset: {DATASET_PATH}")
    print(f"Workers: {workers}")
    print(f"Total time: {total_time:.2f}s")
    print(f"Processing speed: {total_images / total_time:.0f} images/second")
    
    print(f"\n{'─' * 80}")
    print("IMAGE COUNTS")
    print(f"{'─' * 80}")
    print(f"Train:      {train_count:7,d} images")
    print(f"Validation: {val_count:7,d} images")
    print(f"Test:       {test_count:7,d} images")
    print(f"Total:      {total_images:7,d} images")
    print(f"Corrupted:  {len(corrupted):7,d} images")
    
    if train_count > 0 and val_count > 0:
        ratio = train_count / (train_count + val_count) * 100
        print(f"\nTrain/Val ratio: {ratio:.1f}% / {100 - ratio:.1f}%")
    
    print(f"\n{'─' * 80}")
    print("CLASS STATISTICS")
    print(f"{'─' * 80}")
    print(f"Total classes: {num_classes}")
    print(f"Train classes: {len(train_classes)}")
    print(f"Val classes:   {len(val_classes)}")
    
    if missing_in_val:
        print(f"\n⚠ Classes in TRAIN but missing in VAL ({len(missing_in_val)}):")
        for cls in sorted(missing_in_val)[:5]:
            print(f"  - {cls}")
        if len(missing_in_val) > 5:
            print(f"  ... and {len(missing_in_val) - 5} more")
    
    if missing_in_train:
        print(f"\n⚠ Classes in VAL but missing in TRAIN ({len(missing_in_train)}):")
        for cls in sorted(missing_in_train)[:5]:
            print(f"  - {cls}")
        if len(missing_in_train) > 5:
            print(f"  ... and {len(missing_in_train) - 5} more")
    
    print(f"\n{'─' * 80}")
    print("CLASS DISTRIBUTION (Top 20)")
    print(f"{'─' * 80}")
    print(f"{'Class':<50} {'Train':>10} {'Val':>10}")
    print(f"{'─' * 80}")
    
    # Sort by total count
    sorted_classes = sorted(all_classes, 
                           key=lambda c: class_stats[c]['train'] + class_stats[c]['val'], 
                           reverse=True)
    
    for class_name in sorted_classes[:20]:
        stats = class_stats[class_name]
        print(f"{class_name:<50} {stats['train']:>10,d} {stats['val']:>10,d}")
    
    if len(sorted_classes) > 20:
        print(f"... and {len(sorted_classes) - 20} more classes")
    
    # Image formats
    print(f"\n{'─' * 80}")
    print("IMAGE FORMATS")
    print(f"{'─' * 80}")
    for ext, count in format_counts.most_common():
        print(f"{ext:10s}: {count:7,d} images")
    
    # Dimensions
    print(f"\n{'─' * 80}")
    print("IMAGE DIMENSIONS (Top 5)")
    print(f"{'─' * 80}")
    for dims, count in dimension_counts.most_common(5):
        print(f"{dims[0]:4d} x {dims[1]:4d}: {count:7,d} images")
    
    if len(dimension_counts) > 5:
        print(f"... and {len(dimension_counts) - 5} more unique dimensions")
    
    # Overlap detection
    print(f"\n{'─' * 80}")
    print("POTENTIAL TRAIN/VAL OVERLAPS (Lightweight Check)")
    print(f"{'─' * 80}")
    print(f"Identical filenames: {len(filename_overlap_set)}")
    print(f"Suspicious size matches: {len(size_overlaps)}")
    
    if filename_overlap_set:
        print(f"\n⚠ {len(filename_overlap_set)} identical filenames found in both train and val")
        if len(filename_overlap_set) <= 10:
            for fn in sorted(filename_overlap_set):
                print(f"  - {fn}")
        else:
            for fn in sorted(filename_overlap_set)[:10]:
                print(f"  - {fn}")
            print(f"  ... and {len(filename_overlap_set) - 10} more")
    
    if size_overlaps:
        print(f"\n⚠ {len(size_overlaps)} suspicious size matches (possible duplicates):")
        for overlap in size_overlaps[:5]:
            print(f"  - {overlap['train_file']} ({overlap['train_class']}) ↔ {overlap['val_file']} ({overlap['val_class']})")
        if len(size_overlaps) > 5:
            print(f"  ... and {len(size_overlaps) - 5} more")
    
    # Corrupted images
    if corrupted:
        print(f"\n{'─' * 80}")
        print(f"⚠ CORRUPTED IMAGES ({len(corrupted)})")
        print(f"{'─' * 80}")
        for result in corrupted[:10]:
            print(f"  - {Path(result['path']).name}: {result['error']}")
        if len(corrupted) > 10:
            print(f"  ... and {len(corrupted) - 10} more")
    
    # Class imbalance check
    if train_count > 0:
        train_counts_list = [stats['train'] for stats in class_stats.values() if stats['train'] > 0]
        min_train = min(train_counts_list)
        max_train = max(train_counts_list)
        imbalance_ratio = max_train / min_train if min_train > 0 else float('inf')
        
        print(f"\n{'─' * 80}")
        print("CLASS BALANCE")
        print(f"{'─' * 80}")
        print(f"Min images/class (train): {min_train:,d}")
        print(f"Max images/class (train): {max_train:,d}")
        print(f"Imbalance ratio: {imbalance_ratio:.2f}:1")
        
        if imbalance_ratio > 3:
            print("⚠ Significant class imbalance - consider weighted loss or sampling")
        else:
            print("✓ Dataset is reasonably balanced")
    
    # Issues to address
    print(f"\n{'=' * 80}")
    print("RECOMMENDATIONS")
    print(f"{'=' * 80}")
    
    issues = []
    
    if len(corrupted) > 0:
        issues.append(f"Fix or remove {len(corrupted)} corrupted images")
    
    if not splits_data['test']['exists']:
        issues.append("Create held-out test set for final evaluation")
    
    if missing_in_val or missing_in_train:
        issues.append("Address class inconsistencies between train and val")
    
    if len(filename_overlap_set) > 0 or len(size_overlaps) > 0:
        issues.append("Investigate potential train/val data leakage")
    
    if issues:
        print("\nWARNING: Issues to address:")
        for i, issue in enumerate(issues, 1):
            print(f"  {i}. {issue}")
    else:
        print("\nDataset structure appears consistent")
    
    print(f"\n{'=' * 80}")
    
    return {
        'total_images': total_images,
        'train_count': train_count,
        'val_count': val_count,
        'test_count': test_count,
        'num_classes': num_classes,
        'class_names': all_classes,
        'corrupted_count': len(corrupted),
        'filename_overlaps': len(filename_overlap_set),
        'size_overlaps': len(size_overlaps),
        'processing_time': total_time,
        'images_per_second': total_images / total_time
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Fast parallel dataset inspection')
    parser.add_argument('--workers', type=int, default=None, 
                       help='Number of worker processes (default: auto)')
    parser.add_argument('--batch-size', type=int, default=500,
                       help='Images per batch (default: 500)')
    
    args = parser.parse_args()
    
    results = inspect_dataset_parallel(workers=args.workers, batch_size=args.batch_size)
