'use strict';

/**
 * routes/disease.js
 *
 * POST /api/disease/detect
 *   multipart/form-data fields:
 *     image   (file, required)  — JPEG/PNG crop/leaf photo
 *     cropId  (text, optional)  — Supabase crops.id to persist result against
 *
 * GET /api/disease/supported-classes
 *   Returns list of supported disease classes
 */

const { Router } = require('express');
const multer = require('multer');
const diseaseDetectionService = require('../services/diseaseDetectionService');
const diseaseFlaggerService = require('../services/diseaseFlaggerService');
const { getKnowledge } = require('../config/diseaseKnowledge');
const { getSupportedCrops, getDiseasesByCrop } = require('../config/diseaseClasses');

const router = Router();

// Store upload in memory (Buffer) — no disk write
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter(_req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      return cb(Object.assign(new Error('Only image files are accepted'), { status: 422 }));
    }
    cb(null, true);
  },
});

/**
 * POST /api/disease/detect
 * Detect disease from uploaded crop/leaf image
 */
router.post('/detect', upload.single('image'), async (req, res, next) => {
  try {
    const { cropId } = req.body;

    if (!req.file) {
      return res.status(422).json({ error: 'image file is required (field name: image)' });
    }

    // Run ML detection
    const { className, confidence } = await diseaseDetectionService.detectDisease(req.file.buffer);
    
    // Map to disease info
    const diseaseInfo = diseaseDetectionService.mapToDiseaseInfo(className, confidence);
    
    // Get risk assessment
    const flag = diseaseFlaggerService.flagDisease(diseaseInfo);
    
    // Get treatment knowledge
    const knowledge = diseaseInfo.disease ? getKnowledge(diseaseInfo.disease) : null;

    // Build response
    const result = {
      success: true,
      analyzedAt: new Date().toISOString(),
      cropId: cropId || null,
      
      // Detection results
      detection: {
        className: diseaseInfo.className,
        crop: diseaseInfo.crop,
        disease: diseaseInfo.disease,
        healthy: diseaseInfo.healthy,
        confidence: Math.round(diseaseInfo.confidence * 100),
        confidenceLevel: diseaseInfo.confidenceLevel,
        category: diseaseInfo.category,
        scientificName: diseaseInfo.scientificName,
      },
      
      // Risk assessment
      assessment: {
        status: flag.status,
        riskLevel: flag.riskLevel,
        action: flag.action,
        message: flag.message,
        requiresAttention: flag.requiresAttention,
        urgent: flag.urgent,
      },
      
      // Treatment and prevention (if disease detected)
      knowledge: knowledge ? {
        symptoms: knowledge.symptoms || [],
        treatment: knowledge.treatment || [],
        prevention: knowledge.prevention || [],
        organic: knowledge.organic || [],
      } : null,
      
      // Model info
      model: {
        name: 'PlantVillage',
        provider: diseaseDetectionService.getModelInfo().provider,
      }
    };

    res.status(200).json(result);
  } catch (err) {
    // Handle specific errors
    if (err.message?.includes('MODEL_UNAVAILABLE')) {
      return res.status(503).json({ 
        error: 'Disease detection service is currently unavailable',
        details: err.message 
      });
    }
    if (err.message?.includes('UNKNOWN_CLASS')) {
      return res.status(422).json({ 
        error: 'Model returned unknown disease class',
        details: err.message 
      });
    }
    next(err);
  }
});

/**
 * GET /api/disease/supported-classes
 * Get all supported crops and their diseases
 */
router.get('/supported-classes', async (req, res, next) => {
  try {
    const crops = getSupportedCrops();
    const classes = crops.map(crop => ({
      crop,
      diseases: getDiseasesByCrop(crop),
    }));
    
    res.json({
      crops,
      classes,
      totalCrops: crops.length,
      modelInfo: diseaseDetectionService.getModelInfo(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/disease/health
 * Check if disease detection service is available
 */
router.get('/health', async (req, res) => {
  const available = await diseaseDetectionService.isModelAvailable();
  res.json({
    available,
    modelInfo: diseaseDetectionService.getModelInfo(),
  });
});

module.exports = router;
