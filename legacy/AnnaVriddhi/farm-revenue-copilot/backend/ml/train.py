"""
train.py
Main training script for disease detection model
Two-stage transfer learning: Stage 1 (classifier) -> Stage 2 (fine-tuning)
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.cuda.amp import autocast, GradScaler
import time
import json
from pathlib import Path
from tqdm import tqdm
import numpy as np
from sklearn.metrics import f1_score, precision_score, recall_score

from config import *
from dataset import create_dataloaders, save_class_mapping
from model import create_model


def set_seed(seed):
    """Set random seeds for reproducibility"""
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    np.random.seed(seed)
    import random
    random.seed(seed)
    
    # Make CUDA operations deterministic (may reduce performance)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False


def detect_device():
    """Detect and print device information"""
    print(f"\n{'='*80}")
    print("DEVICE DETECTION")
    print(f"{'='*80}")
    
    if torch.cuda.is_available():
        device = torch.device('cuda')
        print(f"Device: CUDA")
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f} GB")
        print(f"CUDA Version: {torch.version.cuda}")
    else:
        device = torch.device('cpu')
        print(f"Device: CPU")
        print(f"CPU cores: {torch.get_num_threads()}")
    
    print(f"PyTorch: {torch.__version__}")
    print(f"{'='*80}\n")
    
    return device


def train_epoch(model, loader, criterion, optimizer, device, scaler=None, use_amp=False):
    """Train for one epoch"""
    model.train()
    
    running_loss = 0.0
    all_preds = []
    all_labels = []
    
    pbar = tqdm(loader, desc='Training', leave=False)
    
    for images, labels in pbar:
        images, labels = images.to(device), labels.to(device)
        
        optimizer.zero_grad()
        
        # Forward pass with optional mixed precision
        if use_amp and scaler is not None:
            with autocast():
                outputs = model(images)
                loss = criterion(outputs, labels)
            
            # Backward pass with gradient scaling
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
        else:
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
        
        # Track metrics
        running_loss += loss.item() * images.size(0)
        _, preds = torch.max(outputs, 1)
        all_preds.extend(preds.cpu().numpy())
        all_labels.extend(labels.cpu().numpy())
        
        # Update progress bar
        pbar.set_postfix({'loss': f'{loss.item():.4f}'})
    
    # Calculate epoch metrics
    epoch_loss = running_loss / len(loader.dataset)
    epoch_acc = 100.0 * np.mean(np.array(all_preds) == np.array(all_labels))
    
    return epoch_loss, epoch_acc


def validate(model, loader, criterion, device):
    """Validate model"""
    model.eval()
    
    running_loss = 0.0
    all_preds = []
    all_labels = []
    
    with torch.no_grad():
        for images, labels in tqdm(loader, desc='Validation', leave=False):
            images, labels = images.to(device), labels.to(device)
            
            outputs = model(images)
            loss = criterion(outputs, labels)
            
            running_loss += loss.item() * images.size(0)
            _, preds = torch.max(outputs, 1)
            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
    
    # Calculate metrics
    val_loss = running_loss / len(loader.dataset)
    val_acc = 100.0 * np.mean(np.array(all_preds) == np.array(all_labels))
    
    # Calculate F1 scores
    macro_f1 = f1_score(all_labels, all_preds, average='macro', zero_division=0)
    weighted_f1 = f1_score(all_labels, all_preds, average='weighted', zero_division=0)
    
    return val_loss, val_acc, macro_f1, weighted_f1


def save_checkpoint(model, optimizer, scheduler, epoch, metrics, class_to_idx, 
                   class_weights, config, save_path, is_best=False):
    """Save training checkpoint"""
    checkpoint = {
        'epoch': epoch,
        'model_state_dict': model.state_dict(),
        'optimizer_state_dict': optimizer.state_dict(),
        'scheduler_state_dict': scheduler.state_dict() if scheduler else None,
        'metrics': metrics,
        'class_to_idx': class_to_idx,
        'class_weights': class_weights.tolist() if class_weights is not None else None,
        'config': config,
        'random_seed': RANDOM_SEED
    }
    
    torch.save(checkpoint, save_path)
    
    if is_best:
        best_path = save_path.parent / 'disease_efficientnet_b0_best.pth'
        torch.save(checkpoint, best_path)
        print(f"  ✓ New best model saved: {best_path.name}")


def train_stage1(model, train_loader, val_loader, class_weights, class_to_idx, device):
    """
    Stage 1: Train classifier head only with frozen feature extractor
    """
    print(f"\n{'='*80}")
    print("STAGE 1: CLASSIFIER HEAD TRAINING")
    print(f"{'='*80}")
    
    # Freeze feature extractor
    model.freeze_feature_extractor()
    
    # Loss function with class weights
    criterion = nn.CrossEntropyLoss(
        weight=class_weights.to(device) if class_weights is not None else None
    )
    
    # Optimizer (only trainable parameters)
    optimizer = optim.AdamW(
        model.get_trainable_params(),
        lr=STAGE1_LEARNING_RATE,
        weight_decay=WEIGHT_DECAY
    )
    
    # Scheduler
    scheduler = optim.lr_scheduler.CosineAnnealingLR(
        optimizer,
        T_max=STAGE1_EPOCHS
    )
    
    # Mixed precision scaler
    use_amp = USE_AMP and device.type == 'cuda'
    scaler = GradScaler() if use_amp else None
    
    print(f"Epochs: {STAGE1_EPOCHS}")
    print(f"Learning rate: {STAGE1_LEARNING_RATE}")
    print(f"Optimizer: AdamW (weight_decay={WEIGHT_DECAY})")
    print(f"Scheduler: CosineAnnealingLR")
    print(f"Mixed precision: {'Enabled' if use_amp else 'Disabled'}")
    print(f"Early stopping patience: {STAGE1_PATIENCE}")
    
    # Training loop
    best_metric = 0.0
    patience_counter = 0
    history = []
    
    for epoch in range(1, STAGE1_EPOCHS + 1):
        epoch_start = time.time()
        
        print(f"\n{'-'*80}")
        print(f"Epoch {epoch}/{STAGE1_EPOCHS}")
        print(f"{'-'*80}")
        
        # Train
        train_loss, train_acc = train_epoch(
            model, train_loader, criterion, optimizer, device, scaler, use_amp
        )
        
        # Validate
        val_loss, val_acc, macro_f1, weighted_f1 = validate(
            model, val_loader, criterion, device
        )
        
        # Scheduler step
        scheduler.step()
        current_lr = optimizer.param_groups[0]['lr']
        
        epoch_time = time.time() - epoch_start
        
        # Print metrics
        print(f"Train Loss: {train_loss:.4f}  |  Train Acc: {train_acc:.2f}%")
        print(f"Val Loss:   {val_loss:.4f}  |  Val Acc:   {val_acc:.2f}%")
        print(f"Val Macro F1: {macro_f1:.4f}  |  Val Weighted F1: {weighted_f1:.4f}")
        print(f"LR: {current_lr:.6f}  |  Time: {epoch_time:.1f}s")
        
        # Track history
        epoch_metrics = {
            'epoch': epoch,
            'train_loss': train_loss,
            'train_acc': train_acc,
            'val_loss': val_loss,
            'val_acc': val_acc,
            'val_macro_f1': macro_f1,
            'val_weighted_f1': weighted_f1,
            'lr': current_lr,
            'time': epoch_time
        }
        history.append(epoch_metrics)
        
        # Check if best model
        current_metric = macro_f1
        is_best = current_metric > best_metric
        
        if is_best:
            best_metric = current_metric
            patience_counter = 0
            
            # Save checkpoint
            save_checkpoint(
                model, optimizer, scheduler, epoch, epoch_metrics,
                class_to_idx, class_weights,
                {'stage': 1, 'epochs': STAGE1_EPOCHS, 'lr': STAGE1_LEARNING_RATE},
                MODEL_OUTPUT_PATH / f'stage1_epoch_{epoch}.pth',
                is_best=True
            )
        else:
            patience_counter += 1
            print(f"  No improvement for {patience_counter} epochs")
            
            if patience_counter >= STAGE1_PATIENCE:
                print(f"\n  Early stopping triggered (patience={STAGE1_PATIENCE})")
                break
    
    print(f"\n{'='*80}")
    print(f"STAGE 1 COMPLETE")
    print(f"Best Val Macro F1: {best_metric:.4f}")
    print(f"{'='*80}")
    
    return history, best_metric


def train_stage2(model, train_loader, val_loader, class_weights, class_to_idx, device):
    """
    Stage 2: Fine-tune last layers with lower learning rate
    """
    print(f"\n{'='*80}")
    print("STAGE 2: FINE-TUNING")
    print(f"{'='*80}")
    
    # Unfreeze last layers
    model.unfreeze_layers(FINE_TUNE_LAYERS)
    
    # Loss function
    criterion = nn.CrossEntropyLoss(
        weight=class_weights.to(device) if class_weights is not None else None
    )
    
    # Optimizer with lower learning rate
    optimizer = optim.AdamW(
        model.get_trainable_params(),
        lr=STAGE2_LEARNING_RATE,
        weight_decay=WEIGHT_DECAY
    )
    
    # Scheduler
    scheduler = optim.lr_scheduler.CosineAnnealingLR(
        optimizer,
        T_max=STAGE2_EPOCHS
    )
    
    # Mixed precision
    use_amp = USE_AMP and device.type == 'cuda'
    scaler = GradScaler() if use_amp else None
    
    print(f"Epochs: {STAGE2_EPOCHS}")
    print(f"Learning rate: {STAGE2_LEARNING_RATE}")
    print(f"Optimizer: AdamW (weight_decay={WEIGHT_DECAY})")
    print(f"Scheduler: CosineAnnealingLR")
    print(f"Early stopping patience: {STAGE2_PATIENCE}")
    
    # Training loop
    best_metric = 0.0
    patience_counter = 0
    history = []
    
    for epoch in range(1, STAGE2_EPOCHS + 1):
        epoch_start = time.time()
        
        print(f"\n{'-'*80}")
        print(f"Epoch {epoch}/{STAGE2_EPOCHS}")
        print(f"{'-'*80}")
        
        # Train
        train_loss, train_acc = train_epoch(
            model, train_loader, criterion, optimizer, device, scaler, use_amp
        )
        
        # Validate
        val_loss, val_acc, macro_f1, weighted_f1 = validate(
            model, val_loader, criterion, device
        )
        
        # Scheduler step
        scheduler.step()
        current_lr = optimizer.param_groups[0]['lr']
        
        epoch_time = time.time() - epoch_start
        
        # Print metrics
        print(f"Train Loss: {train_loss:.4f}  |  Train Acc: {train_acc:.2f}%")
        print(f"Val Loss:   {val_loss:.4f}  |  Val Acc:   {val_acc:.2f}%")
        print(f"Val Macro F1: {macro_f1:.4f}  |  Val Weighted F1: {weighted_f1:.4f}")
        print(f"LR: {current_lr:.6f}  |  Time: {epoch_time:.1f}s")
        
        # Track history
        epoch_metrics = {
            'epoch': epoch,
            'train_loss': train_loss,
            'train_acc': train_acc,
            'val_loss': val_loss,
            'val_acc': val_acc,
            'val_macro_f1': macro_f1,
            'val_weighted_f1': weighted_f1,
            'lr': current_lr,
            'time': epoch_time
        }
        history.append(epoch_metrics)
        
        # Check if best model
        current_metric = macro_f1
        is_best = current_metric > best_metric
        
        if is_best:
            best_metric = current_metric
            patience_counter = 0
            
            # Save checkpoint
            save_checkpoint(
                model, optimizer, scheduler, epoch, epoch_metrics,
                class_to_idx, class_weights,
                {'stage': 2, 'epochs': STAGE2_EPOCHS, 'lr': STAGE2_LEARNING_RATE},
                MODEL_OUTPUT_PATH / f'stage2_epoch_{epoch}.pth',
                is_best=True
            )
        else:
            patience_counter += 1
            print(f"  No improvement for {patience_counter} epochs")
            
            if patience_counter >= STAGE2_PATIENCE:
                print(f"\n  Early stopping triggered (patience={STAGE2_PATIENCE})")
                break
    
    print(f"\n{'='*80}")
    print(f"STAGE 2 COMPLETE")
    print(f"Best Val Macro F1: {best_metric:.4f}")
    print(f"{'='*80}")
    
    return history, best_metric


def main():
    """Main training pipeline"""
    print(f"\n{'#'*80}")
    print("ANNAVRIDDHI - DISEASE DETECTION MODEL TRAINING")
    print(f"{'#'*80}")
    
    # Set seed
    set_seed(RANDOM_SEED)
    print(f"Random seed: {RANDOM_SEED}")
    
    # Ensure paths
    ensure_paths()
    
    # Validate config
    validate_config()
    
    # Detect device
    device = detect_device()
    
    # Create dataloaders
    train_loader, val_loader, test_loader, class_to_idx, class_weights = create_dataloaders(
        batch_size=STAGE1_BATCH_SIZE,
        num_workers=NUM_WORKERS,
        pin_memory=PIN_MEMORY
    )
    
    num_classes = len(class_to_idx)
    
    # Save class mapping
    save_class_mapping(class_to_idx, MODEL_OUTPUT_PATH / 'class_mapping.json')
    
    # Create model
    model = create_model(num_classes, pretrained=True, dropout=DROPOUT)
    model = model.to(device)
    
    # Stage 1: Train classifier head
    stage1_history, stage1_best = train_stage1(
        model, train_loader, val_loader, class_weights, class_to_idx, device
    )
    
    # Load best Stage 1 checkpoint for Stage 2
    best_stage1_path = MODEL_OUTPUT_PATH / 'disease_efficientnet_b0_best.pth'
    checkpoint = torch.load(best_stage1_path)
    model.load_state_dict(checkpoint['model_state_dict'])
    print(f"\nLoaded best Stage 1 checkpoint for Stage 2 training")
    
    # Stage 2: Fine-tune
    stage2_history, stage2_best = train_stage2(
        model, train_loader, val_loader, class_weights, class_to_idx, device
    )
    
    # Save training history
    history = {
        'stage1': stage1_history,
        'stage2': stage2_history,
        'stage1_best_macro_f1': stage1_best,
        'stage2_best_macro_f1': stage2_best
    }
    
    with open(MODEL_OUTPUT_PATH / 'training_history.json', 'w') as f:
        json.dump(history, f, indent=2)
    
    print(f"\n{'#'*80}")
    print("TRAINING COMPLETE")
    print(f"{'#'*80}")
    print(f"Stage 1 Best Macro F1: {stage1_best:.4f}")
    print(f"Stage 2 Best Macro F1: {stage2_best:.4f}")
    print(f"Model saved: {MODEL_OUTPUT_PATH / 'disease_efficientnet_b0_best.pth'}")
    print(f"{'#'*80}\n")


if __name__ == '__main__':
    main()
