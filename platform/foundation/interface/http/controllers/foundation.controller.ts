import { ok, action } from '../../../ports/response.port';
import { NotFoundError } from '../../../domain/errors/index';
import { setAuditData } from '../../../ports/middleware.port';
import * as foundationService from '../../../application/services/foundation.service';

export async function listNodes(req: any, res: any): Promise<void> {
  const result = await foundationService.getNodes(req.tenantId!, req.query as Record<string, string>);
  res.json(ok(result, req));
}

export async function getById(req: any, res: any): Promise<void> {
  const node = await foundationService.getNodeById(req.tenantId!, req.params.id);
  if (!node) throw new NotFoundError('foundation_node', req.params.id);
  res.json(ok(node, req));
}

export async function create(req: any, res: any): Promise<void> {
  const userId = req.user!.userId;
  const node = await foundationService.createNode(req.tenantId!, { ...req.body, createdBy: userId });
  setAuditData(res as any, { action: 'create', entityType: 'foundation_node', entityId: node?.id, afterState: node });
  res.status(201).json(ok(node, req));
}

export async function update(req: any, res: any): Promise<void> {
  const userId = req.user!.userId;
  const updated = await foundationService.updateNode(req.tenantId!, req.params.id, { ...req.body, updatedBy: userId });
  if (!updated) throw new NotFoundError('foundation_node', req.params.id);
  setAuditData(res as any, { action: 'update', entityType: 'foundation_node', entityId: req.params.id, afterState: updated });
  res.json(ok(updated, req));
}

export async function transitionStatus(req: any, res: any): Promise<void> {
  const userId = req.user!.userId;
  const { toStatus } = req.body;
  const updated = await foundationService.transitionStatus(req.tenantId!, req.params.id, toStatus, userId);
  if (!updated) throw new NotFoundError('foundation_node', req.params.id);
  setAuditData(res as any, { action: 'status_change', entityType: 'foundation_node', entityId: req.params.id, afterState: updated });
  res.json(ok(updated, req));
}

export async function remove(req: any, res: any): Promise<void> {
  const userId = req.user!.userId;
  const deleted = await foundationService.deleteNode(req.tenantId!, req.params.id, userId);
  if (!deleted) throw new NotFoundError('foundation_node', req.params.id);
  setAuditData(res as any, { action: 'delete', entityType: 'foundation_node', entityId: req.params.id });
  res.json(action('Foundation node deleted', req));
}

export async function getTree(req: any, res: any): Promise<void> {
  const tree = await foundationService.getHierarchyTree(req.tenantId!);
  res.json(ok(tree, req));
}

export async function getChildNodes(req: any, res: any): Promise<void> {
  const children = await foundationService.getChildren(req.tenantId!, req.params.id);
  res.json(ok(children, req));
}
