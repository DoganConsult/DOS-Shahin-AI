// @ts-nocheck
import { Router } from 'express';
import { authenticate, requirePermission, validate, asyncHandler, setAuditData } from '../ports/mobile.ports';
import * as service from '../services/mobile.service';
import { RegisterDeviceSchema, RegisterPushTokenSchema, SyncQueueItemSchema, ResolveSyncConflictSchema } from '../schemas/mobile.schemas';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
const genericRouteSchema = z.any();

const router = Router();

// §6: Device registration
router.get('/devices', authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: any, res: any) => {
  const data = await service.listDevices(req.tenantId, req.user.id);
  res.json({ data });
}));

router.post('/devices', authenticate, validate({ body: RegisterDeviceSchema }), asyncHandler(async (req: any, res: any) => {
  const device = await service.registerDevice(req.tenantId, req.user.id, req.body);
  setAuditData(res, { action: 'create', entityType: 'mobile_device', entityId: device.id, afterState: device });
  res.status(201).json({ data: device });
}));

router.delete('/devices/:id', authenticate, validate({ body: genericRouteSchema }), asyncHandler(async (req: any, res: any) => {
  setAuditData(res, { action: 'delete', entityType: 'mobile_device', entityId: req.params.id });
  await service.deregisterDevice(req.tenantId, req.params.id, req.user.id);
  res.status(204).end();
}));

router.post('/devices/:id/heartbeat', authenticate, validate({ body: genericRouteSchema }), asyncHandler(async (req: any, res: any) => {
  await service.heartbeat(req.tenantId, req.params.id);
  res.json({ status: 'ok' });
}));

// §6: Push token management
router.post('/push-tokens', authenticate, validate({ body: RegisterPushTokenSchema }), asyncHandler(async (req: any, res: any) => {
  const token = await service.registerPushToken(req.tenantId, req.user.id, req.body);
  setAuditData(res, { action: 'create', entityType: 'mobile_push_token', entityId: token.id, afterState: token });
  res.status(201).json({ data: token });
}));

router.delete('/push-tokens/:id', authenticate, validate({ body: genericRouteSchema }), asyncHandler(async (req: any, res: any) => {
  setAuditData(res, { action: 'delete', entityType: 'mobile_push_token', entityId: req.params.id });
  await service.invalidatePushToken(req.tenantId, req.params.id);
  res.status(204).end();
}));

// §6: Sync queue
router.get('/sync/:deviceId', authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: any, res: any) => {
  const data = await service.getPendingSyncItems(req.tenantId, req.params.deviceId);
  res.json({ data });
}));

router.post('/sync', authenticate, validate({ body: SyncQueueItemSchema }), asyncHandler(async (req: any, res: any) => {
  const item = await service.addSyncItem(req.tenantId, req.user.id, req.body);
  setAuditData(res, { action: 'create', entityType: 'mobile_sync_item', entityId: item.id, afterState: item });
  res.status(201).json({ data: item });
}));

router.post('/sync/:syncId/ack', authenticate, validate({ body: genericRouteSchema }), asyncHandler(async (req: any, res: any) => {
  setAuditData(res, { action: 'update', entityType: 'mobile_sync_item', entityId: req.params.syncId, afterState: { status: 'acknowledged' } });
  await service.acknowledgeSyncItem(req.tenantId, req.params.syncId);
  res.json({ status: 'acknowledged' });
}));

router.post('/sync/:syncId/resolve', authenticate, validate({ body: ResolveSyncConflictSchema }), asyncHandler(async (req: any, res: any) => {
  const resolved = await service.resolveSyncConflict(req.tenantId, req.params.syncId, req.body.resolution, req.body.mergePayload);
  setAuditData(res, { action: 'update', entityType: 'mobile_sync_item', entityId: req.params.syncId, afterState: resolved });
  res.json({ data: resolved });
}));

// §6: Mobile config
router.get('/config', authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (_req: any, res: any) => {
  const config = service.getMobileConfig();
  res.json({ data: config });
}));

// §11: Diagnostics
router.get('/diagnostics', authenticate, requirePermission('mobile.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: any, res: any) => {
  const data = await service.runDiagnostics(req.tenantId);
  res.json({ data });
}));

export default router;

