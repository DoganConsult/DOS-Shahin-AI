#!/usr/bin/env node
/**
 * RBAC Permissions Source of Truth Guard
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/rbac-permissions-source-of-truth.mjs [OPTIONS]

Verifies platform_dauth.role_permissions (canonical) matches functional_roles.permissions[].

Options:
  --help, -h           Show this help message

Environment Variables:
  DATABASE_URL         PostgreSQL connection string (default: postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc)

Policy:
  Canonical source: platform_dauth.role_permissions joined to permissions.
  Legacy functional_roles.permissions[] must remain identical set-of-IDs until column drop.
  Same assertion as rbac-role-permissions-sync-check.mjs (duplicated for CI wiring).

Exit codes:
  Non-zero on permission sync mismatch

Examples:
  # Run RBAC permissions source of truth check
  node scripts/ci-guards/rbac-permissions-source-of-truth.mjs
`);
  process.exit(0);
}

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc';

async function checkRbacPermissionsSync() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    const result = await pool.query(`
      SELECT
        fr.role_id,
        fr.role_code,
        COALESCE((
          SELECT string_agg(rp.permission_id, ',' ORDER BY rp.permission_id)
          FROM platform_dauth.role_permissions rp
          WHERE rp.role_id = fr.role_id
        ), '') AS rp_sig,
        COALESCE((
          SELECT string_agg(DISTINCT x, ',' ORDER BY x)
          FROM unnest(COALESCE(fr.permissions, ARRAY[]::text[])) AS x
        ), '') AS arr_sig
      FROM platform_dauth.functional_roles fr
      WHERE EXISTS (SELECT 1 FROM platform_dauth.role_permissions rp WHERE rp.role_id = fr.role_id)
         OR (fr.permissions IS NOT NULL AND cardinality(fr.permissions) > 0)
    `);

    const mismatches = result.rows.filter((row) => row.rp_sig !== row.arr_sig);

    if (mismatches.length > 0) {
      console.error('❌ RBAC permissions source-of-truth mismatch:');
      mismatches.forEach((row) => {
        console.error(`  - ${row.role_code}`);
        console.error(`      role_permissions: ${row.rp_sig || '(empty)'}`);
        console.error(`      permissions[]:    ${row.arr_sig || '(empty)'}`);
      });
      console.error(`\nTotal mismatches: ${mismatches.length}`);
      console.error('\nCanonical write path: platform_dauth.role_permissions.');
      process.exit(1);
    }

    console.log('✅ RBAC permissions source-of-truth verified');
    console.log(`   Checked ${result.rows.length} roles`);
    console.log('   Canonical: platform_dauth.role_permissions');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database error:', error.message);
    process.exit(2);
  } finally {
    await pool.end();
  }
}

checkRbacPermissionsSync();
