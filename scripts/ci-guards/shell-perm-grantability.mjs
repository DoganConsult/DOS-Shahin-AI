#!/usr/bin/env node
/**
 * Shell Perm Grantability Guard
 * 
 * Promotes existing inline shell-perm-grantability check to own file.
 * Runs at contract-edit time, not just cross-tenant publish.
 * 
 * Exit codes:
 * - 0: Shell perm grantability check passed
 * - 1: Shell perm grantability violations detected
 * - 2: Error
 */

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc';

async function checkShellPermGrantability() {
  console.log('[shell-perm-grantability] Starting...');
  
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    // Every distinct shell perm must be grantable by ≥1 functional role.
    // Canonical RBAC source: workspace_shell_binding.perms_required[] (DB)
    //  vs platform_dauth.functional_roles.permissions[] (RBAC).
    const result = await pool.query(`
      WITH shell_perms AS (
        SELECT DISTINCT unnest(perms_required) AS perm
          FROM dos.workspace_shell_binding
         WHERE perms_required IS NOT NULL
      )
      SELECT sp.perm
        FROM shell_perms sp
       WHERE NOT EXISTS (
         SELECT 1 FROM platform_dauth.functional_roles fr
          WHERE sp.perm = ANY(fr.permissions)
       )
    `);
    
    if (result.rows.length > 0) {
      console.error('❌ Shell perms with ZERO grantable functional role:');
      result.rows.forEach(row => console.error(`  - ${row.perm}`));
      console.error(`\nTotal violations: ${result.rows.length}`);
      console.error('To fix: Grant the perm to ≥1 role via platform_dauth.functional_roles.permissions[].');
      process.exit(1);
    }
    
    console.log('✅ Shell perm grantability check passed');
    console.log('   All shell-binding perms_required[] grantable by ≥1 functional role');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    process.exit(2);
  } finally {
    await pool.end();
  }
}

checkShellPermGrantability();
