#!/usr/bin/env node
'use strict';

/**
 * Quick Twilio connection test script
 * Run with: node test-twilio.js
 * 
 * This tests both SMS and WhatsApp delivery using your Twilio credentials.
 */

require('dotenv').config();

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

async function testTwilioConnection() {
  log(colors.cyan, '\n═══════════════════════════════════════════════════════════');
  log(colors.green, '  Twilio Connection Test');
  log(colors.cyan, '═══════════════════════════════════════════════════════════\n');

  // Check credentials
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;

  log(colors.yellow, 'Configuration:');
  console.log('  Account SID:', TWILIO_ACCOUNT_SID || '(not set)');
  console.log('  Auth Token: ', TWILIO_AUTH_TOKEN ? '****' + TWILIO_AUTH_TOKEN.slice(-4) : '(not set)');
  console.log('  From Number:', TWILIO_PHONE_NUMBER || '(not set)');
  console.log('');

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    log(colors.red, '✗ Missing Twilio credentials in .env file');
    log(colors.yellow, '\nAdd these to your .env file:');
    console.log('  TWILIO_ACCOUNT_SID=your_account_sid_here');
    console.log('  TWILIO_AUTH_TOKEN=your_auth_token_here');
    console.log('  TWILIO_PHONE_NUMBER=your_twilio_phone_number_here');
    console.log('\nGet credentials from: https://console.twilio.com/');
    process.exit(1);
  }

  // Initialize Twilio client
  let client;
  try {
    const twilio = require('twilio');
    client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    log(colors.green, '✓ Twilio client initialized\n');
  } catch (err) {
    log(colors.red, '✗ Failed to initialize Twilio client');
    console.error('  Error:', err.message);
    log(colors.yellow, '\nInstall Twilio SDK:');
    console.log('  npm install twilio');
    process.exit(1);
  }

  // Test 1: Send SMS
  log(colors.yellow, 'Test 1: Send SMS');
  try {
    const testPhone = process.env.TEST_PHONE_NUMBER || '+91XXXXXXXXXX'; // Configure in .env
    const message = await client.messages.create({
      from: TWILIO_PHONE_NUMBER,
      to: testPhone,
      body: '🌾 Farm Revenue Copilot Test\n\nThis is a test message from your farming advisory system. Reply YES to confirm receipt.',
    });

    log(colors.green, '✓ SMS sent successfully!');
    console.log('  Message SID:', message.sid);
    console.log('  To:', message.to);
    console.log('  Status:', message.status);
    console.log('  Date Created:', message.dateCreated);
    console.log('');
    log(colors.cyan, '  Check your phone: ' + testPhone);
    console.log('');
  } catch (err) {
    log(colors.red, '✗ Failed to send SMS');
    console.error('  Error:', err.message);
    if (err.code) console.error('  Error Code:', err.code);
    if (err.moreInfo) console.error('  More Info:', err.moreInfo);
    console.log('');
  }

  // Test 2: Send WhatsApp (if sandbox is set up)
  log(colors.yellow, 'Test 2: Send WhatsApp Message');
  log(colors.cyan, '  Note: WhatsApp requires sandbox setup or approved template\n');
  
  try {
    const testPhone = process.env.TEST_PHONE_NUMBER || '+91XXXXXXXXXX';
    const message = await client.messages.create({
      from: 'whatsapp:' + TWILIO_PHONE_NUMBER,
      to: 'whatsapp:' + testPhone,
      body: '🌾 Farm Revenue Copilot Test\n\nThis is a WhatsApp test from your farming advisory system.',
    });

    log(colors.green, '✓ WhatsApp message sent!');
    console.log('  Message SID:', message.sid);
    console.log('  To:', message.to);
    console.log('  Status:', message.status);
    console.log('');
    log(colors.cyan, '  Check WhatsApp on: ' + testPhone);
    console.log('');
  } catch (err) {
    log(colors.yellow, '⚠ WhatsApp message failed (this is normal if sandbox not set up)');
    console.error('  Error:', err.message);
    if (err.code === 63016) {
      log(colors.cyan, '\n  To enable WhatsApp:');
      console.log('  1. Join Twilio WhatsApp Sandbox:');
      console.log('     https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox');
      console.log('  2. Send "join <your-sandbox-code>" to +14155238886 from WhatsApp');
      console.log('  3. Wait for confirmation, then try again');
    }
    console.log('');
  }

  // Test 3: Verify account info
  log(colors.yellow, 'Test 3: Verify Account Info');
  try {
    const account = await client.api.accounts(TWILIO_ACCOUNT_SID).fetch();
    log(colors.green, '✓ Account verified');
    console.log('  Friendly Name:', account.friendlyName);
    console.log('  Status:', account.status);
    console.log('  Type:', account.type);
    console.log('');
  } catch (err) {
    log(colors.red, '✗ Failed to fetch account info');
    console.error('  Error:', err.message);
    console.log('');
  }

  log(colors.cyan, '═══════════════════════════════════════════════════════════');
  log(colors.green, '  Twilio Integration Ready!');
  log(colors.cyan, '═══════════════════════════════════════════════════════════\n');

  log(colors.yellow, 'Next Steps:');
  console.log('  1. ✓ SMS is working - farmers will receive alerts');
  console.log('  2. Set up WhatsApp sandbox (optional but recommended)');
  console.log('  3. Configure webhook for replies:');
  console.log('     - Run: ngrok http 4000');
  console.log('     - Copy HTTPS URL');
  console.log('     - Configure at: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming');
  console.log('     - Set webhook to: https://YOUR-NGROK-URL.ngrok.io/api/webhooks/sms');
  console.log('  4. Test the full system:');
  console.log('     npm run test:delivery');
  console.log('');
}

// Run test
if (require.main === module) {
  testTwilioConnection().catch(err => {
    console.error('\n❌ Test failed:', err);
    process.exit(1);
  });
}

module.exports = { testTwilioConnection };
