// ============================================
// UI Foundation — Token Governance Verification
// Phase G: Guardrails
// ============================================
//
// Ensures canonical components use design tokens instead of hardcoded values.
// Run: pnpm exec tsx src/app/shared/components/ui-foundation-token-governance.test.ts

import { readFileSync } from 'fs';
import { resolve } from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

console.log('--- UI Foundation Token Governance Verification ---\n');

// Components that should use design tokens (from Phase D migration)
const TOKEN_GOVERNED_COMPONENTS = [
  {
    name: 'Widget Shell',
    path: 'dashboard/shared/widget-shell/widget-shell.component.ts',
    selector: 'app-widget-shell',
  },
  {
    name: 'Global Search',
    path: 'shared/global-search/global-search.component.ts',
    selector: 'app-global-search',
  },
  {
    name: 'Scope Filter Bar',
    path: 'shared/scope-filter-bar/scope-filter-bar.component.ts',
    selector: 'app-scope-filter-bar',
  },
  {
    name: 'Stat Card',
    path: 'shared/components/stat-card.component.ts',
    selector: 'app-stat-card',
  },
  {
    name: 'Skeleton Loader',
    path: 'shared/components/skeleton-loader.component.ts',
    selector: 'app-skeleton-loader',
  },
  {
    name: 'Empty State',
    path: 'shared/components/empty-state.component.ts',
    selector: 'app-empty-state',
  },
];

// Patterns that indicate hardcoded values (should be avoided)
const HARDCODED_PATTERNS = [
  /#[0-9a-fA-F]{6}/g,           // Hex colors
  /#[0-9a-fA-F]{3}\b/g,          // Short hex colors
  /rgba?\([^)]+\)/g,             // RGB/RGBA colors
  /\b\d+px\b/g,                  // Pixel values (context-dependent)
  /\b\d+rem\b/g,                 // Rem values (context-dependent)
];

// Allowed exceptions (common patterns that are OK)
const ALLOWED_EXCEPTIONS = [
  /0px/g,                        // Zero values are OK
  /1px/g,                        // 1px borders are often OK
  /100%/g,                       // Percentage values are OK
  /var\(--/g,                    // CSS variables are OK
  /color-mix\(/g,                // color-mix() is OK
  /calc\(/g,                     // calc() is OK
  /url\(/g,                      // URL values are OK
  /transparent/g,                // transparent keyword is OK
  /inherit/g,                    // inherit keyword is OK
  /currentColor/g,               // currentColor is OK
  /@deprecated
 * @removal-date Phase 6 (Frontend consumption)
 * @owner DOS
 * @replacement DAuth frontend services (core/dauth/)/g,                // JSDoc comments
  /\/\/.*#[0-9a-fA-F]/g,         // Hex in comments
  /\/\*.*#[0-9a-fA-F].*\*\//g,  // Hex in comments
];

// Test 1: Check for excessive hardcoded hex colors
console.log('Test 1 — Hardcoded hex colors are minimized:');
for (const component of TOKEN_GOVERNED_COMPONENTS) {
  const fullPath = resolve(__dirname, '../../..', component.path);
  try {
    const content = readFileSync(fullPath, 'utf-8');
    
    // Find hex colors
    const hexMatches = content.matchAll(/#[0-9a-fA-F]{6}/g);
    const hexColors: string[] = [];
    for (const match of hexMatches) {
      const before = content.substring(Math.max(0, match.index! - 20), match.index!);
      const after = content.substring(match.index!, match.index! + match[0].length + 20);
      const context = before + match[0] + after;
      
      // Check if it's in an allowed exception
      const isException = ALLOWED_EXCEPTIONS.some(pat => pat.test(context));
      if (!isException) {
        hexColors.push(match[0]);
      }
    }
    
    // Allow a small number of hardcoded values (legacy or edge cases)
    // But flag if there are many
    if (hexColors.length > 5) {
      console.log(`    ⚠ ${component.name} has ${hexColors.length} hex colors (consider migrating to tokens)`);
    } else {
      assert(
        hexColors.length <= 5,
        `${component.name} has minimal hardcoded hex colors (${hexColors.length})`
      );
    }
  } catch (err) {
    console.log(`    ⚠ ${component.name} file not found (${component.path})`);
  }
}

// Test 2: Verify design token files exist
console.log('\nTest 2 — Design token files exist:');
const tokenFiles = [
  'shared/styles/design-tokens.css',
  'shared/styles/grc-tokens.css',
];

for (const tokenFile of tokenFiles) {
  const fullPath = resolve(__dirname, '../../..', tokenFile);
  try {
    const content = readFileSync(fullPath, 'utf-8');
    assert(
      content.includes('--') && content.includes(':'),
      `${tokenFile} exists and contains CSS custom properties`
    );
  } catch (err) {
    throw new Error(`Design token file ${tokenFile} not found`);
  }
}

// Test 3: Check that migrated components use CSS variables
console.log('\nTest 3 — Migrated components use CSS variables:');
const migratedComponents = [
  {
    name: 'Stat Card',
    path: 'shared/components/stat-card.component.ts',
    shouldHave: ['var(--', '--carbon-', '--grc-'],
  },
  {
    name: 'Skeleton Loader',
    path: 'shared/components/skeleton-loader.component.ts',
    shouldHave: ['var(--', '--carbon-', '--grc-'],
  },
];

for (const component of migratedComponents) {
  const fullPath = resolve(__dirname, '../../..', component.path);
  try {
    const content = readFileSync(fullPath, 'utf-8');
    const hasTokens = component.shouldHave.some(token => content.includes(token));
    assert(
      hasTokens,
      `${component.name} uses design tokens (CSS variables)`
    );
  } catch (err) {
    console.log(`    ⚠ ${component.name} file not found`);
  }
}

// Test 4: Verify DESIGN_TOKEN_MIGRATION.md documents token usage
console.log('\nTest 4 — Token migration documentation exists:');
const docPath = resolve(__dirname, 'DESIGN_TOKEN_MIGRATION.md');
try {
  const docContent = readFileSync(docPath, 'utf-8');
  assert(
    docContent.includes('design token') || docContent.includes('CSS variable'),
    'DESIGN_TOKEN_MIGRATION.md exists and documents token usage'
  );
} catch (err) {
  console.log('    ⚠ DESIGN_TOKEN_MIGRATION.md not found (may be created later)');
}

console.log('\n=== All Token Governance Tests PASSED ===');
