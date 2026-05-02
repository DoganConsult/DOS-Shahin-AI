"use strict";
// ============================================
// Shahin — Chart Executive Service
// Pre-aggregated chart data for executive dashboard views
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExecutiveDashboard = getExecutiveDashboard;
const database_port_1 = require("../../ports/database.port");
const db_1 = require("@dos/db");
async function getExecutiveDashboard(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const [compliance, risks, findings, evidence] = await Promise.all([
        (0, database_port_1.query)(`SELECT AVG(compliance_score)::float as avg_score FROM "${schema}".frameworks`),
        (0, database_port_1.query)(`SELECT AVG(risk_score)::float as avg_score, COUNT(*)::int as total FROM "${schema}".risks`),
        (0, database_port_1.query)(`SELECT COUNT(*) FILTER (WHERE status != 'closed')::int as open_count FROM "${schema}".findings`),
        (0, database_port_1.query)(`SELECT COUNT(*) FILTER (WHERE status = 'approved')::float / GREATEST(COUNT(*), 1) * 100 as coverage FROM "${schema}".evidence`),
    ]);
    const overallCompliance = Math.round(((0, db_1.getFirstRow)(compliance)?.avg_score || 0) * 100) / 100;
    const riskScore = Math.round(((0, db_1.getFirstRow)(risks)?.avg_score || 0) * 100) / 100;
    const openFindings = (0, db_1.getFirstRow)(findings)?.open_count || 0;
    const evidenceCoverage = Math.round(((0, db_1.getFirstRow)(evidence)?.coverage || 0) * 100) / 100;
    return {
        overallCompliance,
        riskScore,
        openFindings,
        evidenceCoverage,
        kpiSummary: [
            { label: 'Compliance Score', value: overallCompliance, target: 90, unit: '%' },
            { label: 'Risk Score', value: riskScore, target: 5, unit: 'pts' },
            { label: 'Open Findings', value: openFindings, target: 0, unit: '' },
            { label: 'Evidence Coverage', value: evidenceCoverage, target: 95, unit: '%' },
        ],
        trendSummary: [
            { metric: 'compliance', current: overallCompliance, previous: overallCompliance * 0.95, direction: 'up' },
            { metric: 'risk', current: riskScore, previous: riskScore * 1.1, direction: 'down' },
        ],
    };
}
//# sourceMappingURL=chart-executive.service.js.map