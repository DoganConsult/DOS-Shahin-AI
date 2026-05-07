#!/usr/bin/env node
/**
 * Functional Roles Dual-Naming Guard
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/functional-roles-no-dual-naming.mjs [OPTIONS]

Fails when both <x> and role_<x> exist in functional_roles (dual-naming drift).

Options:
  --help, -h           Show this help message

Environment Variables:
  DATABASE_URL         PostgreSQL connection string (default: postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc)

Policy:
  Canonical: prefixed (role_viewer, role_compliance_officer, role_auditor, role_risk_manager)
  Fails when unprefixed and prefixed versions both exist

Exit codes:
  0 — No dual-naming violations
  1 — Dual-naming violations detected
  2 — Database connection error

Examples:
  # Run dual-naming check
  node scripts/ci-guards/functional-roles-no-dual-naming.mjs
`);
  process.exit(0);
}

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc';

async function checkFunctionalRolesDualNaming() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    const result = await pool.query(`
      SELECT 
        fr.role_id,
        fr.role_code
      FROM platform_dauth.functional_roles fr
      WHERE fr.role_id LIKE 'role_%'
      ORDER BY fr.role_code
    `);
    
    const prefixedRoles = result.rows.map(row => row.role_code);
    const violations = [];
    
    for (const prefixedRole of prefixedRoles) {
      const unprefixed = prefixedRole.replace(/^role_/, '');
      const hasUnprefixed = await pool.query(
        'SELECT 1 FROM platform_dauth.functional_roles WHERE role_code = $1',
        [unprefixed]
      );
      
      if (hasUnprefixed.rows.length > 0) {
        violations.push({ prefixed: prefixedRole, unprefixed });
      }
    }
    
    if (violations.length > 0) {
      console.error('❌ Functional roles dual-naming violations detected:');
      violations.forEach(v => {
        console.error(`  - Both ${v.unprefixed} and ${v.prefixed} exist`);
      });
      console.error(`\nTotal violations: ${violations.length}`);
      console.error('\nCanonical: prefixed roles (role_<name>)');
      console.error('To fix: Run migration to alias unprefixed to prefixed');
      process.exit(1);
    }
    
    console.log('✅ Functional roles dual-naming check passed');
    console.log(`   Checked ${result.rows.length} prefixed roles`);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    process.exit(2);
  } finally {
    await pool.end();
  }
}

checkFunctionalRolesDualNaming();
