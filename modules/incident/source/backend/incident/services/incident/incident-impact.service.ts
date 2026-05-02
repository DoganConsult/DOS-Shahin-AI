import { safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallow, EC } from '@dos/platform-core/resilience';

/**
 * Incident Impact Service
 * -----------------------
 * Tracks financial, operational, and reputational impacts
 * of incidents, including per-incident summaries and tenant-wide overviews.
 */

export async function recordImpact(
  tenantId: string,
  incidentId: string,
  data: {
    impact_type: string;
    severity?: string;
    description?: string;
    estimated_cost?: number;
    affected_systems?: string[];
    affected_users_count?: number;
    duration_hours?: number;
    mitigation_applied?: string;
    assessed_by: string;
  },
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const r = await safeQuery(
    `INSERT INTO "${schema}".incident_impacts
       (incident_id, impact_type, severity, description, estimated_cost,
        affected_systems, affected_users_count, duration_hours, mitigation_applied, assessed_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      incidentId,
      data.impact_type,
      data.severity || null,
      data.description || null,
      data.estimated_cost ?? null,
      data.affected_systems ? JSON.stringify(data.affected_systems) : null,
      data.affected_users_count ?? null,
      data.duration_hours ?? null,
      data.mitigation_applied || null,
      data.assessed_by,
    ],
  );

  await swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'incident.impact_recorded',
      tenantId,
      sourceService: 'incident-impact',
      entityType: 'incident',
      entityId: incidentId,
      severity: data.severity === 'critical' ? 'critical' : 'info',
      payload: {
        incidentId,
        impactType: data.impact_type,
        estimatedCost: data.estimated_cost,
        assessedBy: data.assessed_by,
      },
    } as any)), { tenantId, operation: 'eventBus:incident.impact_recorded' });

  return getFirstRow(r);
}

export async function getImpacts(tenantId: string, incidentId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  return (await safeQuery(
    `SELECT * FROM "${schema}".incident_impacts
     WHERE incident_id = $1 AND deleted_at IS NULL
     ORDER BY assessed_at DESC`,
    [incidentId],
  )).rows;
}

/** Allowed fields for impact updates. */
const IMPACT_UPDATE_FIELDS = [
  'impact_type', 'severity', 'description', 'estimated_cost',
  'affected_systems', 'affected_users_count', 'duration_hours', 'mitigation_applied',
] as const;

export async function updateImpact(
  tenantId: string,
  impactId: string,
  data: Record<string, unknown>,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const fields: string[] = [];
  const vals: unknown[] = [];
  let idx = 1;

  for (const [k, v] of Object.entries(data)) {
    if ((IMPACT_UPDATE_FIELDS as readonly string[]).includes(k)) {
      fields.push(`${k} = $${idx}`);
      vals.push(k === 'affected_systems' && Array.isArray(v) ? JSON.stringify(v) : v);
      idx++;
    }
  }
  if (!fields.length) return null;

  fields.push(`updated_at = NOW()`);
  vals.push(impactId);
  const r = await safeQuery(
    `UPDATE "${schema}".incident_impacts SET ${fields.join(', ')} WHERE impact_id = $${idx} AND deleted_at IS NULL RETURNING *`,
    vals,
  );
  return getFirstRow(r);
}

/** Soft-delete an impact record. */
export async function deleteImpact(tenantId: string, impactId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const r = await safeQuery(
    `UPDATE "${schema}".incident_impacts SET deleted_at = NOW() WHERE impact_id = $1 RETURNING *`,
    [impactId],
  );
  return getFirstRow(r);
}

/** Aggregate impact summary for a single incident. */
export async function getImpactSummary(tenantId: string, incidentId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const r = await safeQuery(
    `SELECT
       SUM(estimated_cost)              AS total_cost,
       COUNT(*)                         AS impact_count,
       MAX(CASE severity
         WHEN 'critical' THEN 4
         WHEN 'high'     THEN 3
         WHEN 'medium'   THEN 2
         WHEN 'low'      THEN 1
         ELSE 0
       END)                             AS max_severity_rank,
       CASE MAX(CASE severity
         WHEN 'critical' THEN 4 WHEN 'high' THEN 3
         WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0
       END)
         WHEN 4 THEN 'critical'
         WHEN 3 THEN 'high'
         WHEN 2 THEN 'medium'
         WHEN 1 THEN 'low'
         ELSE 'none'
       END                              AS max_severity,
       ARRAY_AGG(DISTINCT impact_type)  AS impact_types
     FROM "${schema}".incident_impacts
     WHERE incident_id = $1 AND deleted_at IS NULL`,
    [incidentId],
  );
  return getFirstRow(r);
}

/** Tenant-wide impact overview grouped by impact type. */
export async function getTenantImpactOverview(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  return (await safeQuery(
    `SELECT impact_type,
            COUNT(*)            AS impact_count,
            SUM(estimated_cost) AS total_cost
     FROM "${schema}".incident_impacts
     WHERE deleted_at IS NULL
     GROUP BY impact_type
     ORDER BY total_cost DESC NULLS LAST`
  )).rows;
}
