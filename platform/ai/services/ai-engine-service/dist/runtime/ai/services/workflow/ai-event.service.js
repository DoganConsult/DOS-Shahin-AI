// @ts-nocheck
import { eventBus } from '../../ports/events.port';
import { randomUUID } from 'crypto';
export function emitAiEvent(opts) {
    try {
        const correlationId = opts.correlationId || randomUUID();
        const eventType = `ai.${opts.entityType}.${opts.action}`;
        eventBus.publish({
            eventType,
            tenantId: opts.tenantId,
            sourceService: 'ai',
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
export function emitAiStatusChange(tenantId, entityType, entityId, previousState, newState, triggeredBy, correlationId) {
    emitAiEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}
//# sourceMappingURL=ai-event.service.js.map