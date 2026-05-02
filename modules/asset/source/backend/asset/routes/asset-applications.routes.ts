import { emitEvent as _emitEvent } from '../ports/events.port';
import { z } from "zod";
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { Router } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { asyncHandler, moduleStack, auditMiddleware, setAuditData, fieldRbacFilter, validate } from '../ports/middleware.port';
import { createApplicationBody, updateApplicationBody, listApplicationsQuery } from '../schemas/asset.schemas';
import { idParam } from '../../../schemas/common.schemas';
import { listApplications, getApplicationById, createApplication, updateApplication, deleteApplication, getApplicationStats } from '../services/application-registry.service';
const genericPayloadSchema = z.record(z.unknown());

const router = Router();
router.use(moduleStack('asset'));
router.use(auditMiddleware('asset'));
router.use(fieldRbacFilter('asset'));

router.get('/', authenticate, requirePermission('asset.record.read'), validate({ query: listApplicationsQuery }), asyncHandler(async (req, res) => {
  const result = await listApplications(req.tenantId!, req.query as Record<string, string>);
  res.json(result);
}));

router.get('/stats', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const stats = await getApplicationStats(req.tenantId!);
  res.json(stats);
}));

router.get('/:id', authenticate, requirePermission('asset.record.read'), validate({ params: idParam }), asyncHandler(async (req, res) => {
  const app = await getApplicationById(req.tenantId!, req.params.id);
  if (!app) { res.status(404).json({ error: 'Application not found' }); return; }
  res.json(app);
}));

router.post('/', authenticate, requirePermission('asset.record.write'), validate({ body: createApplicationBody }), asyncHandler(async (req, res) => {
  const app = await createApplication(req.tenantId!, req.user!.userId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'application', entityId: app.application_id, afterState: app });
  res.status(201).json(app);
}));

router.put('/:id', authenticate, requirePermission('asset.record.write'), validate({ params: idParam, body: updateApplicationBody }), asyncHandler(async (req, res) => {
  const app = await updateApplication(req.tenantId!, req.user!.userId!, req.params.id, req.body);
  if (!app) { res.status(404).json({ error: 'Application not found' }); return; }
  setAuditData(res as any, { action: 'update', entityType: 'application', entityId: req.params.id, afterState: app });
  res.json(app);
}));

router.delete('/:id', authenticate, requirePermission('asset.record.write'), validate({ params: idParam }), asyncHandler(async (req, res) => {
  const app = await deleteApplication(req.tenantId!, req.user!.userId!, req.params.id);
  if (!app) { res.status(404).json({ error: 'Application not found' }); return; }
  setAuditData(res as any, { action: 'delete', entityType: 'application', entityId: req.params.id });
  res.json({ message: 'Application deleted' });
}));

export default router;

