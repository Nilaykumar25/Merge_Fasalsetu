'use strict';

/**
 * routes/alerts.js
 *
 * GET  /api/alerts             - Fetch all alerts for authenticated farmer
 * GET  /api/alerts/unread-count - Count of unread alerts
 * PATCH /api/alerts/:id/read   - Mark one alert as read
 * PATCH /api/alerts/read-all   - Mark all farmer's alerts as read
 * POST  /api/alerts/evaluate   - Manually trigger alert evaluation (dev/test)
 */

const { Router } = require('express');
const db = require('../models/db');
const alertsService = require('../services/alertsService');

const router = Router();

// ── Helper: get farmer_id from request ──────────────────────────────────────
// The frontend stores farmer_id in localStorage and sends it as X-Farmer-ID header.
// For Supabase-authenticated requests the farmer_id is passed the same way.
function getFarmerId(req) {
  return req.headers['x-farmer-id'] || req.query.farmer_id || null;
}

/**
 * GET /api/alerts
 * Query params:
 *   limit   (default 50)
 *   offset  (default 0)
 *   unread  (default false) — if "true", return only unread
 *   type    — filter by alert type
 */
router.get('/', async (req, res, next) => {
  try {
    const farmerId = getFarmerId(req);
    if (!farmerId) {
      return res.status(400).json({ error: 'farmer_id required (header X-Farmer-ID or query param)' });
    }

    const limit  = Math.min(parseInt(req.query.limit  || '50', 10), 200);
    const offset = parseInt(req.query.offset || '0', 10);
    const unreadOnly = req.query.unread === 'true';
    const typeFilter = req.query.type || null;

    const conditions = ['farmer_id = $1', '(expires_at IS NULL OR expires_at > NOW())'];
    const params = [farmerId];
    let idx = 2;

    if (unreadOnly) {
      conditions.push(`is_read = false`);
    }
    if (typeFilter) {
      conditions.push(`type = $${idx++}`);
      params.push(typeFilter);
    }

    params.push(limit, offset);

    const result = await db.query(
      `SELECT
         id, farmer_id, crop_id, type, severity, title, message, data,
         is_read, created_at, expires_at
       FROM farmer_alerts
       WHERE ${conditions.join(' AND ')}
       ORDER BY
         CASE severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
         created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    // Total count for pagination
    const countResult = await db.query(
      `SELECT COUNT(*) AS total FROM farmer_alerts
       WHERE ${conditions.slice(0, conditions.length - (params.length - idx + 2)).join(' AND ')}`,
      [farmerId, ...(typeFilter ? [typeFilter] : [])]
    );

    res.json({
      alerts: result.rows,
      total: parseInt(countResult.rows[0]?.total || '0', 10),
      unreadCount: await _getUnreadCount(farmerId),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/alerts/unread-count
 */
router.get('/unread-count', async (req, res, next) => {
  try {
    const farmerId = getFarmerId(req);
    if (!farmerId) return res.status(400).json({ error: 'farmer_id required' });

    const count = await _getUnreadCount(farmerId);
    res.json({ unreadCount: count });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/alerts/read-all
 * Must come before /:id route to avoid being matched as id="read-all"
 */
router.patch('/read-all', async (req, res, next) => {
  try {
    const farmerId = getFarmerId(req);
    if (!farmerId) return res.status(400).json({ error: 'farmer_id required' });

    await db.query(
      `UPDATE farmer_alerts SET is_read = true WHERE farmer_id = $1 AND is_read = false`,
      [farmerId]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/alerts/:id/read
 */
router.patch('/:id/read', async (req, res, next) => {
  try {
    const farmerId = getFarmerId(req);
    if (!farmerId) return res.status(400).json({ error: 'farmer_id required' });

    const result = await db.query(
      `UPDATE farmer_alerts
       SET is_read = true
       WHERE id = $1 AND farmer_id = $2
       RETURNING *`,
      [req.params.id, farmerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found or access denied' });
    }

    res.json({ alert: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/alerts/evaluate
 * Manually trigger alert evaluation for a specific farmer or all farmers.
 * Useful for development / immediate feedback.
 */
router.post('/evaluate', async (req, res, next) => {
  try {
    const farmerId = getFarmerId(req) || req.body?.farmer_id;

    if (farmerId) {
      // Evaluate only this farmer's crops
      const cropsResult = await db.query(
        `SELECT
           c.id AS crop_id, c.crop_type, c.farmer_id,
           chd.nitrogen_level, chd.phosphorus_level, chd.potassium_level,
           css.score, css.soil_moisture_pct, css.pest_pressure_score,
           css.leaf_color_score, css.growth_stage_pct, css.data_quality, css.computed_at
         FROM crops c
         LEFT JOIN LATERAL (
           SELECT * FROM crop_health_daily WHERE crop_id = c.id ORDER BY date DESC LIMIT 1
         ) chd ON true
         LEFT JOIN LATERAL (
           SELECT * FROM crop_state_snapshots WHERE crop_id = c.id ORDER BY computed_at DESC LIMIT 1
         ) css ON true
         WHERE c.farmer_id = $1 AND c.status = 'active'`,
        [farmerId]
      );

      let created = 0;
      for (const row of cropsResult.rows) {
        const n = await alertsService.evaluateAndUpsertAlerts({
          farmerId: row.farmer_id,
          cropId: row.crop_id,
          cropType: row.crop_type,
          healthDaily: row.nitrogen_level !== null ? row : null,
          snapshot: row.computed_at ? row : null,
        });
        created += n;
      }

      return res.json({ success: true, alertsCreated: created });
    }

    // Full evaluation for all farmers
    const created = await alertsService.runFullEvaluation();
    res.json({ success: true, alertsCreated: created });
  } catch (err) {
    next(err);
  }
});

async function _getUnreadCount(farmerId) {
  const r = await db.query(
    `SELECT COUNT(*) AS n FROM farmer_alerts
     WHERE farmer_id = $1 AND is_read = false
       AND (expires_at IS NULL OR expires_at > NOW())`,
    [farmerId]
  );
  return parseInt(r.rows[0]?.n || '0', 10);
}

module.exports = router;
