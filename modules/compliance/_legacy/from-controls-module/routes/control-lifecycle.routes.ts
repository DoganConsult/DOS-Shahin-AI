import { Request, Response, Router } from 'express';
import type { AuthenticatedRequest as _AuthenticatedRequest } from '@dos/types';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission, evaluateLifecycleTransition } from '../ports/auth.port';
import { initiateApproval } from '../../workflow/services/approvals/approval-routing.service';
import { validate, auditMiddleware, setAuditData, asyncHandler, moduleStack } from '../ports/middleware.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { emitEvent } from '../ports/events.port';
import { checkStaleness } from '../services/ccm/control-lifecycle.service';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { createTransitionBody } from '../schemas/compliance.schemas';
import { catchHandler, EC } from '@dos/platform-core/resilience';

const router = Router();
router.use(moduleStack('compliance'));
router.use(auditMiddleware('compliance'));

router.get('/staleness', authenticate, requirePermission('compliance.control.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const threshold = parseInt(req.query.thresholdDays as string, 10) || 90;
  const results = await checkStaleness(req.tenantId!, threshold);
  res.json({ success: true, data: results, meta: { thresholdDays: threshold, total: results.length } });
}));

router.get('/:controlId/staleness', authenticate, requirePermission('compliance.control.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const results = await checkStaleness(req.tenantId!, req.params.controlId);
  res.json({ success: true, data: results[0] || null });
}));

router.get('/:controlId/transitions', authenticate, requirePermission('compliance.control.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(
    `SELECT from_status, to_status, required_permission_code, authority_gate, sod_check
     FROM "${schema}".module_lifecycle_transitions
     WHERE module_code = 'compliance'
     ORDER BY from_status, to_status`,
  );
  res.json({ success: true, data: result.rows });
}));

router.get('/:controlId/history', authenticate, requirePermission('compliance.control.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(
    `SELECT lh.id, lh.from_state, lh.to_state, lh.changed_by, lh.changed_at, lh.reason
     FROM "${schema}".lifecycle_history lh
     WHERE lh.entity_type = 'control' AND lh.entity_id = $1
     ORDER BY lh.changed_at DESC LIMIT 100`,
    [req.params.controlId],
  ).catch(() => ({ rows: [] }));
  res.json({ success: true, data: result.rows });
}));

router.post('/:controlId/transition', authenticate, requirePermission('compliance.control.approve'), validate({ body: createTransitionBody }), asyncHandler(async (req: Request, res: Response) => {
  const { controlId } = req.params;
  const { toState, reason } = req.body;
  const tenantId = req.tenantId!;
  const user = req.user!;
  const schema = tenantSchema(tenantId);

  const current = await safeQuery(
    `SELECT status FROM "${schema}".controls WHERE control_id = $1 AND deleted_at IS NULL`,
    [controlId],
  );
  if (current.rows.length === 0) { res.status(404).json({ error: 'Control not found' }); return; }
  const fromState = current.rows[0].status;

  const authResult = await evaluateLifecycleTransition(tenantId, user.userId || user.id, {
    moduleCode: 'compliance',
    entityType: 'control',
    entityId: controlId,
    fromState,
    toState,
    permissionCode: 'compliance.control.approve',
    userRoles: user.roles || [user.role_code || user.role],
  });

  if (!authResult.allowed) {
    res.status(403).json({ error: 'Transition denied', reason: authResult.reason, checks: authResult.checks });
    return;
  }

  const protectedStates = ['approved', 'verified', 'completed', 'closed'];
  if (protectedStates.includes(toState)) {
    await initiateApproval(tenantId, {
      entityType: 'control', entityId: controlId,
      action: `control.${toState}`, requestedBy: user.userId || user.id,
      routeId: `compliance.control.${toState}`,
    }).catch(catchHandler(EC.EVENT_BUS));
  }

  await safeQuery(`UPDATE "${schema}".controls SET status = $1, updated_at = NOW() WHERE control_id = $2`, [toState, controlId]);
  await safeQuery(
    `INSERT INTO "${schema}".lifecycle_history (entity_type, entity_id, from_state, to_state, changed_by, reason, changed_at)
     VALUES ('control', $1, $2, $3, $4, $5, NOW())`,
    [controlId, fromState, toState, user.userId || user.id, reason || null],
  ).catch(catchHandler(EC.EVENT_BUS));
  await emitEvent(({ event: 'compliance.control.transitioned', tenantId, userId: user.userId || user.id, module: 'compliance', entityType: 'control', entityId: controlId, data: { fromState, toState } } as any)).catch(catchHandler(EC.EVENT_BUS));

  setAuditData(res as any, { action: 'transition', entityType: 'control', entityId: controlId, afterState: { fromState, toState } });
  res.json({ success: true, data: { controlId, fromState, toState, lifecycleAuth: authResult.checks } });
}));

export default router;

