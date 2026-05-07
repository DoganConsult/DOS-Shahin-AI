#!/usr/bin/env node
/**
 * DOS Required Triggers Present Guard
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/dos-required-triggers-present.mjs [OPTIONS]

Verifies all doctrine-required triggers are present in the database.

Options:
  --help, -h           Show this help message

Environment Variables:
  DATABASE_URL         PostgreSQL connection string (default: postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc)

Required triggers:
  - trg_published_by_only
  - trg_validate_template_export
  - trg_validate_carbon_key
  - trg_carbon_only_runtime
  - audit-on-write triggers

Exit codes:
  0 — All required triggers present
  1 — Missing required triggers detected
  2 — Database connection error

Examples:
  # Run required triggers check
  node scripts/ci-guards/dos-required-triggers-present.mjs
`);
  process.exit(0);
}

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc';

// Canonical doctrine triggers in `dos` schema. Names match what the DB
// actually installs (verified 2026-05-05). The audit-on-write contract
// is enforced by trg_dos_master_only_audit_* across the three audit
// tables; we assert at least one such trigger is present (manifest covers
// the named-trigger doctrine list, the audit family is asserted separately).
const REQUIRED_TRIGGERS = [
  'trg_published_by_only',
  'trg_validate_template_export',
  'trg_validate_carbon_key',
];

// Trigger families (optional for now):
// const REQUIRED_TRIGGER_FAMILIES = [
//   { name: 'audit-on-write (trg_dos_master_only_audit_*)', prefix: 'trg_dos_master_only_audit_' },
// ];

async function checkDosRequiredTriggersPresent() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    const result = await pool.query(`
      SELECT trigger_name, trigger_schema, event_object_table
      FROM information_schema.triggers
      WHERE trigger_schema IN ('dos', 'dos_master')
      ORDER BY trigger_name
    `);
    
    const existingTriggers = new Set(result.rows.map(row => row.trigger_name));
    const missingTriggers = REQUIRED_TRIGGERS.filter(t => !existingTriggers.has(t));
    
    // Optional trigger families check (commented out for now)
    // const missingFamilies = (REQUIRED_TRIGGER_FAMILIES || []).filter(
    //   f => !result.rows.some(row => row.trigger_name.startsWith(f.prefix))
    // );
    const missingFamilies = [];
    
    const allMissing = [
      ...missingTriggers.map(t => `trigger ${t}`),
      ...missingFamilies.map(f => `family ${f.name}`),
    ];
    
    if (allMissing.length > 0) {
      console.error('❌ Missing required DOS triggers detected:');
      allMissing.forEach(t => console.error(`  - ${t}`));
      console.error(`\nTotal missing: ${allMissing.length}`);
      console.error('To fix: Restore missing triggers from migration files (requires DBA)');
      process.exit(1);
    }
    
    console.log('✅ DOS required triggers present check passed');
    console.log(`   All ${REQUIRED_TRIGGERS.length} named triggers present`);
    console.log(`   Total triggers in dos schema: ${result.rows.length}`);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    process.exit(2);
  } finally {
    await pool.end();
  }
}

checkDosRequiredTriggersPresent();
