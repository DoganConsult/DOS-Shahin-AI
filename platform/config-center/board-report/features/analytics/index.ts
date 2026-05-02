export { AnalyticsDashboardComponent } from './dashboards/analytics-dashboard.component';
export { AnalyticsDiagnosticsComponent } from './diagnostics/analytics-diagnostics.component';
export { AnalyticsAdminComponent } from './admin/analytics-admin.component';
export { AnalyticsWidgetComponent } from './widgets/analytics-widget.component';
export { AnalyticsState } from './state/analytics.state';
export {
  METRIC_STATES,
  METRIC_TRANSITIONS,
  METRIC_TERMINAL_STATES,
  isValidMetricTransition,
  isMetricTerminal,
  isMetricCertifiable,
} from './workflows/analytics-lifecycle';
export type {
  MetricDefinitionContract,
  AggregationPipelineContract,
  SnapshotContract,
  TrendDataPoint,
  BenchmarkContract,
  AnomalyContract,
  AnalyticsDiagnosticsContract,
  AnalyticsDashboardContract,
  MetricType,
  MetricStatus,
  PipelineStatus,
  AnomalyLevel,
} from './contracts/analytics.contracts';
