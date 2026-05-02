// ============================================
// Shahin — Incident Management Service
// Report, triage, investigate, lessons learned
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { createNotification, buildCriticalIncidentNotifications } from "../../../notification/services/notification.service";
import { recordActivity } from '../../ports/platform.port';
import { eventBus } from '../../ports/events.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

export async function reportIncident(tenantId: string, data: {
  title: string;
  description: string;
  category: string;
  severity?: string;
  affectedControls?: string[];
  reportedBy: string;
  org_unit_id?: number | null;
}): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".incidents
      (title, description, category, severity, affected_controls, reported_by, status, owner_user_id, org_unit_id)
     VALUES ($1,$2,$3,$4,$5,$6,'reported',$6,$7)
     RETURNING *`,
    [data.title, data.description, data.category,
     data.severity || 'medium', data.affectedControls || [], data.reportedBy,
     data.org_unit_id ?? null]
  );
  const incident = getFirstRow(result)!;

  // Record activity
  try { await recordActivity(tenantId, { userId: data.reportedBy, module: 'incident', action: 'create', entityType: 'incident', entityId: incident.incident_id, summary: `Reported incident: ${data.title}`, changes: {} }); } catch { /* best-effort */ }

  if (incident.severity === 'high' || incident.severity === 'critical') {
    try {
      const { escalateIncidentToGovernanceBody } = await import('../../../governance/services/governance/governance-hooks.service.js');
      await escalateIncidentToGovernanceBody(tenantId, incident.incident_id, incident.severity);
    } catch { /* best-effort */ }
  }

  if (incident.severity === 'critical') {
    try {
      const adminResult = await safeQuery(
        `SELECT user_id FROM public.users WHERE role IN ('admin', 'super_admin') AND tenant_id = $1`,
        [tenantId]
      );
      const adminIds = adminResult.rows.map((r: GenericRow) => r.user_id);
      const triggers = buildCriticalIncidentNotifications(adminIds, incident.severity);
      for (const t of triggers) {
        await createNotification(tenantId, {
          userId: t.userId,
          type: t.type,
          title: `Critical incident reported: ${incident.title}`,
          body: incident.description,
          link: `/incidents/${incident.incident_id}`,
        });
      }
    } catch { /* best-effort */ }
  }

  // EventBus: incident.created
  try { await eventBus.publish(({ eventType: 'incident.created', tenantId, sourceService: 'incident', entityType: 'incident', entityId: incident.incident_id, severity: incident.severity === 'critical' ? 'critical' : incident.severity === 'high' ? 'warning' : 'info', payload: { title: data.title, category: data.category, severity: incident.severity, reportedBy: data.reportedBy } } as any)); } catch { /* best-effort */ }

  try {
    const { resolveServiceNowConfig } = await import('../../integrations/services/integration-config-resolver.service.js');
    const snowCfg = await resolveServiceNowConfig(tenantId);
    if (snowCfg) {
      const { createIncident: createSnowIncident } = await import('../../../connectors/servicenow-adapter.js');
      const urgencyMap: Record<string, '1' | '2' | '3'> = { critical: '1', high: '2', medium: '3', low: '3' };
      await createSnowIncident(
        tenantId,
        { shortDescription: `[AGRC] ${data.title}`, description: data.description, urgency: Number(urgencyMap[incident.severity] || '3'), impact: Number(urgencyMap[incident.severity] || '3') },
      );
    }
  } catch { /* best-effort ServiceNow sync */ }

  return incident;
}

export async function getIncidents(tenantId: string, filters?: {
  status?: string; severity?: string; category?: string;
}, scopeUser?: { userId: string; role: string; isSuperAdmin?: boolean; permissions?: string[] }): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".incidents WHERE 1=1`;
  const params: unknown[] = [];
  let idx = 1;

  const hasFullScope = scopeUser?.isSuperAdmin === true || (scopeUser?.permissions ?? []).includes('incident.record.read_all');
  if (scopeUser && !hasFullScope) {
    sql += ` AND (owner_user_id = $${idx} OR reported_by = $${idx})`; params.push(scopeUser.userId); idx++;
  }

  if (filters?.status) { sql += ` AND status = $${idx++}`; params.push(filters.status); }
  if (filters?.severity) { sql += ` AND severity = $${idx++}`; params.push(filters.severity); }
  if (filters?.category) { sql += ` AND category = $${idx++}`; params.push(filters.category); }

  sql += ` ORDER BY created_at DESC`;
  const result = await safeQuery(sql, params);
  return result.rows;
}

export async function getIncidentById(tenantId: string, incidentId: string): Promise<any | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".incidents WHERE incident_id = $1`, [incidentId]
  );
  return getFirstRow(result) || null;
}

export async function investigateIncident(tenantId: string, incidentId: string, data: {
  assignedTo: string;
  rootCause?: string;
  status?: string;
}): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.incident_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function recordLessonsLearned(tenantId: string, incidentId: string, data: {
  lessonsLearned: string;
}): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.incident_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function updateIncident(tenantId: string, incidentId: string, data: {
  title?: string;
  description?: string;
  category?: string;
  severity?: string;
  affectedControls?: string[];
  assignedTo?: string;
}): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.incident_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function updateIncidentStatus(tenantId: string, incidentId: string, status: string): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.incident_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}
