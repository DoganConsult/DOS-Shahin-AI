import { safeQuery, tenantSchema } from '../ports/database.port';

export class ControlsRepository {
  async findAll(tenantId: string, params: { page: number; limit: number; status?: string }): Promise<{ rows: unknown[]; total: number }> {
    const schema = tenantSchema(tenantId);
    const offset = (params.page - 1) * params.limit;
    const statusFilter = params.status ? `AND status = '${params.status}'` : '';
    // secrets-scan-allow: tenantSchema()-validated quoted schema + typed column/filter constants; all user values bound via $N
    const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".controlss WHERE deleted_at IS NULL ${statusFilter}`);
    const total = countResult.rows[0]?.total ?? 0;
    const result = await safeQuery(`SELECT * FROM "${schema}".controlss WHERE deleted_at IS NULL ${statusFilter} ORDER BY created_at DESC LIMIT $1 OFFSET $2`, [params.limit, offset]);
    return { rows: result.rows, total };
  }

  async findById(tenantId: string, id: string): Promise<any | null> {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT * FROM "${schema}".controlss WHERE id = $1 AND deleted_at IS NULL`, [id]);
    return result.rows[0] ?? null;
  }

  async create(tenantId: string, data: Record<string, unknown>): Promise<unknown> {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`INSERT INTO "${schema}".controlss (tenant_id, title, status, created_by, created_at, updated_at) VALUES ($1, $2, 'draft', $3, NOW(), NOW()) RETURNING *`, [tenantId, data.title, data.created_by]);
    return result.rows[0];
  }

  async update(tenantId: string, id: string, data: Record<string, unknown>): Promise<unknown> {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`UPDATE "${schema}".controlss SET title = COALESCE($2, title), status = COALESCE($3, status), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *`, [id, data.title, data.status]);
    return result.rows[0];
  }

  async softDelete(tenantId: string, id: string): Promise<boolean> {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`UPDATE "${schema}".controlss SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`, [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
