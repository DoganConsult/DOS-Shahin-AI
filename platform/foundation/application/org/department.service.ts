import { safeQuery, tenantSchema } from '../../ports/database.port.js';
import { publish as publishFoundationEvent } from '../../infrastructure/messaging/foundation.publishers.js';

export async function getDepartments(tenantId: string): Promise<{ count: number; rows: any[] }> {
  const schema = tenantSchema(tenantId);
  const countResult = await safeQuery(`SELECT COUNT(*) AS count FROM "${schema}".departments WHERE deleted_at IS NULL`);
  const listResult = await safeQuery(
    `SELECT * FROM "${schema}".departments
     WHERE deleted_at IS NULL
     ORDER BY name_en ASC`,
  );
  
  const rawCount = countResult.rows[0]?.count;
  const count = Number.isFinite(Number(rawCount)) ? Number(rawCount) : listResult.rows.length;

  return { count, rows: listResult.rows };
}

export async function getDepartmentById(tenantId: string, deptId: string): Promise<any | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".departments WHERE dept_id = $1 OR id = $1 LIMIT 1`,
    [deptId],
  );
  return result.rows[0] || null;
}

export async function createDepartment(tenantId: string, payload: any): Promise<any> {
  const schema = tenantSchema(tenantId);
  const { name_en, name_ar, code, bu_id, head_user_id } = payload;
  
  const result = await safeQuery(
    `INSERT INTO "${schema}".departments (name_en, name_ar, code, bu_id, head_user_id, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())
     RETURNING *`,
    [name_en, name_ar ?? null, code ?? null, bu_id, head_user_id ?? null],
  );
  const dept = result.rows[0];
  if (dept) {
    const deptId = dept.dept_id ?? dept.id;
    await publishFoundationEvent('foundation.dept_created', {
      eventType: 'foundation.dept_created',
      tenantId,
      entityId: deptId,
      payload: {
        tenantId,
        departmentId: deptId,
        parentId: bu_id ?? null,
        code: code ?? null,
      },
      parentId: bu_id ?? null,
    } as any).catch((): undefined => undefined);
  }
  return dept;
}

export async function updateDepartment(tenantId: string, deptId: string, payload: any): Promise<any | null> {
  const schema = tenantSchema(tenantId);
  const { name_en, name_ar, code, bu_id, head_user_id, status } = payload;

  const beforeRes = await safeQuery(
    `SELECT bu_id FROM "${schema}".departments WHERE dept_id = $1 OR id = $1 LIMIT 1`,
    [deptId],
  );
  const oldBuId: string | null = beforeRes.rows[0]?.bu_id ?? null;

  const result = await safeQuery(
    `UPDATE "${schema}".departments
     SET name_en = COALESCE($2, name_en),
         name_ar = COALESCE($3, name_ar),
         code = COALESCE($4, code),
         bu_id = COALESCE($5, bu_id),
         head_user_id = COALESCE($6, head_user_id),
         status = COALESCE($7, status),
         updated_at = NOW()
     WHERE dept_id = $1 OR id = $1
     RETURNING *`,
    [deptId, name_en ?? null, name_ar ?? null, code ?? null, bu_id ?? null, head_user_id ?? null, status ?? null],
  );
  const dept = result.rows[0] || null;
  if (dept) {
    const id = dept.dept_id ?? dept.id;
    await publishFoundationEvent('foundation.dept_updated', {
      eventType: 'foundation.dept_updated',
      tenantId,
      entityId: id,
      payload: { tenantId, departmentId: id, parentId: dept.bu_id ?? null },
    } as any).catch((): undefined => undefined);
    if (bu_id !== undefined && bu_id !== null && oldBuId !== dept.bu_id) {
      await publishFoundationEvent('foundation.scope_changed', {
        eventType: 'foundation.scope_changed',
        tenantId,
        entityId: id,
        entityType: 'department',
        payload: {
          tenantId,
          entityId: id,
          entityType: 'department',
          oldParentId: oldBuId ?? null,
          newParentId: dept.bu_id ?? null,
        },
        oldParentId: oldBuId ?? null,
        newParentId: dept.bu_id ?? null,
      } as any).catch((): undefined => undefined);
    }
  }
  return dept;
}

export async function deleteDepartment(tenantId: string, deptId: string): Promise<{ deleted: boolean }> {
  const schema = tenantSchema(tenantId);
  
  const result = await safeQuery(
    `UPDATE "${schema}".departments
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE dept_id = $1 OR id = $1
     RETURNING dept_id`,
    [deptId],
  );

  return { deleted: !!result.rows[0] };
}
