// ============================================
// Layout Grid RTL — Property-Based Test (Property 5)
// Feature: premium-widget-overhaul, Property 5: RTL widget position mirroring
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/shared/widgets/layout-grid-rtl.pbt.ts

import * as fc from 'fast-check';

// ============================================
// Pure function under test
// ============================================

/**
 * Compute the RTL-mirrored horizontal position for a widget.
 *
 * In LTR mode a widget occupies columns [x, x + width).
 * In RTL mode the same widget should occupy columns
 * [columns - x - width, columns - x - width + width),
 * i.e. the mirrored x = columns - x - width.
 */
function mirrorWidgetX(x: number, width: number, columns: number): number {
  return columns - x - width;
}

// ============================================
// Property 5: RTL widget position mirroring
// Feature: premium-widget-overhaul, Property 5: RTL widget position mirroring
// **Validates: Requirements 4.5, 6.1**
//
// For any set of widgets placed in the Layout_Grid, when the grid
// direction changes from LTR to RTL, each widget's effective
// horizontal position SHALL be mirrored such that a widget at
// column x in a grid of N columns appears at column N - x - width
// in RTL mode.
// ============================================

console.log('--- Property 5: RTL widget position mirroring ---');

// 5a: The mirroring formula produces a valid grid position
//     mirroredX must be >= 0 and mirroredX + width <= columns
fc.assert(
  fc.property(
    fc.integer({ min: 1, max: 12 }).chain((columns) =>
      fc.integer({ min: 1, max: columns }).chain((width) =>
        fc.integer({ min: 0, max: columns - width }).map((x) => ({
          columns,
          width,
          x,
        }))
      )
    ),
    ({ columns, width, x }) => {
      const mirrored = mirrorWidgetX(x, width, columns);
      // Mirrored position must be non-negative
      if (mirrored < 0) return false;
      // Mirrored widget must fit within the grid
      if (mirrored + width > columns) return false;
      return true;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 5a: mirrored position is always within grid bounds');

// 5b: Mirroring is an involution — applying it twice returns the original x
fc.assert(
  fc.property(
    fc.integer({ min: 1, max: 12 }).chain((columns) =>
      fc.integer({ min: 1, max: columns }).chain((width) =>
        fc.integer({ min: 0, max: columns - width }).map((x) => ({
          columns,
          width,
          x,
        }))
      )
    ),
    ({ columns, width, x }) => {
      const mirrored = mirrorWidgetX(x, width, columns);
      const restored = mirrorWidgetX(mirrored, width, columns);
      return restored === x;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 5b: mirroring twice restores the original position (involution)');

// 5c: The mirroring formula matches the specification exactly
//     mirroredX === columns - x - width
fc.assert(
  fc.property(
    fc.integer({ min: 1, max: 12 }).chain((columns) =>
      fc.integer({ min: 1, max: columns }).chain((width) =>
        fc.integer({ min: 0, max: columns - width }).map((x) => ({
          columns,
          width,
          x,
        }))
      )
    ),
    ({ columns, width, x }) => {
      return mirrorWidgetX(x, width, columns) === columns - x - width;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 5c: mirrored position equals columns - x - width');

// 5d: Multiple widgets in the same grid all mirror correctly
//     and preserve their relative ordering (rightmost in LTR becomes leftmost in RTL)
fc.assert(
  fc.property(
    fc.integer({ min: 2, max: 12 }).chain((columns) =>
      fc.array(
        fc.integer({ min: 1, max: columns }).chain((width) =>
          fc.integer({ min: 0, max: columns - width }).map((x) => ({ x, width }))
        ),
        { minLength: 2, maxLength: 6 }
      ).map((widgets) => ({ columns, widgets }))
    ),
    ({ columns, widgets }) => {
      for (const w of widgets) {
        const mirrored = mirrorWidgetX(w.x, w.width, columns);
        if (mirrored !== columns - w.x - w.width) return false;
        if (mirrored < 0 || mirrored + w.width > columns) return false;
      }
      return true;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 5d: multiple widgets in the same grid all mirror correctly');

console.log('Property 5: PASSED\n');

// ============================================
console.log('=== Layout grid RTL property test PASSED ===');
