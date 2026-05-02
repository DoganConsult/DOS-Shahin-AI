import { safeQuery, tenantSchema } from '../ports/database.port';

export class PacksQueryRepository {
  private schema: string;
  constructor(tenantId: string) { this.schema = tenantSchema(tenantId); }

  async getInstallationCount(): Promise<{ total: number; active: number }> {
    const result = await safeQuery(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'active')::int AS active FROM "${this.schema}".tenant_pack_installations`);
    return result.rows[0] ?? { total: 0, active: 0 };
  }
}
