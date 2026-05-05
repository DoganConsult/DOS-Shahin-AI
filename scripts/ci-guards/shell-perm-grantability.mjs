#!/usr/bin/env node
/**
 * Shell Perm Grantability Guard
 *
 * Every distinct workspace_shell_binding.perms_required must be grantable via ≥1 functional role
 * using CANONICAL RBAC: platform_dauth.role_permissions → permissions.permission_code.
 *
 * Legacy functional_roles.permissions[] alone is not authoritative after 2900.
 */

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc';

async function checkShellPermGrantability() {
  console.log('[shell-perm-grantability] Starting...');

  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    const result = await pool.query(`
      WITH shell_perms AS (
        SELECT DISTINCT unnest(perms_required) AS perm
          FROM dos.workspace_shell_binding
         WHERE perms_required IS NOT NULL
      )
      SELECT sp.perm
        FROM shell_perms sp
       WHERE NOT EXISTS (
         SELECT 1
           FROM platform_dauth.functional_roles fr
           INNER JOIN platform_dauth.role_permissions rp ON rp.role_id = fr.role_id
           INNER JOIN platform_dauth.permissions p ON p.permission_id = rp.permission_id
          WHERE p.permission_code = sp.perm
       )
    `);

    if (result.rows.length > 0) {
      console.error('❌ Shell perms with ZERO grantable functional role (via role_permissions):');
      result.rows.forEach((row) => console.error(`  - ${row.perm}`));
      console.error(`\nTotal violations: ${result.rows.length}`);
      console.error(
        'To fix: INSERT into platform_dauth.role_permissions for a role that should grant each code.',
      );
      process.exit(1);
    }

    console.log('✅ Shell perm grantability check passed');
    console.log('   All shell-binding perms_required codes appear on ≥1 role via role_permissions → permissions');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database error:', error.message);
    process.exit(2);
  } finally {
    await pool.end();
  }
}

checkShellPermGrantability();
