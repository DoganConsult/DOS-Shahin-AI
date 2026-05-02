import { safeQuery, tenantSchema, emptyResult } from '../ports/database.port';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

export class GovernanceAiQueryRepository {
  async countSignalsByStatus(tenantId: string): Promise<Record<string, number>> {
    const schema = tenantSchema(tenantId);
    const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT status, COUNT(*)::int AS count FROM "${schema}".governance_signals WHERE deleted_at IS NULL GROUP BY status`,
    ), { tenantId, operation: 'countSignalsByStatus' });
    const counts: Record<string, number> = {};

    for (const row of result.rows) { counts[(row as any).status] = row.count; }
    return counts;
  }

  async getOverdueEscalations(tenantId: string): Promise<Record<string, unknown>[]> {
    const schema = tenantSchema(tenantId);
    const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT * FROM "${schema}".governance_escalation_events WHERE deleted_at IS NULL AND sla_deadline < NOW() AND status NOT IN ('closed', 'resolved') ORDER BY sla_deadline ASC`,
    ), { tenantId, operation: 'getOverdueEscalations' });
    return result.rows;
  }

  async getRecentSignals(tenantId: string, days: number = 7): Promise<Record<string, unknown>[]> {
    const schema = tenantSchema(tenantId);
    const safeDays = Math.max(1, Math.min(Math.floor(days), 365));
    const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT * FROM "${schema}".governance_signals WHERE deleted_at IS NULL AND detected_at >= NOW() - ($1 || ' days')::interval ORDER BY detected_at DESC LIMIT 50`,
      [safeDays],
    ), { tenantId, operation: 'getRecentSignals' });
    return result.rows;
  }

  async searchSignals(tenantId: string, query: string): Promise<Record<string, unknown>[]> {
    const schema = tenantSchema(tenantId);
    const sanitizedQuery = query.replace(/[%_\\]/g, '\\$&');
    const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT * FROM "${schema}".governance_signals WHERE deleted_at IS NULL AND tenant_id = $1 AND (signal_type ILIKE $2 OR source_module ILIKE $2) LIMIT 50`,
      [tenantId, `%${sanitizedQuery}%`],
    ), { tenantId, operation: 'searchSignals' });
    return result.rows;
  }
}
