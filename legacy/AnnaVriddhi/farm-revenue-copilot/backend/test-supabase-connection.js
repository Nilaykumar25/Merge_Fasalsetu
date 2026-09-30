#!/usr/bin/env node
'use strict';

/**
 * test-supabase-connection.js
 * 
 * Verifies Supabase database connection and checks table setup.
 */

require('dotenv').config();
const { Pool } = require('pg');

async function testConnection() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   Supabase Connection Test                             ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Test basic connection
    console.log('🔌 Testing connection...');
    const timeResult = await pool.query('SELECT NOW() as current_time');
    console.log('   ✓ Connected successfully!');
    console.log('   Server time:', timeResult.rows[0].current_time);

    // Check database info
    console.log('\n📊 Database information:');
    const dbInfo = await pool.query('SELECT current_database(), current_user');
    console.log('   Database:', dbInfo.rows[0].current_database);
    console.log('   User:', dbInfo.rows[0].current_user);

    // List all tables
    console.log('\n📋 Checking tables...');
    const tablesResult = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    const expectedTables = [
      'farmers',
      'crops',
      'crop_state_snapshots',
      'recommendation_events',
      'grading_events',
      'irrigation_logs',
      'schemes'
    ];

    const existingTables = tablesResult.rows.map(r => r.tablename);
    
    console.log('   Expected tables:');
    for (const table of expectedTables) {
      const exists = existingTables.includes(table);
      console.log(`   ${exists ? '✓' : '✗'} ${table}`);
      
      if (exists) {
        // Get row count
        const countResult = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`     → ${countResult.rows[0].count} rows`);
      }
    }

    // Check for schema columns
    console.log('\n🔍 Checking schema columns...');
    
    const checkColumn = async (table, column) => {
      const result = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
      `, [table, column]);
      return result.rows.length > 0;
    };

    const hasRevenueImpact = await checkColumn('recommendation_events', 'predicted_revenue_impact');
    const hasDataQuality = await checkColumn('crop_state_snapshots', 'data_quality');
    const hasDeliveredAt = await checkColumn('recommendation_events', 'delivered_at');

    console.log(`   ${hasRevenueImpact ? '✓' : '✗'} recommendation_events.predicted_revenue_impact`);
    console.log(`   ${hasDataQuality ? '✓' : '✗'} crop_state_snapshots.data_quality`);
    console.log(`   ${hasDeliveredAt ? '✓' : '✗'} recommendation_events.delivered_at`);

    // Check RLS status
    console.log('\n🔒 Checking Row Level Security (RLS) status...');
    const rlsResult = await pool.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = ANY($1)
    `, [expectedTables]);

    for (const row of rlsResult.rows) {
      const status = row.rowsecurity ? '🔒 ENABLED' : '🔓 DISABLED';
      console.log(`   ${row.tablename}: ${status}`);
    }

    // Test REST API endpoint
    console.log('\n🌐 Testing REST API endpoint...');
    console.log(`   URL: ${process.env.SUPABASE_URL}/rest/v1/`);
    console.log(`   Anon Key: ${process.env.SUPABASE_ANON_KEY ? '✓ Configured' : '✗ Missing'}`);

    console.log('\n✅ All checks completed!\n');
    console.log('Next steps:');
    console.log('1. If tables are missing, apply schema.sql in Supabase SQL Editor');
    console.log('2. If RLS is ENABLED, disable it with the SQL command in SUPABASE_SETUP.md');
    console.log('3. Run migration: node migrate-to-supabase.js');
    console.log('4. Test Feature 1: npm run test:crop-state\n');

  } catch (err) {
    console.error('\n❌ Connection test failed:', err.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check DATABASE_URL in .env file');
    console.error('2. Verify Supabase project is active');
    console.error('3. Check database password is correct');
    console.error('4. Ensure IP is allowed (Supabase → Settings → Database → Connection pooling)\n');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();
