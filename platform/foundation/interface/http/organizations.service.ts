import { randomUUID } from 'node:crypto';
import { withTenantClient } from '../../ports/database.port';
import { userMetrics } from '../../infrastructure/observability/metrics';
import { publish as publishFoundationEvent } from '../../infrastructure/messaging/foundation.publishers';

export interface Organization {
  organization_id: string;
  tenant_id: string;
  name_en: string;
  name_ar: string | null;
  code: string | null;
  parent_id: string | null;
  org_type: string | null;
  status: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListOrgsOptions {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface CreateOrgInput {
  name_en: string;
  name_ar?: string;
  code?: string;
  parent_id?: string;
  org_type?: string;
  status?: string;
  description?: string;
}

export type UpdateOrgInput = Partial<CreateOrgInput>;

function track<T>(op: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  return fn().finally(() => userMetrics.observeDb(op, Date.now() - start));
}

export async function listOrganizations(tenantId: string, opts: ListOrgsOptions = {}) {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 25;
  const offset = (page - 1) * pageSize;
  const conditions = ['tenant_id = $1', 'deleted_at IS NULL'];
  const params: unknown[] = [tenantId];
  if (opts.search) {
    params.push(`%${opts.search}%`);
    conditions.push(`(name_en ILIKE $${params.length} OR name_ar ILIKE $${params.length} OR code ILIKE $${params.length})`);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  return track('foundation.org.list', async () =>
    withTenantClient(tenantId, async (c) => {
      const countRes = await c.query(`SELECT COUNT(*) AS count FROM dos.organizations ${where}`, params);
      const listParams = [...params, pageSize, offset];
      const listRes = await c.query(
        `SELECT * FROM dos.organizations ${where} ORDER BY created_at DESC LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
        listParams,
      );
      return {
        data: listRes.rows as Organization[],
        total: parseInt(countRes.rows[0]?.count || '0', 10),
      };
    }),
  );
}

export async function getOrganization(tenantId: string, id: string): Promise<Organization | null> {
  return track('foundation.org.getById', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT * FROM dos.organizations WHERE organization_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [id, tenantId],
      );
      return (r.rows[0] as Organization) ?? null;
    }),
  );
}

export async function createOrganization(
  tenantId: string,
  input: CreateOrgInput,
  actorId: string,
): Promise<Organization> {
  const id = randomUUID();
  return track('foundation.org.create', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `INSERT INTO dos.organizations
           (organization_id, tenant_id, name_en, name_ar, code, parent_id, org_type, status, description, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'active'), $9, $10, NOW(), NOW())
         RETURNING *`,
        [id, tenantId, input.name_en, input.name_ar ?? null, input.code ?? null,
         input.parent_id ?? null, input.org_type ?? 'organization',
         input.status ?? null, input.description ?? null, actorId],
      );
      return r.rows[0] as Organization;
    }),
  ).then(async (org) => {
    await publishFoundationEvent('foundation.org_created', {
      eventType: 'foundation.org_created',
      tenantId,
      entityId: org.organization_id,
      payload: {
        tenantId,
        organizationId: org.organization_id,
        parentId: org.parent_id ?? null,
        orgType: org.org_type ?? null,
        code: org.code ?? null,
      },
      parentId: org.parent_id ?? null,
    } as any).catch((): undefined => undefined);
    return org;
  });
}

export async function updateOrganization(
  tenantId: string,
  id: string,
  input: UpdateOrgInput,
): Promise<Organization | null> {
  return track('foundation.org.update', async () =>
    withTenantClient(tenantId, async (c) => {
      const beforeRes = await c.query(
        `SELECT parent_id FROM dos.organizations WHERE organization_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [id, tenantId],
      );
      const oldParentId: string | null = beforeRes.rows[0]?.parent_id ?? null;
      const r = await c.query(
        `UPDATE dos.organizations
         SET name_en = COALESCE($3, name_en), name_ar = COALESCE($4, name_ar),
             code = COALESCE($5, code), parent_id = COALESCE($6, parent_id),
             org_type = COALESCE($7, org_type), status = COALESCE($8, status),
             description = COALESCE($9, description), updated_at = NOW()
         WHERE organization_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
         RETURNING *`,
        [id, tenantId, input.name_en ?? null, input.name_ar ?? null, input.code ?? null,
         input.parent_id ?? null, input.org_type ?? null, input.status ?? null, input.description ?? null],
      );
      const updated = (r.rows[0] as Organization) ?? null;
      if (updated) {
        await publishFoundationEvent('foundation.org_updated', {
          eventType: 'foundation.org_updated',
          tenantId,
          entityId: updated.organization_id,
          payload: {
            tenantId,
            organizationId: updated.organization_id,
            parentId: updated.parent_id ?? null,
          },
        } as any).catch((): undefined => undefined);
        if (input.parent_id !== undefined && oldParentId !== updated.parent_id) {
          await publishFoundationEvent('foundation.scope_changed', {
            eventType: 'foundation.scope_changed',
            tenantId,
            entityId: updated.organization_id,
            entityType: 'organization',
            payload: {
              tenantId,
              entityId: updated.organization_id,
              entityType: 'organization',
              oldParentId: oldParentId ?? null,
              newParentId: updated.parent_id ?? null,
            },
            oldParentId: oldParentId ?? null,
            newParentId: updated.parent_id ?? null,
          } as any).catch((): undefined => undefined);
        }
      }
      return updated;
    }),
  );
}

export async function deleteOrganization(tenantId: string, id: string): Promise<boolean> {
  return track('foundation.org.delete', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `UPDATE dos.organizations SET deleted_at = NOW(), updated_at = NOW()
         WHERE organization_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
         RETURNING organization_id`,
        [id, tenantId],
      );
      return r.rows.length > 0;
    }),
  );
}
