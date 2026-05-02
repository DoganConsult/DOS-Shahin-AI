"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResolveSyncConflictSchema = exports.SyncQueueItemSchema = exports.RegisterPushTokenSchema = exports.RegisterDeviceSchema = void 0;
// @ts-nocheck
const zod_1 = require("zod");
exports.RegisterDeviceSchema = zod_1.z.object({
    deviceName: zod_1.z.string().max(255).optional(),
    devicePlatform: zod_1.z.enum(['ios', 'android', 'web']),
    osVersion: zod_1.z.string().max(50).optional(),
    appVersion: zod_1.z.string().max(50).optional(),
});
exports.RegisterPushTokenSchema = zod_1.z.object({
    deviceId: zod_1.z.string().uuid(),
    pushProvider: zod_1.z.enum(['fcm', 'apns']),
    pushToken: zod_1.z.string().min(10).max(1000),
});
exports.SyncQueueItemSchema = zod_1.z.object({
    deviceId: zod_1.z.string().uuid(),
    entityType: zod_1.z.string().min(1).max(100),
    entityId: zod_1.z.string().uuid(),
    operation: zod_1.z.enum(['upsert', 'delete']),
    payload: zod_1.z.record(zod_1.z.unknown()),
});
exports.ResolveSyncConflictSchema = zod_1.z.object({
    syncId: zod_1.z.string().uuid(),
    resolution: zod_1.z.enum(['accept_server', 'accept_client', 'merge']),
    mergePayload: zod_1.z.record(zod_1.z.unknown()).optional(),
});
//# sourceMappingURL=mobile.schemas.js.map