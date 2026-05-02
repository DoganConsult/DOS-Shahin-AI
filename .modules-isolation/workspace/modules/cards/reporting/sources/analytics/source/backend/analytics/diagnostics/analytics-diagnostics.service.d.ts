export interface DiagnosticsResult {
    moduleCode: string;
    healthy: boolean;
    checks: {
        name: string;
        passed: boolean;
        detail?: string;
    }[];
    checkedAt: string;
}
/**
 * Analytics module diagnostics -- deep health checks beyond basic schema presence.
 *
 * Covers:
 *   - Schema and table existence
 *   - Data freshness (KPI snapshots, dashboard updates)
 *   - KPI computation health (active definitions, recent snapshots)
 *   - Cross-module data availability (risk, compliance, evidence sources)
 *   - Materialized view / cache freshness
 *   - Stale dashboard detection
 *
 * MP-12 SS12: Diagnostics and admin requirements.
 */
export declare function runDiagnostics(tenantId: string): Promise<DiagnosticsResult>;
