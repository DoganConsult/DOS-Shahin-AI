// ============================================
// Layout Grid Utils — Unit Tests
// Feature: premium-dashboard-overhaul, Task 1.2
// ============================================
//
// Tests snapToGrid, detectOverlaps, resolveOverlaps,
// collapseToSingleColumn, and clampSize pure functions.
// Run: pnpm exec tsx src/app/shared/widgets/layout-grid.utils.test.ts

import {
  snapToGrid,
  detectOverlaps,
  resolveOverlaps,
  collapseToSingleColumn,
  clampSize,
} from './layout-grid.utils';
import { GridWidget } from './layout-grid.types';

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
// clampSize
// ============================================
console.log('--- clampSize ---');

assertDeepEqual(clampSize(2, 2), { w: 2, h: 2 }, 'normal size passes through');
assertDeepEqual(clampSize(0, 0), { w: 1, h: 1 }, 'clamps below minimum to 1×1');
assertDeepEqual(clampSize(-5, -3), { w: 1, h: 1 }, 'negative values clamp to 1×1');
assertDeepEqual(clampSize(10, 10), { w: 4, h: 3 }, 'clamps above maximum to 4×3');
assertDeepEqual(clampSize(4, 3), { w: 4, h: 3 }, 'max size passes through');
assertDeepEqual(clampSize(1, 1), { w: 1, h: 1 }, 'min size passes through');
assertDeepEqual(clampSize(2.7, 1.3), { w: 3, h: 1 }, 'rounds fractional values');

console.log('clampSize: PASSED\n');

// ============================================
// snapToGrid
// ============================================
console.log('--- snapToGrid ---');

assertDeepEqual(
  snapToGrid({ x: 1, y: 1, w: 1, h: 1 }, 4, 10),
  { x: 1, y: 1, w: 1, h: 1 },
  'valid position passes through'
);

assertDeepEqual(
  snapToGrid({ x: -2, y: -3, w: 1, h: 1 }, 4, 10),
  { x: 0, y: 0, w: 1, h: 1 },
  'negative position clamps to 0,0'
);

assertDeepEqual(
  snapToGrid({ x: 10, y: 20, w: 1, h: 1 }, 4, 10),
  { x: 3, y: 9, w: 1, h: 1 },
  'position beyond grid clamps to max'
);

assertDeepEqual(
  snapToGrid({ x: 3, y: 8, w: 2, h: 3 }, 4, 10),
  { x: 2, y: 7, w: 2, h: 3 },
  'position adjusted so widget fits within grid'
);

assertDeepEqual(
  snapToGrid({ x: 0, y: 0, w: 0, h: 0 }, 4, 10),
  { x: 0, y: 0, w: 1, h: 1 },
  'zero size clamps to 1×1'
);

assertDeepEqual(
  snapToGrid({ x: 0, y: 0, w: 10, h: 10 }, 4, 10),
  { x: 0, y: 0, w: 4, h: 3 },
  'oversized widget clamps to 4×3'
);

assertDeepEqual(
  snapToGrid({ x: 1.6, y: 2.4, w: 1, h: 1 }, 4, 10),
  { x: 2, y: 2, w: 1, h: 1 },
  'fractional positions round to nearest'
);

console.log('snapToGrid: PASSED\n');

// ============================================
// detectOverlaps
// ============================================
console.log('--- detectOverlaps ---');

const widgetA: GridWidget = { id: 'a', position: { x: 0, y: 0, w: 2, h: 2 }, visible: true };
const widgetB: GridWidget = { id: 'b', position: { x: 1, y: 1, w: 2, h: 2 }, visible: true };
const widgetC: GridWidget = { id: 'c', position: { x: 3, y: 0, w: 1, h: 1 }, visible: true };

assertDeepEqual(
  detectOverlaps(widgetA, [widgetA, widgetB, widgetC]),
  ['b'],
  'detects overlap between A and B'
);

assertDeepEqual(
  detectOverlaps(widgetC, [widgetA, widgetB, widgetC]),
  [],
  'C does not overlap with A or B'
);

assertDeepEqual(
  detectOverlaps(widgetA, [widgetA]),
  [],
  'widget does not overlap with itself'
);

assertDeepEqual(
  detectOverlaps(widgetA, []),
  [],
  'empty widget list returns no overlaps'
);

// Adjacent widgets (touching but not overlapping)
const widgetD: GridWidget = { id: 'd', position: { x: 2, y: 0, w: 1, h: 1 }, visible: true };
assertDeepEqual(
  detectOverlaps(
    { id: 'e', position: { x: 0, y: 0, w: 2, h: 1 }, visible: true },
    [widgetD]
  ),
  [],
  'adjacent widgets do not overlap'
);

console.log('detectOverlaps: PASSED\n');

// ============================================
// resolveOverlaps
// ============================================
console.log('--- resolveOverlaps ---');

// Helper: check no two widgets overlap
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

// Non-overlapping widgets stay in place
{
  const widgets: GridWidget[] = [
    { id: 'a', position: { x: 0, y: 0, w: 1, h: 1 }, visible: true },
    { id: 'b', position: { x: 1, y: 0, w: 1, h: 1 }, visible: true },
  ];
  const result = resolveOverlaps(widgets, 4);
  assert(hasNoOverlaps(result), 'non-overlapping widgets remain non-overlapping');
  assert(result.length === 2, 'preserves widget count');
}

// Overlapping widgets get resolved
{
  const widgets: GridWidget[] = [
    { id: 'a', position: { x: 0, y: 0, w: 2, h: 2 }, visible: true },
    { id: 'b', position: { x: 1, y: 1, w: 2, h: 2 }, visible: true },
  ];
  const result = resolveOverlaps(widgets, 4);
  assert(hasNoOverlaps(result), 'overlapping widgets resolved to non-overlapping');
  assert(result.length === 2, 'preserves widget count after resolution');
}

// Empty array
{
  const result = resolveOverlaps([], 4);
  assert(result.length === 0, 'empty input returns empty output');
}

// Single widget
{
  const widgets: GridWidget[] = [
    { id: 'a', position: { x: 0, y: 0, w: 2, h: 2 }, visible: true },
  ];
  const result = resolveOverlaps(widgets, 4);
  assert(hasNoOverlaps(result), 'single widget has no overlaps');
  assert(result.length === 1, 'single widget preserved');
}

// Three stacked overlapping widgets
{
  const widgets: GridWidget[] = [
    { id: 'a', position: { x: 0, y: 0, w: 2, h: 2 }, visible: true },
    { id: 'b', position: { x: 0, y: 0, w: 2, h: 2 }, visible: true },
    { id: 'c', position: { x: 0, y: 0, w: 2, h: 2 }, visible: true },
  ];
  const result = resolveOverlaps(widgets, 4);
  assert(hasNoOverlaps(result), 'three stacked widgets resolved');
  assert(result.length === 3, 'all three widgets preserved');
}

console.log('resolveOverlaps: PASSED\n');

// ============================================
// collapseToSingleColumn
// ============================================
console.log('--- collapseToSingleColumn ---');

{
  const widgets: GridWidget[] = [
    { id: 'a', position: { x: 2, y: 1, w: 2, h: 2 }, visible: true },
    { id: 'b', position: { x: 0, y: 0, w: 1, h: 1 }, visible: true },
    { id: 'c', position: { x: 1, y: 0, w: 1, h: 3 }, visible: true },
  ];
  const result = collapseToSingleColumn(widgets);

  // Sorted by y,x: b(0,0), c(1,0), a(2,1)
  assert(result.length === 3, 'preserves widget count');
  assert(result.every(w => w.position.x === 0), 'all widgets at x=0');
  assert(result.every(w => w.position.w === 1), 'all widgets have w=1');

  // Check stacking: b(h=1) at y=0, c(h=3) at y=1, a(h=2) at y=4
  assertDeepEqual(result[0].position, { x: 0, y: 0, w: 1, h: 1 }, 'first widget at y=0');
  assertDeepEqual(result[1].position, { x: 0, y: 1, w: 1, h: 3 }, 'second widget stacked after first');
  assertDeepEqual(result[2].position, { x: 0, y: 4, w: 1, h: 2 }, 'third widget stacked after second');
}

{
  const result = collapseToSingleColumn([]);
  assert(result.length === 0, 'empty input returns empty output');
}

{
  const widgets: GridWidget[] = [
    { id: 'a', position: { x: 0, y: 0, w: 1, h: 1 }, visible: true },
  ];
  const result = collapseToSingleColumn(widgets);
  assertDeepEqual(result[0].position, { x: 0, y: 0, w: 1, h: 1 }, 'single widget at origin');
}

// No overlapping y-ranges in result
{
  const widgets: GridWidget[] = [
    { id: 'a', position: { x: 0, y: 0, w: 2, h: 1 }, visible: true },
    { id: 'b', position: { x: 2, y: 0, w: 2, h: 1 }, visible: true },
    { id: 'c', position: { x: 0, y: 1, w: 4, h: 2 }, visible: true },
  ];
  const result = collapseToSingleColumn(widgets);
  assert(hasNoOverlaps(result), 'collapsed widgets have no overlapping y-ranges');
}

console.log('collapseToSingleColumn: PASSED\n');

// ============================================
console.log('=== All layout-grid.utils unit tests PASSED ===');
