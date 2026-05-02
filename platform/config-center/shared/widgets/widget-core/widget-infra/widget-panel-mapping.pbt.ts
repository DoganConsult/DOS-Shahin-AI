// ============================================
// Widget Panel Mapping — Property-Based Tests (Property 8)
// Feature: premium-dashboard-overhaul, Task 5.4
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/shared/widgets/widget-panel-mapping.pbt.ts

import * as fc from 'fast-check';
import { WidgetRegistryService } from './core/services/widget-registry.service';
import { WidgetManifest } from '../core/models/widget-manifest.model';
import {
  resolveWidgetDetail,
  hasWidgetDetail,
  getAllDetailWidgetIds,
} from './widget-detail-resolver';
import { GrcRecord } from '@app/core/models/shared.types';

// ============================================
// All registered widget IDs (subset for testing)
// ============================================

const ALL_WIDGET_IDS: string[] = [
  'risk-heatmap', 'risk-summary', 'compliance-score', 'policy-scorecard',
  'audit-readiness', 'incident-tracker', 'vendor-risk', 'evidence-locker',
  'framework-coverage', 'red-team-board', 'compliance-trend', 'risk-distribution',
  'control-progress', 'framework-radar',
  'grc-time-loop', 'improvement-illusion', 'silent-controls', 'audit-dejavu',
  'risk-denial',
  'org-amnesia', 'knowledge-in-people', 'decision-trace', 'cultural-drift',
  'control-aging', 'lifecycle-bottleneck', 'zombie-controls', 'evidence-rot',
  'assessment-honesty', 'risk-gravity', 'untested-assumptions', 'false-comfort',
  'one-sentence-truth', 'future-you', 'if-nothing-changes',
  'regulator-lens', 'board-reality', 'reputation-impact',
  'root-cause-vs-patch', 'change-leverage', 'momentum-indicator',
  'year-in-grc', 'pain-mirror', 'maturity-gap', 'breaking-the-cycle',
];

// ============================================
// Helpers
// ============================================

/** Stub component classes — one per widget to ensure distinct types. */
const stubComponents = new Map<string, new () => unknown>();
for (const id of ALL_WIDGET_IDS) {
  const stub = class {} as GrcRecord;
  stub.ɵcmp = true; // Mark as Angular component for resolveWidgetDetail
  stubComponents.set(id, stub);
}

/**
 * Build a WidgetRegistryService populated with the given widget IDs
 * and unique stub component classes (manifest-based).
 */
function buildRegistry(widgetIds: string[]): WidgetRegistryService {
  const reg = new WidgetRegistryService();
  for (const id of widgetIds) {
    reg.register({
      id,
      key: id.replace(/-/g, '_'),
      title: id,
      category: 'executive',
      engine: 'angular',
      component: stubComponents.get(id) ?? (() => { const c = class {} as GrcRecord; c.ɵcmp = true; return c; })(),
      defaultSize: { cols: 4, rows: 2 },
      schemaVersion: 1,
    });
  }
  return reg;
}

// ============================================
// Setup: populate registry with all widgets
// ============================================

const registry = buildRegistry(ALL_WIDGET_IDS);

console.log(`Registry loaded with ${ALL_WIDGET_IDS.length} widgets.\n`);

// Arbitraries
const registeredIdArb: fc.Arbitrary<string> = fc.constantFrom(...ALL_WIDGET_IDS);

// ============================================
// Property 8: Slide-In Panel Widget Mapping
// ============================================

console.log('--- Property 8: Slide-In Panel Widget Mapping ---');

// 8a: resolveWidgetDetail returns non-null for any registered widget ID
fc.assert(
  fc.property(registeredIdArb, (widgetId) => {
    const detail = resolveWidgetDetail(widgetId, registry);
    return detail !== null && detail !== undefined;
  }),
  { numRuns: 100 },
);
console.log('  ✓ 8a: resolveWidgetDetail returns non-null for any registered widget ID');

// 8b: hasWidgetDetail returns true for any registered widget ID
fc.assert(
  fc.property(registeredIdArb, (widgetId) => {
    return hasWidgetDetail(widgetId, registry) === true;
  }),
  { numRuns: 100 },
);
console.log('  ✓ 8b: hasWidgetDetail returns true for any registered widget ID');

// 8c: the detail component is a constructor function (Type<any>)
fc.assert(
  fc.property(registeredIdArb, (widgetId) => {
    const detail = resolveWidgetDetail(widgetId, registry);
    return typeof detail === 'function';
  }),
  { numRuns: 100 },
);
console.log('  ✓ 8c: detail component is a constructor function for any registered widget');

// 8d: getAllDetailWidgetIds covers every registered widget ID
{
  const detailIds = getAllDetailWidgetIds(registry);
  const detailSet = new Set(detailIds);
  const missing = ALL_WIDGET_IDS.filter((id) => !detailSet.has(id));
  if (missing.length > 0) {
    throw new Error(
      `FAIL: getAllDetailWidgetIds is missing widgets: ${missing.join(', ')}`,
    );
  }
  if (detailIds.length !== ALL_WIDGET_IDS.length) {
    throw new Error(
      `FAIL: getAllDetailWidgetIds count (${detailIds.length}) != registered count (${ALL_WIDGET_IDS.length})`,
    );
  }
}
console.log('  ✓ 8d: getAllDetailWidgetIds covers every registered widget ID');

// 8e: unregistered widget IDs return null (negative property)
fc.assert(
  fc.property(
    fc.string({ minLength: 1, maxLength: 40 }).filter(
      (s) => !ALL_WIDGET_IDS.includes(s),
    ),
    (unknownId) => {
      return resolveWidgetDetail(unknownId, registry) === null;
    },
  ),
  { numRuns: 100 },
);
console.log('  ✓ 8e: unregistered widget IDs return null');

// 8f: the resolved detail component matches the widget's own component from the registry
fc.assert(
  fc.property(registeredIdArb, (widgetId) => {
    const detail = resolveWidgetDetail(widgetId, registry);
    const def = registry.get(widgetId);
    return detail === def?.component;
  }),
  { numRuns: 100 },
);
console.log('  ✓ 8f: resolved detail component matches the widget registry component');

// 8g: for any random subset of widgets, the resolver covers exactly that subset
fc.assert(
  fc.property(
    fc.subarray(ALL_WIDGET_IDS, { minLength: 1 }),
    (subset) => {
      const partialRegistry = buildRegistry(subset);
      const detailIds = getAllDetailWidgetIds(partialRegistry);
      return (
        detailIds.length === subset.length &&
        subset.every((id) => detailIds.includes(id))
      );
    },
  ),
  { numRuns: 100 },
);
console.log('  ✓ 8g: for any subset of widgets, resolver covers exactly that subset');

console.log('Property 8: PASSED\n');

// ============================================
console.log('=== All widget panel mapping property tests PASSED ===');
