"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutiveRepository = void 0;
const database_port_1 = require("../ports/database.port");
class ExecutiveRepository {
    static async getRiskSummary(tenantId) {
        const schema = (0, database_port_1.tenantSchema)(tenantId);
        return (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE risk_score >= 20)::int AS critical,
              COALESCE(AVG(risk_score), 0)::numeric(5,1) AS avg_score
       FROM "${schema}".risks WHERE status != 'closed'`);
    }
    static async getComplianceControlSummary(tenantId) {
        const schema = (0, database_port_1.tenantSchema)(tenantId);
        return (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status IN ('implemented','effective'))::int AS passing
       FROM "${schema}".controls`);
    }
    static async getActiveFrameworksCount(tenantId) {
        const schema = (0, database_port_1.tenantSchema)(tenantId);
        return (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS cnt FROM "${schema}".frameworks WHERE status = 'active'`);
    }
    static async getIncidentSummary(tenantId) {
        const schema = (0, database_port_1.tenantSchema)(tenantId);
        return (0, database_port_1.safeQuery)(`SELECT COUNT(*) FILTER (WHERE status != 'resolved')::int AS open,
              COUNT(*) FILTER (WHERE status = 'resolved' AND resolved_at >= NOW() - INTERVAL '30 days')::int AS resolved_30d
       FROM "${schema}".incidents`);
    }
}
exports.ExecutiveRepository = ExecutiveRepository;
//# sourceMappingURL=executive.repository.js.map