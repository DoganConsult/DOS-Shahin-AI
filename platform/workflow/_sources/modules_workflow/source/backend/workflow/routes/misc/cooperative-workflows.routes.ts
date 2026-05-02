import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
// ============================================================
// Cooperative Workflows Routes — 10 AI↔Human Workflows
// All endpoints under /api/cooperative-workflows
// ============================================================


import { authenticate, requirePermission } from '../../ports/auth.port';

// Service imports
import * as triage from '../../services/tasks/task-triage.service';
import * as coDraft from '../../../ai/services/copilot/co-drafting.service';
import * as evidenceRelay from '../../../evidence/services/core/evidence-relay.service';
import * as riskPair from '../../../risk/services/workflow/risk-pair-review.service';
import * as preScreen from '../../services/approvals/approval-prescreen.service';
import * as warRoom from '../../../incident/services/incident/incident-war-room.service';
import { calibration } from '../../ports/platform.port';
import * as auditPrep from '../../../audit/services/audit/planning/audit-prep.service';
import * as standup from '../../../ai/services/activity/agent-standup.service';
import { emitEvent } from '../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { z as _z } from 'zod';


// ── Zod Validation Schemas ──
import { asyncHandler, auditMiddleware, setAuditData, automationMiddleware, validate, moduleStack } from '../../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { createTriageGenerateBody, createTriageProposalsidResolveBody, createCodraftSessionsBody, createCodraftSessionsidResolveBody, createCodraftSessionsidFinalizeBody, createEvidencerelayStageBody, createEvidencerelayidReviewBody, createRiskpairAssessBody, createRiskpairReviewsidHumanBody, createRiskpairReviewsidDialogueBody, createRiskpairReviewsidFinalizeBody, createApprovalprescreenapprovalIdBody, createWarroomsBody, createWarroomsidClaimBody, createWarroomsidContainmentstepIdBody, createWarroomsidTimelineBody, createWarroomsidResolveBody, createNudgefeedbackBody, createCalibrationProposevendorIdBody, createCalibrationsidSubmitBody, createCalibrationsidAcceptBody, createAuditprepGenerateBody, createAuditprepChecklistsidItemsBody, createAuditprepChecklistsidItemsitemIdReadyBody, updateAuditprepChecklistsidStatusBody, createStandupGenerateBody, createStandupDigestsidAcknowledgeBody } from "../../schemas/workflow.schemas";
const router = Router();
router.use(moduleStack('workflow'));
router.use(auditMiddleware("workflows"));
router.use(automationMiddleware("workflows"));

// ── 1. Smart Task Triage ───────────────────────────────────────────────────

router.post('/triage/generate', authenticate, requirePermission("workflow.instance.write"), validate({ body: createTriageGenerateBody }), asyncHandler(async (req, res) => {
  const result = await triage.generateTriageProposals(req.tenantId!);
  setAuditData(res as any, { action: ("create" as any), entityType: "cooperative-workflow", entityId: "triage-generate", afterState: { count: result.length } });

  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.created' });
  res.json({ proposals: result, count: result.length });
}));

router.get('/triage/proposals', authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await triage.listTriageProposals(req.tenantId!, req.query.status as string);
  res.json(result);
}));

router.post('/triage/proposals/:id/resolve', authenticate, requirePermission("workflow.instance.write"), validate({ body: createTriageProposalsidResolveBody }), asyncHandler(async (req, res) => {
  await triage.resolveTriageProposal(req.tenantId!, req.params.id, {
  ...req.body, resolvedBy: req.userId!,
  });
  setAuditData(res as any, { action: ("update" as any), entityType: "cooperative-workflow", entityId: req.params.id, afterState: { resolved: true } });

  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.created' });
  res.json({ success: true });
}));


// ── 2. Co-Drafting ─────────────────────────────────────────────────────────

router.post('/co-draft/sessions', authenticate, requirePermission("workflow.instance.write"), validate({ body: createCodraftSessionsBody }), asyncHandler(async (req, res) => {
  const result = await coDraft.startCoDraftSession(req.tenantId!, {
  ...req.body, humanUserId: req.userId!,
  });

  setAuditData(res as any, { action: ("create" as any), entityType: "cooperative-workflow", entityId: (result as Record<string, unknown>)?.id || "co-draft-session", afterState: result });

  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.created' });
  res.status(201).json(result);
}));

router.get('/co-draft/sessions', authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await coDraft.listSessions(req.tenantId!, req.query.userId as string);
  res.json(result);
}));

router.get('/co-draft/sessions/:id', authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await coDraft.getSession(req.tenantId!, req.params.id);
  res.json(result);
}));

router.post('/co-draft/sessions/:id/resolve', authenticate, requirePermission("workflow.instance.write"), validate({ body: createCodraftSessionsidResolveBody }), asyncHandler(async (req, res) => {
  const result = await coDraft.resolveQuestion(req.tenantId!, req.params.id, {
  ...req.body, resolvedBy: req.userId!,
  });
  setAuditData(res as any, { action: ("update" as any), entityType: "cooperative-workflow", entityId: req.params.id, afterState: result });

  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.created' });
  res.json(result);
}));

router.post('/co-draft/sessions/:id/finalize', authenticate, requirePermission("workflow.instance.write"), validate({ body: createCodraftSessionsidFinalizeBody }), asyncHandler(async (req, res) => {
  const result = await coDraft.finalizeSession(req.tenantId!, req.params.id, req.userId!);
  setAuditData(res as any, { action: ("update" as any), entityType: "cooperative-workflow", entityId: req.params.id, afterState: result });

  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.created' });
  res.json(result);
}));

// ── 3. Evidence Relay ──────────────────────────────────────────────────────

router.post('/evidence-relay/stage', authenticate, requirePermission("workflow.instance.write"), validate({ body: createEvidencerelayStageBody }), asyncHandler(async (req, res) => {
  const result = await evidenceRelay.stageEvidence(req.tenantId!, req.body.items || []);
  setAuditData(res as any, { action: ("create" as any), entityType: "cooperative-workflow", entityId: "evidence-relay-stage", afterState: result });

  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.created' });
  res.status(201).json(result);
}));

router.get('/evidence-relay/queue', authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await evidenceRelay.listRelayQueue(req.tenantId!, req.query.status as string);
  res.json(result);
}));

router.post('/evidence-relay/:id/review', authenticate, requirePermission("workflow.instance.write"), validate({ body: createEvidencerelayidReviewBody }), asyncHandler(async (req, res) => {
  const result = await evidenceRelay.reviewRelayItem(req.tenantId!, req.params.id, {
  ...req.body, reviewedBy: req.userId!,
  });
  setAuditData(res as any, { action: ("update" as any), entityType: "cooperative-workflow", entityId: req.params.id, afterState: result });

  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.created' });
  res.json(result);
}));

// ── 4. Risk Pair Review ────────────────────────────────────────────────────

router.post('/risk-pair/assess', authenticate, requirePermission("workflow.instance.write"), validate({ body: createRiskpairAssessBody }), asyncHandler(async (req, res) => {
  const result = await riskPair.createAgentAssessment(req.tenantId!, req.body);

  setAuditData(res as any, { action: ("create" as any), entityType: "cooperative-workflow", entityId: (result as Record<string, unknown>)?.id || "risk-pair-assess", afterState: result });

  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.created' });
  res.status(201).json(result);
}));

router.get('/risk-pair/reviews', authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await riskPair.listReviews(req.tenantId!, req.query.status as string);
  res.json(result);
}));

router.get('/risk-pair/reviews/:id', authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await riskPair.getReview(req.tenantId!, req.params.id);
  res.json(result);
}));

router.post('/risk-pair/reviews/:id/human', authenticate, requirePermission("workflow.instance.write"), validate({ body: createRiskpairReviewsidHumanBody }), asyncHandler(async (req, res) => {
  const result = await riskPair.submitHumanAssessment(req.tenantId!, req.params.id, {
  ...req.body, userId: req.userId!,
  });
  setAuditData(res as any, { action: ("update" as any), entityType: "cooperative-workflow", entityId: req.params.id, afterState: result });

  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.created' });
  res.json(result);
}));

router.post('/risk-pair/reviews/:id/dialogue', authenticate, requirePermission("workflow.instance.write"), validate({ body: createRiskpairReviewsidDialogueBody }), asyncHandler(async (req, res) => {
  const result = await riskPair.addDialogueEntry(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: ("create" as any), entityType: "cooperative-workflow", entityId: req.params.id, afterState: result });

  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.created' });
  res.json(result);
}));

router.post('/risk-pair/reviews/:id/finalize', authenticate, requirePermission("workflow.instance.write"), validate({ body: createRiskpairReviewsidFinalizeBody }), asyncHandler(async (req, res) => {
  const result = await riskPair.finalizeReview(req.tenantId!, req.params.id, {
  ...req.body, userId: req.userId!,
  });
  setAuditData(res as any, { action: ("update" as any), entityType: "cooperative-workflow", entityId: req.params.id, afterState: result });

  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.created' });
  res.json(result);
}));

// ── 5. Approval Pre-Screening ──────────────────────────────────────────────

router.post('/approval-prescreen/:approvalId', authenticate, requirePermission("workflow.instance.write"), validate({ body: createApprovalprescreenapprovalIdBody }), asyncHandler(async (req, res) => {
  const result = await preScreen.preScreenApproval(req.tenantId!, req.params.approvalId);
  setAuditData(res as any, { action: ("create" as any), entityType: "cooperative-workflow", entityId: req.params.approvalId, afterState: result });

  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.created' });
  res.status(201).json(result);
}));

router.get('/approval-prescreen/:approvalId', authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await preScreen.getPreScreen(req.tenantId!, req.params.approvalId);
  res.json(result || { message: 'No pre-screen available' });
}));

router.get('/approval-prescreens', authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await preScreen.listPreScreens(req.tenantId!);
  res.json(result);
}));


// ── 6. Incident War Room ──────────────────────────────────────────────────

router.post('/war-rooms', authenticate, requirePermission("workflow.instance.write"), validate({ body: createWarroomsBody }), asyncHandler(async (req, res) => {
  const result = await warRoom.createWarRoom(req.tenantId!, req.body);

  setAuditData(res as any, { action: ("create" as any), entityType: "cooperative-workflow", entityId: (result as Record<string, unknown>)?.id || "war-room", afterState: result });

  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.created' });
  res.status(201).json(result);
}));

router.get('/war-rooms', authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await warRoom.listWarRooms(req.tenantId!, req.query.status as string);
  res.json(result);
}));

router.get('/war-rooms/:id', authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await warRoom.getWarRoom(req.tenantId!, req.params.id);
  res.json(result);
}));

router.post('/war-rooms/:id/claim', authenticate, requirePermission("workflow.instance.write"), validate({ body: createWarroomsidClaimBody }), asyncHandler(async (req, res) => {
  const result = await warRoom.claimWarRoomTask(req.tenantId!, req.params.id, req.userId!);
  setAuditData(res as any, { action: ("update" as any), entityType: "cooperative-workflow", entityId: req.params.id, afterState: result });

  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.created' });
  res.json(result);
}));

router.post('/war-rooms/:id/containment/:stepId', authenticate, requirePermission("workflow.instance.write"), validate({ body: createWarroomsidContainmentstepIdBody }), asyncHandler(async (req, res) => {
  const result = await warRoom.updateContainmentStep(req.tenantId!, req.params.id, req.params.stepId, {
  ...req.body, userId: req.userId!,
  });
  setAuditData(res as any, { action: ("update" as any), entityType: "cooperative-workflow", entityId: req.params.stepId, afterState: result });

  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.created' });
  res.json(result);
}));

router.post('/war-rooms/:id/timeline', authenticate, requirePermission("workflow.instance.write"), validate({ body: createWarroomsidTimelineBody }), asyncHandler(async (req, res) => {
  const result = await warRoom.addTimelineEvent(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: ("create" as any), entityType: "cooperative-workflow", entityId: req.params.id, afterState: result });

  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.created' });
  res.json(result);
}));

router.post('/war-rooms/:id/resolve', authenticate, requirePermission("workflow.instance.write"), validate({ body: createWarroomsidResolveBody }), asyncHandler(async (req, res) => {
  const result = await warRoom.resolveWarRoom(req.tenantId!, req.params.id, req.userId!);
  setAuditData(res as any, { action: ("update" as any), entityType: "cooperative-workflow", entityId: req.params.id, afterState: result });

  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.created' });
  res.json(result);
}));

// ── 7. Nudge Negotiation ──────────────────────────────────────────────────

router.post('/nudge-feedback', authenticate, requirePermission("workflow.instance.write"), validate({ body: createNudgefeedbackBody }), asyncHandler(async (req, res) => {

  const result = await nudgeNeg.submitNudgeFeedback(req.tenantId, {
  ...req.body, userId: req.userId!,
  });

  setAuditData(res as any, { action: ("create" as any), entityType: "cooperative-workflow", entityId: (result as Record<string, unknown>)?.id || "nudge-feedback", afterState: result });

  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.created' });
  res.status(201).json(result);
}));

router.get('/nudge-feedback', authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {

  const result = await nudgeNeg.getNudgeFeedbackHistory(req.tenantId, req.query.userId as string);
  res.json(result);
}));

// ── 8. Vendor Score Calibration ────────────────────────────────────────────

router.post('/calibration/propose/:vendorId', authenticate, requirePermission("workflow.instance.write"), validate({ body: createCalibrationProposevendorIdBody }), asyncHandler(async (req, res) => {

  const result = await calibration.proposeCalibration(req.tenantId, req.params.vendorId);
  setAuditData(res as any, { action: ("create" as any), entityType: "cooperative-workflow", entityId: req.params.vendorId, afterState: result });

  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.created' });
  res.status(201).json(result);
}));

router.get('/calibrations', authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {

  const result = await calibration.listCalibrations(req.tenantId, req.query.vendorId as string);
  res.json(result);
}));

router.get('/calibrations/:id', authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {

  const result = await calibration.getCalibration(req.tenantId, req.params.id);
  res.json(result);
}));

router.post('/calibrations/:id/submit', authenticate, requirePermission("workflow.instance.write"), validate({ body: createCalibrationsidSubmitBody }), asyncHandler(async (req, res) => {

  const result = await calibration.submitCalibration(req.tenantId, req.params.id, {
  ...req.body, calibratedBy: req.userId!,
  });
  setAuditData(res as any, { action: ("update" as any), entityType: "cooperative-workflow", entityId: req.params.id, afterState: result });

  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.created' });
  res.json(result);
}));

router.post('/calibrations/:id/accept', authenticate, requirePermission("workflow.instance.write"), validate({ body: createCalibrationsidAcceptBody }), asyncHandler(async (req, res) => {

  const result = await calibration.acceptCalibration(req.tenantId, req.params.id, req.userId!);
  setAuditData(res as any, { action: ("update" as any), entityType: "cooperative-workflow", entityId: req.params.id, afterState: result });

  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.created' });
  res.json(result);
}));

// ── 9. Audit Prep ──────────────────────────────────────────────────────────

router.post('/audit-prep/generate', authenticate, requirePermission("workflow.instance.write"), validate({ body: createAuditprepGenerateBody }), asyncHandler(async (req, res) => {
  const result = await auditPrep.generateChecklist(req.tenantId!, {
  ...req.body, auditTeamLeadId: req.userId!,
  });

  setAuditData(res as any, { action: ("create" as any), entityType: "cooperative-workflow", entityId: (result as Record<string, unknown>)?.id || "audit-prep", afterState: result });

  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.created' });
  res.status(201).json(result);
}));

router.get('/audit-prep/checklists', authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await auditPrep.listChecklists(req.tenantId!);
  res.json(result);
}));

router.get('/audit-prep/checklists/:id', authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await auditPrep.getChecklist(req.tenantId!, req.params.id);
  res.json(result);
}));

router.post('/audit-prep/checklists/:id/items', authenticate, requirePermission("workflow.instance.write"), validate({ body: createAuditprepChecklistsidItemsBody }), asyncHandler(async (req, res) => {
  const result = await auditPrep.addHumanItem(req.tenantId!, req.params.id, {
  ...req.body, userId: req.userId!,
  });
  setAuditData(res as any, { action: ("create" as any), entityType: "cooperative-workflow", entityId: req.params.id, afterState: result });

  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.created' });
  res.json(result);
}));

router.post('/audit-prep/checklists/:id/items/:itemId/ready', authenticate, requirePermission("workflow.instance.write"), validate({ body: createAuditprepChecklistsidItemsitemIdReadyBody }), asyncHandler(async (req, res) => {
  const result = await auditPrep.markItemReady(req.tenantId!, req.params.id, req.params.itemId, req.userId!);
  setAuditData(res as any, { action: ("update" as any), entityType: "cooperative-workflow", entityId: req.params.itemId, afterState: result });

  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.created' });
  res.json(result);
}));

router.put('/audit-prep/checklists/:id/status', authenticate, requirePermission("workflow.instance.write"), validate({ body: updateAuditprepChecklistsidStatusBody }), asyncHandler(async (req, res) => {
  const result = await auditPrep.updateChecklistStatus(req.tenantId!, req.params.id, req.body.status, req.userId!);
  setAuditData(res as any, { action: ("update" as any), entityType: "cooperative-workflow", entityId: req.params.id, afterState: result });

  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'updated', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.updated' });
  res.json(result);
}));

// ── 10. Agent Standup ──────────────────────────────────────────────────────

router.post('/standup/generate', authenticate, requirePermission("workflow.instance.write"), validate({ body: createStandupGenerateBody }), asyncHandler(async (req, res) => {
  const result = await standup.generateStandupDigest(req.tenantId!);

  setAuditData(res as any, { action: ("create" as any), entityType: "cooperative-workflow", entityId: (result as Record<string, unknown>)?.id || "standup-digest", afterState: result });

  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.created' });
  res.status(201).json(result);
}));

router.get('/standup/digests', authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await standup.listDigests(req.tenantId!);
  res.json(result);
}));

router.get('/standup/digests/:id', authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await standup.getDigest(req.tenantId!, req.params.id);
  res.json(result);
}));

router.post('/standup/digests/:id/acknowledge', authenticate, requirePermission("workflow.instance.write"), validate({ body: createStandupDigestsidAcknowledgeBody }), asyncHandler(async (req, res) => {
  const result = await standup.acknowledgeDigest(req.tenantId!, req.params.id, {
  userId: req.userId!, priorities: req.body.priorities,
  });
  setAuditData(res as any, { action: ("update" as any), entityType: "cooperative-workflow", entityId: req.params.id, afterState: result });

  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.created' });
  res.json(result);
}));

router.get('/standup/priorities', authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await standup.getLatestPriorities(req.tenantId!);
  res.json({ priorities: result });
}));

router.get('/triage-proposals', authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await triage.listTriageProposals(req.tenantId!, req.query.status as string);
  res.json(result);
}));

router.post('/triage-proposals/:id/resolve', authenticate, requirePermission("workflow.instance.write"), validate({ body: createTriageProposalsidResolveBody }), asyncHandler(async (req, res) => {
  await triage.resolveTriageProposal(req.tenantId!, req.params.id, {
    ...req.body, resolvedBy: req.userId!,
  });
  setAuditData(res as any, { action: ("update" as any), entityType: "cooperative-workflow", entityId: req.params.id, afterState: { resolved: true } });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'updated', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.updated' });
  res.json({ message: 'Triage proposal resolved' });
}));

router.get('/co-draft-sessions', authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await coDraft.listSessions(req.tenantId!, req.query.userId as string);
  res.json(result);
}));

router.get('/co-draft-sessions/:id', authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await coDraft.getSession(req.tenantId!, req.params.id);
  res.json(result);
}));

router.post('/co-draft-sessions/:id/resolve-question', authenticate, requirePermission("workflow.instance.write"), validate({ body: createCodraftSessionsidResolveBody }), asyncHandler(async (req, res) => {
  await coDraft.resolveQuestion(req.tenantId!, req.params.id, {
    ...req.body,
    resolvedBy: req.userId!,
    answer: (req.body as any)?.answer,
  });
  setAuditData(res as any, { action: ("update" as any), entityType: "cooperative-workflow", entityId: req.params.id, afterState: { resolved: true } });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'updated', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.updated' });
  res.json({ message: 'Co-draft question resolved' });
}));

router.post('/co-draft-sessions/:id/finalize', authenticate, requirePermission("workflow.instance.write"), validate({ body: createCodraftSessionsidFinalizeBody }), asyncHandler(async (req, res) => {
  const result = await coDraft.finalizeSession(req.tenantId!, req.params.id, req.userId!);
  setAuditData(res as any, { action: ("update" as any), entityType: "cooperative-workflow", entityId: req.params.id, afterState: { status: 'finalized' } });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'updated', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.updated' });
  res.json({ message: 'Co-draft session finalized', session: result });
}));

router.get('/evidence-relay-queue', authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await evidenceRelay.listRelayQueue(req.tenantId!, req.query.status as string);
  res.json(result);
}));

router.post('/evidence-relay-queue/:id/review', authenticate, requirePermission("workflow.instance.write"), validate({ body: createEvidencerelayidReviewBody }), asyncHandler(async (req, res) => {
  const result = await evidenceRelay.reviewRelayItem(req.tenantId!, req.params.id, {
    ...req.body, reviewedBy: req.userId!,
  });
  setAuditData(res as any, { action: ("update" as any), entityType: "cooperative-workflow", entityId: req.params.id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'updated', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.updated' });
  res.json({ message: 'Evidence relay item reviewed', item: result });
}));

router.get('/risk-pair-reviews', authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await riskPair.listReviews(req.tenantId!, req.query.status as string);
  res.json(result);
}));

router.get('/risk-pair-reviews/:id', authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await riskPair.getReview(req.tenantId!, req.params.id);
  res.json(result);
}));

router.post('/risk-pair-reviews/:id/human-assessment', authenticate, requirePermission("workflow.instance.write"), validate({ body: createRiskpairReviewsidHumanBody }), asyncHandler(async (req, res) => {
  const result = await riskPair.submitHumanAssessment(req.tenantId!, req.params.id, {
    ...req.body, userId: req.userId!,
  });
  setAuditData(res as any, { action: ("update" as any), entityType: "cooperative-workflow", entityId: req.params.id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'updated', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.updated' });
  res.json({ message: 'Human assessment submitted', review: result });
}));

router.post('/risk-pair-reviews/:id/finalize', authenticate, requirePermission("workflow.instance.write"), validate({ body: createRiskpairReviewsidFinalizeBody }), asyncHandler(async (req, res) => {
  const result = await riskPair.finalizeReview(req.tenantId!, req.params.id, {
    ...req.body, userId: req.userId!,
  });
  setAuditData(res as any, { action: ("update" as any), entityType: "cooperative-workflow", entityId: req.params.id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'updated', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.updated' });
  res.json({ message: 'Risk pair review finalized', review: result });
}));

router.get('/approval-pre-screens', authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await preScreen.listPreScreens(req.tenantId!);
  res.json(result);
}));

router.get('/approval-pre-screens/:approvalId', authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await preScreen.getPreScreen(req.tenantId!, req.params.approvalId);
  res.json(result || { message: 'No pre-screen available' });
}));

router.post('/approval-pre-screens/:approvalId/run', authenticate, requirePermission("workflow.instance.write"), validate({ body: createApprovalprescreenapprovalIdBody }), asyncHandler(async (req, res) => {
  const result = await preScreen.preScreenApproval(req.tenantId!, req.params.approvalId);
  setAuditData(res as any, { action: ("create" as any), entityType: "cooperative-workflow", entityId: req.params.approvalId, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'cooperative_workflows', entityId: req.params.approvalId || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.created' });
  res.json(result);
}));

router.get('/audit-prep-checklists', authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await auditPrep.listChecklists(req.tenantId!);
  res.json(result);
}));

router.get('/audit-prep-checklists/:id', authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await auditPrep.getChecklist(req.tenantId!, req.params.id);
  res.json(result);
}));

router.post('/audit-prep-checklists/:id/items', authenticate, requirePermission("workflow.instance.write"), validate({ body: createAuditprepChecklistsidItemsBody }), asyncHandler(async (req, res) => {
  const result = await auditPrep.addHumanItem(req.tenantId!, req.params.id, {
    ...req.body, userId: req.userId!,
  });
  setAuditData(res as any, { action: ("create" as any), entityType: "cooperative-workflow", entityId: req.params.id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.created' });
  res.json({ message: 'Audit prep item added', checklist: result });
}));

router.post('/audit-prep-checklists/:checklistId/items/:itemId/ready', authenticate, requirePermission("workflow.instance.write"), validate({ body: createAuditprepChecklistsidItemsitemIdReadyBody }), asyncHandler(async (req, res) => {
  const result = await auditPrep.markItemReady(req.tenantId!, req.params.checklistId, req.params.itemId, req.userId!);
  setAuditData(res as any, { action: ("update" as any), entityType: "cooperative-workflow", entityId: req.params.itemId, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'updated', entityType: 'cooperative_workflows', entityId: req.params.checklistId || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.updated' });
  res.json({ message: 'Audit prep item marked ready', checklist: result });
}));

router.patch('/audit-prep-checklists/:id', authenticate, requirePermission("workflow.instance.write"), validate({ body: updateAuditprepChecklistsidStatusBody }), asyncHandler(async (req, res) => {
  const result = await auditPrep.updateChecklistStatus(req.tenantId!, req.params.id, req.body.status, req.userId!);
  setAuditData(res as any, { action: ("update" as any), entityType: "cooperative-workflow", entityId: req.params.id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'updated', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.updated' });
  res.json({ message: 'Audit prep status updated', checklist: result });
}));

router.get('/standup-digests', authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await standup.listDigests(req.tenantId!);
  res.json(result);
}));

router.get('/standup-digests/:id', authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await standup.getDigest(req.tenantId!, req.params.id);
  res.json(result);
}));

router.post('/standup-digests/:id/acknowledge', authenticate, requirePermission("workflow.instance.write"), validate({ body: createStandupDigestsidAcknowledgeBody }), asyncHandler(async (req, res) => {
  const result = await standup.acknowledgeDigest(req.tenantId!, req.params.id, {
    userId: req.userId!, priorities: req.body.priorities,
  });
  setAuditData(res as any, { action: ("update" as any), entityType: "cooperative-workflow", entityId: req.params.id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'updated', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.updated' });
  res.json({ message: 'Standup digest acknowledged', digest: result });
}));

router.get('/score-calibrations', authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await calibration.listCalibrations(req.tenantId, req.query.vendorId as string);
  res.json(result);
}));

router.get('/score-calibrations/:id', authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await calibration.getCalibration(req.tenantId, req.params.id);
  res.json(result);
}));

router.post('/score-calibrations/:id/submit', authenticate, requirePermission("workflow.instance.write"), validate({ body: createCalibrationsidSubmitBody }), asyncHandler(async (req, res) => {
  const result = await calibration.submitCalibration(req.tenantId, req.params.id, {
    ...req.body, calibratedBy: req.userId!,
  });
  setAuditData(res as any, { action: ("update" as any), entityType: "cooperative-workflow", entityId: req.params.id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'updated', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.updated' });
  res.json({ message: 'Score calibration submitted', calibration: result });
}));

router.post('/score-calibrations/:id/accept', authenticate, requirePermission("workflow.instance.write"), validate({ body: createCalibrationsidAcceptBody }), asyncHandler(async (req, res) => {
  const result = await calibration.acceptCalibration(req.tenantId, req.params.id, req.userId!);
  setAuditData(res as any, { action: ("update" as any), entityType: "cooperative-workflow", entityId: req.params.id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'updated', entityType: 'cooperative_workflows', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.cooperative_workflows.updated' });
  res.json({ message: 'Score calibration accepted', calibration: result });
}));

export default router;
