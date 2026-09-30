#!/usr/bin/env node
'use strict';

/**
 * migrate-to-supabase.js
 * 
 * Migrates data from local PostgreSQL to Supabase without requiring pg_dump.
 * 
 * Usage:
 *   node migrate-to-supabase.js
 * 
 * Prerequisites:
 *   1. Apply schema.sql to Supabase via SQL Editor first
 *   2. Disable RLS on all tables (for hackathon speed)
 *   3. Ensure .env has both local and Supabase credentials
 */

const { Pool } = require('pg');

// Local PostgreSQL connection
const localPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'farm_revenue_copilot',
  user: 'postgres',
  password: '', // Add local password if needed
});

// Supabase connection
const supabasePool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Table migration order (respecting foreign keys)
const TABLES = [
  'farmers',
  'crops',
  'crop_state_snapshots',
  'recommendation_events',
  'grading_events',
  'irrigation_logs',
  'schemes'
];

/**
 * Export all rows from a table in the local database
 */
async function exportTableData(tableName) {
  try {
    console.log(`\n📤 Exporting data from local table: ${tableName}...`);
    const result = await localPool.query(`SELECT * FROM ${tableName}`);
    console.log(`   ✓ Found ${result.rows.length} rows`);
    return result.rows;
  } catch (err) {
    if (err.message.includes('does not exist')) {
      console.log(`   ⚠ Table ${tableName} does not exist in local database, skipping`);
      return [];
    }
    throw err;
  }
}

/**
 * Import rows into Supabase table
 */
async function importTableData(tableName, rows) {
  if (rows.length === 0) {
    console.log(`   ⊘ No data to import for ${tableName}`);
    return 0;
  }

  console.log(`📥 Importing ${rows.length} rows into Supabase table: ${tableName}...`);
  
  let successCount = 0;
  const columns = Object.keys(rows[0]);
  
  for (const row of rows) {
    try {
      const values = columns.map(col => row[col]);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      const columnList = columns.join(', ');
      
      const query = `
        INSERT INTO ${tableName} (${columnList})
        VALUES (${placeholders})
        ON CONFLICT DO NOTHING
      `;
      
      await supabasePool.query(query, values);
      successCount++;
    } catch (err) {
      console.error(`   ✗ Failed to import row:`, err.message);
      console.error(`     Row data:`, JSON.stringify(row, null, 2));
    }
  }
  
  console.log(`   ✓ Imported ${successCount}/${rows.length} rows successfully`);
  return successCount;
}

/**
 * Get row count from a table
 */
async function getRowCount(pool, tableName) {
  try {
    const result = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
    return parseInt(result.rows[0].count, 10);
  } catch (err) {
    return 0;
  }
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   Farm Revenue Copilot - Supabase Migration Tool      ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Test connections
    console.log('🔌 Testing database connections...');
    await localPool.query('SELECT NOW()');
    console.log('   ✓ Local PostgreSQL connected');
    
    await supabasePool.query('SELECT NOW()');
    console.log('   ✓ Supabase connected\n');

    // Migration summary
    const summary = {
      exported: {},
      imported: {},
      errors: []
    };

    // Migrate each table
    for (const tableName of TABLES) {
      try {
        // Export from local
        const rows = await exportTableData(tableName);
        summary.exported[tableName] = rows.length;

        // Import to Supabase
        const imported = await importTableData(tableName, rows);
        summary.imported[tableName] = imported;
        
      } catch (err) {
        console.error(`\n❌ Error migrating ${tableName}:`, err.message);
        summary.errors.push({ table: tableName, error: err.message });
      }
    }

    // Verify migration
    console.log('\n\n╔════════════════════════════════════════════════════════╗');
    console.log('║   Migration Verification                               ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('Table                      Local → Supabase');
    console.log('─────────────────────────  ──────────────────');
    
    for (const tableName of TABLES) {
      const localCount = await getRowCount(localPool, tableName);
      const supabaseCount = await getRowCount(supabasePool, tableName);
      const status = localCount === supabaseCount ? '✓' : '⚠';
      
      console.log(
        `${tableName.padEnd(25)} ${String(localCount).padStart(5)} → ${String(supabaseCount).padStart(5)}  ${status}`
      );
    }

    // Summary
    console.log('\n\n╔════════════════════════════════════════════════════════╗');
    console.log('║   Migration Summary                                    ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    const totalExported = Object.values(summary.exported).reduce((a, b) => a + b, 0);
    const totalImported = Object.values(summary.imported).reduce((a, b) => a + b, 0);

    console.log(`Total rows exported: ${totalExported}`);
    console.log(`Total rows imported: ${totalImported}`);
    
    if (summary.errors.length > 0) {
      console.log(`\n⚠ Errors encountered: ${summary.errors.length}`);
      summary.errors.forEach(e => {
        console.log(`   - ${e.table}: ${e.error}`);
      });
    }

    if (totalExported === totalImported && summary.errors.length === 0) {
      console.log('\n✅ Migration completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Run: node test-supabase-connection.js');
      console.log('2. Run: npm run test:crop-state');
      console.log('3. Disable RLS if not done yet (see SUPABASE_SETUP.md)');
    } else {
      console.log('\n⚠ Migration completed with warnings. Please review above.');
    }

  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await localPool.end();
    await supabasePool.end();
  }
}

// Run migration
migrate().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
