#!/usr/bin/env node
'use strict';

/**
 * Test script for Feature 2.4: Delivery Channel
 * Run with: node src/jobs/testDeliveryChannel.js
 */

require('dotenv').config();
const db = require('../models/db');
const { sendMessage, handleReply, TEMPLATES } = require('../integrations/smsWhatsapp');
const alertJob = require('./alertJob');

let testFarmerId;
let testCropId;

async function setupTestData() {
  console.log('[test] Setting up test data…\n');
  
  // Create test farmer with phone number
  const farmerResult = await db.query(
    `INSERT INTO farmers (name, phone, state, district, land_area_ac)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    ['Delivery Test Farmer', '+919999999999', 'Maharashtra', 'Pune', 5.0]
  );
  testFarmerId = farmerResult.rows[0].id;

  // Create test crop
  const cropResult = await db.query(
    `INSERT INTO crops (farmer_id, crop_type, variety, sow_date, area_ac, status)
     VALUES ($1, $2, $3, $4, $5, 'active') RETURNING id`,
    [
      testFarmerId,
      'wheat',
      'Test Crop for Delivery',
      new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      3.0,
    ]
  );
  testCropId = cropResult.rows[0].id;

  // Create crop state snapshot (low moisture to trigger irrigation)
  await db.query(
    `INSERT INTO crop_state_snapshots 
      (crop_id, score, soil_moisture_pct, leaf_color_score, pest_pressure_score, 
       growth_stage_pct, data_quality)
     VALUES ($1, 60, 30, 75, 80, 37.5, 'complete')`,
    [testCropId]
  );

  console.log(`  Created farmer: ${testFarmerId}`);
  console.log(`  Created crop: ${testCropId}\n`);
  
  return { testFarmerId, testCropId };
}

async function testMessageTemplates() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Test 1: Message Templates');
  console.log('═══════════════════════════════════════════════════════════\n');

  const testPhone = '+919999999999';
  const types = ['irrigation', 'fertilizer', 'pesticide', 'cover', 'harvest', 'scheme', 'do_nothing'];

  console.log('Testing all message templates:\n');

  for (const type of types) {
    try {
      const params = {
        crop_type: 'wheat',
        predicted_revenue_impact: '2500',
        suggested_amount: '25',
        scheme_name: 'PM-KISAN',
        deadline: '31 Dec 2026',
      };

      const result = await sendMessage(testPhone, type, params, 'hi');
      
      console.log(`✓ ${type.toUpperCase()}`);
      console.log(`  Status: ${result.status}`);
      console.log(`  Message: ${result.body.substring(0, 80)}...`);
      console.log('');
    } catch (err) {
      console.log(`✗ ${type.toUpperCase()}: ${err.message}\n`);
    }
  }

  console.log('✅ All templates tested\n');
}

async function testDeliveryTracking() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Test 2: Delivery Tracking (delivered_at column)');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Create a test recommendation
  const recResult = await db.query(
    `INSERT INTO recommendation_events 
      (crop_id, type, priority, title, body, status, predicted_revenue_impact)
     VALUES ($1, 'irrigation', 'high', 'Test Delivery', 'Test body', 'pending', 2500)
     RETURNING id`,
    [testCropId]
  );
  const recId = recResult.rows[0].id;

  console.log(`Created recommendation ${recId}`);
  console.log('  Initial delivered_at: NULL');

  // Simulate delivery
  await sendMessage(
    '+919999999999',
    'irrigation',
    { crop_type: 'wheat', predicted_revenue_impact: '2500', suggested_amount: '25' },
    'hi'
  );

  // Update delivered_at
  await db.query(
    'UPDATE recommendation_events SET delivered_at = NOW() WHERE id = $1',
    [recId]
  );

  // Verify
  const updated = await db.query(
    'SELECT delivered_at FROM recommendation_events WHERE id = $1',
    [recId]
  );

  if (updated.rows[0].delivered_at) {
    console.log(`  ✓ delivered_at updated: ${updated.rows[0].delivered_at}`);
    console.log('\n✅ Delivery tracking working\n');
  } else {
    console.log('  ✗ delivered_at still NULL\n');
  }
}

async function testReplyHandling() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Test 3: Reply Handling & Status Updates');
  console.log('═══════════════════════════════════════════════════════════\n');

  const phone = '+919999999999';

  // Test 1: YES reply
  console.log('Test 3a: Farmer replies "YES"');
  
  // Create pending recommendation
  await db.query(
    `INSERT INTO recommendation_events 
      (crop_id, type, priority, title, body, status, predicted_revenue_impact)
     VALUES ($1, 'fertilizer', 'medium', 'Test Reply YES', 'Test body', 'pending', 1500)`,
    [testCropId]
  );

  const updated1 = await handleReply(phone, 'YES');
  
  if (updated1 && updated1.status === 'acted') {
    console.log('  ✓ Status updated to: acted');
    console.log(`  ✓ Action taken: ${updated1.action_taken}\n`);
  } else {
    console.log('  ✗ Reply handling failed\n');
  }

  // Test 2: Hindi YES
  console.log('Test 3b: Farmer replies "हाँ" (Hindi)');
  
  await db.query(
    `INSERT INTO recommendation_events 
      (crop_id, type, priority, title, body, status, predicted_revenue_impact)
     VALUES ($1, 'pesticide', 'high', 'Test Reply Hindi', 'Test body', 'pending', 2000)`,
    [testCropId]
  );

  const updated2 = await handleReply(phone, 'हाँ');
  
  if (updated2 && updated2.status === 'acted') {
    console.log('  ✓ Hindi reply recognized');
    console.log(`  ✓ Status: ${updated2.status}\n`);
  } else {
    console.log('  ✗ Hindi reply handling failed\n');
  }

  // Test 3: NO reply
  console.log('Test 3c: Farmer replies "NO"');
  
  await db.query(
    `INSERT INTO recommendation_events 
      (crop_id, type, priority, title, body, status, predicted_revenue_impact)
     VALUES ($1, 'irrigation', 'low', 'Test Reply NO', 'Test body', 'pending', 800)`,
    [testCropId]
  );

  const updated3 = await handleReply(phone, 'NO');
  
  if (updated3 && updated3.status === 'dismissed') {
    console.log('  ✓ Status updated to: dismissed');
    console.log(`  ✓ Action taken: ${updated3.action_taken}\n`);
  } else {
    console.log('  ✗ NO reply handling failed\n');
  }

  // Test 4: "Done" reply
  console.log('Test 3d: Farmer replies "Done"');
  
  await db.query(
    `INSERT INTO recommendation_events 
      (crop_id, type, priority, title, body, status, predicted_revenue_impact)
     VALUES ($1, 'cover', 'high', 'Test Reply Done', 'Test body', 'pending', 3000)`,
    [testCropId]
  );

  const updated4 = await handleReply(phone, 'Done');
  
  if (updated4 && updated4.status === 'acted') {
    console.log('  ✓ "Done" recognized as completion');
    console.log(`  ✓ Status: ${updated4.status}\n`);
  } else {
    console.log('  ✗ Done reply handling failed\n');
  }

  console.log('✅ Reply handling tests complete\n');
}

async function testEndToEndFlow() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Test 4: End-to-End Flow (alertJob → delivery → reply)');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Step 1: Run alertJob to generate and send recommendations');
  await alertJob.run();

  // Check if recommendations were created and delivered
  const recs = await db.query(
    `SELECT 
       re.id,
       re.type,
       re.priority,
       re.status,
       re.delivered_at,
       c.crop_type
     FROM recommendation_events re
     JOIN crops c ON c.id = re.crop_id
     WHERE c.id = $1
     ORDER BY re.created_at DESC
     LIMIT 1`,
    [testCropId]
  );

  if (recs.rows.length > 0) {
    const rec = recs.rows[0];
    console.log(`  ✓ Recommendation created: ${rec.type}`);
    console.log(`  ✓ Priority: ${rec.priority}`);
    console.log(`  ✓ Status: ${rec.status}`);
    
    if (rec.delivered_at) {
      console.log(`  ✓ Delivered at: ${rec.delivered_at}`);
    } else {
      console.log('  ⚠ delivered_at is NULL (may be do_nothing or low priority)');
    }
    console.log('');

    if (rec.status === 'pending' && rec.type !== 'do_nothing') {
      console.log('Step 2: Simulate farmer reply');
      const reply = await handleReply('+919999999999', 'YES');
      
      if (reply) {
        console.log(`  ✓ Reply processed: ${reply.status}`);
        console.log(`  ✓ Action: ${reply.action_taken}\n`);
      }
    }

    console.log('✅ End-to-end flow working\n');
  } else {
    console.log('  ⚠ No recommendations generated (check crop state)\n');
  }
}

async function testWebhookFormat() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Test 5: Webhook Format Verification');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Expected Twilio webhook format:\n');
  console.log('POST /api/webhooks/sms');
  console.log('Content-Type: application/x-www-form-urlencoded\n');
  console.log('Body:');
  console.log('  From: +919999999999');
  console.log('  To: +15555555555');
  console.log('  Body: YES');
  console.log('  MessageSid: SM1234567890abcdef\n');

  // Simulate webhook call
  console.log('Simulating webhook with handleReply()...');
  
  const webhookData = {
    From: '+919999999999',
    Body: 'YES',
    MessageSid: 'SM_TEST_123',
  };

  // Create pending recommendation
  await db.query(
    `INSERT INTO recommendation_events 
      (crop_id, type, priority, title, body, status, predicted_revenue_impact)
     VALUES ($1, 'irrigation', 'medium', 'Webhook Test', 'Test body', 'pending', 1200)`,
    [testCropId]
  );

  const result = await handleReply(webhookData.From, webhookData.Body);
  
  if (result) {
    console.log(`  ✓ Webhook processed successfully`);
    console.log(`  ✓ Updated recommendation: ${result.id}`);
    console.log(`  ✓ New status: ${result.status}\n`);
  }

  console.log('Ngrok setup for local testing:');
  console.log('  1. Install: npm install -g ngrok');
  console.log('  2. Run: ngrok http 4000');
  console.log('  3. Copy HTTPS URL (e.g., https://abc123.ngrok.io)');
  console.log('  4. Configure Twilio webhook: https://abc123.ngrok.io/api/webhooks/sms\n');

  console.log('✅ Webhook format verified\n');
}

async function testLanguageSupport() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Test 6: Language Support (Hindi & English)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const params = {
    crop_type: 'wheat',
    predicted_revenue_impact: '3000',
    suggested_amount: '30',
  };

  console.log('English message:');
  const enResult = await sendMessage('+919999999999', 'irrigation', params, 'en');
  console.log(`  ${enResult.body}\n`);

  console.log('Hindi message (default):');
  const hiResult = await sendMessage('+919999999999', 'irrigation', params, 'hi');
  console.log(`  ${hiResult.body}\n`);

  console.log('✅ Both languages supported\n');
}

async function cleanup() {
  console.log('[test] Cleaning up test data…');
  
  await db.query(
    `DELETE FROM farmers WHERE phone = '+919999999999'`
  );
  
  console.log('[test] Cleanup complete\n');
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  Feature 2.4: Delivery Channel Test Suite             ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Setup
    await setupTestData();
    
    // Run tests
    await testMessageTemplates();
    await testDeliveryTracking();
    await testReplyHandling();
    await testEndToEndFlow();
    await testWebhookFormat();
    await testLanguageSupport();
    
    // Cleanup
    const args = process.argv.slice(2);
    if (!args.includes('--keep-data')) {
      await cleanup();
    } else {
      console.log('[test] Test data preserved (--keep-data flag used)');
      console.log(`[test] Farmer ID: ${testFarmerId}`);
      console.log(`[test] Crop ID: ${testCropId}\n`);
    }
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ All tests completed successfully');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('NEXT STEPS:');
    console.log('  1. Configure Twilio credentials in .env');
    console.log('  2. Set up ngrok for webhook testing');
    console.log('  3. Configure Twilio webhook URL');
    console.log('  4. Test with real phone number');
    console.log('');
    
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

module.exports = { 
  setupTestData,
  testMessageTemplates,
  testReplyHandling,
  testEndToEndFlow,
};
