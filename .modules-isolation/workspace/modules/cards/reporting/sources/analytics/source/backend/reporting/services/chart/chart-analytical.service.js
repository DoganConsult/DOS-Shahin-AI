"use strict";
// ============================================
// Shahin — Chart Analytical Service
// Pre-aggregated chart data for analytical dashboard views
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnalyticalDashboard = getAnalyticalDashboard;
const database_port_1 = require("../../ports/database.port");
async function getAnalyticalDashboard(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const [riskDist, compTrend, ctrlEff, findings] = await Promise.all([
        (0, database_port_1.query)(`SELECT category, COUNT(*)::int as count FROM "${schema}".risks GROUP BY category ORDER BY count DESC LIMIT 10`),
        (0, database_port_1.query)(`SELECT DATE(updated_at) as date, AVG(compliance_score)::float as score FROM "${schema}".frameworks GROUP BY DATE(updated_at) ORDER BY date DESC LIMIT 30`),
        (0, database_port_1.query)(`SELECT domain, COUNT(*) FILTER (WHERE status = 'effective')::int as effective, COUNT(*)::int as total FROM "${schema}".controls GROUP BY domain ORDER BY domain LIMIT 20`),
        (0, database_port_1.query)(`SELECT title, severity, COUNT(*)::int as count FROM "${schema}".findings GROUP BY title, severity ORDER BY count DESC LIMIT 10`),
    ]);
    return {
        riskDistribution: riskDist.rows.map((r) => ({ category: r.category, count: r.count })),
        complianceTrend: compTrend.rows.map((r) => ({ date: r.date?.toISOString?.() || '', score: r.score || 0 })),
        controlEffectiveness: ctrlEff.rows.map((r) => ({ domain: r.domain, effective: r.effective, total: r.total })),
        topFindings: findings.rows.map((r) => ({ title: r.title, severity: r.severity, count: r.count })),
    };
}
//# sourceMappingURL=chart-analytical.service.js.map