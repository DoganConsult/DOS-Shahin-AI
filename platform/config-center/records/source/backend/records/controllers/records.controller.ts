import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { NotFoundError } from '../../../errors/index';
import { setAuditData } from '../ports/middleware.port';
import * as recordsSvc from '../services/records.service';
import { emitRecordsEvent } from '../services/records-event.service';

export async function listRecords(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await recordsSvc.list(req.tenantId!, Number(req.query.limit) || 50, Number(req.query.offset) || 0);
  res.json(ok(result, req));
}

export async function getRecordById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await recordsSvc.getById(req.params.id, req.tenantId!);
  if (!result) throw new NotFoundError('record', req.params.id);
  res.json(ok(result, req));
}

export async function createRecord(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await recordsSvc.create({ ...req.body, created_by: userId }, req.tenantId!);
  const entityId = result?.record_id ?? result?.id;
  setAuditData(res as any, { action: 'create', entityType: 'record', entityId });
  emitRecordsEvent({ tenantId: req.tenantId!, entityType: 'record', entityId, action: 'created', triggeredBy: userId, data: result });
  res.status(201).json(ok(result, req));
}

export async function updateRecord(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await recordsSvc.update(req.params.id, { ...req.body, updated_by: userId }, req.tenantId!);
  if (!result) throw new NotFoundError('record', req.params.id);
  setAuditData(res as any, { action: 'update', entityType: 'record', entityId: req.params.id });
  emitRecordsEvent({ tenantId: req.tenantId!, entityType: 'record', entityId: req.params.id, action: 'updated', triggeredBy: userId, data: result });
  res.json(ok(result, req));
}

export async function deleteRecord(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  await recordsSvc.remove(req.params.id, req.tenantId!);
  setAuditData(res as any, { action: 'delete', entityType: 'record', entityId: req.params.id });
  emitRecordsEvent({ tenantId: req.tenantId!, entityType: 'record', entityId: req.params.id, action: 'deleted', triggeredBy: userId });
  res.json(action('Record deleted', req));
}
