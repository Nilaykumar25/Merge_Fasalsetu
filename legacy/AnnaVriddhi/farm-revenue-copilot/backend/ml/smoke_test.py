"""
smoke_test.py
Quick smoke test to verify pipeline before full training
Tests: dataset loading, transforms, model, forward/backward pass, checkpointing
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.cuda.amp import autocast, GradScaler
import time
from pathlib import Path

from config import *
from dataset import create_dataloaders
from model import create_model


def smoke_test():
    """
    Run smoke test to verify entire pipeline works
    """
    print(f"\n{'='*80}")
    print("SMOKE TEST - PIPELINE VERIFICATION")
    print(f"{'='*80}")
    
    # Set seed
    torch.manual_seed(RANDOM_SEED)
    
    # Device detection
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Device: {device}")
    if device.type == 'cuda':
        print(f"GPU: {torch.cuda.get_device_name(0)}")
    
    # Ensure paths
    ensure_paths()
    
    print(f"\n{'─'*80}")
    print("TEST 1: Dataset Loading")
    print(f"{'─'*80}")
    
    try:
        train_loader, val_loader, test_loader, class_to_idx, class_weights = create_dataloaders(
            batch_size=32,
            num_workers=2  # Reduced for smoke test
        )
        
        num_classes = len(class_to_idx)
        print(f"✓ Datasets loaded")
        print(f"  Classes: {num_classes}")
        print(f"  Train batches: {len(train_loader)}")
        print(f"  Val batches: {len(val_loader)}")
        print(f"  Test batches: {len(test_loader)}")
        
        if num_classes != 38:
            raise ValueError(f"Expected 38 classes, got {num_classes}")
        
    except Exception as e:
        print(f"✗ Dataset loading failed: {e}")
        return False
    
    print(f"\n{'─'*80}")
    print("TEST 2: Data Transforms")
    print(f"{'─'*80}")
    
    try:
        # Get one batch
        images, labels = next(iter(train_loader))
        
        print(f"✓ Batch loaded")
        print(f"  Image batch shape: {images.shape}")
        print(f"  Label batch shape: {labels.shape}")
        print(f"  Image dtype: {images.dtype}")
        print(f"  Image range: [{images.min():.3f}, {images.max():.3f}]")
        print(f"  Label range: [{labels.min()}, {labels.max()}]")
        
        # Verify shapes
        assert images.shape[0] == 32, "Batch size mismatch"
        assert images.shape[1] == 3, "Expected 3 channels (RGB)"
        assert images.shape[2] == IMAGE_SIZE, f"Expected height {IMAGE_SIZE}"
        assert images.shape[3] == IMAGE_SIZE, f"Expected width {IMAGE_SIZE}"
        assert labels.min() >= 0 and labels.max() < num_classes, "Invalid labels"
        
    except Exception as e:
        print(f"✗ Transform test failed: {e}")
        return False
    
    print(f"\n{'─'*80}")
    print("TEST 3: Model Creation")
    print(f"{'─'*80}")
    
    try:
        model = create_model(num_classes, pretrained=True, dropout=DROPOUT)
        model = model.to(device)
        
        total, trainable = model.count_parameters()
        print(f"✓ Model created and moved to {device}")
        print(f"  Total params: {total:,}")
        print(f"  Trainable params: {trainable:,}")
        
    except Exception as e:
        print(f"✗ Model creation failed: {e}")
        return False
    
    print(f"\n{'─'*80}")
    print("TEST 4: Forward Pass")
    print(f"{'─'*80}")
    
    try:
        model.eval()
        with torch.no_grad():
            images_gpu = images.to(device)
            outputs = model(images_gpu)
        
        print(f"✓ Forward pass successful")
        print(f"  Output shape: {outputs.shape}")
        print(f"  Expected: ({images.shape[0]}, {num_classes})")
        
        assert outputs.shape == (images.shape[0], num_classes), "Output shape mismatch"
        
        # Test softmax probabilities
        probs = torch.softmax(outputs, dim=1)
        print(f"  Probability sum (should be ~1.0): {probs[0].sum():.6f}")
        
    except Exception as e:
        print(f"✗ Forward pass failed: {e}")
        return False
    
    print(f"\n{'─'*80}")
    print("TEST 5: Loss Calculation")
    print(f"{'─'*80}")
    
    try:
        criterion = nn.CrossEntropyLoss(
            weight=class_weights.to(device) if class_weights is not None else None
        )
        
        model.train()
        outputs = model(images.to(device))
        loss = criterion(outputs, labels.to(device))
        
        print(f"✓ Loss calculated")
        print(f"  Loss value: {loss.item():.4f}")
        print(f"  Using class weights: {class_weights is not None}")
        
        assert not torch.isnan(loss), "Loss is NaN"
        assert not torch.isinf(loss), "Loss is inf"
        
    except Exception as e:
        print(f"✗ Loss calculation failed: {e}")
        return False
    
    print(f"\n{'─'*80}")
    print("TEST 6: Backward Pass & Optimizer")
    print(f"{'─'*80}")
    
    try:
        # Freeze feature extractor
        model.freeze_feature_extractor()
        
        optimizer = optim.AdamW(
            model.get_trainable_params(),
            lr=STAGE1_LEARNING_RATE,
            weight_decay=WEIGHT_DECAY
        )
        
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        
        print(f"✓ Backward pass successful")
        print(f"  Optimizer step completed")
        
    except Exception as e:
        print(f"✗ Backward pass failed: {e}")
        return False
    
    print(f"\n{'─'*80}")
    print("TEST 7: Mixed Precision (if CUDA available)")
    print(f"{'─'*80}")
    
    if device.type == 'cuda' and USE_AMP:
        try:
            scaler = GradScaler()
            
            optimizer.zero_grad()
            
            with autocast():
                outputs = model(images.to(device))
                loss = criterion(outputs, labels.to(device))
            
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
            
            print(f"✓ Mixed precision (AMP) working")
            print(f"  Scaler scale: {scaler.get_scale()}")
            
        except Exception as e:
            print(f"✗ Mixed precision test failed: {e}")
            return False
    else:
        print(f"  Skipped (CPU or AMP disabled)")
    
    print(f"\n{'─'*80}")
    print("TEST 8: Training Loop (Mini)")
    print(f"{'─'*80}")
    
    try:
        model.train()
        
        batches_tested = 0
        total_loss = 0.0
        
        for images, labels in train_loader:
            if batches_tested >= SMOKE_TEST_BATCHES:
                break
            
            images, labels = images.to(device), labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
            batches_tested += 1
        
        avg_loss = total_loss / batches_tested
        print(f"✓ Training loop working")
        print(f"  Batches processed: {batches_tested}")
        print(f"  Average loss: {avg_loss:.4f}")
        
    except Exception as e:
        print(f"✗ Training loop failed: {e}")
        return False
    
    print(f"\n{'─'*80}")
    print("TEST 9: Validation Loop (Mini)")
    print(f"{'─'*80}")
    
    try:
        model.eval()
        
        batches_tested = 0
        correct = 0
        total = 0
        
        with torch.no_grad():
            for images, labels in val_loader:
                if batches_tested >= SMOKE_TEST_BATCHES:
                    break
                
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                _, preds = torch.max(outputs, 1)
                
                correct += (preds == labels).sum().item()
                total += labels.size(0)
                batches_tested += 1
        
        accuracy = 100.0 * correct / total
        print(f"✓ Validation loop working")
        print(f"  Batches processed: {batches_tested}")
        print(f"  Accuracy: {accuracy:.2f}%")
        
    except Exception as e:
        print(f"✗ Validation loop failed: {e}")
        return False
    
    print(f"\n{'─'*80}")
    print("TEST 10: Checkpoint Saving")
    print(f"{'─'*80}")
    
    try:
        checkpoint_path = MODEL_OUTPUT_PATH / 'smoke_test_checkpoint.pth'
        
        checkpoint = {
            'epoch': 1,
            'model_state_dict': model.state_dict(),
            'optimizer_state_dict': optimizer.state_dict(),
            'class_to_idx': class_to_idx,
            'class_weights': class_weights.tolist() if class_weights is not None else None,
            'config': {'test': True}
        }
        
        torch.save(checkpoint, checkpoint_path)
        
        # Verify file exists
        assert checkpoint_path.exists(), "Checkpoint file not created"
        
        file_size = checkpoint_path.stat().st_size / (1024**2)
        print(f"✓ Checkpoint saved")
        print(f"  Path: {checkpoint_path.name}")
        print(f"  Size: {file_size:.2f} MB")
        
        # Test loading
        loaded = torch.load(checkpoint_path, map_location='cpu')
        assert 'model_state_dict' in loaded, "Missing model state"
        assert 'class_to_idx' in loaded, "Missing class mapping"
        
        print(f"  ✓ Checkpoint can be loaded")
        
        # Clean up
        checkpoint_path.unlink()
        print(f"  Smoke test checkpoint removed")
        
    except Exception as e:
        print(f"✗ Checkpoint test failed: {e}")
        return False
    
    print(f"\n{'─'*80}")
    print("TEST 11: Layer Unfreezing (Stage 2 prep)")
    print(f"{'─'*80}")
    
    try:
        # Unfreeze layers
        model.unfreeze_layers(FINE_TUNE_LAYERS)
        
        total, trainable = model.count_parameters()
        percent_trainable = 100.0 * trainable / total
        
        print(f"✓ Layer unfreezing working")
        print(f"  Trainable: {trainable:,} / {total:,} ({percent_trainable:.1f}%)")
        
        assert trainable > 0, "No trainable parameters after unfreezing"
        
    except Exception as e:
        print(f"✗ Layer unfreezing failed: {e}")
        return False
    
    # Summary
    print(f"\n{'='*80}")
    print("SMOKE TEST COMPLETE - ALL TESTS PASSED ✓")
    print(f"{'='*80}")
    print("\nPipeline verified:")
    print("  ✓ Dataset loading")
    print("  ✓ Image transforms")
    print("  ✓ Model creation")
    print("  ✓ Forward pass")
    print("  ✓ Loss calculation")
    print("  ✓ Backward pass")
    print("  ✓ Mixed precision (if available)")
    print("  ✓ Training loop")
    print("  ✓ Validation loop")
    print("  ✓ Checkpoint saving/loading")
    print("  ✓ Layer unfreezing")
    print("\nReady for full training!")
    print(f"{'='*80}\n")
    
    return True


if __name__ == '__main__':
    start_time = time.time()
    
    success = smoke_test()
    
    elapsed = time.time() - start_time
    print(f"\nSmoke test duration: {elapsed:.1f}s\n")
    
    if success:
        print("✓ You can now run: python train.py")
        exit(0)
    else:
        print("✗ Fix errors before running full training")
        exit(1)
