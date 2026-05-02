import { emitEvent as _emitEvent } from '../ports/events.port';
import { z } from "zod";
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { Router } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { asyncHandler, moduleStack, auditMiddleware, setAuditData, fieldRbacFilter, validate } from '../ports/middleware.port';
import { createDependencyBody } from '../schemas/asset.schemas';
import { listDependencies, createDependency, deleteDependency, getUpstreamChain, getDownstreamChain, detectCycles, getBlastRadius, getDependencyStats } from '../services/dependency.service';
const genericPayloadSchema = z.record(z.unknown());

const router = Router();
router.use(moduleStack('asset'));
router.use(auditMiddleware('asset'));
router.use(fieldRbacFilter('asset'));

router.get('/', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const q = req.query as Record<string, string>;
  const result = await listDependencies(req.tenantId!, {
    source_type: q.source_type, source_id: q.source_id,
    target_type: q.target_type, target_id: q.target_id,
    dependency_type: q.dependency_type,
    page: q.page ? parseInt(q.page) : undefined,
    pageSize: q.pageSize ? parseInt(q.pageSize) : undefined,
  });
  res.json(result);
}));

router.get('/stats', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const stats = await getDependencyStats(req.tenantId!);
  res.json(stats);
}));

router.get('/upstream/:entityType/:entityId', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const chain = await getUpstreamChain(req.tenantId!, req.params.entityType, req.params.entityId);
  res.json({ data: chain });
}));

router.get('/downstream/:entityType/:entityId', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const chain = await getDownstreamChain(req.tenantId!, req.params.entityType, req.params.entityId);
  res.json({ data: chain });
}));

router.get('/blast-radius/:entityType/:entityId', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await getBlastRadius(req.tenantId!, req.params.entityType, req.params.entityId);
  res.json(result);
}));

router.get('/cycles', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const cycles = await detectCycles(req.tenantId!);
  res.json({ cycles, hasCycles: cycles.length > 0 });
}));

router.post('/', authenticate, requirePermission('asset.record.write'), validate({ body: createDependencyBody }), asyncHandler(async (req, res) => {
  const dep = await createDependency(req.tenantId!, req.user!.userId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'dependency', entityId: dep.dependency_id, afterState: dep });
  res.status(201).json(dep);
}));

router.delete('/:id', authenticate, requirePermission('asset.record.write'), validate({ body: genericPayloadSchema }), asyncHandler(async (req, res) => {
  const dep = await deleteDependency(req.tenantId!, req.user!.userId!, req.params.id);
  if (!dep) { res.status(404).json({ error: 'Dependency not found' }); return; }
  setAuditData(res as any, { action: 'delete', entityType: 'dependency', entityId: req.params.id });
  res.json({ message: 'Dependency deleted' });
}));

export default router;

