// ============================================
// Display Mode Utils — Unit Tests
// Feature: premium-dashboard-overhaul, Task 5.1
// ============================================
//
// Tests getDisplayModeStyles pure function.
// Run: pnpm exec tsx src/app/shared/widgets/display-mode.utils.test.ts

import { getDisplayModeStyles } from './display-mode.utils';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

function assertDeepEqual(actual: unknown, expected: unknown, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`FAIL: ${message}\n  Expected: ${JSON.stringify(expected)}\n  Actual:   ${JSON.stringify(actual)}`);
  }
  console.log(`  ✓ ${message}`);
}

// ============================================
// getDisplayModeStyles — compact
// ============================================
console.log('--- getDisplayModeStyles: compact ---');

{
  const styles = getDisplayModeStyles('compact');
  assertDeepEqual(styles, { widgetPadding: 8, fontSize: 12, gap: 8, headerHeight: 32 },
    'compact returns correct values');
  assert(styles.widgetPadding === 8, 'compact padding is 8');
  assert(styles.fontSize === 12, 'compact fontSize is 12');
  assert(styles.gap === 8, 'compact gap is 8');
  assert(styles.headerHeight === 32, 'compact headerHeight is 32');
}

console.log('compact: PASSED\n');

// ============================================
// getDisplayModeStyles — expanded
// ============================================
console.log('--- getDisplayModeStyles: expanded ---');

{
  const styles = getDisplayModeStyles('expanded');
  assertDeepEqual(styles, { widgetPadding: 16, fontSize: 14, gap: 16, headerHeight: 44 },
    'expanded returns correct values');
  assert(styles.widgetPadding === 16, 'expanded padding is 16');
  assert(styles.fontSize === 14, 'expanded fontSize is 14');
  assert(styles.gap === 16, 'expanded gap is 16');
  assert(styles.headerHeight === 44, 'expanded headerHeight is 44');
}

console.log('expanded: PASSED\n');

// ============================================
// Property 9: compact < expanded for all fields
// ============================================
console.log('--- Display Mode Style Ordering (Property 9) ---');

{
  const compact = getDisplayModeStyles('compact');
  const expanded = getDisplayModeStyles('expanded');

  assert(compact.widgetPadding < expanded.widgetPadding,
    'compact padding < expanded padding');
  assert(compact.fontSize < expanded.fontSize,
    'compact fontSize < expanded fontSize');
  assert(compact.gap < expanded.gap,
    'compact gap < expanded gap');
  assert(compact.headerHeight < expanded.headerHeight,
    'compact headerHeight < expanded headerHeight');
}

console.log('style ordering: PASSED\n');

// ============================================
// Idempotency — calling twice returns same result
// ============================================
console.log('--- Idempotency ---');

{
  const a = getDisplayModeStyles('compact');
  const b = getDisplayModeStyles('compact');
  assertDeepEqual(a, b, 'compact is idempotent');

  const c = getDisplayModeStyles('expanded');
  const d = getDisplayModeStyles('expanded');
  assertDeepEqual(c, d, 'expanded is idempotent');
}

console.log('idempotency: PASSED\n');

// ============================================
console.log('=== All display-mode.utils unit tests PASSED ===');
