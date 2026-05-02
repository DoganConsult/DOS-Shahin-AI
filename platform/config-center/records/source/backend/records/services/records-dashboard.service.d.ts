/**
 * RecordsDashboardService -- Enterprise Records Dashboard
 * =========================================================
 * Aggregates records management statistics by status, retention
 * compliance, disposition tracking, and lifecycle health for
 * operational dashboards and admin surfaces.
 *
 * All data is derived from tenant-scoped records tables via
 * `tenantSchema(tenantId)` for strict tenant isolation.
 *
 * @owner records
 * @module records
 * @since 2026-03-31
 */
/** Top-level dashboard summary for the records module. */
export interface RecordsDashboardSummary {
    tenantId: string;
    totalRecords: number;
    activeRecords: number;
    archivedRecords: number;
    pendingDisposalRecords: number;
    retentionCompliantCount: number;
    retentionNonCompliantCount: number;
    retentionComplianceRate: number;
    onLegalHold: number;
    recentlyCreated: number;
}
export declare class RecordsDashboardService {
    /**
     * Aggregate dashboard summary for a tenant: records by status (active,
     * archived, pending_disposal), retention compliance rates, legal hold
     * count, and recently created records (last 30 days).
     */
    getDashboardSummary(tenantId: string): Promise<RecordsDashboardSummary>;
}
