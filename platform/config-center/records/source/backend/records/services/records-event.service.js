"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitRecordsEvent = emitRecordsEvent;
exports.emitRecordsStatusChange = emitRecordsStatusChange;
exports.emitLegalHoldPlaced = emitLegalHoldPlaced;
exports.emitLegalHoldReleased = emitLegalHoldReleased;
exports.emitDisposalExecuted = emitDisposalExecuted;
exports.emitRetentionAssigned = emitRetentionAssigned;
exports.emitRecordClassified = emitRecordClassified;
exports.emitRecordReclassified = emitRecordReclassified;
const events_port_1 = require("../ports/events.port");
const crypto_1 = require("crypto");
function severityForAction(act) {
    if (act === 'legal_hold_placed' || act === 'disposal_executed')
        return 'critical';
    if (act === 'retention_expired' || act === 'disposal_scheduled' || act === 'reclassified' || act === 'legal_hold_released')
        return 'warning';
    return 'info';
}
function emitRecordsEvent(opts) {
    try {
        const correlationId = opts.correlationId || (0, crypto_1.randomUUID)();
        const eventType = `records.${opts.entityType}.${opts.action}`;
        events_port_1.eventBus.publish({
            eventType,
            tenantId: opts.tenantId,
            sourceService: 'records',
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
function emitRecordsStatusChange(tenantId, entityType, entityId, previousState, newState, triggeredBy, correlationId) {
    emitRecordsEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}
function emitLegalHoldPlaced(tenantId, recordId, reason, triggeredBy) {
    emitRecordsEvent({ tenantId, entityType: 'legal_hold', entityId: recordId, action: 'legal_hold_placed', triggeredBy, data: { reason } });
}
function emitLegalHoldReleased(tenantId, recordId, triggeredBy) {
    emitRecordsEvent({ tenantId, entityType: 'legal_hold', entityId: recordId, action: 'legal_hold_released', triggeredBy });
}
function emitDisposalExecuted(tenantId, recordId, method, triggeredBy) {
    emitRecordsEvent({ tenantId, entityType: 'disposal_action', entityId: recordId, action: 'disposal_executed', triggeredBy, data: { method } });
}
function emitRetentionAssigned(tenantId, recordId, retentionDays, policyName, triggeredBy) {
    emitRecordsEvent({ tenantId, entityType: 'retention_schedule', entityId: recordId, action: 'retention_assigned', triggeredBy, data: { retentionDays, policyName } });
}
function emitRecordClassified(tenantId, recordId, classification, triggeredBy) {
    emitRecordsEvent({ tenantId, entityType: 'record', entityId: recordId, action: 'classified', triggeredBy, data: { classification } });
}
function emitRecordReclassified(tenantId, recordId, oldClass, newClass, triggeredBy) {
    emitRecordsEvent({ tenantId, entityType: 'record', entityId: recordId, action: 'reclassified', triggeredBy, data: { oldClassification: oldClass, newClassification: newClass } });
}
//# sourceMappingURL=records-event.service.js.map