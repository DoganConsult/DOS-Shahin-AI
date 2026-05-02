import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission, evaluateLifecycleTransition } from '../../../ports/auth.port';
import { initiateApproval } from '../../../workflow/services/approvals/approval-routing.service';
import {
  createComplianceAttestationCampaign, submitComplianceAttestation,
  getComplianceAttestationStatus, listComplianceAttestations,
  reviewAttestationSubmission, sendComplianceAttestationReminders,
  activateCampaign,
} from '../../services/compliance/compliance-attestation.service';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { asyncHandler, auditMiddleware, setAuditData, automationMiddleware, validate, moduleStack } from '../../../ports/middleware.port';
import { swallow, catchHandler, EC } from '@dos/platform-core/resilience';
import { createCampaignBody, submitAttestationBody, reviewAttestationBody, createActivateBody, createRemindersBody } from "../../../schemas/compliance.schemas";

const router = Router();
router.use(moduleStack('compliance'));
router.use(auditMiddleware("compliance"));
router.use(automationMiddleware("compliance"));

// GET /campaigns — list compliance attestation campaigns
router.get('/campaigns', authenticate, requirePermission('attestation.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const { entityType, status } = req.query as Record<string, string | undefined>;
  const data = await listComplianceAttestations(tenantId, { entityType, status });
  res.json({ data });
}));

// POST /campaigns — create compliance attestation campaign
router.post('/campaigns', authenticate, requirePermission('attestation.record.manage'), validate({ body: createCampaignBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const result = await createComplianceAttestationCampaign(tenantId, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'attestation_campaign', entityId: result.campaignId, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'compliance', event: 'created', entityType: 'attestation_campaign', entityId: result.campaignId } as any)), { tenantId: tenantId, operation: 'grcEvent:compliance.attestation_campaign.created' });
  res.status(201).json(result);
}));

// GET /campaigns/:id — get campaign status and records
router.get('/campaigns/:id', authenticate, requirePermission('attestation.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const data = await getComplianceAttestationStatus(tenantId, req.params.id);
  if (!data.campaign) { res.status(404).json({ error: 'Campaign not found' }); return; }
  res.json(data);
}));

// POST /campaigns/:id/activate — activate a draft campaign
router.post('/campaigns/:id/activate', authenticate, requirePermission('attestation.record.manage'), validate({ body: createActivateBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId! || req.user!.id;
  const authResult = await evaluateLifecycleTransition(tenantId, userId, {
    moduleCode: 'compliance', entityType: 'attestation_campaign', entityId: req.params.id,
    fromState: 'draft', toState: 'active',
    permissionCode: 'attestation.record.manage', userRoles: req.user!.roles || [req.user!.role_code || req.user!.role],
  });
  if (!authResult.allowed) { res.status(403).json({ error: 'Lifecycle transition denied', reason: authResult.reason }); return; }
  await activateCampaign(tenantId, req.params.id);
  setAuditData(res as any, { action: 'update', entityType: 'attestation_campaign', entityId: req.params.id, afterState: { status: 'active' } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: 'compliance', event: 'updated', entityType: 'attestation_campaign', entityId: req.params.id } as any)), { tenantId: tenantId, operation: 'grcEvent:compliance.attestation_campaign.updated' });
  res.json({ success: true });
}));

// POST /campaigns/:id/submit — submit attestation response
router.post('/campaigns/:id/submit', authenticate, requirePermission('attestation.record.write'), validate({ body: submitAttestationBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const userId = req.user?.userId || req.body.userId;
  const authResult = await evaluateLifecycleTransition(tenantId, userId, {
    moduleCode: 'compliance', entityType: 'attestation_record', entityId: req.params.id,
    fromState: 'pending', toState: 'submitted',
    permissionCode: 'attestation.record.write', userRoles: req.user?.roles || [req.user?.role_code || req.user?.role || ''],
  });
  if (!authResult.allowed) { res.status(403).json({ error: 'Lifecycle transition denied', reason: authResult.reason }); return; }
  await submitComplianceAttestation(tenantId, { campaignId: req.params.id, userId, action: req.body.action, declinedReason: req.body.declinedReason });
  setAuditData(res as any, { action: 'create', entityType: 'attestation_record', entityId: req.params.id, afterState: { action: req.body.action } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: 'compliance', event: 'created', entityType: 'attestation_record', entityId: req.params.id } as any)), { tenantId: tenantId, operation: 'grcEvent:compliance.attestation_record.created' });
  res.json({ success: true });
}));

// POST /campaigns/:id/review — review attestation submission (approve/reject)
router.post('/campaigns/:id/review', authenticate, requirePermission('attestation.record.manage'), validate({ body: reviewAttestationBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const reviewerId = req.user!.userId!;
  const toState = req.body.decision === 'approved' ? 'approved' : 'rejected';
  const authResult = await evaluateLifecycleTransition(tenantId, reviewerId, {
    moduleCode: 'compliance', entityType: 'attestation_campaign', entityId: req.params.id,
    fromState: 'submitted', toState,
    permissionCode: 'attestation.record.manage', userRoles: req.user!.roles || [req.user!.role_code || req.user!.role],
  });
  if (!authResult.allowed) { res.status(403).json({ error: 'Lifecycle transition denied', reason: authResult.reason }); return; }
  if (toState === 'approved') {
    await initiateApproval(tenantId, {
      entityType: 'attestation_campaign', entityId: req.params.id,
      action: 'approve', requestedBy: reviewerId, routeId: 'compliance.attestation.approve',
    }).catch(catchHandler(EC.EVENT_BUS));
  }
  await reviewAttestationSubmission(tenantId, req.params.id, reviewerId, req.body.decision);
  setAuditData(res as any, { action: 'update', entityType: 'attestation_campaign', entityId: req.params.id, afterState: { decision: req.body.decision } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: reviewerId, module: 'compliance', event: 'updated', entityType: 'attestation_campaign', entityId: req.params.id } as any)), { tenantId: tenantId, operation: 'grcEvent:compliance.attestation_campaign.updated' });
  res.json({ success: true });
}));

// POST /campaigns/:id/reminders — send attestation reminders
router.post('/campaigns/:id/reminders', authenticate, requirePermission('attestation.record.manage'), validate({ body: createRemindersBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const count = await sendComplianceAttestationReminders(tenantId);
  setAuditData(res as any, { action: 'update', entityType: 'attestation_campaign', entityId: req.params.id, afterState: { remindersSet: count } });
  res.json({ success: true, remindersSet: count });
}));

export default router;

