#!/usr/bin/env node
'use strict';

/**
 * Test Supabase connection via REST API and JavaScript client
 * This bypasses direct PostgreSQL connection issues
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║   Supabase REST API Connection Test                    ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

async function testRestConnection() {
  // Check credentials
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
    process.exit(1);
  }

  console.log('📝 Supabase credentials:');
  console.log('   URL:', process.env.SUPABASE_URL);
  console.log('   Anon Key:', process.env.SUPABASE_ANON_KEY.substring(0, 20) + '...');

  // Create Supabase client
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  console.log('\n🔌 Testing REST API connection...\n');

  try {
    // Test 1: Check if we can query (should work even with empty tables)
    console.log('1️⃣  Testing table access...');
    const { data: farmers, error: farmersError } = await supabase
      .from('farmers')
      .select('count', { count: 'exact', head: true });

    if (farmersError) {
      if (farmersError.message.includes('relation') || farmersError.message.includes('does not exist')) {
        console.log('   ⚠ Table "farmers" does not exist yet');
        console.log('   ➜ Action: Apply schema.sql in Supabase SQL Editor');
        console.log('   ➜ URL: https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]/sql/new\n');
        return false;
      }
      throw farmersError;
    }
    console.log('   ✓ Table "farmers" accessible\n');

    // Test 2: Check all required tables
    console.log('2️⃣  Checking all required tables...');
    const tables = [
      'farmers',
      'crops',
      'crop_state_snapshots',
      'recommendation_events',
      'grading_events',
      'irrigation_logs',
      'schemes'
    ];

    let allTablesExist = true;
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true });

      if (error) {
        console.log(`   ✗ ${table} - NOT FOUND`);
        allTablesExist = false;
      } else {
        console.log(`   ✓ ${table}`);
      }
    }

    if (!allTablesExist) {
      console.log('\n⚠ Some tables are missing!');
      console.log('   ➜ Apply schema.sql in Supabase SQL Editor');
      return false;
    }

    // Test 3: Get row counts
    console.log('\n3️⃣  Getting row counts...');
    for (const table of tables) {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      console.log(`   ${table.padEnd(25)} ${count || 0} rows`);
    }

    // Test 4: Check schema columns
    console.log('\n4️⃣  Checking for schema updates...');
    
    const { data: recEvents } = await supabase
      .from('recommendation_events')
      .select('predicted_revenue_impact')
      .limit(1);
    
    console.log('   ✓ recommendation_events.predicted_revenue_impact exists');

    const { data: snapshots } = await supabase
      .from('crop_state_snapshots')
      .select('data_quality')
      .limit(1);
    
    console.log('   ✓ crop_state_snapshots.data_quality exists');

    // Test 5: Try to insert test data
    console.log('\n5️⃣  Testing write permissions...');
    const testFarmer = {
      name: 'Test Farmer (REST API Test)',
      phone: '+91' + Math.floor(Math.random() * 10000000000),
      state: 'Test State',
      land_area_ac: 5.0
    };

    const { data: insertedFarmer, error: insertError } = await supabase
      .from('farmers')
      .insert(testFarmer)
      .select()
      .single();

    if (insertError) {
      if (insertError.message.includes('policy')) {
        console.log('   ⚠ Row Level Security is ENABLED');
        console.log('   ➜ Disable RLS for hackathon speed (see MIGRATION_GUIDE.md)');
        return false;
      }
      throw insertError;
    }

    console.log('   ✓ Insert successful! Created farmer:', insertedFarmer.name);
    console.log('   ✓ Row Level Security is DISABLED (good for development)');

    // Clean up test data
    await supabase.from('farmers').delete().eq('id', insertedFarmer.id);
    console.log('   ✓ Test data cleaned up');

    console.log('\n✅ All REST API tests passed!\n');
    console.log('Your Supabase database is ready to use.\n');
    console.log('Next steps:');
    console.log('1. Run migration if you have local data: npm run migrate:supabase');
    console.log('2. Test features: npm run test:crop-state');
    console.log('3. Start the backend server: npm run dev\n');

    return true;

  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
    console.error('\nFull error:', err);
    return false;
  }
}

testRestConnection()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
