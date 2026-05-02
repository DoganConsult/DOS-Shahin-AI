import type { TenantKPIs } from '../misc/analytics.types';
export interface BenchmarkResult {
    tenantKPIs: TenantKPIs;
    percentiles: {
        complianceScore: number;
        riskScore: number;
        evidenceCoverage: number;
        remediationClosureRate: number;
    };
    industryAvg: {
        complianceScore: number;
        riskScore: number;
        evidenceCoverage: number;
        remediationClosureRate: number;
    };
    sampleSize: number;
}
/**
 * Returns anonymized cross-tenant benchmark data.
 * Computes the requesting tenant's KPIs, then aggregates KPIs across all
 * active tenants to produce percentile rankings and industry averages.
 */
export declare function getBenchmarkData(tenantId: string): Promise<BenchmarkResult>;
/**
 * Pure linear regression: given data points [{x, y}], returns slope and intercept.
 * Requires minimum 2 data points.
 */
export declare function linearRegression(points: {
    x: number;
    y: number;
}[]): {
    slope: number;
    intercept: number;
} | null;
/**
 * Projects a KPI value at a future date using linear regression on historical snapshots.
 * Returns null if fewer than 2 data points.
 */
export declare function projectKPI(snapshots: {
    date: Date;
    value: number;
}[], targetDate: Date): number | null;
