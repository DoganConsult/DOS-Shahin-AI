/**
 * UI Foundation Integration Verification Test
 * 
 * Verifies that canonical components are properly exported and accessible
 * across the platform. This test ensures integration setup is complete.
 * 
 * Run: pnpm exec tsx src/app/shared/components/ui-foundation-integration-verification.test.ts
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Test file is in: frontend/src/app/shared/components/
// Go up 2 levels to: frontend/src/app/
const APP_ROOT = resolve(__dirname, '../..');

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

console.log('=== UI Foundation Integration Verification ===\n');

// 1. Verify canonical components exist
console.log('1. Verifying canonical components exist...\n');

const canonicalComponents = [
  // Widget Shell
  'dashboard/shared/widget-shell/widget-shell.component.ts',
  
  // Global Search
  'shared/global-search/global-search.component.ts',
  
  // Scope Filter Bar
  'shared/scope-filter-bar/scope-filter-bar.component.ts',
  
  // Sidebar
  'layout/app-sidebar.component.ts',
  
  // Page Components
  'shared/components/page-shell.component.ts',
  'shared/components/page-header.component.ts',
  'shared/components/stat-card.component.ts',
  'shared/components/skeleton-loader.component.ts',
  'shared/components/empty-state.component.ts',
  
  // Charts
  'shared/charts/echart.component.ts',
  'shared/charts/plotly-chart.component.ts',
];

canonicalComponents.forEach(componentPath => {
  const fullPath = resolve(APP_ROOT, componentPath);
  try {
    assert(existsSync(fullPath), `Canonical component exists: ${componentPath}`);
  } catch (err) {
    throw new Error(`Canonical component not found: ${componentPath} (resolved to: ${fullPath})`);
  }
});

// 2. Verify barrel exports exist
console.log('\n2. Verifying barrel exports exist...\n');

const barrelExports = [
  'shared/components/index.ts',
  'shared/charts/index.ts',
  'shared/scope-filter-bar/index.ts',
  'shared/global-search/index.ts',
  'dashboard/shared/widget-shell/index.ts',
  'layout/index.ts',
];

barrelExports.forEach(barrelPath => {
  const fullPath = resolve(APP_ROOT, barrelPath);
  assert(existsSync(fullPath), `Barrel export exists: ${barrelPath}`);
});

// 3. Verify integration documentation exists
console.log('\n3. Verifying integration documentation exists...\n');

const documentation = [
  'shared/components/PLATFORM_INTEGRATION_SETUP.md',
  'shared/components/CANONICAL_COMPONENT_MAP.md',
  'shared/components/DEPRECATION_MAP.md',
  'shared/components/GUARDRAILS_README.md',
  'shared/charts/CHART_POLICY.md',
];

documentation.forEach(docPath => {
  const fullPath = resolve(APP_ROOT, docPath);
  assert(existsSync(fullPath), `Documentation exists: ${docPath}`);
});

// 4. Verify components are standalone
console.log('\n4. Verifying canonical components are standalone...\n');

canonicalComponents.forEach(componentPath => {
  const fullPath = resolve(APP_ROOT, componentPath);
  try {
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, 'utf-8');
      // Check for standalone: true in @Component decorator
      const isStandalone = content.includes('standalone: true') || 
                          content.includes('standalone:true');
      assert(isStandalone, `Component is standalone: ${componentPath}`);
    } else {
      throw new Error(`Component file not found: ${componentPath}`);
    }
  } catch (err) {
    // Re-throw with more context
    throw new Error(`Failed to verify standalone status for ${componentPath}: ${err instanceof Error ? err.message : String(err)}`);
  }
});

// 5. Verify barrel exports export correct components
console.log('\n5. Verifying barrel exports export correct components...\n');

// Check shared/components/index.ts
const sharedComponentsIndex = resolve(APP_ROOT, 'shared/components/index.ts');
if (existsSync(sharedComponentsIndex)) {
  const content = readFileSync(sharedComponentsIndex, 'utf-8');
  assert(content.includes('PageShellComponent'), 'Barrel exports PageShellComponent');
  assert(content.includes('PageHeaderComponent'), 'Barrel exports PageHeaderComponent');
  assert(content.includes('StatCardComponent'), 'Barrel exports StatCardComponent');
  assert(content.includes('SkeletonLoaderComponent'), 'Barrel exports SkeletonLoaderComponent');
  assert(content.includes('EmptyStateComponent'), 'Barrel exports EmptyStateComponent');
}

// Check charts/index.ts
const chartsIndex = resolve(APP_ROOT, 'shared/charts/index.ts');
if (existsSync(chartsIndex)) {
  const content = readFileSync(chartsIndex, 'utf-8');
  assert(content.includes('EChartComponent'), 'Barrel exports EChartComponent');
  assert(content.includes('PlotlyChartComponent'), 'Barrel exports PlotlyChartComponent');
}

// Check scope-filter-bar/index.ts
const scopeFilterIndex = resolve(APP_ROOT, 'shared/scope-filter-bar/index.ts');
if (existsSync(scopeFilterIndex)) {
  const content = readFileSync(scopeFilterIndex, 'utf-8');
  assert(content.includes('ScopeFilterBarComponent'), 'Barrel exports ScopeFilterBarComponent');
  assert(content.includes('OrgEntity'), 'Barrel exports OrgEntity type');
  assert(content.includes('ScopeFilter'), 'Barrel exports ScopeFilter type');
}

// Check global-search/index.ts
const globalSearchIndex = resolve(APP_ROOT, 'shared/global-search/index.ts');
if (existsSync(globalSearchIndex)) {
  const content = readFileSync(globalSearchIndex, 'utf-8');
  assert(content.includes('GlobalSearchComponent'), 'Barrel exports GlobalSearchComponent');
}

// Check widget-shell/index.ts
const widgetShellIndex = resolve(APP_ROOT, 'dashboard/shared/widget-shell/index.ts');
if (existsSync(widgetShellIndex)) {
  const content = readFileSync(widgetShellIndex, 'utf-8');
  assert(content.includes('WidgetShellComponent'), 'Barrel exports WidgetShellComponent');
  assert(content.includes('WidgetState'), 'Barrel exports WidgetState type');
}

// Check layout/index.ts
const layoutIndex = resolve(APP_ROOT, 'layout/index.ts');
if (existsSync(layoutIndex)) {
  const content = readFileSync(layoutIndex, 'utf-8');
  assert(content.includes('AppSidebarComponent'), 'Barrel exports AppSidebarComponent');
}

// 6. Verify integration setup documentation has examples
console.log('\n6. Verifying integration setup documentation has examples...\n');

const integrationDoc = resolve(APP_ROOT, 'shared/components/PLATFORM_INTEGRATION_SETUP.md');
if (existsSync(integrationDoc)) {
  const content = readFileSync(integrationDoc, 'utf-8');
  assert(content.includes('import { WidgetShellComponent }'), 'Documentation includes import examples');
  assert(content.includes('imports: ['), 'Documentation includes component imports examples');
  assert(content.includes('<app-widget-shell'), 'Documentation includes template examples');
  assert(content.includes('Pattern 1:'), 'Documentation includes integration patterns');
  assert(content.includes('Common Integration Mistakes'), 'Documentation includes common mistakes');
  assert(content.includes('Integration Checklist'), 'Documentation includes integration checklist');
}

console.log('\n=== All Integration Verification Tests PASSED ===');
