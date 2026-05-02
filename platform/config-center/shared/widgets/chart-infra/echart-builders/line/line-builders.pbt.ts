// ============================================
// Line Builders — Property-Based Tests (Property 1 line subset + Property 11)
// Feature: advanced-echarts-widgets, Task 5.2
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: npx tsx src/app/shared/widgets/echart-builders/line-builders.pbt.ts

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
import { GrcRecord } from '@app/core/models/shared.types';
  TimeSeriesData,
  SparklineData,
  ForecastData,
  AnomalyTimelineData,
  BurndownData,
} from '../builder-types';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcRecord } from '@app/core/models/shared.types';

// ============================================
// Arbitraries
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
// Helper: assert line output validity
// ============================================

function assertLineOutput(result: Record<string, unknown>): boolean {
  if (result == null || typeof result !== 'object') return false;
  const opts = result as Record<string, unknown>;
  const series = opts['series'];
  if (!Array.isArray(series) || series.length === 0) return false;
  return series.some((s) => s && s.type === 'line');
}

// ============================================
// Property 1 (line subset): Options builder output validity
// Feature: advanced-echarts-widgets, Property 1 (line subset)
// **Validates: Requirements 3.1–3.14**
//
// For any valid input data for each of the 13 line builders,
// the output SHALL be a non-null object with a `series` array
// containing at least one entry with `type: 'line'`.
// ============================================

console.log('--- Property 1 (line subset): Options builder output validity ---');

// 3.1 buildAttackSurfaceTrendOptions
fc.assert(
  fc.property(arbTimeSeriesData, (data) => {
    return assertLineOutput(buildAttackSurfaceTrendOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildAttackSurfaceTrendOptions always produces line series');

// 3.2 buildComplianceTimelineOptions
fc.assert(
  fc.property(arbTimeSeriesData, (data) => {
    return assertLineOutput(buildComplianceTimelineOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildComplianceTimelineOptions always produces line series');

// 3.3 buildControlHeartbeatOptions
fc.assert(
  fc.property(arbTimeSeriesData, (data) => {
    return assertLineOutput(buildControlHeartbeatOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildControlHeartbeatOptions always produces line series');

// 3.4 buildEnforcementTrendOptions
fc.assert(
  fc.property(arbTimeSeriesData, (data) => {
    return assertLineOutput(buildEnforcementTrendOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildEnforcementTrendOptions always produces line series');

// 3.5 buildRemediationVelocityOptions
fc.assert(
  fc.property(arbTimeSeriesData, (data) => {
    return assertLineOutput(buildRemediationVelocityOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildRemediationVelocityOptions always produces line series');

// 3.6 buildRiskAppetiteTrendOptions
fc.assert(
  fc.property(arbTimeSeriesData, (data) => {
    return assertLineOutput(buildRiskAppetiteTrendOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildRiskAppetiteTrendOptions always produces line series');

// 3.7 buildRollingForecastOptions
fc.assert(
  fc.property(arbForecastData, (data) => {
    return assertLineOutput(buildRollingForecastOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildRollingForecastOptions always produces line series');

// 3.8 buildSparklineOptions
fc.assert(
  fc.property(arbSparklineData, (data) => {
    return assertLineOutput(buildSparklineOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildSparklineOptions always produces line series');

// 3.9 buildTrendLineOptions
fc.assert(
  fc.property(arbTimeSeriesData, (data) => {
    return assertLineOutput(buildTrendLineOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildTrendLineOptions always produces line series');

// 3.10 buildAnomalyTimelineOptions
fc.assert(
  fc.property(arbAnomalyTimelineData, (data) => {
    return assertLineOutput(buildAnomalyTimelineOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildAnomalyTimelineOptions always produces line series');

// 3.11 buildGrcTimelineOptions
fc.assert(
  fc.property(arbTimeSeriesData, (data) => {
    return assertLineOutput(buildGrcTimelineOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildGrcTimelineOptions always produces line series');

// 3.12 buildRiskMatrixTimelineOptions
fc.assert(
  fc.property(arbTimeSeriesData, (data) => {
    return assertLineOutput(buildRiskMatrixTimelineOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildRiskMatrixTimelineOptions always produces line series');

// 3.13 buildIssueAgingBurndownOptions
fc.assert(
  fc.property(arbBurndownData, (data) => {
    return assertLineOutput(buildIssueAgingBurndownOptions(data));
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildIssueAgingBurndownOptions always produces line series');

console.log('Property 1 (line subset): PASSED\n');

// ============================================
// Property 11: Line builder data point count preservation
// Feature: advanced-echarts-widgets, Property 11
// **Validates: Requirements 3.14**
//
// For any line-type builder and valid input, the number of data
// points in each output series SHALL equal the number of data
// points in the corresponding input array.
// ============================================

console.log('--- Property 11: Line builder data point count preservation ---');

// Helper to extract series data lengths from an EChartsOption
function getSeriesDataLengths(result: Record<string, unknown>): number[] {
  const opts = result as Record<string, unknown>;
  const series = opts['series'] as unknown[];
  return series.map((s) => {
    if (Array.isArray(s.data)) return s.data.length;
    return 0;
  });
}

// ── TimeSeriesData-based builders ──
// Each input series maps to one output series with the same data length.

const timeSeriesBuilders = [
  { name: 'buildAttackSurfaceTrendOptions', fn: buildAttackSurfaceTrendOptions },
  { name: 'buildComplianceTimelineOptions', fn: buildComplianceTimelineOptions },
  { name: 'buildControlHeartbeatOptions', fn: buildControlHeartbeatOptions },
  { name: 'buildEnforcementTrendOptions', fn: buildEnforcementTrendOptions },
  { name: 'buildRemediationVelocityOptions', fn: buildRemediationVelocityOptions },
  { name: 'buildRiskAppetiteTrendOptions', fn: buildRiskAppetiteTrendOptions },
  { name: 'buildTrendLineOptions', fn: buildTrendLineOptions },
] as const;

for (const builder of timeSeriesBuilders) {
  fc.assert(
    fc.property(arbTimeSeriesData, (data) => {
      const result = builder.fn(data);
      const series = (result as GrcRecord).series as unknown[];
      // Each input series produces exactly one output series with matching length
      for (let i = 0; i < data.series.length; i++) {
        if (series[i].data.length !== data.series[i].data.length) return false;
      }
      return true;
    }),
    { numRuns: 100 },
  );
  console.log(`  ✓ ${builder.name} preserves data point count`);
}

// ── GrcTimeline: produces line + scatter per input series ──
// line series at index i, scatter series at index (data.series.length + i)
fc.assert(
  fc.property(arbTimeSeriesData, (data) => {
    const result = buildGrcTimelineOptions(data);
    const series = (result as GrcRecord).series as unknown[];
    const n = data.series.length;
    for (let i = 0; i < n; i++) {
      // line series
      if (series[i].data.length !== data.series[i].data.length) return false;
      // scatter series
      if (series[n + i].data.length !== data.series[i].data.length) return false;
    }
    return true;
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildGrcTimelineOptions preserves data point count');

// ── RiskMatrixTimeline: produces [line, scatter] pairs flattened per input series ──
fc.assert(
  fc.property(arbTimeSeriesData, (data) => {
    const result = buildRiskMatrixTimelineOptions(data);
    const series = (result as GrcRecord).series as unknown[];
    for (let i = 0; i < data.series.length; i++) {
      // line at 2*i, scatter at 2*i+1
      if (series[2 * i].data.length !== data.series[i].data.length) return false;
      if (series[2 * i + 1].data.length !== data.series[i].data.length) return false;
    }
    return true;
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildRiskMatrixTimelineOptions preserves data point count');

// ── SparklineData: output data length = input values length ──
fc.assert(
  fc.property(arbSparklineData, (data) => {
    const result = buildSparklineOptions(data);
    const series = (result as GrcRecord).series as unknown[];
    return series[0].data.length === data.values.length;
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildSparklineOptions preserves data point count');

// ── ForecastData: historical series length = historical input length ──
fc.assert(
  fc.property(arbForecastData, (data) => {
    const result = buildRollingForecastOptions(data);
    const series = (result as GrcRecord).series as unknown[];
    // Historical series (index 0) is padded to full length (hist + forecast)
    // The non-null portion should equal historical input length
    const histSeries = series[0].data as unknown[];
    const nonNullCount = histSeries.filter((v) => v !== null).length;
    return nonNullCount === data.historical.length;
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildRollingForecastOptions preserves historical data point count');

// ── AnomalyTimelineData: output data length = input points length ──
fc.assert(
  fc.property(arbAnomalyTimelineData, (data) => {
    const result = buildAnomalyTimelineOptions(data);
    const series = (result as GrcRecord).series as unknown[];
    // Line series (index 0) data length = input points length
    if (series[0].data.length !== data.points.length) return false;
    // Scatter series (index 1) data length = input points length
    if (series[1].data.length !== data.points.length) return false;
    return true;
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildAnomalyTimelineOptions preserves data point count');

// ── BurndownData: output data lengths = input dates length ──
fc.assert(
  fc.property(arbBurndownData, (data) => {
    const result = buildIssueAgingBurndownOptions(data);
    const series = (result as GrcRecord).series as unknown[];
    // Bar series (aging) at index 0
    if (series[0].data.length !== data.dates.length) return false;
    // Line series (burndown) at index 1
    if (series[1].data.length !== data.dates.length) return false;
    return true;
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildIssueAgingBurndownOptions preserves data point count');

console.log('Property 11: PASSED\n');

// ============================================
console.log('=== All line-builders property tests PASSED ===');
