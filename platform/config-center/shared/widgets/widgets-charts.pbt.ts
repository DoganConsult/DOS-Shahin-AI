// ============================================
// Chart Data Transformations — Property-Based Tests (Properties 1–5, 13)
// Feature: grc-advanced-dashboards
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/shared/widgets/widgets-charts.pbt.ts

import * as fc from 'fast-check';
import {
  transformToChartData,
  computeRiskDistribution,
  transformToBarChartData,
  selectChartType,
  buildHeatmapDrillUrl,
  getChartLabels,
  TrendDataPoint,
  FrameworkCompletion,
} from './chart-utils';

// ============================================
// Arbitraries
// ============================================

/** ISO date string arbitrary — use integer timestamps to avoid invalid Date edge cases. */
const isoDateArb = fc.integer({
  min: new Date('2020-01-01').getTime(),
  max: new Date('2030-12-31').getTime(),
}).map(ts => new Date(ts).toISOString());

/** Compliance score between 0 and 100. */
const scoreArb = fc.double({ min: 0, max: 100, noNaN: true });

/** TrendDataPoint arbitrary. */
const trendPointArb: fc.Arbitrary<TrendDataPoint> = fc.record({
  snapshotDate: isoDateArb,
  complianceScore: scoreArb,
});

/** Non-empty array of trend points. */
const trendPointsArb = fc.array(trendPointArb, { minLength: 1, maxLength: 50 });

/** Risk with non-negative riskScore. */
const riskArb = fc.record({
  riskScore: fc.double({ min: 0, max: 100, noNaN: true }),
});

const risksArb = fc.array(riskArb, { minLength: 0, maxLength: 100 });

/** Likelihood/impact 1-5. */
const likelihoodArb = fc.integer({ min: 1, max: 5 });
const impactArb = fc.integer({ min: 1, max: 5 });

/** FrameworkCompletion with totalControls > 0. */
const frameworkArb: fc.Arbitrary<FrameworkCompletion> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }),
  implementedControls: fc.integer({ min: 0, max: 1000 }),
  totalControls: fc.integer({ min: 1, max: 1000 }),
}).filter(f => f.implementedControls <= f.totalControls);

const frameworksArb = fc.array(frameworkArb, { minLength: 1, maxLength: 20 });

/** Framework count >= 0. */
const frameworkCountArb = fc.integer({ min: 0, max: 100 });

/** Language arbitrary. */
const langArb = fc.constantFrom('ar' as const, 'en' as const);

const CHART_KEYS = [
  'complianceTrend', 'riskDistribution', 'controlProgress',
  'frameworkRadar', 'noData', 'days30', 'days90', 'days180',
  'critical', 'high', 'medium', 'low',
];

/** Builds a translation map where every charts.* key has a non-empty value. */
function buildTranslationMap(lang: 'ar' | 'en'): Record<string, string> {
  const map: Record<string, string> = {};
  for (const key of CHART_KEYS) {
    map[`charts.${key}`] = lang === 'ar' ? `${key}_ar` : `${key}_en`;
  }
  return map;
}

// ============================================
// Property 1: KPI Trend Chart Data Transformation
// Feature: grc-advanced-dashboards, Property 1: KPI Trend Chart Data Transformation
// **Validates: Requirements 2.1, 2.2**
//
// For any array of TrendDataPoint, transformToChartData should produce
// labels.length === datasets[0].data.length, all data values between
// 0-100, and labels are valid date strings.
// ============================================

console.log('--- Property 1: KPI Trend Chart Data Transformation ---');

// 1a: labels.length === datasets[0].data.length
fc.assert(
  fc.property(trendPointsArb, (points) => {
    const result = transformToChartData(points, 'Compliance');
    return result.labels.length === result.datasets[0].data.length;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 1a: labels.length === datasets[0].data.length');

// 1b: data values are between 0 and 100
fc.assert(
  fc.property(trendPointsArb, (points) => {
    const result = transformToChartData(points, 'Compliance');
    return result.datasets[0].data.every(v => v >= 0 && v <= 100);
  }),
  { numRuns: 100 }
);
console.log('  ✓ 1b: all data values between 0 and 100');

// 1c: labels are non-empty strings (valid date strings)
fc.assert(
  fc.property(trendPointsArb, (points) => {
    const result = transformToChartData(points, 'Compliance');
    return result.labels.every(l => typeof l === 'string' && l.length > 0);
  }),
  { numRuns: 100 }
);
console.log('  ✓ 1c: labels are non-empty strings');

// 1d: output length matches input length
fc.assert(
  fc.property(trendPointsArb, (points) => {
    const result = transformToChartData(points, 'Test');
    return result.labels.length === points.length;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 1d: output length matches input length');

console.log('Property 1: PASSED\n');

// ============================================
// Property 2: Risk Distribution Partition
// Feature: grc-advanced-dashboards, Property 2: Risk Distribution Partition
// **Validates: Requirements 3.1, 3.2, 3.4**
//
// For any array of risks with riskScore >= 0, computeRiskDistribution
// should produce critical + high + medium + low === total input count.
// Every risk classified into exactly one category.
// ============================================

console.log('--- Property 2: Risk Distribution Partition ---');

// 2a: sum of categories equals input count
fc.assert(
  fc.property(risksArb, (risks) => {
    const dist = computeRiskDistribution(risks);
    return dist.critical + dist.high + dist.medium + dist.low === risks.length;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 2a: critical + high + medium + low === total input count');

// 2b: all category counts are non-negative
fc.assert(
  fc.property(risksArb, (risks) => {
    const dist = computeRiskDistribution(risks);
    return dist.critical >= 0 && dist.high >= 0 && dist.medium >= 0 && dist.low >= 0;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 2b: all category counts are non-negative');

// 2c: empty input produces all zeros
fc.assert(
  fc.property(fc.constant([] as { riskScore: number }[]), (risks: { riskScore: number }[]) => {
    const dist = computeRiskDistribution(risks);
    return dist.critical === 0 && dist.high === 0 && dist.medium === 0 && dist.low === 0;
  }),
  { numRuns: 1 }
);
console.log('  ✓ 2c: empty input produces all zeros');

// 2d: threshold boundaries are correct
fc.assert(
  fc.property(riskArb, (risk) => {
    const dist = computeRiskDistribution([risk]);
    const s = risk.riskScore;
    if (s >= 20) return dist.critical === 1 && dist.high === 0 && dist.medium === 0 && dist.low === 0;
    if (s >= 12) return dist.critical === 0 && dist.high === 1 && dist.medium === 0 && dist.low === 0;
    if (s >= 6) return dist.critical === 0 && dist.high === 0 && dist.medium === 1 && dist.low === 0;
    return dist.critical === 0 && dist.high === 0 && dist.medium === 0 && dist.low === 1;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 2d: threshold boundaries classify each risk into exactly one category');

console.log('Property 2: PASSED\n');

// ============================================
// Property 3: Heatmap Drill-Through URL Construction
// Feature: grc-advanced-dashboards, Property 3: Heatmap Drill-Through URL Construction
// **Validates: Requirements 4.1**
//
// For any likelihood (1-5) and impact (1-5), buildHeatmapDrillUrl
// should produce URL containing correct query params.
// ============================================

console.log('--- Property 3: Heatmap Drill-Through URL Construction ---');

// 3a: URL contains correct likelihood and impact params
fc.assert(
  fc.property(likelihoodArb, impactArb, (likelihood, impact) => {
    const url = buildHeatmapDrillUrl(likelihood, impact);
    return url.includes(`likelihood=${likelihood}`) && url.includes(`impact=${impact}`);
  }),
  { numRuns: 100 }
);
console.log('  ✓ 3a: URL contains correct likelihood and impact params');

// 3b: URL starts with /risks
fc.assert(
  fc.property(likelihoodArb, impactArb, (likelihood, impact) => {
    const url = buildHeatmapDrillUrl(likelihood, impact);
    return url.startsWith('/risks?');
  }),
  { numRuns: 100 }
);
console.log('  ✓ 3b: URL starts with /risks?');

// 3c: URL is parseable and has exactly 2 query params
fc.assert(
  fc.property(likelihoodArb, impactArb, (likelihood, impact) => {
    const url = buildHeatmapDrillUrl(likelihood, impact);
    const queryString = url.split('?')[1];
    const params = new URLSearchParams(queryString);
    return params.get('likelihood') === String(likelihood) &&
           params.get('impact') === String(impact);
  }),
  { numRuns: 100 }
);
console.log('  ✓ 3c: URL query params are parseable with correct values');

console.log('Property 3: PASSED\n');

// ============================================
// Property 4: Framework Bar Chart Sorted with Correct Percentages
// Feature: grc-advanced-dashboards, Property 4: Framework Bar Chart Sorted with Correct Percentages
// **Validates: Requirements 5.2, 5.4**
//
// For any array of frameworks (totalControls > 0), transformToBarChartData
// should produce bars sorted ascending by completion %, each value =
// (implemented/total)*100, bar count = framework count.
// ============================================

console.log('--- Property 4: Framework Bar Chart Sorted with Correct Percentages ---');

// 4a: bar count equals framework count
fc.assert(
  fc.property(frameworksArb, (frameworks) => {
    const result = transformToBarChartData(frameworks);
    return result.labels.length === frameworks.length &&
           result.datasets[0].data.length === frameworks.length;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 4a: bar count equals framework count');

// 4b: bars are sorted ascending by completion percentage
fc.assert(
  fc.property(frameworksArb, (frameworks) => {
    const result = transformToBarChartData(frameworks);
    const data = result.datasets[0].data;
    for (let i = 1; i < data.length; i++) {
      if (data[i] < data[i - 1]) return false;
    }
    return true;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 4b: bars sorted ascending by completion percentage');

// 4c: each value equals (implementedControls / totalControls) * 100
fc.assert(
  fc.property(frameworksArb, (frameworks) => {
    const result = transformToBarChartData(frameworks);
    const data = result.datasets[0].data;
    // Compute expected percentages sorted ascending
    const expected = frameworks
      .map(f => (f.implementedControls / f.totalControls) * 100)
      .sort((a, b) => a - b);
    return data.every((v, i) => Math.abs(v - expected[i]) < 1e-9);
  }),
  { numRuns: 100 }
);
console.log('  ✓ 4c: each value equals (implemented/total)*100');

console.log('Property 4: PASSED\n');

// ============================================
// Property 5: Radar Chart Type Selection
// Feature: grc-advanced-dashboards, Property 5: Radar Chart Type Selection
// **Validates: Requirements 6.4**
//
// For any number >= 0, selectChartType returns 'radar' when >= 3,
// 'bar' when < 3.
// ============================================

console.log('--- Property 5: Radar Chart Type Selection ---');

// 5a: returns 'radar' when count >= 3
fc.assert(
  fc.property(fc.integer({ min: 3, max: 1000 }), (count) => {
    return selectChartType(count) === 'radar';
  }),
  { numRuns: 100 }
);
console.log('  ✓ 5a: returns radar when count >= 3');

// 5b: returns 'bar' when count < 3
fc.assert(
  fc.property(fc.integer({ min: 0, max: 2 }), (count) => {
    return selectChartType(count) === 'bar';
  }),
  { numRuns: 100 }
);
console.log('  ✓ 5b: returns bar when count < 3');

// 5c: result is always one of 'radar' or 'bar'
fc.assert(
  fc.property(frameworkCountArb, (count) => {
    const result = selectChartType(count);
    return result === 'radar' || result === 'bar';
  }),
  { numRuns: 100 }
);
console.log('  ✓ 5c: result is always radar or bar');

console.log('Property 5: PASSED\n');

// ============================================
// Property 13: Chart I18n Label Generation
// Feature: grc-advanced-dashboards, Property 13: Chart I18n Label Generation
// **Validates: Requirements 14.1**
//
// For any language ('ar' or 'en') and translation map with charts.* keys,
// getChartLabels returns all non-empty strings. Different language maps
// produce different labels.
// ============================================

console.log('--- Property 13: Chart I18n Label Generation ---');

// 13a: all returned labels are non-empty strings
fc.assert(
  fc.property(langArb, (lang) => {
    const translations = buildTranslationMap(lang);
    const labels = getChartLabels(lang, translations);
    return Object.values(labels).every(v => typeof v === 'string' && v.length > 0);
  }),
  { numRuns: 100 }
);
console.log('  ✓ 13a: all returned labels are non-empty strings');

// 13b: all expected keys are present in the result
fc.assert(
  fc.property(langArb, (lang) => {
    const translations = buildTranslationMap(lang);
    const labels = getChartLabels(lang, translations);
    return CHART_KEYS.every(key => key in labels);
  }),
  { numRuns: 100 }
);
console.log('  ✓ 13b: all expected keys are present in the result');

// 13c: different language maps produce different labels
fc.assert(
  fc.property(fc.constant(null), () => {
    const enMap = buildTranslationMap('en');
    const arMap = buildTranslationMap('ar');
    const enLabels = getChartLabels('en', enMap);
    const arLabels = getChartLabels('ar', arMap);
    // At least one label should differ between languages
    return CHART_KEYS.some(key => enLabels[key] !== arLabels[key]);
  }),
  { numRuns: 1 }
);
console.log('  ✓ 13c: different language maps produce different labels');

// 13d: labels match the translation map values
fc.assert(
  fc.property(langArb, (lang) => {
    const translations = buildTranslationMap(lang);
    const labels = getChartLabels(lang, translations);
    return CHART_KEYS.every(key => labels[key] === translations[`charts.${key}`]);
  }),
  { numRuns: 100 }
);
console.log('  ✓ 13d: labels match the translation map values');

console.log('Property 13: PASSED\n');

// ============================================
console.log('=== All chart data transformation property tests PASSED ===');
