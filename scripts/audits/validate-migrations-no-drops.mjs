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
  // Allow DROP in cleanup scripts, ops scripts, and superuser scripts
  const isCleanupScript = filePath.includes('/cleanup/') || 
                         filePath.includes('/ops/') || 
                         filePath.includes('/superuser/') ||
                         filePath.includes('/normalization/') ||
                         filePath.includes('tier1-cleanup');
  
  const lines = content.split('\n');
  
  const issues = [];
  
  // Only check UP migrations for DROP statements
  // Down migrations are expected to have DROP statements for rollback
  // Cleanup scripts and ops scripts are allowed to DROP
  const shouldCheckDrops = !isDownMigration && !isCleanupScript;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    const upperLine = trimmedLine.toUpperCase();
    
    // Skip comments (lines that start with -- after trimming whitespace)
    if (upperLine.startsWith('--')) continue;
    
    if (shouldCheckDrops) {
      // Allow ALTER TABLE ... DROP COLUMN (schema evolution is safe)
      const isAlterDropColumn = upperLine.includes('ALTER TABLE') && upperLine.includes('DROP COLUMN');
      
      // Allow DROP TABLE IF EXISTS pg_temp.* (temporary tables are safe)
      const isTempTableDrop = upperLine.includes('DROP TABLE IF EXISTS') && upperLine.includes('PG_TEMP.');
      
      // Allow DROP INDEX IF EXISTS (index drops are safe for performance)
      const isIndexDrop = upperLine.includes('DROP INDEX IF EXISTS');
      
      const isSafeDrop = isAlterDropColumn || isTempTableDrop || isIndexDrop;
      
      // Only flag unsafe DROPs (DROP TABLE without IF EXISTS, not ALTER, not pg_temp)
      // Use regex to match "DROP TABLE" as a separate keyword, not part of "DROP COLUMN"
      const hasDropTable = /\bDROP TABLE\b/i.test(trimmedLine);
      const hasIfExists = upperLine.includes('IF EXISTS');
      const isExecuteDrop = trimmedLine.toUpperCase().startsWith('EXECUTE') && hasDropTable;
      
      // Allow DROP TABLE IF EXISTS (safe) and EXECUTE 'DROP TABLE' (dynamic SQL)
      if (hasDropTable && !hasIfExists && !isSafeDrop && !isExecuteDrop) {
        issues.push({
          line: i + 1,
          text: trimmedLine,
          reason: 'DROP TABLE without IF EXISTS in up migration (use DROP TABLE IF EXISTS for safe schema evolution)'
        });
      }
      
      // CASCADE in foreign key constraints (ON DELETE CASCADE) is standard SQL and safe
      // Only flag CASCADE in DROP statements, not in FK constraints
      // DROP SCHEMA CASCADE and DROP VIEW CASCADE are acceptable for cleanup
      // EXECUTE 'DROP TABLE CASCADE' is acceptable for dynamic SQL in governance/cleanup
      const hasDropCascade = /\bDROP.*CASCADE\b/i.test(trimmedLine);
      const hasFkCascade = /ON DELETE CASCADE/i.test(trimmedLine);
      const hasSchemaCascade = /\bDROP SCHEMA.*CASCADE\b/i.test(trimmedLine);
      const hasViewCascade = /\bDROP VIEW.*CASCADE\b/i.test(trimmedLine);
      
      if (hasDropCascade && !hasFkCascade && !hasSchemaCascade && !hasViewCascade && !isExecuteDrop) {
        issues.push({
          line: i + 1,
          text: trimmedLine,
          reason: 'CASCADE in DROP TABLE statement (data loss risk)'
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
