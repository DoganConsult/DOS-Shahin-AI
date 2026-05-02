// @ts-nocheck
import { z } from 'zod';

export const RegisterDeviceSchema = z.object({
  deviceName: z.string().max(255).optional(),
  devicePlatform: z.enum(['ios', 'android', 'web']),
  osVersion: z.string().max(50).optional(),
  appVersion: z.string().max(50).optional(),
});

export const RegisterPushTokenSchema = z.object({
  deviceId: z.string().uuid(),
  pushProvider: z.enum(['fcm', 'apns']),
  pushToken: z.string().min(10).max(1000),
});

export const SyncQueueItemSchema = z.object({
  deviceId: z.string().uuid(),
  entityType: z.string().min(1).max(100),
  entityId: z.string().uuid(),
  operation: z.enum(['upsert', 'delete']),
  payload: z.record(z.unknown()),
});

export const ResolveSyncConflictSchema = z.object({
  syncId: z.string().uuid(),
  resolution: z.enum(['accept_server', 'accept_client', 'merge']),
  mergePayload: z.record(z.unknown()).optional(),
});
