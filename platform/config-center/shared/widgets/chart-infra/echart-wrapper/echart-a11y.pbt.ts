// ============================================
// ECharts Accessibility — Property-Based Tests (Property 21)
// Feature: advanced-echarts-widgets, Task 2.6
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/shared/widgets/echart-wrapper/echart-a11y.pbt.ts

import * as fc from 'fast-check';
import { generateAriaLabel, getChartTypeName } from './echart-a11y';

// ============================================
// Constants & Arbitraries
// ============================================

/** Known chart type keys from the CHART_TYPE_NAMES lookup. */
const KNOWN_CHART_TYPES = [
  'bar', 'line', 'pie', 'scatter', 'heatmap', 'radar', 'gauge',
  'sankey', 'graph', 'funnel', 'treemap', 'boxplot', 'parallel',
  'themeRiver', 'custom', 'globe', 'donut', 'bubble', 'waterfall',
  'bullet', 'tornado', 'histogram', 'sparkline', 'gantt', 'swimlane',
  'bowtie',
];

/** Arbitrary for a known chart type string. */
const knownChartTypeArb = fc.constantFrom(...KNOWN_CHART_TYPES);

/** Arbitrary for an arbitrary non-empty chart type string (may be any). */
const anyChartTypeArb = fc.oneof(
  knownChartTypeArb,
  fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
);

/** Arbitrary for a simple data object with segments (donut-like). */
const segmentsDataArb = fc.record({
  segments: fc.array(
    fc.record({ name: fc.string({ minLength: 1 }), value: fc.nat({ max: 10000 }) }),
    { minLength: 1, maxLength: 10 },
  ),
});

/** Arbitrary for a data object with series (line/bar-like). */
const seriesDataArb = fc.record({
  series: fc.array(
    fc.record({
      name: fc.string({ minLength: 1 }),
      data: fc.array(fc.nat({ max: 1000 }), { minLength: 1, maxLength: 20 }),
    }),
    { minLength: 1, maxLength: 5 },
  ),
});

/** Arbitrary for a data object with items (bubble/bullet-like). */
const itemsDataArb = fc.record({
  items: fc.array(
    fc.record({ name: fc.string({ minLength: 1 }), x: fc.nat(), y: fc.nat(), size: fc.nat() }),
    { minLength: 1, maxLength: 10 },
  ),
});

/** Arbitrary for a data object with a single gauge value. */
const gaugeDataArb = fc.record({
  value: fc.integer({ min: 0, max: 100 }),
  min: fc.constant(0),
  max: fc.constant(100),
  zones: fc.constant([]),
});

/** Arbitrary for null / undefined / empty object data. */
const emptyDataArb = fc.constantFrom(null, undefined, {});

/** Combined arbitrary for any valid data shape. */
const anyDataArb = fc.oneof(
  segmentsDataArb,
  seriesDataArb,
  itemsDataArb,
  gaugeDataArb,
  emptyDataArb,
);

// ============================================
// Property 21: Aria-label generation
// Feature: advanced-echarts-widgets, Property 21
// **Validates: Requirements 17.2**
//
// For any chart type string and any valid data object,
// generateAriaLabel(chartType, data) SHALL return a non-empty
// string that contains the chart type display name
// (from getChartTypeName).
// ============================================

console.log('--- Property 21: Aria-label generation ---');

// 21a: aria-label is always a non-empty string for any chart type and data
fc.assert(
  fc.property(anyChartTypeArb, anyDataArb, (chartType, data) => {
    const label = generateAriaLabel(chartType, data);
    return typeof label === 'string' && label.length > 0;
  }),
  { numRuns: 200 },
);
console.log('  ✓ 21a: aria-label is always a non-empty string');

// 21b: aria-label contains the chart type display name
fc.assert(
  fc.property(anyChartTypeArb, anyDataArb, (chartType, data) => {
    const label = generateAriaLabel(chartType, data);
    const expectedName = getChartTypeName(chartType);
    return label.includes(expectedName);
  }),
  { numRuns: 200 },
);
console.log('  ✓ 21b: aria-label contains the chart type display name');

// 21c: for known chart types, the display name is always present regardless of data shape
fc.assert(
  fc.property(knownChartTypeArb, anyDataArb, (chartType, data) => {
    const label = generateAriaLabel(chartType, data);
    const expectedName = getChartTypeName(chartType);
    return label.includes(expectedName) && label.length > 0;
  }),
  { numRuns: 200 },
);
console.log('  ✓ 21c: known chart types always produce label containing their display name');

// 21d: aria-label starts with the chart type display name
fc.assert(
  fc.property(anyChartTypeArb, anyDataArb, (chartType, data) => {
    const label = generateAriaLabel(chartType, data);
    const expectedName = getChartTypeName(chartType);
    return label.startsWith(expectedName);
  }),
  { numRuns: 200 },
);
console.log('  ✓ 21d: aria-label starts with the chart type display name');

console.log('Property 21: PASSED\n');

// ============================================
console.log('=== All echart-a11y property tests PASSED ===');
