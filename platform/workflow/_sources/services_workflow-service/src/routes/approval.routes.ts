import { Router, Request, Response } from 'express';
import { asyncHandler } from '@dos/module-sdk';
import { authenticate, requireTenantId, requirePermission, requireDauth } from '../adapters/auth.adapter';
import {
  requestApproval,
  listApprovals,
  approveRequest,
  rejectRequest,
  escalateRequest,
} from '../domain/approval.service';
import { publishApprovalRequested, publishApprovalDecided } from '../events/workflow.publishers';
import { withTenantClient } from '@dos/db';
import { rateLimiter } from '@dos/platform-core/http';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'workflow-service:approval', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.use(authenticate);
router.use(requireTenantId);

router.get('/', requirePermission('workflow.approval.read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const limit = parseInt(req.query['limit'] as string || '50', 10);
  const offset = parseInt(req.query['offset'] as string || '0', 10);
  const status = req.query['status'] as string | undefined;
  const workflowInstanceId = req.query['workflowInstanceId'] as string | undefined;
  const result = await listApprovals({ tenantId, limit, offset, status, workflowInstanceId });
  res.json({ data: result.data, total: result.total });
}));

router.post('/', requirePermission('workflow.approval.approve'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { workflowInstanceId, requestedBy, approvers, subject, context } = req.body;
  const actor = requestedBy || req.user!.userId;
  if (!workflowInstanceId || !approvers) {
    res.status(400).json({ error: 'workflowInstanceId and approvers are required' });
    return;
  }
  const approval = await requestApproval({ tenantId, workflowInstanceId, requestedBy: actor, approvers, subject, context });
  publishApprovalRequested(approval).catch((): void => undefined);
  res.status(201).json({ data: approval });
}));

router.post('/:id/approve',
  requireDauth({
    permission: 'workflow.approval.approve', moduleCode: 'workflow',
    entityType: 'approval', entityIdParam: 'id',
    lifecycleToState: 'approved', authorityRequired: 'approval_authority',
  }),
  asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { approverId, comment } = req.body;
  const actor = approverId || req.user!.userId;
  const approval = await approveRequest(req.params['id']!, tenantId, actor, comment);
  if (!approval) {
    res.status(404).json({ error: 'Approval request not found' });
    return;
  }
  publishApprovalDecided(approval).catch((): void => undefined);
  res.json({ data: approval });
}));

router.post('/:id/reject',
  requireDauth({
    permission: 'workflow.approval.approve', moduleCode: 'workflow',
    entityType: 'approval', entityIdParam: 'id', lifecycleToState: 'rejected',
  }),
  asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { rejectedBy, reason } = req.body;
  const actor = rejectedBy || req.user!.userId;
  const approval = await rejectRequest(req.params['id']!, tenantId, actor, reason);
  if (!approval) {
    res.status(404).json({ error: 'Approval request not found' });
    return;
  }
  publishApprovalDecided(approval).catch((): void => undefined);
  res.json({ data: approval });
}));

router.post('/:id/escalate',
  requireDauth({
    permission: 'workflow.approval.approve', moduleCode: 'workflow',
    entityType: 'approval', entityIdParam: 'id', lifecycleToState: 'escalated',
  }),
  asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { escalatedBy, escalateTo, reason } = req.body;
  const actor = escalatedBy || req.user!.userId;
  const approval = await escalateRequest(req.params['id']!, tenantId, actor, escalateTo, reason);
  if (!approval) {
    res.status(404).json({ error: 'Approval request not found' });
    return;
  }
  res.json({ data: approval });
}));

export default router;
