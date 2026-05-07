#!/usr/bin/env node
/**
 * Functional Roles Zero Join Guard
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/functional-roles-no-zero-join.mjs [OPTIONS]

Fails if any functional role has permissions[] != [] but ZERO rows in role_permissions.

Options:
  --help, -h           Show this help message

Environment Variables:
  DATABASE_URL         PostgreSQL connection string (default: postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc)

Exit codes:
  0 — No zero-join violations
  1 — Zero-join violations detected
  2 — Database connection error

Examples:
  # Run zero-join check
  node scripts/ci-guards/functional-roles-no-zero-join.mjs
`);
  process.exit(0);
}

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc';

async function checkFunctionalRolesZeroJoin() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    const result = await pool.query(`
      SELECT 
        fr.role_id,
        fr.role_code,
        array_length(fr.permissions, 1) as array_len,
        (SELECT COUNT(*) FROM platform_dauth.role_permissions rp WHERE rp.role_id = fr.role_id) as join_len
      FROM platform_dauth.functional_roles fr
      WHERE fr.permissions IS NOT NULL
        AND array_length(fr.permissions, 1) > 0
    `);
    
    const zeroJoinViolations = result.rows.filter(row => {
      const arrayLen = parseInt(row.array_len) || 0;
      const joinLen = parseInt(row.join_len) || 0;
      return arrayLen > 0 && joinLen === 0;
    });
    
    if (zeroJoinViolations.length > 0) {
      console.error('❌ Functional roles with zero role_permissions join rows detected:');
      zeroJoinViolations.forEach(row => {
        console.error(`  - ${row.role_code}: permissions[]=${row.array_len}, role_permissions=0`);
      });
      console.error(`\nTotal violations: ${zeroJoinViolations.length}`);
      console.error('\nTo fix: Run migration to backfill role_permissions from permissions[] array');
      process.exit(1);
    }
    
    console.log('✅ Functional roles zero-join check passed');
    console.log(`   Checked ${result.rows.length} roles`);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    process.exit(2);
  } finally {
    await pool.end();
  }
}

checkFunctionalRolesZeroJoin();
