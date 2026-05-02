import { Request, Response, Router } from 'express';
import { z } from "zod";
import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// AGRC-OS — Control Deficiency Routes
// CRUD for control deficiencies, remediation
// actions, closure with evidence, and retest
// requests.
// ============================================


import { authenticate, requirePermission, setAuditData } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, automationMiddleware, fieldRbacFilter, validate } from '../ports/middleware.port';
import { ControlDeficiencyService } from "../services/control-deficiency.service";
import { createDeficiencyBody, createRemediationBody, closeDeficiencyBody, retestBody } from "../schemas/controls.schemas";

const router = Router();

/**
 * GET /api/controls/deficiencies
 *
 * List deficiencies with optional status filter.
 */
router.get(
  "/",
  authenticate,
  requirePermission("control.record.read"),
  fieldRbacFilter("control"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const status = req.query.status as string | undefined;
    const svc = new ControlDeficiencyService();
    const result = await svc.listDeficiencies(tenantId, status);
    res.json(result);
  })
);

/**
 * POST /api/controls/deficiencies
 *
 * Create a deficiency linked to a control.
 */
router.post(
  "/",
  authenticate,
  requirePermission("control.record.write"),
  validate({ body: createDeficiencyBody }),
  auditMiddleware("controls"),
  automationMiddleware("controls"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const createdBy = req.user?.userId || req.user!.userId!;
    const svc = new ControlDeficiencyService();
    const result = await svc.createDeficiency(tenantId, req.body);
    setAuditData(res as any, { action: 'create', entityType: 'control_deficiency', entityId: (result as any)?.id || 'new', afterState: result });
    res.status(201).json(result);
  })
);

/**
 * GET /api/controls/deficiencies/:id
 *
 * Deficiency detail including remediation history and linked control.
 */
router.get(
  "/:id",
  authenticate,
  requirePermission("control.record.read"),
  fieldRbacFilter("control"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const svc = new ControlDeficiencyService();
    const result = await svc.getDeficiency(tenantId, id);
    res.json(result);
  })
);

/**
 * POST /api/controls/deficiencies/:id/remediation
 *
 * Create a remediation action for a deficiency.
 */
router.post(
  "/:id/remediation",
  authenticate,
  requirePermission("control.record.write"),
  validate({ body: createRemediationBody }),
  auditMiddleware("controls"),
  automationMiddleware("controls"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const createdBy = req.user?.userId || req.user!.userId!;
    const svc = new ControlDeficiencyService();
    const result = await svc.createRemediation(tenantId, id, req.body);
    setAuditData(res as any, { action: 'create', entityType: 'control_remediation', entityId: (result as any)?.id || id, afterState: result });
    res.status(201).json(result);
  })
);

/**
 * POST /api/controls/deficiencies/:id/close
 *
 * Close a deficiency with evidence references.
 */
router.post(
  "/:id/close",
  authenticate,
  requirePermission("control.record.write"),
  validate({ body: closeDeficiencyBody }),
  auditMiddleware("controls"),
  automationMiddleware("controls"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const closedBy = req.user?.userId || req.user!.userId!;
    const svc = new ControlDeficiencyService();
    const result = await svc.closeDeficiency(tenantId, id, req.body);
    setAuditData(res as any, { action: 'close', entityType: 'control_deficiency', entityId: id, afterState: result });
    res.json(result);
  })
);

/**
 * POST /api/controls/deficiencies/:id/retest
 *
 * Request a retest for a deficiency.
 */
router.post(
  "/:id/retest",
  authenticate,
  requirePermission("controls:test"),
  validate({ body: retestBody }),
  auditMiddleware("controls"),
  automationMiddleware("controls"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const requestedBy = req.user?.userId || req.user!.userId!;
    const svc = new ControlDeficiencyService();
    await svc.requestRetest(tenantId, id);
    setAuditData(res as any, { action: 'retest', entityType: 'control_deficiency', entityId: id });
    res.json({ success: true });
  })
);

export default router;

