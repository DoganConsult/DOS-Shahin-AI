import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — Approval Routing Routes
// 5 endpoints for approval request management.
// Internal auth (authenticate + tenantGuard).
//
// POST   /initiate
// GET    /requests
// GET    /pending
// GET    /requests/:id
// POST   /requests/:id/decide
//
// Requirements: 17.5, 21.1
// ============================================


import { authenticate, requirePermission } from '../../ports/auth.port';
import {
  initiateApproval,
  listApprovalRequests,
  getPendingApprovals,
  getApprovalDetail,
  submitDecision,
} from '../../services/approvals/approval-routing.service';
import { emitEvent } from '../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { z as _z } from 'zod';


// ── Zod Validation Schemas ──
import { tenantGuard, auditMiddleware, setAuditData, automationMiddleware, validate, moduleStack } from '../../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { createInitiateBody, createRequestsidDecideBody } from "../../schemas/workflow.schemas";
const router = Router();
router.use(moduleStack('workflow'));
router.use(auditMiddleware('workflows'));
router.use(automationMiddleware('workflows'));

// All routes require internal auth + tenant guard
router.use(authenticate as any);
router.use(tenantGuard());

// POST /initiate — start an approval request
router.post('/initiate', validate({ body: createInitiateBody }), requirePermission('workflow.approval.approve'), async (req: Request, res: Response) => {
  try {
    const { entityType, entityId, action, routeId, context } = req.body;
    if (!entityType || !entityId || !action || !routeId) {
      res.status(400).json({ error: 'entityType, entityId, action, and routeId are required' });
      return;
    }

    const approval = await initiateApproval(req.tenantId!, {
      entityType,
      entityId,
      action,
      requestedBy: req.user?.userId || 'any',
      routeId,
      context,
    });

    setAuditData(res as any, { action: 'create', entityType: 'approval-routing', entityId: (approval as Record<string, unknown>).approvalId ?? (approval as Record<string, unknown>).approval_id ?? req.params.id, afterState: approval });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'approval_required', entityType: 'approval_routing', entityId: (approval as Record<string, unknown>).approvalId ?? (approval as Record<string, unknown>).approval_id ?? '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.approval_routing.approval_required' });
    res.status(201).json(approval);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) || 'Failed to initiate approval' });
  }
});

// GET /requests — list approval requests
router.get('/requests', validate({ query: z.record(z.unknown()) }), requirePermission('workflow.approval.read'), async (req: Request, res: Response) => {
  try {
    const filters = {
      status: req.query.status as string | undefined,
      entityType: req.query.entityType as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
    };
    const requests = await listApprovalRequests(req.tenantId!, filters);
    res.json(requests);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) || 'Failed to list approval requests' });
  }
});

// GET /pending — list pending approvals for the current user
router.get('/pending', validate({ query: z.record(z.unknown()) }), requirePermission('workflow.approval.read'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId!;
    if (!userId) {
      res.status(401).json({ error: 'User ID required' });
      return;
    }
    const pending = await getPendingApprovals(req.tenantId!, userId);
    res.json(pending);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) || 'Failed to get pending approvals' });
  }
});

// GET /requests/:id — get approval request detail
router.get('/requests/:id', validate({ query: z.record(z.unknown()) }), requirePermission('workflow.approval.read'), async (req: Request, res: Response) => {
  try {
    const approval = await getApprovalDetail(req.tenantId!, req.params.id);
    res.json(approval);
  } catch (err: unknown) {
    const status = toErrorMessage(err) === 'Approval request not found' ? 404 : 500;
    res.status(status).json({ error: toErrorMessage(err) || 'Failed to get approval detail' });
  }
});

// POST /requests/:id/decide — submit a decision
router.post('/requests/:id/decide', validate({ body: createRequestsidDecideBody }), requirePermission('workflow.approval.approve'), async (req: Request, res: Response) => {
  try {
    const { decision, reason, delegateTo } = req.body;
    if (!decision || !['approved', 'rejected', 'delegated'].includes(decision)) {
      res.status(400).json({ error: 'Valid decision (approved, rejected, delegated) is required' });
      return;
    }
    if (decision === 'delegated' && !delegateTo) {
      res.status(400).json({ error: 'delegateTo is required for delegation' });
      return;
    }

    await submitDecision(req.tenantId!, req.params.id, {
      approverId: req.user?.userId || 'any',
      decision,
      reason,
      delegateTo,
    });
    setAuditData(res as any, { action: 'update', entityType: 'approval-routing', entityId: req.params.id, afterState: { decision, reason } });
    const eventName = decision === 'approved' ? 'approval_completed' : decision === 'rejected' ? 'approval_rejected' : 'updated';
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: eventName, entityType: 'approval_routing', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.approval_routing.any' });
    res.json({ success: true, message: `Decision "${decision}" recorded` });
  } catch (err: unknown) {
    const status = toErrorMessage(err).includes('not found') ? 404
      : toErrorMessage(err).includes('already') ? 409
      : 500;
    res.status(status).json({ error: toErrorMessage(err) || 'Failed to submit decision' });
  }
});

export default router;

