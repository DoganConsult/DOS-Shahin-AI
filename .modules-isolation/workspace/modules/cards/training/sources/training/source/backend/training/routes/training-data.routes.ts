import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";
import { catchHandler, EC } from '@dos/platform-core/resilience';

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../ports/auth.port';
import { loadTrainingData, purgeTrainingData, hasTrainingData, DataVolume } from '../services/training-data.service';
import { emitEvent } from '../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
// ── Zod Validation Schemas ──
import { asyncHandler, auditMiddleware, setAuditData, automationMiddleware, validate, moduleStack } from '../ports/middleware.port';
import { createLoadBody, createPurgeBody as _createPurgeBody } from "../schemas/training.schemas";

const router = Router();
router.use(moduleStack('training'));
router.use(auditMiddleware("admin"));
router.use(automationMiddleware("admin"));

const emitTrainingAdminEvent = (tenantId: string, userId: string, event: 'created' | 'deleted') =>
  emitEvent({
    event_type: `admin.demo_data.${event}`,
    tenantId,
    userId,
    module: 'admin',
    module_code: 'admin',
    event,
    entityType: 'demo_data',
    entity_type: 'demo_data',
    entityId: tenantId,
    entity_id: tenantId,
    source: 'module',
  }).catch(catchHandler(EC.EVENT_BUS, {}));

router.post("/load", authenticate, requirePermission("admin.system.write"), validate({ body: createLoadBody }), asyncHandler(async (req, res) => {
  const tenantId = req.user!.tenantId!;
  const volume: DataVolume = req.body.volume || 'small';
  if (!['small', 'medium', 'large'].includes(volume)) {
  res.status(400).json({ error: "volume must be small, medium, or large" });
  return;
  }
  const result = await loadTrainingData(tenantId, volume);
  setAuditData(res as any, { action: "create", entityType: "training-data", entityId: tenantId, afterState: result });
  emitTrainingAdminEvent(tenantId, req.user!.userId!, 'created');
  res.json(result);
}));

router.delete("/purge", authenticate, requirePermission("admin.system.write"), validate({ body: genericPayloadSchema }), asyncHandler(async (req, res) => {
  const tenantId = req.user!.tenantId!;
  const result = await purgeTrainingData(tenantId);
  setAuditData(res as any, { action: "delete", entityType: "training-data", entityId: tenantId, afterState: result });
  emitTrainingAdminEvent(tenantId, req.user!.userId!, 'deleted');
  res.json(result);
}));

router.get("/status", authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.user!.tenantId!;
  const exists = await hasTrainingData(tenantId);
  res.json({ hasTrainingData: exists });
}));

export default router;

