"use strict";
// ============================================
// Shahin GRC — Chart GRC Core Service
// Pre-aggregated chart data for core GRC dashboard views
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGrcCoreDashboard = getGrcCoreDashboard;
const database_port_1 = require("../../ports/database.port");
async function getGrcCoreDashboard(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const [controls, frameworks, evidence, riskTreatment, activity] = await Promise.all([
        (0, database_port_1.query)(`SELECT domain, COUNT(*)::int as total,
           COUNT(*) FILTER (WHERE status = 'implemented')::int as implemented,
           COUNT(*) FILTER (WHERE status = 'tested')::int as tested
           FROM "${schema}".controls GROUP BY domain ORDER BY domain LIMIT 20`),
        (0, database_port_1.query)(`SELECT title, compliance_score, control_count FROM "${schema}".frameworks ORDER BY title LIMIT 20`),
        (0, database_port_1.query)(`SELECT status, COUNT(*)::int as count FROM "${schema}".evidence GROUP BY status`),
        (0, database_port_1.query)(`SELECT treatment_status as status, COUNT(*)::int as count FROM "${schema}".risks GROUP BY treatment_status`),
        (0, database_port_1.query)(`SELECT created_at as date, module, action, summary FROM "${schema}".activity_log ORDER BY created_at DESC LIMIT 20`),
    ]);
    return {
        controlsByDomain: controls.rows.map((r) => ({ domain: r.domain, total: r.total, implemented: r.implemented, tested: r.tested })),
        frameworkScores: frameworks.rows.map((r) => ({ name: r.title, score: r.compliance_score || 0, controlCount: r.control_count || 0 })),
        evidenceByStatus: evidence.rows.map((r) => ({ status: r.status, count: r.count })),
        risksByTreatment: riskTreatment.rows.map((r) => ({ status: r.status, count: r.count })),
        recentActivity: activity.rows.map((r) => ({
            date: r.date?.toISOString?.() || '',
            module: r.module,
            action: r.action,
            summary: r.summary,
        })),
    };
}
//# sourceMappingURL=chart-grc-core.service.js.map