/**
 * Test Decision Engine
 * Comprehensive test of all decision modules
 */

require('dotenv').config();
const decisionEngine = require('./src/services/decisionEngine');
const nutritionService = require('./src/services/nutritionService');
const weatherProtectionService = require('./src/services/weatherProtectionService');
const harvestWindowService = require('./src/services/harvestWindowService');
const geminiService = require('./src/services/geminiService');

console.log('='.repeat(60));
console.log('ANNAVRIDDHI DECISION ENGINE TEST');
console.log('='.repeat(60));

async function testNutritionService() {
  console.log('\n1. 🌱 NUTRITION SERVICE TEST');
  console.log('-'.repeat(60));
  
  const result = nutritionService.analyzeNutrition({
    crop: 'tomato',
    growthStage: 'fruiting',
    nitrogen: 25,      // Low
    phosphorus: 35,    // Normal
    potassium: 45,     // Low
    pH: 5.5            // Slightly acidic
  });
  
  console.log(`Severity: ${result.severity}`);
  console.log(`Alert: ${result.alert}`);
  console.log(`Recommendation: ${result.recommendation}`);
  console.log(`Reason: ${result.reason}`);
  console.log(`Yield Risk: ${result.yieldRisk}`);
  if (result.actions && result.actions.length > 0) {
    console.log('Actions:');
    result.actions.forEach(action => console.log(`  - ${action}`));
  }
}

async function testWeatherProtectionService() {
  console.log('\n2. 🌩️ WEATHER PROTECTION SERVICE TEST');
  console.log('-'.repeat(60));
  
  // Test with a location (Delhi coordinates)
  const result = await weatherProtectionService.analyzeWeatherRisk({
    location: { lat: 28.6139, lon: 77.2090 },
    crop: 'tomato',
    cropValue: 50000
  });
  
  console.log(`Severity: ${result.severity}`);
  console.log(`Alert: ${result.alert}`);
  console.log(`Recommendation: ${result.recommendation}`);
  console.log(`Reason: ${result.reason}`);
  
  if (result.metadata && result.metadata.economics) {
    const econ = result.metadata.economics;
    console.log('\nEconomics:');
    console.log(`  Crop Value: ₹${econ.cropValue?.toLocaleString('en-IN')}`);
    console.log(`  Expected Loss: ₹${econ.expectedLoss?.toLocaleString('en-IN')} (${econ.expectedDamagePercent}%)`);
    console.log(`  Protection Cost: ₹${econ.protectionCost?.toLocaleString('en-IN')}`);
    console.log(`  Net Value Protected: ₹${econ.netValueProtected?.toLocaleString('en-IN')}`);
  }
  
  if (result.actions && result.actions.length > 0) {
    console.log('\nActions:');
    result.actions.forEach(action => console.log(`  - ${action}`));
  }
}

async function testHarvestWindowService() {
  console.log('\n3. 🌾 HARVEST WINDOW SERVICE TEST');
  console.log('-'.repeat(60));
  
  const result = await harvestWindowService.analyzeHarvestWindow({
    crop: 'tomato',
    ripeness: 89,
    grade: 'A',
    defectRisk: 35,
    location: { lat: 28.6139, lon: 77.2090 }
  });
  
  console.log(`Severity: ${result.severity}`);
  console.log(`Alert: ${result.alert}`);
  console.log(`Recommendation: ${result.recommendation}`);
  console.log(`Reason: ${result.reason}`);
  
  if (result.metadata) {
    console.log(`\nRipeness: ${result.metadata.ripeness}%`);
    console.log(`Grade: ${result.metadata.grade}`);
    console.log(`Harvest Window: ${result.metadata.harvestWindow}`);
  }
  
  if (result.actions && result.actions.length > 0) {
    console.log('\nActions:');
    result.actions.forEach(action => console.log(`  - ${action}`));
  }
}

async function testGeminiService() {
  console.log('\n4. 🗣️ GEMINI LOCALIZATION SERVICE TEST');
  console.log('-'.repeat(60));
  
  if (!process.env.GEMINI_API_KEY) {
    console.log('⚠️  GEMINI_API_KEY not configured - skipping test');
    return;
  }
  
  console.log('Testing API connection...');
  const connectionTest = await geminiService.testConnection();
  
  if (connectionTest.success) {
    console.log('✓ Gemini API connected successfully');
    console.log(`Response: ${connectionTest.response}`);
  } else {
    console.log('✗ Gemini API connection failed');
    console.log(`Error: ${connectionTest.error}`);
    return;
  }
  
  // Test localization
  console.log('\nTesting localization to Hindi...');
  const testDecision = {
    type: 'IRRIGATION',
    severity: 'HIGH',
    alert: 'High irrigation requirement detected',
    recommendation: 'Irrigate within 6 hours',
    reason: 'Soil moisture is 18%, rain probability only 12%',
    actions: ['Irrigate the field', 'Check irrigation system'],
    revenueImpact: {
      expectedLoss: 5000,
      actionCost: 500,
      netValue: 4500
    }
  };
  
  const localized = await geminiService.localizeDecisions({
    summary: 'Urgent irrigation required to prevent crop stress',
    decisions: [testDecision],
    language: 'hi',
    crop: 'tomato'
  });
  
  console.log('\nOriginal:');
  console.log(`  Alert: ${testDecision.alert}`);
  console.log(`  Recommendation: ${testDecision.recommendation}`);
  
  console.log('\nLocalized (Hindi):');
  console.log(`  Alert: ${localized.decisions[0].alert}`);
  console.log(`  Recommendation: ${localized.decisions[0].recommendation}`);
  
  // Test SMS generation
  console.log('\nTesting SMS message generation...');
  const message = await geminiService.generateMessage(testDecision, 'hi', 'राम प्रसाद');
  console.log('\nGenerated SMS:');
  console.log(message);
}

async function testFullDecisionEngine() {
  console.log('\n5. 🚀 FULL DECISION ENGINE TEST');
  console.log('-'.repeat(60));
  
  const result = await decisionEngine.generateDecisions({
    farmId: 'test-farm-001',
    cropId: 'test-crop-001',
    crop: 'tomato',
    growthStage: 'fruiting',
    sensorData: {
      nitrogen: 25,
      phosphorus: 35,
      potassium: 45,
      pH: 5.8,
      soilMoisture: 18
    },
    cropHealthData: {
      ripeness: 89,
      grade: 'A',
      defectScore: 35,
      estimatedValue: 50000,
      overall: 'good'
    },
    location: { lat: 28.6139, lon: 77.2090 },
    language: 'en'
  });
  
  console.log('\n📊 DECISION ENGINE OUTPUT');
  console.log('='.repeat(60));
  console.log(`Farm: ${result.farmId}`);
  console.log(`Crop: ${result.cropId}`);
  console.log(`Language: ${result.language}`);
  console.log(`Timestamp: ${result.timestamp}`);
  
  console.log('\n📋 SUMMARY:');
  console.log(result.summary);
  
  console.log('\n🎯 TOP PRIORITY ACTION:');
  if (result.topPriorityAction) {
    const action = result.topPriorityAction;
    console.log(`Type: ${action.type}`);
    console.log(`Severity: ${action.severity}`);
    console.log(`Alert: ${action.alert}`);
    console.log(`Recommendation: ${action.recommendation}`);
    
    if (action.revenueImpact) {
      console.log('\n💰 Revenue Impact:');
      console.log(`  Expected Loss: ₹${action.revenueImpact.expectedLoss?.toLocaleString('en-IN')}`);
      console.log(`  Action Cost: ₹${action.revenueImpact.actionCost?.toLocaleString('en-IN')}`);
      console.log(`  Net Value: ₹${action.revenueImpact.netValue?.toLocaleString('en-IN')}`);
      console.log(`  ROI: ${action.revenueImpact.roiPercent}%`);
    }
  }
  
  console.log('\n📑 ALL DECISIONS:');
  result.decisions.forEach((decision, i) => {
    console.log(`\n${i + 1}. ${decision.type} [${decision.severity}]`);
    console.log(`   ${decision.alert}`);
    console.log(`   → ${decision.recommendation}`);
    if (decision.revenueImpact && decision.revenueImpact.netValue > 0) {
      console.log(`   💰 Potential value: ₹${decision.revenueImpact.netValue.toLocaleString('en-IN')}`);
    }
  });
  
  console.log(`\n💵 TOTAL REVENUE IMPACT: ₹${result.totalRevenueImpact?.toLocaleString('en-IN')}`);
}

async function runTests() {
  try {
    await testNutritionService();
    await testWeatherProtectionService();
    await testHarvestWindowService();
    await testGeminiService();
    await testFullDecisionEngine();
    
    console.log('\n' + '='.repeat(60));
    console.log('✓ ALL TESTS COMPLETED');
    console.log('='.repeat(60));
    
  } catch (err) {
    console.error('\n❌ TEST FAILED:');
    console.error(err);
    process.exit(1);
  }
}

runTests();
