"""
dataset.py
Dataset utilities for disease detection training
"""

import os
import json
import torch
from torch.utils.data import Dataset, DataLoader
from torchvision import datasets, transforms
from pathlib import Path
import numpy as np
from collections import Counter
from config import *


def get_class_mapping(dataset_path):
    """
    Generate deterministic class-to-index mapping from dataset
    
    Args:
        dataset_path: Path to dataset directory containing class folders
    
    Returns:
        dict: {class_name: index} mapping, sorted alphabetically
    """
    class_names = sorted([d.name for d in Path(dataset_path).iterdir() if d.is_dir()])
    class_to_idx = {name: idx for idx, name in enumerate(class_names)}
    return class_to_idx


def calculate_class_weights(train_dataset, method='effective_samples', beta=0.9999):
    """
    Calculate class weights to handle imbalanced dataset
    
    Args:
        train_dataset: Training dataset
        method: Weighting method ('inverse', 'sqrt_inverse', 'effective_samples')
        beta: Beta parameter for effective samples method
    
    Returns:
        torch.Tensor: Class weights
    """
    # Count samples per class
    class_counts = Counter()
    for _, label in train_dataset.samples:
        class_counts[label] += 1
    
    # Sort by class index
    num_classes = len(train_dataset.classes)
    samples_per_class = np.array([class_counts[i] for i in range(num_classes)])
    
    if method == 'inverse':
        # Simple inverse frequency
        weights = 1.0 / samples_per_class
    elif method == 'sqrt_inverse':
        # Square root of inverse frequency (less extreme)
        weights = 1.0 / np.sqrt(samples_per_class)
    elif method == 'effective_samples':
        # Effective number of samples (from Class-Balanced Loss paper)
        effective_num = 1.0 - np.power(beta, samples_per_class)
        weights = (1.0 - beta) / effective_num
    else:
        raise ValueError(f"Unknown weighting method: {method}")
    
    # Normalize weights so mean = 1
    weights = weights / weights.mean()
    
    return torch.FloatTensor(weights)


def get_transforms(stage='train', image_size=224):
    """
    Get image transformations for training/validation/testing
    
    Args:
        stage: 'train', 'val', or 'test'
        image_size: Target image size
    
    Returns:
        torchvision.transforms.Compose: Transform pipeline
    """
    # EfficientNet normalization (ImageNet stats)
    normalize = transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
    
    if stage == 'train':
        # Training: realistic augmentation for plant disease images
        return transforms.Compose([
            transforms.RandomResizedCrop(
                image_size,
                scale=TRAIN_RANDOM_CROP_SCALE
            ),
            transforms.RandomHorizontalFlip(p=TRAIN_HORIZONTAL_FLIP),
            transforms.RandomRotation(degrees=TRAIN_ROTATION_DEGREES),
            transforms.ColorJitter(**TRAIN_COLOR_JITTER),
            transforms.ToTensor(),
            normalize
        ])
    else:
        # Validation/Test: deterministic preprocessing only
        return transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(image_size),
            transforms.ToTensor(),
            normalize
        ])


def create_dataloaders(batch_size, num_workers=4, pin_memory=True):
    """
    Create train, validation, and test dataloaders
    
    Args:
        batch_size: Batch size
        num_workers: Number of dataloader workers
        pin_memory: Whether to pin memory for faster GPU transfer
    
    Returns:
        tuple: (train_loader, val_loader, test_loader, class_to_idx, class_weights)
    """
    # Get class mapping from training set
    class_to_idx = get_class_mapping(TRAIN_DIR)
    num_classes = len(class_to_idx)
    
    print(f"\n{'='*80}")
    print("DATASET PREPARATION")
    print(f"{'='*80}")
    print(f"Classes detected: {num_classes}")
    print(f"Expected classes: 38")
    
    if num_classes != 38:
        raise ValueError(
            f"Expected 38 classes, found {num_classes}. "
            f"Dataset structure may be incorrect."
        )
    
    # Create datasets
    train_dataset = datasets.ImageFolder(
        TRAIN_DIR,
        transform=get_transforms('train', IMAGE_SIZE)
    )
    
    val_dataset = datasets.ImageFolder(
        VAL_DIR,
        transform=get_transforms('val', IMAGE_SIZE)
    )
    
    test_dataset = datasets.ImageFolder(
        TEST_DIR,
        transform=get_transforms('test', IMAGE_SIZE)
    )
    
    # Verify class mapping consistency
    assert train_dataset.class_to_idx == class_to_idx, "Train class mapping mismatch"
    assert val_dataset.class_to_idx == class_to_idx, "Val class mapping mismatch"
    assert test_dataset.class_to_idx == class_to_idx, "Test class mapping mismatch"
    
    print(f"Train samples: {len(train_dataset):,}")
    print(f"Val samples: {len(val_dataset):,}")
    print(f"Test samples: {len(test_dataset):,}")
    
    # Calculate class weights
    class_weights = None
    if USE_CLASS_WEIGHTS:
        print(f"\nCalculating class weights (method: {CLASS_WEIGHT_METHOD})...")
        class_weights = calculate_class_weights(
            train_dataset,
            method=CLASS_WEIGHT_METHOD,
            beta=EFFECTIVE_NUM_BETA
        )
        
        # Print weight statistics
        print(f"Weight range: [{class_weights.min():.4f}, {class_weights.max():.4f}]")
        print(f"Weight mean: {class_weights.mean():.4f}")
        print(f"Weight std: {class_weights.std():.4f}")
    
    # Create dataloaders
    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=pin_memory,
        persistent_workers=num_workers > 0,
        drop_last=True  # Drop incomplete batches for stable training
    )
    
    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=pin_memory,
        persistent_workers=num_workers > 0
    )
    
    test_loader = DataLoader(
        test_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=pin_memory
    )
    
    print(f"\nDataloader config:")
    print(f"  Batch size: {batch_size}")
    print(f"  Num workers: {num_workers}")
    print(f"  Pin memory: {pin_memory}")
    print(f"{'='*80}\n")
    
    return train_loader, val_loader, test_loader, class_to_idx, class_weights


def save_class_mapping(class_to_idx, save_path):
    """Save class mapping to JSON file"""
    idx_to_class = {v: k for k, v in class_to_idx.items()}
    
    mapping = {
        'class_to_idx': class_to_idx,
        'idx_to_class': idx_to_class,
        'num_classes': len(class_to_idx)
    }
    
    with open(save_path, 'w') as f:
        json.dump(mapping, f, indent=2)
    
    print(f"Class mapping saved to: {save_path}")


if __name__ == '__main__':
    # Test dataset loading
    print("Testing dataset loading...")
    
    train_loader, val_loader, test_loader, class_to_idx, class_weights = create_dataloaders(
        batch_size=32,
        num_workers=2
    )
    
    # Test one batch
    images, labels = next(iter(train_loader))
    print(f"\nBatch test:")
    print(f"  Images shape: {images.shape}")
    print(f"  Labels shape: {labels.shape}")
    print(f"  Image range: [{images.min():.3f}, {images.max():.3f}]")
    
    print("\nFirst 5 classes:")
    for class_name, idx in list(class_to_idx.items())[:5]:
        print(f"  {idx}: {class_name}")
    
    if class_weights is not None:
        print(f"\nClass weights (first 5): {class_weights[:5].tolist()}")
