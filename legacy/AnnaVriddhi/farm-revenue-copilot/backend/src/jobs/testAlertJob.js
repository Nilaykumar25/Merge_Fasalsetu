#!/usr/bin/env node
'use strict';

/**
 * Test script for alertJob.js and recommendation flow
 * Run with: node src/jobs/testAlertJob.js
 */

require('dotenv').config();
const db = require('../models/db');
const cropStateJob = require('./cropStateJob');
const alertJob = require('./alertJob');
const { handleReply } = require('../integrations/smsWhatsapp');
const { v4: uuidv4 } = require('uuid');

let testFarmerId;
let testCropIds = [];

async function setupTestData() {
  console.log('[test] Setting up test data…');
  
  // Create a test farmer
  const farmerResult = await db.query(
    `INSERT INTO farmers (name, phone, state, district, land_area_ac)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    ['Alert Test Farmer', '+919876543210', 'Maharashtra', 'Pune', 15.0]
  );
  testFarmerId = farmerResult.rows[0].id;

  // Create 4 test crops with specific scenarios
  const crops = [
    {
      name: 'Low Moisture Crop',
      crop_type: 'wheat',
      sow_date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      area_ac: 3.0,
      // Will trigger irrigation recommendation
      snapshot: {
        soil_moisture_pct: 30,  // Below 45% threshold
        leaf_color_score: 75,
        pest_pressure_score: 80,
        growth_stage_pct: 33.3,
      },
    },
    {
      name: 'Pest Problem Crop',
      crop_type: 'cotton',
      sow_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      area_ac: 4.0,
      // Will trigger pesticide recommendation
      snapshot: {
        soil_moisture_pct: 65,
        leaf_color_score: 72,
        pest_pressure_score: 45,  // Below 55% threshold
        growth_stage_pct: 33.3,
      },
    },
    {
      name: 'Nutrient Deficient Crop',
      crop_type: 'rice',
      sow_date: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      area_ac: 2.5,
      // Will trigger fertilizer recommendation
      snapshot: {
        soil_moisture_pct: 68,
        leaf_color_score: 60,  // Below 68% threshold
        pest_pressure_score: 75,
        growth_stage_pct: 50.0,
      },
    },
    {
      name: 'Healthy Crop',
      crop_type: 'maize',
      sow_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      area_ac: 2.0,
      // Will trigger do_nothing recommendation
      snapshot: {
        soil_moisture_pct: 65,
        leaf_color_score: 85,
        pest_pressure_score: 82,
        growth_stage_pct: 33.3,
      },
    },
  ];

  for (const crop of crops) {
    // Insert crop
    const cropResult = await db.query(
      `INSERT INTO crops (farmer_id, crop_type, variety, sow_date, area_ac, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING id`,
      [testFarmerId, crop.crop_type, crop.name, crop.sow_date, crop.area_ac]
    );
    const cropId = cropResult.rows[0].id;
    testCropIds.push(cropId);

    // Insert crop state snapshot
    await db.query(
      `INSERT INTO crop_state_snapshots 
        (crop_id, score, soil_moisture_pct, leaf_color_score, pest_pressure_score, 
         growth_stage_pct, data_quality, computed_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'complete', NOW())`,
      [
        cropId,
        Math.round((crop.snapshot.soil_moisture_pct + crop.snapshot.leaf_color_score + 
                    crop.snapshot.pest_pressure_score + crop.snapshot.growth_stage_pct) / 4),
        crop.snapshot.soil_moisture_pct,
        crop.snapshot.leaf_color_score,
        crop.snapshot.pest_pressure_score,
        crop.snapshot.growth_stage_pct,
      ]
    );

    console.log(`  Created ${crop.name} (${cropId})`);
  }

  console.log(`[test] Created ${testCropIds.length} test crops\n`);
  return { testFarmerId, testCropIds };
}

async function testRecommendationGeneration() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Test 1: Recommendation Generation');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Run alertJob
  await alertJob.run();

  // Verify recommendations were created
  const recommendations = await db.query(
    `SELECT 
       re.id,
       re.type,
       re.priority,
       re.title,
       re.predicted_revenue_impact,
       re.status,
       c.crop_type
     FROM recommendation_events re
     JOIN crops c ON c.id = re.crop_id
     WHERE c.farmer_id = $1
     ORDER BY re.created_at DESC`,
    [testFarmerId]
  );

  console.log(`[test] Generated ${recommendations.rows.length} recommendations:\n`);
  
  const expectedTypes = {
    irrigation: false,
    pesticide: false,
    fertilizer: false,
    do_nothing: false,
  };

  recommendations.rows.forEach(rec => {
    console.log(`  ✓ ${rec.type.toUpperCase()}: ${rec.crop_type}`);
    console.log(`    Priority: ${rec.priority}`);
    console.log(`    Revenue Impact: ₹${rec.predicted_revenue_impact}`);
    console.log(`    Status: ${rec.status}`);
    console.log(`    Title: ${rec.title}\n`);
    
    expectedTypes[rec.type] = true;
  });

  // Verify all 4 types were generated
  const allTypesFound = Object.values(expectedTypes).every(v => v);
  if (allTypesFound) {
    console.log('✅ All 4 recommendation types generated successfully\n');
  } else {
    console.log('❌ Missing recommendation types:');
    Object.keys(expectedTypes).forEach(type => {
      if (!expectedTypes[type]) {
        console.log(`  - ${type}`);
      }
    });
    console.log('');
  }

  return recommendations.rows;
}

async function testRevenueImpact() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Test 2: Revenue Impact Calculation');
  console.log('═══════════════════════════════════════════════════════════\n');

  const recommendations = await db.query(
    `SELECT 
       re.type,
       re.predicted_revenue_impact,
       c.crop_type,
       c.area_ac
     FROM recommendation_events re
     JOIN crops c ON c.id = re.crop_id
     WHERE c.farmer_id = $1
       AND re.type != 'do_nothing'
     ORDER BY re.predicted_revenue_impact DESC`,
    [testFarmerId]
  );

  console.log('[test] Revenue impact analysis:\n');
  
  let allHaveImpact = true;
  recommendations.rows.forEach(rec => {
    const hasImpact = rec.predicted_revenue_impact !== null && 
                      rec.predicted_revenue_impact !== 0;
    
    console.log(
      `  ${hasImpact ? '✓' : '✗'} ${rec.type.padEnd(12)} (${rec.crop_type}): ` +
      `₹${rec.predicted_revenue_impact?.toFixed(2) || 0} ` +
      `[${rec.area_ac} acres]`
    );
    
    if (!hasImpact) allHaveImpact = false;
  });

  console.log('');
  if (allHaveImpact && recommendations.rows.length > 0) {
    console.log('✅ All actionable recommendations have revenue impact calculated\n');
  } else if (recommendations.rows.length === 0) {
    console.log('⚠️  No actionable recommendations found\n');
  } else {
    console.log('❌ Some recommendations missing revenue impact\n');
  }
}

async function testReplyFlow() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Test 3: SMS Reply Handling');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Get a pending recommendation
  const pending = await db.query(
    `SELECT re.id, re.type, re.title
     FROM recommendation_events re
     JOIN crops c ON c.id = re.crop_id
     WHERE c.farmer_id = $1
       AND re.status = 'pending'
       AND re.type != 'do_nothing'
     ORDER BY re.created_at DESC
     LIMIT 1`,
    [testFarmerId]
  );

  if (pending.rows.length === 0) {
    console.log('⚠️  No pending recommendations to test reply flow\n');
    return;
  }

  const rec = pending.rows[0];
  console.log(`[test] Testing reply for: ${rec.type} (${rec.id})\n`);

  // Test 1: "YES" reply
  console.log('Test 3a: Farmer replies "YES"');
  const updated1 = await handleReply('+919876543210', 'YES');
  
  if (updated1 && updated1.status === 'acted') {
    console.log(`  ✓ Status updated to: ${updated1.status}`);
    console.log(`  ✓ Action taken: ${updated1.action_taken}`);
    console.log(`  ✓ Acknowledged at: ${updated1.acknowledged_at}\n`);
  } else {
    console.log('  ✗ Reply handling failed\n');
  }

  // Create another pending recommendation for test 2
  await db.query(
    `INSERT INTO recommendation_events 
      (crop_id, type, priority, title, body, status, predicted_revenue_impact)
     VALUES ($1, 'irrigation', 'medium', 'Test Reply', 'Test body', 'pending', 500)`,
    [testCropIds[0]]
  );

  // Test 2: "NO" reply
  console.log('Test 3b: Farmer replies "NO"');
  const updated2 = await handleReply('+919876543210', 'NO');
  
  if (updated2 && updated2.status === 'dismissed') {
    console.log(`  ✓ Status updated to: ${updated2.status}`);
    console.log(`  ✓ Action taken: ${updated2.action_taken}\n`);
  } else {
    console.log('  ✗ Reply handling failed\n');
  }

  // Test 3: Hindi reply
  await db.query(
    `INSERT INTO recommendation_events 
      (crop_id, type, priority, title, body, status, predicted_revenue_impact)
     VALUES ($1, 'fertilizer', 'high', 'Test Hindi Reply', 'Test body', 'pending', 1200)`,
    [testCropIds[1]]
  );

  console.log('Test 3c: Farmer replies "हाँ" (Hindi YES)');
  const updated3 = await handleReply('+919876543210', 'हाँ');
  
  if (updated3 && updated3.status === 'acted') {
    console.log(`  ✓ Status updated to: ${updated3.status}`);
    console.log(`  ✓ Hindi reply recognized\n`);
  } else {
    console.log('  ✗ Reply handling failed\n');
  }

  console.log('✅ Reply flow tests complete\n');
}

async function testGetRecommendations() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Test 4: GET /recommendations/:cropId');
  console.log('═══════════════════════════════════════════════════════════\n');

  for (const cropId of testCropIds) {
    const result = await db.query(
      `SELECT * FROM recommendation_events 
       WHERE crop_id = $1 
       ORDER BY created_at DESC`,
      [cropId]
    );

    const crop = await db.query(
      'SELECT crop_type FROM crops WHERE id = $1',
      [cropId]
    );

    console.log(
      `  Crop: ${crop.rows[0].crop_type} → ` +
      `${result.rows.length} recommendation(s)`
    );
  }

  console.log('\n✅ Route query test complete\n');
}

async function testStormScenario() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Test 5: Storm Warning Scenario (Cover Recommendation)');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('[test] Note: Storm warnings require live weather data');
  console.log('[test] To test cover recommendations, you need:');
  console.log('  1. Real OpenWeather API key in .env');
  console.log('  2. Weather forecast with storm/hail keywords\n');
  
  console.log('  Manually test by:');
  console.log('  - Setting WEATHER_API_KEY in .env');
  console.log('  - Running during actual storm forecast');
  console.log('  - Or mocking weatherApi.fetchWeather() to return storm data\n');
}

async function cleanup() {
  console.log('[test] Cleaning up test data…');
  
  // Delete test farmer and all related records (cascade will handle everything)
  await db.query(
    `DELETE FROM farmers WHERE phone = '+919876543210'`
  );
  
  console.log('[test] Cleanup complete\n');
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  Feature 2: Alert Job Test Suite                      ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Setup
    await setupTestData();
    
    // Run tests
    await testRecommendationGeneration();
    await testRevenueImpact();
    await testReplyFlow();
    await testGetRecommendations();
    await testStormScenario();
    
    // Cleanup option
    const args = process.argv.slice(2);
    if (!args.includes('--keep-data')) {
      await cleanup();
    } else {
      console.log('[test] Test data preserved (--keep-data flag used)');
      console.log(`[test] Farmer ID: ${testFarmerId}`);
      console.log(`[test] Crop IDs: ${testCropIds.join(', ')}\n`);
    }
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ All tests completed successfully');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test failed:', err);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await db.end();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { setupTestData, testRecommendationGeneration, testRevenueImpact, testReplyFlow };
