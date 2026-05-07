#!/usr/bin/env node
/**
 * Tenant Migration Ledger Coverage Guard
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/tenant-migration-ledger-coverage.mjs [OPTIONS]

Fails if any active tenant has 0 entries in dos.tenant_migrations.

Options:
  --help, -h           Show this help message

Environment Variables:
  DATABASE_URL         PostgreSQL connection string (default: postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc)

Exit codes:
  0 — All active tenants have migration records
  1 — Active tenants with missing migration records detected
  2 — Database connection error

Examples:
  # Run tenant migration ledger coverage check
  node scripts/ci-guards/tenant-migration-ledger-coverage.mjs
`);
  process.exit(0);
}

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc';

async function checkTenantMigrationLedgerCoverage() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    const result = await pool.query(`
      SELECT 
        t.tenant_id,
        t.status,
        COALESCE(tm.migration_count, 0) as migration_count
      FROM dos.tenants t
      LEFT JOIN (
        SELECT tenant_id, COUNT(*) as migration_count 
        FROM dos.tenant_migrations 
        GROUP BY tenant_id
      ) tm ON tm.tenant_id = t.tenant_id
      WHERE t.status = 'active'
      ORDER BY migration_count ASC
    `);
    
    const missingMigrations = result.rows.filter(row => row.migration_count === 0);
    
    if (missingMigrations.length > 0) {
      console.error('❌ Active tenants with missing migration ledger entries detected:');
      missingMigrations.forEach(row => {
        console.error(`  - ${row.tenant_id}: ${row.migration_count} migration records`);
      });
      console.error(`\nTotal missing: ${missingMigrations.length}/${result.rows.length} active tenants`);
      console.error('\nTo fix: Run migration to backfill tenant_migrations from canonical migration files');
      process.exit(1);
    }
    
    console.log('✅ Tenant migration ledger coverage check passed');
    console.log(`   All ${result.rows.length} active tenants have migration records`);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    process.exit(2);
  } finally {
    await pool.end();
  }
}

checkTenantMigrationLedgerCoverage();
