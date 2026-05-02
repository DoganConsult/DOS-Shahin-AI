// ============================================
// Scatter/Heatmap/Treemap Builders — Property-Based Tests
// (Property 1 scatter/heatmap/treemap subset, Property 7)
// Feature: advanced-echarts-widgets, Task 7.2
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: npx tsx src/app/shared/widgets/echart-builders/scatter-heatmap-treemap-builders.pbt.ts

import * as fc from 'fast-check';
import {
  buildVendorBubbleOptions,
  buildVendorBubbleEnhancedOptions,
  buildRiskConstellationOptions,
  buildComplianceHeatmapCcOptions,
  buildEvidenceCalendarHeatmapOptions,
  buildRiskCorrelationMatrixOptions,
  buildRiskHeatmapOptions,
  buildRiskHeatmapEnhancedOptions,
  buildComplianceCoverageTreemapOptions,
} from './scatter-heatmap-treemap-builders';
import type {
  BubbleData,
  HeatmapData,
  CalendarHeatmapData,
  TreemapData,
  TreemapNode,
} from '../builder-types';

// ============================================
// Arbitraries
// ============================================

const arbBubbleData: fc.Arbitrary<BubbleData> = fc.record({
  items: fc.array(
    fc.record({
      name: fc.string({ minLength: 1, maxLength: 20 }),
      x: fc.double({ min: -1000, max: 1000, noNaN: true }),
      y: fc.double({ min: -1000, max: 1000, noNaN: true }),
      size: fc.double({ min: 0, max: 1000, noNaN: true }),
      category: fc.option(fc.string({ minLength: 1, maxLength: 15 })),
    }),
    { minLength: 1, maxLength: 10 },
  ),
  xLabel: fc.string({ minLength: 1, maxLength: 20 }),
  yLabel: fc.string({ minLength: 1, maxLength: 20 }),
});

const arbHeatmapData: fc.Arbitrary<HeatmapData> = fc.nat({ max: 7 }).chain(rn =>
  fc.nat({ max: 7 }).chain(cn => {
    const rowCount = rn + 1;
    const colCount = cn + 1;
    return fc.record({
      rows: fc.array(fc.string({ minLength: 1, maxLength: 15 }), { minLength: rowCount, maxLength: rowCount }),
      columns: fc.array(fc.string({ minLength: 1, maxLength: 15 }), { minLength: colCount, maxLength: colCount }),
      values: fc.array(
        fc.array(fc.nat({ max: 100 }), { minLength: colCount, maxLength: colCount }),
        { minLength: rowCount, maxLength: rowCount },
      ),
    });
  }),
);

const arbCalendarHeatmapData: fc.Arbitrary<CalendarHeatmapData> = fc.record({
  year: fc.integer({ min: 2000, max: 2030 }),
  data: fc.array(
    fc.record({
      date: fc.integer({ min: 1, max: 12 }).chain(month =>
        fc.integer({ min: 1, max: 28 }).map(day => {
          const mm = String(month).padStart(2, '0');
          const dd = String(day).padStart(2, '0');
          return `2024-${mm}-${dd}`;
        }),
      ),
      value: fc.nat({ max: 100 }),
    }),
    { minLength: 0, maxLength: 20 },
  ),
});

const arbTreemapNode: fc.Arbitrary<TreemapNode> = fc.letrec(tie => ({
  leaf: fc.record({
    name: fc.string({ minLength: 1, maxLength: 15 }),
    value: fc.option(fc.nat({ max: 1000 })),
    children: fc.constant(undefined),
  }) as fc.Arbitrary<TreemapNode>,
  node: fc.record({
    name: fc.string({ minLength: 1, maxLength: 15 }),
    value: fc.option(fc.nat({ max: 1000 })),
    children: fc.option(fc.array(tie('leaf'), { minLength: 1, maxLength: 4 })),
  }) as fc.Arbitrary<TreemapNode>,
})).node;

const arbTreemapData: fc.Arbitrary<TreemapData> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 20 }),
  children: fc.array(arbTreemapNode, { minLength: 1, maxLength: 6 }),
});

// ============================================
// Helper: assert output has series with expected type
// ============================================

function assertSeriesType(result: Record<string, unknown>, expectedType: string): boolean {
  if (result == null || typeof result !== 'object') return false;
  const opts = result as Record<string, unknown>;
  const series = opts['series'];
  if (!Array.isArray(series) || series.length === 0) return false;
  return series.some((s) => s && s.type === expectedType);
}

// ============================================
// Property 1 (scatter/heatmap/treemap subset): Options builder output validity
// Feature: advanced-echarts-widgets, Property 1 (scatter/heatmap/treemap subset)
// **Validates: Requirements 5.1–5.10**
//
// For any valid input data for each of the 9 scatter/heatmap/treemap builders,
// the output SHALL be a non-null object with a `series` array
// containing at least one entry with the correct type.
// ============================================

console.log('--- Property 1 (scatter/heatmap/treemap subset): Options builder output validity ---');

// 5.1 buildVendorBubbleOptions
fc.assert(
  fc.property(arbBubbleData, (data) => {
    return assertSeriesType(buildVendorBubbleOptions(data), 'scatter');
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildVendorBubbleOptions always produces scatter series');

// 5.2 buildVendorBubbleEnhancedOptions
fc.assert(
  fc.property(arbBubbleData, (data) => {
    return assertSeriesType(buildVendorBubbleEnhancedOptions(data), 'scatter');
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildVendorBubbleEnhancedOptions always produces scatter series');

// 5.3 buildRiskConstellationOptions
fc.assert(
  fc.property(arbBubbleData, (data) => {
    return assertSeriesType(buildRiskConstellationOptions(data), 'scatter');
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildRiskConstellationOptions always produces scatter series');

// 5.4 buildComplianceHeatmapCcOptions
fc.assert(
  fc.property(arbHeatmapData, (data) => {
    return assertSeriesType(buildComplianceHeatmapCcOptions(data), 'heatmap');
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildComplianceHeatmapCcOptions always produces heatmap series');

// 5.5 buildEvidenceCalendarHeatmapOptions
fc.assert(
  fc.property(arbCalendarHeatmapData, (data) => {
    return assertSeriesType(buildEvidenceCalendarHeatmapOptions(data), 'heatmap');
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildEvidenceCalendarHeatmapOptions always produces heatmap series');

// 5.6 buildRiskCorrelationMatrixOptions
fc.assert(
  fc.property(arbHeatmapData, (data) => {
    return assertSeriesType(buildRiskCorrelationMatrixOptions(data), 'heatmap');
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildRiskCorrelationMatrixOptions always produces heatmap series');

// 5.7 buildRiskHeatmapOptions
fc.assert(
  fc.property(arbHeatmapData, (data) => {
    return assertSeriesType(buildRiskHeatmapOptions(data), 'heatmap');
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildRiskHeatmapOptions always produces heatmap series');

// 5.8 buildRiskHeatmapEnhancedOptions
fc.assert(
  fc.property(arbHeatmapData, (data) => {
    return assertSeriesType(buildRiskHeatmapEnhancedOptions(data), 'heatmap');
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildRiskHeatmapEnhancedOptions always produces heatmap series');

// 5.9 buildComplianceCoverageTreemapOptions
fc.assert(
  fc.property(arbTreemapData, (data) => {
    return assertSeriesType(buildComplianceCoverageTreemapOptions(data), 'treemap');
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildComplianceCoverageTreemapOptions always produces treemap series');

console.log('Property 1 (scatter/heatmap/treemap subset): PASSED\n');

// ============================================
// Property 7: Heatmap cell count invariant
// Feature: advanced-echarts-widgets, Property 7
// **Validates: Requirements 5.10**
//
// For any valid HeatmapData input with R rows and C columns,
// the number of data points in the output heatmap series
// SHALL equal R × C.
// ============================================

console.log('--- Property 7: Heatmap cell count invariant ---');

function getHeatmapDataPointCount(result: Record<string, unknown>): number {
  const series = result['series'] as unknown[];
  const heatmapSeries = series.find((s) => s.type === 'heatmap');
  if (!heatmapSeries || !Array.isArray(heatmapSeries.data)) return -1;
  return heatmapSeries.data.length;
}

// 5.4 buildComplianceHeatmapCcOptions — cell count
fc.assert(
  fc.property(arbHeatmapData, (data) => {
    const result = buildComplianceHeatmapCcOptions(data) as Record<string, unknown>;
    return getHeatmapDataPointCount(result) === data.rows.length * data.columns.length;
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildComplianceHeatmapCcOptions: data points === rows × columns');

// 5.6 buildRiskCorrelationMatrixOptions — cell count
fc.assert(
  fc.property(arbHeatmapData, (data) => {
    const result = buildRiskCorrelationMatrixOptions(data) as Record<string, unknown>;
    return getHeatmapDataPointCount(result) === data.rows.length * data.columns.length;
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildRiskCorrelationMatrixOptions: data points === rows × columns');

// 5.7 buildRiskHeatmapOptions — cell count
fc.assert(
  fc.property(arbHeatmapData, (data) => {
    const result = buildRiskHeatmapOptions(data) as Record<string, unknown>;
    return getHeatmapDataPointCount(result) === data.rows.length * data.columns.length;
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildRiskHeatmapOptions: data points === rows × columns');

// 5.8 buildRiskHeatmapEnhancedOptions — cell count
fc.assert(
  fc.property(arbHeatmapData, (data) => {
    const result = buildRiskHeatmapEnhancedOptions(data) as Record<string, unknown>;
    return getHeatmapDataPointCount(result) === data.rows.length * data.columns.length;
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildRiskHeatmapEnhancedOptions: data points === rows × columns');

console.log('Property 7: PASSED\n');

// ============================================
console.log('=== All scatter-heatmap-treemap-builders property tests PASSED ===');
