/**
 * IncidentTriageService — Real DB implementation
 */
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { randomUUID } from 'crypto';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus  = 'new' | 'triaged' | 'investigating' | 'contained' | 'remediated' | 'closed' | 'post_incident';

export interface ReportIncidentInput {
  tenantId: string; title: string; description?: string;
  incidentType: string; severity: IncidentSeverity;
  affectedSystems?: string[]; reportedBy: string;
  detectedAt?: string; isBreachSuspected?: boolean;
}

export async function reportIncident(input: ReportIncidentInput): Promise<string> {
  const id = randomUUID();
  const incidentRef = `INC-${Date.now().toString(36).toUpperCase()}`;
  await safeQuery(
    `INSERT INTO __TENANT_SCHEMA__.incidents
       (id, tenant_id, incident_ref, title, description, incident_type, severity,
        affected_systems, reported_by, detected_at, is_breach, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'new')`,
    [id, input.tenantId, incidentRef, input.title, input.description ?? null,
     input.incidentType, input.severity,
     JSON.stringify(input.affectedSystems ?? []), input.reportedBy,
     input.detectedAt ?? null, input.isBreachSuspected ?? false],
  );
  await addTimelineEntry(id, input.tenantId, 'reported', 'Incident reported', input.reportedBy);
  logger.warn('[Incident] Reported', { id, severity: input.severity, tenantId: input.tenantId });
  return id;
}

export async function triageIncident(
  id: string, tenantId: string, assignedTo: string, triageNotes?: string,
): Promise<void> {
  await safeQuery(
    `UPDATE __TENANT_SCHEMA__.incidents
     SET status = 'triaged', assigned_to = $1, updated_at = NOW()
     WHERE id = $2 AND tenant_id = $3 AND status = 'new'`,
    [assignedTo, id, tenantId],
  );
  await addTimelineEntry(id, tenantId, 'triaged', triageNotes ?? 'Incident triaged', assignedTo);
}

export async function escalateToInvestigation(id: string, tenantId: string, actorId: string): Promise<void> {
  await safeQuery(
    `UPDATE __TENANT_SCHEMA__.incidents SET status = 'investigating', updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND status = 'triaged'`,
    [id, tenantId],
  );
  await addTimelineEntry(id, tenantId, 'investigation_started', 'Investigation started', actorId);
}

export async function containIncident(
  id: string, tenantId: string, actorId: string, containmentNotes?: string,
): Promise<void> {
  await safeQuery(
    `UPDATE __TENANT_SCHEMA__.incidents
     SET status = 'contained', contained_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId],
  );
  await addTimelineEntry(id, tenantId, 'contained', containmentNotes ?? 'Incident contained', actorId);
}

export async function closeIncident(
  id: string, tenantId: string, actorId: string,
  rootCause?: string, lessonsLearned?: string,
): Promise<void> {
  await safeQuery(
    `UPDATE __TENANT_SCHEMA__.incidents
     SET status = 'closed', resolved_at = NOW(), closed_at = NOW(),
         root_cause = $1, lessons_learned = $2, updated_at = NOW()
     WHERE id = $3 AND tenant_id = $4`,
    [rootCause ?? null, lessonsLearned ?? null, id, tenantId],
  );
  await addTimelineEntry(id, tenantId, 'closed', 'Incident closed', actorId);
  logger.info('[Incident] Closed', { id, tenantId });
}

export async function addCapa(id: string, tenantId: string, input: {
  actionType: 'corrective' | 'preventive'; title: string; description?: string;
  assignedTo?: string; dueDate?: string; createdBy: string;
}): Promise<string> {
  const capaId = randomUUID();
  await safeQuery(
    `INSERT INTO __TENANT_SCHEMA__.incident_capas
       (id, incident_id, tenant_id, action_type, title, description, assigned_to, due_date, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [capaId, id, tenantId, input.actionType, input.title, input.description ?? null,
     input.assignedTo ?? null, input.dueDate ?? null, input.createdBy],
  );
  return capaId;
}

export async function addTimelineEntry(
  incidentId: string, tenantId: string, eventType: string,
  description: string, actorId?: string,
): Promise<void> {
  await safeQuery(
    `INSERT INTO __TENANT_SCHEMA__.incident_timeline
       (id, incident_id, tenant_id, event_type, description, actor_id)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
    [incidentId, tenantId, eventType, description, actorId ?? null],
  );
}

export async function listIncidents(tenantId: string, opts: {
  status?: IncidentStatus; severity?: IncidentSeverity; limit?: number; offset?: number;
}): Promise<{ data: unknown[]; total: number }> {
  const conds = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let idx = 2;
  if (opts.status)   { conds.push(`status = $${idx++}`);   params.push(opts.status); }
  if (opts.severity) { conds.push(`severity = $${idx++}`); params.push(opts.severity); }
  const where = `WHERE ${conds.join(' AND ')}`;
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = opts.offset ?? 0;
  const [c, d] = await Promise.all([
    safeQuery(`SELECT COUNT(*)::int AS total FROM __TENANT_SCHEMA__.incidents ${where}`, params),
    safeQuery(
      `SELECT id, incident_ref, title, incident_type, severity, status,
              assigned_to, detected_at, reported_at, contained_at, is_breach, created_at
       FROM __TENANT_SCHEMA__.incidents ${where}
       ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2
                WHEN 'medium' THEN 3 ELSE 4 END, created_at DESC
       LIMIT ${limit} OFFSET ${offset}`, params,
    ),
  ]);
  return { data: d.rows, total: (c.rows[0] as { total: number })?.total ?? 0 };
}

export const IncidentTriageService = {
  reportIncident, triageIncident, escalateToInvestigation,
  containIncident, closeIncident, addCapa, addTimelineEntry, listIncidents,
};
