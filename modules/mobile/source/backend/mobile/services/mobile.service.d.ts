import { DeviceContract, PushTokenContract, SyncQueueContract, MobileConfigContract } from '../contracts/mobile.contract';
export declare function registerDevice(tenantId: string, userId: string, data: {
    deviceName?: string;
    devicePlatform: string;
    osVersion?: string;
    appVersion?: string;
}): Promise<DeviceContract>;
export declare function listDevices(tenantId: string, userId: string): Promise<DeviceContract[]>;
export declare function deregisterDevice(tenantId: string, deviceId: string, userId: string): Promise<void>;
export declare function heartbeat(tenantId: string, deviceId: string): Promise<void>;
export declare function registerPushToken(tenantId: string, userId: string, data: {
    deviceId: string;
    pushProvider: string;
    pushToken: string;
}): Promise<PushTokenContract>;
export declare function invalidatePushToken(tenantId: string, tokenId: string): Promise<void>;
export declare function getPendingSyncItems(tenantId: string, deviceId: string): Promise<SyncQueueContract[]>;
export declare function addSyncItem(tenantId: string, userId: string, data: {
    deviceId: string;
    entityType: string;
    entityId: string;
    operation: string;
    payload: Record<string, unknown>;
}): Promise<SyncQueueContract>;
export declare function acknowledgeSyncItem(tenantId: string, syncId: string): Promise<void>;
export declare function resolveSyncConflict(tenantId: string, syncId: string, resolution: string, mergePayload?: Record<string, unknown>): Promise<SyncQueueContract>;
export declare function getMobileConfig(): MobileConfigContract;
export declare function runDiagnostics(tenantId: string): Promise<{
    status: string;
    checks: Record<string, unknown>[];
}>;
