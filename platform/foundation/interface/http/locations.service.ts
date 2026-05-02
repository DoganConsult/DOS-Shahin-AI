import { randomUUID } from 'node:crypto';
import { withTenantClient } from '../../ports/database.port';
import { userMetrics } from '../../infrastructure/observability/metrics';

export interface Location {
  location_id: string;
  tenant_id: string;
  name_en: string;
  name_ar: string | null;
  code: string | null;
  location_type: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  parent_location_id: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateLocationInput {
  name_en: string;
  name_ar?: string;
  code?: string;
  location_type?: string;
  country?: string;
  city?: string;
  address?: string;
  parent_location_id?: string;
  latitude?: number;
  longitude?: number;
  status?: string;
  description?: string;
}
export type UpdateLocationInput = Partial<CreateLocationInput>;

function track<T>(op: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  return fn().finally(() => userMetrics.observeDb(op, Date.now() - start));
}

export async function listLocations(tenantId: string, opts: { page?: number; pageSize?: number; location_type?: string; country?: string; parent_id?: string; search?: string } = {}) {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 25;
  const offset = (page - 1) * pageSize;
  const conditions = ['tenant_id = $1', 'deleted_at IS NULL'];
  const params: unknown[] = [tenantId];
  if (opts.location_type) { params.push(opts.location_type); conditions.push(`location_type = $${params.length}`); }
  if (opts.country)       { params.push(opts.country); conditions.push(`country = $${params.length}`); }
  if (opts.parent_id)     { params.push(opts.parent_id); conditions.push(`parent_location_id = $${params.length}`); }
  if (opts.search) {
    params.push(`%${opts.search}%`);
    conditions.push(`(name_en ILIKE $${params.length} OR name_ar ILIKE $${params.length} OR code ILIKE $${params.length})`);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  return track('foundation.location.list', async () =>
    withTenantClient(tenantId, async (c) => {
      const countRes = await c.query(`SELECT COUNT(*) AS count FROM dos.locations ${where}`, params);
      const listParams = [...params, pageSize, offset];
      const listRes = await c.query(
        `SELECT * FROM dos.locations ${where} ORDER BY created_at DESC LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
        listParams,
      );
      return { data: listRes.rows as Location[], total: parseInt(countRes.rows[0]?.count || '0', 10) };
    }),
  );
}

export async function getLocation(tenantId: string, id: string): Promise<Location | null> {
  return track('foundation.location.getById', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT * FROM dos.locations WHERE location_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [id, tenantId],
      );
      return (r.rows[0] as Location) ?? null;
    }),
  );
}

export async function listChildLocations(tenantId: string, parentId: string) {
  return track('foundation.location.children', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT * FROM dos.locations WHERE parent_location_id = $1 AND tenant_id = $2 AND deleted_at IS NULL ORDER BY name_en`,
        [parentId, tenantId],
      );
      return r.rows as Location[];
    }),
  );
}

export async function listLocationBUs(tenantId: string, locationId: string) {
  return track('foundation.location.bus', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT bu.* FROM dos.business_units bu
          JOIN dos.location_bu_map lbm ON lbm.bu_id = bu.bu_id
         WHERE lbm.location_id = $1 AND bu.tenant_id = $2 AND bu.deleted_at IS NULL
         ORDER BY bu.name_en`,
        [locationId, tenantId],
      );
      return r.rows;
    }),
  );
}

export async function createLocation(tenantId: string, input: CreateLocationInput, actorId: string): Promise<Location> {
  const id = randomUUID();
  return track('foundation.location.create', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `INSERT INTO dos.locations
           (location_id, tenant_id, name_en, name_ar, code, location_type, country, city, address,
            parent_location_id, latitude, longitude, status, description, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, COALESCE($13, 'active'), $14, $15, NOW(), NOW())
         RETURNING *`,
        [id, tenantId, input.name_en, input.name_ar ?? null, input.code ?? null,
         input.location_type ?? 'office', input.country ?? null, input.city ?? null, input.address ?? null,
         input.parent_location_id ?? null, input.latitude ?? null, input.longitude ?? null,
         input.status ?? null, input.description ?? null, actorId],
      );
      return r.rows[0] as Location;
    }),
  );
}

export async function updateLocation(tenantId: string, id: string, input: UpdateLocationInput): Promise<Location | null> {
  return track('foundation.location.update', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `UPDATE dos.locations
         SET name_en = COALESCE($3, name_en), name_ar = COALESCE($4, name_ar),
             code = COALESCE($5, code), location_type = COALESCE($6, location_type),
             country = COALESCE($7, country), city = COALESCE($8, city),
             address = COALESCE($9, address), parent_location_id = COALESCE($10, parent_location_id),
             latitude = COALESCE($11, latitude), longitude = COALESCE($12, longitude),
             status = COALESCE($13, status), description = COALESCE($14, description), updated_at = NOW()
         WHERE location_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
         RETURNING *`,
        [id, tenantId, input.name_en ?? null, input.name_ar ?? null, input.code ?? null,
         input.location_type ?? null, input.country ?? null, input.city ?? null, input.address ?? null,
         input.parent_location_id ?? null, input.latitude ?? null, input.longitude ?? null,
         input.status ?? null, input.description ?? null],
      );
      return (r.rows[0] as Location) ?? null;
    }),
  );
}

export async function deleteLocation(tenantId: string, id: string): Promise<boolean> {
  return track('foundation.location.delete', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `UPDATE dos.locations SET deleted_at = NOW(), updated_at = NOW()
         WHERE location_id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING location_id`,
        [id, tenantId],
      );
      return r.rows.length > 0;
    }),
  );
}

export async function assignBuToLocation(tenantId: string, locationId: string, buId: string) {
  return track('foundation.location.assignBu', async () =>
    withTenantClient(tenantId, async (c) => {
      await c.query(
        `INSERT INTO dos.location_bu_map (location_id, bu_id, tenant_id, created_at)
         VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING`,
        [locationId, buId, tenantId],
      );
    }),
  );
}

export async function removeBuFromLocation(tenantId: string, locationId: string, buId: string) {
  return track('foundation.location.removeBu', async () =>
    withTenantClient(tenantId, async (c) => {
      await c.query(
        `DELETE FROM dos.location_bu_map WHERE location_id = $1 AND bu_id = $2 AND tenant_id = $3`,
        [locationId, buId, tenantId],
      );
    }),
  );
}
