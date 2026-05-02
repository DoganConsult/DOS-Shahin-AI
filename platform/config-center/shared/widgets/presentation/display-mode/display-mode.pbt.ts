// ============================================
// Display Mode — Property-Based Tests (Property 9)
// Feature: premium-dashboard-overhaul, Task 5.2
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/shared/widgets/display-mode.pbt.ts

import * as fc from 'fast-check';
import { getDisplayModeStyles } from './display-mode.utils';

// ============================================
// Arbitraries
// ============================================

const displayModeArb = fc.constantFrom('compact' as const, 'expanded' as const);

// ============================================
// Property 9: Display Mode Style Ordering
// Feature: premium-dashboard-overhaul, Property 9: Display Mode Style Ordering
// **Validates: Requirements 6.1, 6.2**
//
// For any pair of display modes (compact, expanded), the compact mode
// SHALL return strictly smaller values for padding, fontSize, gap,
// and headerHeight than the expanded mode.
// ============================================

console.log('--- Property 9: Display Mode Style Ordering ---');

// 9a: compact padding < expanded padding
fc.assert(
  fc.property(fc.constant(null), () => {
    const compact = getDisplayModeStyles('compact');
    const expanded = getDisplayModeStyles('expanded');
    return compact.widgetPadding < expanded.widgetPadding;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 9a: compact widgetPadding < expanded widgetPadding');

// 9b: compact fontSize < expanded fontSize
fc.assert(
  fc.property(fc.constant(null), () => {
    const compact = getDisplayModeStyles('compact');
    const expanded = getDisplayModeStyles('expanded');
    return compact.fontSize < expanded.fontSize;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 9b: compact fontSize < expanded fontSize');

// 9c: compact gap < expanded gap
fc.assert(
  fc.property(fc.constant(null), () => {
    const compact = getDisplayModeStyles('compact');
    const expanded = getDisplayModeStyles('expanded');
    return compact.gap < expanded.gap;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 9c: compact gap < expanded gap');

// 9d: compact headerHeight < expanded headerHeight
fc.assert(
  fc.property(fc.constant(null), () => {
    const compact = getDisplayModeStyles('compact');
    const expanded = getDisplayModeStyles('expanded');
    return compact.headerHeight < expanded.headerHeight;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 9d: compact headerHeight < expanded headerHeight');

// 9e: all style values are strictly positive for any mode
fc.assert(
  fc.property(displayModeArb, (mode) => {
    const styles = getDisplayModeStyles(mode);
    return (
      styles.widgetPadding > 0 &&
      styles.fontSize > 0 &&
      styles.gap > 0 &&
      styles.headerHeight > 0
    );
  }),
  { numRuns: 100 }
);
console.log('  ✓ 9e: all style values are strictly positive for any mode');

// 9f: compact is strictly smaller on ALL four dimensions simultaneously
fc.assert(
  fc.property(fc.constant(null), () => {
    const compact = getDisplayModeStyles('compact');
    const expanded = getDisplayModeStyles('expanded');
    return (
      compact.widgetPadding < expanded.widgetPadding &&
      compact.fontSize < expanded.fontSize &&
      compact.gap < expanded.gap &&
      compact.headerHeight < expanded.headerHeight
    );
  }),
  { numRuns: 100 }
);
console.log('  ✓ 9f: compact is strictly smaller on ALL four dimensions simultaneously');

console.log('Property 9: PASSED\n');

// ============================================
console.log('=== All display mode property tests PASSED ===');
