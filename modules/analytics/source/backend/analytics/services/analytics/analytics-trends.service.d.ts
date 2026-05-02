import type { KPISnapshot } from '../misc/analytics.types';
/**
 * Runs the daily KPI aggregation job for a tenant.
 * Computes current KPIs and inserts a snapshot row for today's date.
 */
export declare function runAggregationJob(tenantId: string): Promise<void>;
/**
 * Returns KPI trend snapshots for a tenant within a date range.
 * Results are ordered by snapshot_date ascending.
 */
export declare function getKPITrends(tenantId: string, startDate: Date, endDate: Date): Promise<KPISnapshot[]>;
