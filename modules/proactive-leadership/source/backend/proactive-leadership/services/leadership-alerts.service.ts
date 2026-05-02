import { safeQuery, tenantSchema } from '../ports/database.port';
import { recordAudit } from '../../audit/services/audit/core/audit-trail.service.js';

import { emitEvent, notifyDomainChange } from '../ports/events.port';
import { logger } from '../ports/logger.port';
import { SYSTEM_JOB_ACTOR } from '../ports/platform.port';

export interface LeadershipAlert {
  id: string;
  tenantId: string;
  alertType: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  sourceModule: string;
  acknowledged: boolean;
  createdAt: string;
}

export async function getAlerts(tenantId: string, query_?: any): Promise<LeadershipAlert[]> {
  const schema = tenantSchema(tenantId);
  const conds = ['1=1'];
  const params: unknown[] = [];
  let idx = 1;
  if (query_?.acknowledged !== undefined) { conds.push(`acknowledged = $${idx++}`); params.push(query_.acknowledged === 'true' || query_.acknowledged === true); }
  if (query_?.severity) { conds.push(`severity = $${idx++}`); params.push(query_.severity); }
  const limit = Math.min(Number(query_?.limit) || 50, 200);

  const { rows } = await safeQuery(
    `SELECT id, tenant_id, alert_type, title, message, severity, source_module, acknowledged, created_at
     FROM "${schema}".leadership_alerts
     WHERE ${conds.join(' AND ')}
     ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, created_at DESC
     LIMIT ${limit}`,
    params as string[],
  ).catch(() => ({ rows: [] }));

  return rows.map(( r: Record<string, unknown>) => ({
    id: r.id, tenantId: r.tenant_id ?? tenantId, alertType: r.alert_type ?? 'general',
    title: r.title ?? '', message: r.message ?? '', severity: r.severity ?? 'info',
    sourceModule: r.source_module ?? 'platform', acknowledged: Boolean(r.acknowledged),
    createdAt: r.created_at ?? new Date().toISOString(),
  }));
}

export async function acknowledgeAlert(tenantId: string, alertId: string, userId?: string): Promise<LeadershipAlert | null> {
  const schema = tenantSchema(tenantId);
  const uid = userId ?? SYSTEM_JOB_ACTOR;

  const { rows: beforeRows } = await safeQuery(
    `SELECT * FROM "${schema}".leadership_alerts WHERE id = $1 LIMIT 1`,
    [alertId],
  ).catch(() => ({ rows: [] }));
  const beforeState = beforeRows.length > 0 ? { acknowledged: Boolean(beforeRows[0].acknowledged), severity: beforeRows[0].severity } : undefined;

  const { rows } = await safeQuery(
    `UPDATE "${schema}".leadership_alerts SET acknowledged = true, acknowledged_by = $2, acknowledged_at = NOW(), updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [alertId, uid],
  ).catch(() => ({ rows: [] }));
  if (rows.length === 0) return null;
  const r = rows[0] as Record<string, unknown>;
  const alert: LeadershipAlert = {

    id: r.id, tenantId: r.tenant_id ?? tenantId, alertType: r.alert_type ?? 'general',

    title: r.title ?? '', message: r.message ?? '', severity: r.severity ?? 'info',

    sourceModule: r.source_module ?? 'platform', acknowledged: true,

    createdAt: r.created_at ?? new Date().toISOString(),
  };

  recordAudit({
    tenantId, userId: uid, module: 'proactive-leadership', action: 'update',
    entityType: 'leadership_alert', entityId: alertId,
    beforeState,
    afterState: { acknowledged: true, severity: alert.severity },
  }).catch((e: any) => logger.warn('[proactive-leadership] audit failed', { error: (e as Error).message }));

  emitEvent(({
      tenantId, userId: uid, module: 'proactive-leadership', event: 'alert.acknowledged',
      entityType: 'leadership_alert', entityId: alertId,
      data: { alertType: alert.alertType, severity: alert.severity },
    } as any)).catch((e: any) => logger.warn('[proactive-leadership] event emission failed', { error: (e as Error).message }));

  notifyDomainChange(tenantId, 'proactive-leadership', 'update', alertId);

  logger.info('[proactive-leadership] alert acknowledged', { tenantId, alertId, severity: alert.severity });

  return alert;
}
