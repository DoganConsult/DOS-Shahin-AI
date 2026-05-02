import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';

export interface CsrfDiagnosticsResult {
  tenantId: string;
  timestamp: string;
  failedValidations24h: number;
  failedValidations1h: number;
  uniqueFailureIps24h: number;
  suspiciousIps: Array<{ ip: string; count: number }>;
  sessionAnomalies24h: number;
  criticalAnomalies24h: number;
  policyActive: boolean;
  enforcementMode: string;
}

/** Run CSRF diagnostics for a tenant. */
export async function runCsrfDiagnostics(tenantId: string): Promise<CsrfDiagnosticsResult> {
  const timestamp = new Date().toISOString();
  const q = (sql: string, params: unknown[] = []) =>
    safeQuery(sql, params).then(r => r.rows).catch((err) => {
      logger.debug('[CSRF:Diagnostics] query degraded', { error: (err as Error).message });
      return [];
    });

  const [failures24h, failures1h, uniqueIps, suspiciousIps, anomalies24h, criticalAnomalies, policy] =
    await Promise.all([
      q(`SELECT COUNT(*)::int AS cnt FROM csrf_failures
         WHERE tenant_id = $1 AND occurred_at > NOW() - INTERVAL '24 hours'`, [tenantId])
        .then(r => parseInt(r[0]?.cnt ?? '0', 10)),

      q(`SELECT COUNT(*)::int AS cnt FROM csrf_failures
         WHERE tenant_id = $1 AND occurred_at > NOW() - INTERVAL '1 hour'`, [tenantId])
        .then(r => parseInt(r[0]?.cnt ?? '0', 10)),

      q(`SELECT COUNT(DISTINCT ip_address)::int AS cnt FROM csrf_failures
         WHERE tenant_id = $1 AND occurred_at > NOW() - INTERVAL '24 hours'`, [tenantId])
        .then(r => parseInt(r[0]?.cnt ?? '0', 10)),

      q(`SELECT ip_address AS ip, COUNT(*)::int AS cnt FROM csrf_failures
         WHERE tenant_id = $1 AND occurred_at > NOW() - INTERVAL '24 hours'
         GROUP BY ip_address HAVING COUNT(*) >= 5
         ORDER BY cnt DESC LIMIT 10`, [tenantId]) as Promise<Array<{ ip: string; cnt: number }>>,

      q(`SELECT COUNT(*)::int AS cnt FROM session_security_events
         WHERE tenant_id = $1 AND occurred_at > NOW() - INTERVAL '24 hours'`, [tenantId])
        .then(r => parseInt(r[0]?.cnt ?? '0', 10)),

      q(`SELECT COUNT(*)::int AS cnt FROM session_security_events
         WHERE tenant_id = $1 AND risk_level = 'critical' AND occurred_at > NOW() - INTERVAL '24 hours'`, [tenantId])
        .then(r => parseInt(r[0]?.cnt ?? '0', 10)),

      q(`SELECT enforcement_mode, is_active FROM csrf_security_policies
         WHERE tenant_id = $1 LIMIT 1`, [tenantId])
        .then(r => r[0] ?? { enforcement_mode: 'block', is_active: false }),
    ]);

  return {
    tenantId,
    timestamp,
    failedValidations24h: failures24h as number,
    failedValidations1h: failures1h as number,
    uniqueFailureIps24h: uniqueIps as number,
    suspiciousIps: (suspiciousIps as Array<{ ip: string; cnt: number }>).map(r => ({ ip: r.ip, count: r.cnt })),
    sessionAnomalies24h: anomalies24h as number,
    criticalAnomalies24h: criticalAnomalies as number,
    policyActive: (policy as { is_active: boolean }).is_active,
    enforcementMode: (policy as { enforcement_mode: string }).enforcement_mode,
  };
}
