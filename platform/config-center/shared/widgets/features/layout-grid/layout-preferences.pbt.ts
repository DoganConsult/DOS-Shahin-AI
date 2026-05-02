// ============================================
// Layout Preferences Round-Trip — Property-Based Test (Property 5)
// Feature: premium-dashboard-overhaul, Task 2.2
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/shared/widgets/layout-preferences.pbt.ts

import * as fc from 'fast-check';
import {
  serializeLayoutPreferences,
  deserializeLayoutPreferences,
} from './layout-preferences.utils';
import { LayoutPreferences, GridWidget } from './layout-grid.types';

// ============================================
// Arbitraries
// ============================================

/** Arbitrary for a valid GridPosition within typical grid bounds. */
const gridPositionArb = fc.record({
  x: fc.integer({ min: 0, max: 11 }),
  y: fc.integer({ min: 0, max: 29 }),
  w: fc.integer({ min: 1, max: 4 }),
  h: fc.integer({ min: 1, max: 3 }),
});

/** Arbitrary for a display mode. */
const displayModeArb = fc.constantFrom('compact' as const, 'expanded' as const);

/** Arbitrary for a GridWidget with a unique id, random position, and visibility. */
const gridWidgetArb = (index: number): fc.Arbitrary<GridWidget> =>
  fc.record({
    id: fc.constant(`widget-${index}`),
    position: gridPositionArb,
    visible: fc.boolean(),
  });

/** Arbitrary for a list of GridWidgets with unique IDs. */
const gridWidgetsArb = fc
  .integer({ min: 0, max: 20 })
  .chain((count) =>
    fc.tuple(...Array.from({ length: count }, (_, i) => gridWidgetArb(i)))
  );

/** Arbitrary for a valid LayoutPreferences object. */
const layoutPreferencesArb: fc.Arbitrary<LayoutPreferences> = fc
  .integer({ min: 0, max: 20 })
  .chain((count) =>
    fc.record({
      widgets: fc.tuple(
        ...Array.from({ length: count }, (_, i) => gridWidgetArb(i))
      ),
      displayMode: displayModeArb,
      version: fc.integer({ min: 1, max: 10 }),
    })
  )
  .map((rec) => ({
    widgets: rec.widgets as unknown as GridWidget[],
    displayMode: rec.displayMode,
    version: rec.version,
  }));

// ============================================
// Property 5: Layout Preferences Round-Trip
// Feature: premium-dashboard-overhaul, Property 5: Layout Preferences Round-Trip
// **Validates: Requirements 3.2, 3.4, 3.5**
//
// For any valid LayoutPreferences object,
// deserializeLayoutPreferences(serializeLayoutPreferences(prefs))
// SHALL produce an object equivalent to the original, preserving
// all widget IDs, positions, sizes, visibility flags, and display mode.
// ============================================

console.log('--- Property 5: Layout Preferences Round-Trip ---');

// 5a: round-trip preserves displayMode
fc.assert(
  fc.property(layoutPreferencesArb, (prefs) => {
    const result = deserializeLayoutPreferences(serializeLayoutPreferences(prefs));
    return result.displayMode === prefs.displayMode;
  }),
  { numRuns: 200 }
);
console.log('  ✓ 5a: round-trip preserves displayMode');

// 5b: round-trip preserves version
fc.assert(
  fc.property(layoutPreferencesArb, (prefs) => {
    const result = deserializeLayoutPreferences(serializeLayoutPreferences(prefs));
    return result.version === prefs.version;
  }),
  { numRuns: 200 }
);
console.log('  ✓ 5b: round-trip preserves version');

// 5c: round-trip preserves widget count
fc.assert(
  fc.property(layoutPreferencesArb, (prefs) => {
    const result = deserializeLayoutPreferences(serializeLayoutPreferences(prefs));
    return result.widgets.length === prefs.widgets.length;
  }),
  { numRuns: 200 }
);
console.log('  ✓ 5c: round-trip preserves widget count');

// 5d: round-trip preserves all widget IDs
fc.assert(
  fc.property(layoutPreferencesArb, (prefs) => {
    const result = deserializeLayoutPreferences(serializeLayoutPreferences(prefs));
    return prefs.widgets.every((w, i) => result.widgets[i].id === w.id);
  }),
  { numRuns: 200 }
);
console.log('  ✓ 5d: round-trip preserves all widget IDs');

// 5e: round-trip preserves all widget positions (x, y, w, h)
fc.assert(
  fc.property(layoutPreferencesArb, (prefs) => {
    const result = deserializeLayoutPreferences(serializeLayoutPreferences(prefs));
    return prefs.widgets.every((w, i) => {
      const r = result.widgets[i];
      return (
        r.position.x === w.position.x &&
        r.position.y === w.position.y &&
        r.position.w === w.position.w &&
        r.position.h === w.position.h
      );
    });
  }),
  { numRuns: 200 }
);
console.log('  ✓ 5e: round-trip preserves all widget positions (x, y, w, h)');

// 5f: round-trip preserves all widget visibility flags
fc.assert(
  fc.property(layoutPreferencesArb, (prefs) => {
    const result = deserializeLayoutPreferences(serializeLayoutPreferences(prefs));
    return prefs.widgets.every((w, i) => result.widgets[i].visible === w.visible);
  }),
  { numRuns: 200 }
);
console.log('  ✓ 5f: round-trip preserves all widget visibility flags');

// 5g: full deep equality of the round-tripped object
fc.assert(
  fc.property(layoutPreferencesArb, (prefs) => {
    const result = deserializeLayoutPreferences(serializeLayoutPreferences(prefs));
    return JSON.stringify(result) === JSON.stringify(prefs);
  }),
  { numRuns: 200 }
);
console.log('  ✓ 5g: full deep equality of the round-tripped object');

console.log('Property 5: PASSED\n');

// ============================================
console.log('=== All layout preferences property tests PASSED ===');
