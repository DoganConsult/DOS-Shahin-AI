"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitActionEvent = emitActionEvent;
exports.emitActionStatusChange = emitActionStatusChange;
exports.emitActionAssigned = emitActionAssigned;
exports.emitActionCompleted = emitActionCompleted;
exports.emitActionOverdue = emitActionOverdue;
exports.emitActionEscalated = emitActionEscalated;
exports.emitDueSoonWarning = emitDueSoonWarning;
exports.emitPriorityChanged = emitPriorityChanged;
const events_port_1 = require("../ports/events.port");
const crypto_1 = require("crypto");
function severityForAction(act) {
    if (act === 'sla_breached' || act === 'overdue_detected')
        return 'critical';
    if (act === 'due_soon_warning' || act === 'escalated' || act === 'reopened')
        return 'warning';
    return 'info';
}
function emitActionEvent(opts) {
    try {
        const correlationId = opts.correlationId || (0, crypto_1.randomUUID)();
        const eventType = `action.${opts.entityType}.${opts.action}`;
        events_port_1.eventBus.publish({
            eventType,
            tenantId: opts.tenantId,
            sourceService: 'action',
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
function emitActionStatusChange(tenantId, entityType, entityId, previousState, newState, triggeredBy, correlationId) {
    emitActionEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}
function emitActionAssigned(tenantId, actionId, assignedTo, priority, triggeredBy) {
    emitActionEvent({ tenantId, entityType: 'action_item', entityId: actionId, action: 'assigned', triggeredBy, data: { assignedTo, priority } });
}
function emitActionCompleted(tenantId, actionId, triggeredBy) {
    emitActionEvent({ tenantId, entityType: 'action_item', entityId: actionId, action: 'completed', triggeredBy, newState: 'completed' });
}
function emitActionOverdue(tenantId, actionId, daysOverdue, priority, triggeredBy) {
    emitActionEvent({ tenantId, entityType: 'action_item', entityId: actionId, action: 'overdue_detected', triggeredBy, data: { daysOverdue, priority } });
}
function emitActionEscalated(tenantId, actionId, escalatedTo, reason, triggeredBy) {
    emitActionEvent({ tenantId, entityType: 'action_item', entityId: actionId, action: 'escalated', triggeredBy, data: { escalatedTo, reason } });
}
function emitDueSoonWarning(tenantId, actionId, hoursRemaining, triggeredBy) {
    emitActionEvent({ tenantId, entityType: 'action_item', entityId: actionId, action: 'due_soon_warning', triggeredBy, data: { hoursRemaining } });
}
function emitPriorityChanged(tenantId, actionId, oldPriority, newPriority, triggeredBy) {
    emitActionEvent({ tenantId, entityType: 'action_item', entityId: actionId, action: 'priority_changed', triggeredBy, data: { oldPriority, newPriority } });
}
//# sourceMappingURL=action-event.service.js.map