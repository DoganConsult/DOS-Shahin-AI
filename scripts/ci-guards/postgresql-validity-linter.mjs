#!/usr/bin/env node
/**
 * PostgreSQL Validity Linter
 * 
 * Static check that rejects CHECK (… IN (SELECT … FROM other_table …)) and
 * similar cross-table predicates at PR time. Prevents cross-table predicate bugs.
 * 
 * Usage: node scripts/ci-guards/postgresql-validity-linter.mjs <migration-file>
 * 
 * Exit codes:
 * - 0: No cross-table predicates found
 * - 1: Cross-table predicates detected
 * - 2: Error
 */

import { readFileSync } from 'node:fs';

async function lintPostgreSQLValidity(migrationFile) {
  console.log(`[postgresql-validity-linter] Linting: ${migrationFile}`);
  
  try {
    const content = readFileSync(migrationFile, 'utf-8');
    
    // Check for CHECK (… IN (SELECT … FROM other_table …))
    const crossTableCheckPattern = /CHECK\s*\([^)]*IN\s*\([^)]*SELECT[^)]*FROM\s+\w+/gi;
    const matches = content.match(crossTableCheckPattern);
    
    if (matches && matches.length > 0) {
      console.error('❌ Cross-table CHECK predicates detected:');
      matches.forEach((match, i) => {
        console.error(`  - Match ${i + 1}: ${match.substring(0, 100)}...`);
      });
      console.error(`\nTotal matches: ${matches.length}`);
      console.error('\nCross-table CHECK predicates are not allowed. Use FK constraints instead.');
      process.exit(1);
    }
    
    console.log('✅ PostgreSQL validity linter passed');
    console.log('   No cross-table CHECK predicates found');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(2);
  }
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: node scripts/ci-guards/postgresql-validity-linter.mjs <migration-file>');
  process.exit(2);
}

lintPostgreSQLValidity(migrationFile);
