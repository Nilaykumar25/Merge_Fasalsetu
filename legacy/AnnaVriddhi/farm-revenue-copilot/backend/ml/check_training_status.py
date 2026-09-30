"""
check_training_status.py
Check training progress and model status
"""

import json
from pathlib import Path
from datetime import datetime
from config import MODEL_OUTPUT_PATH

def check_status():
    """Check current training status"""
    print("="*80)
    print("TRAINING STATUS CHECK")
    print("="*80)
    
    # Check if model directory exists
    if not MODEL_OUTPUT_PATH.exists():
        print("\n✗ Model directory not found")
        print(f"  Expected: {MODEL_OUTPUT_PATH}")
        print("\n  Training has not been started yet.")
        return
    
    print(f"\nModel directory: {MODEL_OUTPUT_PATH}")
    
    # Check for best model
    best_model = MODEL_OUTPUT_PATH / 'disease_efficientnet_b0_best.pth'
    if best_model.exists():
        size_mb = best_model.stat().st_size / (1024**2)
        modified = datetime.fromtimestamp(best_model.stat().st_mtime)
        print(f"\n✓ Best model found:")
        print(f"  Path: {best_model.name}")
        print(f"  Size: {size_mb:.2f} MB")
        print(f"  Modified: {modified.strftime('%Y-%m-%d %H:%M:%S')}")
    else:
        print(f"\n✗ Best model not found")
        print(f"  Training may still be in progress or hasn't started")
    
    # Check for class mapping
    class_mapping = MODEL_OUTPUT_PATH / 'class_mapping.json'
    if class_mapping.exists():
        with open(class_mapping, 'r') as f:
            mapping = json.load(f)
        print(f"\n✓ Class mapping found:")
        print(f"  Classes: {mapping.get('num_classes', 'unknown')}")
    else:
        print(f"\n✗ Class mapping not found")
    
    # Check for training history
    history_file = MODEL_OUTPUT_PATH / 'training_history.json'
    if history_file.exists():
        with open(history_file, 'r') as f:
            history = json.load(f)
        
        print(f"\n✓ Training history found:")
        
        if 'stage1' in history:
            stage1 = history['stage1']
            print(f"\n  Stage 1:")
            print(f"    Epochs completed: {len(stage1)}")
            if stage1:
                last = stage1[-1]
                print(f"    Last epoch:")
                print(f"      Train Loss: {last.get('train_loss', 'N/A'):.4f}")
                print(f"      Train Acc:  {last.get('train_acc', 'N/A'):.2f}%")
                print(f"      Val Loss:   {last.get('val_loss', 'N/A'):.4f}")
                print(f"      Val Acc:    {last.get('val_acc', 'N/A'):.2f}%")
                print(f"      Val Macro F1: {last.get('val_macro_f1', 'N/A'):.4f}")
            
            best_f1 = history.get('stage1_best_macro_f1', None)
            if best_f1:
                print(f"    Best Macro F1: {best_f1:.4f}")
        
        if 'stage2' in history:
            stage2 = history['stage2']
            print(f"\n  Stage 2:")
            print(f"    Epochs completed: {len(stage2)}")
            if stage2:
                last = stage2[-1]
                print(f"    Last epoch:")
                print(f"      Train Loss: {last.get('train_loss', 'N/A'):.4f}")
                print(f"      Train Acc:  {last.get('train_acc', 'N/A'):.2f}%")
                print(f"      Val Loss:   {last.get('val_loss', 'N/A'):.4f}")
                print(f"      Val Acc:    {last.get('val_acc', 'N/A'):.2f}%")
                print(f"      Val Macro F1: {last.get('val_macro_f1', 'N/A'):.4f}")
            
            best_f1 = history.get('stage2_best_macro_f1', None)
            if best_f1:
                print(f"    Best Macro F1: {best_f1:.4f}")
    else:
        print(f"\n✗ Training history not found")
        print(f"  Training may still be in progress")
    
    # Check for test evaluation
    test_results = MODEL_OUTPUT_PATH / 'test_evaluation_results.json'
    if test_results.exists():
        with open(test_results, 'r') as f:
            results = json.load(f)
        
        overall = results.get('overall', {})
        print(f"\n✓ Test evaluation completed:")
        print(f"  Test Accuracy: {overall.get('accuracy', 0)*100:.2f}%")
        print(f"  Macro F1:      {overall.get('macro_f1', 0):.4f}")
        print(f"  Weighted F1:   {overall.get('weighted_f1', 0):.4f}")
    else:
        print(f"\n✗ Test evaluation not completed")
        print(f"  Run: python evaluate_test.py")
    
    # List all checkpoint files
    checkpoints = list(MODEL_OUTPUT_PATH.glob('*.pth'))
    if checkpoints:
        print(f"\nCheckpoint files ({len(checkpoints)}):")
        for cp in sorted(checkpoints):
            size_mb = cp.stat().st_size / (1024**2)
            print(f"  - {cp.name} ({size_mb:.1f} MB)")
    
    print("\n" + "="*80)
    
    # Recommendations
    if best_model.exists() and not test_results.exists():
        print("\n✓ Training complete!")
        print("  Next step: Run final test evaluation")
        print("  Command: python evaluate_test.py")
    elif not best_model.exists():
        print("\n⏳ Training in progress or not started")
        print("  Start training: python train.py")
        print("  Check again later")
    elif test_results.exists():
        print("\n✓ All steps complete!")
        print("  Model ready for deployment")
        print("  Test inference: python inference.py <image_path>")
    
    print("="*80 + "\n")

if __name__ == '__main__':
    check_status()
