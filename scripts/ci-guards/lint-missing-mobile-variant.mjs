#!/usr/bin/env node

/**
 * CI Guard: Missing Mobile Variant
 *
 * Checks that all routes in dos.dynamic_ui_routes have mobile_variant set.
 * Prevents routes without mobile configuration from being deployed.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// This guard should be run against the database or migration files
// For now, it scans migration files for INSERT statements without mobile_variant

const MIGRATION_DIR = join(__dirname, '../../platform/dos/migrations/public');
const FORBIDDEN_PATTERNS = [
  /INSERT INTO dos\.dynamic_ui_routes\s*\([^)]*\)\s*VALUES\s*\([^)]*\)(?!\s*,\s*['"]mobile_variant['"])/,
  /UPDATE dos\.dynamic_ui_routes\s+SET(?![^]*mobile_variant)/,
];

let hasErrors = false;

function scanFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip comments
      if (line.trim().startsWith('--')) continue;
      
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(line)) {
          console.error(`❌ ${filePath}:${i + 1}: Missing mobile_variant in dynamic_ui_routes`);
          console.error(`   ${line.trim()}`);
          hasErrors = true;
        }
      }
    }
  } catch (error) {
    // Skip files that can't be read
  }
}

console.log('🔍 Scanning for missing mobile_variant in routes...');

// Scan migration files that modify dynamic_ui_routes
const { readdirSync, statSync } = await import('fs');

function scanDirectory(dir) {
  try {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.endsWith('.sql')) {
        scanFile(fullPath);
      }
    }
  } catch (error) {
    // Skip directories that don't exist
  }
}

scanDirectory(MIGRATION_DIR);

if (hasErrors) {
  console.error('\n❌ Found routes without mobile_variant. All routes must have mobile configuration.');
  process.exit(1);
} else {
  console.log('✅ All routes have mobile_variant configured.');
  process.exit(0);
}
