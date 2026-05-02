import { randomUUID } from 'node:crypto';
import { withTenantClient } from '../../ports/database.port';
import { userMetrics } from '../../infrastructure/observability/metrics';

export interface BusinessUnit {
  bu_id: string;
  tenant_id: string;
  name_en: string;
  name_ar: string | null;
  code: string | null;
  organization_id: string | null;
  parent_bu_id: string | null;
  bu_type: string | null;
  status: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListBUOptions {
  page?: number;
  pageSize?: number;
  organization_id?: string;
  search?: string;
}

export interface CreateBUInput {
  name_en: string;
  name_ar?: string;
  code?: string;
  organization_id?: string;
  parent_bu_id?: string;
  bu_type?: string;
  status?: string;
  description?: string;
}

export type UpdateBUInput = Partial<CreateBUInput>;

function track<T>(op: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  return fn().finally(() => userMetrics.observeDb(op, Date.now() - start));
}

export async function listBusinessUnits(tenantId: string, opts: ListBUOptions = {}) {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 25;
  const offset = (page - 1) * pageSize;
  const conditions = ['tenant_id = $1', 'deleted_at IS NULL'];
  const params: unknown[] = [tenantId];
  if (opts.organization_id) { params.push(opts.organization_id); conditions.push(`organization_id = $${params.length}`); }
  if (opts.search) {
    params.push(`%${opts.search}%`);
    conditions.push(`(name_en ILIKE $${params.length} OR name_ar ILIKE $${params.length} OR code ILIKE $${params.length})`);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  return track('foundation.bu.list', async () =>
    withTenantClient(tenantId, async (c) => {
      const countRes = await c.query(`SELECT COUNT(*) AS count FROM dos.business_units ${where}`, params);
      const listParams = [...params, pageSize, offset];
      const listRes = await c.query(
        `SELECT * FROM dos.business_units ${where} ORDER BY created_at DESC LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
        listParams,
      );
      return { data: listRes.rows as BusinessUnit[], total: parseInt(countRes.rows[0]?.count || '0', 10) };
    }),
  );
}

export async function getBusinessUnit(tenantId: string, id: string): Promise<BusinessUnit | null> {
  return track('foundation.bu.getById', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT * FROM dos.business_units WHERE bu_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [id, tenantId],
      );
      return (r.rows[0] as BusinessUnit) ?? null;
    }),
  );
}

export async function createBusinessUnit(
  tenantId: string,
  input: CreateBUInput,
  actorId: string,
): Promise<BusinessUnit> {
  const id = randomUUID();
  return track('foundation.bu.create', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `INSERT INTO dos.business_units
           (bu_id, tenant_id, name_en, name_ar, code, organization_id, parent_bu_id, bu_type, status, description, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, 'active'), $10, $11, NOW(), NOW())
         RETURNING *`,
        [id, tenantId, input.name_en, input.name_ar ?? null, input.code ?? null,
         input.organization_id ?? null, input.parent_bu_id ?? null, input.bu_type ?? 'department',
         input.status ?? null, input.description ?? null, actorId],
      );
      return r.rows[0] as BusinessUnit;
    }),
  );
}

export async function updateBusinessUnit(
  tenantId: string,
  id: string,
  input: UpdateBUInput,
): Promise<BusinessUnit | null> {
  return track('foundation.bu.update', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `UPDATE dos.business_units
         SET name_en = COALESCE($3, name_en), name_ar = COALESCE($4, name_ar),
             code = COALESCE($5, code), organization_id = COALESCE($6, organization_id),
             parent_bu_id = COALESCE($7, parent_bu_id), bu_type = COALESCE($8, bu_type),
             status = COALESCE($9, status), description = COALESCE($10, description), updated_at = NOW()
         WHERE bu_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
         RETURNING *`,
        [id, tenantId, input.name_en ?? null, input.name_ar ?? null, input.code ?? null,
         input.organization_id ?? null, input.parent_bu_id ?? null, input.bu_type ?? null,
         input.status ?? null, input.description ?? null],
      );
      return (r.rows[0] as BusinessUnit) ?? null;
    }),
  );
}

export async function deleteBusinessUnit(tenantId: string, id: string): Promise<boolean> {
  return track('foundation.bu.delete', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `UPDATE dos.business_units SET deleted_at = NOW(), updated_at = NOW()
         WHERE bu_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
         RETURNING bu_id`,
        [id, tenantId],
      );
      return r.rows.length > 0;
    }),
  );
}
