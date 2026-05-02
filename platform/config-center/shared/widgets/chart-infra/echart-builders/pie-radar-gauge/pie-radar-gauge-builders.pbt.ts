// ============================================
// Pie/Radar/Gauge Builders — Property-Based Tests
// (Property 1 pie/radar/gauge subset, Property 5, Property 6)
// Feature: advanced-echarts-widgets, Task 6.2
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: npx tsx src/app/shared/widgets/echart-builders/pie-radar-gauge-builders.pbt.ts

import * as fc from 'fast-check';
import {
  buildControlTestingDonutOptions,
  buildEvidenceDonutOptions,
  buildEvidenceFreshnessRadarOptions,
  buildMaturityRadarOptions,
  buildMaturitySpiderOptions,
  buildComplianceGaugeOptions,
  buildKpiTilesAnimatedOptions,
  buildRiskAppetiteGaugeOptions,
} from './pie-radar-gauge-builders';
import type {
import { GrcRecord } from '@app/core/models/shared.types';
  DonutData,
  RadarData,
  GaugeData,
  KpiTilesData,
} from '../builder-types';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcRecord } from '@app/core/models/shared.types';

// ============================================
// Arbitraries
// ============================================

const arbDonutData: fc.Arbitrary<DonutData> = fc.record({
  segments: fc.array(
    fc.record({
      name: fc.string({ minLength: 1, maxLength: 20 }),
      value: fc.nat({ max: 10000 }),
      color: fc.option(fc.string({ minLength: 6, maxLength: 6 }).map((h: string) => `#${h}`)),
    }),
    { minLength: 1, maxLength: 10 },
  ),
});

const arbRadarData: fc.Arbitrary<RadarData> = fc.nat({ max: 9 }).chain(n => {
  const indCount = n + 1;
  return fc.record({
    indicators: fc.array(
      fc.record({
        name: fc.string({ minLength: 1, maxLength: 20 }),
        max: fc.integer({ min: 1, max: 1000 }),
      }),
      { minLength: indCount, maxLength: indCount },
    ),
    series: fc.array(
      fc.record({
        name: fc.string({ minLength: 1, maxLength: 20 }),
        values: fc.array(fc.nat({ max: 1000 }), { minLength: indCount, maxLength: indCount }),
      }),
      { minLength: 1, maxLength: 5 },
    ),
  });
});

const arbGaugeData: fc.Arbitrary<GaugeData> = fc.record({
  value: fc.double({ min: 0, max: 100, noNaN: true }),
  min: fc.constant(0),
  max: fc.constant(100),
  zones: fc.constant([
    { min: 0, max: 40, color: '#da1e28' },
    { min: 40, max: 70, color: '#f1c21b' },
    { min: 70, max: 100, color: '#24a148' },
  ] as { min: number; max: number; color: string }[]),
  label: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
});

const arbKpiTilesData: fc.Arbitrary<KpiTilesData> = fc.record({
  tiles: fc.array(
    fc.record({
      label: fc.string({ minLength: 1, maxLength: 20 }),
      value: fc.nat({ max: 10000 }),
      target: fc.nat({ max: 10000 }),
      unit: fc.constantFrom('%', 'pts', '#', '$'),
    }),
    { minLength: 1, maxLength: 8 },
  ),
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
// Property 1 (pie/radar/gauge subset): Options builder output validity
// Feature: advanced-echarts-widgets, Property 1 (pie/radar/gauge subset)
// **Validates: Requirements 4.1–4.8**
//
// For any valid input data for each of the 8 pie/radar/gauge builders,
// the output SHALL be a non-null object with a `series` array
// containing at least one entry with the correct type.
// ============================================

console.log('--- Property 1 (pie/radar/gauge subset): Options builder output validity ---');

// 4.1 buildControlTestingDonutOptions
fc.assert(
  fc.property(arbDonutData, (data) => {
    return assertSeriesType(buildControlTestingDonutOptions(data), 'pie');
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildControlTestingDonutOptions always produces pie series');

// 4.2 buildEvidenceDonutOptions
fc.assert(
  fc.property(arbDonutData, (data) => {
    return assertSeriesType(buildEvidenceDonutOptions(data), 'pie');
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildEvidenceDonutOptions always produces pie series');

// 4.3 buildEvidenceFreshnessRadarOptions
fc.assert(
  fc.property(arbRadarData, (data) => {
    return assertSeriesType(buildEvidenceFreshnessRadarOptions(data), 'radar');
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildEvidenceFreshnessRadarOptions always produces radar series');

// 4.4 buildMaturityRadarOptions
fc.assert(
  fc.property(arbRadarData, (data) => {
    return assertSeriesType(buildMaturityRadarOptions(data), 'radar');
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildMaturityRadarOptions always produces radar series');

// 4.5 buildMaturitySpiderOptions
fc.assert(
  fc.property(arbRadarData, (data) => {
    return assertSeriesType(buildMaturitySpiderOptions(data), 'radar');
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildMaturitySpiderOptions always produces radar series');

// 4.6 buildComplianceGaugeOptions
fc.assert(
  fc.property(arbGaugeData, (data) => {
    return assertSeriesType(buildComplianceGaugeOptions(data), 'gauge');
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildComplianceGaugeOptions always produces gauge series');

// 4.7 buildKpiTilesAnimatedOptions
fc.assert(
  fc.property(arbKpiTilesData, (data) => {
    return assertSeriesType(buildKpiTilesAnimatedOptions(data), 'gauge');
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildKpiTilesAnimatedOptions always produces gauge series');

// 4.8 buildRiskAppetiteGaugeOptions
fc.assert(
  fc.property(arbGaugeData, (data) => {
    return assertSeriesType(buildRiskAppetiteGaugeOptions(data), 'gauge');
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildRiskAppetiteGaugeOptions always produces gauge series');

console.log('Property 1 (pie/radar/gauge subset): PASSED\n');

// ============================================
// Property 5: Donut/pie data sum invariant
// Feature: advanced-echarts-widgets, Property 5
// **Validates: Requirements 4.9**
//
// For any valid DonutData input, the sum of all data[i].value
// entries in the output pie series SHALL equal the sum of all
// segments[i].value entries in the input data.
// ============================================

console.log('--- Property 5: Donut/pie data sum invariant ---');

function sumPieSeriesValues(result: Record<string, unknown>): number {
  const series = result['series'] as unknown[];
  const pieSeries = series.find((s) => s.type === 'pie');
  if (!pieSeries || !Array.isArray(pieSeries.data)) return NaN;
  return pieSeries.data.reduce((acc: number, d: GrcRecord) => acc + (d.value ?? 0), 0);
}

function sumInputSegments(data: DonutData): number {
  return data.segments.reduce((acc, seg) => acc + seg.value, 0);
}

// 4.1 buildControlTestingDonutOptions — sum invariant
fc.assert(
  fc.property(arbDonutData, (data) => {
    const result = buildControlTestingDonutOptions(data) as Record<string, unknown>;
    return sumPieSeriesValues(result) === sumInputSegments(data);
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildControlTestingDonutOptions preserves segment value sum');

// 4.2 buildEvidenceDonutOptions — sum invariant
fc.assert(
  fc.property(arbDonutData, (data) => {
    const result = buildEvidenceDonutOptions(data) as Record<string, unknown>;
    return sumPieSeriesValues(result) === sumInputSegments(data);
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildEvidenceDonutOptions preserves segment value sum');

console.log('Property 5: PASSED\n');

// ============================================
// Property 6: Radar indicator count invariant
// Feature: advanced-echarts-widgets, Property 6
// **Validates: Requirements 4.10**
//
// For any valid RadarData input, the number of indicator entries
// in the output radar configuration SHALL equal data.indicators.length.
// ============================================

console.log('--- Property 6: Radar indicator count invariant ---');

function getRadarIndicatorCount(result: Record<string, unknown>): number {
  const radar = result['radar'] as unknown;
  if (!radar || !Array.isArray(radar.indicator)) return -1;
  return radar.indicator.length;
}

// 4.3 buildEvidenceFreshnessRadarOptions — indicator count
fc.assert(
  fc.property(arbRadarData, (data) => {
    const result = buildEvidenceFreshnessRadarOptions(data) as Record<string, unknown>;
    return getRadarIndicatorCount(result) === data.indicators.length;
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildEvidenceFreshnessRadarOptions preserves indicator count');

// 4.4 buildMaturityRadarOptions — indicator count
fc.assert(
  fc.property(arbRadarData, (data) => {
    const result = buildMaturityRadarOptions(data) as Record<string, unknown>;
    return getRadarIndicatorCount(result) === data.indicators.length;
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildMaturityRadarOptions preserves indicator count');

// 4.5 buildMaturitySpiderOptions — indicator count
fc.assert(
  fc.property(arbRadarData, (data) => {
    const result = buildMaturitySpiderOptions(data) as Record<string, unknown>;
    return getRadarIndicatorCount(result) === data.indicators.length;
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildMaturitySpiderOptions preserves indicator count');

console.log('Property 6: PASSED\n');

// ============================================
console.log('=== All pie-radar-gauge-builders property tests PASSED ===');
