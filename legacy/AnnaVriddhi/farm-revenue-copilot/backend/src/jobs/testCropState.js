#!/usr/bin/env node
'use strict';

/**
 * Test script for cropStateJob.js
 * Run with: node src/jobs/testCropState.js
 */

require('dotenv').config();
const db = require('../models/db');
const cropStateJob = require('./cropStateJob');
const { v4: uuidv4 } = require('uuid');

async function setupTestData() {
  console.log('[test] Setting up test data…');
  
  // Create a test farmer
  const farmerResult = await db.query(
    `INSERT INTO farmers (name, phone, state, district, land_area_ac)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    ['Test Farmer', '+919999999999', 'Maharashtra', 'Pune', 10.5]
  );
  const farmerId = farmerResult.rows[0].id;

  // Create test crops with different stages
  const crops = [
    {
      crop_type: 'wheat',
      variety: 'HD-2967',
      sow_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
      area_ac: 2.5,
    },
    {
      crop_type: 'rice',
      variety: 'IR-64',
      sow_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 60 days ago
      area_ac: 3.0,
    },
    {
      crop_type: 'cotton',
      variety: 'BT-Cotton',
      sow_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days ago
      area_ac: 5.0,
    },
  ];

  const cropIds = [];
  for (const crop of crops) {
    const result = await db.query(
      `INSERT INTO crops (farmer_id, crop_type, variety, sow_date, area_ac, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING id`,
      [farmerId, crop.crop_type, crop.variety, crop.sow_date, crop.area_ac]
    );
    cropIds.push(result.rows[0].id);
  }

  console.log(`[test] Created ${cropIds.length} test crops`);
  return { farmerId, cropIds };
}

async function testCompleteRun() {
  console.log('\n=== Test 1: Complete job run ===');
  await cropStateJob.run();
  
  // Verify snapshots were created
  const snapshots = await db.query(
    `SELECT css.*, c.crop_type
     FROM crop_state_snapshots css
     JOIN crops c ON c.id = css.crop_id
     WHERE c.status = 'active'
     ORDER BY css.computed_at DESC
     LIMIT 10`
  );
  
  console.log(`\n[test] Latest snapshots (${snapshots.rows.length}):`);
  snapshots.rows.forEach(row => {
    console.log(`  - Crop ${row.crop_type} (${row.crop_id.substring(0, 8)}…): ` +
                `score=${row.score}, quality=${row.data_quality}, ` +
                `moisture=${row.soil_moisture_pct}, leaf=${row.leaf_color_score}, ` +
                `pest=${row.pest_pressure_score}, growth=${row.growth_stage_pct}`);
  });
}

async function testPartialFailure() {
  console.log('\n=== Test 2: Partial failure scenario ===');
  console.log('[test] This test simulates sensor failures (10% chance per crop)');
  console.log('[test] Running job 5 times to observe partial data handling…\n');
  
  for (let i = 1; i <= 5; i++) {
    console.log(`[test] Run ${i}/5:`);
    await cropStateJob.run();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between runs
  }
  
  // Check for any partial quality records
  const partialRecords = await db.query(
    `SELECT COUNT(*) as count
     FROM crop_state_snapshots
     WHERE data_quality = 'partial'`
  );
  
  console.log(`\n[test] Total partial-quality snapshots: ${partialRecords.rows[0].count}`);
}

async function testSingleCrop() {
  console.log('\n=== Test 3: Single crop processing ===');
  
  // Get one active crop
  const result = await db.query(
    `SELECT id, crop_type, sow_date FROM crops WHERE status = 'active' LIMIT 1`
  );
  
  if (result.rows.length === 0) {
    console.log('[test] No active crops found');
    return;
  }
  
  const crop = result.rows[0];
  console.log(`[test] Processing crop: ${crop.crop_type} (${crop.id})`);
  
  await cropStateJob.processOneCrop(crop);
  
  // Verify the snapshot
  const snapshot = await db.query(
    `SELECT * FROM crop_state_snapshots WHERE crop_id = $1 ORDER BY computed_at DESC LIMIT 1`,
    [crop.id]
  );
  
  console.log('[test] Created snapshot:', snapshot.rows[0]);
}

async function cleanup() {
  console.log('\n[test] Cleaning up test data…');
  
  // Delete test farmer and all related records (cascade will handle crops and snapshots)
  await db.query(
    `DELETE FROM farmers WHERE phone = '+919999999999'`
  );
  
  console.log('[test] Cleanup complete');
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  Crop State Job Test Suite                            ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Setup
    const { farmerId, cropIds } = await setupTestData();
    
    // Run tests
    await testCompleteRun();
    await testSingleCrop();
    await testPartialFailure();
    
    // Cleanup option
    const args = process.argv.slice(2);
    if (!args.includes('--keep-data')) {
      await cleanup();
    } else {
      console.log('\n[test] Test data preserved (--keep-data flag used)');
      console.log(`[test] Farmer ID: ${farmerId}`);
      console.log(`[test] Crop IDs: ${cropIds.join(', ')}`);
    }
    
    console.log('\n✅ All tests completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test failed:', err);
    process.exit(1);
  } finally {
    await db.end();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { setupTestData, testCompleteRun, testPartialFailure, testSingleCrop };
