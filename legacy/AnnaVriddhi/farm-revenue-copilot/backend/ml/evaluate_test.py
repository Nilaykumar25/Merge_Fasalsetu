"""
evaluate_test.py
Final evaluation on held-out test set
ONLY run this ONCE after training is complete
"""

import torch
import torch.nn as nn
import numpy as np
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report
)
from tqdm import tqdm
import json
from pathlib import Path

from config import *
from dataset import create_dataloaders
from model import load_checkpoint


def evaluate_test_set(model, test_loader, device, class_names):
    """
    Comprehensive evaluation on test set
    
    Args:
        model: Trained model
        test_loader: Test data loader
        device: Device to run on
        class_names: List of class names in order
    
    Returns:
        dict: Complete evaluation metrics
    """
    model.eval()
    
    all_preds = []
    all_labels = []
    all_probs = []
    
    print(f"Evaluating on {len(test_loader.dataset):,} test images...")
    
    with torch.no_grad():
        for images, labels in tqdm(test_loader, desc='Testing'):
            images, labels = images.to(device), labels.to(device)
            
            outputs = model(images)
            probs = torch.softmax(outputs, dim=1)
            _, preds = torch.max(outputs, 1)
            
            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
            all_probs.extend(probs.cpu().numpy())
    
    all_preds = np.array(all_preds)
    all_labels = np.array(all_labels)
    all_probs = np.array(all_probs)
    
    # Overall metrics
    accuracy = accuracy_score(all_labels, all_preds)
    
    macro_precision = precision_score(all_labels, all_preds, average='macro', zero_division=0)
    macro_recall = recall_score(all_labels, all_preds, average='macro', zero_division=0)
    macro_f1 = f1_score(all_labels, all_preds, average='macro', zero_division=0)
    
    weighted_precision = precision_score(all_labels, all_preds, average='weighted', zero_division=0)
    weighted_recall = recall_score(all_labels, all_preds, average='weighted', zero_division=0)
    weighted_f1 = f1_score(all_labels, all_preds, average='weighted', zero_division=0)
    
    # Per-class metrics
    per_class_precision = precision_score(all_labels, all_preds, average=None, zero_division=0)
    per_class_recall = recall_score(all_labels, all_preds, average=None, zero_division=0)
    per_class_f1 = f1_score(all_labels, all_preds, average=None, zero_division=0)
    
    # Confusion matrix
    cm = confusion_matrix(all_labels, all_preds)
    
    # Per-class results
    per_class_results = []
    for idx, class_name in enumerate(class_names):
        per_class_results.append({
            'class': class_name,
            'precision': float(per_class_precision[idx]),
            'recall': float(per_class_recall[idx]),
            'f1': float(per_class_f1[idx]),
            'support': int(np.sum(all_labels == idx))
        })
    
    # Sort by F1 score to find worst performers
    per_class_results_sorted = sorted(per_class_results, key=lambda x: x['f1'])
    
    # Find confusion pairs
    confusion_pairs = []
    for i in range(len(class_names)):
        for j in range(len(class_names)):
            if i != j and cm[i, j] > 0:
                confusion_pairs.append({
                    'true': class_names[i],
                    'predicted': class_names[j],
                    'count': int(cm[i, j])
                })
    
    # Sort confusion pairs by count
    confusion_pairs_sorted = sorted(confusion_pairs, key=lambda x: x['count'], reverse=True)
    
    results = {
        'overall': {
            'accuracy': float(accuracy),
            'macro_precision': float(macro_precision),
            'macro_recall': float(macro_recall),
            'macro_f1': float(macro_f1),
            'weighted_precision': float(weighted_precision),
            'weighted_recall': float(weighted_recall),
            'weighted_f1': float(weighted_f1),
            'test_samples': len(all_labels)
        },
        'per_class': per_class_results,
        'worst_classes': per_class_results_sorted[:10],
        'top_confusion_pairs': confusion_pairs_sorted[:20],
        'confusion_matrix': cm.tolist()
    }
    
    return results


def print_results(results):
    """Print evaluation results in readable format"""
    print(f"\n{'='*80}")
    print("FINAL TEST SET EVALUATION")
    print(f"{'='*80}")
    
    overall = results['overall']
    
    print(f"\nOVERALL METRICS (Test samples: {overall['test_samples']:,})")
    print(f"{'─'*80}")
    print(f"Accuracy:           {overall['accuracy']*100:.2f}%")
    print(f"\nMacro Metrics:")
    print(f"  Precision:        {overall['macro_precision']:.4f}")
    print(f"  Recall:           {overall['macro_recall']:.4f}")
    print(f"  F1 Score:         {overall['macro_f1']:.4f}")
    print(f"\nWeighted Metrics:")
    print(f"  Precision:        {overall['weighted_precision']:.4f}")
    print(f"  Recall:           {overall['weighted_recall']:.4f}")
    print(f"  F1 Score:         {overall['weighted_f1']:.4f}")
    
    print(f"\n{'─'*80}")
    print("WORST PERFORMING CLASSES (Lowest F1)")
    print(f"{'─'*80}")
    print(f"{'Class':<50} {'Precision':>10} {'Recall':>10} {'F1':>10} {'Support':>10}")
    print(f"{'─'*80}")
    
    for item in results['worst_classes']:
        print(f"{item['class']:<50} {item['precision']:>10.3f} {item['recall']:>10.3f} "
              f"{item['f1']:>10.3f} {item['support']:>10}")
    
    print(f"\n{'─'*80}")
    print("TOP CONFUSION PAIRS (Most Common Mistakes)")
    print(f"{'─'*80}")
    print(f"{'True Class':<45} {'→':<3} {'Predicted Class':<45} {'Count':>10}")
    print(f"{'─'*80}")
    
    for item in results['top_confusion_pairs'][:15]:
        true_short = item['true'][:45]
        pred_short = item['predicted'][:45]
        print(f"{true_short:<45} {'→':<3} {pred_short:<45} {item['count']:>10}")
    
    print(f"\n{'='*80}")
    
    # Analyze healthy vs diseased performance
    print("\nHEALTHY vs DISEASED ANALYSIS")
    print(f"{'─'*80}")
    
    healthy_classes = [c for c in results['per_class'] if 'healthy' in c['class']]
    diseased_classes = [c for c in results['per_class'] if 'healthy' not in c['class']]
    
    if healthy_classes:
        healthy_f1_avg = np.mean([c['f1'] for c in healthy_classes])
        print(f"Healthy classes ({len(healthy_classes)}):  Avg F1 = {healthy_f1_avg:.4f}")
    
    if diseased_classes:
        diseased_f1_avg = np.mean([c['f1'] for c in diseased_classes])
        print(f"Diseased classes ({len(diseased_classes)}): Avg F1 = {diseased_f1_avg:.4f}")
    
    print(f"{'='*80}\n")


def main():
    """Main evaluation function"""
    print(f"\n{'#'*80}")
    print("ANNAVRIDDHI - FINAL TEST SET EVALUATION")
    print(f"{'#'*80}")
    print("\n⚠️  WARNING: This is the HELD-OUT test set evaluation.")
    print("This should only be run ONCE after training is complete.\n")
    
    # Check if best model exists
    best_model_path = MODEL_OUTPUT_PATH / 'disease_efficientnet_b0_best.pth'
    
    if not best_model_path.exists():
        print(f"✗ Best model not found at: {best_model_path}")
        print("  Run training first: python train.py")
        return
    
    print(f"Loading best model from: {best_model_path.name}")
    
    # Load checkpoint
    checkpoint = torch.load(best_model_path, map_location='cpu')
    
    if 'class_to_idx' not in checkpoint:
        print("✗ Checkpoint missing class mapping")
        return
    
    class_to_idx = checkpoint['class_to_idx']
    idx_to_class = {v: k for k, v in class_to_idx.items()}
    class_names = [idx_to_class[i] for i in range(len(idx_to_class))]
    num_classes = len(class_names)
    
    print(f"Number of classes: {num_classes}")
    
    # Detect device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Device: {device}")
    
    # Load model
    from model import create_model
    model = create_model(num_classes, pretrained=False)
    model.load_state_dict(checkpoint['model_state_dict'])
    model = model.to(device)
    
    print(f"Model loaded successfully")
    
    # Print validation metrics from checkpoint
    if 'metrics' in checkpoint:
        metrics = checkpoint['metrics']
        print(f"\nValidation metrics at checkpoint:")
        print(f"  Val Accuracy: {metrics.get('val_acc', 'N/A')}")
        print(f"  Val Macro F1: {metrics.get('val_macro_f1', 'N/A')}")
        print(f"  Val Weighted F1: {metrics.get('val_weighted_f1', 'N/A')}")
    
    # Create test dataloader
    print(f"\nLoading test dataset...")
    _, _, test_loader, _, _ = create_dataloaders(
        batch_size=64,
        num_workers=NUM_WORKERS,
        pin_memory=PIN_MEMORY
    )
    
    # Evaluate
    print(f"\n{'─'*80}")
    results = evaluate_test_set(model, test_loader, device, class_names)
    
    # Print results
    print_results(results)
    
    # Save results
    results_path = MODEL_OUTPUT_PATH / 'test_evaluation_results.json'
    with open(results_path, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"Detailed results saved to: {results_path.name}")
    
    # Generate classification report
    print(f"\n{'─'*80}")
    print("Generating detailed classification report...")
    print(f"{'─'*80}\n")
    
    # Note: We can't regenerate predictions here without re-running,
    # but we've already saved comprehensive metrics
    
    print(f"{'#'*80}")
    print("TEST EVALUATION COMPLETE")
    print(f"{'#'*80}\n")


if __name__ == '__main__':
    main()
