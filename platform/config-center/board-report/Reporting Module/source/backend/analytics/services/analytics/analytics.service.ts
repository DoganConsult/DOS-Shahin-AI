import { safeQuery } from "@dos/db";

// ============================================
// Shahin — Analytics Service (Barrel)
// Re-exports all analytics sub-modules to
// preserve backward compatibility for consumers
// ============================================

// Types
export type { TenantKPIs, KPISnapshot, DashboardWidget, DashboardConfig } from '../misc/analytics.types';

// KPI computation
export { computeKPIs } from './analytics-kpi.service';

// Dashboard configuration & serialization
export {
  saveDashboardConfig,
  getDashboardConfig,
  serializeDashboardConfig,
  deserializeDashboardConfig,
} from './analytics-dashboard.service';

// KPI aggregation & trends
export { runAggregationJob, getKPITrends } from './analytics-trends.service';

// Benchmarking, linear regression & projection
export {
  type BenchmarkResult,
  getBenchmarkData,
  linearRegression,
  projectKPI,
} from './analytics-benchmarking.service';

// Incremental compliance posture
export { recalculateCompliancePostureIncremental } from './analytics-compliance.service';

// Tenant health score
export { computeTenantHealthScore } from './analytics-health.service';
