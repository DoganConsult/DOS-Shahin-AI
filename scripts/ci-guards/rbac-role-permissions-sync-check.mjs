#!/usr/bin/env node
/**
 * RBAC Role Permissions Sync Check
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/rbac-role-permissions-sync-check.mjs [OPTIONS]

Verifies platform_dauth.role_permissions matches functional_roles.permissions[] as identical sets.

Options:
  --help, -h           Show this help message

Environment Variables:
  DATABASE_URL         PostgreSQL connection string (default: postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc)

Policy:
  Canonical: platform_dauth.role_permissions (per 20260505_2900).
  Legacy functional_roles.permissions[] must remain identical set-of-IDs.
  Length-only comparison insufficient after deprecation (duplicate IDs in array, etc.).

Exit codes:
  0 — Sync verified
  1 — Sync mismatch detected
  2 — Database connection error

Examples:
  # Run RBAC role permissions sync check
  node scripts/ci-guards/rbac-role-permissions-sync-check.mjs
`);
  process.exit(0);
}

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc';

async function checkRolePermissionsSync() {
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
      console.error('❌ Role permissions sync mismatch (role_permissions vs functional_roles.permissions[]):');
      mismatches.forEach((row) => {
        console.error(`  - ${row.role_code} (${row.role_id})`);
        console.error(`      canonical (role_permissions): ${row.rp_sig || '(empty)'}`);
        console.error(`      legacy array:                  ${row.arr_sig || '(empty)'}`);
      });
      console.error(`\nTotal mismatches: ${mismatches.length}`);
      console.error('\nCanonical: platform_dauth.role_permissions (+ permissions.permission_code).');
      console.error('Fix: reconcile arrays via migration 2100 family or update triggers from 2800.');
      process.exit(1);
    }

    console.log('✅ Role permissions sync verified (set equivalence on permission_id)');
    console.log(`   Checked ${result.rows.length} roles with permissions data`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Database error:', error.message);
    process.exit(2);
  } finally {
    await pool.end();
  }
}

checkRolePermissionsSync();
