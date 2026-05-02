/**
 * AssetDashboardService -- Enterprise Asset Dashboard
 * =====================================================
 * Aggregates asset inventory statistics by classification and status,
 * criticality distribution, and lifecycle health for operational
 * dashboards and admin surfaces.
 *
 * All data is derived from tenant-scoped asset tables via
 * `tenantSchema(tenantId)` for strict tenant isolation.
 *
 * @owner asset
 * @module asset
 * @since 2026-03-31
 */
/** Top-level dashboard summary for the asset module. */
export interface AssetDashboardSummary {
    tenantId: string;
    totalAssets: number;
    activeAssets: number;
    decommissionedAssets: number;
    pendingReviewAssets: number;
    byClassification: AssetClassificationCount[];
    criticalAssets: number;
    highAssets: number;
    mediumAssets: number;
    lowAssets: number;
    unclassifiedAssets: number;
    recentlyAdded: number;
}
/** Asset count grouped by classification label. */
export interface AssetClassificationCount {
    classification: string;
    count: number;
}
export declare class AssetDashboardService {
    /**
     * Aggregate dashboard summary for a tenant: assets by status
     * (active, decommissioned, pending_review), by classification label,
     * by criticality level, and recently added (last 30 days).
     */
    getDashboardSummary(tenantId: string): Promise<AssetDashboardSummary>;
}
