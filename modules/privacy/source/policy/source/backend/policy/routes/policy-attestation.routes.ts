import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";
import { catchHandler, EC } from '@dos/platform-core/resilience';

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../ports/auth.port';
import {
  createAttestationCampaign, submitAttestation, getAttestationStatus,
  sendAttestationReminders, listAttestationCampaigns,
} from '../services/policy/policy-attestation.service';
import { emitEvent } from '../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
// ── Zod Validation Schemas ──
import { asyncHandler, auditMiddleware, setAuditData, automationMiddleware, validate, moduleStack } from '../ports/middleware.port';
import { createCampaignsBody, createCampaignscampaignIdRemindersBody, createSubmitBody } from "../schemas/policy.schemas";

const router = Router();
router.use(moduleStack('policy'));
router.use(auditMiddleware("policy"));
router.use(automationMiddleware("policy"));

/**
 * @openapi
 * /attestation/campaigns:
 *   get:
 *     tags: [Attestation]
 *     summary: List all policy attestation campaigns
 *   post:
 *     tags: [Attestation]
 *     summary: Create a new attestation campaign
 */
router.get('/campaigns', authenticate, requirePermission('policy.document.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const data = await listAttestationCampaigns(tenantId);
  res.json({ data });
}));

router.post('/campaigns', authenticate, requirePermission('policy.document.write'), validate({ body: createCampaignsBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const result = await createAttestationCampaign(tenantId, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'attestation_campaign', entityId: result.campaignId, afterState: result });
  emitEvent(({ tenantId, userId: req.user!.userId!, module: 'policy', event: 'created', entityType: 'attestation_campaign', entityId: result.campaignId } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.status(201).json(result);
}));

router.get('/campaigns/:campaignId/status', authenticate, requirePermission('policy.document.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const data = await getAttestationStatus(tenantId, req.params.campaignId);
  res.json(data);
}));

router.post('/campaigns/:campaignId/reminders', authenticate, requirePermission('policy.document.write'), validate({ body: createCampaignscampaignIdRemindersBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const count = await sendAttestationReminders(tenantId);
  setAuditData(res as any, { action: 'update', entityType: 'attestation_campaign', entityId: req.params.campaignId, afterState: { remindersSet: count } });
  emitEvent(({ tenantId, userId: req.user!.userId!, module: 'policy', event: 'updated', entityType: 'attestation_campaign', entityId: req.params.campaignId } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.json({ success: true, remindersSet: count });
}));

/**
 * @openapi
 * /attestation/submit:
 *   post:
 *     tags: [Attestation]
 *     summary: Submit attestation (attest or decline)
 */
router.post('/submit', authenticate, requirePermission('policy.document.write'), validate({ body: createSubmitBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  await submitAttestation(tenantId, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'attestation_record', entityId: req.body.campaignId || '', afterState: { action: req.body.action } });
  emitEvent(({ tenantId, userId: req.user!.userId!, module: 'policy', event: 'created', entityType: 'attestation_record', entityId: req.body.campaignId || '' } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.json({ success: true });
}));

export default router;

