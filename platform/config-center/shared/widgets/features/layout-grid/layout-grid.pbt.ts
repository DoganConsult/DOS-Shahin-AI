// ============================================
// Grid Layout Functions — Property-Based Tests (Properties 1–4)
// Feature: premium-dashboard-overhaul, Task 1.3
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/shared/widgets/layout-grid.pbt.ts

import * as fc from 'fast-check';
import {
  snapToGrid,
  resolveOverlaps,
  collapseToSingleColumn,
  clampSize,
} from './layout-grid.utils';
import { GridWidget } from './layout-grid.types';

// ============================================
// Arbitraries
// ============================================

/** Arbitrary for a raw position with potentially out-of-bounds values. */
const rawPositionArb = fc.record({
  x: fc.double({ min: -100, max: 200, noNaN: true, noDefaultInfinity: true }),
  y: fc.double({ min: -100, max: 200, noNaN: true, noDefaultInfinity: true }),
  w: fc.double({ min: -10, max: 20, noNaN: true, noDefaultInfinity: true }),
  h: fc.double({ min: -10, max: 20, noNaN: true, noDefaultInfinity: true }),
});

/**
 * Arbitrary for grid dimensions.
 * columns >= 4 and maxRows >= 3 so the grid can always fit the max clamped size (4×3).
 */
const columnsArb = fc.integer({ min: 4, max: 20 });
const maxRowsArb = fc.integer({ min: 3, max: 50 });

/** Arbitrary for a valid GridPosition (already within reasonable bounds). */
const validPositionArb = (columns: number, maxRows: number) =>
  fc.record({
    x: fc.integer({ min: 0, max: Math.max(0, columns - 1) }),
    y: fc.integer({ min: 0, max: Math.max(0, maxRows - 1) }),
    w: fc.integer({ min: 1, max: Math.min(4, columns) }),
    h: fc.integer({ min: 1, max: Math.min(3, maxRows) }),
  });

/** Arbitrary for a GridWidget with a unique id and arbitrary position. */
let widgetCounter = 0;
const gridWidgetArb = (columns: number, maxRows: number): fc.Arbitrary<GridWidget> =>
  validPositionArb(columns, maxRows).map((pos) => ({
    id: `w-${widgetCounter++}`,
    position: pos,
    visible: true,
  }));

/** Arbitrary for a list of GridWidgets with unique IDs. */
const gridWidgetsArb = (columns: number, maxRows: number) =>
  fc.array(validPositionArb(columns, maxRows), { minLength: 0, maxLength: 15 }).map((positions) =>
    positions.map((pos, i) => ({
      id: `widget-${i}`,
      position: pos,
      visible: true,
    }))
  );

/** Arbitrary for raw widget size (potentially out of bounds). */
const rawSizeArb = fc.record({
  w: fc.double({ min: -10, max: 20, noNaN: true, noDefaultInfinity: true }),
  h: fc.double({ min: -10, max: 20, noNaN: true, noDefaultInfinity: true }),
});

// ============================================
// Helper: check no two widgets overlap
// ============================================
function hasNoOverlaps(widgets: GridWidget[]): boolean {
  for (let i = 0; i < widgets.length; i++) {
    for (let j = i + 1; j < widgets.length; j++) {
      const a = widgets[i].position;
      const b = widgets[j].position;
      if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) {
        return false;
      }
    }
  }
  return true;
}


// ============================================
// Property 1: Grid Snap Bounds
// Feature: premium-dashboard-overhaul, Property 1: Grid Snap Bounds
// **Validates: Requirements 1.1**
//
// For any widget position (x, y, w, h) and any grid dimensions
// (columns, maxRows), snapToGrid SHALL return a position where
// 0 <= x <= columns - w, 0 <= y <= maxRows - h, w >= 1, and h >= 1.
// ============================================

console.log('--- Property 1: Grid Snap Bounds ---');

// 1a: x is within [0, columns - w]
fc.assert(
  fc.property(rawPositionArb, columnsArb, maxRowsArb, (pos, columns, maxRows) => {
    const result = snapToGrid(pos, columns, maxRows);
    return result.x >= 0 && result.x <= columns - result.w;
  }),
  { numRuns: 200 }
);
console.log('  ✓ 1a: x is within [0, columns - w]');

// 1b: y is within [0, maxRows - h]
fc.assert(
  fc.property(rawPositionArb, columnsArb, maxRowsArb, (pos, columns, maxRows) => {
    const result = snapToGrid(pos, columns, maxRows);
    return result.y >= 0 && result.y <= maxRows - result.h;
  }),
  { numRuns: 200 }
);
console.log('  ✓ 1b: y is within [0, maxRows - h]');

// 1c: w >= 1 and h >= 1
fc.assert(
  fc.property(rawPositionArb, columnsArb, maxRowsArb, (pos, columns, maxRows) => {
    const result = snapToGrid(pos, columns, maxRows);
    return result.w >= 1 && result.h >= 1;
  }),
  { numRuns: 200 }
);
console.log('  ✓ 1c: w >= 1 and h >= 1');

// 1d: w <= 4 and h <= 3 (max size constraint)
fc.assert(
  fc.property(rawPositionArb, columnsArb, maxRowsArb, (pos, columns, maxRows) => {
    const result = snapToGrid(pos, columns, maxRows);
    return result.w <= 4 && result.h <= 3;
  }),
  { numRuns: 200 }
);
console.log('  ✓ 1d: w <= 4 and h <= 3');

// 1e: result values are integers (grid snapping)
fc.assert(
  fc.property(rawPositionArb, columnsArb, maxRowsArb, (pos, columns, maxRows) => {
    const result = snapToGrid(pos, columns, maxRows);
    return Number.isInteger(result.x) && Number.isInteger(result.y) &&
           Number.isInteger(result.w) && Number.isInteger(result.h);
  }),
  { numRuns: 200 }
);
console.log('  ✓ 1e: all result values are integers');

console.log('Property 1: PASSED\n');

// ============================================
// Property 2: Overlap Resolution Invariant
// Feature: premium-dashboard-overhaul, Property 2: Overlap Resolution Invariant
// **Validates: Requirements 1.2, 1.3, 2.3**
//
// For any set of widgets with arbitrary positions on a grid,
// resolveOverlaps SHALL return a new set of widgets where no two
// widgets share any grid cell.
// ============================================

console.log('--- Property 2: Overlap Resolution Invariant ---');

// 2a: no two widgets overlap in the result
fc.assert(
  fc.property(
    fc.integer({ min: 1, max: 12 }),
    fc.array(
      fc.record({
        x: fc.integer({ min: 0, max: 11 }),
        y: fc.integer({ min: 0, max: 29 }),
        w: fc.integer({ min: 1, max: 4 }),
        h: fc.integer({ min: 1, max: 3 }),
      }),
      { minLength: 0, maxLength: 12 }
    ),
    (columns, positions) => {
      const widgets: GridWidget[] = positions.map((pos, i) => ({
        id: `w-${i}`,
        position: pos,
        visible: true,
      }));
      const result = resolveOverlaps(widgets, columns);
      return hasNoOverlaps(result);
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 2a: no two widgets overlap in the result');

// 2b: widget count is preserved
fc.assert(
  fc.property(
    fc.integer({ min: 1, max: 12 }),
    fc.array(
      fc.record({
        x: fc.integer({ min: 0, max: 11 }),
        y: fc.integer({ min: 0, max: 29 }),
        w: fc.integer({ min: 1, max: 4 }),
        h: fc.integer({ min: 1, max: 3 }),
      }),
      { minLength: 0, maxLength: 12 }
    ),
    (columns, positions) => {
      const widgets: GridWidget[] = positions.map((pos, i) => ({
        id: `w-${i}`,
        position: pos,
        visible: true,
      }));
      const result = resolveOverlaps(widgets, columns);
      return result.length === widgets.length;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 2b: widget count is preserved');

// 2c: widget IDs are preserved
fc.assert(
  fc.property(
    fc.integer({ min: 1, max: 12 }),
    fc.array(
      fc.record({
        x: fc.integer({ min: 0, max: 11 }),
        y: fc.integer({ min: 0, max: 29 }),
        w: fc.integer({ min: 1, max: 4 }),
        h: fc.integer({ min: 1, max: 3 }),
      }),
      { minLength: 0, maxLength: 12 }
    ),
    (columns, positions) => {
      const widgets: GridWidget[] = positions.map((pos, i) => ({
        id: `w-${i}`,
        position: pos,
        visible: true,
      }));
      const result = resolveOverlaps(widgets, columns);
      const inputIds = new Set(widgets.map((w) => w.id));
      const outputIds = new Set(result.map((w) => w.id));
      return inputIds.size === outputIds.size &&
        [...inputIds].every((id) => outputIds.has(id));
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 2c: widget IDs are preserved');

// 2d: empty input returns empty output
fc.assert(
  fc.property(columnsArb, (columns) => {
    const result = resolveOverlaps([], columns);
    return result.length === 0;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 2d: empty input returns empty output');

console.log('Property 2: PASSED\n');


// ============================================
// Property 3: Single-Column Collapse
// Feature: premium-dashboard-overhaul, Property 3: Single-Column Collapse
// **Validates: Requirements 1.4**
//
// For any set of widgets, collapseToSingleColumn SHALL return widgets
// where every widget has x = 0 and w = 1, and no two widgets have
// overlapping y-ranges. The total number of widgets is preserved.
// ============================================

console.log('--- Property 3: Single-Column Collapse ---');

// 3a: every widget has x = 0
fc.assert(
  fc.property(
    fc.array(
      fc.record({
        x: fc.integer({ min: 0, max: 10 }),
        y: fc.integer({ min: 0, max: 20 }),
        w: fc.integer({ min: 1, max: 4 }),
        h: fc.integer({ min: 1, max: 3 }),
      }),
      { minLength: 0, maxLength: 15 }
    ),
    (positions) => {
      const widgets: GridWidget[] = positions.map((pos, i) => ({
        id: `w-${i}`,
        position: pos,
        visible: true,
      }));
      const result = collapseToSingleColumn(widgets);
      return result.every((w) => w.position.x === 0);
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 3a: every widget has x = 0');

// 3b: every widget has w = 1
fc.assert(
  fc.property(
    fc.array(
      fc.record({
        x: fc.integer({ min: 0, max: 10 }),
        y: fc.integer({ min: 0, max: 20 }),
        w: fc.integer({ min: 1, max: 4 }),
        h: fc.integer({ min: 1, max: 3 }),
      }),
      { minLength: 0, maxLength: 15 }
    ),
    (positions) => {
      const widgets: GridWidget[] = positions.map((pos, i) => ({
        id: `w-${i}`,
        position: pos,
        visible: true,
      }));
      const result = collapseToSingleColumn(widgets);
      return result.every((w) => w.position.w === 1);
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 3b: every widget has w = 1');

// 3c: no two widgets have overlapping y-ranges
fc.assert(
  fc.property(
    fc.array(
      fc.record({
        x: fc.integer({ min: 0, max: 10 }),
        y: fc.integer({ min: 0, max: 20 }),
        w: fc.integer({ min: 1, max: 4 }),
        h: fc.integer({ min: 1, max: 3 }),
      }),
      { minLength: 0, maxLength: 15 }
    ),
    (positions) => {
      const widgets: GridWidget[] = positions.map((pos, i) => ({
        id: `w-${i}`,
        position: pos,
        visible: true,
      }));
      const result = collapseToSingleColumn(widgets);
      return hasNoOverlaps(result);
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 3c: no two widgets have overlapping y-ranges');

// 3d: total number of widgets is preserved
fc.assert(
  fc.property(
    fc.array(
      fc.record({
        x: fc.integer({ min: 0, max: 10 }),
        y: fc.integer({ min: 0, max: 20 }),
        w: fc.integer({ min: 1, max: 4 }),
        h: fc.integer({ min: 1, max: 3 }),
      }),
      { minLength: 0, maxLength: 15 }
    ),
    (positions) => {
      const widgets: GridWidget[] = positions.map((pos, i) => ({
        id: `w-${i}`,
        position: pos,
        visible: true,
      }));
      const result = collapseToSingleColumn(widgets);
      return result.length === widgets.length;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 3d: total number of widgets is preserved');

// 3e: widget heights are preserved
fc.assert(
  fc.property(
    fc.array(
      fc.record({
        x: fc.integer({ min: 0, max: 10 }),
        y: fc.integer({ min: 0, max: 20 }),
        w: fc.integer({ min: 1, max: 4 }),
        h: fc.integer({ min: 1, max: 3 }),
      }),
      { minLength: 1, maxLength: 15 }
    ),
    (positions) => {
      const widgets: GridWidget[] = positions.map((pos, i) => ({
        id: `w-${i}`,
        position: pos,
        visible: true,
      }));
      const result = collapseToSingleColumn(widgets);
      // Heights should be preserved (same set of heights)
      const inputHeights = widgets.map((w) => w.position.h).sort();
      const outputHeights = result.map((w) => w.position.h).sort();
      return JSON.stringify(inputHeights) === JSON.stringify(outputHeights);
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 3e: widget heights are preserved');

console.log('Property 3: PASSED\n');

// ============================================
// Property 4: Resize Clamping
// Feature: premium-dashboard-overhaul, Property 4: Resize Clamping
// **Validates: Requirements 2.1**
//
// For any requested widget size (w, h), the clamped result SHALL
// satisfy 1 <= w <= 4 and 1 <= h <= 3.
// ============================================

console.log('--- Property 4: Resize Clamping ---');

// 4a: w is within [1, 4]
fc.assert(
  fc.property(rawSizeArb, ({ w, h }) => {
    const result = clampSize(w, h);
    return result.w >= 1 && result.w <= 4;
  }),
  { numRuns: 200 }
);
console.log('  ✓ 4a: w is within [1, 4]');

// 4b: h is within [1, 3]
fc.assert(
  fc.property(rawSizeArb, ({ w, h }) => {
    const result = clampSize(w, h);
    return result.h >= 1 && result.h <= 3;
  }),
  { numRuns: 200 }
);
console.log('  ✓ 4b: h is within [1, 3]');

// 4c: result values are integers
fc.assert(
  fc.property(rawSizeArb, ({ w, h }) => {
    const result = clampSize(w, h);
    return Number.isInteger(result.w) && Number.isInteger(result.h);
  }),
  { numRuns: 200 }
);
console.log('  ✓ 4c: result values are integers');

// 4d: values already in range pass through (after rounding)
fc.assert(
  fc.property(
    fc.integer({ min: 1, max: 4 }),
    fc.integer({ min: 1, max: 3 }),
    (w, h) => {
      const result = clampSize(w, h);
      return result.w === w && result.h === h;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 4d: values already in range pass through unchanged');

// 4e: extreme values are clamped correctly
fc.assert(
  fc.property(
    fc.double({ min: -1000, max: -1, noNaN: true, noDefaultInfinity: true }),
    fc.double({ min: -1000, max: -1, noNaN: true, noDefaultInfinity: true }),
    (w, h) => {
      const result = clampSize(w, h);
      return result.w === 1 && result.h === 1;
    }
  ),
  { numRuns: 100 }
);
console.log('  ✓ 4e: negative values clamp to minimum (1×1)');

fc.assert(
  fc.property(
    fc.double({ min: 5, max: 1000, noNaN: true, noDefaultInfinity: true }),
    fc.double({ min: 4, max: 1000, noNaN: true, noDefaultInfinity: true }),
    (w, h) => {
      const result = clampSize(w, h);
      return result.w === 4 && result.h === 3;
    }
  ),
  { numRuns: 100 }
);
console.log('  ✓ 4f: large values clamp to maximum (4×3)');

console.log('Property 4: PASSED\n');

// ============================================
console.log('=== All grid layout property tests PASSED ===');
