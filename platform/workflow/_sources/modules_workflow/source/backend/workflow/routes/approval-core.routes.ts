import { Router, Request, Response } from 'express';
import { z } from "zod";
import { asyncHandler } from '@dos/module-sdk';
import {

  requestApproval,
  listApprovals,
  approveRequest,
  rejectRequest,
  escalateRequest,
} from '../domain/approval.service';

const genericPayloadSchema = z.record(z.unknown());
import { publishApprovalRequested, publishApprovalDecided } from '../events/bus/workflow.publishers';
import { validate } from "../ports/middleware.port";
const router = Router();

router.get('/', validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header required' });
    return;
  }
  const limit = parseInt(req.query['limit'] as string || '50', 10);
  const offset = parseInt(req.query['offset'] as string || '0', 10);
  const status = req.query['status'] as string | undefined;
  const workflowInstanceId = req.query['workflowInstanceId'] as string | undefined;
  const result = await listApprovals({ tenantId, limit, offset, status, workflowInstanceId });
  res.json({ data: result.data, total: result.total });
}));

router.post('/', validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header required' });
    return;
  }
  const { workflowInstanceId, requestedBy, approvers, subject, context } = req.body;
  if (!workflowInstanceId || !requestedBy || !approvers) {
    res.status(400).json({ error: 'workflowInstanceId, requestedBy, and approvers are required' });
    return;
  }
  const approval = await requestApproval({ tenantId, workflowInstanceId, requestedBy, approvers, subject, context });
  publishApprovalRequested(approval).catch(() => undefined);
  res.status(201).json({ data: approval });
}));

router.post('/:id/approve', validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header required' });
    return;
  }
  const { approverId, comment } = req.body;
  if (!approverId) {
    res.status(400).json({ error: 'approverId is required' });
    return;
  }
  const approval = await approveRequest(req.params['id']!, tenantId, approverId, comment);
  if (!approval) {
    res.status(404).json({ error: 'Approval request not found' });
    return;
  }
  publishApprovalDecided(approval).catch(() => undefined);
  res.json({ data: approval });
}));

router.post('/:id/reject', validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header required' });
    return;
  }
  const { rejectedBy, reason } = req.body;
  if (!rejectedBy) {
    res.status(400).json({ error: 'rejectedBy is required' });
    return;
  }
  const approval = await rejectRequest(req.params['id']!, tenantId, rejectedBy, reason);
  if (!approval) {
    res.status(404).json({ error: 'Approval request not found' });
    return;
  }
  publishApprovalDecided(approval).catch(() => undefined);
  res.json({ data: approval });
}));

router.post('/:id/escalate', validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header required' });
    return;
  }
  const { escalatedBy, escalateTo, reason } = req.body;
  const approval = await escalateRequest(req.params['id']!, tenantId, escalatedBy, escalateTo, reason);
  if (!approval) {
    res.status(404).json({ error: 'Approval request not found' });
    return;
  }
  res.json({ data: approval });
}));

export default router;
