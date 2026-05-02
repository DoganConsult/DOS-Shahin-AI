import { z } from 'zod';
export declare const RegisterDeviceSchema: z.ZodObject<{
    deviceName: z.ZodOptional<z.ZodString>;
    devicePlatform: z.ZodEnum<["ios", "android", "web"]>;
    osVersion: z.ZodOptional<z.ZodString>;
    appVersion: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    devicePlatform: "ios" | "android" | "web";
    deviceName?: string | undefined;
    osVersion?: string | undefined;
    appVersion?: string | undefined;
}, {
    devicePlatform: "ios" | "android" | "web";
    deviceName?: string | undefined;
    osVersion?: string | undefined;
    appVersion?: string | undefined;
}>;
export declare const RegisterPushTokenSchema: z.ZodObject<{
    deviceId: z.ZodString;
    pushProvider: z.ZodEnum<["fcm", "apns"]>;
    pushToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    deviceId: string;
    pushProvider: "fcm" | "apns";
    pushToken: string;
}, {
    deviceId: string;
    pushProvider: "fcm" | "apns";
    pushToken: string;
}>;
export declare const SyncQueueItemSchema: z.ZodObject<{
    deviceId: z.ZodString;
    entityType: z.ZodString;
    entityId: z.ZodString;
    operation: z.ZodEnum<["upsert", "delete"]>;
    payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    deviceId: string;
    entityType: string;
    entityId: string;
    operation: "upsert" | "delete";
    payload: Record<string, unknown>;
}, {
    deviceId: string;
    entityType: string;
    entityId: string;
    operation: "upsert" | "delete";
    payload: Record<string, unknown>;
}>;
export declare const ResolveSyncConflictSchema: z.ZodObject<{
    syncId: z.ZodString;
    resolution: z.ZodEnum<["accept_server", "accept_client", "merge"]>;
    mergePayload: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    syncId: string;
    resolution: "accept_server" | "accept_client" | "merge";
    mergePayload?: Record<string, unknown> | undefined;
}, {
    syncId: string;
    resolution: "accept_server" | "accept_client" | "merge";
    mergePayload?: Record<string, unknown> | undefined;
}>;
