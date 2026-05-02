// Theme
export { grc } from './grc-echarts-theme';
export type { GrcTheme } from './grc-echarts-theme';

// Existing charts
export { buildRiskHeatmapOptions } from './risk-heatmap.options';
export type { HeatmapCell } from './risk-heatmap.options';
export { buildMaturityRadarOptions } from './maturity-radar.options';
export type { MaturityValue } from './maturity-radar.options';
export { buildVendorBubbleOptions } from './vendor-bubble.options';
export type { VendorPoint } from './vendor-bubble.options';
export { buildSparklineOptions } from './sparkline.options';

// New charts
// Compliance gauge options now owned by modules/compliance (Rule #2 — moved
// 2026-04-30, advanced AI-driven rewrite). Re-exported here for legacy callers.
export {
  buildComplianceGaugeOptions,
  buildAdvancedComplianceGaugeOptions,
} from '@compliance-module/ui/charts/compliance-gauge.options';
export type {
  ComplianceGaugeInput,
  ComplianceGaugeAIInsight,
  ComplianceGaugeBenchmark,
  ComplianceGaugeThresholds,
  GaugeLocale,
} from '@compliance-module/ui/charts/compliance-gauge.options';
export { buildFindingsBarOptions } from './findings-bar.options';
export type { FindingCategory } from './findings-bar.options';
export { buildEvidenceDonutOptions } from './evidence-donut.options';
export type { EvidenceSlice } from './evidence-donut.options';
export { buildTrendLineOptions } from './trend-line.options';
export type { TrendSeries, TrendPoint } from './trend-line.options';
