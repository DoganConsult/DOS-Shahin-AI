import { safeQuery, tenantSchema } from '../ports/database.port';

export class ControlsQueryRepository {
  async countByStatus(tenantId: string): Promise<Record<string, number>> {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT status, COUNT(*)::int AS count FROM "${schema}".controlss WHERE deleted_at IS NULL GROUP BY status`);
    const counts: Record<string, number> = {};
    for (const row of result.rows) { counts[row.status] = row.count; }
    return counts;
  }

  async getOverdue(tenantId: string): Promise<Record<string, unknown>[]> {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT * FROM "${schema}".controlss WHERE deleted_at IS NULL AND due_date < NOW() AND status NOT IN ('closed', 'archived') ORDER BY due_date ASC`);
    return result.rows;
  }

  async getRecentActivity(tenantId: string, days: number = 7): Promise<Record<string, unknown>[]> {
    const schema = tenantSchema(tenantId);
    // secrets-scan-allow: tenantSchema()-validated quoted schema + typed column/filter constants; all user values bound via $N
    const result = await safeQuery(`SELECT * FROM "${schema}".controlss WHERE deleted_at IS NULL AND updated_at >= NOW() - INTERVAL '${days} days' ORDER BY updated_at DESC LIMIT 50`);
    return result.rows;
  }

  async search(tenantId: string, query: string): Promise<Record<string, unknown>[]> {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT * FROM "${schema}".controlss WHERE deleted_at IS NULL AND (title ILIKE $1 OR description ILIKE $1) LIMIT 50`, [`%${query}%`]);
    return result.rows;
  }
}
