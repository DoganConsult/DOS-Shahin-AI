// ============================================
// Dashboard Widget Filtering by Role Profile — Property-Based Tests (Property 5)
// Feature: grc-frontend-integration, Property 5: Dashboard widgets filtered by role profile
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: npx tsx src/app/shared/widgets/widget-profile-filter.pbt.ts

import * as fc from 'fast-check';
import { filterWidgetsByProfile } from './role-widget-map';

// ============================================
// Constants & Arbitraries
// ============================================

const ALL_WIDGET_IDS = [
  'risk-heatmap', 'risk-summary', 'compliance-score', 'policy-scorecard',
  'audit-readiness', 'incident-tracker', 'vendor-risk', 'evidence-locker',
  'framework-coverage', 'red-team-board', 'compliance-trend', 'risk-distribution',
  'control-progress', 'framework-radar'
];

/** Arbitrary for a non-empty subset of all widget IDs (simulates registered widgets). */
const widgetIdsArb = fc.subarray(ALL_WIDGET_IDS, { minLength: 1 });

/** Arbitrary for a profile's defaultWidgets list (subset of known widget IDs). */
const profileWidgetsArb = fc.subarray(ALL_WIDGET_IDS, { minLength: 1 });

// ============================================
// Property 5: Dashboard widgets filtered by role profile
// **Validates: Requirements 6.1**
//
// For any role profile with a defaultWidgets list, the dashboard renders
// only widgets whose IDs are in that list. No widget outside the list
// is rendered. When no profile is assigned, fall back to default widget set.
// ============================================

console.log('--- Property 5: Dashboard widgets filtered by role profile ---');

// 5a: When profile has defaultWidgets, only those widgets are returned (intersection with allWidgetIds)
fc.assert(
  fc.property(profileWidgetsArb, widgetIdsArb, (profileWidgets, allWidgetIds) => {
    const result = filterWidgetsByProfile(profileWidgets, allWidgetIds);
    // Every returned widget must be in both the profile list AND the allWidgetIds list
    return result.every(id => profileWidgets.includes(id) && allWidgetIds.includes(id));
  }),
  { numRuns: 100 }
);
console.log('  ✓ 5a: returned widgets are in both profile list and allWidgetIds');

// 5b: No widget outside the profile list is rendered
fc.assert(
  fc.property(profileWidgetsArb, widgetIdsArb, (profileWidgets, allWidgetIds) => {
    const result = filterWidgetsByProfile(profileWidgets, allWidgetIds);
    // No widget in the result should be absent from the profile's defaultWidgets
    return result.every(id => profileWidgets.includes(id));
  }),
  { numRuns: 100 }
);
console.log('  ✓ 5b: no widget outside the profile list is rendered');

// 5c: When profileWidgets is null, fall back to full allWidgetIds (default widget set)
fc.assert(
  fc.property(widgetIdsArb, (allWidgetIds) => {
    const result = filterWidgetsByProfile(null, allWidgetIds);
    return result.length === allWidgetIds.length &&
           result.every((id, i) => id === allWidgetIds[i]);
  }),
  { numRuns: 100 }
);
console.log('  ✓ 5c: null profileWidgets falls back to full allWidgetIds');

// 5d: When profileWidgets is undefined, fall back to full allWidgetIds
fc.assert(
  fc.property(widgetIdsArb, (allWidgetIds) => {
    const result = filterWidgetsByProfile(undefined, allWidgetIds);
    return result.length === allWidgetIds.length &&
           result.every((id, i) => id === allWidgetIds[i]);
  }),
  { numRuns: 100 }
);
console.log('  ✓ 5d: undefined profileWidgets falls back to full allWidgetIds');

// 5e: When profileWidgets is empty array, fall back to full allWidgetIds
fc.assert(
  fc.property(widgetIdsArb, (allWidgetIds) => {
    const result = filterWidgetsByProfile([], allWidgetIds);
    return result.length === allWidgetIds.length &&
           result.every((id, i) => id === allWidgetIds[i]);
  }),
  { numRuns: 100 }
);
console.log('  ✓ 5e: empty profileWidgets falls back to full allWidgetIds');

// 5f: Result is always a subset of allWidgetIds
fc.assert(
  fc.property(
    fc.oneof(fc.constant(null), fc.constant(undefined), fc.constant([]), profileWidgetsArb),
    widgetIdsArb,
    (profileWidgets, allWidgetIds) => {
      const result = filterWidgetsByProfile(profileWidgets as unknown, allWidgetIds);
      return result.every(id => allWidgetIds.includes(id));
    }
  ),
  { numRuns: 100 }
);
console.log('  ✓ 5f: result is always a subset of allWidgetIds');

// 5g: When profile widgets are a subset of allWidgetIds, all profile widgets appear in result
fc.assert(
  fc.property(widgetIdsArb, (allWidgetIds) => {
    // Pick a subset of allWidgetIds as profile widgets
    const profileWidgets = allWidgetIds.slice(0, Math.max(1, Math.floor(allWidgetIds.length / 2)));
    const result = filterWidgetsByProfile(profileWidgets, allWidgetIds);
    return profileWidgets.every(id => result.includes(id));
  }),
  { numRuns: 100 }
);
console.log('  ✓ 5g: when profile widgets are a subset of allWidgetIds, all appear in result');

// 5h: Profile widgets not in allWidgetIds are excluded from result
fc.assert(
  fc.property(widgetIdsArb, (allWidgetIds) => {
    const profileWidgets = [...allWidgetIds.slice(0, 2), 'nonexistent-widget-xyz'];
    const result = filterWidgetsByProfile(profileWidgets, allWidgetIds);
    return !result.includes('nonexistent-widget-xyz');
  }),
  { numRuns: 100 }
);
console.log('  ✓ 5h: profile widgets not in allWidgetIds are excluded from result');

// 5i: Result preserves the order from allWidgetIds
fc.assert(
  fc.property(profileWidgetsArb, (profileWidgets) => {
    const result = filterWidgetsByProfile(profileWidgets, ALL_WIDGET_IDS);
    // Check that the order of result follows the order in ALL_WIDGET_IDS
    for (let i = 1; i < result.length; i++) {
      const prevIdx = ALL_WIDGET_IDS.indexOf(result[i - 1]);
      const currIdx = ALL_WIDGET_IDS.indexOf(result[i]);
      if (prevIdx >= currIdx) return false;
    }
    return true;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 5i: result preserves the order from allWidgetIds');

console.log('Property 5: PASSED\n');

console.log('=== All widget profile filtering property tests PASSED ===');
