"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordCsrfFailure = recordCsrfFailure;
exports.getCsrfFailureCount = getCsrfFailureCount;
exports.getRecentCsrfFailures = getRecentCsrfFailures;
const db_1 = require("@dos/db");
const publish_with_dsoc_1 = require("../events/publish-with-dsoc");
const resilience_1 = require("@dos/platform-core/resilience");
const observability_1 = require("@dos/platform-core/observability");
/** Persist a CSRF failure to DB + publish security event + log. */
async function recordCsrfFailure(opts) {
    // DB persistence
    await (0, db_1.safeQuery)(`INSERT INTO csrf_failures
       (tenant_id, session_id, user_id, ip_address, user_agent, path, method,
        reason, hint_returned, correlation_id)
     VALUES ($1, $2, $3, $4::inet, $5, $6, $7, $8, $9, $10)`, [
        opts.tenantId ?? null, opts.sessionId ?? null, opts.userId ?? null,
        opts.ip ?? null, opts.userAgent ?? null, opts.path, opts.method,
        opts.reason, opts.hintReturned ?? null, opts.correlationId ?? null,
    ]).catch((err) => {
        observability_1.logger.warn('[CSRF:Audit] Failed to persist failure', { error: err.message });
    });
    // Structured log (always)
    observability_1.logger.warn('[CSRF] Validation failed', {
        event: 'csrf_failure',
        reason: opts.reason,
        ip: opts.ip,
        path: opts.path,
        method: opts.method,
        tenantId: opts.tenantId,
        correlationId: opts.correlationId,
    });
    // Event bus (for subscribers — alerting, rate limiting, etc.)
    if (opts.tenantId) {
        await (0, publish_with_dsoc_1.publish)('csrf.validation.failed', opts.tenantId, {
            reason: opts.reason,
            ip: opts.ip,
            path: opts.path,
            userId: opts.userId,
            sessionId: opts.sessionId,
        }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    }
}
/** Count failures in a time window for rate limiting. */
async function getCsrfFailureCount(ip, windowMs) {
    try {
        const { rows } = await (0, db_1.safeQuery)(`SELECT COUNT(*)::int AS cnt FROM csrf_failures
       WHERE ip_address = $1::inet AND occurred_at > NOW() - ($2 || ' milliseconds')::interval`, [ip, String(windowMs)]);
        return parseInt(rows[0]?.cnt ?? '0', 10);
    }
    catch {
        return 0;
    }
}
/** Get recent CSRF failures for admin dashboard. */
async function getRecentCsrfFailures(tenantId, limit = 50) {
    const { rows } = await (0, db_1.safeQuery)(`SELECT failure_id, ip_address, path, method, reason, occurred_at
     FROM csrf_failures
     WHERE tenant_id = $1
     ORDER BY occurred_at DESC LIMIT $2`, [tenantId, limit]);
    return rows.map(r => ({
        failureId: r.failure_id,
        ip: r.ip_address ?? '',
        path: r.path,
        method: r.method,
        reason: r.reason,
        occurredAt: r.occurred_at?.toISOString?.() ?? '',
    }));
}
//# sourceMappingURL=csrf-audit.service.js.map