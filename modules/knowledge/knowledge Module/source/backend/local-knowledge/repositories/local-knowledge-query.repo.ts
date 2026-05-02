import { safeQuery, tenantSchema } from '../ports/database.port';

export async function listlocal_knowledgeRecords(tenantId: string, _filters?: Record<string, string>) {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".local_knowledge_records WHERE deleted_at IS NULL ORDER BY created_at DESC`,
  ).catch(() => ({ rows: [] }));
  return { rows, total: rows.length };
}

export async function getlocal_knowledgeRecordById(tenantId: string, id: string) {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".local_knowledge_records WHERE id = $1 AND deleted_at IS NULL`, [id],
  ).catch(() => ({ rows: [] }));
  return rows[0] || null;
}
