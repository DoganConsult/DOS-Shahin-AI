import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { NotFoundError } from '../../../errors/index';
import { setAuditData } from '../ports/middleware.port';
import * as privacySvc from '../services/misc/privacy.service';
import { emitPrivacyEvent } from '../services/privacy-event.service';

export async function listDataSubjectRequests(req: AuthenticatedRequest, res: Response): Promise<void> {

  const result = await privacySvc.list(req.tenantId, {
    limit: Number(req.query.limit) || 50,
    page: Number(req.query.page) || 1,
    type: req.query.type as string | undefined,
    status: req.query.status as string | undefined,
  });
  res.json(ok(result, req));
}

export async function getDataSubjectRequestById(req: AuthenticatedRequest, res: Response): Promise<void> {

  const result = await privacySvc.getById(req.tenantId, req.params.id);
  if (!result) throw new NotFoundError('data_subject_request', req.params.id);
  res.json(ok(result, req));
}

export async function createDataSubjectRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;

  const result = await privacySvc.create(req.tenantId, req.body, userId);
  const entityId = result?.id;
  setAuditData(res as any, { action: 'create', entityType: 'data_subject_request', entityId });

  emitPrivacyEvent({ tenantId: req.tenantId!, entityType: 'dsr', entityId, action: 'dsr_submitted', triggeredBy: userId, data: result as unknown });
  res.status(201).json(ok(result, req));
}

export async function updateDataSubjectRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;

  const result = await privacySvc.update(req.tenantId, req.params.id, req.body, userId);
  if (!result) throw new NotFoundError('data_subject_request', req.params.id);
  setAuditData(res as any, { action: 'update', entityType: 'data_subject_request', entityId: req.params.id });

  emitPrivacyEvent({ tenantId: req.tenantId!, entityType: 'dsr', entityId: req.params.id, action: 'updated', triggeredBy: userId, data: result as unknown });
  res.json(ok(result, req));
}

export async function deleteDataSubjectRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;

  await privacySvc.remove(req.tenantId, req.params.id, userId);
  setAuditData(res as any, { action: 'delete', entityType: 'data_subject_request', entityId: req.params.id });
  emitPrivacyEvent({ tenantId: req.tenantId!, entityType: 'dsr', entityId: req.params.id, action: 'deleted', triggeredBy: userId });
  res.json(action('Data subject request deleted', req));
}
