"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLatestCycleResult = getLatestCycleResult;
const logger_port_1 = require("../../ports/logger.port");
// ============================================
// Shahin GRC — Advanced Analytics Helpers
// Shared helper functions for advanced analytics modules
// ============================================
const database_port_1 = require("../../ports/database.port");
/**
 * Get latest AGRC-OS cycle result from tenant's cycle log
 */
async function getLatestCycleResult(tenantId) {
    try {
        const schema = (0, database_port_1.tenantSchema)(tenantId);
        const result = await (0, database_port_1.safeQuery)(`SELECT
        cycle_id,
        telemetry_ingested,
        controls_evaluated,
        risks_recomputed,
        policy_decisions,
        enforcement_actions,
        audit_entries,
        cycle_ms,
        executed_at
       FROM "${schema}".agrc_os_cycle_log
       ORDER BY executed_at DESC
       LIMIT 1`);
        if (result.rows[0]) {
            const row = result.rows[0];
            return {
                tenantId: tenantId,
                telemetryIngested: row.telemetry_ingested || 0,
                controlsEvaluated: row.controls_evaluated || 0,
                risksRecomputed: row.risks_recomputed || 0,
                policyDecisions: row.policy_decisions || 0,
                enforcementActions: row.enforcement_actions || 0,
                auditEntries: row.audit_entries || 0,
                cycleMs: row.cycle_ms || 0,
                completedAt: row.executed_at?.toISOString() || new Date().toISOString(),
            };
        }
    }
    catch (err) {
        // Non-fatal: cycle log may not exist yet
        logger_port_1.logger.warn('[AdvancedAnalytics] Could not fetch cycle result:', err instanceof Error ? err.message : String(err));
    }
    return null;
}
//# sourceMappingURL=advanced-analytics.helpers.js.map