/**
 * ActionDashboardService -- Enterprise Action Item Dashboard
 * ====================================================
 * Aggregates action item health, trend data, status/priority distributions,
 * and summary statistics for operational dashboards and admin surfaces.
 *
 * All data is derived from tenant-scoped action tables via
 * `tenantSchema(tenantId)` for strict tenant isolation.
 *
 * @owner action
 * @module action
 * @since 2026-03-31
 */
/** Action item status breakdown counts. */
export interface ActionStatusCounts {
    open: number;
    in_progress: number;
    completed: number;
    overdue: number;
}
/** Action item priority breakdown counts. */
export interface ActionPriorityCounts {
    critical: number;
    high: number;
    medium: number;
    low: number;
}
/** Top-level dashboard summary. */
export interface ActionDashboardSummary {
    tenantId: string;
    totalActions: number;
    byStatus: ActionStatusCounts;
    byPriority: ActionPriorityCounts;
    unassigned: number;
}
/** Health score result. */
export interface ActionHealth {
    tenantId: string;
    healthScore: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    overdueActions: number;
    unassignedItems: number;
    evaluatedAt: string;
}
/** Daily trend data point. */
export interface ActionTrendDataPoint {
    date: string;
    actionsCreated: number;
    actionsCompleted: number;
}
export declare class ActionDashboardService {
    /**
     * Aggregate dashboard summary for a tenant: total action items by
     * status and priority, plus count of unassigned items.
     */
    getDashboardSummary(tenantId: string): Promise<ActionDashboardSummary>;
    /**
     * Compute a health score (0-100) based on action item posture.
     *
     * Algorithm:
     *   - Base score: 100
     *   - Penalty: -10 per overdue action (capped at -50)
     *   - Penalty: -5 per unassigned item (capped at -30)
     * Clamped to [0, 100].
     */
    getActionHealth(tenantId: string): Promise<ActionHealth>;
    /**
     * Produce daily trend data for the specified number of days.
     * Each data point includes actions created and actions completed.
     */
    getActionTrend(tenantId: string, days: number): Promise<ActionTrendDataPoint[]>;
}
