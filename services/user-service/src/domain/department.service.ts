import { withTenantClient } from '@dos/db';
import { logger } from '@dos/module-sdk';
import { userMetrics } from '../observability/metrics';

export interface Department {
  dept_id?: string;
  id?: string;
  tenant_id: string;
  name_en: string;
  name_ar?: string | null;
  code?: string | null;
  bu_id?: string | null;
  head_user_id?: string | null;
  parent_id?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDepartmentInput {
  name_en: string;
  name_ar?: string;
  code?: string;
  bu_id?: string;
  head_user_id?: string;
  parent_id?: string;
}

export type UpdateDepartmentInput = Partial<CreateDepartmentInput & { status: string }>;

export async function getDepartments(tenantId: string): Promise<{ count: number; rows: Department[] }> {
  const start = Date.now();
  try {
    return await withTenantClient(tenantId, async (c) => {
      const countResult = await c.query(
        `SELECT COUNT(*)::int AS count FROM dos.departments
          WHERE tenant_id = $1 AND deleted_at IS NULL`,
        [tenantId],
      );
      const listResult = await c.query(
        `SELECT * FROM dos.departments
          WHERE tenant_id = $1 AND deleted_at IS NULL
          ORDER BY name_en ASC`,
        [tenantId],
      );
      const rawCount = (countResult.rows[0] as { count?: unknown } | undefined)?.count;
      const count = Number.isFinite(Number(rawCount)) ? Number(rawCount) : listResult.rows.length;
      return { count, rows: listResult.rows as Department[] };
    });
  } finally {
    userMetrics.observeDb('dept.list', Date.now() - start);
  }
}

export async function getDepartmentById(tenantId: string, deptId: string): Promise<Department | null> {
  const start = Date.now();
  try {
    return await withTenantClient(tenantId, async (c) => {
      const result = await c.query(
        `SELECT * FROM dos.departments
          WHERE department_id::text = $1 AND tenant_id = $2 AND deleted_at IS NULL
          LIMIT 1`,
        [deptId, tenantId],
      );
      return (result.rows[0] as Department) || null;
    });
  } finally {
    userMetrics.observeDb('dept.getById', Date.now() - start);
  }
}

export async function createDepartment(tenantId: string, payload: CreateDepartmentInput): Promise<Department> {
  const start = Date.now();
  try {
    const row = await withTenantClient(tenantId, async (c) => {
      const result = await c.query(
        `INSERT INTO dos.departments
           (tenant_id, name_en, name_ar, code, bu_id, head_user_id, parent_id, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW(), NOW())
         RETURNING *`,
        [
          tenantId,
          payload.name_en,
          payload.name_ar ?? null,
          payload.code ?? null,
          payload.bu_id ?? null,
          payload.head_user_id ?? null,
          payload.parent_id ?? null,
        ],
      );
      return result.rows[0] as Department;
    });
    userMetrics.deptCreated(tenantId);
    logger.info('[DepartmentService] Department created', { tenantId, name_en: payload.name_en });
    return row;
  } finally {
    userMetrics.observeDb('dept.create', Date.now() - start);
  }
}

export async function updateDepartment(
  tenantId: string,
  deptId: string,
  payload: UpdateDepartmentInput,
): Promise<Department | null> {
  const start = Date.now();
  try {
    const row = await withTenantClient(tenantId, async (c) => {
      const result = await c.query(
        `UPDATE dos.departments
         SET name_en      = COALESCE($3, name_en),
             name_ar      = COALESCE($4, name_ar),
             code         = COALESCE($5, code),
             bu_id        = COALESCE($6, bu_id),
             head_user_id = COALESCE($7, head_user_id),
             parent_id    = COALESCE($8, parent_id),
             status       = COALESCE($9, status),
             updated_at   = NOW()
         WHERE department_id::text = $1 AND tenant_id = $2 AND deleted_at IS NULL
         RETURNING *`,
        [
          deptId,
          tenantId,
          payload.name_en ?? null,
          payload.name_ar ?? null,
          payload.code ?? null,
          payload.bu_id ?? null,
          payload.head_user_id ?? null,
          payload.parent_id ?? null,
          payload.status ?? null,
        ],
      );
      return (result.rows[0] as Department) || null;
    });
    if (row) userMetrics.deptUpdated(tenantId);
    return row;
  } finally {
    userMetrics.observeDb('dept.update', Date.now() - start);
  }
}

export async function deleteDepartment(tenantId: string, deptId: string): Promise<{ deleted: boolean }> {
  const start = Date.now();
  try {
    const deleted = await withTenantClient(tenantId, async (c) => {
      const result = await c.query(
        `UPDATE dos.departments
         SET deleted_at = NOW(), updated_at = NOW()
         WHERE department_id::text = $1 AND tenant_id = $2 AND deleted_at IS NULL
         RETURNING department_id`,
        [deptId, tenantId],
      );
      return result.rows.length > 0;
    });
    if (deleted) userMetrics.deptDeleted(tenantId);
    return { deleted };
  } finally {
    userMetrics.observeDb('dept.delete', Date.now() - start);
  }
}
