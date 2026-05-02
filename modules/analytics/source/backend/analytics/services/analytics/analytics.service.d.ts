export type { TenantKPIs, KPISnapshot, DashboardWidget, DashboardConfig } from '../misc/analytics.types';
export { computeKPIs } from './analytics-kpi.service';
export { saveDashboardConfig, getDashboardConfig, serializeDashboardConfig, deserializeDashboardConfig, } from './analytics-dashboard.service';
export { runAggregationJob, getKPITrends } from './analytics-trends.service';
export { type BenchmarkResult, getBenchmarkData, linearRegression, projectKPI, } from './analytics-benchmarking.service';
export { recalculateCompliancePostureIncremental } from './analytics-compliance.service';
export { computeTenantHealthScore } from './analytics-health.service';
