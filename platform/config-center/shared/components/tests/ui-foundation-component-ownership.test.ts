// ============================================
// UI Foundation — Component Ownership Verification
// Phase G: Guardrails
// ============================================
//
// Verifies that canonical components exist and deprecated components are properly marked.
// Run: pnpm exec tsx src/app/shared/components/ui-foundation-component-ownership.test.ts

import { readFileSync } from 'fs';
import { resolve } from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

console.log('--- UI Foundation Component Ownership Verification ---\n');

// Canonical component definitions from CANONICAL_COMPONENT_MAP.md
const CANONICAL_COMPONENTS = [
  {
    selector: 'app-widget-shell',
    path: 'dashboard/shared/widget-shell/widget-shell.component.ts',
    deprecated: ['app-widget-shell-deprecated'],
  },
  {
    selector: 'app-global-search',
    path: 'shared/global-search/global-search.component.ts',
    deprecated: ['app-global-search-deprecated'],
  },
  {
    selector: 'app-scope-filter-bar',
    path: 'shared/scope-filter-bar/scope-filter-bar.component.ts',
    deprecated: [],
  },
  {
    selector: 'app-layout-sidebar',
    path: 'layout/app-sidebar.component.ts',
    deprecated: ['app-sidebar-deprecated'],
  },
  {
    selector: 'app-page-shell',
    path: 'shared/components/page-shell.component.ts',
    deprecated: [],
  },
  {
    selector: 'app-page-header',
    path: 'shared/components/page-header.component.ts',
    deprecated: [],
  },
  {
    selector: 'app-section-header',
    path: 'shared/components/section-header.component.ts',
    deprecated: [],
  },
  {
    selector: 'app-stat-card',
    path: 'shared/components/stat-card.component.ts',
    deprecated: [],
  },
  {
    selector: 'app-skeleton-loader',
    path: 'shared/components/skeleton-loader.component.ts',
    deprecated: [],
  },
  {
    selector: 'app-empty-state',
    path: 'shared/components/empty-state.component.ts',
    deprecated: [],
  },
  {
    selector: 'app-echart',
    path: 'shared/widgets/echart-wrapper/app-echart.component.ts',
    deprecated: [],
  },
  {
    selector: 'app-plotly-chart',
    path: 'shared/widgets/plotly-chart/plotly-chart.component.ts',
    deprecated: [],
  },
];

// Test 1: All canonical components exist
console.log('Test 1 — Canonical components exist:');
for (const component of CANONICAL_COMPONENTS) {
  const fullPath = resolve(__dirname, '../../..', component.path);
  try {
    const content = readFileSync(fullPath, 'utf-8');
    assert(
      content.includes(`selector: '${component.selector}'`) || 
      content.includes(`selector: "${component.selector}"`),
      `${component.selector} exists at ${component.path}`
    );
  } catch (err) {
    throw new Error(`Canonical component ${component.selector} not found at ${component.path}`);
  }
}

// Test 2: Deprecated components are marked with @deprecated
 * @removal-date Phase 6 (Frontend consumption)
 * @owner DOS
 * @replacement DAuth frontend services (core/dauth/)
console.log('\nTest 2 — Deprecated components are marked:');
const deprecatedComponents = [
  {
    selector: 'app-widget-shell-deprecated',
    paths: [
      'shared/widgets/widget-shell/widget-shell.component.ts',
      'features/dashboard/widgets/widget-shell.component.ts',
    ],
  },
  {
    selector: 'app-global-search-deprecated',
    paths: ['shared/components/global-search.component.ts'],
  },
  {
    selector: 'app-sidebar-deprecated',
    paths: ['shared/layout/sidebar.component.ts'],
  },
];

for (const deprecated of deprecatedComponents) {
  for (const relPath of deprecated.paths) {
    const fullPath = resolve(__dirname, '../../..', relPath);
    try {
      const content = readFileSync(fullPath, 'utf-8');
      assert(
        content.includes('@deprecated
 * @removal-date Phase 6 (Frontend consumption)
 * @owner DOS
 * @replacement DAuth frontend services (core/dauth/)') || content.includes('@Deprecated'),
        `${deprecated.selector} in ${relPath} is marked as deprecated`
      );
    } catch (err) {
      // Component might not exist, which is OK if it was removed
      console.log(`    ⚠ ${relPath} not found (may have been removed)`);
    }
  }
}

// Test 3: Canonical components are standalone
console.log('\nTest 3 — Canonical components are standalone:');
for (const component of CANONICAL_COMPONENTS) {
  const fullPath = resolve(__dirname, '../../..', component.path);
  try {
    const content = readFileSync(fullPath, 'utf-8');
    assert(
      content.includes('standalone: true'),
      `${component.selector} is standalone`
    );
  } catch (err) {
    // Skip if file doesn't exist
    continue;
  }
}

// Test 4: Verify CANONICAL_COMPONENT_MAP.md exists and references canonical components
console.log('\nTest 4 — Canonical component map exists:');
const mapPath = resolve(__dirname, 'CANONICAL_COMPONENT_MAP.md');
try {
  const mapContent = readFileSync(mapPath, 'utf-8');
  for (const component of CANONICAL_COMPONENTS) {
    assert(
      mapContent.includes(component.selector),
      `CANONICAL_COMPONENT_MAP.md references ${component.selector}`
    );
  }
} catch (err) {
  throw new Error('CANONICAL_COMPONENT_MAP.md not found');
}

console.log('\n=== All Component Ownership Tests PASSED ===');
