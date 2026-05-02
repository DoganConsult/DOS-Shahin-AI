// ============================================
// Refresh Timer — Property-Based Tests (Properties 12, 13)
// Feature: premium-dashboard-overhaul, Task 4.4
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/shared/widgets/refresh-timer.pbt.ts

import * as fc from 'fast-check';
import { getDefaultRefreshInterval, computeJitter } from './refresh-timer.utils';

// ============================================
// Arbitraries
// ============================================

/** All valid WidgetCategory values. */
const ALL_CATEGORIES = [
  'risk', 'compliance', 'ai', 'security', 'monitoring',
  'evidence', 'overview', 'reality', 'memory', 'lifecycle',
  'assessment', 'external', 'change', 'landing',
] as const;

type WidgetCategory = (typeof ALL_CATEGORIES)[number];

const categoryArb: fc.Arbitrary<WidgetCategory> = fc.constantFrom(...ALL_CATEGORIES);

/** Random source in [0, 1) for deterministic jitter testing. */
const randomSourceArb = fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true });

// ============================================
// Property 12: Refresh Interval Defaults
// Feature: premium-dashboard-overhaul, Property 12: Refresh Interval Defaults
// **Validates: Requirements 9.1**
//
// For any widget category, getDefaultRefreshInterval SHALL return a
// positive integer. Specifically: 'risk' → 60, 'compliance' → 300,
// 'ai' → 600, 'evidence' → 180. All other categories SHALL return
// a positive default.
// ============================================

console.log('--- Property 12: Refresh Interval Defaults ---');

// 12a: result is always a positive integer for any category
fc.assert(
  fc.property(categoryArb, (category) => {
    const interval = getDefaultRefreshInterval(category);
    return Number.isInteger(interval) && interval > 0;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 12a: result is always a positive integer');

// 12b: known category mappings are exact
fc.assert(
  fc.property(fc.constant(null), () => {
    return (
      getDefaultRefreshInterval('risk') === 60 &&
      getDefaultRefreshInterval('compliance') === 300 &&
      getDefaultRefreshInterval('ai') === 600 &&
      getDefaultRefreshInterval('evidence') === 180
    );
  }),
  { numRuns: 100 }
);
console.log('  ✓ 12b: risk→60, compliance→300, ai→600, evidence→180');

// 12c: non-specified categories return a positive default
const nonSpecifiedCategories = ALL_CATEGORIES.filter(
  (c) => !['risk', 'compliance', 'ai', 'evidence'].includes(c)
);
const nonSpecifiedCategoryArb = fc.constantFrom(...nonSpecifiedCategories);

fc.assert(
  fc.property(nonSpecifiedCategoryArb, (category) => {
    const interval = getDefaultRefreshInterval(category);
    return Number.isInteger(interval) && interval > 0;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 12c: non-specified categories return a positive default');

console.log('Property 12: PASSED\n');

// ============================================
// Property 13: Refresh Jitter Bounds
// Feature: premium-dashboard-overhaul, Property 13: Refresh Jitter Bounds
// **Validates: Requirements 9.4**
//
// For any invocation of the jitter function, the returned value
// SHALL be in the range [0, 5] seconds (inclusive).
// ============================================

console.log('--- Property 13: Refresh Jitter Bounds ---');

// 13a: jitter with explicit random source is in [0, 5]
fc.assert(
  fc.property(randomSourceArb, (r) => {
    const jitter = computeJitter(r);
    return jitter >= 0 && jitter <= 5;
  }),
  { numRuns: 200 }
);
console.log('  ✓ 13a: jitter with explicit random source is in [0, 5]');

// 13b: jitter at boundary random=0 yields 0
fc.assert(
  fc.property(fc.constant(0), (r) => {
    const jitter = computeJitter(r);
    return jitter === 0;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 13b: jitter at random=0 yields 0');

// 13c: jitter at boundary random=1 yields 5
fc.assert(
  fc.property(fc.constant(1), (r) => {
    const jitter = computeJitter(r);
    return jitter === 5;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 13c: jitter at random=1 yields 5');

// 13d: jitter without explicit random (uses Math.random) is in [0, 5]
fc.assert(
  fc.property(fc.constant(null), () => {
    const jitter = computeJitter();
    return jitter >= 0 && jitter <= 5;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 13d: jitter without explicit random is in [0, 5]');

console.log('Property 13: PASSED\n');

// ============================================
console.log('=== All refresh timer property tests PASSED ===');
