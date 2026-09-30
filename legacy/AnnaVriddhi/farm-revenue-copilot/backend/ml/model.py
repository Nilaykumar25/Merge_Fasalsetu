"""
model.py
EfficientNet-B0 model architecture for disease detection
"""

import torch
import torch.nn as nn
from torchvision import models
from config import NUM_CLASSES, DROPOUT


class DiseaseDetectionModel(nn.Module):
    """
    EfficientNet-B0 based disease detection model
    Uses transfer learning from ImageNet pretrained weights
    """
    
    def __init__(self, num_classes, pretrained=True, dropout=DROPOUT):
        super(DiseaseDetectionModel, self).__init__()
        
        # Load pretrained EfficientNet-B0
        if pretrained:
            weights = models.EfficientNet_B0_Weights.IMAGENET1K_V1
            self.efficientnet = models.efficientnet_b0(weights=weights)
        else:
            self.efficientnet = models.efficientnet_b0(weights=None)
        
        # Get feature dimension
        in_features = self.efficientnet.classifier[1].in_features
        
        # Replace classifier head
        self.efficientnet.classifier = nn.Sequential(
            nn.Dropout(p=dropout, inplace=True),
            nn.Linear(in_features, num_classes)
        )
        
        self.num_classes = num_classes
    
    def forward(self, x):
        return self.efficientnet(x)
    
    def freeze_feature_extractor(self):
        """Freeze all layers except classifier (for Stage 1)"""
        # Freeze all parameters
        for param in self.efficientnet.parameters():
            param.requires_grad = False
        
        # Unfreeze classifier
        for param in self.efficientnet.classifier.parameters():
            param.requires_grad = True
        
        print("Feature extractor frozen (classifier head only trainable)")
    
    def unfreeze_layers(self, num_layers):
        """
        Unfreeze last N layers for fine-tuning (Stage 2)
        
        Args:
            num_layers: Number of layers to unfreeze from the end
        """
        # Get all named parameters
        all_params = list(self.efficientnet.named_parameters())
        
        # Unfreeze last num_layers
        for name, param in all_params[-num_layers:]:
            param.requires_grad = True
        
        # Count trainable parameters
        trainable = sum(p.numel() for p in self.parameters() if p.requires_grad)
        total = sum(p.numel() for p in self.parameters())
        
        print(f"Unfroze last {num_layers} layers")
        print(f"Trainable parameters: {trainable:,} / {total:,} ({100*trainable/total:.2f}%)")
    
    def get_trainable_params(self):
        """Get list of trainable parameters"""
        return [p for p in self.parameters() if p.requires_grad]
    
    def count_parameters(self):
        """Count total and trainable parameters"""
        total = sum(p.numel() for p in self.parameters())
        trainable = sum(p.numel() for p in self.parameters() if p.requires_grad)
        return total, trainable


def create_model(num_classes, pretrained=True, dropout=DROPOUT):
    """
    Create disease detection model
    
    Args:
        num_classes: Number of disease classes
        pretrained: Whether to use ImageNet pretrained weights
        dropout: Dropout rate for classifier
    
    Returns:
        DiseaseDetectionModel
    """
    model = DiseaseDetectionModel(
        num_classes=num_classes,
        pretrained=pretrained,
        dropout=dropout
    )
    
    total, trainable = model.count_parameters()
    print(f"\nModel created: EfficientNet-B0")
    print(f"Total parameters: {total:,}")
    print(f"Trainable parameters: {trainable:,}")
    print(f"Output classes: {num_classes}")
    print(f"Dropout: {dropout}")
    
    return model


def load_checkpoint(checkpoint_path, num_classes):
    """
    Load model from checkpoint
    
    Args:
        checkpoint_path: Path to checkpoint file
        num_classes: Number of classes
    
    Returns:
        tuple: (model, checkpoint_dict)
    """
    model = create_model(num_classes, pretrained=False)
    
    checkpoint = torch.load(checkpoint_path, map_location='cpu')
    model.load_state_dict(checkpoint['model_state_dict'])
    
    print(f"Model loaded from: {checkpoint_path}")
    print(f"Epoch: {checkpoint.get('epoch', 'unknown')}")
    
    return model, checkpoint


if __name__ == '__main__':
    # Test model creation
    print("Testing model creation...")
    
    model = create_model(num_classes=38, pretrained=True)
    
    # Test forward pass
    dummy_input = torch.randn(2, 3, 224, 224)
    output = model(dummy_input)
    
    print(f"\nForward pass test:")
    print(f"  Input shape: {dummy_input.shape}")
    print(f"  Output shape: {output.shape}")
    print(f"  Expected: (2, 38)")
    
    # Test freezing
    print(f"\n{'='*60}")
    print("Testing Stage 1 (freeze feature extractor):")
    print(f"{'='*60}")
    model.freeze_feature_extractor()
    total, trainable = model.count_parameters()
    print(f"Trainable: {trainable:,} / {total:,}")
    
    # Test unfreezing
    print(f"\n{'='*60}")
    print("Testing Stage 2 (unfreeze layers):")
    print(f"{'='*60}")
    model.unfreeze_layers(50)
    
    print("\n✓ Model tests passed")
