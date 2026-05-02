// ============================================
// Bar Builders — Property-Based Tests (Property 1, bar subset)
// Feature: advanced-echarts-widgets, Task 4.2
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: npx tsx src/app/shared/widgets/echart-builders/bar-builders.pbt.ts

import * as fc from 'fast-check';
import {
  buildAnimatedRankingOptions,
  buildBoardSummaryOptions,
  buildFindingsBarOptions,
  buildMaturityProgressionOptions,
  buildValueGapBarOptions,
  buildRiskBridgeWaterfallOptions,
  buildRiskWaterfallOptions,
  buildBulletChartOptions,
  buildMonteCarloHistogramOptions,
  buildTornadoChartOptions,
} from './bar-builders';
import type {
  AnimatedRankingData,
  BoardSummaryData,
  FindingsBarData,
  MaturityProgressionData,
  ValueGapBarData,
  WaterfallData,
  BulletChartData,
  MonteCarloHistogramData,
  TornadoChartData,
} from '../builder-types';

// ============================================
// Arbitraries
// ============================================

const arbAnimatedRankingData: fc.Arbitrary<AnimatedRankingData> = fc.record({
  entities: fc.array(
    fc.record({
      name: fc.string({ minLength: 1, maxLength: 20 }),
      values: fc.array(
        fc.record({ period: fc.string({ minLength: 1, maxLength: 10 }), score: fc.nat({ max: 10000 }) }),
        { minLength: 1, maxLength: 10 },
      ),
    }),
    { minLength: 1, maxLength: 10 },
  ),
});

const arbBoardSummaryData: fc.Arbitrary<BoardSummaryData> = fc.nat({ max: 8 }).chain(n => {
  const catCount = n + 1;
  return fc.record({
    categories: fc.array(fc.string({ minLength: 1, maxLength: 15 }), { minLength: catCount, maxLength: catCount }),
    groups: fc.array(
      fc.record({
        name: fc.string({ minLength: 1, maxLength: 15 }),
        values: fc.array(fc.nat({ max: 10000 }), { minLength: catCount, maxLength: catCount }),
      }),
      { minLength: 1, maxLength: 6 },
    ),
  });
});

const arbFindingsBarData: fc.Arbitrary<FindingsBarData> = fc.nat({ max: 8 }).chain(n => {
  const catCount = n + 1;
  return fc.record({
    categories: fc.array(fc.string({ minLength: 1, maxLength: 15 }), { minLength: catCount, maxLength: catCount }),
    severities: fc.array(
      fc.record({
        name: fc.string({ minLength: 1, maxLength: 15 }),
        color: fc.option(fc.string({ minLength: 6, maxLength: 6 }).map((h: string) => `#${h}`)),
        values: fc.array(fc.nat({ max: 10000 }), { minLength: catCount, maxLength: catCount }),
      }),
      { minLength: 1, maxLength: 5 },
    ),
  });
});

const arbMaturityProgressionData: fc.Arbitrary<MaturityProgressionData> = fc.nat({ max: 8 }).chain(n => {
  const fwCount = n + 1;
  return fc.record({
    frameworks: fc.array(fc.string({ minLength: 1, maxLength: 15 }), { minLength: fwCount, maxLength: fwCount }),
    levels: fc.array(
      fc.record({
        period: fc.string({ minLength: 1, maxLength: 10 }),
        scores: fc.array(fc.nat({ max: 5 }), { minLength: fwCount, maxLength: fwCount }),
      }),
      { minLength: 1, maxLength: 6 },
    ),
  });
});

const arbValueGapBarData: fc.Arbitrary<ValueGapBarData> = fc.record({
  items: fc.array(
    fc.record({
      name: fc.string({ minLength: 1, maxLength: 20 }),
      current: fc.nat({ max: 10000 }),
      target: fc.nat({ max: 10000 }),
    }),
    { minLength: 1, maxLength: 10 },
  ),
});

const arbWaterfallData: fc.Arbitrary<WaterfallData> = fc.record({
  steps: fc.array(
    fc.record({
      name: fc.string({ minLength: 1, maxLength: 20 }),
      value: fc.integer({ min: -5000, max: 5000 }),
      isTotal: fc.option(fc.boolean()),
    }),
    { minLength: 1, maxLength: 12 },
  ),
});

const arbBulletChartData: fc.Arbitrary<BulletChartData> = fc.record({
  items: fc.array(
    fc.record({
      label: fc.string({ minLength: 1, maxLength: 20 }),
      actual: fc.nat({ max: 10000 }),
      target: fc.nat({ max: 10000 }),
      ranges: fc.array(fc.nat({ max: 10000 }), { minLength: 1, maxLength: 4 }).map(arr => arr.sort((a, b) => a - b)),
    }),
    { minLength: 1, maxLength: 8 },
  ),
});

const arbMonteCarloHistogramData: fc.Arbitrary<MonteCarloHistogramData> = fc.record({
  bins: fc.array(
    fc.record({
      min: fc.double({ min: 0, max: 1000, noNaN: true }),
      max: fc.double({ min: 0, max: 1000, noNaN: true }),
      count: fc.nat({ max: 5000 }),
    }),
    { minLength: 1, maxLength: 20 },
  ),
  percentiles: fc.array(
    fc.record({
      label: fc.string({ minLength: 1, maxLength: 10 }),
      value: fc.double({ min: 0, max: 1000, noNaN: true }),
    }),
    { minLength: 0, maxLength: 5 },
  ),
  mean: fc.double({ min: 0, max: 1000, noNaN: true }),
});

const arbTornadoChartData: fc.Arbitrary<TornadoChartData> = fc.record({
  factors: fc.array(
    fc.record({
      name: fc.string({ minLength: 1, maxLength: 20 }),
      low: fc.double({ min: -10000, max: 10000, noNaN: true }),
      high: fc.double({ min: -10000, max: 10000, noNaN: true }),
      baseline: fc.double({ min: -10000, max: 10000, noNaN: true }),
    }),
    { minLength: 1, maxLength: 10 },
  ),
});

// ============================================
// Helper: assert bar output validity
// ============================================

function assertBarOutput(label: string, result: Record<string, unknown>): boolean {
  if (result == null || typeof result !== 'object') return false;
  const opts = result as Record<string, unknown>;
  const series = opts['series'];
  if (!Array.isArray(series) || series.length === 0) return false;
  return series.some((s) => s && s.type === 'bar');
}

// ============================================
// Property 1 (bar subset): Options builder output validity
// Feature: advanced-echarts-widgets, Property 1 (bar subset)
// **Validates: Requirements 2.1–2.10**
//
// For any valid input data for each of the 10 bar builders,
// the output SHALL be a non-null object with a `series` array
// containing at least one entry with `type: 'bar'`.
// ============================================

console.log('--- Property 1 (bar subset): Options builder output validity ---');

// 2.1 buildAnimatedRankingOptions
fc.assert(
  fc.property(arbAnimatedRankingData, (data) => {
    return assertBarOutput('buildAnimatedRankingOptions', buildAnimatedRankingOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildAnimatedRankingOptions always produces bar series');

// 2.2 buildBoardSummaryOptions
fc.assert(
  fc.property(arbBoardSummaryData, (data) => {
    return assertBarOutput('buildBoardSummaryOptions', buildBoardSummaryOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildBoardSummaryOptions always produces bar series');

// 2.3 buildFindingsBarOptions
fc.assert(
  fc.property(arbFindingsBarData, (data) => {
    return assertBarOutput('buildFindingsBarOptions', buildFindingsBarOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildFindingsBarOptions always produces bar series');

// 2.4 buildMaturityProgressionOptions
fc.assert(
  fc.property(arbMaturityProgressionData, (data) => {
    return assertBarOutput('buildMaturityProgressionOptions', buildMaturityProgressionOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildMaturityProgressionOptions always produces bar series');

// 2.5 buildValueGapBarOptions
fc.assert(
  fc.property(arbValueGapBarData, (data) => {
    return assertBarOutput('buildValueGapBarOptions', buildValueGapBarOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildValueGapBarOptions always produces bar series');

// 2.6 buildRiskBridgeWaterfallOptions
fc.assert(
  fc.property(arbWaterfallData, (data) => {
    return assertBarOutput('buildRiskBridgeWaterfallOptions', buildRiskBridgeWaterfallOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildRiskBridgeWaterfallOptions always produces bar series');

// 2.7 buildRiskWaterfallOptions
fc.assert(
  fc.property(arbWaterfallData, (data) => {
    return assertBarOutput('buildRiskWaterfallOptions', buildRiskWaterfallOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildRiskWaterfallOptions always produces bar series');

// 2.8 buildBulletChartOptions
fc.assert(
  fc.property(arbBulletChartData, (data) => {
    return assertBarOutput('buildBulletChartOptions', buildBulletChartOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildBulletChartOptions always produces bar series');

// 2.9 buildMonteCarloHistogramOptions
fc.assert(
  fc.property(arbMonteCarloHistogramData, (data) => {
    return assertBarOutput('buildMonteCarloHistogramOptions', buildMonteCarloHistogramOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildMonteCarloHistogramOptions always produces bar series');

// 2.10 buildTornadoChartOptions
fc.assert(
  fc.property(arbTornadoChartData, (data) => {
    return assertBarOutput('buildTornadoChartOptions', buildTornadoChartOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildTornadoChartOptions always produces bar series');

console.log('Property 1 (bar subset): PASSED\n');

// ============================================
console.log('=== All bar-builders property tests PASSED ===');
