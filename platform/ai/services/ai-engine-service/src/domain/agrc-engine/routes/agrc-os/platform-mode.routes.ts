import { Request, Response, Router } from 'express';
import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';
import { logger } from '../../ports/logger.port';
// AGRC-OS — Platform Mode & Pending Actions routes
// Covers: platform mode, agent roles, pending actions (list/count/review), mode operation log


import { authenticate, requirePermission } from '../../ports/auth.port';
import { auditMiddleware, validate, setAuditData } from '../../ports/middleware.port';
import { errMsg } from '../../../../i18n/error-messages';
import { emitEvent } from '../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { writeLimiter } from './shared';
import { updateReviewBody } from '../../schemas/agrc-engine.schemas';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(auditMiddleware('agrc-engine'));

// ── Platform Mode & Pending Actions ────────────────────────────────────────

// GET /api/agrc-os/platform-mode — Current tenant platform mode
router.get('/platform-mode', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('platform.agent.read'), async (req: Request, res: Response) => {
  try {

    const { getTenantPlatformMode } = await import('@dos/platform-core/settings/platform-mode-gate');
    const mode = await getTenantPlatformMode(req.tenantId);
    res.json({ mode });
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

// GET /api/agrc-os/agent-roles — Agent RBAC map
router.get('/agent-roles', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('platform.agent.read'), async (req: Request, res: Response) => {
  try {

    const { getAgentRbacEntries } = await import('@dos/platform-core/settings/platform-mode-gate');
    res.json({ agents: getAgentRbacEntries() });
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

// GET /api/agrc-os/pending-actions — List pending agent actions awaiting approval
router.get('/pending-actions', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('platform.agent.read'), async (req: Request, res: Response) => {
  try {

    const { getPendingActions } = await import('@dos/platform-core/settings/platform-mode-gate');
    const agentId = req.query.agentId as string | undefined;
    const status = req.query.status as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const actions = await getPendingActions(req.tenantId, { agentId, status, limit });
    res.json({ actions, count: actions.length });
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

// GET /api/agrc-os/pending-actions/count — Count of pending actions (for badge)
router.get('/pending-actions/count', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('platform.agent.read'), async (req: Request, res: Response) => {
  try {

    const { getPendingActions } = await import('@dos/platform-core/settings/platform-mode-gate');
    const actions = await getPendingActions(req.tenantId, { status: 'awaiting_approval' });
    res.json({ count: actions.length });
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

// PUT /api/agrc-os/pending-actions/:id/review — Approve or reject a pending action
router.put('/pending-actions/:id/review', authenticate, requirePermission('platform.agent.write'), writeLimiter, validate({ body: updateReviewBody }), async (req: Request, res: Response) => {
  try {

    const { reviewPendingAction } = await import('@dos/platform-core/settings/platform-mode-gate');
    const { executeAction } = await import('../../runtime/ai/services/agents/core/agent-runner.service');
    const tenantId = req.tenantId;
    const userId = req.user?.userId;
    const { approved, reviewNote } = req.body;

    if (typeof approved !== 'boolean') {
      res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
      return;
    }

    const result = await reviewPendingAction(tenantId, req.params.id, userId, approved, reviewNote);
    if (!result.success) {
      res.status(404).json({ error: errMsg('NOT_FOUND', req) });
      return;
    }

    if (approved && result.action) {
      const payload = typeof result.action.proposed_payload === 'string'
        ? JSON.parse(result.action.proposed_payload)
        : result.action.proposed_payload || {};
      try {
        await executeAction(tenantId, result.action.agent_id, {
          type: result.action.action_type,
          title: payload.title || result.action.action_type,
          description: payload.description || '',
          priority: payload.priority || 'medium',
          entityType: result.action.entity_type,
          entityId: result.action.entity_id,
          payload,
        });
      } catch (execErr: unknown) {
        logger.warn(`[PendingActions] Approved action execution failed: ${toErrorMessage(execErr)}`);
      }
    }

    setAuditData(res as any, {
      action: approved ? 'update' : 'delete',
      entityType: 'agent_pending_action',
      entityId: req.params.id,
      afterState: { approved, reviewNote },
    });

    emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'updated', entityType: 'agrc_os', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
    res.json({ success: true, status: approved ? 'approved' : 'rejected' });
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

// GET /api/agrc-os/mode-operation-log — Audit log of mode-gated operations
router.get('/mode-operation-log', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('event.log.read'), async (req: Request, res: Response) => {
  try {
    const { tenantSchema, safeQuery } = await import('@dos/db');
    const schema = tenantSchema(req.tenantId);
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const agentId = req.query.agentId as string | undefined;

    let where = '';
    const params: unknown[] = [];
    if (agentId) {
      where = 'WHERE agent_id = $1';
      params.push(agentId);
    }

    const result = await safeQuery(
      `SELECT * FROM "${schema}".mode_operation_log ${where} ORDER BY created_at DESC LIMIT $${params.length + 1}`,
      [...params, limit],
    );
    res.json({ log: result.rows, count: result.rows.length });
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

export default router;

