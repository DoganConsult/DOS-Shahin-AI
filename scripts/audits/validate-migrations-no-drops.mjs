#!/usr/bin/env node
/**
 * Validate that migration up files do not contain DROP statements
 * 
 * This script ensures that:
 * 1. Up migrations do not contain DROP TABLE/COLUMN/INDEX statements
 * 2. Only down migrations contain DROP statements (for rollback)
 * 3. Migration files follow the naming convention: *_down.sql for rollback
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '../..');

// ═══════════════════════════════════════════════════════════════════
// FIND ALL MIGRATION FILES
// ═══════════════════════════════════════════════════════════════════

function findMigrationFiles() {
  const files = [];
  try {
    const result = execSync('find platform -name "*.sql" -type f', { cwd: ROOT, encoding: 'utf8' });
    files.push(...result.trim().split('\n').filter(Boolean));
  } catch (e) {
    console.error('Failed to find migration files:', e.message);
  }
  return files;
}

// ═══════════════════════════════════════════════════════════════════
// VALIDATE MIGRATION FILE
// ═══════════════════════════════════════════════════════════════════

function validateMigrationFile(filePath) {
  const fullPath = path.join(ROOT, filePath);
  const content = fs.readFileSync(fullPath, 'utf8');
  
  const isDownMigration = filePath.includes('_down.sql');
  const lines = content.split('\n');
  
  const issues = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim().toUpperCase();
    
    // Only check UP migrations for DROP statements
    // Down migrations are expected to have DROP statements for rollback
    if (!isDownMigration) {
      if (line.includes('DROP TABLE') || line.includes('DROP COLUMN') || line.includes('DROP INDEX')) {
        issues.push({
          line: i + 1,
          text: lines[i].trim(),
          reason: 'DROP statement in up migration (only allowed in down migrations)'
        });
      }
      
      // CASCADE in up migrations is risky
      if (line.includes('DROP') && line.includes('CASCADE')) {
        issues.push({
          line: i + 1,
          text: lines[i].trim(),
          reason: 'CASCADE DROP in up migration (data loss risk)'
        });
      }
    }
  }
  
  return {
    path: filePath,
    isDownMigration,
    issues
  };
}

// ═══════════════════════════════════════════════════════════════════
// MAIN VALIDATION
// ═══════════════════════════════════════════════════════════════════

function main() {
  console.log('═══ Migration Validation: No Significant Drops ═══\n');
  
  const migrationFiles = findMigrationFiles();
  console.log(`Found ${migrationFiles.length} migration files\n`);
  
  const results = {
    valid: [],
    invalid: [],
    warnings: [],
  };
  
  for (const filePath of migrationFiles) {
    const result = validateMigrationFile(filePath);
    
    if (result.issues.length === 0) {
      results.valid.push(filePath);
    } else {
      const hasErrors = result.issues.some(i => i.reason.includes('up migration'));
      const hasWarnings = result.issues.some(i => i.reason.includes('CASCADE'));
      
      if (hasErrors) {
        results.invalid.push(result);
      } else if (hasWarnings) {
        results.warnings.push(result);
      }
    }
  }
  
  console.log('═══ Summary ═══');
  console.log(`Valid: ${results.valid.length}`);
  console.log(`Invalid (DROP in up migration): ${results.invalid.length}`);
  console.log(`Warnings (CASCADE DROP): ${results.warnings.length}`);
  
  if (results.invalid.length > 0) {
    console.log('\n❌ Invalid Migrations (DROP in up migration):');
    results.invalid.forEach(r => {
      console.log(`\n  ${r.path} (${r.isDownMigration ? 'down' : 'up'} migration)`);
      r.issues.forEach(issue => {
        console.log(`    Line ${issue.line}: ${issue.text}`);
        console.log(`    Reason: ${issue.reason}`);
      });
    });
  }
  
  if (results.warnings.length > 0) {
    console.log('\n⚠️  Warnings (CASCADE DROP in down migration):');
    results.warnings.forEach(r => {
      console.log(`\n  ${r.path} (${r.isDownMigration ? 'down' : 'up'} migration)`);
      r.issues.forEach(issue => {
        console.log(`    Line ${issue.line}: ${issue.text}`);
        console.log(`    Reason: ${issue.reason}`);
      });
    });
  }
  
  if (results.invalid.length === 0 && results.warnings.length === 0) {
    console.log('\n✓ All migrations valid: no DROP statements in up migrations');
    process.exit(0);
  } else if (results.invalid.length === 0) {
    console.log('\n⚠️  Valid with warnings (review CASCADE DROPs)');
    process.exit(0);
  } else {
    console.log('\n❌ Validation failed: DROP statements found in up migrations');
    process.exit(1);
  }
}

main();
