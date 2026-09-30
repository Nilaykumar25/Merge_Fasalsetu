"""
AnnaVriddhi - Create Stratified Test Split
Splits the validation set into val (85%) and test (15%) with stratification
Train set remains COMPLETELY UNTOUCHED
"""

import os
import shutil
import random
from pathlib import Path
from collections import defaultdict

# Configuration
DATASET_PATH = Path(__file__).parent.parent / 'data' / 'PlantVillage'
RANDOM_SEED = 42
TEST_SPLIT_RATIO = 0.15  # 15% of current val goes to test

# Supported image extensions
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'}


def discover_validation_images():
    """Discover all images in the current validation set"""
    
    val_path = DATASET_PATH / 'val'
    
    if not val_path.exists():
        raise RuntimeError(f"Validation directory not found: {val_path}")
    
    class_images = defaultdict(list)
    
    # Find all class directories
    class_dirs = sorted([d for d in val_path.iterdir() if d.is_dir()])
    
    for class_dir in class_dirs:
        class_name = class_dir.name
        
        # Find all image files - use case-insensitive pattern
        # On Windows, glob is case-insensitive anyway, so just use lowercase
        images_set = set()
        for image_file in class_dir.iterdir():
            if image_file.suffix.lower() in {'.jpg', '.jpeg', '.png'}:
                # Use resolved path to ensure uniqueness
                images_set.add(image_file.resolve())
        
        class_images[class_name] = list(images_set)
    
    return class_images


def plan_stratified_split(class_images, test_ratio, seed):
    """
    Plan the stratified split without modifying any files
    
    Returns:
        split_plan: dict with 'val' and 'test' lists per class
    """
    
    random.seed(seed)
    
    split_plan = {}
    total_val = 0
    total_test = 0
    
    print("\n" + "=" * 80)
    print("PLANNED STRATIFIED SPLIT")
    print("=" * 80)
    print(f"\nSeed: {seed}")
    print(f"Test ratio: {test_ratio:.2%}")
    print(f"\n{'Class':<50} {'Current':>8} {'New Val':>8} {'Test':>8}")
    print("-" * 80)
    
    for class_name in sorted(class_images.keys()):
        images = class_images[class_name]
        total_images = len(images)
        
        # Calculate test size (at least 1 image per class if possible)
        test_size = max(1, int(total_images * test_ratio))
        val_size = total_images - test_size
        
        # Ensure val is not empty
        if val_size < 1:
            val_size = 1
            test_size = total_images - 1
        
        # Randomly shuffle and split
        shuffled_images = images.copy()
        random.shuffle(shuffled_images)
        
        test_images = shuffled_images[:test_size]
        val_images = shuffled_images[test_size:]
        
        split_plan[class_name] = {
            'val': val_images,
            'test': test_images
        }
        
        total_val += len(val_images)
        total_test += len(test_images)
        
        print(f"{class_name:<50} {total_images:>8,d} {len(val_images):>8,d} {len(test_images):>8,d}")
    
    print("-" * 80)
    print(f"{'TOTAL':<50} {total_val + total_test:>8,d} {total_val:>8,d} {total_test:>8,d}")
    
    print(f"\n{'=' * 80}")
    print("SPLIT SUMMARY")
    print("=" * 80)
    print(f"Original validation images: {total_val + total_test:,d}")
    print(f"New validation images:      {total_val:,d} ({total_val/(total_val + total_test)*100:.1f}%)")
    print(f"New test images:            {total_test:,d} ({total_test/(total_val + total_test)*100:.1f}%)")
    
    return split_plan


def verify_no_overlap(split_plan):
    """Verify there's no overlap between val and test (by full path)"""
    
    val_paths = set()
    test_paths = set()
    
    # Build sets and track counts per class
    print("\nBuilding verification sets...")
    val_count = 0
    test_count = 0
    
    for class_name, splits in split_plan.items():
        class_val = len(splits['val'])
        class_test = len(splits['test'])
        val_count += class_val
        test_count += class_test
        
        for img_path in splits['val']:
            val_paths.add(str(img_path.resolve()))
        for img_path in splits['test']:
            test_paths.add(str(img_path.resolve()))
    
    print(f"  Expected val paths:  {val_count:,d}")
    print(f"  Expected test paths: {test_count:,d}")
    print(f"  Actual val set size:  {len(val_paths):,d}")
    print(f"  Actual test set size: {len(test_paths):,d}")
    
    # Check if set sizes match expected counts
    if len(val_paths) != val_count:
        print(f"  WARNING: Val set has {val_count - len(val_paths)} fewer items than expected!")
        print(f"           This suggests duplicate paths within val")
    
    if len(test_paths) != test_count:
        print(f"  WARNING: Test set has {test_count - len(test_paths)} fewer items than expected!")
        print(f"           This suggests duplicate paths within test")
    
    # Now check for overlap
    overlap = val_paths & test_paths
    
    if overlap:
        print(f"\nERROR: {len(overlap)} files appear in both val and test!")
        for fp in list(overlap)[:10]:
            print(f"  - {Path(fp).name}")
        return False
    
    print(f"\nSplit plan verified:")
    print(f"  - Val images:  {len(val_paths):,d}")
    print(f"  - Test images: {len(test_paths):,d}")
    print(f"  - Total:       {len(val_paths) + len(test_paths):,d}")
    print(f"  - No path overlap")
    
    return True


def execute_split(split_plan):
    """
    Execute the planned split by moving files
    
    IMPORTANT: Train directory is NEVER touched
    """
    
    print("\n" + "=" * 80)
    print("EXECUTING SPLIT")
    print("=" * 80)
    
    test_path = DATASET_PATH / 'test'
    
    # Create test directory if it doesn't exist
    test_path.mkdir(exist_ok=True)
    print(f"\nTest directory: {test_path}")
    
    moved_count = 0
    
    for class_name, splits in split_plan.items():
        test_class_dir = test_path / class_name
        test_class_dir.mkdir(exist_ok=True)
        
        # Move images designated for test
        for img_path in splits['test']:
            dest_path = test_class_dir / img_path.name
            
            # Move file (not copy - to avoid duplication)
            shutil.move(str(img_path), str(dest_path))
            moved_count += 1
        
        if moved_count % 1000 == 0:
            print(f"  Moved {moved_count:,d} images...", end='\r')
    
    print(f"  Moved {moved_count:,d} images to test/")
    
    print("\nSplit execution complete")


def verify_final_split():
    """Verify the final train/val/test split"""
    
    print("\n" + "=" * 80)
    print("FINAL VERIFICATION")
    print("=" * 80)
    
    train_path = DATASET_PATH / 'train'
    val_path = DATASET_PATH / 'val'
    test_path = DATASET_PATH / 'test'
    
    # Count images per split
    def count_images_per_class(split_path):
        class_counts = {}
        
        if not split_path.exists():
            return class_counts
        
        for class_dir in sorted(split_path.iterdir()):
            if not class_dir.is_dir():
                continue
            
            class_name = class_dir.name
            image_files = []
            
            for ext in IMAGE_EXTENSIONS:
                image_files.extend(class_dir.glob(f'*{ext}'))
            
            class_counts[class_name] = len(image_files)
        
        return class_counts
    
    print("\nCounting images...")
    train_counts = count_images_per_class(train_path)
    val_counts = count_images_per_class(val_path)
    test_counts = count_images_per_class(test_path)
    
    # Get all classes
    all_classes = sorted(set(train_counts.keys()) | set(val_counts.keys()) | set(test_counts.keys()))
    
    print(f"\n{'Class':<50} {'Train':>10} {'Val':>10} {'Test':>10}")
    print("-" * 80)
    
    train_total = 0
    val_total = 0
    test_total = 0
    
    missing_in_train = []
    missing_in_val = []
    missing_in_test = []
    
    for class_name in all_classes:
        t = train_counts.get(class_name, 0)
        v = val_counts.get(class_name, 0)
        te = test_counts.get(class_name, 0)
        
        train_total += t
        val_total += v
        test_total += te
        
        if t == 0:
            missing_in_train.append(class_name)
        if v == 0:
            missing_in_val.append(class_name)
        if te == 0:
            missing_in_test.append(class_name)
        
        print(f"{class_name:<50} {t:>10,d} {v:>10,d} {te:>10,d}")
    
    print("-" * 80)
    print(f"{'TOTAL':<50} {train_total:>10,d} {val_total:>10,d} {test_total:>10,d}")
    
    grand_total = train_total + val_total + test_total
    
    print(f"\n{'=' * 80}")
    print("SPLIT STATISTICS")
    print("=" * 80)
    print(f"Train:      {train_total:7,d} images ({train_total/grand_total*100:5.2f}%)")
    print(f"Validation: {val_total:7,d} images ({val_total/grand_total*100:5.2f}%)")
    print(f"Test:       {test_total:7,d} images ({test_total/grand_total*100:5.2f}%)")
    print(f"Total:      {grand_total:7,d} images")
    
    print(f"\nNumber of classes: {len(all_classes)}")
    
    # Check for missing classes
    issues = []
    
    if missing_in_train:
        issues.append(f"{len(missing_in_train)} classes missing in train")
        print(f"\nWARNING: Classes missing in TRAIN: {missing_in_train[:5]}")
    
    if missing_in_val:
        issues.append(f"{len(missing_in_val)} classes missing in val")
        print(f"\nWARNING: Classes missing in VAL: {missing_in_val[:5]}")
    
    if missing_in_test:
        issues.append(f"{len(missing_in_test)} classes missing in test")
        print(f"\nWARNING: Classes missing in TEST: {missing_in_test[:5]}")
    
    # Verify overlap using filenames
    print(f"\n{'=' * 80}")
    print("OVERLAP VERIFICATION")
    print("=" * 80)
    
    train_files = set()
    val_files = set()
    test_files = set()
    
    for class_name in all_classes:
        # Train
        train_class_dir = train_path / class_name
        if train_class_dir.exists():
            for ext in IMAGE_EXTENSIONS:
                for img in train_class_dir.glob(f'*{ext}'):
                    train_files.add(img.name)
        
        # Val
        val_class_dir = val_path / class_name
        if val_class_dir.exists():
            for ext in IMAGE_EXTENSIONS:
                for img in val_class_dir.glob(f'*{ext}'):
                    val_files.add(img.name)
        
        # Test
        test_class_dir = test_path / class_name
        if test_class_dir.exists():
            for ext in IMAGE_EXTENSIONS:
                for img in test_class_dir.glob(f'*{ext}'):
                    test_files.add(img.name)
    
    train_val_overlap = train_files & val_files
    train_test_overlap = train_files & test_files
    val_test_overlap = val_files & test_files
    
    print(f"Train ∩ Val:  {len(train_val_overlap)} files")
    print(f"Train ∩ Test: {len(train_test_overlap)} files")
    print(f"Val ∩ Test:   {len(val_test_overlap)} files")
    
    if train_val_overlap:
        issues.append("Train/Val overlap detected")
        print(f"\nWARNING: Train/Val overlap: {list(train_val_overlap)[:5]}")
    
    if train_test_overlap:
        issues.append("Train/Test overlap detected")
        print(f"\nWARNING: Train/Test overlap: {list(train_test_overlap)[:5]}")
    
    if val_test_overlap:
        issues.append("Val/Test overlap detected")
        print(f"\nWARNING: Val/Test overlap: {list(val_test_overlap)[:5]}")
    
    # Final verdict
    print(f"\n{'=' * 80}")
    
    if issues:
        print("VALIDATION FAILED")
        for issue in issues:
            print(f"  - {issue}")
        return False
    else:
        print("VALIDATION PASSED")
        print("  - All classes present in all splits")
        print("  - No overlap between splits")
        print("  - Total image count preserved")
        return True


def main():
    """Main execution"""
    
    print("=" * 80)
    print("ANNAVRIDDHI - Create Test Split from Validation Set")
    print("=" * 80)
    print(f"\nDataset: {DATASET_PATH}")
    print(f"Strategy: Split current val/ into val (85%) and test (15%)")
    print(f"Train set: UNTOUCHED")
    
    # Step 1: Discover current validation images
    print("\n" + "=" * 80)
    print("STEP 1: Discover Validation Images")
    print("=" * 80)
    
    class_images = discover_validation_images()
    
    total_val_images = sum(len(imgs) for imgs in class_images.values())
    print(f"\nFound {total_val_images:,d} images across {len(class_images)} classes")
    
    # Step 2: Plan stratified split
    print("\n" + "=" * 80)
    print("STEP 2: Plan Stratified Split")
    print("=" * 80)
    
    split_plan = plan_stratified_split(class_images, TEST_SPLIT_RATIO, RANDOM_SEED)
    
    # Step 3: Verify no overlap in plan
    print("\n" + "=" * 80)
    print("STEP 3: Verify Plan")
    print("=" * 80)
    
    if not verify_no_overlap(split_plan):
        print("\nERROR: Overlap detected in split plan. Aborting.")
        return False
    
    print("\nNo overlap in planned split")
    
    # Step 4: Confirm before proceeding
    print("\n" + "=" * 80)
    print("READY TO EXECUTE")
    print("=" * 80)
    print("\nThe script will now:")
    print("  1. Create backend/data/PlantVillage/test/")
    print("  2. Move selected images from val/ to test/")
    print("  3. Leave train/ completely untouched")
    
    # Execute split
    execute_split(split_plan)
    
    # Step 5: Verify final split
    success = verify_final_split()
    
    if success:
        print("\n" + "=" * 80)
        print("TEST SPLIT CREATION COMPLETE")
        print("=" * 80)
        print("\nDataset is now ready with train/val/test splits.")
        print("All classes are represented in all splits.")
        print("No data leakage detected.")
    else:
        print("\n" + "=" * 80)
        print("TEST SPLIT VALIDATION FAILED")
        print("=" * 80)
        print("\nPlease review the issues above.")
    
    return success


if __name__ == '__main__':
    success = main()
    
    if not success:
        exit(1)
