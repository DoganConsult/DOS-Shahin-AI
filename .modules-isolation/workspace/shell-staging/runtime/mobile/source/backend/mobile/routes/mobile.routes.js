"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const mobile_ports_1 = require("../ports/mobile.ports");
const service = __importStar(require("../services/mobile.service"));
const mobile_schemas_1 = require("../schemas/mobile.schemas");
const zod_1 = require("zod");
const genericPayloadSchema = zod_1.z.record(zod_1.z.unknown());
const genericRouteSchema = zod_1.z.any();
const router = (0, express_1.Router)();
// §6: Device registration
router.get('/devices', mobile_ports_1.authenticate, (0, mobile_ports_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, mobile_ports_1.asyncHandler)(async (req, res) => {
    const data = await service.listDevices(req.tenantId, req.user.id);
    res.json({ data });
}));
router.post('/devices', mobile_ports_1.authenticate, (0, mobile_ports_1.validate)({ body: mobile_schemas_1.RegisterDeviceSchema }), (0, mobile_ports_1.asyncHandler)(async (req, res) => {
    const device = await service.registerDevice(req.tenantId, req.user.id, req.body);
    (0, mobile_ports_1.setAuditData)(res, { action: 'create', entityType: 'mobile_device', entityId: device.id, afterState: device });
    res.status(201).json({ data: device });
}));
router.delete('/devices/:id', mobile_ports_1.authenticate, (0, mobile_ports_1.validate)({ body: genericRouteSchema }), (0, mobile_ports_1.asyncHandler)(async (req, res) => {
    (0, mobile_ports_1.setAuditData)(res, { action: 'delete', entityType: 'mobile_device', entityId: req.params.id });
    await service.deregisterDevice(req.tenantId, req.params.id, req.user.id);
    res.status(204).end();
}));
router.post('/devices/:id/heartbeat', mobile_ports_1.authenticate, (0, mobile_ports_1.validate)({ body: genericRouteSchema }), (0, mobile_ports_1.asyncHandler)(async (req, res) => {
    await service.heartbeat(req.tenantId, req.params.id);
    res.json({ status: 'ok' });
}));
// §6: Push token management
router.post('/push-tokens', mobile_ports_1.authenticate, (0, mobile_ports_1.validate)({ body: mobile_schemas_1.RegisterPushTokenSchema }), (0, mobile_ports_1.asyncHandler)(async (req, res) => {
    const token = await service.registerPushToken(req.tenantId, req.user.id, req.body);
    (0, mobile_ports_1.setAuditData)(res, { action: 'create', entityType: 'mobile_push_token', entityId: token.id, afterState: token });
    res.status(201).json({ data: token });
}));
router.delete('/push-tokens/:id', mobile_ports_1.authenticate, (0, mobile_ports_1.validate)({ body: genericRouteSchema }), (0, mobile_ports_1.asyncHandler)(async (req, res) => {
    (0, mobile_ports_1.setAuditData)(res, { action: 'delete', entityType: 'mobile_push_token', entityId: req.params.id });
    await service.invalidatePushToken(req.tenantId, req.params.id);
    res.status(204).end();
}));
// §6: Sync queue
router.get('/sync/:deviceId', mobile_ports_1.authenticate, (0, mobile_ports_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, mobile_ports_1.asyncHandler)(async (req, res) => {
    const data = await service.getPendingSyncItems(req.tenantId, req.params.deviceId);
    res.json({ data });
}));
router.post('/sync', mobile_ports_1.authenticate, (0, mobile_ports_1.validate)({ body: mobile_schemas_1.SyncQueueItemSchema }), (0, mobile_ports_1.asyncHandler)(async (req, res) => {
    const item = await service.addSyncItem(req.tenantId, req.user.id, req.body);
    (0, mobile_ports_1.setAuditData)(res, { action: 'create', entityType: 'mobile_sync_item', entityId: item.id, afterState: item });
    res.status(201).json({ data: item });
}));
router.post('/sync/:syncId/ack', mobile_ports_1.authenticate, (0, mobile_ports_1.validate)({ body: genericRouteSchema }), (0, mobile_ports_1.asyncHandler)(async (req, res) => {
    (0, mobile_ports_1.setAuditData)(res, { action: 'update', entityType: 'mobile_sync_item', entityId: req.params.syncId, afterState: { status: 'acknowledged' } });
    await service.acknowledgeSyncItem(req.tenantId, req.params.syncId);
    res.json({ status: 'acknowledged' });
}));
router.post('/sync/:syncId/resolve', mobile_ports_1.authenticate, (0, mobile_ports_1.validate)({ body: mobile_schemas_1.ResolveSyncConflictSchema }), (0, mobile_ports_1.asyncHandler)(async (req, res) => {
    const resolved = await service.resolveSyncConflict(req.tenantId, req.params.syncId, req.body.resolution, req.body.mergePayload);
    (0, mobile_ports_1.setAuditData)(res, { action: 'update', entityType: 'mobile_sync_item', entityId: req.params.syncId, afterState: resolved });
    res.json({ data: resolved });
}));
// §6: Mobile config
router.get('/config', mobile_ports_1.authenticate, (0, mobile_ports_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, mobile_ports_1.asyncHandler)(async (_req, res) => {
    const config = service.getMobileConfig();
    res.json({ data: config });
}));
// §11: Diagnostics
router.get('/diagnostics', mobile_ports_1.authenticate, (0, mobile_ports_1.requirePermission)('mobile.read'), (0, mobile_ports_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, mobile_ports_1.asyncHandler)(async (req, res) => {
    const data = await service.runDiagnostics(req.tenantId);
    res.json({ data });
}));
exports.default = router;
//# sourceMappingURL=mobile.routes.js.map