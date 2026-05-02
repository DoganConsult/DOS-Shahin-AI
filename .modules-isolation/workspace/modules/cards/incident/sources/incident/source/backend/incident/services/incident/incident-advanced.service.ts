import { safeQuery, safeQueryWithClient, tenantSchema, withTransaction } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallow, EC } from '@dos/platform-core/resilience';

export async function getIncidentTaxonomy(tenantId: string, parentId?: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".incident_taxonomy WHERE deleted_at IS NULL`;
  const params: unknown[] = [];
  if (parentId) { sql += ` AND parent_id = $1`; params.push(parentId); }
  else { sql += ` AND parent_id IS NULL`; }
  sql += ` ORDER BY display_order, name_en`;
  return (await safeQuery(sql, params)).rows;
}

export async function createTaxonomyNode(tenantId: string, data: {
  code: string; name_en: string; name_ar?: string; parent_id?: string;
  node_type?: string; severity_hint?: string; regulatory_flag?: boolean;
}): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const r = await safeQuery(
    `INSERT INTO "${schema}".incident_taxonomy
       (code, name_en, name_ar, parent_id, node_type, severity_hint, regulatory_flag)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [data.code, data.name_en, data.name_ar || null, data.parent_id || null,
     data.node_type || 'category', data.severity_hint || 'medium', data.regulatory_flag ?? false]
  );
  return getFirstRow(r);
}

export async function updateTaxonomyNode(tenantId: string, nodeId: string, data: Record<string, unknown>): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const fields: string[] = []; const vals: unknown[] = []; let idx = 1;
  for (const [k, v] of Object.entries(data)) {
    if (['name_en','name_ar','node_type','severity_hint','regulatory_flag','display_order','is_active','parent_id'].includes(k)) {
      fields.push(`${k} = $${idx}`); vals.push(v); idx++;
    }
  }
  if (!fields.length) return null;
  fields.push(`updated_at = NOW()`);
  vals.push(nodeId);
  const r = await safeQuery(`UPDATE "${schema}".incident_taxonomy SET ${fields.join(',')} WHERE node_id = $${idx} RETURNING *`, vals);
  return getFirstRow(r);
}

export async function reportNearMiss(tenantId: string, data: {
  title: string; description: string; reported_by: string;
  taxonomy_node_id?: string; severity_estimate?: string; location?: string;
  department_id?: string; potential_impact?: string;
}): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const r = await safeQuery(
    `INSERT INTO "${schema}".near_miss_reports
       (title, description, reported_by, taxonomy_node_id, severity_estimate, location, department_id, potential_impact)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [data.title, data.description, data.reported_by, data.taxonomy_node_id || null,
     data.severity_estimate || 'low', data.location || null, data.department_id || null, data.potential_impact || null]
  );
  await swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'incident.near_miss_reported', tenantId, sourceService: 'incident-advanced',
      entityType: 'near_miss', entityId: getFirstRow(r)?.near_miss_id, severity: 'info',
      payload: { title: data.title, severity: data.severity_estimate },
    } as any)), { tenantId, operation: 'eventBus:incident.near_miss_reported' });
  return getFirstRow(r);
}

export async function getNearMisses(tenantId: string, filters?: { status?: string; severity?: string }): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".near_miss_reports WHERE deleted_at IS NULL`;
  const params: unknown[] = [];
  if (filters?.status) { params.push(filters.status); sql += ` AND status = $${params.length}`; }
  if (filters?.severity) { params.push(filters.severity); sql += ` AND severity_estimate = $${params.length}`; }
  sql += ` ORDER BY reported_at DESC`;
  return (await safeQuery(sql, params)).rows;
}

export async function convertNearMissToIncident(tenantId: string, nearMissId: string, convertedBy: string): Promise<GenericRow | null> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.incident_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function createPIR(tenantId: string, data: {
  incident_id: string; title: string; pir_type?: string; lead_id?: string; scheduled_date?: string;
}): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const r = await safeQuery(
    `INSERT INTO "${schema}".incident_pir (incident_id, title, pir_type, lead_id, scheduled_date)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [data.incident_id, data.title, data.pir_type || 'standard', data.lead_id || null, data.scheduled_date || null]
  );
  await swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'incident.pir_created', tenantId, sourceService: 'incident-advanced',
      entityType: 'pir', entityId: getFirstRow(r)?.pir_id, severity: 'info',
      payload: { incidentId: data.incident_id },
    } as any)), { tenantId, operation: 'eventBus:incident.pir_created' });
  return getFirstRow(r);
}

export async function getPIRs(tenantId: string, incidentId?: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".incident_pir WHERE deleted_at IS NULL`;
  const params: unknown[] = [];
  if (incidentId) { params.push(incidentId); sql += ` AND incident_id = $1`; }
  sql += ` ORDER BY created_at DESC`;
  return (await safeQuery(sql, params)).rows;
}

export async function updatePIR(tenantId: string, pirId: string, data: Record<string, unknown>): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const allowed = ['status','title','what_happened','root_causes','contributing_factors','impact_analysis',
    'lessons_learned','recommendations','action_items','attendees','effectiveness_status','timeline_summary'];
  const fields: string[] = []; const vals: unknown[] = []; let idx = 1;
  for (const [k, v] of Object.entries(data)) {
    if (allowed.includes(k)) { fields.push(`${k} = $${idx}`); vals.push(typeof v === 'object' ? JSON.stringify(v) : v); idx++; }
  }
  if (!fields.length) return null;
  fields.push(`updated_at = NOW()`);
  vals.push(pirId);
  return getFirstRow((await safeQuery(`UPDATE "${schema}".incident_pir SET ${fields.join(',')} WHERE pir_id = $${idx} RETURNING *`, vals)));
}

export async function signOffPIR(tenantId: string, pirId: string, signerId: string, decision: string, comments?: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);

  const signOff = await withTransaction(tenantId, async (client) => {
    const r = await safeQueryWithClient(
      `INSERT INTO "${schema}".pir_sign_offs (pir_id, signer_id, decision, comments, signed_at)
       VALUES ($1,$2,$3,$4,NOW()) RETURNING *`,
      [pirId, signerId, decision, comments || null], client
    );
    if (decision === 'approved') {
      await safeQueryWithClient(`UPDATE "${schema}".incident_pir SET status = 'completed', sign_off_by = $1, sign_off_at = NOW() WHERE pir_id = $2`, [signerId, pirId], client);
    }
    return getFirstRow(r);
  });

  if (decision === 'approved') {
    await swallow(EC.EVENT_BUS, eventBus.publish(({
          eventType: 'incident.pir_signed_off', tenantId, sourceService: 'incident-advanced',
          entityType: 'pir', entityId: pirId, severity: 'info', payload: { signerId, decision },
        } as any)), { tenantId, operation: 'eventBus:incident.pir_signed_off' });
  }
  return signOff;
}

export async function generateRegulatoryNotification(tenantId: string, incidentId: string, data: {
  regulation_code: string; regulation_name: string; authority_name: string;
  sla_hours?: number; content_summary?: string;
}): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const deadline = data.sla_hours ? new Date(Date.now() + data.sla_hours * 3600000).toISOString() : null;
  const r = await safeQuery(
    `INSERT INTO "${schema}".incident_regulatory_notifications
       (incident_id, regulation_code, regulation_name, authority_name, sla_hours, deadline, content_summary)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [incidentId, data.regulation_code, data.regulation_name, data.authority_name, data.sla_hours || null, deadline, data.content_summary || null]
  );
  await swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'incident.regulatory_notification_due', tenantId, sourceService: 'incident-advanced',
      entityType: 'regulatory_notification', entityId: getFirstRow(r)?.notification_id, severity: 'critical',
      payload: { incidentId, regulationCode: data.regulation_code, deadline },
    } as any)), { tenantId, operation: 'eventBus:incident.regulatory_notification_due' });
  return getFirstRow(r);
}

export async function getRegulatoryReportableIncidents(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  return (await safeQuery(
    `SELECT n.*, i.title AS incident_title, i.severity AS incident_severity
     FROM "${schema}".incident_regulatory_notifications n
     JOIN "${schema}".incidents i ON i.incident_id = n.incident_id
     WHERE n.deleted_at IS NULL ORDER BY n.deadline ASC NULLS LAST`
  )).rows;
}

export async function markAsReported(tenantId: string, notificationId: string, submittedBy: string, referenceNumber?: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const r = await safeQuery(
    `UPDATE "${schema}".incident_regulatory_notifications
     SET status = 'submitted', submitted_at = NOW(), submitted_by = $1, reference_number = $2, updated_at = NOW()
     WHERE notification_id = $3 RETURNING *`,
    [submittedBy, referenceNumber || null, notificationId]
  );
  await swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'incident.regulatory_submitted', tenantId, sourceService: 'incident-advanced',
      entityType: 'regulatory_notification', entityId: notificationId, severity: 'info',
      payload: { submittedBy, referenceNumber },
    } as any)), { tenantId, operation: 'eventBus:incident.regulatory_submitted' });
  return getFirstRow(r);
}

export async function getIncidentTrends(tenantId: string, granularity?: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  return (await safeQuery(
    `SELECT * FROM "${schema}".incident_trend_cache
     WHERE granularity = $1 ORDER BY period_start DESC LIMIT 100`,
    [granularity || 'month']
  )).rows;
}

export async function getRecurringPatterns(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  return (await safeQuery(
    `SELECT * FROM "${schema}".incident_recurring_patterns WHERE is_active = TRUE ORDER BY occurrence_count DESC LIMIT 50`
  )).rows;
}

export async function linkIncidentToRisk(tenantId: string, incidentId: string, riskId: string, data: {
  link_type?: string; impact_on_risk?: string; linked_by: string; notes?: string;
}): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const r = await safeQuery(
    `INSERT INTO "${schema}".incident_risk_links (incident_id, risk_id, link_type, impact_on_risk, linked_by, notes)
     VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING *`,
    [incidentId, riskId, data.link_type || 'materialized', data.impact_on_risk || 'increase', data.linked_by, data.notes || null]
  );
  if (getFirstRow(r)) {
    await swallow(EC.EVENT_BUS, eventBus.publish(({
          eventType: 'incident.risk_linked', tenantId, sourceService: 'incident-advanced',
          entityType: 'incident', entityId: incidentId, severity: 'warning',
          payload: { riskId, linkType: data.link_type || 'materialized' },
        } as any)), { tenantId, operation: 'eventBus:incident.risk_linked' });
  }
  return getFirstRow(r);
}

export async function getIncidentRiskImpact(tenantId: string, incidentId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  return (await safeQuery(
    `SELECT l.*, r.title AS risk_title, r.risk_score
     FROM "${schema}".incident_risk_links l
     LEFT JOIN "${schema}".risks r ON r.risk_id = l.risk_id
     WHERE l.incident_id = $1 AND l.deleted_at IS NULL`, [incidentId]
  )).rows;
}

export async function autoUpdateRiskFromIncident(tenantId: string, incidentId: string): Promise<{ updated: number; risks: string[] }> {
  const schema = tenantSchema(tenantId);

  const result = await withTransaction(tenantId, async (client) => {
    const links = await safeQueryWithClient(
      `SELECT l.risk_id, l.impact_on_risk, r.risk_score, r.likelihood, r.impact
       FROM "${schema}".incident_risk_links l
       JOIN "${schema}".risks r ON r.risk_id = l.risk_id
       WHERE l.incident_id = $1 AND l.deleted_at IS NULL AND r.deleted_at IS NULL`,
      [incidentId], client
    );
    const updatedRisks: { riskId: string; previousScore: number; newScore: number }[] = [];
    for (const link of links.rows) {
      let scoreAdj = 0;
      if (link.impact_on_risk === 'increase') scoreAdj = 2;
      else if (link.impact_on_risk === 'significant_increase') scoreAdj = 4;
      else if (link.impact_on_risk === 'decrease') scoreAdj = -1;
      if (scoreAdj === 0) continue;
      const newScore = Math.max(1, Math.min(25, (link.risk_score || 10) + scoreAdj));
      await safeQueryWithClient(
        `UPDATE "${schema}".risks SET risk_score = $1, updated_at = NOW() WHERE risk_id = $2`,
        [newScore, link.risk_id], client
      );
      updatedRisks.push({ riskId: link.risk_id, previousScore: link.risk_score, newScore });
    }
    return updatedRisks;
  });

  for (const r of result) {
    await swallow(EC.EVENT_BUS, eventBus.publish(({
          eventType: 'risk.score_changed', tenantId, sourceService: 'incident-advanced',
          entityType: 'risk', entityId: r.riskId, severity: r.newScore >= 15 ? 'critical' : 'warning',
          payload: { previousScore: r.previousScore, newScore: r.newScore, reason: 'incident_impact', incidentId },
        } as any)), { tenantId, operation: 'eventBus:risk.score_changed' });
  }
  return { updated: result.length, risks: result.map(r => r.riskId) };
}
