import type { Request, Response } from 'express';
import { ok, action } from '@dos/module-sdk';
import { NotFoundError } from '../../../errors/index';
import { setAuditData } from '../ports/middleware.port';
import * as inboxSvc from '../services/inbox.service';
import { emitInboxEvent } from '../services/inbox-event.service';

export async function listMessages(req: Request, res: Response): Promise<void> {
  const result = await inboxSvc.list(req.tenantId!, Number(req.query.limit) || 50, Number(req.query.offset) || 0);
  res.json(ok(result, req));
}

export async function getMessageById(req: Request, res: Response): Promise<void> {
  const result = await inboxSvc.getById(req.params.id, req.tenantId!);
  if (!result) throw new NotFoundError('inbox_message', req.params.id);
  res.json(ok(result, req));
}

export async function createMessage(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await inboxSvc.create({ ...req.body, created_by: userId }, req.tenantId!);
  const entityId = result?.message_id ?? result?.id;
  setAuditData(res as any, { action: 'create', entityType: 'inbox_message', entityId });
  emitInboxEvent({ tenantId: req.tenantId!, entityType: 'message', entityId, action: 'created', triggeredBy: userId, data: result });
  res.status(201).json(ok(result, req));
}

export async function updateMessage(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await inboxSvc.update(req.params.id, { ...req.body, updated_by: userId }, req.tenantId!);
  if (!result) throw new NotFoundError('inbox_message', req.params.id);
  setAuditData(res as any, { action: 'update', entityType: 'inbox_message', entityId: req.params.id });
  emitInboxEvent({ tenantId: req.tenantId!, entityType: 'message', entityId: req.params.id, action: 'updated', triggeredBy: userId, data: result });
  res.json(ok(result, req));
}

export async function deleteMessage(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  await inboxSvc.remove(req.params.id, req.tenantId!);
  setAuditData(res as any, { action: 'delete', entityType: 'inbox_message', entityId: req.params.id });
  emitInboxEvent({ tenantId: req.tenantId!, entityType: 'message', entityId: req.params.id, action: 'deleted', triggeredBy: userId });
  res.json(action('Message deleted', req));
}
