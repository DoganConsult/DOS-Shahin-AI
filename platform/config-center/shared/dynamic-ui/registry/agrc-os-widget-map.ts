/**
 * @deprecated
 * @removal-date Phase 6 (Frontend consumption)
 * @owner DOS
 * @replacement DAuth frontend services (core/dauth/) — Backend key → frontend ID mapping is now handled by WidgetManifest.key
 * and WidgetRegistryService.getByKey(). This file is kept for backwards compatibility.
 *
 * The new registry resolves backend keys directly via manifest.key without this intermediate map.
 */
const OVERRIDES: Record<string, string> = {
  compliance_overview: 'framework-coverage',
  executive_summary: 'program-health',
  evidence_freshness: 'evidence-donut-echart',
  assessment_progress: 'assessment-honesty',
  top_risks: 'top-risks-echart',
  maturity_gauge: 'maturity-gap',
  animated_ranking: 'animated-ranking-echart',
  bullet_chart: 'bullet-chart-echart',
  risk_waterfall: 'risk-bridge-waterfall',
  control_testing: 'control-testing-donut',
  risk_distribution_echart: 'risk-distribution-echart',
  findings_funnel: 'findings-funnel',
  chord_diagram: 'chord-diagram',
  entity_graph: 'entity-graph',
  network_graph: 'network-graph-enhanced',
  audit_findings_heatmap: 'audit-findings-heatmap',
  compliance_heatmap: 'compliance-heatmap-cc',
  remediation_velocity: 'remediation-velocity',
  rolling_forecast: 'rolling-forecast',
  maturity_spider: 'maturity-spider',
  control_coverage_sankey: 'control-coverage-sankey',
  evidence_flow: 'evidence-flow-sankey',
  workflow_sankey: 'workflow-sankey',
  risk_constellation: 'risk-constellation',
  vendor_risk_bubble: 'vendor-risk-bubble-enhanced',
  bcp_status: 'bcp-status',
  blast_radius: 'blast-radius',
  chart_carousel: 'chart-carousel',
  compliance_treemap: 'compliance-coverage-treemap',
  grc_pulse_river: 'grc-pulse-river',
  incident_seismograph: 'incident-seismograph',
  kpi_tiles: 'kpi-tiles-animated',
  process_flow: 'process-flow',
  control_effectiveness: 'control-effectiveness-boxplot',
  monte_carlo: 'monte-carlo-distribution',
  parallel_coordinates: 'parallel-coordinates',
  tornado_sensitivity: 'tornado-sensitivity',
  compliance_mesh_3d: 'compliance-mesh-3d',
  evidence_globe_3d: 'evidence-globe-3d',
  risk_surface_3d: 'risk-surface-3d',
  anomaly_timeline: 'anomaly-timeline',
  gantt_timeline: 'gantt-timeline',
  ninety_day_timeline: 'ninety-day-timeline',
  workflow_timeline: 'workflow-timeline-cc',
  d3_animated_bar: 'd3-animated-bar',
  d3_animated_donut: 'd3-animated-donut',
  d3_gauge: 'd3-gauge',
  d3_progress_ring: 'd3-progress-ring',
  d3_radar: 'd3-radar',
  d3_risk_heatmap: 'd3-risk-heatmap',
  d3_sparkline: 'd3-sparkline',
  activity_feed: 'activity-feed',
  'executive-summary': 'engine-executive-summary-widget',
  'top-breached-kris': 'top-breached-kris-widget',
  'policy-review-debt': 'policy-review-debt-widget',
  'engine-trend': 'engine-trend-widget',
};

/** @deprecated
 * @removal-date Phase 6 (Frontend consumption)
 * @owner DOS
 * @replacement DAuth frontend services (core/dauth/) — Use WidgetRegistryService.getByKey() instead. */
export function agrcOsWidgetKeyToId(widgetKey: string): string {
  if (OVERRIDES[widgetKey]) return OVERRIDES[widgetKey];
  return widgetKey.replace(/_/g, '-');
}
