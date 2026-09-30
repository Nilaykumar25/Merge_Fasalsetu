'use strict';

/**
 * routes/grading.js
 *
 * POST /api/grading
 *   multipart/form-data fields:
 *     image   (file, required)  — JPEG/PNG crop photo
 *     crop    (text, required)  — 'tomato' | 'banana' | 'potato' | 'onion'
 *     cropId  (text, optional)  — Supabase crops.id to persist result against
 *     notes   (text, optional)  — free-form notes
 *
 * GET /api/grading/:cropId/latest
 * GET /api/grading/:cropId/history
 */

const { Router } = require('express');
const multer      = require('multer');
const gradingService = require('../services/gradingService');

const router = Router();

// Store upload in memory (Buffer) — no disk write on the Node side
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },   // 10 MB max
  fileFilter(_req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      return cb(Object.assign(new Error('Only image files are accepted'), { status: 422 }));
    }
    cb(null, true);
  },
});


/**
 * POST /api/grading
 */
router.post('/', upload.single('image'), async (req, res, next) => {
  try {
    const { crop, cropId, notes } = req.body;

    if (!req.file) {
      return res.status(422).json({ error: 'image file is required (field name: image)' });
    }
    if (!crop) {
      return res.status(422).json({ error: 'crop field is required (tomato|banana|potato|onion)' });
    }

    const result = await gradingService.grade({
      crop,
      cropId: cropId || null,
      imageBuffer: req.file.buffer,
      notes: notes || null,
    });

    res.status(201).json(result);
  } catch (err) {
    // Surface known 422 errors (unsupported crop, bad image) cleanly
    if (err.status === 422 || err.message?.includes('No trained model')
        || err.message?.includes('No threshold config')) {
      return res.status(422).json({ error: err.message });
    }
    next(err);
  }
});


/**
 * GET /api/grading/:cropId/latest
 */
router.get('/:cropId/latest', async (req, res, next) => {
  try {
    const result = await gradingService.getLatest(req.params.cropId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});


/**
 * GET /api/grading/:cropId/history
 */
router.get('/:cropId/history', async (req, res, next) => {
  try {
    const history = await gradingService.getHistory(req.params.cropId);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
