import { emptyResult, safeQuery, tenantSchema } from '../ports/database.port';
import { eventBus } from '../ports/events.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallow, swallowDefault, EC } from '@dos/platform-core/resilience';

export async function createBusinessService(tenantId: string, data: {
  service_name: string; service_code?: string; description?: string;
  category?: string; criticality?: string; service_tier?: string;
  owner_id?: string; owner_team_id?: string; department_id?: string;
  rto_hours?: number; rpo_hours?: number; mtpd_hours?: number;
  bia_id?: string; upstream_services?: unknown[]; downstream_services?: unknown[];
  technology_components?: unknown[]; vendor_dependencies?: unknown[]; asset_ids?: unknown[];
}): Promise<GenericRow> {
  const schema = tenantSchema(tenantId);
  const r = await safeQuery(
    `INSERT INTO "${schema}".business_services
     (service_name, service_code, description, category, criticality, service_tier,
      owner_id, owner_team_id, department_id, rto_hours, rpo_hours, mtpd_hours,
      bia_id, upstream_services, downstream_services, technology_components,
      vendor_dependencies, asset_ids)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     RETURNING *`,
    [
      data.service_name, data.service_code || null, data.description || null,
      data.category || null, data.criticality || 'medium', data.service_tier || null,
      data.owner_id || null, data.owner_team_id || null, data.department_id || null,
      data.rto_hours ?? null, data.rpo_hours ?? null, data.mtpd_hours ?? null,
      data.bia_id || null,
      JSON.stringify(data.upstream_services || []),
      JSON.stringify(data.downstream_services || []),
      JSON.stringify(data.technology_components || []),
      JSON.stringify(data.vendor_dependencies || []),
      JSON.stringify(data.asset_ids || []),
    ]
  );
  const row = getFirstRow(r) as GenericRow;
  await swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'bcp.business_service_created', tenantId, sourceService: 'business-services',
      entityType: 'business_service', entityId: row.service_id, severity: 'info',
      payload: { service_name: data.service_name, criticality: data.criticality },
    } as any)), { tenantId, operation: 'eventBus:bcp.business_service_created' });
  return row;
}

export async function getBusinessServices(tenantId: string, filters?: {
  category?: string; criticality?: string; status?: string;
}): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".business_services WHERE deleted_at IS NULL`;
  const params: unknown[] = [];
  if (filters?.category) { params.push(filters.category); sql += ` AND category = $${params.length}`; }
  if (filters?.criticality) { params.push(filters.criticality); sql += ` AND criticality = $${params.length}`; }
  if (filters?.status) { params.push(filters.status); sql += ` AND status = $${params.length}`; }
  sql += ` ORDER BY CASE criticality WHEN 'vital' THEN 0 WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, service_name`;
  return (await safeQuery(sql, params)).rows;
}

export async function getServiceById(tenantId: string, serviceId: string): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  return getFirstRow(await safeQuery(
    `SELECT * FROM "${schema}".business_services WHERE service_id = $1 AND deleted_at IS NULL`, [serviceId]
  )) as GenericRow | undefined;
}

export async function updateBusinessService(tenantId: string, serviceId: string, data: Record<string, unknown>): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const allowed = [
    'service_name', 'service_code', 'description', 'category', 'criticality', 'service_tier',
    'owner_id', 'owner_team_id', 'department_id', 'rto_hours', 'rpo_hours', 'mtpd_hours',
    'bia_id', 'upstream_services', 'downstream_services', 'technology_components',
    'vendor_dependencies', 'asset_ids', 'status',
  ];
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      params.push(['upstream_services','downstream_services','technology_components','vendor_dependencies','asset_ids'].includes(key)
        ? JSON.stringify(data[key]) : data[key]);
      sets.push(`${key} = $${params.length}`);
    }
  }
  if (sets.length === 0) return getServiceById(tenantId, serviceId);
  sets.push('updated_at = NOW()');
  params.push(serviceId);
  const r = await safeQuery(
    `UPDATE "${schema}".business_services SET ${sets.join(', ')} WHERE service_id = $${params.length} AND deleted_at IS NULL RETURNING *`,
    params
  );
  return getFirstRow(r) as GenericRow | undefined;
}

export async function getServiceDependencyGraph(tenantId: string, serviceId: string): Promise<{
  service: GenericRow | undefined; upstream: GenericRow[]; downstream: GenericRow[];
}> {
  const schema = tenantSchema(tenantId);
  const service = await getServiceById(tenantId, serviceId);
  if (!service) return { service: undefined, upstream: [], downstream: [] };

  const upIds = Array.isArray(service.upstream_services) ? service.upstream_services : [];
  const downIds = Array.isArray(service.downstream_services) ? service.downstream_services : [];

  const fetchByIds = async (ids: string[]): Promise<GenericRow[]> => {
    if (ids.length === 0) return [];
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    return (await safeQuery(
      `SELECT * FROM "${schema}".business_services WHERE service_id IN (${placeholders}) AND deleted_at IS NULL`, ids
    )).rows;
  };

  const [upstream, downstream] = await Promise.all([fetchByIds(upIds), fetchByIds(downIds)]);
  return { service, upstream, downstream };
}

export async function linkServiceToBIA(tenantId: string, serviceId: string, biaId: string): Promise<GenericRow | undefined> {
  return updateBusinessService(tenantId, serviceId, { bia_id: biaId });
}

export async function getServiceImpactSummary(tenantId: string, serviceId: string): Promise<{
  service: GenericRow | undefined;
  bia: GenericRow | undefined;
  exerciseCoverage: number;
  recoveryStrategies: GenericRow[];
}> {
  const schema = tenantSchema(tenantId);
  const service = await getServiceById(tenantId, serviceId);
  if (!service) return { service: undefined, bia: undefined, exerciseCoverage: 0, recoveryStrategies: [] };

  const bia = service.bia_id
    ? getFirstRow(await safeQuery(`SELECT * FROM "${schema}".bia_assessments WHERE bia_id = $1`, [service.bia_id])) as GenericRow | undefined
    : undefined;

  const exercises = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT COUNT(*) AS cnt FROM "${schema}".bcp_exercises WHERE deleted_at IS NULL AND status = 'completed'`
  ), { operation: 'count exercises' });
  const exerciseCoverage = Number(exercises.rows[0]?.cnt || 0);

  const recoveryStrategies = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT * FROM "${schema}".bcm_recovery_strategies WHERE bia_id = $1 AND deleted_at IS NULL`, [service.bia_id]
  ), { operation: 'recovery strategies for service' });

  return { service, bia, exerciseCoverage, recoveryStrategies: recoveryStrategies.rows };
}
