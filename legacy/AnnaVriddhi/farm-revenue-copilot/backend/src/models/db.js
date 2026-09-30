'use strict';

/**
 * models/db.js
 * PostgreSQL connection pool for the Farm Revenue Copilot backend.
 */

const { Pool } = require('pg');
const dns = require('dns');

// Force IPv4 resolution first to avoid IPv6 connectivity issues on Windows
dns.setDefaultResultOrder('ipv4first');

// Determine if we're using Supabase (has supabase.co in connection string)
const isSupabase = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase.co');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Fallback to individual params if no connection string
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'farm_revenue_copilot',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  // Supabase requires SSL
  ssl: isSupabase ? {
    rejectUnauthorized: false
  } : false,
  max:      20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased timeout for remote connections
});

pool.on('error', (err) => {
  console.error('[db] Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Execute a SQL query with parameterized values.
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<object>} Query result
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('[db]', { text, duration, rows: res.rowCount });
    return res;
  } catch (err) {
    console.error('[db] Query error:', err);
    throw err;
  }
}

/**
 * Get a client from the pool for transaction handling.
 * Remember to call client.release() when done.
 */
async function getClient() {
  return await pool.connect();
}

/**
 * Close the pool gracefully (for shutdown).
 */
async function end() {
  await pool.end();
}

module.exports = {
  query,
  getClient,
  end,
  pool,
};
