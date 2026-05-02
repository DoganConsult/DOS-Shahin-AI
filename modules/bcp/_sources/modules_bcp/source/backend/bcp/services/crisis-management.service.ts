import { emptyResult as _emptyResult, safeQuery, tenantSchema } from '../ports/database.port';
import { eventBus } from '../ports/events.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallow, swallowDefault as _swallowDefault, EC } from '@dos/platform-core/resilience';

export async function declareCrisis(tenantId: string, data: {
  title: string; description?: string; crisis_type?: string; severity?: string;
  declared_by?: string; incident_id?: string; affected_services?: unknown[];
  affected_locations?: unknown[]; command_team?: unknown[];
}): Promise<GenericRow> {
  const schema = tenantSchema(tenantId);
  const r = await safeQuery(
    `INSERT INTO "${schema}".crisis_events
     (title, description, crisis_type, severity, status, declared_at, declared_by,
      incident_id, affected_services, affected_locations, command_team,
      timeline)
     VALUES ($1,$2,$3,$4,'declared',NOW(),$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      data.title, data.description || null, data.crisis_type || 'operational',
      data.severity || 'high', data.declared_by || null, data.incident_id || null,
      JSON.stringify(data.affected_services || []),
      JSON.stringify(data.affected_locations || []),
      JSON.stringify(data.command_team || []),
      JSON.stringify([{ timestamp: new Date().toISOString(), type: 'declared', message: `Crisis declared: ${data.title}` }]),
    ]
  );
  const row = getFirstRow(r) as GenericRow;
  await swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'bcp.crisis_declared', tenantId, sourceService: 'crisis-management',
      entityType: 'crisis_event', entityId: row.event_id, severity: (data.severity === 'critical' ? 'critical' : data.severity === 'high' ? 'warning' : 'info') as 'info' | 'warning' | 'critical',
      payload: { title: data.title, crisis_type: data.crisis_type, severity: data.severity },
    } as any)), { tenantId, operation: 'eventBus:bcp.crisis_declared' });
  return row;
}

export async function getCrisisEvents(tenantId: string, filters?: {
  status?: string; severity?: string; crisis_type?: string;
}): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".crisis_events WHERE deleted_at IS NULL`;
  const params: unknown[] = [];
  if (filters?.status) { params.push(filters.status); sql += ` AND status = $${params.length}`; }
  if (filters?.severity) { params.push(filters.severity); sql += ` AND severity = $${params.length}`; }
  if (filters?.crisis_type) { params.push(filters.crisis_type); sql += ` AND crisis_type = $${params.length}`; }
  sql += ` ORDER BY declared_at DESC NULLS LAST, created_at DESC`;
  return (await safeQuery(sql, params)).rows;
}

export async function getCrisisById(tenantId: string, eventId: string): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  return getFirstRow(await safeQuery(
    `SELECT * FROM "${schema}".crisis_events WHERE event_id = $1 AND deleted_at IS NULL`, [eventId]
  )) as GenericRow | undefined;
}

export async function getActiveCrises(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  return (await safeQuery(
    `SELECT * FROM "${schema}".crisis_events
     WHERE deleted_at IS NULL AND status NOT IN ('resolved','post_review')
     ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, declared_at DESC`,
    []
  )).rows;
}

export async function updateCrisisStatus(tenantId: string, eventId: string, status: string, update?: {
  message?: string; updated_by?: string;
}): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const existing = await getCrisisById(tenantId, eventId);
  if (!existing) return undefined;

  const timeline = Array.isArray(existing.timeline) ? existing.timeline : [];
  timeline.push({
    timestamp: new Date().toISOString(),
    type: 'status_change',
    from: existing.status,
    to: status,
    message: update?.message || `Status changed to ${status}`,
    by: update?.updated_by || null,
  });

  const resolveFields = status === 'resolved'
    ? `, resolved_at = NOW(), resolved_by = $4` : '';
  const params: unknown[] = [status, JSON.stringify(timeline), eventId];
  if (status === 'resolved') params.push(update?.updated_by || null);

  const r = await safeQuery(
    `UPDATE "${schema}".crisis_events SET status = $1, timeline = $2, updated_at = NOW()${resolveFields}
     WHERE event_id = $3 AND deleted_at IS NULL RETURNING *`,
    params
  );
  const row = getFirstRow(r) as GenericRow | undefined;
  await swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'bcp.crisis_status_changed', tenantId, sourceService: 'crisis-management',
      entityType: 'crisis_event', entityId: eventId, severity: 'info',
      payload: { from: existing.status, to: status },
    } as any)), { tenantId, operation: 'eventBus:bcp.crisis_status_changed' });
  return row;
}

export async function addTimelineEntry(tenantId: string, eventId: string, entry: {
  type: string; message: string; by?: string; data?: unknown;
}): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const existing = await getCrisisById(tenantId, eventId);
  if (!existing) return undefined;

  const timeline = Array.isArray(existing.timeline) ? existing.timeline : [];
  timeline.push({ timestamp: new Date().toISOString(), ...entry });

  const r = await safeQuery(
    `UPDATE "${schema}".crisis_events SET timeline = $1, updated_at = NOW()
     WHERE event_id = $2 AND deleted_at IS NULL RETURNING *`,
    [JSON.stringify(timeline), eventId]
  );
  return getFirstRow(r) as GenericRow | undefined;
}

export async function resolveCrisis(tenantId: string, eventId: string, resolvedBy: string, postCrisisReview?: string): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const existing = await getCrisisById(tenantId, eventId);
  if (!existing) return undefined;

  const timeline = Array.isArray(existing.timeline) ? existing.timeline : [];
  timeline.push({
    timestamp: new Date().toISOString(),
    type: 'resolved',
    message: 'Crisis resolved',
    by: resolvedBy,
  });

  const r = await safeQuery(
    `UPDATE "${schema}".crisis_events
     SET status = 'resolved', resolved_at = NOW(), resolved_by = $1,
         post_crisis_review = $2, timeline = $3, updated_at = NOW()
     WHERE event_id = $4 AND deleted_at IS NULL RETURNING *`,
    [resolvedBy, postCrisisReview || null, JSON.stringify(timeline), eventId]
  );
  const row = getFirstRow(r) as GenericRow | undefined;
  await swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'bcp.crisis_resolved', tenantId, sourceService: 'crisis-management',
      entityType: 'crisis_event', entityId: eventId, severity: 'info',
      payload: { title: existing.title, resolvedBy },
    } as any)), { tenantId, operation: 'eventBus:bcp.crisis_resolved' });
  return row;
}

export async function getCrisisDashboard(tenantId: string): Promise<{
  activeCrises: number; totalEvents: number; avgResolutionHours: number | null;
  bySeverity: Record<string, number>; byType: Record<string, number>;
  recentEvents: GenericRow[];
}> {
  const schema = tenantSchema(tenantId);
  const [activeRes, totalRes, avgRes, bySevRes, byTypeRes, recentRes] = await Promise.all([
    safeQuery(`SELECT COUNT(*) AS cnt FROM "${schema}".crisis_events WHERE deleted_at IS NULL AND status NOT IN ('resolved','post_review')`, []),
    safeQuery(`SELECT COUNT(*) AS cnt FROM "${schema}".crisis_events WHERE deleted_at IS NULL`, []),
    safeQuery(`SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - declared_at))/3600) AS avg_hours FROM "${schema}".crisis_events WHERE resolved_at IS NOT NULL AND declared_at IS NOT NULL AND deleted_at IS NULL`, []),
    safeQuery(`SELECT severity, COUNT(*) AS cnt FROM "${schema}".crisis_events WHERE deleted_at IS NULL GROUP BY severity`, []),
    safeQuery(`SELECT crisis_type, COUNT(*) AS cnt FROM "${schema}".crisis_events WHERE deleted_at IS NULL GROUP BY crisis_type`, []),
    safeQuery(`SELECT * FROM "${schema}".crisis_events WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 5`, []),
  ]);

  const bySeverity: Record<string, number> = {};
  for (const row of bySevRes.rows) bySeverity[row.severity as string] = Number(row.cnt);
  const byType: Record<string, number> = {};
  for (const row of byTypeRes.rows) byType[row.crisis_type as string] = Number(row.cnt);

  return {
    activeCrises: Number(activeRes.rows[0]?.cnt || 0),
    totalEvents: Number(totalRes.rows[0]?.cnt || 0),
    avgResolutionHours: avgRes.rows[0]?.avg_hours ? Math.round(Number(avgRes.rows[0].avg_hours) * 10) / 10 : null,
    bySeverity, byType,
    recentEvents: recentRes.rows,
  };
}
