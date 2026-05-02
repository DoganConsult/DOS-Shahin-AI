import { emitEvent as _emitEvent } from '../ports/events.port';
import { z } from "zod";
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { Router } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { asyncHandler, moduleStack, auditMiddleware, setAuditData, fieldRbacFilter, validate } from '../ports/middleware.port';
import { createBusinessServiceBody, updateBusinessServiceBody, listBusinessServicesQuery } from '../schemas/asset.schemas';
import { idParam } from '../../../schemas/common.schemas';
import { listBusinessServices, getBusinessServiceById, getServiceHierarchy, createBusinessService, updateBusinessService, deleteBusinessService, getServiceStats } from '../services/business-service.service';
import { safeQuery } from "@dos/db";

const genericPayloadSchema = z.record(z.unknown());

const router = Router();
router.use(moduleStack('asset'));
router.use(auditMiddleware('asset'));
router.use(fieldRbacFilter('asset'));

router.get('/', authenticate, requirePermission('asset.record.read'), validate({ query: listBusinessServicesQuery }), asyncHandler(async (req, res) => {
  const result = await listBusinessServices(req.tenantId!, req.query as Record<string, string>);
  res.json(result);
}));

router.get('/stats', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const stats = await getServiceStats(req.tenantId!);
  res.json(stats);
}));

router.get('/hierarchy', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const rootId = req.query.rootId as string | undefined;
  const tree = await getServiceHierarchy(req.tenantId!, rootId);
  res.json({ data: tree });
}));

router.get('/:id', authenticate, requirePermission('asset.record.read'), validate({ params: idParam }), asyncHandler(async (req, res) => {
  const svc = await getBusinessServiceById(req.tenantId!, req.params.id);
  if (!svc) { res.status(404).json({ error: 'Business service not found' }); return; }
  res.json(svc);
}));

router.post('/', authenticate, requirePermission('asset.record.write'), validate({ body: createBusinessServiceBody }), asyncHandler(async (req, res) => {
  const svc = await createBusinessService(req.tenantId!, req.user!.userId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'business_service', entityId: svc.service_id, afterState: svc });
  res.status(201).json(svc);
}));

router.put('/:id', authenticate, requirePermission('asset.record.write'), validate({ params: idParam, body: updateBusinessServiceBody }), asyncHandler(async (req, res) => {
  const svc = await updateBusinessService(req.tenantId!, req.user!.userId!, req.params.id, req.body);
  if (!svc) { res.status(404).json({ error: 'Business service not found' }); return; }
  setAuditData(res as any, { action: 'update', entityType: 'business_service', entityId: req.params.id, afterState: svc });
  res.json(svc);
}));

router.delete('/:id', authenticate, requirePermission('asset.record.write'), validate({ params: idParam }), asyncHandler(async (req, res) => {
  const svc = await deleteBusinessService(req.tenantId!, req.user!.userId!, req.params.id);
  if (!svc) { res.status(404).json({ error: 'Business service not found' }); return; }
  setAuditData(res as any, { action: 'delete', entityType: 'business_service', entityId: req.params.id });
  res.json({ message: 'Business service deleted' });
}));

export default router;

