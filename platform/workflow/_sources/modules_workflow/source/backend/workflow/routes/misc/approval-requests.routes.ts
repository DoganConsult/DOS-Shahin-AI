import { Request, Response, Router } from 'express';
import { z } from "zod";
// ============================================
// Shahin-Ai — Approval Requests Routes
// Serves /api/approval-requests endpoints
// (frontend expects this prefix instead of /api/approvals)
//
// Delegates to existing approval-routing.service where
// possible; uses inline SQL for dashboard aggregate
// and action-specific endpoints.
//
// GET    /dashboard       — aggregate stats
// GET    /                — list all requests
// GET    /my              — pending for current user
// GET    /:id             — detail
// POST   /                — create new request
// PUT    /:id/accept      — accept request
// PUT    /:id/approve     — approve request
// PUT    /:id/reject      — reject request
// PUT    /:id/reassign    — reassign request
// PUT    /:id/escalate    — escalate request
// ============================================


import { authenticate, requirePermission } from '../../ports/auth.port';
import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';

import { errMsg } from '../../../../i18n/error-messages';
import {
  initiateApproval,
  listApprovalRequests,
  getPendingApprovals,
  getApprovalDetail,
  submitDecision,
} from '../../services/approvals/approval-routing.service';
import { toErrorMessage } from '@dos/module-sdk';
import { notifyDomainChange, emitEvent, eventBus } from '../../ports/events.port';
import { getFirstRow } from '@dos/db';
import { z as _z } from 'zod';


// ── Zod Validation Schemas ──
import { tenantGuard, auditMiddleware, setAuditData, automationMiddleware, validate, moduleStack } from '../../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { createRootBody, updateIdAcceptBody, updateIdApproveBody, updateIdRejectBody, updateIdReassignBody, updateIdEscalateBody } from "../../schemas/workflow.schemas";

const genericPayloadSchema = z.record(z.unknown());

const router = Router();
router.use(moduleStack('workflow'));
router.use(auditMiddleware('workflows'));
router.use(automationMiddleware('workflows'));
router.use(authenticate as unknown as import('express').RequestHandler);
// tenantGuard is a factory: calling it with `()` returns the actual
// middleware. The prior usage `router.use(tenantGuard)` passed the
// factory itself as a handler — Express then invoked it as
// tenantGuard(req, res, next), which returned a brand-new middleware
// that never got called, so `next()` never fired and the request hung
// until the client's read timeout. Every /api/approval-requests/*
// request timed out as a result.
router.use(tenantGuard());

// ── GET /dashboard — aggregate counts by status ──
router.get('/dashboard', validate({ query: z.record(z.unknown()) }), requirePermission('workflow.approval.read'), async (req: Request, res: Response) => {
  try {
    const schema = tenantSchema(req.tenantId!);
    const result = await safeQuery(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending')   AS pending,
        COUNT(*) FILTER (WHERE status = 'approved')  AS approved,
        COUNT(*) FILTER (WHERE status = 'rejected')  AS rejected,
        COUNT(*) FILTER (WHERE status = 'escalated') AS escalated,
        COUNT(*) FILTER (WHERE status = 'accepted')  AS accepted,
        COUNT(*)                                       AS total
      FROM "${schema}".approval_requests
    `);
    const row = getFirstRow(result) || {};
    res.json({
      pending:   parseInt(row.pending   || '0', 10),
      approved:  parseInt(row.approved  || '0', 10),
      rejected:  parseInt(row.rejected  || '0', 10),
      escalated: parseInt(row.escalated || '0', 10),
      accepted:  parseInt(row.accepted  || '0', 10),
      total:     parseInt(row.total     || '0', 10),
    });
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.error('[approval-requests:dashboard] failed', { err, tenantId: req.tenantId, message: (err as Error)?.message });
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req), detail: (err as Error)?.message });
  }
});

// ── GET / — list approval requests (delegates to service) ──
router.get('/', validate({ query: z.record(z.unknown()) }), requirePermission('workflow.approval.read'), async (req: Request, res: Response) => {
  try {
    const filters = {
      status: req.query.status as string | undefined,
      entityType: req.query.entityType as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
    };
    const requests = await listApprovalRequests(req.tenantId!, filters);
    res.json(requests);
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// ── GET /my — pending approvals for current user ──
router.get('/my', validate({ query: z.record(z.unknown()) }), requirePermission('workflow.approval.read'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId!;
    if (!userId) { res.status(401).json({ error: errMsg('UNAUTHORIZED', req) }); return; }
    const pending = await getPendingApprovals(req.tenantId!, userId);
    res.json(pending);
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// ── GET /:id — approval request detail ──
router.get('/:id', validate({ query: z.record(z.unknown()) }), requirePermission('workflow.approval.read'), async (req: Request, res: Response) => {
  try {
    const approval = await getApprovalDetail(req.tenantId!, req.params.id);
    res.json(approval);
  } catch (err: unknown) {
    const status = toErrorMessage(err) === 'Approval request not found' ? 404 : 500;
    res.status(status).json({ error: status === 404 ? errMsg('APPROVAL_NOT_FOUND', req) : errMsg('INTERNAL_ERROR', req) });
  }
});

// ── POST / — create a new approval request ──
router.post('/', validate({ body: createRootBody }), requirePermission('workflow.approval.approve'), async (req: Request, res: Response) => {
  try {
    const {
      title, description, entity_type, priority,
      assigned_to, assigned_team_id, sla_hours, escalation_chain,
    } = req.body;

    const entityType = entity_type || 'general';
    const entityId = req.body.entity_id || 'new';
    const action = req.body.action || 'approval';

    // Try to use the existing service if we have a route_id
    if (req.body.route_id) {
      const approval = await initiateApproval(req.tenantId!, {
        entityType,
        entityId,
        action,
        requestedBy: req.user?.userId || 'any',
        routeId: req.body.route_id,
        context: { title, description, priority, assigned_to, assigned_team_id, sla_hours, escalation_chain },
      });

      setAuditData(res as any, { action: 'create', entityType: 'approval-request', entityId: (approval as Record<string, unknown>).approvalId ?? (approval as Record<string, unknown>).approval_id, afterState: approval });
      notifyDomainChange(req.tenantId!, 'workflows', String((approval as Record<string, unknown>).approvalId ?? (approval as Record<string, unknown>).approval_id ?? ''), 'create');
      swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'approval_requests', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.approval_requests.created' });
      res.status(201).json(approval);
      return;
    }

    // Fallback: direct insert for frontend-driven requests
    const schema = tenantSchema(req.tenantId!);
    const result = await safeQuery(`
      INSERT INTO "${schema}".approval_requests
        (entity_type, entity_id, action, requested_by, status, context, created_at)
      VALUES ($1, $2, $3, $4, 'pending', $5, NOW())
      RETURNING *
    `, [
      entityType,
      entityId,
      action,
      req.user?.userId || 'any',
      JSON.stringify({ title, description, priority, assigned_to, assigned_team_id, sla_hours, escalation_chain }),
    ]);
    const row = getFirstRow(result)!;
    setAuditData(res as any, { action: 'create', entityType: 'approval-request', entityId: row?.approval_id ?? row?.id, afterState: row });
    notifyDomainChange(req.tenantId!, 'workflows', 'create', row?.approval_id ?? row?.id);
    res.status(201).json(row);
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// ── PUT /:id/accept — mark request as accepted ──
router.put('/:id/accept', validate({ body: updateIdAcceptBody }), requirePermission('workflow.approval.approve'), async (req: Request, res: Response) => {
  try {
    const schema = tenantSchema(req.tenantId!);
    const result = await safeQuery(`
      UPDATE "${schema}".approval_requests
      SET status = 'accepted', updated_at = NOW()
      WHERE approval_id = $1
      RETURNING *
    `, [req.params.id]);
    if (result.rowCount === 0) { res.status(404).json({ error: errMsg('APPROVAL_NOT_FOUND', req) }); return; }
    setAuditData(res as any, { action: 'update', entityType: 'approval-request', entityId: req.params.id, afterState: getFirstRow(result) });
    notifyDomainChange(req.tenantId!, 'workflows', 'update', req.params.id);
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'approval_completed', entityType: 'approval_requests', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.approval_requests.approval_completed' });
    swallow(EC.EVENT_BUS, eventBus.publish(({ eventType: 'workflow.status_changed', tenantId: req.tenantId!, severity: 'info', payload: { entityId: req.params.id, moduleCode: 'workflow', fromStatus: 'pending', toStatus: 'accepted', actorUserId: req.user!.userId! } } as any)), { tenantId: req.tenantId!, operation: 'eventBus:workflow.status_changed' });
    res.json(getFirstRow(result));
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// ── PUT /:id/approve — approve via service ──
router.put('/:id/approve', validate({ body: updateIdApproveBody }), requirePermission('workflow.approval.approve'), async (req: Request, res: Response) => {
  try {
    await submitDecision(req.tenantId!, req.params.id, {
      approverId: req.user?.userId || 'any',
      decision: 'approved',
      reason: req.body.comment || req.body.reason || '',
    });
    setAuditData(res as any, { action: 'update', entityType: 'approval-request', entityId: req.params.id, afterState: { decision: 'approved' } });
    notifyDomainChange(req.tenantId!, 'workflows', 'update', req.params.id);
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'approval_completed', entityType: 'approval_requests', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.approval_requests.approval_completed' });
    res.json({ success: true, message: 'Approved' });
  } catch (err: unknown) {
    const status = toErrorMessage(err).includes('not found') ? 404 : toErrorMessage(err).includes('already') ? 409 : 500;
    res.status(status).json({ error: status === 404 ? errMsg('APPROVAL_NOT_FOUND', req) : status === 409 ? errMsg('APPROVAL_ALREADY_PROCESSED', req) : errMsg('INTERNAL_ERROR', req) });
  }
});

// ── PUT /:id/reject — reject via service ──
router.put('/:id/reject', validate({ body: updateIdRejectBody }), requirePermission('workflow.approval.approve'), async (req: Request, res: Response) => {
  try {
    await submitDecision(req.tenantId!, req.params.id, {
      approverId: req.user?.userId || 'any',
      decision: 'rejected',
      reason: req.body.comment || req.body.reason || '',
    });
    setAuditData(res as any, { action: 'update', entityType: 'approval-request', entityId: req.params.id, afterState: { decision: 'rejected' } });
    notifyDomainChange(req.tenantId!, 'workflows', 'update', req.params.id);
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'approval_rejected', entityType: 'approval_requests', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.approval_requests.approval_rejected' });
    res.json({ success: true, message: 'Rejected' });
  } catch (err: unknown) {
    const status = toErrorMessage(err).includes('not found') ? 404 : toErrorMessage(err).includes('already') ? 409 : 500;
    res.status(status).json({ error: status === 404 ? errMsg('APPROVAL_NOT_FOUND', req) : status === 409 ? errMsg('APPROVAL_ALREADY_PROCESSED', req) : errMsg('INTERNAL_ERROR', req) });
  }
});

// ── PUT /:id/reassign ──
router.put('/:id/reassign', validate({ body: updateIdReassignBody }), requirePermission('workflow.approval.approve'), async (req: Request, res: Response) => {
  try {
    const { assigned_to, assigned_team_id } = req.body;
    if (!assigned_to && !assigned_team_id) {
      res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
      return;
    }
    const schema = tenantSchema(req.tenantId!);
    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;
    if (assigned_to) { sets.push(`context = jsonb_set(COALESCE(context::jsonb, '{}'), '{assigned_to}', $${idx}::jsonb)`); vals.push(JSON.stringify(assigned_to)); idx++; }
    if (assigned_team_id) { sets.push(`context = jsonb_set(COALESCE(context::jsonb, '{}'), '{assigned_team_id}', $${idx}::jsonb)`); vals.push(JSON.stringify(assigned_team_id)); idx++; }
    sets.push('updated_at = NOW()');
    vals.push(req.params.id);
    const result = await safeQuery(`
      UPDATE "${schema}".approval_requests
      SET ${sets.join(', ')}
      WHERE approval_id = $${idx}
      RETURNING *
    `, vals);
    if (result.rowCount === 0) { res.status(404).json({ error: errMsg('APPROVAL_NOT_FOUND', req) }); return; }
    setAuditData(res as any, { action: 'update', entityType: 'approval-request', entityId: req.params.id, afterState: getFirstRow(result) });
    notifyDomainChange(req.tenantId!, 'workflows', 'update', req.params.id);
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'task_reassigned', entityType: 'approval_requests', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.approval_requests.task_reassigned' });
    res.json(getFirstRow(result));
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// ── PUT /:id/escalate ──
router.put('/:id/escalate', validate({ body: updateIdEscalateBody }), requirePermission('workflow.approval.approve'), async (req: Request, res: Response) => {
  try {
    const schema = tenantSchema(req.tenantId!);
    const result = await safeQuery(`
      UPDATE "${schema}".approval_requests
      SET status = 'escalated', updated_at = NOW()
      WHERE approval_id = $1
      RETURNING *
    `, [req.params.id]);
    if (result.rowCount === 0) { res.status(404).json({ error: errMsg('APPROVAL_NOT_FOUND', req) }); return; }
    setAuditData(res as any, { action: 'update', entityType: 'approval-request', entityId: req.params.id, afterState: getFirstRow(result) });
    notifyDomainChange(req.tenantId!, 'workflows', 'update', req.params.id);
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'sla_breached', entityType: 'approval_requests', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.approval_requests.sla_breached' });
    swallow(EC.EVENT_BUS, eventBus.publish(({ eventType: 'workflow.status_changed', tenantId: req.tenantId!, severity: 'info', payload: { entityId: req.params.id, moduleCode: 'workflow', fromStatus: 'pending', toStatus: 'escalated', actorUserId: req.user!.userId! } } as any)), { tenantId: req.tenantId!, operation: 'eventBus:workflow.status_changed' });
    res.json(getFirstRow(result));
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

export default router;

