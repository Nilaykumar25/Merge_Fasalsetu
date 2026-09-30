"""
config.py
Central configuration for disease detection model training
"""

import os
from pathlib import Path

# ============================================================
# PATHS
# ============================================================
PROJECT_ROOT = Path(__file__).parent.parent
DATASET_PATH = PROJECT_ROOT / 'data' / 'PlantVillage'
MODEL_OUTPUT_PATH = PROJECT_ROOT / 'models' / 'disease'
LOGS_PATH = PROJECT_ROOT / 'ml' / 'logs'

# ============================================================
# DATASET
# ============================================================
TRAIN_DIR = DATASET_PATH / 'train'
VAL_DIR = DATASET_PATH / 'val'
TEST_DIR = DATASET_PATH / 'test'

# ============================================================
# MODEL
# ============================================================
MODEL_NAME = 'efficientnet_b0'
IMAGE_SIZE = 224  # EfficientNet-B0 standard input
NUM_CLASSES = None  # Auto-detected from dataset

# ============================================================
# TRAINING - STAGE 1 (Classifier Head Only)
# ============================================================
STAGE1_EPOCHS = 15
STAGE1_LEARNING_RATE = 0.001
STAGE1_BATCH_SIZE = 64
STAGE1_PATIENCE = 5  # Early stopping patience

# ============================================================
# TRAINING - STAGE 2 (Fine-tuning)
# ============================================================
STAGE2_EPOCHS = 20
STAGE2_LEARNING_RATE = 0.0001  # Lower LR for fine-tuning
STAGE2_BATCH_SIZE = 64
STAGE2_PATIENCE = 7
FINE_TUNE_LAYERS = 50  # Unfreeze last N layers

# ============================================================
# OPTIMIZATION
# ============================================================
OPTIMIZER = 'adamw'
WEIGHT_DECAY = 0.01
DROPOUT = 0.3

# Learning rate scheduler
SCHEDULER = 'cosine'  # 'cosine' | 'step' | 'plateau'
SCHEDULER_T_MAX = STAGE1_EPOCHS  # For cosine annealing

# ============================================================
# DATA LOADING
# ============================================================
NUM_WORKERS = min(11, os.cpu_count() or 4)  # Auto-detect, cap at 11
PIN_MEMORY = True
PERSISTENT_WORKERS = True

# ============================================================
# AUGMENTATION
# ============================================================
# Training augmentation (realistic for plant disease images)
TRAIN_HORIZONTAL_FLIP = 0.5
TRAIN_ROTATION_DEGREES = 15
TRAIN_COLOR_JITTER = {
    'brightness': 0.2,
    'contrast': 0.2,
    'saturation': 0.1,
    'hue': 0.05
}
TRAIN_RANDOM_CROP_SCALE = (0.8, 1.0)

# ============================================================
# CLASS IMBALANCE
# ============================================================
USE_CLASS_WEIGHTS = True
CLASS_WEIGHT_METHOD = 'effective_samples'  # 'inverse' | 'effective_samples' | 'sqrt_inverse'
EFFECTIVE_NUM_BETA = 0.9999  # For effective_samples method

# ============================================================
# CONFIDENCE THRESHOLDS
# ============================================================
HIGH_CONFIDENCE_THRESHOLD = 0.80
MEDIUM_CONFIDENCE_THRESHOLD = 0.60

# ============================================================
# MIXED PRECISION
# ============================================================
USE_AMP = True  # Automatic Mixed Precision (requires CUDA)

# ============================================================
# CHECKPOINTING
# ============================================================
CHECKPOINT_METRIC = 'val_macro_f1'  # Primary metric for model selection
CHECKPOINT_MODE = 'max'  # 'max' for F1, 'min' for loss

# ============================================================
# REPRODUCIBILITY
# ============================================================
RANDOM_SEED = 42

# ============================================================
# SMOKE TEST
# ============================================================
SMOKE_TEST_BATCHES = 5
SMOKE_TEST_EPOCHS = 2

# ============================================================
# PATHS CREATION
# ============================================================
def ensure_paths():
    """Create necessary directories"""
    MODEL_OUTPUT_PATH.mkdir(parents=True, exist_ok=True)
    LOGS_PATH.mkdir(parents=True, exist_ok=True)

# ============================================================
# CONFIG VALIDATION
# ============================================================
def validate_config():
    """Validate configuration"""
    errors = []
    
    # Check dataset paths
    if not TRAIN_DIR.exists():
        errors.append(f"Training directory not found: {TRAIN_DIR}")
    if not VAL_DIR.exists():
        errors.append(f"Validation directory not found: {VAL_DIR}")
    if not TEST_DIR.exists():
        errors.append(f"Test directory not found: {TEST_DIR}")
    
    # Check hyperparameters
    if STAGE1_LEARNING_RATE <= 0:
        errors.append("Stage 1 learning rate must be positive")
    if STAGE2_LEARNING_RATE >= STAGE1_LEARNING_RATE:
        errors.append("Stage 2 learning rate should be lower than Stage 1")
    if STAGE1_BATCH_SIZE <= 0 or STAGE2_BATCH_SIZE <= 0:
        errors.append("Batch size must be positive")
    
    if errors:
        raise ValueError(f"Configuration errors:\n" + "\n".join(f"  - {e}" for e in errors))
    
    return True

if __name__ == '__main__':
    print("Disease Detection Training Configuration")
    print("=" * 80)
    print(f"Dataset: {DATASET_PATH}")
    print(f"Model output: {MODEL_OUTPUT_PATH}")
    print(f"Image size: {IMAGE_SIZE}")
    print(f"Stage 1: {STAGE1_EPOCHS} epochs, LR={STAGE1_LEARNING_RATE}")
    print(f"Stage 2: {STAGE2_EPOCHS} epochs, LR={STAGE2_LEARNING_RATE}")
    print(f"Batch size: {STAGE1_BATCH_SIZE}")
    print(f"Workers: {NUM_WORKERS}")
    print(f"Random seed: {RANDOM_SEED}")
    print("=" * 80)
    
    try:
        validate_config()
        print("✓ Configuration valid")
    except ValueError as e:
        print(f"✗ Configuration invalid:\n{e}")
