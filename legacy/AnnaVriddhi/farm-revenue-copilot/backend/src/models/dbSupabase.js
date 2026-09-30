'use strict';

/**
 * models/dbSupabase.js
 * Supabase-specific database wrapper using REST API
 * Use this as fallback when direct PostgreSQL connection fails
 */

const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * Convert Supabase response to pg-compatible format
 */
function toPostgresResult(data, error) {
  if (error) {
    const err = new Error(error.message);
    err.code = error.code;
    err.detail = error.details;
    throw err;
  }
  
  return {
    rows: Array.isArray(data) ? data : (data ? [data] : []),
    rowCount: Array.isArray(data) ? data.length : (data ? 1 : 0),
    command: 'SELECT',
    fields: []
  };
}

/**
 * Execute a SQL query (limited - mainly for SELECT)
 * For complex queries, use Supabase query builder
 */
async function query(text, params) {
  const start = Date.now();
  
  try {
    // Very basic SQL parser - only handles simple SELECT queries
    // For production, use proper SQL parser or Supabase query builder
    const lowerText = text.trim().toLowerCase();
    
    if (lowerText.startsWith('select')) {
      // Extract table name (very basic)
      const match = text.match(/from\s+(\w+)/i);
      if (!match) throw new Error('Could not parse table name from query');
      
      const tableName = match[1];
      
      // Build query
      let query = supabase.from(tableName).select('*');
      
      // Handle simple WHERE clause
      if (lowerText.includes('where')) {
        const whereMatch = text.match(/where\s+(\w+)\s*=\s*\$1/i);
        if (whereMatch && params && params[0]) {
          query = query.eq(whereMatch[1], params[0]);
        }
      }
      
      // Handle LIMIT
      if (lowerText.includes('limit')) {
        const limitMatch = text.match(/limit\s+(\d+)/i);
        if (limitMatch) {
          query = query.limit(parseInt(limitMatch[1]));
        }
      }
      
      // Handle ORDER BY
      if (lowerText.includes('order by')) {
        const orderMatch = text.match(/order\s+by\s+(\w+)(?:\s+(asc|desc))?/i);
        if (orderMatch) {
          const ascending = !orderMatch[2] || orderMatch[2].toLowerCase() === 'asc';
          query = query.order(orderMatch[1], { ascending });
        }
      }
      
      const { data, error } = await query;
      const duration = Date.now() - start;
      console.log('[dbSupabase]', { text, duration, rows: data?.length || 0 });
      
      return toPostgresResult(data, error);
      
    } else if (lowerText.startsWith('insert')) {
      // Extract table name
      const match = text.match(/insert\s+into\s+(\w+)/i);
      if (!match) throw new Error('Could not parse table name from INSERT');
      
      const tableName = match[1];
      
      // This is complex - better to use direct Supabase API
      throw new Error('Use supabase.from(table).insert() instead of raw INSERT SQL');
      
    } else if (lowerText.startsWith('update')) {
      throw new Error('Use supabase.from(table).update() instead of raw UPDATE SQL');
    } else if (lowerText.startsWith('delete')) {
      throw new Error('Use supabase.from(table).delete() instead of raw DELETE SQL');
    } else {
      throw new Error(`Unsupported SQL command: ${text.substring(0, 50)}`);
    }
    
  } catch (err) {
    console.error('[dbSupabase] Query error:', err);
    throw err;
  }
}

/**
 * Get Supabase client for direct API access
 */
function getClient() {
  return supabase;
}

/**
 * No-op for compatibility
 */
async function end() {
  // Supabase client doesn't need explicit closing
}

module.exports = {
  query,
  getClient,
  end,
  supabase,
  
  // Direct exports for easier use
  from: (table) => supabase.from(table),
  storage: supabase.storage,
  auth: supabase.auth,
};
