/**
 * Test Government Schemes API
 * 
 * Run: node test-schemes.js
 */

require('dotenv').config();
const schemesService = require('./src/services/schemesService');

console.log('='.repeat(70));
console.log('ANNAVRIDDHI - GOVERNMENT SCHEMES API TEST');
console.log('='.repeat(70));

async function testSchemeMatching() {
  console.log('\n1. 🎯 TEST: Farmer from Uttar Pradesh with wheat crop');
  console.log('-'.repeat(70));
  
  const upFarmer = {
    state: 'Uttar Pradesh',
    district: 'Varanasi',
    crop: 'wheat',
    landSize: 2.5,
    landUnit: 'acre',
    season: 'Rabi',
    activity: 'INSURE_CROP',
    farmerCategory: 'SMALL',
    landOwnership: true,
    estimatedCost: 50000
  };
  
  const result = await schemesService.match(upFarmer);
  
  console.log(`✓ Total matches: ${result.summary.totalMatches}`);
  console.log(`✓ High relevance: ${result.summary.highRelevance}`);
  console.log(`✓ Potentially eligible: ${result.summary.potentiallyEligible}`);
  console.log(`✓ Closing soon: ${result.summary.closingSoon}`);
  
  if (result.schemes.length > 0) {
    console.log('\nTop 3 Matched Schemes:');
    result.schemes.slice(0, 3).forEach((scheme, i) => {
      console.log(`\n  ${i + 1}. ${scheme.name}`);
      console.log(`     Level: ${scheme.level}`);
      console.log(`     Category: ${scheme.category}`);
      console.log(`     Status: ${scheme.status}`);
      console.log(`     Relevance: ${scheme.relevanceScore}%`);
      console.log(`     Window: ${scheme.window.status}`);
      if (scheme.revenueImpact.available) {
        console.log(`     Revenue Impact: ₹${scheme.revenueImpact.amount?.toLocaleString('en-IN')}`);
      }
      if (scheme.matchedBecause.length > 0) {
        console.log(`     Matched Because:`);
        scheme.matchedBecause.forEach(reason => {
          console.log(`       - ${reason}`);
        });
      }
    });
  }
}

async function testStateFiltering() {
  console.log('\n\n2. 🗺️  TEST: Geographic Filtering (State-level schemes)');
  console.log('-'.repeat(70));
  
  // Farmer from Punjab
  const punjabFarmer = {
    state: 'Punjab',
    district: 'Ludhiana',
    crop: 'rice',
    landSize: 5,
    season: 'Kharif'
  };
  
  const punjabResult = await schemesService.match(punjabFarmer);
  
  console.log(`\nPunjab Farmer:`);
  console.log(`  Total schemes: ${punjabResult.summary.totalMatches}`);
  
  // Count state vs central
  const stateLevelCount = punjabResult.schemes.filter(s => s.level === 'STATE').length;
  const centralCount = punjabResult.schemes.filter(s => s.level === 'CENTRAL').length;
  
  console.log(`  State-level schemes: ${stateLevelCount}`);
  console.log(`  Central schemes: ${centralCount}`);
  
  // Verify no schemes from other states
  const wrongStateSchemes = punjabResult.schemes.filter(s => 
    s.level === 'STATE' && s.metadata?.state && s.metadata.state !== 'Punjab'
  );
  
  if (wrongStateSchemes.length > 0) {
    console.log(`  ❌ ERROR: Found ${wrongStateSchemes.length} schemes from wrong states!`);
    wrongStateSchemes.forEach(s => {
      console.log(`     - ${s.name} (${s.metadata?.state})`);
    });
  } else {
    console.log(`  ✓ Geographic filtering working correctly`);
  }
}

async function testCategoryFiltering() {
  console.log('\n\n3. 📂 TEST: Category Filtering');
  console.log('-'.repeat(70));
  
  const categories = [
    'INCOME_SUPPORT',
    'CROP_INSURANCE',
    'AGRICULTURAL_CREDIT',
    'IRRIGATION'
  ];
  
  for (const category of categories) {
    const schemes = await schemesService.getByCategory(category);
    console.log(`\n  ${category}: ${schemes.length} schemes`);
    if (schemes.length > 0) {
      console.log(`    Examples: ${schemes.slice(0, 2).map(s => s.name).join(', ')}`);
    }
  }
}

async function testCropInsuranceActivity() {
  console.log('\n\n4. 🛡️  TEST: Activity-based Matching (Crop Insurance)');
  console.log('-'.repeat(70));
  
  const farmerSeekingInsurance = {
    state: 'Maharashtra',
    crop: 'cotton',
    landSize: 3,
    season: 'Kharif',
    activity: 'INSURE_CROP'
  };
  
  const result = await schemesService.match(farmerSeekingInsurance);
  
  console.log(`\nFarmer seeking crop insurance in Maharashtra:`);
  console.log(`  Total matches: ${result.summary.totalMatches}`);
  
  // Check if PMFBY is in results
  const pmfby = result.schemes.find(s => s.id === 'PMFBY');
  if (pmfby) {
    console.log(`  ✓ PMFBY found in results`);
    console.log(`    Relevance: ${pmfby.relevanceScore}%`);
    console.log(`    Status: ${pmfby.status}`);
    console.log(`    Benefit: ${pmfby.benefit.description}`);
  } else {
    console.log(`  ⚠️  PMFBY not found (may not match all criteria)`);
  }
}

async function testRevenueCalculation() {
  console.log('\n\n5. 💰 TEST: Revenue Impact Calculation');
  console.log('-'.repeat(70));
  
  const farmerWithCost = {
    state: 'Gujarat',
    crop: 'wheat',
    landSize: 4,
    activity: 'BUY_EQUIPMENT',
    estimatedCost: 100000
  };
  
  const result = await schemesService.match(farmerWithCost);
  
  const schemesWithRevenue = result.schemes.filter(s => s.revenueImpact.available);
  
  console.log(`\nSchemes with revenue impact: ${schemesWithRevenue.length}`);
  
  schemesWithRevenue.slice(0, 3).forEach(scheme => {
    console.log(`\n  ${scheme.name}:`);
    console.log(`    Type: ${scheme.revenueImpact.type}`);
    console.log(`    Amount: ₹${scheme.revenueImpact.amount?.toLocaleString('en-IN')}`);
    console.log(`    Basis: ${scheme.revenueImpact.basis}`);
  });
}

async function testWindowStatus() {
  console.log('\n\n6. ⏰ TEST: Application Window Status');
  console.log('-'.repeat(70));
  
  const farmer = {
    state: 'Karnataka',
    crop: 'rice',
    landSize: 2
  };
  
  const result = await schemesService.match(farmer);
  
  const windowCounts = {
    OPEN: 0,
    CLOSING_SOON: 0,
    YEAR_ROUND: 0,
    UPCOMING: 0,
    CLOSED: 0
  };
  
  result.schemes.forEach(scheme => {
    windowCounts[scheme.window.status] = (windowCounts[scheme.window.status] || 0) + 1;
  });
  
  console.log('\nApplication Window Distribution:');
  Object.entries(windowCounts).forEach(([status, count]) => {
    if (count > 0) {
      console.log(`  ${status}: ${count} schemes`);
    }
  });
  
  // Show closing soon schemes
  const closingSoon = result.schemes.filter(s => s.window.status === 'CLOSING_SOON');
  if (closingSoon.length > 0) {
    console.log('\n  ⚠️  Closing Soon:');
    closingSoon.forEach(s => {
      console.log(`    - ${s.name} (${s.window.daysRemaining} days left)`);
    });
  }
}

async function testSchemeById() {
  console.log('\n\n7. 🔍 TEST: Get Scheme by ID');
  console.log('-'.repeat(70));
  
  const schemeIds = ['PM-KISAN', 'PMFBY', 'KCC'];
  
  for (const id of schemeIds) {
    const scheme = await schemesService.getById(id);
    if (scheme) {
      console.log(`\n  ${scheme.name}:`);
      console.log(`    Short Name: ${scheme.short_name}`);
      console.log(`    Level: ${scheme.level}`);
      console.log(`    Category: ${scheme.scheme_type}`);
      console.log(`    Window: ${scheme.window.status}`);
      console.log(`    Documents: ${scheme.documents.length} required`);
      console.log(`    Application: ${scheme.application_method || 'N/A'}`);
    } else {
      console.log(`  ❌ Scheme ${id} not found`);
    }
  }
}

async function testEligibilityStatus() {
  console.log('\n\n8. ✅ TEST: Eligibility Status Determination');
  console.log('-'.repeat(70));
  
  // Test with complete profile
  const completeProfile = {
    state: 'Tamil Nadu',
    district: 'Coimbatore',
    crop: 'cotton',
    landSize: 3.5,
    season: 'Kharif',
    activity: 'BUY_SEED',
    landOwnership: true
  };
  
  const complete = await schemesService.match(completeProfile);
  
  const statusCounts = {
    POTENTIALLY_ELIGIBLE: 0,
    MATCHED: 0,
    INSUFFICIENT_INFORMATION: 0,
    NOT_MATCHED: 0
  };
  
  complete.schemes.forEach(s => {
    statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
  });
  
  console.log('\nWith Complete Profile:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    if (count > 0) {
      console.log(`  ${status}: ${count} schemes`);
    }
  });
  
  // Test with incomplete profile
  const incompleteProfile = {
    state: 'Tamil Nadu'
    // Missing: district, crop, landSize, etc.
  };
  
  const incomplete = await schemesService.match(incompleteProfile);
  
  const incompleteStatusCounts = {
    POTENTIALLY_ELIGIBLE: 0,
    MATCHED: 0,
    INSUFFICIENT_INFORMATION: 0,
    NOT_MATCHED: 0
  };
  
  incomplete.schemes.forEach(s => {
    incompleteStatusCounts[s.status] = (incompleteStatusCounts[s.status] || 0) + 1;
  });
  
  console.log('\nWith Incomplete Profile:');
  Object.entries(incompleteStatusCounts).forEach(([status, count]) => {
    if (count > 0) {
      console.log(`  ${status}: ${count} schemes`);
    }
  });
  
  // Show schemes requiring more info
  const needMoreInfo = incomplete.schemes.filter(s => 
    s.status === 'INSUFFICIENT_INFORMATION' && s.missingInformation.length > 0
  );
  
  if (needMoreInfo.length > 0) {
    console.log('\n  Examples of Missing Information:');
    needMoreInfo.slice(0, 2).forEach(s => {
      console.log(`    ${s.name}:`);
      console.log(`      Missing: ${s.missingInformation.join(', ')}`);
    });
  }
}

async function runAllTests() {
  try {
    await testSchemeMatching();
    await testStateFiltering();
    await testCategoryFiltering();
    await testCropInsuranceActivity();
    await testRevenueCalculation();
    await testWindowStatus();
    await testSchemeById();
    await testEligibilityStatus();
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY');
    console.log('='.repeat(70));
    console.log('\nNext Steps:');
    console.log('1. Start backend: npm run dev');
    console.log('2. Start frontend: cd ../frontend && npm run dev');
    console.log('3. Login and navigate to Government Schemes');
    console.log('4. Verify schemes load and display correctly');
    console.log('5. Test filtering, expansion, and application links');
    console.log('='.repeat(70));
    
  } catch (err) {
    console.error('\n❌ TEST FAILED:');
    console.error(err);
    process.exit(1);
  }
}

runAllTests();
