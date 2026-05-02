/**
 * DSOC audit bridge for AI-OS.
 *
 * Subscribes to ai.* governance/runtime events on the platform event
 * backbone and re-publishes them as `dsoc.audit.config_change` (or the
 * matching DSOC category) so that DSOC's persistent subscribers
 * (registerDSOCSubscribers) write them into platform_dsoc.audit_log
 * with the canonical DSOCAuditEvent shape.
 *
 * This satisfies the AI-OS module manifest contract:
 *   security.auditTarget = "DSOC via dsoc.audit.config_change for every
 *   agent registration, kill switch toggle, and HITL gate override".
 */

import { eventBus } from '../ports/events.port.js';

const SOURCE = 'ai-engine-service';

/** Map of ai.* event types → DSOC category + action. */
const AUDIT_BRIDGE: Record<string, { category: 'config_change' | 'authz' | 'data_access' | 'threat'; action: string }> = {
  'ai.kill_switch.activated':       { category: 'config_change', action: 'ai.kill_switch.activated' },
  'ai.autonomy.level_changed':      { category: 'config_change', action: 'ai.autonomy.level_changed' },
  'ai.agent.enabled':               { category: 'config_change', action: 'ai.agent.enabled' },
  'ai.agent.disabled':              { category: 'config_change', action: 'ai.agent.disabled' },
  'ai.agent.started':               { category: 'data_access',   action: 'ai.agent.started' },
  'ai.agent.completed':             { category: 'data_access',   action: 'ai.agent.completed' },
  'ai.agent.failed':                { category: 'threat',        action: 'ai.agent.failed' },
  'ai.delegation.granted':          { category: 'authz',         action: 'ai.delegation.granted' },
  'ai.delegation.revoked':          { category: 'authz',         action: 'ai.delegation.revoked' },
  'ai.delegation.action_executed':  { category: 'data_access',   action: 'ai.delegation.action_executed' },
  'ai.circuit_breaker.opened':      { category: 'threat',        action: 'ai.circuit_breaker.opened' },
  'ai.circuit_breaker.closed':      { category: 'config_change', action: 'ai.circuit_breaker.closed' },
  'ai.cost.threshold_exceeded':     { category: 'threat',        action: 'ai.cost.threshold_exceeded' },
  'ai.proposal.approved':           { category: 'config_change', action: 'ai.proposal.approved' },
  'ai.proposal.rejected':           { category: 'config_change', action: 'ai.proposal.rejected' },
};

export function installDSOCAuditBridge(): { wired: number } {
  let wired = 0;
  for (const [aiEvent, { category, action }] of Object.entries(AUDIT_BRIDGE)) {
    eventBus.subscribe(aiEvent as any, `ai.dsoc-audit-bridge.${aiEvent}`, async (envelope: any) => {
      const tenantId = envelope?.tenantId ?? envelope?.payload?.tenantId ?? 'platform';
      const payload = envelope?.payload ?? {};
      const severity = envelope?.severity ?? (category === 'threat' ? 'high' : 'info');
      const actor = payload?.actorId
        ? { type: 'user' as const, id: String(payload.actorId) }
        : { type: 'service' as const, id: SOURCE };
      try {
        eventBus.publish({
          eventType: `dsoc.audit.${category}` as any,
          tenantId,
          sourceService: SOURCE,
          severity,
          payload: {
            category,
            severity,
            actor,
            action,
            resource: payload?.resource ?? { type: 'ai-agent', id: payload?.agentId ?? payload?.agentCode ?? 'n/a' },
            outcome: 'success',
            occurredAt: new Date().toISOString(),
            attributes: payload,
            correlationId: envelope?.correlationId ?? envelope?.eventId,
          },
        } as any);
      } catch {
        // bridge must not throw — drop on backbone errors
      }
    });
    wired++;
  }
  return { wired };
}
