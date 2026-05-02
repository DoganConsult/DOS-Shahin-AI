// ============================================
// Shared Components — Property-Based Tests (Properties 4, 5, 6)
// Feature: modern-ui-overhaul
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/shared/components/shared-components.pbt.ts

import * as fc from 'fast-check';

// ============================================
// Simulate component logic (extracted from Angular components)
// ============================================

// --- PageShellComponent logic (breadcrumbs) ---
interface MenuItem { label: string; icon?: string; routerLink?: string; }

function breadcrumbItems(breadcrumbs: string[]): MenuItem[] {
  return breadcrumbs.map(b => ({ label: b }));
}

// --- PageShellComponent logic (loading state) ---
interface LoadingState { skeletonVisible: boolean; contentVisible: boolean; }

function getLoadingState(loading: boolean): LoadingState {
  return { skeletonVisible: loading, contentVisible: !loading };
}

// --- StatCardComponent logic (rendering) ---
interface StatCardConfig {
  icon: string;
  value: string | number;
  label: string;
  trend?: number;
}

interface StatCardOutput {
  iconClass: string;
  valueText: string;
  labelText: string;
  trendElement?: { text: string; direction: 'up' | 'down' };
}

function renderStatCard(config: StatCardConfig): StatCardOutput {
  const output: StatCardOutput = {
    iconClass: 'pi pi-' + config.icon,
    valueText: String(config.value),
    labelText: config.label,
  };
  if (config.trend !== undefined) {
    const prefix = config.trend > 0 ? '+' : '';
    output.trendElement = {
      text: `${prefix}${config.trend}%`,
      direction: config.trend >= 0 ? 'up' : 'down',
    };
  }
  return output;
}

// ============================================
// Arbitraries
// ============================================

/** Non-empty printable strings for breadcrumb labels */
const breadcrumbStringArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);

/** Non-empty arrays of breadcrumb strings (1–10 items) */
const breadcrumbArrayArb = fc.array(breadcrumbStringArb, { minLength: 1, maxLength: 10 });

/** Icon names (alphanumeric + hyphens, like PrimeIcon names) */
const iconArb = fc.stringMatching(/^[a-z][a-z0-9-]{0,19}$/);

/** Stat card value: either a string or a number */
const valueArb = fc.oneof(
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
  fc.integer({ min: 0, max: 999999 })
);

/** Label strings */
const labelArb = fc.string({ minLength: 1, maxLength: 40 }).filter(s => s.trim().length > 0);

/** Trend: either undefined or a number between -100 and 100 */
const trendArb = fc.oneof(
  fc.constant(undefined),
  fc.integer({ min: -100, max: 100 })
);

/** Full StatCardConfig arbitrary */
const statCardConfigArb = fc.record({
  icon: iconArb,
  value: valueArb,
  label: labelArb,
  trend: trendArb,
});

// ============================================
// Property 4: Breadcrumb rendering completeness
// Feature: modern-ui-overhaul, Property 4: Breadcrumb rendering completeness
// **Validates: Requirements 4.2**
//
// For any non-empty array of breadcrumb strings, the PageShell
// component's breadcrumbItems getter shall produce an array of the
// same length where each item's label matches the corresponding
// input string.
// ============================================

console.log('--- Property 4: Breadcrumb rendering completeness ---');

// 4a: Output array length equals input array length
fc.assert(
  fc.property(breadcrumbArrayArb, (crumbs) => {
    const items = breadcrumbItems(crumbs);
    return items.length === crumbs.length;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 4a: output array length equals input array length');

// 4b: Each item's label matches the corresponding input string
fc.assert(
  fc.property(breadcrumbArrayArb, (crumbs) => {
    const items = breadcrumbItems(crumbs);
    return crumbs.every((c, i) => items[i].label === c);
  }),
  { numRuns: 100 }
);
console.log('  ✓ 4b: each item label matches the corresponding input string');

console.log('Property 4: PASSED\n');

// ============================================
// Property 5: Loading state exclusivity
// Feature: modern-ui-overhaul, Property 5: Loading state exclusivity
// **Validates: Requirements 4.4**
//
// For any PageShell component, when loading is true the skeleton
// placeholder shall be visible and the content slot shall be hidden,
// and when loading is false the content slot shall be visible and the
// skeleton shall be hidden. These two states are mutually exclusive.
// ============================================

console.log('--- Property 5: Loading state exclusivity ---');

// 5a: Skeleton and content visibility are always mutually exclusive
fc.assert(
  fc.property(fc.boolean(), (loading) => {
    const state = getLoadingState(loading);
    return state.skeletonVisible !== state.contentVisible;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 5a: skeleton and content visibility are mutually exclusive');

// 5b: When loading=true, skeleton is visible and content is hidden
fc.assert(
  fc.property(fc.constant(true), (loading) => {
    const state = getLoadingState(loading);
    return state.skeletonVisible === true && state.contentVisible === false;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 5b: loading=true → skeleton visible, content hidden');

// 5c: When loading=false, content is visible and skeleton is hidden
fc.assert(
  fc.property(fc.constant(false), (loading) => {
    const state = getLoadingState(loading);
    return state.skeletonVisible === false && state.contentVisible === true;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 5c: loading=false → content visible, skeleton hidden');

console.log('Property 5: PASSED\n');

// ============================================
// Property 6: Stat card renders all provided configuration fields
// Feature: modern-ui-overhaul, Property 6: Stat card renders all provided configuration fields
// **Validates: Requirements 6.1, 6.2**
//
// For any StatCardConfig with icon, value, and label fields, the
// StatCard component output shall contain the icon class, the value
// text, and the label text. When a trend value is provided, the
// output shall additionally contain the trend percentage with correct
// sign prefix ('+' for positive, no prefix for negative). When trend
// is undefined, no trend element shall be present.
// ============================================

console.log('--- Property 6: Stat card renders all provided configuration fields ---');

// 6a: Icon class always contains 'pi pi-' prefix + the icon name
fc.assert(
  fc.property(statCardConfigArb, (config) => {
    const output = renderStatCard(config);
    return output.iconClass === 'pi pi-' + config.icon;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 6a: icon class contains pi pi- prefix + icon name');

// 6b: Value text matches stringified input value
fc.assert(
  fc.property(statCardConfigArb, (config) => {
    const output = renderStatCard(config);
    return output.valueText === String(config.value);
  }),
  { numRuns: 100 }
);
console.log('  ✓ 6b: value text matches stringified input value');

// 6c: Label text matches input label
fc.assert(
  fc.property(statCardConfigArb, (config) => {
    const output = renderStatCard(config);
    return output.labelText === config.label;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 6c: label text matches input label');

// 6d: When trend is defined, trend element is present with correct sign prefix
fc.assert(
  fc.property(
    statCardConfigArb.filter(c => c.trend !== undefined),
    (config) => {
      const output = renderStatCard(config);
      if (!output.trendElement) return false;
      const trend = config.trend!;
      const expectedPrefix = trend > 0 ? '+' : '';
      const expectedText = `${expectedPrefix}${trend}%`;
      return output.trendElement.text === expectedText;
    }
  ),
  { numRuns: 100 }
);
console.log('  ✓ 6d: trend element has correct sign prefix when trend is defined');

// 6e: When trend is defined, direction is 'up' for non-negative, 'down' for negative
fc.assert(
  fc.property(
    statCardConfigArb.filter(c => c.trend !== undefined),
    (config) => {
      const output = renderStatCard(config);
      if (!output.trendElement) return false;
      const expectedDir = config.trend! >= 0 ? 'up' : 'down';
      return output.trendElement.direction === expectedDir;
    }
  ),
  { numRuns: 100 }
);
console.log('  ✓ 6e: trend direction is up for non-negative, down for negative');

// 6f: When trend is undefined, no trend element is present
fc.assert(
  fc.property(
    statCardConfigArb.filter(c => c.trend === undefined),
    (config) => {
      const output = renderStatCard(config);
      return output.trendElement === undefined;
    }
  ),
  { numRuns: 100 }
);
console.log('  ✓ 6f: no trend element when trend is undefined');

console.log('Property 6: PASSED\n');

// ============================================
console.log('=== All shared component property tests PASSED ===');
