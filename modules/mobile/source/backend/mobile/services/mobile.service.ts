// @ts-nocheck
/**
 * Mobile Service — Spec §3.1: Device registration, Push notification bridge, Offline sync, Mobile config, Diagnostics
 */
import { safeQuery, tenantSchema } from '../ports/mobile.ports';
import { DeviceContract, PushTokenContract, SyncQueueContract, MobileConfigContract } from '../contracts/mobile.contract';
import { setAuditData } from '@dos/module-auth';

// ── Device Registration Service ──
export async function registerDevice(tenantId: string, userId: string, data: { deviceName?: string; devicePlatform: string; osVersion?: string; appVersion?: string }): Promise<DeviceContract> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".mobile_devices (user_id, device_name, device_platform, os_version, app_version)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING device_id as "deviceId", user_id as "userId", device_name as "deviceName", device_platform as "devicePlatform", os_version as "osVersion", app_version as "appVersion", biometric_enabled as "biometricEnabled", is_active as "isActive", last_seen_at as "lastSeenAt", registered_at as "registeredAt"`,
    [userId, data.deviceName || null, data.devicePlatform, data.osVersion || null, data.appVersion || null]
  );
  const device = result.rows[0];
  await setAuditData(tenantId, 'mobile_devices', device.deviceId, 'register', null, device, userId);
  return device as DeviceContract;
}

export async function listDevices(tenantId: string, userId: string): Promise<DeviceContract[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT device_id as "deviceId", user_id as "userId", device_name as "deviceName", device_platform as "devicePlatform", os_version as "osVersion", app_version as "appVersion", biometric_enabled as "biometricEnabled", is_active as "isActive", last_seen_at as "lastSeenAt", registered_at as "registeredAt"
     FROM "${schema}".mobile_devices WHERE user_id = $1 ORDER BY last_seen_at DESC`,
    [userId]
  );
  return result.rows as DeviceContract[];
}

export async function deregisterDevice(tenantId: string, deviceId: string, userId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(`UPDATE "${schema}".mobile_devices SET is_active = false WHERE device_id = $1 AND user_id = $2`, [deviceId, userId]);
  await setAuditData(tenantId, 'mobile_devices', deviceId, 'deregister', null, { isActive: false }, userId);
}

export async function heartbeat(tenantId: string, deviceId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(`UPDATE "${schema}".mobile_devices SET last_seen_at = NOW() WHERE device_id = $1`, [deviceId]);
}

// ── Push Notification Bridge Service ──
export async function registerPushToken(tenantId: string, userId: string, data: { deviceId: string; pushProvider: string; pushToken: string }): Promise<PushTokenContract> {
  const schema = tenantSchema(tenantId);
  // Invalidate old tokens for this device/provider combo
  await safeQuery(`UPDATE "${schema}".mobile_push_tokens SET is_valid = false WHERE device_id = $1 AND push_provider = $2`, [data.deviceId, data.pushProvider]);
  const result = await safeQuery(
    `INSERT INTO "${schema}".mobile_push_tokens (device_id, user_id, push_provider, push_token)
     VALUES ($1, $2, $3, $4)
     RETURNING token_id as "tokenId", device_id as "deviceId", user_id as "userId", push_provider as "pushProvider", push_token as "pushToken", is_valid as "isValid", last_refreshed_at as "lastRefreshedAt", created_at as "createdAt"`,
    [data.deviceId, userId, data.pushProvider, data.pushToken]
  );
  return result.rows[0] as PushTokenContract;
}

export async function invalidatePushToken(tenantId: string, tokenId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(`UPDATE "${schema}".mobile_push_tokens SET is_valid = false WHERE token_id = $1`, [tokenId]);
}

// ── Offline Sync Service ──
export async function getPendingSyncItems(tenantId: string, deviceId: string): Promise<SyncQueueContract[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT sync_id as "syncId", device_id as "deviceId", user_id as "userId", entity_type as "entityType", entity_id as "entityId", operation, payload, sync_status as "syncStatus", conflict_data as "conflictData", created_at as "createdAt", synced_at as "syncedAt"
     FROM "${schema}".mobile_sync_queue WHERE device_id = $1 AND sync_status IN ('pending', 'conflict') ORDER BY created_at`,
    [deviceId]
  );
  return result.rows as SyncQueueContract[];
}

export async function addSyncItem(tenantId: string, userId: string, data: { deviceId: string; entityType: string; entityId: string; operation: string; payload: Record<string, unknown> }): Promise<SyncQueueContract> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".mobile_sync_queue (device_id, user_id, entity_type, entity_id, operation, payload)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING sync_id as "syncId", device_id as "deviceId", user_id as "userId", entity_type as "entityType", entity_id as "entityId", operation, payload, sync_status as "syncStatus", conflict_data as "conflictData", created_at as "createdAt", synced_at as "syncedAt"`,
    [data.deviceId, userId, data.entityType, data.entityId, data.operation, JSON.stringify(data.payload)]
  );
  return result.rows[0] as SyncQueueContract;
}

export async function acknowledgeSyncItem(tenantId: string, syncId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(`UPDATE "${schema}".mobile_sync_queue SET sync_status = 'synced', synced_at = NOW() WHERE sync_id = $1`, [syncId]);
}

export async function resolveSyncConflict(tenantId: string, syncId: string, resolution: string, mergePayload?: Record<string, unknown>): Promise<SyncQueueContract> {
  const schema = tenantSchema(tenantId);
  const newStatus = resolution === 'accept_server' ? 'synced' : 'pending';
  const result = await safeQuery(
    `UPDATE "${schema}".mobile_sync_queue SET sync_status = $1, payload = COALESCE($2, payload), synced_at = CASE WHEN $1 = 'synced' THEN NOW() ELSE synced_at END WHERE sync_id = $3
     RETURNING sync_id as "syncId", device_id as "deviceId", user_id as "userId", entity_type as "entityType", entity_id as "entityId", operation, payload, sync_status as "syncStatus", conflict_data as "conflictData", created_at as "createdAt", synced_at as "syncedAt"`,
    [newStatus, mergePayload ? JSON.stringify(mergePayload) : null, syncId]
  );
  return result.rows[0] as SyncQueueContract;
}

// ── Mobile Config Service ──
export function getMobileConfig(): MobileConfigContract {
  return {
    minAppVersion: process.env.MOBILE_MIN_VERSION || '1.0.0',
    forceUpdate: process.env.MOBILE_FORCE_UPDATE === 'true',
    featureFlags: { offline_sync: true, biometric_auth: true, push_notifications: true, evidence_camera: true },
    syncIntervalSeconds: parseInt(process.env.MOBILE_SYNC_INTERVAL || '60', 10),
    pushChannels: ['alerts', 'tasks', 'approvals', 'announcements']
  };
}

// ── Diagnostics Service ──
export async function runDiagnostics(tenantId: string): Promise<{ status: string; checks: Record<string, unknown>[] }> {
  const schema = tenantSchema(tenantId);
  const checks: Record<string, unknown>[] = [];

  const deviceCount = await safeQuery(`SELECT device_platform, COUNT(*) as count FROM "${schema}".mobile_devices WHERE is_active = true GROUP BY device_platform`);
  checks.push({ check: 'active_devices_by_platform', data: deviceCount.rows, status: 'ok' });

  const staleTokens = await safeQuery(`SELECT COUNT(*) as count FROM "${schema}".mobile_push_tokens WHERE is_valid = true AND last_refreshed_at < NOW() - INTERVAL '30 days'`);
  checks.push({ check: 'stale_push_tokens', value: staleTokens.rows[0]?.count || 0, status: parseInt(staleTokens.rows[0]?.count || '0') > 10 ? 'warning' : 'ok' });

  const pendingSync = await safeQuery(`SELECT COUNT(*) as count FROM "${schema}".mobile_sync_queue WHERE sync_status = 'pending'`);
  checks.push({ check: 'pending_sync_items', value: pendingSync.rows[0]?.count || 0, status: parseInt(pendingSync.rows[0]?.count || '0') > 100 ? 'warning' : 'ok' });

  const conflicts = await safeQuery(`SELECT COUNT(*) as count FROM "${schema}".mobile_sync_queue WHERE sync_status = 'conflict'`);
  checks.push({ check: 'unresolved_conflicts', value: conflicts.rows[0]?.count || 0, status: parseInt(conflicts.rows[0]?.count || '0') > 0 ? 'warning' : 'ok' });

  return { status: 'operational', checks };
}
