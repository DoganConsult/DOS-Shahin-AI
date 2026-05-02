import { safeQuery, tenantSchema } from '../ports/database.port';

export class AgrcEngineQueryRepository {
  private schema: string;
  constructor(tenantId: string) { this.schema = tenantSchema(tenantId); }

  async getRunStats(): Promise<{ total: number; completed: number; failed: number; running: number }> {
    const result = await safeQuery(
      `SELECT status, COUNT(*)::int AS count FROM "${this.schema}".agrc_engine_runs GROUP BY status`);
    const stats = { total: 0, completed: 0, failed: 0, running: 0 };
    for (const row of result.rows) { stats[row.status as keyof typeof stats] = row.count; stats.total += row.count; }
    return stats;
  }
}
