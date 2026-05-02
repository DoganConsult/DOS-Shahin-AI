// ============================================
// Application Registry Service
// CRUD for applications table
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { emitEvent } from '../ports/events.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';

interface ListParams {
  page?: number; pageSize?: number; search?: string;
  app_type?: string; criticality?: string; status?: string;
  environment?: string; hosting_type?: string;
  sortBy?: string; sortDir?: 'asc' | 'desc';
}

interface CreateAppInput {
  name: string; name_en?: string; name_ar?: string;
  app_type?: string; vendor?: string; version?: string;
  environment?: string; business_owner?: string; technical_owner?: string;
  department?: string; criticality?: string; status?: string;
  hosting_type?: string; hosting_provider?: string; url?: string;
  data_classification?: string; compliance_status?: string;
  license_type?: string; license_expiry?: string;
  linked_asset_ids?: string[]; tags?: string[]; metadata?: Record<string, unknown>;
}

export async function listApplications(tenantId: string, params: ListParams = {}) {
  const ts = tenantSchema(tenantId);
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(200, Math.max(1, params.pageSize || 25));
  const offset = (page - 1) * pageSize;
  const sortCol = ['name', 'app_type', 'criticality', 'status', 'created_at'].includes(params.sortBy || '') ? params.sortBy : 'created_at';
  const sortDir = params.sortDir === 'asc' ? 'ASC' : 'DESC';

  const conds: string[] = ['deleted_at IS NULL'];
  const vals: unknown[] = [];
  let idx = 0;

  if (params.search) { idx++; conds.push(`(name ILIKE $${idx} OR vendor ILIKE $${idx})`); vals.push(`%${params.search}%`); }
  if (params.app_type) { idx++; conds.push(`app_type = $${idx}`); vals.push(params.app_type); }
  if (params.criticality) { idx++; conds.push(`criticality = $${idx}`); vals.push(params.criticality); }
  if (params.status) { idx++; conds.push(`status = $${idx}`); vals.push(params.status); }
  if (params.environment) { idx++; conds.push(`environment = $${idx}`); vals.push(params.environment); }
  if (params.hosting_type) { idx++; conds.push(`hosting_type = $${idx}`); vals.push(params.hosting_type); }

  const where = conds.join(' AND ');
  const countR = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${ts}".applications WHERE ${where}`, vals);
  const total = countR.rows[0]?.total || 0;

  const dataR = await safeQuery(`
    SELECT * FROM "${ts}".applications WHERE ${where}
    ORDER BY ${sortCol} ${sortDir} LIMIT $${idx + 1} OFFSET $${idx + 2}
  `, [...vals, pageSize, offset]);

  return { data: dataR.rows, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

export async function getApplicationById(tenantId: string, id: string) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`SELECT * FROM "${ts}".applications WHERE application_id = $1 AND deleted_at IS NULL`, [id]);
  return rows[0] || null;
}

export async function createApplication(tenantId: string, userId: string, input: CreateAppInput) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    INSERT INTO "${ts}".applications (
      name, name_en, name_ar, app_type, vendor, version, environment,
      business_owner, technical_owner, department, criticality, status,
      hosting_type, hosting_provider, url, data_classification, compliance_status,
      license_type, license_expiry, linked_asset_ids, tags, metadata, created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
    RETURNING *
  `, [
    input.name, input.name_en || input.name, input.name_ar || '',
    input.app_type || 'web', input.vendor || null, input.version || null,
    input.environment || 'production', input.business_owner || null, input.technical_owner || null,
    input.department || null, input.criticality || 'medium', input.status || 'active',
    input.hosting_type || 'on-premise', input.hosting_provider || null, input.url || null,
    input.data_classification || null, input.compliance_status || null,
    input.license_type || null, input.license_expiry || null,
    input.linked_asset_ids || [], input.tags || [], input.metadata || {}, userId,
  ]);

  emitEvent(({ tenantId, userId, module: 'asset', event: 'application_created', entityType: 'application', entityId: rows[0].application_id, data: rows[0] } as any)).catch(catchHandler(EC.EVENT_BUS));
  return rows[0];
}

export async function updateApplication(tenantId: string, userId: string, id: string, updates: Partial<CreateAppInput>) {
  const ts = tenantSchema(tenantId);
  const allowed = [
    'name','name_en','name_ar','app_type','vendor','version','environment',
    'business_owner','technical_owner','department','criticality','status',
    'hosting_type','hosting_provider','url','data_classification','compliance_status',
    'license_type','license_expiry','linked_asset_ids','tags','metadata',
  ];
  const cols = Object.keys(updates).filter(k => allowed.includes(k));
  if (!cols.length) return null;
  const sets = cols.map((c, i) => `${c} = $${i + 2}`);
  const vals = cols.map(c => (updates as Record<string, unknown>)[c]);
  const { rows } = await safeQuery(
    `UPDATE "${ts}".applications SET ${sets.join(', ')}, updated_at = NOW() WHERE application_id = $1 AND deleted_at IS NULL RETURNING *`,
    [id, ...vals],
  );
  if (rows[0]) emitEvent(({ tenantId, userId, module: 'asset', event: 'application_updated', entityType: 'application', entityId: id, data: rows[0] } as any)).catch(catchHandler(EC.EVENT_BUS));
  return rows[0] || null;
}

export async function deleteApplication(tenantId: string, userId: string, id: string) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`UPDATE "${ts}".applications SET deleted_at = NOW() WHERE application_id = $1 AND deleted_at IS NULL RETURNING application_id`, [id]);
  if (rows[0]) emitEvent(({ tenantId, userId, module: 'asset', event: 'application_deleted', entityType: 'application', entityId: id } as any)).catch(catchHandler(EC.EVENT_BUS));
  return rows[0] || null;
}

export async function getApplicationStats(tenantId: string) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE criticality IN ('critical','high'))::int AS critical_high,
      COUNT(*) FILTER (WHERE license_expiry IS NOT NULL AND license_expiry < CURRENT_DATE + INTERVAL '30 days')::int AS license_expiring,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active
    FROM "${ts}".applications WHERE deleted_at IS NULL
  `);
  return rows[0];
}
