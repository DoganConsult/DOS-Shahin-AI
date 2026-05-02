import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { NotFoundError } from '../../../errors/index';
import { setAuditData } from '../ports/middleware.port';
import * as issuesSvc from '../services/issues.service';
import { emitIssuesEvent } from '../services/issues-event.service';

export async function listIssues(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await issuesSvc.list(req.tenantId!, Number(req.query.limit) || 50, Number(req.query.offset) || 0);
  res.json(ok(result, req));
}

export async function getIssueById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await issuesSvc.getById(req.params.id, req.tenantId!);
  if (!result) throw new NotFoundError('issue', req.params.id);
  res.json(ok(result, req));
}

export async function createIssue(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await issuesSvc.create({ ...req.body, created_by: userId }, req.tenantId!);
  const entityId = result?.issue_id ?? result?.id;
  setAuditData(res as any, { action: 'create', entityType: 'issue', entityId });
  emitIssuesEvent({ tenantId: req.tenantId!, entityType: 'issue', entityId, action: 'created', triggeredBy: userId, data: result });
  res.status(201).json(ok(result, req));
}

export async function updateIssue(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await issuesSvc.update(req.params.id, { ...req.body, updated_by: userId }, req.tenantId!);
  if (!result) throw new NotFoundError('issue', req.params.id);
  setAuditData(res as any, { action: 'update', entityType: 'issue', entityId: req.params.id });
  emitIssuesEvent({ tenantId: req.tenantId!, entityType: 'issue', entityId: req.params.id, action: 'updated', triggeredBy: userId, data: result });
  res.json(ok(result, req));
}

export async function deleteIssue(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  await issuesSvc.remove(req.params.id, req.tenantId!);
  setAuditData(res as any, { action: 'delete', entityType: 'issue', entityId: req.params.id });
  emitIssuesEvent({ tenantId: req.tenantId!, entityType: 'issue', entityId: req.params.id, action: 'deleted', triggeredBy: userId });
  res.json(action('Issue deleted', req));
}
