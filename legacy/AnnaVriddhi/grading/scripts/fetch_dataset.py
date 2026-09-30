import argparse
import json
import shutil
from pathlib import Path

# ---------------------------------------------------------
# Fruits-360 grade mapping
# ---------------------------------------------------------
# These are the original Fruits-360 class names.
# They are mapped into our A/B/C grading system.
FRUITS360_GRADE_MAP = {
    "tomato": {
        "A": [
            "Tomato 1",
            "Tomato Cherry Red",
            "Tomato Heart",
        ],
        "B": [
            "Tomato Yellow",
            "Tomato Maroon",
        ],
        "C": [
            "Tomato not Ripened",
            "Tomato Rotten",
        ],
    },

    "onion": {
        "A": [
            "Onion White",
            "Onion Red",
        ],
        "B": [
            "Onion Red Peeled",
        ],
        "C": [],
    },

    "potato": {
        "A": [
            "Potato White",
            "Potato Red",
        ],
        "B": [
            "Potato Sweet",
        ],
        "C": [
            "Potato Red Washed",
        ],
    },

    "brinjal": {
        "A": [],
        "B": [],
        "C": [],
    },
}

# ---------------------------------------------------------
# Fresh / Rotten dataset
# ---------------------------------------------------------
FRESHROTTEN_GRADE_MAP = {
    "banana": {
        "A": ["Banana_Good"],
        "B": [],
        "C": ["Banana_Bad"],
    },

    "apple": {
        "A": ["Apple_Good"],
        "B": [],
        "C": ["Apple_Bad"],
    },

    "orange": {
        "A": ["Orange_Good"],
        "B": [],
        "C": ["Orange_Bad"],
    },

    "guava": {
        "A": ["Guava_Good"],
        "B": [],
        "C": ["Guava_Bad"],
    },

    "lime": {
        "A": ["Lime_Good"],
        "B": [],
        "C": ["Lime_Bad"],
    },

    "pomegranate": {
        "A": ["Pomegranate_Good"],
        "B": [],
        "C": ["Pomegranate_Bad"],
    },
}

# ---------------------------------------------------------
# Utility
# ---------------------------------------------------------
def copy_images(source_dir, class_names, dest, dataset, dry_run=False):
    count = 0

    for class_name in class_names:
        # Try to locate the class directory in a flexible way: allow
        # underscore/space differences and case-insensitive matches.
        class_dir = find_class_dir(source_dir, class_name)

        if class_dir is None:
            print(f"  [skip] '{class_name}' not found")
            continue

        for img in class_dir.glob("*.*"):
            if img.suffix.lower() not in (".jpg", ".jpeg", ".png"):
                continue

            target = dest / f"{dataset}_{class_name}_{img.name}"

            if not dry_run:
                shutil.copy2(img, target)

            count += 1

    return count


def get_allowed_crops():
    # Load allowed crops from grading/config/crops.json
    cfg = Path(__file__).resolve().parent.parent / "config" / "crops.json"
    try:
        with cfg.open() as f:
            j = json.load(f)
            return set(j.get("crops", []))
    except Exception:
        # If config missing or unreadable, default to keys of our maps
        return set(list(FRUITS360_GRADE_MAP.keys()) + list(FRESHROTTEN_GRADE_MAP.keys()))


def normalize_name(name: str) -> str:
    return name.lower().replace('_', ' ').replace('-', ' ').strip()


def find_class_dir(source_dir: Path, class_name: str):
    # Exact match first
    candidate = source_dir / class_name
    if candidate.exists():
        return candidate

    # Underscore variant
    candidate = source_dir / class_name.replace(' ', '_')
    if candidate.exists():
        return candidate

    # Strip spaces variant
    candidate = source_dir / class_name.replace(' ', '')
    if candidate.exists():
        return candidate

    # Case-insensitive or more flexible match
    norm_target = normalize_name(class_name)
    for p in source_dir.iterdir():
        if not p.is_dir():
            continue
        if normalize_name(p.name) == norm_target:
            return p

    return None

# ---------------------------------------------------------
# Fruits-360
# ---------------------------------------------------------
def fetch_fruits360(source_dir, out_dir, dry_run=False):

    source = Path(source_dir)
    out = Path(out_dir)

    if not source.exists():
        raise FileNotFoundError(
            f"Source dataset folder not found: {source}"
        )

    summary = {}

    # source contains crop folders like: tomato/, onion/, potato/
    allowed = get_allowed_crops()
    for crop, grade_map in FRUITS360_GRADE_MAP.items():

        # Skip any crop not in the config allowlist
        if crop not in allowed:
            print(f"[skip] Crop '{crop}' is not in allowlist (config/crops.json)")
            continue

        crop_source = source / crop

        if not crop_source.exists():
            print(f"[skip] Crop folder not found: {crop_source}")
            continue

        # Collect all class directories actually present in the filtered source
        class_dirs = [p for p in crop_source.iterdir() if p.is_dir()]

        # Debug: list actual class folder names scanned for this crop
        print(f"Scanning crop folder: {crop_source}")
        for p in sorted(class_dirs):
            print(f"  - {p.name}")

        # Prepare counters per grade
        counts = {"A": 0, "B": 0, "C": 0}

        for class_dir in class_dirs:
            class_name = class_dir.name

            # Determine grade for this class directory by matching known names
            grade = determine_grade_for_class(class_name, grade_map)

            dest = out / crop / grade
            dest.mkdir(parents=True, exist_ok=True)

            # Copy images from this class_dir into the grade folder
            for img in class_dir.glob("*.*"):
                if img.suffix.lower() not in (".jpg", ".jpeg", ".png"):
                    continue

                target = dest / f"fruits360_{class_name}_{img.name}"

                if not dry_run:
                    shutil.copy2(img, target)

                counts[grade] += 1

        # Write summary entries
        for g in ("A", "B", "C"):
            summary[f"{crop}/{g}"] = counts[g]

    print("\nFruits-360 summary:")
    for k, v in summary.items():
        flag = ""

        if v == 0:
            flag = "  <-- EMPTY"

        print(f"  {k}: {v}{flag}")


def determine_grade_for_class(class_name: str, grade_map: dict) -> str:
    # Normalize helpers
    def norm(s: str) -> str:
        return s.lower().replace('_', ' ').replace('-', ' ').strip()

    n = norm(class_name)

    # 1) Exact or normalized match against configured class names
    for grade, names in grade_map.items():
        for nm in names:
            if norm(nm) == n:
                return grade
            # substring match (e.g., 'cherry red' in 'tomato_cherry_red')
            if norm(nm) in n or n in norm(nm):
                return grade

    # 2) Simple heuristic rules
    if any(tok in n for tok in ("rot", "rotten", "not ripen", "not ripened", "not ripened")):
        return "C"

    if any(tok in n for tok in ("yellow", "maroon", "sweet", "peeled", "red peeled")):
        return "B"

    # 3) Default to A if nothing indicates a defect
    return "A"

# ---------------------------------------------------------
# Fresh / Rotten
# ---------------------------------------------------------
def fetch_freshrotten(source_dir, out_dir, dry_run=False):

    source = Path(source_dir)
    out = Path(out_dir)

    if not source.exists():
        raise FileNotFoundError(
            f"Source dataset folder not found: {source}"
        )

    # Dataset structure:
    #
    # source/
    # ├── Bad Quality_Fruits/
    # ├── Good Quality_Fruits/
    # └── Mixed Quality_Fruits/

    quality_dirs = {
        "A": source / "Good Quality_Fruits",
        "B": source / "Mixed Quality_Fruits",
        "C": source / "Bad Quality_Fruits",
    }

    summary = {}

    for crop, grade_map in FRESHROTTEN_GRADE_MAP.items():

        # Respect the same allowlist for fresh/rotten dataset
        allowed = get_allowed_crops()
        if crop not in allowed:
            print(f"[skip] Fresh-Rotten crop '{crop}' not in allowlist (config/crops.json)")
            continue

        for grade, class_names in grade_map.items():

            dest = out / crop / grade
            dest.mkdir(parents=True, exist_ok=True)

            count = 0

            for class_name in class_names:

                # Determine which quality folder contains this class
                quality_dir = quality_dirs[grade]
                class_dir = quality_dir / class_name

                if not class_dir.exists():
                    print(f"  [skip] '{class_dir}' not found")
                    continue

                for img in class_dir.glob("*.*"):
                    if img.suffix.lower() not in (".jpg", ".jpeg", ".png"):
                        continue

                    target = dest / f"freshrotten_{class_name}_{img.name}"

                    if not dry_run:
                        shutil.copy2(img, target)

                    count += 1

            summary[f"{crop}/{grade}"] = count

    print("\nFresh-Rotten summary:")
    for k, v in summary.items():
        flag = ""

        if v == 0:
            flag = "  <-- EMPTY"

        print(f"  {k}: {v}{flag}")

# ---------------------------------------------------------
# Main
# ---------------------------------------------------------
if __name__ == "__main__":

    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--dataset",
        required=True,
        choices=["fruits360", "freshrotten"]
    )

    parser.add_argument(
        "--source",
        required=True
    )

    parser.add_argument(
        "--out",
        default="../data"
    )

    parser.add_argument(
        "--dry-run",
        action="store_true"
    )

    args = parser.parse_args()

    if args.dataset == "fruits360":

        fetch_fruits360(
            args.source,
            args.out,
            args.dry_run
        )

    elif args.dataset == "freshrotten":

        fetch_freshrotten(
            args.source,
            args.out,
            args.dry_run
        )
