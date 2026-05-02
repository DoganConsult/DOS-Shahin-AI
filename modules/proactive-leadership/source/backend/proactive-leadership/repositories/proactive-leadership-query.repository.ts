import { safeQuery, tenantSchema } from '../ports/database.port';
import type { GenericRow as _GenericRow } from '@dos/types';

export class ProactiveLeadershipQueryRepository {
  private schema: string;
  constructor(tenantId: string) { this.schema = tenantSchema(tenantId); }

  async getInsightSummary(): Promise<{ total: number; bySeverity: Record<string, number> }> {
    const result = await safeQuery(
      `SELECT severity, COUNT(*)::int AS count FROM "${this.schema}".proactive_leadership_insights WHERE deleted_at IS NULL GROUP BY severity`);
    const bySeverity: Record<string, number> = {};
    let total = 0;
    for (const row of result.rows) { bySeverity[row.severity] = row.count; total += row.count; }
    return { total, bySeverity };
  }

  async getUnacknowledgedAlertCount(): Promise<number> {
    const result = await safeQuery(
      `SELECT COUNT(*)::int AS count FROM "${this.schema}".proactive_leadership_alerts WHERE acknowledged = false AND deleted_at IS NULL`);
    return result.rows[0]?.count ?? 0;
  }
}
