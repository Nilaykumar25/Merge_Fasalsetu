'use strict';

/**
 * test-crop-wrapped.js
 * Integration test for Crop Wrapped feature
 * 
 * Usage: node test-crop-wrapped.js
 */

require('dotenv').config();
const db = require('./src/models/db');

async function testCropWrapped() {
  console.log('='.repeat(80));
  console.log('CROP WRAPPED — Integration Test');
  console.log('='.repeat(80));
  
  try {
    // Step 1: Create test farmer
    console.log('\n[1] Creating test farmer...');
    const farmerResult = await db.query(
      `INSERT INTO farmers (name, phone, state, district, land_area_ac)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      ['Test Farmer', '+919876543210', 'Maharashtra', 'Pune', 5.0]
    );
    const farmerId = farmerResult.rows[0].id;
    console.log(`✓ Farmer created: ${farmerId}`);
    
    // Step 2: Create test crop (season)
    console.log('\n[2] Creating test crop season...');
    const cropResult = await db.query(
      `INSERT INTO crops 
        (farmer_id, crop_type, variety, sow_date, expected_harvest_date, area_ac, status, season_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        farmerId,
        'Tomato',
        'Hybrid',
        '2026-06-01',
        '2026-09-30',
        2.5,
        'harvested',
        'Kharif 2026'
      ]
    );
    const cropId = cropResult.rows[0].id;
    console.log(`✓ Crop created: ${cropId}`);
    
    // Step 3: Create test recommendations
    console.log('\n[3] Creating test recommendations...');
    const recommendationTypes = [
      { type: 'irrigation', priority: 'high', title: 'Irrigation Required', body: 'Water deficit detected', impact: 5000 },
      { type: 'irrigation', priority: 'medium', title: 'Irrigation Suggested', body: 'Moisture low', impact: 3000 },
      { type: 'fertilizer', priority: 'medium', title: 'Fertilizer Needed', body: 'Nutrient deficiency', impact: 8000 },
      { type: 'fertilizer', priority: 'low', title: 'Fertilizer Recommended', body: 'Growth boost', impact: 4000 },
      { type: 'pesticide', priority: 'high', title: 'Early Blight Detected', body: 'Urgent treatment needed', impact: 12000 },
      { type: 'pesticide', priority: 'medium', title: 'Pest Activity', body: 'Preventive treatment', impact: 6000 },
      { type: 'cover', priority: 'high', title: 'Storm Warning', body: 'Protect crops', impact: 10000 },
    ];
    
    const recommendationIds = [];
    for (const rec of recommendationTypes) {
      const result = await db.query(
        `INSERT INTO recommendation_events 
          (crop_id, type, priority, title, body, status, predicted_revenue_impact)
         VALUES ($1, $2, $3, $4, $5, 'pending', $6)
         RETURNING id`,
        [cropId, rec.type, rec.priority, rec.title, rec.body, rec.impact]
      );
      recommendationIds.push(result.rows[0].id);
    }
    console.log(`✓ Created ${recommendationIds.length} recommendations`);
    
    // Step 4: Create test farmer actions
    console.log('\n[4] Creating test farmer actions...');
    
    // Followed actions
    for (let i = 0; i < 5; i++) {
      await db.query(
        `INSERT INTO farmer_actions 
          (recommendation_id, farmer_id, crop_id, followed, action_detail)
         VALUES ($1, $2, $3, $4, $5)`,
        [recommendationIds[i], farmerId, cropId, 'FOLLOWED', 'Action taken as recommended']
      );
    }
    
    // Not followed actions
    for (let i = 5; i < 6; i++) {
      await db.query(
        `INSERT INTO farmer_actions 
          (recommendation_id, farmer_id, crop_id, followed, action_detail)
         VALUES ($1, $2, $3, $4, $5)`,
        [recommendationIds[i], farmerId, cropId, 'NOT_FOLLOWED', 'Could not implement']
      );
    }
    
    // Unknown action (no action recorded for last recommendation)
    console.log('✓ Created farmer actions: 5 followed, 1 not followed, 1 unknown');
    
    // Step 5: Create test grading event (for financial data)
    console.log('\n[5] Creating test grading event...');
    await db.query(
      `INSERT INTO grading_events 
        (crop_id, grade, score, estimated_market_price, currency, unit)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [cropId, 'A2', 85, 184000, 'INR', 'total']
    );
    console.log('✓ Grading event created with revenue: ₹184,000');
    
    // Step 6: Generate Crop Wrapped report
    console.log('\n[6] Generating Crop Wrapped report...');
    const cropWrappedService = require('./src/services/cropWrappedService');
    const report = await cropWrappedService.generateCropWrapped(cropId, farmerId);
    
    // Display report
    console.log('\n' + '='.repeat(80));
    console.log('CROP WRAPPED REPORT');
    console.log('='.repeat(80));
    
    console.log('\n🌱 SEASON OVERVIEW');
    console.log(`   Crop: ${report.season.crop} (${report.season.variety || 'standard'})`);
    console.log(`   Season: ${report.season.name}`);
    console.log(`   Status: ${report.season.status}`);
    console.log(`   Days Tracked: ${report.season.daysTracked}`);
    
    console.log('\n📊 YOUR SEASON');
    console.log(`   Recommendations: ${report.overview.recommendations}`);
    console.log(`   Actions Recorded: ${report.overview.actionsRecorded}`);
    console.log(`   Followed: ${report.overview.followed}`);
    console.log(`   Not Followed: ${report.overview.notFollowed}`);
    console.log(`   Unknown: ${report.overview.unknown}`);
    console.log(`   Disease Alerts: ${report.overview.diseaseAlerts}`);
    
    console.log('\n🎯 RECOMMENDATION ADHERENCE');
    if (report.adherence.overall.percentage !== null) {
      console.log(`   Overall: ${report.adherence.overall.percentage.toFixed(2)}%`);
      console.log(`   (${report.adherence.overall.followed} of ${report.adherence.overall.knownActions} known actions)`);
    } else {
      console.log('   Insufficient data');
    }
    
    console.log('\n   By Category:');
    for (const [category, data] of Object.entries(report.adherence.byCategory)) {
      if (data.percentage !== null) {
        console.log(`   - ${category}: ${data.percentage.toFixed(2)}% (${data.followed}/${data.followed + data.notFollowed})`);
      }
    }
    
    if (report.disease.available) {
      console.log('\n🦠 DISEASE SUMMARY');
      console.log(`   Total Alerts: ${report.disease.totalAlerts}`);
      console.log(`   Major Challenge: ${report.disease.majorChallenge.title}`);
      console.log(`   Farmer Action: ${report.disease.majorChallenge.farmerAction}`);
    }
    
    if (report.financial.available) {
      console.log('\n💰 FINANCIAL STORY');
      console.log(`   Predicted Impact: ₹${report.financial.predictedImpact.toLocaleString()}`);
      console.log(`   Actual Revenue: ₹${report.financial.actualRevenue.toLocaleString()}`);
      console.log(`   Grade: ${report.financial.grade}`);
    } else {
      console.log('\n💰 FINANCIAL STORY');
      console.log(`   ${report.financial.reason}`);
    }
    
    if (report.seasonScore.available) {
      console.log('\n⭐ SEASON SCORE');
      console.log(`   Score: ${report.seasonScore.score}/100`);
      console.log('   Components:');
      for (const [component, data] of Object.entries(report.seasonScore.components)) {
        console.log(`   - ${component}: ${data.score}/100 (weight: ${(data.weight * 100).toFixed(0)}%)`);
      }
    }
    
    if (report.insights.whatWorked.length > 0) {
      console.log('\n✅ WHAT WORKED');
      report.insights.whatWorked.forEach(insight => {
        console.log(`   - ${insight}`);
      });
    }
    
    if (report.insights.whatToImprove.length > 0) {
      console.log('\n📈 WHAT TO IMPROVE');
      report.insights.whatToImprove.forEach(insight => {
        console.log(`   - ${insight}`);
      });
    }
    
    console.log('\n🌾 NEXT SEASON');
    if (report.nextSeason.continue.length > 0) {
      console.log('   Continue:');
      report.nextSeason.continue.forEach(action => {
        console.log(`   - ${action}`);
      });
    }
    if (report.nextSeason.improve.length > 0) {
      console.log('   Improve:');
      report.nextSeason.improve.forEach(action => {
        console.log(`   - ${action}`);
      });
    }
    if (report.nextSeason.watch.length > 0) {
      console.log('   Watch:');
      report.nextSeason.watch.forEach(action => {
        console.log(`   - ${action}`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✓ Test completed successfully!');
    console.log('='.repeat(80));
    
    // Cleanup
    console.log('\n[Cleanup] Removing test data...');
    await db.query('DELETE FROM farmer_actions WHERE farmer_id = $1', [farmerId]);
    await db.query('DELETE FROM grading_events WHERE crop_id = $1', [cropId]);
    await db.query('DELETE FROM recommendation_events WHERE crop_id = $1', [cropId]);
    await db.query('DELETE FROM crops WHERE id = $1', [cropId]);
    await db.query('DELETE FROM farmers WHERE id = $1', [farmerId]);
    console.log('✓ Test data cleaned up');
    
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

testCropWrapped();
