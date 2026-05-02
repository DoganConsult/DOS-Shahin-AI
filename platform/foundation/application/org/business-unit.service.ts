import { safeQuery, tenantSchema } from '../../ports/database.port.js';

export async function getBusinessUnits(tenantId: string): Promise<{ count: number; rows: any[] }> {
  const schema = tenantSchema(tenantId);
  const countResult = await safeQuery(`SELECT COUNT(*) AS count FROM "${schema}".business_units WHERE deleted_at IS NULL`);
  const listResult = await safeQuery(
    `SELECT * FROM "${schema}".business_units
     WHERE deleted_at IS NULL
     ORDER BY name_en ASC`,
  );
  
  const rawCount = countResult.rows[0]?.count;
  const count = Number.isFinite(Number(rawCount)) ? Number(rawCount) : listResult.rows.length;

  return { count, rows: listResult.rows };
}

export async function getBusinessUnitById(tenantId: string, buId: string): Promise<any | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".business_units WHERE bu_id = $1 OR id = $1 LIMIT 1`,
    [buId],
  );
  return result.rows[0] || null;
}

export async function createBusinessUnit(tenantId: string, payload: any): Promise<any> {
  const schema = tenantSchema(tenantId);
  const { name_en, name_ar, code, org_id } = payload;
  
  const result = await safeQuery(
    `INSERT INTO "${schema}".business_units (name_en, name_ar, code, org_id, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'active', NOW(), NOW())
     RETURNING *`,
    [name_en, name_ar ?? null, code ?? null, org_id],
  );
  return result.rows[0];
}

export async function updateBusinessUnit(tenantId: string, buId: string, payload: any): Promise<any | null> {
  const schema = tenantSchema(tenantId);
  const { name_en, name_ar, code, org_id, status } = payload;
  
  const result = await safeQuery(
    `UPDATE "${schema}".business_units
     SET name_en = COALESCE($2, name_en),
         name_ar = COALESCE($3, name_ar),
         code = COALESCE($4, code),
         org_id = COALESCE($5, org_id),
         status = COALESCE($6, status),
         updated_at = NOW()
     WHERE bu_id = $1 OR id = $1
     RETURNING *`,
    [buId, name_en ?? null, name_ar ?? null, code ?? null, org_id ?? null, status ?? null],
  );
  return result.rows[0] || null;
}

export async function deleteBusinessUnit(tenantId: string, buId: string): Promise<{ deleted: boolean; linkedDepartments: number }> {
  const schema = tenantSchema(tenantId);
  
  const dependencyResult = await safeQuery(
    `SELECT COUNT(*) AS count FROM "${schema}".departments WHERE bu_id = $1 AND deleted_at IS NULL`,
    [buId],
  );
  
  const result = await safeQuery(
    `UPDATE "${schema}".business_units
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE bu_id = $1 OR id = $1
     RETURNING bu_id`,
    [buId],
  );

  if (!result.rows[0]) return { deleted: false, linkedDepartments: 0 };
  
  const rawCount = dependencyResult.rows[0]?.count;
  const linkedDepartments = Number.isFinite(Number(rawCount)) ? Number(rawCount) : 0;
  
  return { deleted: true, linkedDepartments };
}
