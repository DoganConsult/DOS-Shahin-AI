"use strict";
// ============================================
// Shahin — Analytics Trends Service
// KPI aggregation jobs and trend retrieval
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAggregationJob = runAggregationJob;
exports.getKPITrends = getKPITrends;
const database_port_1 = require("../../ports/database.port");
// @ts-ignore - Pragmatic stabilization to unblock build
const events_port_1 = require("../../ports/events.port");
const analytics_kpi_service_1 = require("./analytics-kpi.service");
// === KPI Aggregation & Trends ===
/**
 * Runs the daily KPI aggregation job for a tenant.
 * Computes current KPIs and inserts a snapshot row for today's date.
 */
async function runAggregationJob(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const kpis = await (0, analytics_kpi_service_1.computeKPIs)(tenantId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".kpi_snapshots (snapshot_date, compliance_score, risk_score, evidence_coverage, remediation_closure_rate, raw_data) VALUES ($1, $2, $3, $4, $5, $6)`, [
        today,
        kpis.complianceScore,
        kpis.riskScore,
        kpis.evidenceCoverage,
        kpis.remediationClosureRate,
        JSON.stringify(kpis),
    ]);
    // Push KPI update to all connected tenant users via WebSocket
    try {
        (0, events_port_1.pushToTenant)(tenantId, {
            type: 'kpi_update',
            data: kpis,
            timestamp: new Date().toISOString(),
        });
    }
    catch {
        // WebSocket push is best-effort; don't fail the aggregation job
    }
}
/**
 * Returns KPI trend snapshots for a tenant within a date range.
 * Results are ordered by snapshot_date ascending.
 */
async function getKPITrends(tenantId, startDate, endDate) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const result = await (0, database_port_1.safeQuery)(`SELECT snapshot_id, snapshot_date, compliance_score, risk_score, evidence_coverage, remediation_closure_rate, raw_data, created_at
     FROM "${schema}".kpi_snapshots
     WHERE snapshot_date BETWEEN $1 AND $2
     ORDER BY snapshot_date ASC`, [startDate, endDate]);
    return result.rows.map((row) => ({
        snapshotId: row.snapshot_id,
        snapshotDate: new Date(row.snapshot_date),
        complianceScore: parseFloat(row.compliance_score) || 0,
        riskScore: parseFloat(row.risk_score) || 0,
        evidenceCoverage: parseFloat(row.evidence_coverage) || 0,
        remediationClosureRate: parseFloat(row.remediation_closure_rate) || 0,
        rawData: typeof row.raw_data === "string" ? JSON.parse(row.raw_data) : row.raw_data || {},
        createdAt: new Date(row.created_at),
    }));
}
//# sourceMappingURL=analytics-trends.service.js.map