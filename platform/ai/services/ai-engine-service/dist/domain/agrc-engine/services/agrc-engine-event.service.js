import { eventBus } from '../ports/events.port.js';
import { randomUUID } from 'crypto';
function severityForAction(act) {
    if (act === 'run_failed' || act === 'ccm_failed')
        return 'critical';
    if (act === 'config_changed' || act === 'escalated')
        return 'warning';
    return 'info';
}
export function emitAgrcEngineEvent(opts) {
    try {
        const correlationId = opts.correlationId || randomUUID();
        const eventType = `agrc_engine.${opts.entityType}.${opts.action}`;
        eventBus.publish({
            eventType,
            tenantId: opts.tenantId,
            sourceService: 'agrc-engine',
            severity: severityForAction(opts.action),
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
    }
}
export function emitAgrcEngineStatusChange(tenantId, entityType, entityId, previousState, newState, triggeredBy, correlationId) {
    emitAgrcEngineEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}
export function emitRunStarted(tenantId, runId, runType, triggeredBy) {
    emitAgrcEngineEvent({ tenantId, entityType: 'run', entityId: runId, action: 'run_started', triggeredBy, data: { runType } });
}
export function emitRunFailed(tenantId, runId, errorReason, triggeredBy) {
    emitAgrcEngineEvent({ tenantId, entityType: 'run', entityId: runId, action: 'run_failed', triggeredBy, data: { errorReason } });
}
export function emitConfigChanged(tenantId, configId, configKey, triggeredBy) {
    emitAgrcEngineEvent({ tenantId, entityType: 'config', entityId: configId, action: 'config_changed', triggeredBy, data: { configKey } });
}
//# sourceMappingURL=agrc-engine-event.service.js.map