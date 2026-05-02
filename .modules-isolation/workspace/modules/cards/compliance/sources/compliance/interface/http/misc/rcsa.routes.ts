import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../../../ports/auth.port';
import { validate, asyncHandler, auditMiddleware, setAuditData, automationMiddleware } from '../../../ports/middleware.port';
import {
  createRCSACampaign, launchRCSACampaign, submitRCSAResponse,
  getRCSACampaigns, getRCSACampaignResults,
} from '../../../compliance/services/misc/rcsa.service';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { swallow, EC } from '@dos/platform-core/resilience';
import { campaignsPostBody, campaignsCampaignIdLaunchPostBody, responsesResponseIdPostBody } from "../../../schemas/compliance.schemas";

// ── Zod Schemas ──────────────────────────────────────────────────────────
const router = Router();
router.use(auditMiddleware("compliance"));
router.use(automationMiddleware("compliance"));

/**
 * @openapi
 * /rcsa/campaigns:
 *   get:
 *     tags: [RCSA]
 *     summary: List all RCSA campaigns
 *   post:
 *     tags: [RCSA]
 *     summary: Create a new RCSA campaign
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RCSACampaign'
 */
router.get('/campaigns', authenticate, requirePermission('risk.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const data = await getRCSACampaigns(tenantId);
  res.json({ data });
}));

router.post('/campaigns', authenticate, requirePermission('risk.record.write'), validate({ body: campaignsPostBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const result = await createRCSACampaign(tenantId, req.body);

  setAuditData(res as any, { action: "create", entityType: "rcsa_campaign", entityId: result.campaignId || (result as Record<string, unknown>).campaign_id || '', afterState: result });

  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'assessments', event: 'created', entityType: 'rcsa_campaign', entityId: result.campaignId || (result as Record<string, unknown>).campaign_id || '', data: result as unknown as Record<string, unknown> } as any)), { tenantId: tenantId, operation: 'grcEvent:assessments.rcsa_campaign.created' });
  res.status(201).json(result);
}));

router.post('/campaigns/:campaignId/launch', authenticate, requirePermission('risk.record.write'), validate({ body: campaignsCampaignIdLaunchPostBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  await launchRCSACampaign(tenantId, req.params.campaignId);
  setAuditData(res as any, { action: "update", entityType: "rcsa_campaign", entityId: req.params.campaignId, afterState: { status: 'launched' } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'assessments', event: 'launched', entityType: 'rcsa_campaign', entityId: req.params.campaignId } as any)), { tenantId: tenantId, operation: 'grcEvent:assessments.rcsa_campaign.launched' });
  res.json({ success: true });
}));

router.get('/campaigns/:campaignId/results', authenticate, requirePermission('risk.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const data = await getRCSACampaignResults(tenantId, req.params.campaignId);
  res.json(data);
}));

router.post('/responses/:responseId', authenticate, requirePermission('risk.record.write'), validate({ body: responsesResponseIdPostBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  await submitRCSAResponse(tenantId, { responseId: req.params.responseId, ...req.body });
  setAuditData(res as any, { action: "create", entityType: "rcsa_response", entityId: req.params.responseId, afterState: { responseId: req.params.responseId } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'assessments', event: 'response_submitted', entityType: 'rcsa_response', entityId: req.params.responseId } as any)), { tenantId: tenantId, operation: 'grcEvent:assessments.rcsa_response.response_submitted' });
  res.json({ success: true });
}));

export default router;

