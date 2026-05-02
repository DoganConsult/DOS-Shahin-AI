// @ts-nocheck
import { Router } from 'express';
import { z } from "zod";
import { authenticate, requirePermission, validate, asyncHandler } from '../ports/attestation.ports';
import * as service from '../services/attestation.service';
import { CreateCampaignSchema, CreateRecordSchema, ReviewRecordSchema, TransitionCampaignSchema } from '../schemas/attestation.schemas';
const genericPayloadSchema = z.record(z.unknown());

const router = Router();

// §6: /api/attestation/campaigns
router.get('/campaigns', authenticate, requirePermission('attestation.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: any, res: any) => {
  const data = await service.listCampaigns(req.tenantId);
  res.json({ data });
}));

router.post('/campaigns', authenticate, requirePermission('attestation.campaign.manage'), validate({ body: CreateCampaignSchema }), asyncHandler(async (req: any, res: any) => {
  const campaign = await service.createCampaign(req.tenantId, req.user.id, req.body);
  res.status(201).json({ data: campaign });
}));

router.patch('/campaigns/:id/transition', authenticate, requirePermission('attestation.campaign.manage'), validate({ body: TransitionCampaignSchema }), asyncHandler(async (req: any, res: any) => {
  const campaign = await service.transitionCampaign(req.tenantId, req.params.id, req.body.targetStatus, req.user.id);
  res.json({ data: campaign });
}));

// §6: /api/attestation/records
router.post('/records', authenticate, requirePermission('attestation.record.manage'), validate({ body: CreateRecordSchema }), asyncHandler(async (req: any, res: any) => {
  const record = await service.createRecord(req.tenantId, req.body);
  res.status(201).json({ data: record });
}));

// §7 SoD enforced: reviewer != attestor
router.patch('/records/:id/review', authenticate, requirePermission('attestation.record.review'), validate({ body: ReviewRecordSchema }), asyncHandler(async (req: any, res: any) => {
  const record = await service.reviewRecord(req.tenantId, req.params.id, req.user.id, req.body);
  res.json({ data: record });
}));

// §6: /api/attestation/diagnostics
router.get('/diagnostics', authenticate, requirePermission('attestation.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: any, res: any) => {
  const data = await service.runDiagnostics(req.tenantId);
  res.json({ data });
}));

export default router;

