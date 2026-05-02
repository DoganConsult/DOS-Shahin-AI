"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecordsDashboardService = void 0;
const database_port_1 = require("../ports/database.port");
// -- Service ------------------------------------------------------------------
class RecordsDashboardService {
    /**
     * Aggregate dashboard summary for a tenant: records by status (active,
     * archived, pending_disposal), retention compliance rates, legal hold
     * count, and recently created records (last 30 days).
     */
    async getDashboardSummary(tenantId) {
        const schema = (0, database_port_1.tenantSchema)(tenantId);
        try {
            const result = await (0, database_port_1.safeQuery)(`SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'active')::int AS active,
           COUNT(*) FILTER (WHERE status = 'archived')::int AS archived,
           COUNT(*) FILTER (WHERE status = 'pending_disposal')::int AS pending_disposal,
           COUNT(*) FILTER (
             WHERE retention_expiry IS NOT NULL
               AND retention_expiry > NOW()
           )::int AS retention_compliant,
           COUNT(*) FILTER (
             WHERE retention_expiry IS NOT NULL
               AND retention_expiry <= NOW()
               AND status NOT IN ('archived', 'disposed')
           )::int AS retention_non_compliant,
           COUNT(*) FILTER (WHERE legal_hold = true)::int AS on_legal_hold,
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS recently_created
         FROM "${schema}".records`, []).catch(() => ({
                rows: [{
                        total: 0, active: 0, archived: 0, pending_disposal: 0,
                        retention_compliant: 0, retention_non_compliant: 0,
                        on_legal_hold: 0, recently_created: 0,
                    }],
            }));
            const row = result.rows[0] ?? {};
            const compliant = parseInt(row.retention_compliant ?? '0', 10);
            const nonCompliant = parseInt(row.retention_non_compliant ?? '0', 10);
            const retentionTotal = compliant + nonCompliant;
            return {
                tenantId,
                totalRecords: parseInt(row.total ?? '0', 10),
                activeRecords: parseInt(row.active ?? '0', 10),
                archivedRecords: parseInt(row.archived ?? '0', 10),
                pendingDisposalRecords: parseInt(row.pending_disposal ?? '0', 10),
                retentionCompliantCount: compliant,
                retentionNonCompliantCount: nonCompliant,
                retentionComplianceRate: retentionTotal > 0
                    ? Math.round((compliant / retentionTotal) * 10000) / 100
                    : 100,
                onLegalHold: parseInt(row.on_legal_hold ?? '0', 10),
                recentlyCreated: parseInt(row.recently_created ?? '0', 10),
            };
        }
        catch {
            return {
                tenantId,
                totalRecords: 0,
                activeRecords: 0,
                archivedRecords: 0,
                pendingDisposalRecords: 0,
                retentionCompliantCount: 0,
                retentionNonCompliantCount: 0,
                retentionComplianceRate: 100,
                onLegalHold: 0,
                recentlyCreated: 0,
            };
        }
    }
}
exports.RecordsDashboardService = RecordsDashboardService;
//# sourceMappingURL=records-dashboard.service.js.map