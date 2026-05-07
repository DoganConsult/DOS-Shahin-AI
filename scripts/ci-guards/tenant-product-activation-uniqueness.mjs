#!/usr/bin/env node
/**
 * Tenant Product Activation Uniqueness Guard
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/tenant-product-activation-uniqueness.mjs [OPTIONS]

Fails when (tenant_id, product_key) is duplicated in dos.tenant_product_activation.

Options:
  --help, -h           Show this help message

Environment Variables:
  DATABASE_URL         PostgreSQL connection string (default: postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc)

Exit codes:
  0 — No duplicates found
  1 — Duplicates detected
  2 — Database connection error

Examples:
  # Run tenant product activation uniqueness check
  node scripts/ci-guards/tenant-product-activation-uniqueness.mjs
`);
  process.exit(0);
}

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc';

async function checkTenantProductActivationUniqueness() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    const result = await pool.query(`
      SELECT 
        tenant_id,
        product_key,
        COUNT(*) as duplicate_count
      FROM dos.tenant_product_activation
      GROUP BY tenant_id, product_key
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC
    `);
    
    if (result.rows.length > 0) {
      console.error('❌ Tenant product activation duplicates detected:');
      result.rows.forEach(row => {
        console.error(`  - ${row.tenant_id}/${row.product_key}: ${row.duplicate_count} rows`);
      });
      console.error(`\nTotal duplicate pairs: ${result.rows.length}`);
      console.error('\nTo fix: Ship unique-index migration to enforce constraint');
      process.exit(1);
    }
    
    const totalRows = await pool.query('SELECT COUNT(*) FROM dos.tenant_product_activation');
    console.log('✅ Tenant product activation uniqueness check passed');
    console.log(`   Checked ${totalRows.rows[0].count} rows`);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    process.exit(2);
  } finally {
    await pool.end();
  }
}

checkTenantProductActivationUniqueness();
