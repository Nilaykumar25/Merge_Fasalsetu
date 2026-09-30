# Disease Detection Feature - Setup Guide

## Overview

The Disease Detection feature provides AI-powered crop disease identification using a trained PlantVillage model. Farmers can upload images of their crops or leaves, and the system will:

1. Detect diseases with confidence scores
2. Provide risk assessment (low/medium/high)
3. Offer treatment recommendations
4. Suggest prevention strategies
5. Include organic treatment options

## Architecture

```
┌─────────────────┐
│   Frontend      │  React/TypeScript UI
│  Disease.tsx    │  - Image upload (drag & drop, file picker)
│                 │  - Real-time analysis
│                 │  - Results display
└────────┬────────┘
         │
         │ HTTP/REST
         │
┌────────▼────────┐
│  Node.js API    │  Express Backend
│  /api/disease   │  - Route: disease.js
│                 │  - Service: diseaseDetectionService.js
│                 │  - Knowledge: diseaseKnowledge.js
└────────┬────────┘
         │
         │ HTTP/REST
         │
┌────────▼────────┐
│  Python ML API  │  Flask Service
│  api_service.py │  - Model: EfficientNet-B0
│                 │  - Inference: PyTorch
│                 │  - Classes: PlantVillage dataset
└─────────────────┘
```

## Backend Setup

### 1. Python ML Service

#### Install Dependencies

```bash
cd backend/ml

# Create virtual environment (if not exists)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate

# Install required packages
pip install torch torchvision flask flask-cors pillow
```

#### Start the ML API Service

```bash
# Set environment variables (optional)
export API_HOST=0.0.0.0
export API_PORT=5000
export API_DEBUG=false

# Run the API service
python api_service.py
```

The service will start on `http://localhost:5000` by default.

**Endpoints:**
- `GET /health` - Health check and model info
- `POST /predict` - Predict disease from single image
- `POST /predict/batch` - Predict multiple images
- `GET /classes` - Get all supported classes

### 2. Node.js Backend Configuration

#### Environment Variables

Add to `backend/.env`:

```env
# Disease Detection Model Configuration
DISEASE_MODEL_URL=http://localhost:5000/predict
DISEASE_MODEL_PROVIDER=python
DISEASE_CONFIDENCE_HIGH=0.80
DISEASE_CONFIDENCE_MEDIUM=0.60
```

**Configuration Options:**

- `DISEASE_MODEL_PROVIDER`:
  - `python` - Use Python Flask API service (recommended for production)
  - `mock` - Use mock detection (development only)
  
- `DISEASE_MODEL_URL`: URL to the Python ML service endpoint

- Confidence thresholds:
  - `DISEASE_CONFIDENCE_HIGH`: Threshold for high confidence (default: 0.80)
  - `DISEASE_CONFIDENCE_MEDIUM`: Threshold for medium confidence (default: 0.60)

#### Start Node.js Backend

```bash
cd backend
npm install
npm start
```

The backend will be available at `http://localhost:4000`.

**New API Endpoints:**

- `POST /api/disease/detect` - Detect disease from uploaded image
- `GET /api/disease/supported-classes` - Get all supported crops and diseases
- `GET /api/disease/health` - Check if ML service is available

## Frontend Setup

The frontend is already integrated into the main application. No additional setup required.

### Navigation

The Disease Detection page is accessible from:
- Sidebar → **Guidance** section → **Disease Detection**
- Direct route: `navigate('disease')`

### Features

1. **Image Upload**
   - Drag & drop support
   - File picker
   - Image preview
   - Supported formats: JPG, PNG, WebP

2. **Analysis**
   - Real-time detection
   - Loading states
   - Error handling
   - Confidence display

3. **Results Display**
   - Disease name and scientific name
   - Risk level (Clear/Low/Medium/High)
   - Confidence percentage
   - Symptoms list
   - Treatment recommendations
   - Prevention strategies
   - Organic treatment options

4. **Supported Diseases**
   - Visual grid showing all detectable diseases
   - Organized by crop type
   - Crop emojis for easy recognition

## Supported Crops and Diseases

The system currently supports the following:

### Apple
- Apple Scab
- Black Rot
- Cedar Apple Rust

### Corn (Maize)
- Gray Leaf Spot
- Common Rust
- Northern Leaf Blight

### Tomato
- Bacterial Spot
- Early Blight
- Late Blight
- Leaf Mold
- Septoria Leaf Spot
- Spider Mites
- Target Spot
- Yellow Leaf Curl Virus
- Mosaic Virus

### Potato
- Early Blight
- Late Blight

### Grape
- Black Rot
- Esca (Black Measles)
- Leaf Blight

### Pepper (Bell Pepper)
- Bacterial Spot

### Healthy Crops
All supported crops have healthy class detection.

## API Usage Examples

### Detect Disease (Node.js Backend)

```bash
curl -X POST http://localhost:4000/api/disease/detect \
  -F "image=@crop_image.jpg" \
  -F "cropId=optional-crop-id"
```

**Response:**
```json
{
  "success": true,
  "analyzedAt": "2024-11-14T10:30:00.000Z",
  "detection": {
    "className": "Tomato___Early_blight",
    "crop": "Tomato",
    "disease": "Early Blight",
    "healthy": false,
    "confidence": 92,
    "confidenceLevel": "high",
    "category": "fungal",
    "scientificName": "Alternaria solani"
  },
  "assessment": {
    "status": "disease_detected",
    "riskLevel": "medium",
    "action": "treat",
    "message": "Early Blight detected with high confidence (92%). Timely treatment recommended.",
    "requiresAttention": true,
    "urgent": false
  },
  "knowledge": {
    "symptoms": [
      "Dark concentric rings on lower leaves",
      "Yellow halos around lesions",
      "Premature leaf drop"
    ],
    "treatment": [
      "Remove affected leaves",
      "Apply copper-based fungicide",
      "Improve air circulation",
      "Avoid overhead watering"
    ],
    "prevention": [
      "Use disease-resistant varieties",
      "Rotate crops every 2-3 years",
      "Maintain proper spacing",
      "Mulch to prevent soil splash"
    ],
    "organic": [
      "Neem oil spray",
      "Copper sulfate solution",
      "Baking soda spray (1 tbsp per liter)"
    ]
  },
  "model": {
    "name": "PlantVillage",
    "provider": "python"
  }
}
```

### Get Supported Classes

```bash
curl http://localhost:4000/api/disease/supported-classes
```

**Response:**
```json
{
  "crops": ["Apple", "Corn", "Grape", "Pepper", "Potato", "Tomato"],
  "classes": [
    {
      "crop": "Tomato",
      "diseases": [
        "Bacterial Spot",
        "Early Blight",
        "Late Blight",
        ...
      ]
    },
    ...
  ],
  "totalCrops": 6,
  "modelInfo": {
    "provider": "python",
    "url": "http://localhost:5000/predict",
    "highConfidenceThreshold": 0.8,
    "mediumConfidenceThreshold": 0.6
  }
}
```

## Testing

### Test Python ML Service

```bash
cd backend/ml

# Test with a sample image
python inference.py path/to/test_image.jpg

# Or use the API directly
curl -X POST http://localhost:5000/predict \
  -F "image=@test_image.jpg"
```

### Test Full Stack

1. Start Python ML service: `python api_service.py`
2. Start Node.js backend: `npm start` (in backend directory)
3. Start frontend: `npm run dev` (in frontend directory)
4. Navigate to Disease Detection page
5. Upload an image and verify results

### Development Mode (Mock)

For development without the ML service:

```env
# In backend/.env
DISEASE_MODEL_PROVIDER=mock
```

This will return random mock predictions for testing the UI.

## Troubleshooting

### ML Service Not Starting

**Error:** `Model not found`
- **Solution:** Ensure your trained model is at `backend/ml/models/disease_efficientnet_b0_best.pth`
- Run training first: `python train.py`

**Error:** `ModuleNotFoundError: No module named 'torch'`
- **Solution:** Install dependencies: `pip install torch torchvision`

### Backend Connection Failed

**Error:** `MODEL_UNAVAILABLE: Cannot connect to disease detection service`
- **Solution:** 
  1. Verify Python ML service is running: `http://localhost:5000/health`
  2. Check `DISEASE_MODEL_URL` in backend `.env`
  3. Ensure no firewall blocking port 5000

### Frontend Image Upload Issues

**Error:** Image not uploading
- **Solution:**
  1. Check image size (max 10MB)
  2. Verify image format (JPG, PNG, WebP)
  3. Check browser console for errors

### Low Confidence Results

If you're getting low confidence predictions:
1. Ensure images are clear and well-lit
2. Focus on affected plant parts (leaves, stems)
3. Crop should be clearly visible
4. Consider retraining model with more diverse data

## Production Deployment

### Python ML Service

For production, consider:

1. **Use Gunicorn** (production WSGI server):
   ```bash
   pip install gunicorn
   gunicorn -w 4 -b 0.0.0.0:5000 api_service:app
   ```

2. **Docker Container**:
   ```dockerfile
   FROM python:3.9
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install -r requirements.txt
   COPY . .
   CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "api_service:app"]
   ```

3. **Environment Variables**:
   ```env
   API_HOST=0.0.0.0
   API_PORT=5000
   API_DEBUG=false
   ```

### Security Considerations

1. **File Upload Validation**: Already implemented in backend
2. **Rate Limiting**: Consider adding rate limits to prevent abuse
3. **Authentication**: Add API keys if exposing publicly
4. **HTTPS**: Use HTTPS in production
5. **Input Sanitization**: Already using `secure_filename`

## Performance Optimization

1. **Model Optimization**:
   - Consider model quantization for faster inference
   - Use ONNX runtime for production

2. **Caching**:
   - Cache results for identical images
   - Use Redis for distributed caching

3. **Batch Processing**:
   - Use batch endpoint for multiple images
   - Reduces overhead per image

4. **GPU Acceleration**:
   - Enable CUDA if GPU available
   - Set `device='cuda'` in predictor initialization

## Files Changed/Created

### Backend
- ✅ `backend/src/routes/disease.js` - New API route
- ✅ `backend/src/index.js` - Added disease route registration
- ✅ `backend/ml/api_service.py` - New Flask API service
- ✅ `backend/src/services/diseaseDetectionService.js` - Existing (no changes needed)
- ✅ `backend/src/services/diseaseFlaggerService.js` - Existing (no changes needed)
- ✅ `backend/src/config/diseaseKnowledge.js` - Existing (no changes needed)
- ✅ `backend/src/config/diseaseClasses.js` - Existing (no changes needed)

### Frontend
- ✅ `frontend/src/screens/DiseaseDetection.tsx` - New disease detection page
- ✅ `frontend/src/api/disease.js` - New API client
- ✅ `frontend/src/api/index.js` - Added disease exports
- ✅ `frontend/src/App.tsx` - Updated routing
- ✅ `frontend/src/components/ui.tsx` - Added disabled prop to Btn
- 🗑️ `frontend/src/screens/Disease.tsx` - Old static page (can be removed)

## Next Steps

1. **Start Services**:
   ```bash
   # Terminal 1: Python ML service
   cd backend/ml
   python api_service.py

   # Terminal 2: Node.js backend
   cd backend
   npm start

   # Terminal 3: React frontend
   cd frontend
   npm run dev
   ```

2. **Test the Feature**:
   - Navigate to Disease Detection page
   - Upload a crop/leaf image
   - Verify detection results
   - Check treatment recommendations

3. **Customize**:
   - Add more diseases to `diseaseClasses.js`
   - Update treatment info in `diseaseKnowledge.js`
   - Adjust confidence thresholds in `.env`

## Support

For issues or questions:
1. Check logs in Python ML service terminal
2. Check Node.js backend console
3. Check browser console for frontend errors
4. Verify all services are running and connected
