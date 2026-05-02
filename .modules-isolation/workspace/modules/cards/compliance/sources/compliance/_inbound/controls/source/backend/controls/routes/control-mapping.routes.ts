import { Request, Response, Router } from 'express';
import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
// ============================================
// AGRC-OS — Control Mapping Routes
// Coverage analysis, gap detection, duplicate
// detection, and link management for controls
// mapped to risks, obligations, and policies.
// ============================================


import { authenticate, requirePermission, setAuditData } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, automationMiddleware, fieldRbacFilter, validate } from '../ports/middleware.port';
import { z } from "zod";
import { ControlMappingService } from "../services/control-mapping.service";
import { linkRiskBody, linkObligationBody, linkPolicyBody } from "../schemas/controls.schemas";

// Fallback body schema used when a handler accepts a generic passthrough
// payload. Declared early so handlers referenced below can pick it up
// (earlier the file declared this at the bottom with `let`, which broke
// the temporal-dead-zone at module load).
const genericPayloadSchema = z.record(z.unknown());

const router = Router();

/**
 * GET /api/controls/mapping/coverage
 *
 * Coverage analysis: unmapped controls, unmapped obligations,
 * weak-coverage risks, duplicates, shared controls, mapping health score.
 */
router.get(
  "/coverage",
  authenticate,
  requirePermission("control.record.read"),
  fieldRbacFilter("control"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const svc = new ControlMappingService();
    const result = await svc.getCoverage(tenantId);
    res.json(result);
  })
);

/**
 * GET /api/controls/mapping/gaps
 *
 * Unmapped items detail: controls without risk/obligation links,
 * obligations without control coverage.
 */
router.get(
  "/gaps",
  authenticate,
  requirePermission("control.record.read"),
  fieldRbacFilter("control"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const svc = new ControlMappingService();
    const result = await svc.getGaps(tenantId);
    res.json(result);
  })
);

/**
 * GET /api/controls/mapping/duplicates
 *
 * Duplicate controls detection: controls with similar titles,
 * overlapping scope, or redundant obligation coverage.
 */
router.get(
  "/duplicates",
  authenticate,
  requirePermission("control.record.read"),
  fieldRbacFilter("control"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const svc = new ControlMappingService();
    const result = await svc.getDuplicates(tenantId);
    res.json(result);
  })
);

/**
 * POST /api/controls/mapping/:controlId/link-risk
 *
 * Link a risk to a control.
 */
router.post(
  "/:controlId/link-risk",
  authenticate,
  requirePermission("control.record.write"),
  validate({ body: linkRiskBody }),
  auditMiddleware("controls"),
  automationMiddleware("controls"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { controlId } = req.params;
    const { riskId } = req.body;
    const svc = new ControlMappingService();
    await svc.linkRisk(tenantId, controlId, riskId);
    setAuditData(res as any, { action: 'link_risk', entityType: 'control_mapping', entityId: controlId, afterState: { riskId } });
    res.status(201).json({ linked: true });
  })
);

/**
 * POST /api/controls/mapping/:controlId/link-obligation
 *
 * Link an obligation to a control.
 */
router.post(
  "/:controlId/link-obligation",
  authenticate,
  requirePermission("control.record.write"),
  validate({ body: linkObligationBody }),
  auditMiddleware("controls"),
  automationMiddleware("controls"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { controlId } = req.params;
    const { obligationId } = req.body;
    const svc = new ControlMappingService();
    await svc.linkObligation(tenantId, controlId, obligationId);
    setAuditData(res as any, { action: 'link_obligation', entityType: 'control_mapping', entityId: controlId, afterState: { obligationId } });
    res.status(201).json({ linked: true });
  })
);

/**
 * POST /api/controls/mapping/:controlId/link-policy
 *
 * Link a policy to a control.
 */
router.post(
  "/:controlId/link-policy",
  authenticate,
  requirePermission("control.record.write"),
  validate({ body: linkPolicyBody }),
  auditMiddleware("controls"),
  automationMiddleware("controls"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { controlId } = req.params;
    const { policyId } = req.body;
    const svc = new ControlMappingService();
    await svc.linkPolicy(tenantId, controlId, policyId);
    setAuditData(res as any, { action: 'link_policy', entityType: 'control_mapping', entityId: controlId, afterState: { policyId } });
    res.status(201).json({ linked: true });
  })
);

/**
 * DELETE /api/controls/mapping/:controlId/links/:linkId
 *
 * Remove a mapping link from a control.
 */
router.delete(
  "/:controlId/links/:linkId",
  authenticate,
  requirePermission("control.record.write"),
  auditMiddleware("controls"),
  automationMiddleware("controls"), validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { controlId, linkId } = req.params;
    const svc = new ControlMappingService();
    await svc.removeLink(tenantId, controlId, linkId);
    setAuditData(res as any, { action: 'unlink', entityType: 'control_mapping', entityId: controlId, afterState: { removedLinkId: linkId } });
    res.status(204).send();
  })
);

export default router;
