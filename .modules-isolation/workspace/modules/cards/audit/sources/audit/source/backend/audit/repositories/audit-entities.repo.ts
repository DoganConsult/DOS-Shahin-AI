import { safeQuery, tenantSchema } from '../ports/database.port';

export async function getAuditEntities(tenantId: string, entityType?: string) {
  const schema = tenantSchema(tenantId);
  const where = entityType ? `WHERE entity_type = $1` : '';
  const params = entityType ? [entityType] : [];
  const { rows } = await safeQuery(`SELECT * FROM "${schema}".audit_trail ${where} ORDER BY created_at DESC LIMIT 100`, params);
  return rows;
}

export async function getAuditEntityById(tenantId: string, id: string) {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(`SELECT * FROM "${schema}".audit_trail WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export const AuditEntitiesRepository = (..._args: any[]): any => { return {} as any; };