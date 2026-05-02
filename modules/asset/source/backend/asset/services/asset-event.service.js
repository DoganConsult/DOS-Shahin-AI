"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitAssetEvent = emitAssetEvent;
exports.emitAssetStatusChange = emitAssetStatusChange;
exports.emitAssetClassified = emitAssetClassified;
exports.emitCriticalityChanged = emitCriticalityChanged;
exports.emitScanCompleted = emitScanCompleted;
exports.emitOwnerChanged = emitOwnerChanged;
const events_port_1 = require("../ports/events.port");
const crypto_1 = require("crypto");
function severityForAction(act) {
    if (act === 'declassified' || act === 'scan_failed')
        return 'critical';
    if (act === 'review_overdue' || act === 'decommissioned' || act === 'reclassified' || act === 'criticality_changed')
        return 'warning';
    return 'info';
}
function emitAssetEvent(opts) {
    try {
        const correlationId = opts.correlationId || (0, crypto_1.randomUUID)();
        const eventType = `asset.${opts.entityType}.${opts.action}`;
        events_port_1.eventBus.publish({
            eventType,
            tenantId: opts.tenantId,
            sourceService: 'asset',
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
function emitAssetStatusChange(tenantId, entityType, entityId, previousState, newState, triggeredBy, correlationId) {
    emitAssetEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}
function emitAssetClassified(tenantId, assetId, classification, triggeredBy) {
    emitAssetEvent({ tenantId, entityType: 'asset', entityId: assetId, action: 'classified', triggeredBy, data: { classification } });
}
function emitCriticalityChanged(tenantId, assetId, oldCriticality, newCriticality, triggeredBy) {
    emitAssetEvent({ tenantId, entityType: 'asset', entityId: assetId, action: 'criticality_changed', triggeredBy, data: { oldCriticality, newCriticality } });
}
function emitScanCompleted(tenantId, scanId, assetsFound, triggeredBy) {
    emitAssetEvent({ tenantId, entityType: 'inventory_scan', entityId: scanId, action: 'scan_completed', triggeredBy, data: { assetsFound } });
}
function emitOwnerChanged(tenantId, assetId, oldOwner, newOwner, triggeredBy) {
    emitAssetEvent({ tenantId, entityType: 'asset', entityId: assetId, action: 'owner_changed', triggeredBy, data: { oldOwner, newOwner } });
}
//# sourceMappingURL=asset-event.service.js.map