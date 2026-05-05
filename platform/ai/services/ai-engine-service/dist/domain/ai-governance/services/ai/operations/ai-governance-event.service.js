// @ts-nocheck
import { eventBus } from '../../../ports/events.port';
import { randomUUID } from 'crypto';
export function emitAiGovernanceEvent(opts) {
    try {
        const correlationId = opts.correlationId || randomUUID();
        const eventType = `ai-governance.${opts.entityType}.${opts.action}`;
        eventBus.publish({
            eventType,
            tenantId: opts.tenantId,
            sourceService: 'ai-governance',
            severity: 'info',
            payload: {
                entityType: opts.entityType,
                entityId: opts.entityId,
                action: opts.action,
                triggeredBy: opts.triggeredBy,
                correlationId,
                previousState: opts.previousState,
                newState: opts.newState,
                timestamp: new Date().toISOString(),
                eventVersion: 1,
                ...(opts.data || {}),
            },
        });
    }
    catch {
        // Non-critical: events are best-effort
    }
}
export function emitAiGovernanceStatusChange(tenantId, entityType, entityId, previousState, newState, triggeredBy, correlationId) {
    emitAiGovernanceEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}
//# sourceMappingURL=ai-governance-event.service.js.map