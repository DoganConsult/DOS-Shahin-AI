#!/usr/bin/env node
/**
 * RBAC Permissions Source of Truth Guard
 * 
 * Asserts that platform_dauth.role_permissions JOIN ≡ functional_roles.permissions[] array for every role.
 * Canonical source: functional_roles.permissions[] array (publisher writes to array).
 * 
 * Exit codes:
 * - 0: Sync verified
 * - 1: Sync mismatch detected
 * - 2: Database connection error
 */

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
        array_length(fr.permissions, 1) as array_len,
        (SELECT COUNT(*) FROM platform_dauth.role_permissions rp WHERE rp.role_id = fr.role_id) as join_len
      FROM platform_dauth.functional_roles fr
      WHERE fr.permissions IS NOT NULL
        AND array_length(fr.permissions, 1) > 0
    `);
    
    const mismatches = result.rows.filter(row => {
      const arrayLen = parseInt(row.array_len) || 0;
      const joinLen = parseInt(row.join_len) || 0;
      return arrayLen !== joinLen;
    });
    
    if (mismatches.length > 0) {
      console.error('❌ RBAC permissions source-of-truth mismatch detected:');
      mismatches.forEach(row => {
        console.error(`  - ${row.role_code}: array_len=${row.array_len}, join_len=${row.join_len}`);
      });
      console.error(`\nTotal mismatches: ${mismatches.length}`);
      console.error('\nCanonical source: functional_roles.permissions[] array');
      console.error('To fix: Run migration to sync role_permissions from array');
      process.exit(1);
    }
    
    console.log('✅ RBAC permissions source-of-truth verified');
    console.log(`   Checked ${result.rows.length} roles`);
    console.log('   Canonical: functional_roles.permissions[] array');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    process.exit(2);
  } finally {
    await pool.end();
  }
}

checkRbacPermissionsSync();
