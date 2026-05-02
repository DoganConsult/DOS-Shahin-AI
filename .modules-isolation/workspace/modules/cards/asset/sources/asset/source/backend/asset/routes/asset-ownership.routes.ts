import { emitEvent as _emitEvent } from '../ports/events.port';
import { z } from "zod";
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { Router } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { asyncHandler, moduleStack, auditMiddleware, setAuditData, fieldRbacFilter, validate } from '../ports/middleware.port';
import { assignOwnerBody, createTransferBody } from '../schemas/asset.schemas';
import { getOwners, getOwnerHistory, assignOwner, revokeOwner, transferOwner, getUnownedEntities, getOwnershipStats } from '../services/asset-ownership.service';
const genericPayloadSchema = z.record(z.unknown());

const router = Router();
router.use(moduleStack('asset'));
router.use(auditMiddleware('asset'));
router.use(fieldRbacFilter('asset'));

// Ownership stats
router.get('/stats', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const stats = await getOwnershipStats(req.tenantId!);
  res.json(stats);
}));

// Unowned entities
router.get('/unowned', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const entityType = (req.query.entity_type as string) || 'asset';
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 25;
  const result = await getUnownedEntities(req.tenantId!, entityType, page, pageSize);
  res.json(result);
}));

// Get current owners
router.get('/:entityType/:entityId', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const owners = await getOwners(req.tenantId!, req.params.entityType, req.params.entityId);
  res.json({ data: owners });
}));

// Get ownership history
router.get('/:entityType/:entityId/history', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const history = await getOwnerHistory(req.tenantId!, req.params.entityType, req.params.entityId);
  res.json({ data: history });
}));

// Assign owner
router.post('/', authenticate, requirePermission('asset.record.write'), validate({ body: assignOwnerBody }), asyncHandler(async (req, res) => {
  const result = await assignOwner(req.tenantId!, req.user!.userId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'asset_owner', entityId: result.ownership_id, afterState: result });
  res.status(201).json(result);
}));

// Transfer owner
router.post('/transfer', authenticate, requirePermission('asset.record.write'), validate({ body: createTransferBody }), asyncHandler(async (req, res) => {
  const { entity_type, entity_id, owner_type, new_owner_id, notes } = req.body;
  const result = await transferOwner(req.tenantId!, req.user!.userId!, entity_type, entity_id, owner_type, new_owner_id, notes);
  setAuditData(res as any, { action: 'update', entityType: 'asset_owner', entityId: result.ownership_id, afterState: result });
  res.json(result);
}));

// Revoke owner
router.delete('/:ownershipId', authenticate, requirePermission('asset.record.write'), validate({ body: genericPayloadSchema }), asyncHandler(async (req, res) => {
  const result = await revokeOwner(req.tenantId!, req.user!.userId!, req.params.ownershipId);
  if (!result) { res.status(404).json({ error: 'Ownership record not found' }); return; }
  setAuditData(res as any, { action: 'delete', entityType: 'asset_owner', entityId: req.params.ownershipId });
  res.json({ message: 'Ownership revoked' });
}));

export default router;

