#!/usr/bin/env node
'use strict';

/**
 * Database Connection Test Script
 * Tests if the backend can connect to PostgreSQL with current .env settings
 * Run with: node test-connection.js
 */

require('dotenv').config();
const { Pool } = require('pg');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

function section(title) {
  console.log('');
  log(colors.cyan, '═══════════════════════════════════════════════════════════');
  log(colors.green, ` ${title}`);
  log(colors.cyan, '═══════════════════════════════════════════════════════════');
  console.log('');
}

async function testConnection() {
  section('Database Connection Test');

  // Show configuration (mask password)
  log(colors.yellow, 'Configuration from .env:');
  console.log('  DB_HOST:    ', process.env.DB_HOST || 'localhost');
  console.log('  DB_PORT:    ', process.env.DB_PORT || '5432');
  console.log('  DB_NAME:    ', process.env.DB_NAME || 'farm_revenue_copilot');
  console.log('  DB_USER:    ', process.env.DB_USER || 'postgres');
  console.log('  DB_PASSWORD:', process.env.DB_PASSWORD ? '****' + process.env.DB_PASSWORD.slice(-2) : '(not set)');
  console.log('');

  // Create pool
  const pool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     process.env.DB_PORT     || 5432,
    database: process.env.DB_NAME     || 'farm_revenue_copilot',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || '',
    connectionTimeoutMillis: 5000,
  });

  // Test 1: Basic connection
  log(colors.yellow, 'Test 1: Basic Connection');
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    log(colors.green, '✓ Connection successful!');
    console.log('  Current time:  ', result.rows[0].current_time);
    console.log('  PostgreSQL:    ', result.rows[0].pg_version.split(' ').slice(0, 2).join(' '));
  } catch (err) {
    log(colors.red, '✗ Connection failed!');
    console.error('  Error:', err.message);
    console.log('');
    log(colors.yellow, 'Common Solutions:');
    console.log('  1. Ensure PostgreSQL is running');
    console.log('  2. Check credentials in .env file');
    console.log('  3. Verify database exists: farm_revenue_copilot');
    console.log('  4. Check firewall/network settings');
    console.log('');
    log(colors.cyan, 'See DATABASE_SETUP.md for setup instructions');
    await pool.end();
    process.exit(1);
  }

  // Test 2: Database exists
  console.log('');
  log(colors.yellow, 'Test 2: Database Check');
  try {
    const result = await pool.query('SELECT current_database() as db_name');
    log(colors.green, '✓ Database accessible!');
    console.log('  Database:      ', result.rows[0].db_name);
  } catch (err) {
    log(colors.red, '✗ Database check failed!');
    console.error('  Error:', err.message);
    await pool.end();
    process.exit(1);
  }

  // Test 3: Tables exist
  console.log('');
  log(colors.yellow, 'Test 3: Schema Verification');
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const expectedTables = [
      'crops',
      'crop_state_snapshots',
      'farmers',
      'grading_events',
      'irrigation_logs',
      'recommendation_events',
      'schemes',
    ];
    
    const actualTables = result.rows.map(r => r.table_name);
    const missingTables = expectedTables.filter(t => !actualTables.includes(t));
    
    if (missingTables.length === 0) {
      log(colors.green, '✓ All required tables exist!');
      actualTables.forEach(table => {
        console.log('  -', table);
      });
    } else {
      log(colors.red, '✗ Missing tables!');
      console.log('');
      console.log('  Found:', actualTables.length, 'tables');
      console.log('  Expected:', expectedTables.length, 'tables');
      console.log('');
      log(colors.yellow, 'Missing:');
      missingTables.forEach(table => {
        console.log('  -', table);
      });
      console.log('');
      log(colors.cyan, 'Run this to apply schema:');
      console.log('  psql -d farm_revenue_copilot -f src\\models\\schema.sql');
      console.log('');
      await pool.end();
      process.exit(1);
    }
  } catch (err) {
    log(colors.red, '✗ Schema verification failed!');
    console.error('  Error:', err.message);
    await pool.end();
    process.exit(1);
  }

  // Test 4: Check for data_quality column (Feature 1)
  console.log('');
  log(colors.yellow, 'Test 4: Feature 1 Schema Updates');
  try {
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'crop_state_snapshots' 
        AND column_name = 'data_quality'
    `);
    
    if (result.rows.length > 0) {
      log(colors.green, '✓ Feature 1 schema updates applied!');
      console.log('  - crop_state_snapshots.data_quality column exists');
    } else {
      log(colors.yellow, '⚠ Feature 1 schema updates missing!');
      console.log('  - data_quality column not found in crop_state_snapshots');
      console.log('');
      log(colors.cyan, 'Run this to update schema:');
      console.log('  psql -d farm_revenue_copilot -f src\\models\\schema.sql');
    }
  } catch (err) {
    log(colors.yellow, '⚠ Could not verify Feature 1 updates');
    console.error('  Error:', err.message);
  }

  // Test 5: Sample data check
  console.log('');
  log(colors.yellow, 'Test 5: Data Check');
  try {
    const farmers = await pool.query('SELECT COUNT(*) as count FROM farmers');
    const crops = await pool.query('SELECT COUNT(*) as count FROM crops');
    const snapshots = await pool.query('SELECT COUNT(*) as count FROM crop_state_snapshots');
    
    log(colors.green, '✓ Database is accessible!');
    console.log('  Farmers:               ', farmers.rows[0].count);
    console.log('  Crops:                 ', crops.rows[0].count);
    console.log('  Crop State Snapshots:  ', snapshots.rows[0].count);
    
    if (parseInt(crops.rows[0].count) === 0) {
      console.log('');
      log(colors.cyan, 'Tip: Run test suite to create sample data:');
      console.log('  npm run test:crop-state');
    }
  } catch (err) {
    log(colors.red, '✗ Data check failed!');
    console.error('  Error:', err.message);
  }

  await pool.end();

  // Success summary
  console.log('');
  log(colors.cyan, '═══════════════════════════════════════════════════════════');
  log(colors.green, '  All Tests Passed! ✓');
  log(colors.cyan, '═══════════════════════════════════════════════════════════');
  console.log('');
  log(colors.yellow, 'Next Steps:');
  console.log('  1. Run: npm run test:crop-state');
  console.log('  2. Run: npm run dev');
  console.log('');

  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (err) => {
  console.error('');
  log(colors.red, '✗ Unexpected error:');
  console.error(err);
  process.exit(1);
});

// Run tests
testConnection();
