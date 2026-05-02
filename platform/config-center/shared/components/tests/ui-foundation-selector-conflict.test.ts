// ============================================
// UI Foundation — Selector Conflict Detection
// Phase G: Guardrails
// ============================================
//
// Ensures no duplicate selectors exist for critical UI foundation components.
// Run: pnpm exec tsx src/app/shared/components/ui-foundation-selector-conflict.test.ts

import { readFileSync } from 'fs';
import { resolve } from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

// Critical selectors that must have exactly one canonical implementation
const CRITICAL_SELECTORS = [
  'app-widget-shell',
  'app-global-search',
  'app-scope-filter-bar',
  'app-layout-sidebar',
];

// Known component files to check (canonical + deprecated)
const COMPONENT_FILES = [
  // Canonical
  'dashboard/shared/widget-shell/widget-shell.component.ts',
  'shared/global-search/global-search.component.ts',
  'shared/scope-filter-bar/scope-filter-bar.component.ts',
  'layout/app-sidebar.component.ts',
  // Deprecated
  'shared/widgets/widget-shell/widget-shell.component.ts',
  'features/dashboard/widgets/widget-shell.component.ts',
  'shared/components/global-search.component.ts',
  'shared/layout/sidebar.component.ts',
];

console.log('--- UI Foundation Selector Conflict Detection ---\n');

// Track selector usage
const selectorUsage: Record<string, string[]> = {};

for (const relPath of COMPONENT_FILES) {
  const fullPath = resolve(__dirname, '../../..', relPath);
  try {
    const content = readFileSync(fullPath, 'utf-8');
    
    // Match @Component decorator with selector
    const selectorMatch = content.match(/@Component\s*\(\s*\{[^}]*selector:\s*['"]([^'"]+)['"]/s);
    
    if (selectorMatch) {
      const selector = selectorMatch[1];
      if (!selectorUsage[selector]) {
        selectorUsage[selector] = [];
      }
      selectorUsage[selector].push(relPath);
    }
  } catch (err) {
    // Skip files that don't exist (may have been removed)
    continue;
  }
}

// Test 1: Critical selectors must have exactly one canonical implementation
console.log('Test 1 — Critical selectors have exactly one canonical implementation:');
for (const selector of CRITICAL_SELECTORS) {
  const files = selectorUsage[selector] || [];
  assert(
    files.length === 1,
    `${selector} has exactly one implementation (found: ${files.length})`
  );
  if (files.length > 0) {
    console.log(`    → ${files[0]}`);
  }
}

// Test 2: Deprecated selectors should not conflict with canonical ones
console.log('\nTest 2 — Deprecated selectors do not conflict with canonical:');
for (const deprecated of DEPRECATED_SELECTORS) {
  const canonical = deprecated.replace('-deprecated', '');
  const deprecatedFiles = selectorUsage[deprecated] || [];
  const canonicalFiles = selectorUsage[canonical] || [];
  
  assert(
    canonicalFiles.length > 0,
    `Canonical ${canonical} exists (deprecated ${deprecated} found in ${deprecatedFiles.length} files)`
  );
  
  if (deprecatedFiles.length > 0) {
    console.log(`    → ${deprecated} found in ${deprecatedFiles.length} file(s) (OK - deprecated)`);
  }
}

// Test 3: No unexpected duplicate selectors for critical components
console.log('\nTest 3 — No unexpected duplicates for critical selectors:');
for (const selector of CRITICAL_SELECTORS) {
  const files = selectorUsage[selector] || [];
  if (files.length > 1) {
    console.error(`    ✗ ${selector} has ${files.length} implementations:`);
    files.forEach(f => console.error(`      - ${f}`));
    throw new Error(`CRITICAL: ${selector} has multiple implementations`);
  }
}

// Test 4: Verify canonical components are marked correctly
console.log('\nTest 4 — Canonical components are properly marked:');
const canonicalPaths: Record<string, string> = {
  'app-widget-shell': 'dashboard/shared/widget-shell/widget-shell.component.ts',
  'app-global-search': 'shared/global-search/global-search.component.ts',
  'app-scope-filter-bar': 'shared/scope-filter-bar/scope-filter-bar.component.ts',
  'app-layout-sidebar': 'layout/app-sidebar.component.ts',
};

for (const [selector, expectedPath] of Object.entries(canonicalPaths)) {
  const files = selectorUsage[selector] || [];
  if (files.length > 0) {
    const file = files[0];
    assert(
      file === expectedPath || file.includes(expectedPath),
      `${selector} canonical path matches expected (${expectedPath}, found: ${file})`
    );
  }
}

console.log('\n=== All Selector Conflict Tests PASSED ===');
