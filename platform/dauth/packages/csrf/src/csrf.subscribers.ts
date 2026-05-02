import { subscribe } from '@dos/platform-core/events';
import { logger } from '@dos/platform-core/observability';

export function registerCsrfEventSubscribers(): void {
  // ── CSRF policy change → audit log ──
  subscribe({
    eventType: 'csrf.policy.updated',
    subscriberId: 'csrf:policy-updated-audit',
    handler: async (event) => {
      try {
        const { logAuthDecision } = await import('./audit/decision-log.service.js');
        await logAuthDecision(event.tenantId ?? 'system', {
          userId: event.payload?.updatedBy as string,
          permissionCode: 'csrf.policy.update',
          decision: 'allow',
          reason: `CSRF policy updated: enforcement=${event.payload?.enforcementMode}`,
        });
      } catch (err) {
        logger.warn('[CSRF:Subscriber] policy audit failed', { error: (err as Error).message });
      }
    },
  });

  // ── CSRF validation failure → check for attack pattern ──
  subscribe({
    eventType: 'csrf.validation.failed',
    subscriberId: 'csrf:failure-pattern-check',
    handler: async (event) => {
      try {
        const { getCsrfFailureCount } = await import('./csrf-audit.service.js');
        const ip = event.payload?.ip as string;
        if (!ip) return;

        const count = await getCsrfFailureCount(ip, 5 * 60 * 1000);
        if (count >= 10) {
          logger.warn('[CSRF:Subscriber] Attack pattern detected', {
            ip,
            failureCount: count,
            tenantId: event.tenantId,
          });
          const { logSecurityEvent } = await import('./audit/security-event.service.js');
          await logSecurityEvent(
            event.tenantId ?? 'system',
            event.payload?.userId as string ?? 'unknown',
            'brute_force_detected',
            { ip, metadata: { source: 'csrf', failureCount: count } },
          );
        }
      } catch (err) {
        logger.warn('[CSRF:Subscriber] pattern check failed', { error: (err as Error).message });
      }
    },
  });

  // ── Session anomaly detected → escalate critical ──
  subscribe({
    eventType: 'session.anomaly.detected',
    subscriberId: 'csrf:session-anomaly-escalate',
    handler: async (event) => {
      try {
        if (event.payload?.riskLevel === 'critical') {
          const { logSecurityEvent } = await import('./audit/security-event.service.js');
          await logSecurityEvent(
            event.tenantId ?? 'system',
            event.payload.userId as string,
            'access_denied',
            {
              ip: '',
              metadata: {
                source: 'session_anomaly',
                eventType: event.payload.eventType,
                sessionId: event.payload.sessionId,
              },
            },
          );
        }
      } catch (err) {
        logger.warn('[CSRF:Subscriber] anomaly escalation failed', { error: (err as Error).message });
      }
    },
  });
}
