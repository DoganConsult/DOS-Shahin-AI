import { Request, Response, Router } from 'express';
import { z } from "zod";
import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// AGRC-OS — Control Certification Routes
// Certification campaigns, attestation requests,
// responses, manager sign-off, and overdue tracking.
// ============================================


import { authenticate, requirePermission, setAuditData } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, automationMiddleware, fieldRbacFilter, validate } from '../ports/middleware.port';
import { ControlCertificationService } from "../services/control-certification.service";
import { createCampaignBody, attestationResponseBody, signOffBody } from "../schemas/controls.schemas";

const router = Router();

/**
 * GET /api/controls/certifications
 *
 * List certification campaigns with optional status/date filters.
 */
router.get(
  "/",
  authenticate,
  requirePermission("control.record.read"),
  fieldRbacFilter("control"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const svc = new ControlCertificationService();
    const result = await svc.listCampaigns(tenantId);
    res.json(result);
  })
);

/**
 * POST /api/controls/certifications
 *
 * Create a new certification campaign.
 */
router.post(
  "/",
  authenticate,
  requirePermission("controls.certify"),
  validate({ body: createCampaignBody }),
  auditMiddleware("controls"),
  automationMiddleware("controls"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const createdBy = req.user?.userId || req.user!.userId!;
    const svc = new ControlCertificationService();
    const result = await svc.createCampaign(tenantId, req.body);
    setAuditData(res as any, { action: 'create', entityType: 'control_certification_campaign', entityId: (result as any)?.id || 'new', afterState: result });
    res.status(201).json(result);
  })
);

/**
 * GET /api/controls/certifications/overdue
 *
 * List overdue certifications across all campaigns.
 * Note: placed before /:campaignId to avoid route conflict.
 */
router.get(
  "/overdue",
  authenticate,
  requirePermission("control.record.read"),
  fieldRbacFilter("control"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const svc = new ControlCertificationService();
    const result = await svc.getOverdue(tenantId);
    res.json(result);
  })
);

/**
 * GET /api/controls/certifications/:campaignId
 *
 * Campaign detail with summary stats and attestation requests.
 */
router.get(
  "/:campaignId",
  authenticate,
  requirePermission("control.record.read"),
  fieldRbacFilter("control"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { campaignId } = req.params;
    const svc = new ControlCertificationService();
    const result = await svc.getCampaignDetail(tenantId, campaignId);
    res.json(result);
  })
);

/**
 * GET /api/controls/certifications/:campaignId/requests
 *
 * List attestation requests for a given campaign.
 */
router.get(
  "/:campaignId/requests",
  authenticate,
  requirePermission("control.record.read"),
  fieldRbacFilter("control"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { campaignId } = req.params;
    const svc = new ControlCertificationService();
    const detail = await svc.getCampaignDetail(tenantId, campaignId);
    res.json(detail?.requests ?? []);
  })
);

/**
 * POST /api/controls/certifications/:requestId/respond
 *
 * Submit an attestation response for a specific request.
 */
router.post(
  "/:requestId/respond",
  authenticate,
  requirePermission("controls.certify"),
  validate({ body: attestationResponseBody }),
  auditMiddleware("controls"),
  automationMiddleware("controls"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { requestId } = req.params;
    const respondedBy = req.user?.userId || req.user!.userId!;
    const svc = new ControlCertificationService();
    const result = await svc.submitResponse(tenantId, requestId, req.body);
    setAuditData(res as any, { action: 'respond', entityType: 'control_attestation', entityId: requestId, afterState: result });
    res.json(result);
  })
);

/**
 * POST /api/controls/certifications/:campaignId/sign-off
 *
 * Manager sign-off on a certification campaign.
 */
router.post(
  "/:campaignId/sign-off",
  authenticate,
  requirePermission("controls.certify"),
  validate({ body: signOffBody }),
  auditMiddleware("controls"),
  automationMiddleware("controls"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { campaignId } = req.params;
    const signedOffBy = req.user?.userId || req.user!.userId!;
    const svc = new ControlCertificationService();
    const result = await svc.managerSignOff(tenantId, campaignId, signedOffBy);
    setAuditData(res as any, { action: 'sign_off', entityType: 'control_certification_campaign', entityId: campaignId, afterState: result });
    res.json(result);
  })
);

export default router;

