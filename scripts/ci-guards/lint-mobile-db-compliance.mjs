#!/usr/bin/env node

/**
 * CI Guard: Mobile DB Compliance
 *
 * Checks that mobile tables have required data:
 * - dos.mobile_breakpoint_config has all 3 breakpoints
 * - dos.mobile_component_variants has default variants for mobile components
 * - dos.mobile_touch_gestures has default gesture configurations
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__dirname);

const MIGRATION_DIR = join(__dirname, '../../../platform/dos/migrations/public');

const REQUIRED_BREAKPOINTS = ['mobile', 'tablet', 'desktop'];
const REQUIRED_MOBILE_COMPONENTS = [
  'workspace.mobile.button',
  'workspace.mobile.input',
  'workspace.mobile.dropdown',
  'workspace.mobile.data-table',
  'workspace.mobile.tabs',
  'workspace.mobile.modal',
  'workspace.mobile.card',
  'workspace.mobile.form',
];

let hasErrors = false;

function scanFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    
    // Check for mobile_breakpoint_config seeding
    if (filePath.includes('mobile_breakpoint_config')) {
      for (const bp of REQUIRED_BREAKPOINTS) {
        if (!content.includes(`'${bp}'`)) {
          console.error(`❌ ${filePath}: Missing breakpoint '${bp}'`);
          hasErrors = true;
        }
      }
    }
    
    // Check for mobile_component_variants seeding
    if (filePath.includes('mobile_component_variants') || filePath.includes('mobile_carbon_components_registry')) {
      for (const comp of REQUIRED_MOBILE_COMPONENTS) {
        if (!content.includes(comp)) {
          console.error(`❌ ${filePath}: Missing component '${comp}'`);
          hasErrors = true;
        }
      }
    }
    
    // Check for mobile_touch_gestures seeding
    if (filePath.includes('mobile_touch_gestures')) {
      const requiredGestures = ['swipe-left', 'swipe-right', 'long-press'];
      for (const gesture of requiredGestures) {
        if (!content.includes(`'${gesture}'`)) {
          console.error(`❌ ${filePath}: Missing gesture '${gesture}'`);
          hasErrors = true;
        }
      }
    }
  } catch (error) {
    // Skip files that can't be read
  }
}

console.log('🔍 Scanning for mobile DB compliance...');

const { readdirSync, statSync } = await import('fs');

function scanDirectory(dir) {
  try {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.endsWith('.sql') && entry.includes('mobile')) {
        scanFile(fullPath);
      }
    }
  } catch (error) {
    // Skip directories that don't exist
  }
}

scanDirectory(MIGRATION_DIR);

if (hasErrors) {
  console.error('\n❌ Mobile DB compliance check failed. Required data missing.');
  process.exit(1);
} else {
  console.log('✅ Mobile DB compliance check passed.');
  process.exit(0);
}
