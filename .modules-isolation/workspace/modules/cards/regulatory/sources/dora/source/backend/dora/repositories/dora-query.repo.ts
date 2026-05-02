import { safeQuery, tenantSchema } from '../ports/database.port';

export async function listDoraRecords(tenantId: string, _filters?: Record<string, string>) {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".dora_records WHERE deleted_at IS NULL ORDER BY created_at DESC`,
  ).catch(() => ({ rows: [] }));
  return { rows, total: rows.length };
}

export async function getDoraRecordById(tenantId: string, id: string) {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".dora_records WHERE id = $1 AND deleted_at IS NULL`, [id],
  ).catch(() => ({ rows: [] }));
  return rows[0] || null;
}
