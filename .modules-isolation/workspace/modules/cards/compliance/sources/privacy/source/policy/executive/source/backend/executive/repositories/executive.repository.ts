import { z as _z } from 'zod';
import { safeQuery, tenantSchema } from '../ports/database.port';

export class ExecutiveRepository {
  static async getRiskSummary(tenantId: string) {
    const schema = tenantSchema(tenantId);
    return safeQuery(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE risk_score >= 20)::int AS critical,
              COALESCE(AVG(risk_score), 0)::numeric(5,1) AS avg_score
       FROM "${schema}".risks WHERE status != 'closed'`
    );
  }

  static async getComplianceControlSummary(tenantId: string) {
    const schema = tenantSchema(tenantId);
    return safeQuery(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status IN ('implemented','effective'))::int AS passing
       FROM "${schema}".controls`
    );
  }

  static async getActiveFrameworksCount(tenantId: string) {
    const schema = tenantSchema(tenantId);
    return safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".frameworks WHERE status = 'active'`
    );
  }

  static async getIncidentSummary(tenantId: string) {
    const schema = tenantSchema(tenantId);
    return safeQuery(
      `SELECT COUNT(*) FILTER (WHERE status != 'resolved')::int AS open,
              COUNT(*) FILTER (WHERE status = 'resolved' AND resolved_at >= NOW() - INTERVAL '30 days')::int AS resolved_30d
       FROM "${schema}".incidents`
    );
  }
}
