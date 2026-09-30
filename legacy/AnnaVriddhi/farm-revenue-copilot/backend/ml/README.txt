================================================================================
ANNAVRIDDHI - DISEASE DETECTION MODEL TRAINING
================================================================================

This directory contains the ML pipeline for training the crop disease detection
model using the PlantVillage dataset.

================================================================================
PREREQUISITES
================================================================================

Python 3.8+
PyTorch 2.0+ with CUDA support (for GPU training)
Required packages:
  - torch
  - torchvision
  - numpy
  - pillow
  - scikit-learn
  - tqdm

Install PyTorch with CUDA:
  pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121

Or for CPU only:
  pip install torch torchvision

================================================================================
FILES
================================================================================

config.py           - Central configuration (hyperparameters, paths)
dataset.py          - Dataset loading, preprocessing, augmentation
model.py            - EfficientNet-B0 model architecture
train.py            - Main training script (Stage 1 + Stage 2)
smoke_test.py       - Quick pipeline verification before training
evaluate_test.py    - Final test set evaluation (run ONCE after training)
inference.py        - Inference script for predictions
inspect_dataset.py  - Dataset inspection tool
create_test_split.py - Dataset splitting script (already run)

================================================================================
DATASET
================================================================================

Location: backend/data/PlantVillage/
  train/  - 86,888 images, 38 classes
  val/    - 18,496 images, 38 classes  
  test/   -  3,226 images, 38 classes

Total: 108,610 images

Classes: 38 plant disease classes from PlantVillage dataset
Imbalance ratio: 36.4:1 (handled with class-weighted loss)

DO NOT modify train/val/test splits - they are READ-ONLY.

================================================================================
WORKFLOW
================================================================================

1. VERIFY DATASET
   python inspect_dataset.py

2. RUN SMOKE TEST (verify pipeline works)
   python smoke_test.py

3. TRAIN MODEL (Stage 1 + Stage 2)
   python train.py
   
   This runs:
   - Stage 1: Train classifier head (15 epochs)
   - Stage 2: Fine-tune last layers (20 epochs)
   
   Training uses:
   - EfficientNet-B0 pretrained on ImageNet
   - Class-weighted Cross Entropy Loss
   - AdamW optimizer
   - Cosine annealing LR scheduler
   - Early stopping
   - Mixed precision (if GPU available)

4. EVALUATE ON TEST SET (ONCE after training complete)
   python evaluate_test.py

5. RUN INFERENCE
   python inference.py path/to/image.jpg 5

================================================================================
OUTPUTS
================================================================================

Location: backend/models/disease/

Files generated:
  disease_efficientnet_b0_best.pth  - Best model checkpoint
  class_mapping.json                - Class name to index mapping
  training_history.json             - Training metrics per epoch
  test_evaluation_results.json      - Final test set results

Checkpoint contains:
  - Model weights
  - Optimizer state
  - Class mapping
  - Class weights
  - Training config
  - Random seed

================================================================================
CONFIGURATION
================================================================================

Edit config.py to change:
  - Learning rates
  - Batch sizes
  - Number of epochs
  - Early stopping patience
  - Data augmentation parameters
  - Number of workers
  - Image size
  - Dropout rate

Key parameters:
  STAGE1_EPOCHS = 15
  STAGE1_LEARNING_RATE = 0.001
  STAGE2_EPOCHS = 20
  STAGE2_LEARNING_RATE = 0.0001
  BATCH_SIZE = 64
  NUM_WORKERS = 11
  IMAGE_SIZE = 224
  DROPOUT = 0.3
  RANDOM_SEED = 42

================================================================================
TRAINING TIME ESTIMATES
================================================================================

With GPU (RTX 3050 or better):
  Stage 1: ~15-30 minutes
  Stage 2: ~20-40 minutes
  Total: ~35-70 minutes

With CPU:
  Stage 1: ~2-4 hours
  Stage 2: ~3-6 hours
  Total: ~5-10 hours

================================================================================
MODEL ARCHITECTURE
================================================================================

Base: EfficientNet-B0 (pretrained on ImageNet)
Total parameters: ~4.0M
Input: 224x224 RGB images
Output: 38 classes (softmax probabilities)

Transfer learning:
  Stage 1: Freeze feature extractor, train classifier only
  Stage 2: Unfreeze last 50 layers, fine-tune with lower LR

================================================================================
METRICS
================================================================================

Primary metric: Macro F1 Score
  (Important because dataset is highly imbalanced)

Also tracked:
  - Accuracy
  - Weighted F1
  - Macro Precision
  - Macro Recall
  - Per-class metrics
  - Confusion matrix

================================================================================
TROUBLESHOOTING
================================================================================

Q: Training is very slow
A: Ensure GPU is available and CUDA-enabled PyTorch is installed
   Check: python -c "import torch; print(torch.cuda.is_available())"

Q: Out of memory error
A: Reduce BATCH_SIZE in config.py
   Start with 32, then 16 if still failing

Q: Dataset loading fails
A: Verify dataset at backend/data/PlantVillage/
   Run: python inspect_dataset.py

Q: Smoke test fails
A: Check error message and verify all dependencies installed
   Ensure dataset exists and is properly structured

Q: Training crashes after a few epochs
A: Check disk space for checkpoints
   Verify model output path exists and is writable

================================================================================
SAFETY
================================================================================

- Dataset is READ-ONLY during training
- Test set is HELD-OUT until final evaluation
- All code uses deterministic random seed (42)
- Checkpoints saved regularly
- Best model selected by validation macro F1
- Early stopping prevents overfitting

DO NOT:
  - Modify train/val/test splits
  - Evaluate test set multiple times
  - Use test set for model selection
  - Commit large model files to git
  - Expose .env or credentials

================================================================================
INTEGRATION
================================================================================

After training, the model can be integrated with the backend:

1. Model checkpoint: backend/models/disease/disease_efficientnet_b0_best.pth
2. Class mapping: backend/models/disease/class_mapping.json

The existing diseaseDetectionService.js can call a Python inference service
or the model can be converted to ONNX for Node.js integration.

Current backend expects:
  - Input: preprocessed image buffer
  - Output: {className, confidence}

The inference.py script provides this interface.

================================================================================
FURTHER IMPROVEMENTS
================================================================================

Possible enhancements:
  - Test larger models (EfficientNet-B1, B2)
  - Experiment with different augmentation strategies
  - Try ensemble methods
  - Convert to ONNX for production deployment
  - Add gradual unfreezing schedule
  - Implement learning rate finder
  - Add TensorBoard logging
  - Test other loss functions (focal loss, label smoothing)

================================================================================
SUPPORT
================================================================================

For questions or issues:
1. Check this README
2. Review config.py for parameter descriptions
3. Run smoke_test.py to diagnose pipeline issues
4. Check training logs in backend/ml/logs/

================================================================================
