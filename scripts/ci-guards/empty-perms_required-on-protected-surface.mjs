#!/usr/bin/env node
/**
 * Empty perms_required on Protected Surface Guard
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/empty-perms_required-on-protected-surface.mjs [OPTIONS]

Fails when perms_required[] is empty for surfaces tagged protected: true.

Options:
  --help, -h           Show this help message

Behavior:
  - Scans module_ui_os_contract-pack/ for .md doctrine files
  - For every binding key tagged protected: true
  - Fails when perms_required[] is empty in the JSON
  - Forces explicit RBAC declaration on protected surfaces

Exit codes:
  0 — No empty perms_required on protected surfaces
  1 — Empty perms_required on protected surfaces detected
  2 — Error

Examples:
  # Run empty perms_required check
  node scripts/ci-guards/empty-perms_required-on-protected-surface.mjs
`);
  process.exit(0);
}

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOCTRINE_DIR = join(repoRoot, 'platform/ui-system/module_ui_os_contract-pack');

async function checkEmptyPermsRequiredOnProtectedSurface() {
  console.log('[empty-perms_required-on-protected-surface] Starting...');
  
  try {
    if (!existsSync(DOCTRINE_DIR)) {
      console.error('[empty-perms_required-on-protected-surface] Doctrine directory not found:', DOCTRINE_DIR);
      process.exit(2);
    }
    
    const doctrineFiles = readdirSync(DOCTRINE_DIR).filter(f => f.endsWith('.md'));
    const violations = [];
    
    for (const doctrineFile of doctrineFiles) {
      const doctrinePath = join(DOCTRINE_DIR, doctrineFile);
      const content = readFileSync(doctrinePath, 'utf-8');
      
      // Check for protected: true in doctrine
      const protectedMatch = content.match(/protected:\s*true/i);
      if (!protectedMatch) continue;
      
      // Extract component key from doctrine file
      const componentKeyMatch = content.match(/component_key:\s*['"]([^'"]+)['"]/i);
      if (!componentKeyMatch) continue;
      
      const componentKey = componentKeyMatch[1];
      
      // Check corresponding JSON contract for perms_required
      const jsonFile = doctrineFile.replace('.md', '.json');
      const jsonPath = join(DOCTRINE_DIR, jsonFile);
      
      if (!existsSync(jsonPath)) {
        violations.push({ component: componentKey, reason: 'JSON contract not found' });
        continue;
      }
      
      const jsonContent = readFileSync(jsonPath, 'utf-8');
      const json = JSON.parse(jsonContent);
      
      // Check if perms_required is empty or missing
      const permsRequired = json.perms_required;
      if (!permsRequired || (Array.isArray(permsRequired) && permsRequired.length === 0)) {
        violations.push({ component: componentKey, reason: 'perms_required is empty or missing' });
      }
    }
    
    if (violations.length > 0) {
      console.error('❌ Empty perms_required on protected surfaces detected:');
      violations.forEach(v => {
        console.error(`  - ${v.component}: ${v.reason}`);
      });
      console.error(`\nTotal violations: ${violations.length}`);
      console.error('\nTo fix: Add explicit perms_required[] in JSON contract for protected surfaces');
      process.exit(1);
    }
    
    console.log('✅ Empty perms_required on protected surface check passed');
    console.log(`   Checked ${doctrineFiles.length} doctrine files`);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(2);
  }
}

checkEmptyPermsRequiredOnProtectedSurface();
