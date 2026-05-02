"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCsrfEventSubscribers = registerCsrfEventSubscribers;
const events_1 = require("@dos/platform-core/events");
const observability_1 = require("@dos/platform-core/observability");
function registerCsrfEventSubscribers() {
    // ── CSRF policy change → audit log ──
    (0, events_1.subscribe)({
        eventType: 'csrf.policy.updated',
        subscriberId: 'csrf:policy-updated-audit',
        handler: async (event) => {
            try {
                const { logAuthDecision } = await import('../audit/decision-log.service.js');
                await logAuthDecision(event.tenantId, {
                    userId: event.payload?.updatedBy,
                    permissionCode: 'csrf.policy.update',
                    decision: 'allow',
                    reason: `CSRF policy updated: enforcement=${event.payload?.enforcementMode}`,
                });
            }
            catch (err) {
                observability_1.logger.warn('[CSRF:Subscriber] policy audit failed', { error: err.message });
            }
        },
    });
    // ── CSRF validation failure → check for attack pattern ──
    (0, events_1.subscribe)({
        eventType: 'csrf.validation.failed',
        subscriberId: 'csrf:failure-pattern-check',
        handler: async (event) => {
            try {
                const { getCsrfFailureCount } = await import('./csrf-audit.service.js');
                const ip = event.payload?.ip;
                if (!ip)
                    return;
                const count = await getCsrfFailureCount(ip, 5 * 60 * 1000);
                if (count >= 10) {
                    observability_1.logger.warn('[CSRF:Subscriber] Attack pattern detected', {
                        ip,
                        failureCount: count,
                        tenantId: event.tenantId,
                    });
                    const { logSecurityEvent } = await import('../audit/security-event.service.js');
                    await logSecurityEvent(event.tenantId, event.payload?.userId ?? 'unknown', 'brute_force_detected', { ip, metadata: { source: 'csrf', failureCount: count } });
                }
            }
            catch (err) {
                observability_1.logger.warn('[CSRF:Subscriber] pattern check failed', { error: err.message });
            }
        },
    });
    // ── Session anomaly detected → escalate critical ──
    (0, events_1.subscribe)({
        eventType: 'session.anomaly.detected',
        subscriberId: 'csrf:session-anomaly-escalate',
        handler: async (event) => {
            try {
                if (event.payload?.riskLevel === 'critical') {
                    const { logSecurityEvent } = await import('../audit/security-event.service.js');
                    await logSecurityEvent(event.tenantId, event.payload.userId, 'access_denied', {
                        ip: '',
                        metadata: {
                            source: 'session_anomaly',
                            eventType: event.payload.eventType,
                            sessionId: event.payload.sessionId,
                        },
                    });
                }
            }
            catch (err) {
                observability_1.logger.warn('[CSRF:Subscriber] anomaly escalation failed', { error: err.message });
            }
        },
    });
}
//# sourceMappingURL=csrf.subscribers.js.map