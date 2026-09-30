"""
api_service.py
Flask API service for disease detection
Provides REST endpoint for the Node.js backend to call
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import tempfile
from pathlib import Path

from inference import DiseasePredictor

app = Flask(__name__)
CORS(app)

# Initialize predictor globally
predictor = None

def init_predictor():
    """Initialize the disease predictor"""
    global predictor
    if predictor is None:
        print("Initializing disease detection model...")
        predictor = DiseasePredictor()
        print("Model ready!")

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        init_predictor()
        return jsonify({
            'status': 'ok',
            'model': 'disease_efficientnet_b0',
            'classes': predictor.num_classes if predictor else 0
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 503

@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict disease from uploaded image
    
    Request:
        - multipart/form-data with 'image' field
    
    Response:
        {
            "class": "Tomato___Early_blight",
            "confidence": 0.92,
            "crop": "Tomato",
            "disease": "Early blight",
            "healthy": false
        }
    """
    try:
        # Initialize predictor if needed
        init_predictor()
        
        # Check if image is present
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        
        if file.filename == '':
            return jsonify({'error': 'Empty filename'}), 400
        
        # Save to temporary file
        temp_dir = tempfile.gettempdir()
        filename = secure_filename(file.filename)
        temp_path = os.path.join(temp_dir, f'disease_detect_{os.getpid()}_{filename}')
        
        try:
            file.save(temp_path)
            
            # Predict
            result = predictor.predict(temp_path, top_k=1)
            
            # Extract top prediction
            top = result['top_prediction']
            
            response = {
                'class': top['class'],
                'confidence': top['confidence'],
                'crop': top['crop'],
                'disease': top['disease'],
                'healthy': top['healthy']
            }
            
            return jsonify(response)
            
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    except Exception as e:
        print(f"Prediction error: {e}")
        return jsonify({
            'error': 'Prediction failed',
            'details': str(e)
        }), 500

@app.route('/predict/batch', methods=['POST'])
def predict_batch():
    """
    Predict multiple images
    
    Request:
        - multipart/form-data with multiple 'images' fields
    
    Response:
        {
            "results": [
                {
                    "class": "...",
                    "confidence": 0.92,
                    ...
                },
                ...
            ]
        }
    """
    try:
        init_predictor()
        
        if 'images' not in request.files:
            return jsonify({'error': 'No images provided'}), 400
        
        files = request.files.getlist('images')
        
        if len(files) == 0:
            return jsonify({'error': 'No images provided'}), 400
        
        results = []
        temp_paths = []
        
        try:
            # Save all files
            temp_dir = tempfile.gettempdir()
            for i, file in enumerate(files):
                filename = secure_filename(file.filename)
                temp_path = os.path.join(temp_dir, f'disease_detect_{os.getpid()}_{i}_{filename}')
                file.save(temp_path)
                temp_paths.append(temp_path)
            
            # Predict all
            batch_results = predictor.predict_batch(temp_paths, top_k=1)
            
            # Format results
            for batch_result in batch_results:
                if 'error' in batch_result:
                    results.append({'error': batch_result['error']})
                else:
                    top = batch_result['top_prediction']
                    results.append({
                        'class': top['class'],
                        'confidence': top['confidence'],
                        'crop': top['crop'],
                        'disease': top['disease'],
                        'healthy': top['healthy']
                    })
            
            return jsonify({'results': results})
            
        finally:
            # Clean up temp files
            for temp_path in temp_paths:
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
    
    except Exception as e:
        print(f"Batch prediction error: {e}")
        return jsonify({
            'error': 'Batch prediction failed',
            'details': str(e)
        }), 500

@app.route('/classes', methods=['GET'])
def get_classes():
    """
    Get all supported classes
    
    Response:
        {
            "classes": ["Tomato___Early_blight", ...],
            "count": 38
        }
    """
    try:
        init_predictor()
        
        classes = list(predictor.class_to_idx.keys())
        
        return jsonify({
            'classes': classes,
            'count': len(classes)
        })
    
    except Exception as e:
        return jsonify({
            'error': 'Failed to get classes',
            'details': str(e)
        }), 500

if __name__ == '__main__':
    print("Starting Disease Detection API Service")
    print("=" * 80)
    
    # Get configuration from environment
    host = os.environ.get('API_HOST', '0.0.0.0')
    port = int(os.environ.get('API_PORT', 5000))
    debug = os.environ.get('API_DEBUG', 'false').lower() == 'true'
    
    print(f"Host: {host}")
    print(f"Port: {port}")
    print(f"Debug: {debug}")
    print("=" * 80)
    
    # Run server
    app.run(host=host, port=port, debug=debug)
