"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitFoundationEvent = emitFoundationEvent;
exports.emitFoundationStatusChange = emitFoundationStatusChange;
exports.emitOrgRestructured = emitOrgRestructured;
exports.emitDepartmentCreated = emitDepartmentCreated;
exports.emitPositionAssigned = emitPositionAssigned;
const events_port_1 = require("../../ports/events.port");
const crypto_1 = require("crypto");
function severityForAction(act) {
    if (act === 'org_restructured' || act === 'deleted')
        return 'critical';
    if (act === 'hierarchy_changed' || act === 'escalated')
        return 'warning';
    return 'info';
}
function emitFoundationEvent(opts) {
    try {
        const correlationId = opts.correlationId || (0, crypto_1.randomUUID)();
        const eventType = `foundation.${opts.entityType}.${opts.action}`;
        events_port_1.eventBus.publish({
            eventType,
            tenantId: opts.tenantId,
            source: 'foundation',
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
function emitFoundationStatusChange(tenantId, entityType, entityId, previousState, newState, triggeredBy, correlationId) {
    emitFoundationEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}
function emitOrgRestructured(tenantId, orgId, changeType, triggeredBy) {
    emitFoundationEvent({ tenantId, entityType: 'organization', entityId: orgId, action: 'org_restructured', triggeredBy, data: { changeType } });
}
function emitDepartmentCreated(tenantId, deptId, parentId, triggeredBy) {
    emitFoundationEvent({ tenantId, entityType: 'department', entityId: deptId, action: 'department_created', triggeredBy, data: { parentId } });
}
function emitPositionAssigned(tenantId, positionId, userId, triggeredBy) {
    emitFoundationEvent({ tenantId, entityType: 'position', entityId: positionId, action: 'position_assigned', triggeredBy, data: { userId } });
}
//# sourceMappingURL=foundation-event.service.js.map