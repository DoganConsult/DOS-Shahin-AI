// ============================================
// Bar Builders — Property-Based Tests (Property 2, bar subset)
// Feature: advanced-echarts-widgets, Task 4.3
// ============================================
//
// Property 2 (bar subset): Non-custom builder JSON round-trip
// **Validates: Requirements 2.11**
//
// For all 10 bar builder functions and any valid input data,
// `JSON.parse(JSON.stringify(builder(data)))` SHALL produce an object
// that is deep-equal to the original `builder(data)` output — after
// stripping function values (e.g. tooltip.formatter, label.formatter)
// which are lost during JSON serialisation.
//
// Standalone PBT file — no test runner required.
// Run: npx tsx src/app/shared/widgets/echart-builders/bar-builders-roundtrip.pbt.ts

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
// Arbitraries (copied from bar-builders.pbt.ts)
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
// Helper: strip all function values from an object tree
// ============================================

function stripFunctions(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'function') return undefined;
  if (Array.isArray(obj)) return obj.map(stripFunctions);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (typeof value !== 'function') {
        result[key] = stripFunctions(value);
      }
    }
    return result;
  }
  return obj;
}

// ============================================
// Helper: deep-equal comparison
// ============================================

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (a === undefined || b === undefined) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return a === b;

  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, (b as unknown[])[i]));
  }

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj).sort();
  const bKeys = Object.keys(bObj).sort();
  if (aKeys.length !== bKeys.length) return false;
  if (!aKeys.every((k, i) => k === bKeys[i])) return false;
  return aKeys.every(k => deepEqual(aObj[k], bObj[k]));
}

// ============================================
// Helper: assert JSON round-trip for non-function parts
// ============================================

function assertJsonRoundTrip(builderName: string, result: Record<string, unknown>): boolean {
  const stripped = stripFunctions(result);
  const roundTripped = JSON.parse(JSON.stringify(stripped));
  const equal = deepEqual(stripped, roundTripped);
  if (!equal) {
    console.error(`Round-trip failed for ${builderName}`);
    console.error('  stripped:', JSON.stringify(stripped, null, 2).slice(0, 500));
    console.error('  roundTripped:', JSON.stringify(roundTripped, null, 2).slice(0, 500));
  }
  return equal;
}

// ============================================
// Property 2 (bar subset): Non-custom builder JSON round-trip
// Feature: advanced-echarts-widgets, Property 2 (bar subset)
// **Validates: Requirements 2.11**
//
// For all 10 bar builder functions and any valid input data,
// `JSON.parse(JSON.stringify(builder(data)))` SHALL produce an object
// that is deep-equal to the original `builder(data)` output (after
// stripping function values that are lost during serialisation).
// ============================================

console.log('--- Property 2 (bar subset): Non-custom builder JSON round-trip ---');

// 2.1 buildAnimatedRankingOptions
fc.assert(
  fc.property(arbAnimatedRankingData, (data) => {
    return assertJsonRoundTrip('buildAnimatedRankingOptions', buildAnimatedRankingOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildAnimatedRankingOptions JSON round-trip');

// 2.2 buildBoardSummaryOptions
fc.assert(
  fc.property(arbBoardSummaryData, (data) => {
    return assertJsonRoundTrip('buildBoardSummaryOptions', buildBoardSummaryOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildBoardSummaryOptions JSON round-trip');

// 2.3 buildFindingsBarOptions
fc.assert(
  fc.property(arbFindingsBarData, (data) => {
    return assertJsonRoundTrip('buildFindingsBarOptions', buildFindingsBarOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildFindingsBarOptions JSON round-trip');

// 2.4 buildMaturityProgressionOptions
fc.assert(
  fc.property(arbMaturityProgressionData, (data) => {
    return assertJsonRoundTrip('buildMaturityProgressionOptions', buildMaturityProgressionOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildMaturityProgressionOptions JSON round-trip');

// 2.5 buildValueGapBarOptions
fc.assert(
  fc.property(arbValueGapBarData, (data) => {
    return assertJsonRoundTrip('buildValueGapBarOptions', buildValueGapBarOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildValueGapBarOptions JSON round-trip');

// 2.6 buildRiskBridgeWaterfallOptions
fc.assert(
  fc.property(arbWaterfallData, (data) => {
    return assertJsonRoundTrip('buildRiskBridgeWaterfallOptions', buildRiskBridgeWaterfallOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildRiskBridgeWaterfallOptions JSON round-trip');

// 2.7 buildRiskWaterfallOptions
fc.assert(
  fc.property(arbWaterfallData, (data) => {
    return assertJsonRoundTrip('buildRiskWaterfallOptions', buildRiskWaterfallOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildRiskWaterfallOptions JSON round-trip');

// 2.8 buildBulletChartOptions
fc.assert(
  fc.property(arbBulletChartData, (data) => {
    return assertJsonRoundTrip('buildBulletChartOptions', buildBulletChartOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildBulletChartOptions JSON round-trip');

// 2.9 buildMonteCarloHistogramOptions
fc.assert(
  fc.property(arbMonteCarloHistogramData, (data) => {
    return assertJsonRoundTrip('buildMonteCarloHistogramOptions', buildMonteCarloHistogramOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildMonteCarloHistogramOptions JSON round-trip');

// 2.10 buildTornadoChartOptions
fc.assert(
  fc.property(arbTornadoChartData, (data) => {
    return assertJsonRoundTrip('buildTornadoChartOptions', buildTornadoChartOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildTornadoChartOptions JSON round-trip');

console.log('Property 2 (bar subset): PASSED\n');

// ============================================
console.log('=== All bar-builders round-trip property tests PASSED ===');
