'use strict';

/**
 * middleware/auth.js
 * Simple authentication middleware for FasalSetu API
 * Extracts farmer ID from request (header, query, or body)
 */

const db = require('../models/db');

/**
 * Extract farmer ID from request
 * Supports multiple sources for flexibility:
 * 1. Authorization header: "Bearer <farmerId>"
 * 2. X-Farmer-Id header
 * 3. Query parameter: ?farmerId=xxx
 * 4. Request body: { farmerId: xxx }
 */
function extractFarmerId(req) {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  
  // Check custom header
  if (req.headers['x-farmer-id']) {
    return req.headers['x-farmer-id'];
  }
  
  // Check query parameter
  if (req.query.farmerId) {
    return req.query.farmerId;
  }
  
  // Check body
  if (req.body && req.body.farmerId) {
    return req.body.farmerId;
  }
  
  return null;
}

/**
 * Authentication middleware
 * Attaches farmer info to req.farmer
 */
async function authenticate(req, res, next) {
  try {
    const farmerId = extractFarmerId(req);
    
    if (!farmerId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide farmerId via Authorization header, X-Farmer-Id header, or query parameter',
      });
    }
    
    // Validate farmer exists
    const result = await db.query(
      'SELECT id, name, phone FROM farmers WHERE id = $1',
      [farmerId]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid farmer ID',
        message: 'Farmer not found',
      });
    }
    
    // Attach farmer to request
    req.farmer = result.rows[0];
    next();
  } catch (err) {
    console.error('[auth] Authentication error:', err);
    res.status(500).json({
      error: 'Authentication failed',
      message: err.message,
    });
  }
}

module.exports = { authenticate, extractFarmerId };
