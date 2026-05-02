import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { NotFoundError } from '../../../errors/index';
import { setAuditData } from '../ports/middleware.port';
import * as portalsSvc from '../services/portals.service';
import { emitPortalsEvent } from '../services/portals-event.service';

export async function listPortals(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await portalsSvc.list(req.tenantId!, Number(req.query.limit) || 50, Number(req.query.offset) || 0);
  res.json(ok(result, req));
}

export async function getPortalById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await portalsSvc.getById(req.params.id, req.tenantId!);
  if (!result) throw new NotFoundError('portal', req.params.id);
  res.json(ok(result, req));
}

export async function createPortal(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await portalsSvc.create({ ...req.body, created_by: userId }, req.tenantId!);
  const entityId = result?.portal_id ?? result?.id;
  setAuditData(res as any, { action: 'create', entityType: 'portal', entityId });
  emitPortalsEvent({ tenantId: req.tenantId!, entityType: 'portal', entityId, action: 'created', triggeredBy: userId, data: result });
  res.status(201).json(ok(result, req));
}

export async function updatePortal(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await portalsSvc.update(req.params.id, { ...req.body, updated_by: userId }, req.tenantId!);
  if (!result) throw new NotFoundError('portal', req.params.id);
  setAuditData(res as any, { action: 'update', entityType: 'portal', entityId: req.params.id });
  emitPortalsEvent({ tenantId: req.tenantId!, entityType: 'portal', entityId: req.params.id, action: 'updated', triggeredBy: userId, data: result });
  res.json(ok(result, req));
}

export async function deletePortal(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  await portalsSvc.remove(req.params.id, req.tenantId!);
  setAuditData(res as any, { action: 'delete', entityType: 'portal', entityId: req.params.id });
  emitPortalsEvent({ tenantId: req.tenantId!, entityType: 'portal', entityId: req.params.id, action: 'deleted', triggeredBy: userId });
  res.json(action('Portal deleted', req));
}
