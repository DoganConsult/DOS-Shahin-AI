import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { logger } from '../../../ports/logger.port';

const LOG_TAG = '[AI-AuditAnomaly]';

export interface AuditAnomaly {
  type: 'off_hours_access' | 'denied_spike' | 'privilege_escalation' | 'unusual_permission';
  severity: 'critical' | 'high' | 'medium' | 'low';
  userId: string;
  detail: string;
  count: number;
  detectedAt: string;
}

export interface AnomalyReport {
  tenantId: string;
  timestamp: string;
  anomalies: AuditAnomaly[];
  summary: { total: number; critical: number; high: number; medium: number; low: number };
}

export async function detectAuditAnomalies(tenantId: string, lookbackHours = 24): Promise<AnomalyReport> {
  const schema = tenantSchema(tenantId);
  const safeHours = Math.max(1, Math.min(Math.floor(Number(lookbackHours) || 24), 720));
  const anomalies: AuditAnomaly[] = [];

  await detectOffHoursAccess(schema, anomalies, safeHours);
  await detectDeniedSpike(schema, anomalies, safeHours);
  await detectPrivilegeEscalation(schema, anomalies, safeHours);
  await detectUnusualPermissionAccess(schema, anomalies, safeHours);

  const summary = {
    total: anomalies.length,
    critical: anomalies.filter(a => a.severity === 'critical').length,
    high: anomalies.filter(a => a.severity === 'high').length,
    medium: anomalies.filter(a => a.severity === 'medium').length,
    low: anomalies.filter(a => a.severity === 'low').length,
  };

  logger.info(`${LOG_TAG} ${tenantId}: ${summary.total} anomalies (${summary.critical}C/${summary.high}H)`);

  const report: AnomalyReport = { tenantId, timestamp: new Date().toISOString(), anomalies, summary };

  try {
    await safeQuery(
      `INSERT INTO "${schema}".agrc_event_log (event_type, payload, severity, source_service)
       VALUES ('ai_audit_anomaly_report', $1, $2, 'platform')`,
      [JSON.stringify(report), summary.critical > 0 ? 'critical' : summary.high > 0 ? 'high' : 'info'],
    );
  } catch (err) {
    logger.warn(`${LOG_TAG} Failed to persist anomaly report for ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
  }

  return report;
}

async function detectOffHoursAccess(schema: string, anomalies: AuditAnomaly[], hours: number): Promise<void> {
  try {
    const { rows } = await safeQuery(
      `SELECT user_id, COUNT(*) AS cnt
       FROM "${schema}".role_usage_audit
       WHERE created_at > NOW() - make_interval(hours => $1)
         AND EXTRACT(HOUR FROM created_at) NOT BETWEEN 6 AND 22
       GROUP BY user_id
       HAVING COUNT(*) > 10
       ORDER BY cnt DESC LIMIT 50`,
      [hours],
    );
    for (const r of rows) {
      anomalies.push({
        type: 'off_hours_access',
        severity: Number(r.cnt) > 50 ? 'high' : 'medium',
        userId: r.user_id,
        detail: `${r.cnt} permission checks outside business hours (22:00–06:00)`,
        count: Number(r.cnt),
        detectedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    logger.warn(`${LOG_TAG} detectOffHoursAccess failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function detectDeniedSpike(schema: string, anomalies: AuditAnomaly[], hours: number): Promise<void> {
  try {
    const { rows } = await safeQuery(
      `SELECT user_id, COUNT(*) AS denied_count
       FROM "${schema}".role_usage_audit
       WHERE result = 'denied' AND created_at > NOW() - make_interval(hours => $1)
       GROUP BY user_id
       HAVING COUNT(*) > 20
       ORDER BY denied_count DESC LIMIT 50`,
      [hours],
    );
    for (const r of rows) {
      anomalies.push({
        type: 'denied_spike',
        severity: Number(r.denied_count) > 100 ? 'critical' : 'high',
        userId: r.user_id,
        detail: `${r.denied_count} denied permission attempts in ${hours}h`,
        count: Number(r.denied_count),
        detectedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    logger.warn(`${LOG_TAG} detectDeniedSpike failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function detectPrivilegeEscalation(schema: string, anomalies: AuditAnomaly[], hours: number): Promise<void> {
  try {
    const { rows } = await safeQuery(
      `SELECT user_id, COUNT(DISTINCT permission_code) AS new_perms
       FROM "${schema}".role_usage_audit
       WHERE result = 'allowed'
         AND created_at > NOW() - make_interval(hours => $1)
         AND permission_code NOT IN (
           SELECT DISTINCT permission_code FROM "${schema}".role_usage_audit
           WHERE result = 'allowed'
             AND created_at BETWEEN NOW() - make_interval(hours => $2) AND NOW() - make_interval(hours => $1)
             AND user_id = role_usage_audit.user_id
         )
       GROUP BY user_id
       HAVING COUNT(DISTINCT permission_code) > 5
       ORDER BY new_perms DESC LIMIT 50`,
      [hours, hours * 2],
    );
    for (const r of rows) {
      anomalies.push({
        type: 'privilege_escalation',
        severity: Number(r.new_perms) > 15 ? 'critical' : 'high',
        userId: r.user_id,
        detail: `User accessed ${r.new_perms} permissions never used before in prior ${hours}h window`,
        count: Number(r.new_perms),
        detectedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    logger.warn(`${LOG_TAG} detectPrivilegeEscalation failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function detectUnusualPermissionAccess(schema: string, anomalies: AuditAnomaly[], hours: number): Promise<void> {
  try {
    const { rows } = await safeQuery(
      `SELECT user_id, permission_code, COUNT(*) AS cnt
       FROM "${schema}".role_usage_audit
       WHERE result = 'allowed'
         AND created_at > NOW() - make_interval(hours => $1)
         AND permission_code LIKE '%:delete'
       GROUP BY user_id, permission_code
       HAVING COUNT(*) > 10
       ORDER BY cnt DESC LIMIT 50`,
      [hours],
    );
    for (const r of rows) {
      anomalies.push({
        type: 'unusual_permission',
        severity: 'medium',
        userId: r.user_id,
        detail: `${r.cnt} delete operations on "${r.permission_code}" in ${hours}h`,
        count: Number(r.cnt),
        detectedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    logger.warn(`${LOG_TAG} detectUnusualPermissionAccess failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function getLastAnomalyReport(tenantId: string): Promise<AnomalyReport | null> {
  try {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(
      `SELECT payload FROM "${schema}".agrc_event_log
       WHERE event_type = 'ai_audit_anomaly_report'
       ORDER BY created_at DESC LIMIT 1`,
    );
    if (rows.length > 0) {
      return (typeof rows[0].payload === 'string' ? JSON.parse(rows[0].payload) : rows[0].payload) as AnomalyReport;
    }
  } catch (err) {
    logger.warn(`${LOG_TAG} getLastAnomalyReport failed for ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
  }
  return null;
}
