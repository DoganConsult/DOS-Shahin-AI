"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCsrfDiagnostics = runCsrfDiagnostics;
const db_1 = require("@dos/db");
const observability_1 = require("@dos/platform-core/observability");
/** Run CSRF diagnostics for a tenant. */
async function runCsrfDiagnostics(tenantId) {
    const timestamp = new Date().toISOString();
    const q = (sql, params = []) => (0, db_1.safeQuery)(sql, params).then(r => r.rows).catch((err) => {
        observability_1.logger.debug('[CSRF:Diagnostics] query degraded', { error: err.message });
        return [];
    });
    const [failures24h, failures1h, uniqueIps, suspiciousIps, anomalies24h, criticalAnomalies, policy] = await Promise.all([
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
         ORDER BY cnt DESC LIMIT 10`, [tenantId]),
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
        failedValidations24h: failures24h,
        failedValidations1h: failures1h,
        uniqueFailureIps24h: uniqueIps,
        suspiciousIps: suspiciousIps.map(r => ({ ip: r.ip, count: r.cnt })),
        sessionAnomalies24h: anomalies24h,
        criticalAnomalies24h: criticalAnomalies,
        policyActive: policy.is_active,
        enforcementMode: policy.enforcement_mode,
    };
}
//# sourceMappingURL=csrf-diagnostics.service.js.map