#!/usr/bin/env node

/**
 * CI Guard: Mobile Touch Targets
 *
 * Checks that mobile component variants have touchTargetSize >= 44px.
 * Ensures touch targets meet Apple HIG minimum requirements.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIGRATION_DIR = join(__dirname, '../../platform/dos/migrations/public');
const FORBIDDEN_PATTERN = /"touchTargetSize"\s*:\s*(\d+)/g;

let hasErrors = false;

function scanFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip comments
      if (line.trim().startsWith('--')) continue;
      
      let match;
      while ((match = FORBIDDEN_PATTERN.exec(line)) !== null) {
        const touchTargetSize = parseInt(match[1], 10);
        if (touchTargetSize < 44) {
          console.error(`❌ ${filePath}:${i + 1}: touchTargetSize < 44px (found ${touchTargetSize}px)`);
          console.error(`   ${line.trim()}`);
          hasErrors = true;
        }
      }
    }
  } catch (error) {
    // Skip files that can't be read
  }
}

console.log('🔍 Scanning for mobile touch target compliance...');

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
  console.error('\n❌ Found touch targets < 44px. Minimum is 44px per Apple HIG.');
  process.exit(1);
} else {
  console.log('✅ All touch targets meet minimum size requirements.');
  process.exit(0);
}
