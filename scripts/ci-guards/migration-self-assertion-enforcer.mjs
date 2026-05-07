#!/usr/bin/env node
/**
 * Migration Self-Assertion Enforcer
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/migration-self-assertion-enforcer.mjs [OPTIONS]

Rejects migration files lacking a DO $$ … RAISE EXCEPTION self-assertion block at the tail.

Options:
  --help, -h           Show this help message

Policy:
  Enforces tail self-assertion pattern for all migrations.
  Checks for DO $$ block and RAISE EXCEPTION near end of file.

Exit codes:
  0 — Self-assertion block present
  1 — Self-assertion block missing
  2 — Error

Examples:
  # Run migration self-assertion enforcer
  node scripts/ci-guards/migration-self-assertion-enforcer.mjs
`);
  process.exit(0);
}

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(fileURLToPath(import.meta.url), '..', '..', '..');
const MIGRATION_DIRS = [
  join(repoRoot, 'platform/dos/migrations/public'),
  join(repoRoot, 'platform/dos/migrations/tenant'),
];

function checkSelfAssertion(content) {
  // Check for DO $$ block at the end of the file
  const doBlockPattern = /DO\s+\$\$/i;
  const raiseExceptionPattern = /RAISE\s+EXCEPTION/i;
  
  if (!doBlockPattern.test(content)) {
    return false;
  }
  
  if (!raiseExceptionPattern.test(content)) {
    return false;
  }
  
  // Ensure the DO block is near the end (last 20 lines or so)
  const lines = content.split('\n');
  const lastDoBlockIndex = lines.map(l => l.trim()).lastIndexOf('DO $$');
  
  if (lastDoBlockIndex === -1) {
    return false;
  }
  
  // DO block should be in the last 20% of the file or last 30 lines
  const minIndex = Math.max(0, lines.length - 30);
  return lastDoBlockIndex >= minIndex;
}

async function lintMigrations() {
  console.log('[migration-self-assertion-enforcer] Checking migration files...');
  
  const violations = [];
  
  for (const migDir of MIGRATION_DIRS) {
    try {
      const files = readdirSync(migDir).filter(f => f.endsWith('.sql') && !f.includes('_down'));
      
      for (const file of files) {
        const filePath = join(migDir, file);
        const content = readFileSync(filePath, 'utf-8');
        
        if (!checkSelfAssertion(content)) {
          violations.push({ file: filePath, reason: 'Missing or misplaced self-assertion block (DO $$ ... RAISE EXCEPTION)' });
        }
      }
    } catch (error) {
      // Directory might not exist, skip
    }
  }
  
  if (violations.length > 0) {
    console.error('❌ Migration self-assertion violations detected:');
    violations.forEach(v => {
      console.error(`  - ${v.file}: ${v.reason}`);
    });
    console.error(`\nTotal violations: ${violations.length}`);
    console.error('\nTo fix: Add DO $$ ... RAISE EXCEPTION ... END $$ self-assertion block at the end of each migration');
    process.exit(1);
  }
  
  console.log('✅ Migration self-assertion enforcer passed');
  console.log('   All migrations have self-assertion blocks');
  process.exit(0);
}

async function lintSingleMigration(migrationFile) {
  console.log(`[migration-self-assertion-enforcer] Checking: ${migrationFile}`);
  
  try {
    const content = readFileSync(migrationFile, 'utf-8');
    
    if (!checkSelfAssertion(content)) {
      console.error('❌ Missing or misplaced self-assertion block');
      console.error('Add DO $$ ... RAISE EXCEPTION ... END $$ self-assertion block at the end');
      process.exit(1);
    }
    
    console.log('✅ Self-assertion block present');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(2);
  }
}

const migrationFile = process.argv[2];
if (migrationFile) {
  lintSingleMigration(migrationFile);
} else {
  lintMigrations();
}
