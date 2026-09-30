"""
Diagnose the path issue causing false overlap detection
"""

from pathlib import Path
from collections import defaultdict

DATASET_PATH = Path(__file__).parent.parent / 'data' / 'PlantVillage'

val_path = DATASET_PATH / 'val'

print(f"Dataset path: {DATASET_PATH}")
print(f"Dataset path resolved: {DATASET_PATH.resolve()}")
print(f"Val path: {val_path}")
print(f"Val path resolved: {val_path.resolve()}")

# Get first class
class_dirs = sorted([d for d in val_path.iterdir() if d.is_dir()])
print(f"\nFound {len(class_dirs)} classes")

# Check first class
class_dir = class_dirs[0]
print(f"\nChecking class: {class_dir.name}")

# Get all images
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'}
images = []
for ext in IMAGE_EXTENSIONS:
    images.extend(class_dir.glob(f'*{ext}'))

print(f"Found {len(images)} images")

# Check for duplicate resolved paths
resolved_paths = defaultdict(list)
for img in images:
    resolved = str(img.resolve())
    resolved_paths[resolved].append(str(img))

duplicates = {k: v for k, v in resolved_paths.items() if len(v) > 1}

if duplicates:
    print(f"\nFOUND {len(duplicates)} duplicate resolved paths!")
    for resolved, originals in list(duplicates.items())[:5]:
        print(f"\nResolved: {resolved}")
        for orig in originals:
            print(f"  - {orig}")
else:
    print("\nNo duplicate resolved paths found in first class")

# Now check if Path objects themselves are deduplicated
print(f"\nChecking set behavior:")
path_list = images[:100]
print(f"  List length: {len(path_list)}")
path_set = set(path_list)
print(f"  Set length: {len(path_set)}")

resolved_set = {str(p.resolve()) for p in path_list}
print(f"  Resolved string set length: {len(resolved_set)}")

# Check string conversion
str_set = {str(p) for p in path_list}
print(f"  String set length: {len(str_set)}")
