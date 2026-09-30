'use strict';

/**
 * testSchemeMatching.js
 * Comprehensive test suite for Government Scheme Matcher
 * 
 * Usage: node src/jobs/testSchemeMatching.js
 */

const schemesService = require('../services/schemesService');

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  Government Scheme Matcher - Test Suite                     ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

async function runTests() {
  let passedTests = 0;
  let totalTests = 0;
  
  // ═══════════════════════════════════════════════════════════════
  // Test 1: Central scheme available across states
  // ═══════════════════════════════════════════════════════════════
  totalTests++;
  console.log('[Test 1] Central scheme (PM-KISAN) available in any state');
  try {
    const resultUP = await schemesService.match({
      state: 'Uttar Pradesh',
      crop: 'wheat',
      landSize: 2,
      landOwnership: true
    });
    
    const resultMH = await schemesService.match({
      state: 'Maharashtra',
      crop: 'cotton',
      landSize: 2,
      landOwnership: true
    });
    
    const pmKisanUP = resultUP.schemes.find(s => s.id === 'PM-KISAN');
    const pmKisanMH = resultMH.schemes.find(s => s.id === 'PM-KISAN');
    
    if (pmKisanUP && pmKisanMH) {
      console.log('✓ PASS: PM-KISAN available in both UP and Maharashtra\n');
      passedTests++;
    } else {
      console.log('✗ FAIL: PM-KISAN not available across states\n');
    }
  } catch (err) {
    console.log('✗ FAIL: Error -', err.message, '\n');
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Test 2: State scheme MUST NOT leak to other states
  // ═══════════════════════════════════════════════════════════════
  totalTests++;
  console.log('[Test 2] CRITICAL: State schemes must not leak to other states');
  try {
    const resultUP = await schemesService.match({
      state: 'Uttar Pradesh',
      activity: 'BUY_EQUIPMENT',
      landSize: 2
    });
    
    const mhSchemeInUP = resultUP.schemes.find(s => 
      s.id === 'MAHARASHTRA-IRRIGATION'
    );
    
    if (!mhSchemeInUP) {
      console.log('✓ PASS: Maharashtra scheme NOT returned for UP farmer\n');
      passedTests++;
    } else {
      console.log('✗ FAIL: Maharashtra scheme leaked to UP farmer - CRITICAL BUG\n');
      console.log('  Scheme:', mhSchemeInUP.name, '\n');
    }
  } catch (err) {
    console.log('✗ FAIL: Error -', err.message, '\n');
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Test 3: State scheme SHOULD appear in correct state
  // ═══════════════════════════════════════════════════════════════
  totalTests++;
  console.log('[Test 3] State scheme appears in correct state');
  try {
    const resultMH = await schemesService.match({
      state: 'Maharashtra',
      activity: 'PLAN_IRRIGATION',
      landSize: 2,
      landOwnership: true
    });
    
    const mhScheme = resultMH.schemes.find(s => 
      s.id === 'MAHARASHTRA-IRRIGATION'
    );
    
    if (mhScheme && mhScheme.status === 'POTENTIALLY_ELIGIBLE') {
      console.log('✓ PASS: Maharashtra scheme returned for Maharashtra farmer\n');
      passedTests++;
    } else {
      console.log('✗ FAIL: State scheme not matching in correct state\n');
    }
  } catch (err) {
    console.log('✗ FAIL: Error -', err.message, '\n');
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Test 4: Crop-specific matching
  // ═══════════════════════════════════════════════════════════════
  totalTests++;
  console.log('[Test 4] Crop-specific schemes filter by crop');
  try {
    const wheatResult = await schemesService.match({
      state: 'Punjab',
      crop: 'wheat',
      activity: 'PLAN_TO_SELL'
    });
    
    const riceResult = await schemesService.match({
      state: 'Punjab',
      crop: 'rice',
      activity: 'PLAN_TO_SELL'
    });
    
    const wheatMSP = wheatResult.schemes.find(s => s.id === 'MSP-WHEAT');
    const riceMSP = riceResult.schemes.find(s => s.id === 'PUNJAB-MSP-RICE');
    
    if (wheatMSP && riceMSP) {
      console.log('✓ PASS: Crop-specific MSP schemes matched correctly\n');
      passedTests++;
    } else {
      console.log('✗ FAIL: Crop filtering not working\n');
    }
  } catch (err) {
    console.log('✗ FAIL: Error -', err.message, '\n');
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Test 5: Activity-based matching
  // ═══════════════════════════════════════════════════════════════
  totalTests++;
  console.log('[Test 5] Activity-based filtering');
  try {
    const equipmentResult = await schemesService.match({
      state: 'Uttar Pradesh',
      activity: 'BUY_EQUIPMENT',
      landSize: 2
    });
    
    const smam = equipmentResult.schemes.find(s => s.id === 'SMAM');
    const hasHighRelevance = smam && smam.relevanceScore >= 60;
    
    if (hasHighRelevance) {
      console.log('✓ PASS: SMAM matched for equipment purchase activity\n');
      passedTests++;
    } else {
      console.log('✗ FAIL: Activity matching not working\n');
    }
  } catch (err) {
    console.log('✗ FAIL: Error -', err.message, '\n');
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Test 6: Land size restrictions
  // ═══════════════════════════════════════════════════════════════
  totalTests++;
  console.log('[Test 6] Land size restrictions');
  try {
    const smallFarmer = await schemesService.match({
      state: 'Uttar Pradesh',
      landSize: 3,
      activity: 'BUY_FERTILIZER'
    });
    
    const largeFarmer = await schemesService.match({
      state: 'Uttar Pradesh',
      landSize: 10,
      activity: 'BUY_FERTILIZER'
    });
    
    const smallMatched = smallFarmer.schemes.find(s => 
      s.id === 'UP-FERTILIZER-SUBSIDY' && 
      s.status === 'POTENTIALLY_ELIGIBLE'
    );
    const largeMatched = largeFarmer.schemes.find(s => 
      s.id === 'UP-FERTILIZER-SUBSIDY'
    );
    
    if (smallMatched && !largeMatched) {
      console.log('✓ PASS: Land size restrictions working (max 5 acres)\n');
      passedTests++;
    } else {
      console.log('✗ FAIL: Land size filtering issue\n');
    }
  } catch (err) {
    console.log('✗ FAIL: Error -', err.message, '\n');
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Test 7: Relevance scoring
  // ═══════════════════════════════════════════════════════════════
  totalTests++;
  console.log('[Test 7] Relevance scoring calculation');
  try {
    const result = await schemesService.match({
      state: 'Maharashtra',
      crop: 'cotton',
      landSize: 2,
      season: 'Kharif',
      activity: 'PLAN_IRRIGATION',
      landOwnership: true
    });
    
    const irrigation = result.schemes.find(s => 
      s.id === 'MAHARASHTRA-IRRIGATION'
    );
    
    if (irrigation && irrigation.relevanceScore >= 70) {
      console.log(`✓ PASS: High relevance score ${irrigation.relevanceScore} for perfect match\n`);
      passedTests++;
    } else {
      console.log('✗ FAIL: Relevance scoring not optimal\n');
    }
  } catch (err) {
    console.log('✗ FAIL: Error -', err.message, '\n');
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Test 8: Missing information handling
  // ═══════════════════════════════════════════════════════════════
  totalTests++;
  console.log('[Test 8] Missing information detection');
  try {
    const result = await schemesService.match({
      state: 'Uttar Pradesh'
      // Missing: crop, landSize, activity, landOwnership
    });
    
    const hasResults = result.schemes.length > 0;
    const centralSchemes = result.schemes.filter(s => s.level === 'CENTRAL');
    
    if (hasResults && centralSchemes.length > 0) {
      console.log('✓ PASS: Returns schemes even with minimal info\n');
      passedTests++;
    } else {
      console.log('✗ FAIL: Should return at least central schemes\n');
    }
  } catch (err) {
    console.log('✗ FAIL: Error -', err.message, '\n');
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Test 9: Revenue impact calculation (not for credit)
  // ═══════════════════════════════════════════════════════════════
  totalTests++;
  console.log('[Test 9] Revenue impact calculation (subsidy)');
  try {
    const result = await schemesService.match({
      state: 'Maharashtra',
      landSize: 2,
      activity: 'BUY_EQUIPMENT',
      estimatedCost: 100000,
      landOwnership: true
    });
    
    const irrigation = result.schemes.find(s => 
      s.id === 'MAHARASHTRA-IRRIGATION'
    );
    
    if (irrigation && irrigation.revenueImpact.available && 
        irrigation.revenueImpact.amount > 0) {
      console.log(`✓ PASS: Revenue impact calculated: ₹${irrigation.revenueImpact.amount}\n`);
      passedTests++;
    } else {
      console.log('✗ FAIL: Revenue impact not calculated\n');
    }
  } catch (err) {
    console.log('✗ FAIL: Error -', err.message, '\n');
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Test 10: Credit schemes should NOT show as revenue benefit
  // ═══════════════════════════════════════════════════════════════
  totalTests++;
  console.log('[Test 10] Credit limit is NOT direct revenue benefit');
  try {
    const result = await schemesService.match({
      state: 'Uttar Pradesh',
      activity: 'SEEK_CREDIT',
      landSize: 2
    });
    
    const kcc = result.schemes.find(s => s.id === 'KCC');
    
    if (kcc && !kcc.revenueImpact.available) {
      console.log('✓ PASS: KCC credit limit correctly not treated as revenue\n');
      passedTests++;
    } else {
      console.log('✗ FAIL: Credit being incorrectly treated as revenue benefit\n');
    }
  } catch (err) {
    console.log('✗ FAIL: Error -', err.message, '\n');
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Test 11: Get by ID
  // ═══════════════════════════════════════════════════════════════
  totalTests++;
  console.log('[Test 11] Get scheme by ID');
  try {
    const pmfby = await schemesService.getById('PMFBY');
    
    if (pmfby && pmfby.name && pmfby.official_source_url) {
      console.log('✓ PASS: Scheme retrieved with full details\n');
      passedTests++;
    } else {
      console.log('✗ FAIL: Scheme detail retrieval failed\n');
    }
  } catch (err) {
    console.log('✗ FAIL: Error -', err.message, '\n');
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Test 12: Get by state
  // ═══════════════════════════════════════════════════════════════
  totalTests++;
  console.log('[Test 12] Get schemes by state');
  try {
    const schemes = await schemesService.getByState('Punjab');
    const hasCentral = schemes.some(s => s.level === 'CENTRAL');
    const hasState = schemes.some(s => s.level === 'STATE');
    
    if (hasCentral && hasState) {
      console.log(`✓ PASS: Retrieved ${schemes.length} schemes (central + state)\n`);
      passedTests++;
    } else {
      console.log('✗ FAIL: State filtering incomplete\n');
    }
  } catch (err) {
    console.log('✗ FAIL: Error -', err.message, '\n');
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Test 13: State isolation - even with matching crop/activity
  // ═══════════════════════════════════════════════════════════════
  totalTests++;
  console.log('[Test 13] State isolation overrides crop/activity match');
  try {
    const resultUP = await schemesService.match({
      state: 'Uttar Pradesh',
      crop: 'cotton',  // Maharashtra scheme covers cotton
      activity: 'PLAN_IRRIGATION',  // Maharashtra scheme for irrigation
      landSize: 2
    });
    
    const mhScheme = resultUP.schemes.find(s => 
      s.level === 'STATE' && s.id === 'MAHARASHTRA-IRRIGATION'
    );
    
    if (!mhScheme) {
      console.log('✓ PASS: State filter overrides crop/activity matching\n');
      passedTests++;
    } else {
      console.log('✗ FAIL: State scheme leaked despite crop/activity match\n');
    }
  } catch (err) {
    console.log('✗ FAIL: Error -', err.message, '\n');
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Test Summary
  // ═══════════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Test Results: ${passedTests}/${totalTests} passed`);
  
  if (passedTests === totalTests) {
    console.log('✓ ALL TESTS PASSED\n');
  } else {
    console.log(`✗ ${totalTests - passedTests} TESTS FAILED\n`);
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Display Sample Response
  // ═══════════════════════════════════════════════════════════════
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Sample API Response (UP farmer with equipment activity)    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  const sampleResult = await schemesService.match({
    state: 'Uttar Pradesh',
    district: 'Noida',
    crop: 'wheat',
    landSize: 3,
    season: 'Rabi',
    activity: 'BUY_EQUIPMENT'
  });
  
  console.log(JSON.stringify(sampleResult, null, 2));
  
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('Scheme IDs in response:');
  sampleResult.schemes.forEach(s => {
    console.log(`  - ${s.id} (${s.level}): ${s.name}`);
  });
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// Run tests
runTests()
  .then(() => {
    console.log('\n[test] Test suite completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n[test] Test suite failed:', err);
    process.exit(1);
  });
