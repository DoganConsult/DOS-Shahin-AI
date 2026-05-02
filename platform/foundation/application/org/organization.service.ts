import { safeQuery, tenantSchema } from '../../ports/database.port.js';

export async function getOrganizations(tenantId: string): Promise<{ count: number; rows: any[] }> {
  const schema = tenantSchema(tenantId);
  const countResult = await safeQuery(`SELECT COUNT(*) AS count FROM "${schema}".organizations WHERE deleted_at IS NULL`);
  const listResult = await safeQuery(
    `SELECT * FROM "${schema}".organizations
     WHERE deleted_at IS NULL
     ORDER BY name_en ASC`,
  );
  
  const rawCount = countResult.rows[0]?.count;
  const count = Number.isFinite(Number(rawCount)) ? Number(rawCount) : listResult.rows.length;

  return { count, rows: listResult.rows };
}

export async function getOrganizationBusinessUnits(tenantId: string, orgId: string): Promise<{ count: number; rows: any[] }> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".business_units WHERE org_id = $1 AND deleted_at IS NULL ORDER BY name_en ASC`,
    [orgId],
  );

  return { count: result.rows.length, rows: result.rows };
}

export async function getOrganizationById(tenantId: string, orgId: string): Promise<any | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".organizations WHERE org_id = $1 OR id = $1 LIMIT 1`,
    [orgId],
  );
  return result.rows[0] || null;
}

export async function createOrganization(tenantId: string, payload: any): Promise<any> {
  const schema = tenantSchema(tenantId);
  const { name_en, metadata, name_ar, code, status } = payload;
  
  const result = await safeQuery(
    `INSERT INTO "${schema}".organizations (name_en, name_ar, code, status, metadata, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     RETURNING *`,
    [name_en, name_ar ?? null, code ?? null, status ?? 'active', metadata ? JSON.stringify(metadata) : null],
  );
  return result.rows[0];
}

export async function updateOrganization(tenantId: string, orgId: string, payload: any): Promise<any | null> {
  const schema = tenantSchema(tenantId);
  const { name_en, name_ar, code, status, metadata } = payload;
  
  const result = await safeQuery(
    `UPDATE "${schema}".organizations
     SET name_en = COALESCE($2, name_en),
         name_ar = COALESCE($3, name_ar),
         code = COALESCE($4, code),
         status = COALESCE($5, status),
         metadata = COALESCE($6, metadata),
         updated_at = NOW()
     WHERE org_id = $1 OR id = $1
     RETURNING *`,
    [orgId, name_en ?? null, name_ar ?? null, code ?? null, status ?? null, metadata ? JSON.stringify(metadata) : null],
  );
  return result.rows[0] || null;
}

export async function deleteOrganization(tenantId: string, orgId: string): Promise<{ deleted: boolean; linkedBusinessUnits: number }> {
  const schema = tenantSchema(tenantId);
  
  const dependencyResult = await safeQuery(
    `SELECT COUNT(*) AS count FROM "${schema}".business_units WHERE org_id = $1 AND deleted_at IS NULL`,
    [orgId],
  );
  
  const result = await safeQuery(
    `UPDATE "${schema}".organizations
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE org_id = $1 OR id = $1
     RETURNING org_id`,
    [orgId],
  );

  if (!result.rows[0]) return { deleted: false, linkedBusinessUnits: 0 };
  
  const rawCount = dependencyResult.rows[0]?.count;
  const linkedBusinessUnits = Number.isFinite(Number(rawCount)) ? Number(rawCount) : 0;
  
  return { deleted: true, linkedBusinessUnits };
}
