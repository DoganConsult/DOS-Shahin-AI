"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDevice = registerDevice;
exports.listDevices = listDevices;
exports.deregisterDevice = deregisterDevice;
exports.heartbeat = heartbeat;
exports.registerPushToken = registerPushToken;
exports.invalidatePushToken = invalidatePushToken;
exports.getPendingSyncItems = getPendingSyncItems;
exports.addSyncItem = addSyncItem;
exports.acknowledgeSyncItem = acknowledgeSyncItem;
exports.resolveSyncConflict = resolveSyncConflict;
exports.getMobileConfig = getMobileConfig;
exports.runDiagnostics = runDiagnostics;
// @ts-nocheck
/**
 * Mobile Service — Spec §3.1: Device registration, Push notification bridge, Offline sync, Mobile config, Diagnostics
 */
const mobile_ports_1 = require("../ports/mobile.ports");
const module_auth_1 = require("@dos/module-auth");
// ── Device Registration Service ──
async function registerDevice(tenantId, userId, data) {
    const schema = (0, mobile_ports_1.tenantSchema)(tenantId);
    const result = await (0, mobile_ports_1.safeQuery)(`INSERT INTO "${schema}".mobile_devices (user_id, device_name, device_platform, os_version, app_version)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING device_id as "deviceId", user_id as "userId", device_name as "deviceName", device_platform as "devicePlatform", os_version as "osVersion", app_version as "appVersion", biometric_enabled as "biometricEnabled", is_active as "isActive", last_seen_at as "lastSeenAt", registered_at as "registeredAt"`, [userId, data.deviceName || null, data.devicePlatform, data.osVersion || null, data.appVersion || null]);
    const device = result.rows[0];
    await (0, module_auth_1.setAuditData)(tenantId, 'mobile_devices', device.deviceId, 'register', null, device, userId);
    return device;
}
async function listDevices(tenantId, userId) {
    const schema = (0, mobile_ports_1.tenantSchema)(tenantId);
    const result = await (0, mobile_ports_1.safeQuery)(`SELECT device_id as "deviceId", user_id as "userId", device_name as "deviceName", device_platform as "devicePlatform", os_version as "osVersion", app_version as "appVersion", biometric_enabled as "biometricEnabled", is_active as "isActive", last_seen_at as "lastSeenAt", registered_at as "registeredAt"
     FROM "${schema}".mobile_devices WHERE user_id = $1 ORDER BY last_seen_at DESC`, [userId]);
    return result.rows;
}
async function deregisterDevice(tenantId, deviceId, userId) {
    const schema = (0, mobile_ports_1.tenantSchema)(tenantId);
    await (0, mobile_ports_1.safeQuery)(`UPDATE "${schema}".mobile_devices SET is_active = false WHERE device_id = $1 AND user_id = $2`, [deviceId, userId]);
    await (0, module_auth_1.setAuditData)(tenantId, 'mobile_devices', deviceId, 'deregister', null, { isActive: false }, userId);
}
async function heartbeat(tenantId, deviceId) {
    const schema = (0, mobile_ports_1.tenantSchema)(tenantId);
    await (0, mobile_ports_1.safeQuery)(`UPDATE "${schema}".mobile_devices SET last_seen_at = NOW() WHERE device_id = $1`, [deviceId]);
}
// ── Push Notification Bridge Service ──
async function registerPushToken(tenantId, userId, data) {
    const schema = (0, mobile_ports_1.tenantSchema)(tenantId);
    // Invalidate old tokens for this device/provider combo
    await (0, mobile_ports_1.safeQuery)(`UPDATE "${schema}".mobile_push_tokens SET is_valid = false WHERE device_id = $1 AND push_provider = $2`, [data.deviceId, data.pushProvider]);
    const result = await (0, mobile_ports_1.safeQuery)(`INSERT INTO "${schema}".mobile_push_tokens (device_id, user_id, push_provider, push_token)
     VALUES ($1, $2, $3, $4)
     RETURNING token_id as "tokenId", device_id as "deviceId", user_id as "userId", push_provider as "pushProvider", push_token as "pushToken", is_valid as "isValid", last_refreshed_at as "lastRefreshedAt", created_at as "createdAt"`, [data.deviceId, userId, data.pushProvider, data.pushToken]);
    return result.rows[0];
}
async function invalidatePushToken(tenantId, tokenId) {
    const schema = (0, mobile_ports_1.tenantSchema)(tenantId);
    await (0, mobile_ports_1.safeQuery)(`UPDATE "${schema}".mobile_push_tokens SET is_valid = false WHERE token_id = $1`, [tokenId]);
}
// ── Offline Sync Service ──
async function getPendingSyncItems(tenantId, deviceId) {
    const schema = (0, mobile_ports_1.tenantSchema)(tenantId);
    const result = await (0, mobile_ports_1.safeQuery)(`SELECT sync_id as "syncId", device_id as "deviceId", user_id as "userId", entity_type as "entityType", entity_id as "entityId", operation, payload, sync_status as "syncStatus", conflict_data as "conflictData", created_at as "createdAt", synced_at as "syncedAt"
     FROM "${schema}".mobile_sync_queue WHERE device_id = $1 AND sync_status IN ('pending', 'conflict') ORDER BY created_at`, [deviceId]);
    return result.rows;
}
async function addSyncItem(tenantId, userId, data) {
    const schema = (0, mobile_ports_1.tenantSchema)(tenantId);
    const result = await (0, mobile_ports_1.safeQuery)(`INSERT INTO "${schema}".mobile_sync_queue (device_id, user_id, entity_type, entity_id, operation, payload)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING sync_id as "syncId", device_id as "deviceId", user_id as "userId", entity_type as "entityType", entity_id as "entityId", operation, payload, sync_status as "syncStatus", conflict_data as "conflictData", created_at as "createdAt", synced_at as "syncedAt"`, [data.deviceId, userId, data.entityType, data.entityId, data.operation, JSON.stringify(data.payload)]);
    return result.rows[0];
}
async function acknowledgeSyncItem(tenantId, syncId) {
    const schema = (0, mobile_ports_1.tenantSchema)(tenantId);
    await (0, mobile_ports_1.safeQuery)(`UPDATE "${schema}".mobile_sync_queue SET sync_status = 'synced', synced_at = NOW() WHERE sync_id = $1`, [syncId]);
}
async function resolveSyncConflict(tenantId, syncId, resolution, mergePayload) {
    const schema = (0, mobile_ports_1.tenantSchema)(tenantId);
    const newStatus = resolution === 'accept_server' ? 'synced' : 'pending';
    const result = await (0, mobile_ports_1.safeQuery)(`UPDATE "${schema}".mobile_sync_queue SET sync_status = $1, payload = COALESCE($2, payload), synced_at = CASE WHEN $1 = 'synced' THEN NOW() ELSE synced_at END WHERE sync_id = $3
     RETURNING sync_id as "syncId", device_id as "deviceId", user_id as "userId", entity_type as "entityType", entity_id as "entityId", operation, payload, sync_status as "syncStatus", conflict_data as "conflictData", created_at as "createdAt", synced_at as "syncedAt"`, [newStatus, mergePayload ? JSON.stringify(mergePayload) : null, syncId]);
    return result.rows[0];
}
// ── Mobile Config Service ──
function getMobileConfig() {
    return {
        minAppVersion: process.env.MOBILE_MIN_VERSION || '1.0.0',
        forceUpdate: process.env.MOBILE_FORCE_UPDATE === 'true',
        featureFlags: { offline_sync: true, biometric_auth: true, push_notifications: true, evidence_camera: true },
        syncIntervalSeconds: parseInt(process.env.MOBILE_SYNC_INTERVAL || '60', 10),
        pushChannels: ['alerts', 'tasks', 'approvals', 'announcements']
    };
}
// ── Diagnostics Service ──
async function runDiagnostics(tenantId) {
    const schema = (0, mobile_ports_1.tenantSchema)(tenantId);
    const checks = [];
    const deviceCount = await (0, mobile_ports_1.safeQuery)(`SELECT device_platform, COUNT(*) as count FROM "${schema}".mobile_devices WHERE is_active = true GROUP BY device_platform`);
    checks.push({ check: 'active_devices_by_platform', data: deviceCount.rows, status: 'ok' });
    const staleTokens = await (0, mobile_ports_1.safeQuery)(`SELECT COUNT(*) as count FROM "${schema}".mobile_push_tokens WHERE is_valid = true AND last_refreshed_at < NOW() - INTERVAL '30 days'`);
    checks.push({ check: 'stale_push_tokens', value: staleTokens.rows[0]?.count || 0, status: parseInt(staleTokens.rows[0]?.count || '0') > 10 ? 'warning' : 'ok' });
    const pendingSync = await (0, mobile_ports_1.safeQuery)(`SELECT COUNT(*) as count FROM "${schema}".mobile_sync_queue WHERE sync_status = 'pending'`);
    checks.push({ check: 'pending_sync_items', value: pendingSync.rows[0]?.count || 0, status: parseInt(pendingSync.rows[0]?.count || '0') > 100 ? 'warning' : 'ok' });
    const conflicts = await (0, mobile_ports_1.safeQuery)(`SELECT COUNT(*) as count FROM "${schema}".mobile_sync_queue WHERE sync_status = 'conflict'`);
    checks.push({ check: 'unresolved_conflicts', value: conflicts.rows[0]?.count || 0, status: parseInt(conflicts.rows[0]?.count || '0') > 0 ? 'warning' : 'ok' });
    return { status: 'operational', checks };
}
//# sourceMappingURL=mobile.service.js.map