// ============================================
// Line Builders — Property-Based Tests (Property 2, line subset)
// Feature: advanced-echarts-widgets, Task 5.3
// ============================================
//
// Property 2 (line subset): Non-custom builder JSON round-trip
// **Validates: Requirements 3.14**
//
// For all 13 line builder functions and any valid input data,
// `JSON.parse(JSON.stringify(builder(data)))` SHALL produce an object
// that is deep-equal to the original `builder(data)` output — after
// stripping function values (e.g. tooltip.formatter, label.formatter)
// which are lost during JSON serialisation.
//
// Standalone PBT file — no test runner required.
// Run: npx tsx src/app/shared/widgets/echart-builders/line-builders-roundtrip.pbt.ts

import * as fc from 'fast-check';
import {
  buildAttackSurfaceTrendOptions,
  buildComplianceTimelineOptions,
  buildControlHeartbeatOptions,
  buildEnforcementTrendOptions,
  buildRemediationVelocityOptions,
  buildRiskAppetiteTrendOptions,
  buildRollingForecastOptions,
  buildSparklineOptions,
  buildTrendLineOptions,
  buildAnomalyTimelineOptions,
  buildGrcTimelineOptions,
  buildRiskMatrixTimelineOptions,
  buildIssueAgingBurndownOptions,
} from './line-builders';
import type {
  TimeSeriesData,
  SparklineData,
  ForecastData,
  AnomalyTimelineData,
  BurndownData,
} from '../builder-types';

// ============================================
// Arbitraries (same as line-builders.pbt.ts)
// ============================================

const arbDateStr = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
  .map(d => d.toISOString().slice(0, 10));

const arbTimeSeriesData: fc.Arbitrary<TimeSeriesData> = fc.record({
  series: fc.array(
    fc.record({
      name: fc.string({ minLength: 1, maxLength: 20 }),
      data: fc.array(
        fc.record({ date: arbDateStr, value: fc.double({ min: -10000, max: 10000, noNaN: true }) }),
        { minLength: 1, maxLength: 20 },
      ),
    }),
    { minLength: 1, maxLength: 6 },
  ),
});

const arbSparklineData: fc.Arbitrary<SparklineData> = fc.record({
  values: fc.array(fc.double({ min: -10000, max: 10000, noNaN: true }), { minLength: 1, maxLength: 50 }),
  label: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
});

const arbForecastData: fc.Arbitrary<ForecastData> = fc.record({
  historical: fc.array(
    fc.record({ date: arbDateStr, value: fc.double({ min: -10000, max: 10000, noNaN: true }) }),
    { minLength: 1, maxLength: 20 },
  ),
  forecast: fc.array(
    fc.record({
      date: arbDateStr,
      value: fc.double({ min: -10000, max: 10000, noNaN: true }),
      lower: fc.double({ min: -10000, max: 10000, noNaN: true }),
      upper: fc.double({ min: -10000, max: 10000, noNaN: true }),
    }),
    { minLength: 1, maxLength: 20 },
  ),
});

const arbAnomalyTimelineData: fc.Arbitrary<AnomalyTimelineData> = fc.record({
  points: fc.array(
    fc.record({
      date: arbDateStr,
      value: fc.double({ min: -10000, max: 10000, noNaN: true }),
      isAnomaly: fc.boolean(),
      severity: fc.option(fc.constantFrom('critical', 'high', 'medium', 'low', 'info')),
    }),
    { minLength: 1, maxLength: 30 },
  ),
});

const arbBurndownData: fc.Arbitrary<BurndownData> = fc.nat({ max: 29 }).chain(n => {
  const len = n + 1;
  return fc.record({
    dates: fc.array(arbDateStr, { minLength: len, maxLength: len }),
    aging: fc.array(fc.nat({ max: 500 }), { minLength: len, maxLength: len }),
    burndown: fc.array(fc.nat({ max: 500 }), { minLength: len, maxLength: len }),
  });
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
// Property 2 (line subset): Non-custom builder JSON round-trip
// Feature: advanced-echarts-widgets, Property 2 (line subset)
// **Validates: Requirements 3.14**
//
// For all 13 line builder functions and any valid input data,
// `JSON.parse(JSON.stringify(builder(data)))` SHALL produce an object
// that is deep-equal to the original `builder(data)` output (after
// stripping function values that are lost during serialisation).
// ============================================

console.log('--- Property 2 (line subset): Non-custom builder JSON round-trip ---');

// 3.1 buildAttackSurfaceTrendOptions
fc.assert(
  fc.property(arbTimeSeriesData, (data) => {
    return assertJsonRoundTrip('buildAttackSurfaceTrendOptions', buildAttackSurfaceTrendOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildAttackSurfaceTrendOptions JSON round-trip');

// 3.2 buildComplianceTimelineOptions
fc.assert(
  fc.property(arbTimeSeriesData, (data) => {
    return assertJsonRoundTrip('buildComplianceTimelineOptions', buildComplianceTimelineOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildComplianceTimelineOptions JSON round-trip');

// 3.3 buildControlHeartbeatOptions
fc.assert(
  fc.property(arbTimeSeriesData, (data) => {
    return assertJsonRoundTrip('buildControlHeartbeatOptions', buildControlHeartbeatOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildControlHeartbeatOptions JSON round-trip');

// 3.4 buildEnforcementTrendOptions
fc.assert(
  fc.property(arbTimeSeriesData, (data) => {
    return assertJsonRoundTrip('buildEnforcementTrendOptions', buildEnforcementTrendOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildEnforcementTrendOptions JSON round-trip');

// 3.5 buildRemediationVelocityOptions
fc.assert(
  fc.property(arbTimeSeriesData, (data) => {
    return assertJsonRoundTrip('buildRemediationVelocityOptions', buildRemediationVelocityOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildRemediationVelocityOptions JSON round-trip');

// 3.6 buildRiskAppetiteTrendOptions
fc.assert(
  fc.property(arbTimeSeriesData, (data) => {
    return assertJsonRoundTrip('buildRiskAppetiteTrendOptions', buildRiskAppetiteTrendOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildRiskAppetiteTrendOptions JSON round-trip');

// 3.7 buildRollingForecastOptions
fc.assert(
  fc.property(arbForecastData, (data) => {
    return assertJsonRoundTrip('buildRollingForecastOptions', buildRollingForecastOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildRollingForecastOptions JSON round-trip');

// 3.8 buildSparklineOptions
fc.assert(
  fc.property(arbSparklineData, (data) => {
    return assertJsonRoundTrip('buildSparklineOptions', buildSparklineOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildSparklineOptions JSON round-trip');

// 3.9 buildTrendLineOptions
fc.assert(
  fc.property(arbTimeSeriesData, (data) => {
    return assertJsonRoundTrip('buildTrendLineOptions', buildTrendLineOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildTrendLineOptions JSON round-trip');

// 3.10 buildAnomalyTimelineOptions
fc.assert(
  fc.property(arbAnomalyTimelineData, (data) => {
    return assertJsonRoundTrip('buildAnomalyTimelineOptions', buildAnomalyTimelineOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildAnomalyTimelineOptions JSON round-trip');

// 3.11 buildGrcTimelineOptions
fc.assert(
  fc.property(arbTimeSeriesData, (data) => {
    return assertJsonRoundTrip('buildGrcTimelineOptions', buildGrcTimelineOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildGrcTimelineOptions JSON round-trip');

// 3.12 buildRiskMatrixTimelineOptions
fc.assert(
  fc.property(arbTimeSeriesData, (data) => {
    return assertJsonRoundTrip('buildRiskMatrixTimelineOptions', buildRiskMatrixTimelineOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildRiskMatrixTimelineOptions JSON round-trip');

// 3.13 buildIssueAgingBurndownOptions
fc.assert(
  fc.property(arbBurndownData, (data) => {
    return assertJsonRoundTrip('buildIssueAgingBurndownOptions', buildIssueAgingBurndownOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildIssueAgingBurndownOptions JSON round-trip');

console.log('Property 2 (line subset): PASSED\n');

// ============================================
console.log('=== All line-builders round-trip property tests PASSED ===');
