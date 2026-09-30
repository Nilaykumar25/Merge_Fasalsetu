"""
inference.py
Inference script for disease detection model
Can be used standalone or integrated with backend service
"""

import torch
import torch.nn.functional as F
from torchvision import transforms
from PIL import Image
import json
from pathlib import Path
import sys

from config import MODEL_OUTPUT_PATH, IMAGE_SIZE
from model import create_model


class DiseasePredictor:
    """
    Disease detection predictor
    Loads trained model and performs inference on images
    """
    
    def __init__(self, model_path=None, device=None):
        """
        Initialize predictor
        
        Args:
            model_path: Path to model checkpoint (default: best model)
            device: Device to run on (default: auto-detect)
        """
        if model_path is None:
            model_path = MODEL_OUTPUT_PATH / 'disease_efficientnet_b0_best.pth'
        
        if device is None:
            device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        self.device = device
        self.model_path = Path(model_path)
        
        # Load checkpoint
        # weights_only=False needed for PyTorch 2.6+ compatibility with legacy checkpoints
        print(f"Loading model from: {self.model_path}")
        checkpoint = torch.load(self.model_path, map_location='cpu', weights_only=False)
        
        # Get class mapping
        if 'class_to_idx' not in checkpoint:
            raise ValueError("Checkpoint missing class_to_idx mapping")
        
        self.class_to_idx = checkpoint['class_to_idx']
        self.idx_to_class = {v: k for k, v in self.class_to_idx.items()}
        self.num_classes = len(self.class_to_idx)
        
        # Load model
        self.model = create_model(self.num_classes, pretrained=False)
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.model = self.model.to(self.device)
        self.model.eval()
        
        # Setup transforms
        self.transform = self._get_transforms()
        
        print(f"Model loaded on {self.device}")
        print(f"Classes: {self.num_classes}")
    
    def _get_transforms(self):
        """Get inference transforms"""
        return transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(IMAGE_SIZE),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])
    
    def predict(self, image_path, top_k=5):
        """
        Predict disease from image
        
        Args:
            image_path: Path to image file
            top_k: Return top K predictions
        
        Returns:
            dict: Prediction results
        """
        # Load and preprocess image
        image = Image.open(image_path).convert('RGB')
        image_tensor = self.transform(image).unsqueeze(0).to(self.device)
        
        # Inference
        with torch.no_grad():
            outputs = self.model(image_tensor)
            probabilities = F.softmax(outputs, dim=1)
        
        # Get top K predictions
        top_probs, top_indices = torch.topk(probabilities, top_k, dim=1)
        top_probs = top_probs[0].cpu().numpy()
        top_indices = top_indices[0].cpu().numpy()
        
        # Format results
        predictions = []
        for prob, idx in zip(top_probs, top_indices):
            class_name = self.idx_to_class[idx]
            predictions.append({
                'class': class_name,
                'confidence': float(prob),
                **self._parse_class_name(class_name)
            })
        
        return {
            'top_prediction': predictions[0],
            'top_k_predictions': predictions,
            'image_path': str(image_path)
        }
    
    def _parse_class_name(self, class_name):
        """
        Parse PlantVillage class name into crop and disease
        
        Args:
            class_name: Class name like "Tomato___Early_blight"
        
        Returns:
            dict: {crop, disease, healthy}
        """
        if '___' in class_name:
            parts = class_name.split('___')
            crop = parts[0].replace('_', ' ').strip()
            disease_part = parts[1].replace('_', ' ').strip()
            
            # Check if healthy
            healthy = disease_part.lower() == 'healthy'
            disease = None if healthy else disease_part
            
            return {
                'crop': crop,
                'disease': disease,
                'healthy': healthy
            }
        else:
            # Fallback for unexpected format
            return {
                'crop': 'Unknown',
                'disease': class_name,
                'healthy': False
            }
    
    def predict_batch(self, image_paths, top_k=5):
        """
        Predict multiple images
        
        Args:
            image_paths: List of image paths
            top_k: Return top K predictions per image
        
        Returns:
            list: List of prediction results
        """
        results = []
        for image_path in image_paths:
            try:
                result = self.predict(image_path, top_k=top_k)
                results.append(result)
            except Exception as e:
                results.append({
                    'error': str(e),
                    'image_path': str(image_path)
                })
        
        return results


def main():
    """Command-line interface for inference"""
    if len(sys.argv) < 2:
        print("Usage: python inference.py <image_path> [top_k]")
        print("Example: python inference.py test_image.jpg 3")
        sys.exit(1)
    
    image_path = sys.argv[1]
    top_k = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    
    if not Path(image_path).exists():
        print(f"Error: Image not found: {image_path}")
        sys.exit(1)
    
    # Initialize predictor
    predictor = DiseasePredictor()
    
    # Predict
    print(f"\nPredicting: {image_path}")
    print("=" * 80)
    
    result = predictor.predict(image_path, top_k=top_k)
    
    # Print results
    top = result['top_prediction']
    print(f"\nTop Prediction:")
    print(f"  Crop:       {top['crop']}")
    print(f"  Disease:    {top['disease'] if not top['healthy'] else 'Healthy'}")
    print(f"  Healthy:    {top['healthy']}")
    print(f"  Confidence: {top['confidence']*100:.2f}%")
    
    if len(result['top_k_predictions']) > 1:
        print(f"\nTop {top_k} Predictions:")
        print(f"{'Rank':<6} {'Crop':<20} {'Disease':<30} {'Confidence':<12}")
        print("-" * 80)
        for i, pred in enumerate(result['top_k_predictions'], 1):
            disease = pred['disease'] if not pred['healthy'] else 'Healthy'
            print(f"{i:<6} {pred['crop']:<20} {disease:<30} {pred['confidence']*100:>10.2f}%")
    
    print("=" * 80)


if __name__ == '__main__':
    main()
