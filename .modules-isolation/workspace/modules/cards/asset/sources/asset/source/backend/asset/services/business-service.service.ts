// ============================================
// Business Service Service
// CRUD + hierarchy queries for business_services
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { emitEvent } from '../ports/events.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';

interface ListParams {
  page?: number; pageSize?: number; search?: string;
  service_type?: string; criticality?: string; status?: string;
  sortBy?: string; sortDir?: 'asc' | 'desc';
}

interface CreateServiceInput {
  name: string; name_en?: string; name_ar?: string;
  description?: string; service_type?: string;
  business_owner?: string; technical_owner?: string; department?: string;
  criticality?: string; status?: string;
  sla_target_uptime?: number; rto_hours?: number; rpo_hours?: number;
  parent_service_id?: string;
  linked_application_ids?: string[]; linked_asset_ids?: string[];
  tags?: string[]; metadata?: Record<string, unknown>;
}

export async function listBusinessServices(tenantId: string, params: ListParams = {}) {
  const ts = tenantSchema(tenantId);
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(200, Math.max(1, params.pageSize || 25));
  const offset = (page - 1) * pageSize;
  const sortCol = ['name', 'service_type', 'criticality', 'status', 'created_at'].includes(params.sortBy || '') ? params.sortBy : 'created_at';
  const sortDir = params.sortDir === 'asc' ? 'ASC' : 'DESC';

  const conds: string[] = ['deleted_at IS NULL'];
  const vals: unknown[] = [];
  let idx = 0;

  if (params.search) { idx++; conds.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`); vals.push(`%${params.search}%`); }
  if (params.service_type) { idx++; conds.push(`service_type = $${idx}`); vals.push(params.service_type); }
  if (params.criticality) { idx++; conds.push(`criticality = $${idx}`); vals.push(params.criticality); }
  if (params.status) { idx++; conds.push(`status = $${idx}`); vals.push(params.status); }

  const where = conds.join(' AND ');
  const countR = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${ts}".business_services WHERE ${where}`, vals);
  const total = countR.rows[0]?.total || 0;

  const dataR = await safeQuery(`
    SELECT * FROM "${ts}".business_services WHERE ${where}
    ORDER BY ${sortCol} ${sortDir} LIMIT $${idx + 1} OFFSET $${idx + 2}
  `, [...vals, pageSize, offset]);

  return { data: dataR.rows, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

export async function getBusinessServiceById(tenantId: string, id: string) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`SELECT * FROM "${ts}".business_services WHERE service_id = $1 AND deleted_at IS NULL`, [id]);
  return rows[0] || null;
}

export async function getServiceHierarchy(tenantId: string, rootId?: string) {
  const ts = tenantSchema(tenantId);
  if (rootId) {
    const { rows } = await safeQuery(`
      WITH RECURSIVE tree AS (
        SELECT *, 0 AS depth FROM "${ts}".business_services WHERE service_id = $1 AND deleted_at IS NULL
        UNION ALL
        SELECT s.*, t.depth + 1 FROM "${ts}".business_services s
        JOIN tree t ON s.parent_service_id = t.service_id
        WHERE s.deleted_at IS NULL AND t.depth < 10
      )
      SELECT * FROM tree ORDER BY depth, name
    `, [rootId]);
    return rows;
  }
  // All top-level services (no parent) with children inlined
  const { rows } = await safeQuery(`
    WITH RECURSIVE tree AS (
      SELECT *, 0 AS depth FROM "${ts}".business_services WHERE parent_service_id IS NULL AND deleted_at IS NULL
      UNION ALL
      SELECT s.*, t.depth + 1 FROM "${ts}".business_services s
      JOIN tree t ON s.parent_service_id = t.service_id
      WHERE s.deleted_at IS NULL AND t.depth < 10
    )
    SELECT * FROM tree ORDER BY depth, name
  `);
  return rows;
}

export async function createBusinessService(tenantId: string, userId: string, input: CreateServiceInput) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    INSERT INTO "${ts}".business_services (
      name, name_en, name_ar, description, service_type,
      business_owner, technical_owner, department, criticality, status,
      sla_target_uptime, rto_hours, rpo_hours, parent_service_id,
      linked_application_ids, linked_asset_ids, tags, metadata, created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
    RETURNING *
  `, [
    input.name, input.name_en || input.name, input.name_ar || '',
    input.description || '', input.service_type || 'supporting',
    input.business_owner || null, input.technical_owner || null, input.department || null,
    input.criticality || 'medium', input.status || 'active',
    input.sla_target_uptime || null, input.rto_hours || null, input.rpo_hours || null,
    input.parent_service_id || null,
    input.linked_application_ids || [], input.linked_asset_ids || [],
    input.tags || [], input.metadata || {}, userId,
  ]);

  emitEvent(({ tenantId, userId, module: 'asset', event: 'service_created', entityType: 'business_service', entityId: rows[0].service_id, data: rows[0] } as any)).catch(catchHandler(EC.EVENT_BUS));
  return rows[0];
}

export async function updateBusinessService(tenantId: string, userId: string, id: string, updates: Partial<CreateServiceInput>) {
  const ts = tenantSchema(tenantId);
  const allowed = [
    'name','name_en','name_ar','description','service_type',
    'business_owner','technical_owner','department','criticality','status',
    'sla_target_uptime','rto_hours','rpo_hours','parent_service_id',
    'linked_application_ids','linked_asset_ids','tags','metadata',
  ];
  const cols = Object.keys(updates).filter(k => allowed.includes(k));
  if (!cols.length) return null;
  const sets = cols.map((c, i) => `${c} = $${i + 2}`);
  const vals = cols.map(c => (updates as Record<string, unknown>)[c]);
  const { rows } = await safeQuery(
    `UPDATE "${ts}".business_services SET ${sets.join(', ')}, updated_at = NOW() WHERE service_id = $1 AND deleted_at IS NULL RETURNING *`,
    [id, ...vals],
  );
  if (rows[0]) emitEvent(({ tenantId, userId, module: 'asset', event: 'service_updated', entityType: 'business_service', entityId: id, data: rows[0] } as any)).catch(catchHandler(EC.EVENT_BUS));
  return rows[0] || null;
}

export async function deleteBusinessService(tenantId: string, userId: string, id: string) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`UPDATE "${ts}".business_services SET deleted_at = NOW() WHERE service_id = $1 AND deleted_at IS NULL RETURNING service_id`, [id]);
  if (rows[0]) emitEvent(({ tenantId, userId, module: 'asset', event: 'service_deleted', entityType: 'business_service', entityId: id } as any)).catch(catchHandler(EC.EVENT_BUS));
  return rows[0] || null;
}

export async function getServiceStats(tenantId: string) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE service_type = 'core')::int AS core_services,
      COUNT(*) FILTER (WHERE criticality IN ('critical','high'))::int AS critical_high,
      COUNT(*) FILTER (WHERE sla_target_uptime IS NOT NULL AND sla_target_uptime >= 99.9)::int AS high_sla
    FROM "${ts}".business_services WHERE deleted_at IS NULL
  `);
  return rows[0];
}
