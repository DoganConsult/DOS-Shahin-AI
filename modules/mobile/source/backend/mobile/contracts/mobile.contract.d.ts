export interface DeviceContract {
    deviceId: string;
    userId: string;
    deviceName: string | null;
    devicePlatform: string;
    osVersion: string | null;
    appVersion: string | null;
    biometricEnabled: boolean;
    isActive: boolean;
    lastSeenAt: string;
    registeredAt: string;
}
export interface PushTokenContract {
    tokenId: string;
    deviceId: string;
    userId: string;
    pushProvider: 'fcm' | 'apns';
    pushToken: string;
    isValid: boolean;
    lastRefreshedAt: string;
    createdAt: string;
}
export interface SyncQueueContract {
    syncId: string;
    deviceId: string;
    userId: string;
    entityType: string;
    entityId: string;
    operation: string;
    payload: Record<string, unknown>;
    syncStatus: string;
    conflictData: Record<string, unknown> | null;
    createdAt: string;
    syncedAt: string | null;
}
export interface MobileConfigContract {
    minAppVersion: string;
    forceUpdate: boolean;
    featureFlags: Record<string, boolean>;
    syncIntervalSeconds: number;
    pushChannels: string[];
}
