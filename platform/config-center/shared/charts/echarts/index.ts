// Theme
export { grc } from './grc-echarts-theme';
export type { GrcTheme } from './grc-echarts-theme';

// Existing charts
export { buildRiskHeatmapOptions } from './risk/risk-heatmap.options';
export type { HeatmapCell } from './risk/risk-heatmap.options';
export { buildMaturityRadarOptions } from './maturity/maturity-radar.options';
export type { MaturityValue } from './maturity/maturity-radar.options';
export { buildVendorBubbleOptions } from './kpi-misc/vendor-trends/vendor-bubble.options';
export type { VendorPoint } from './kpi-misc/vendor-trends/vendor-bubble.options';
export { buildSparklineOptions } from '../../../features/dashboard/charts/sparkline.options';

// Core charts
export { buildComplianceGaugeOptions } from '../../../features/dashboard/charts/compliance-gauge.options';
export { buildFindingsBarOptions } from '../../../features/dashboard/charts/findings-bar.options';
export type { FindingCategory } from '../../../features/dashboard/charts/findings-bar.options';
export { buildEvidenceDonutOptions } from './evidence/evidence-donut.options';
export type { EvidenceSlice } from './evidence/evidence-donut.options';
export { buildTrendLineOptions } from '../../../features/dashboard/charts/trend-line.options';
export type { TrendSeries, TrendPoint } from '../../../features/dashboard/charts/trend-line.options';

// Advanced charts
export { buildFindingsFunnelOptions } from './findings/findings-funnel.options';
export type { FunnelStage } from './findings/findings-funnel.options';
export { buildWorkflowSankeyOptions } from './workflow-timeline/workflow-sankey.options';
export type { SankeyNode, SankeyLink } from './workflow-timeline/workflow-sankey.options';
export { buildRiskAppetiteGaugeOptions } from './risk/risk-appetite-gauge.options';

// Timelines
export { buildGrcTimelineOptions } from './workflow-timeline/grc-timeline.options';
export type { TimelineEvent } from './workflow-timeline/grc-timeline.options';
export { buildComplianceTimelineOptions } from './compliance-governance/compliance-timeline.options';
export type { ComplianceMilestone } from './compliance-governance/compliance-timeline.options';
export { buildGanttTimelineOptions } from './workflow-timeline/gantt-timeline.options';
export type { GanttBar } from './workflow-timeline/gantt-timeline.options';
export { buildAnomalyTimelineOptions } from './findings/anomaly-timeline.options';
export type { AnomalyPoint } from './findings/anomaly-timeline.options';

// Lifecycle
export { buildLifecycleFlowOptions } from './lifecycle-flow.options';
export type { LifecycleNode, LifecycleEdge } from './lifecycle-flow.options';
