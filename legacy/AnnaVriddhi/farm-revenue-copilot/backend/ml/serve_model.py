"""
serve_model.py
Simple HTTP server for disease detection model inference
Can be called by Node.js backend via HTTP API
"""

from flask import Flask, request, jsonify
import torch
from PIL import Image
import io
import traceback
from pathlib import Path

from inference import DiseasePredictor
from config import MODEL_OUTPUT_PATH

app = Flask(__name__)

# Global predictor instance (loaded once at startup)
predictor = None


def init_predictor():
    """Initialize predictor at startup"""
    global predictor
    try:
        model_path = MODEL_OUTPUT_PATH / 'disease_efficientnet_b0_best.pth'
        if not model_path.exists():
            print(f"ERROR: Model not found at {model_path}")
            print("Please train the model first: python train.py")
            return False
        
        predictor = DiseasePredictor(model_path=model_path)
        print("✓ Model loaded successfully")
        return True
    except Exception as e:
        print(f"ERROR loading model: {e}")
        traceback.print_exc()
        return False


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    if predictor is None:
        return jsonify({
            'status': 'error',
            'message': 'Model not loaded'
        }), 503
    
    return jsonify({
        'status': 'ok',
        'message': 'Disease detection service running',
        'model': 'EfficientNet-B0',
        'classes': predictor.num_classes,
        'device': str(predictor.device)
    })


@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict disease from uploaded image
    
    Request:
        - Content-Type: multipart/form-data
        - Field 'image': image file
        - Optional 'top_k': number of top predictions (default: 5)
    
    Response:
        {
            "class": "Tomato___Early_blight",
            "confidence": 0.95,
            "crop": "Tomato",
            "disease": "Early blight",
            "healthy": false,
            "top_k": [...]
        }
    """
    if predictor is None:
        return jsonify({
            'error': 'Model not loaded'
        }), 503
    
    try:
        # Check if image is in request
        if 'image' not in request.files:
            return jsonify({
                'error': 'No image provided',
                'message': 'Please upload an image file with field name "image"'
            }), 400
        
        file = request.files['image']
        
        if file.filename == '':
            return jsonify({
                'error': 'Empty filename'
            }), 400
        
        # Get top_k parameter (default: 5)
        top_k = request.form.get('top_k', 5, type=int)
        top_k = max(1, min(top_k, predictor.num_classes))
        
        # Read image
        image_bytes = file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        
        # Save to temporary file for predictor
        # (predictor expects file path, not PIL image)
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
            image.save(tmp.name)
            tmp_path = tmp.name
        
        try:
            # Predict
            result = predictor.predict(tmp_path, top_k=top_k)
            
            # Format response (compatible with existing backend)
            top_pred = result['top_prediction']
            response = {
                'class': top_pred['class'],
                'confidence': top_pred['confidence'],
                'crop': top_pred['crop'],
                'disease': top_pred['disease'],
                'healthy': top_pred['healthy'],
                'top_k_predictions': result['top_k_predictions']
            }
            
            return jsonify(response)
        
        finally:
            # Clean up temp file
            Path(tmp_path).unlink(missing_ok=True)
    
    except Exception as e:
        print(f"Prediction error: {e}")
        traceback.print_exc()
        return jsonify({
            'error': 'Prediction failed',
            'message': str(e)
        }), 500


@app.route('/classes', methods=['GET'])
def get_classes():
    """Get list of all supported classes"""
    if predictor is None:
        return jsonify({
            'error': 'Model not loaded'
        }), 503
    
    classes = []
    for class_name in predictor.class_to_idx.keys():
        parsed = predictor._parse_class_name(class_name)
        classes.append({
            'class': class_name,
            'crop': parsed['crop'],
            'disease': parsed['disease'],
            'healthy': parsed['healthy']
        })
    
    return jsonify({
        'classes': classes,
        'total': len(classes)
    })


def main():
    """Start the server"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Disease Detection Model Server')
    parser.add_argument('--host', default='127.0.0.1', help='Host to bind to')
    parser.add_argument('--port', type=int, default=5000, help='Port to bind to')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    
    args = parser.parse_args()
    
    print("="*80)
    print("DISEASE DETECTION MODEL SERVER")
    print("="*80)
    print(f"Host: {args.host}")
    print(f"Port: {args.port}")
    print(f"Debug: {args.debug}")
    print("="*80)
    
    # Initialize predictor
    if not init_predictor():
        print("\nFailed to initialize predictor. Exiting.")
        return
    
    print(f"\n✓ Server ready")
    print(f"Health check: http://{args.host}:{args.port}/health")
    print(f"Predict: POST http://{args.host}:{args.port}/predict")
    print(f"Classes: GET http://{args.host}:{args.port}/classes")
    print("="*80 + "\n")
    
    # Start server
    app.run(host=args.host, port=args.port, debug=args.debug)


if __name__ == '__main__':
    main()
