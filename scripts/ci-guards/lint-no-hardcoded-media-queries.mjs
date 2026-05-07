#!/usr/bin/env node

/**
 * CI Guard: No Hardcoded @media Queries
 *
 * Scans CSS files for hardcoded @media queries with pixel values.
 * Replaces them with CSS custom properties from DB.
 *
 * Forbidden patterns:
 * - @media (max-width: 480px)
 * - @media (min-width: 481px)
 * - @media screen and (max-width: Npx)
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FORBIDDEN_MEDIA_PATTERNS = [
  /@media\s*\([^)]*max-width\s*:\s*\d+px/,
  /@media\s*\([^)]*min-width\s*:\s*\d+px/,
  /@media\s*screen\s*and\s*\(max-width/,
  /@media\s*screen\s*and\s*\(min-width/,
];

const DIRECTORIES_TO_SCAN = [
  join(__dirname, '../../platform/app/src'),
  join(__dirname, '../../platform/ui-system/dos-design-tokens/src'),
  join(__dirname, '../../platform/config-center/ops/keycloak-themes/dogan/login/resources/css'),
  join(__dirname, '../../platform/config-center/board-report/features'),
  join(__dirname, '../../platform/ui-system/dos-ui-system/src'),
];

let hasErrors = false;

function scanDirectory(dir) {
  try {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.endsWith('.css') || entry.endsWith('.scss')) {
        scanFile(fullPath);
      }
    }
  } catch (error) {
    // Skip directories that don't exist
  }
}

function scanFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      for (const pattern of FORBIDDEN_MEDIA_PATTERNS) {
        if (pattern.test(line)) {
          console.error(`❌ ${filePath}:${i + 1}: Found hardcoded @media query`);
          console.error(`   ${line.trim()}`);
          hasErrors = true;
        }
      }
    }
  } catch (error) {
    // Skip files that can't be read
  }
}

console.log('🔍 Scanning for hardcoded @media queries...');

for (const dir of DIRECTORIES_TO_SCAN) {
  scanDirectory(dir);
}

if (hasErrors) {
  console.error('\n❌ Found hardcoded @media queries. Replace with CSS custom properties from DB.');
  process.exit(1);
} else {
  console.log('✅ No hardcoded @media queries found.');
  process.exit(0);
}
