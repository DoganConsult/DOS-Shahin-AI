import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../ports/auth.port';
import { emitEvent } from '../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
// cspell:ignore SAMA SDAIA createCampaignscampaignIdLaunchBody createPhishingphishingIdLaunchBody createPhishingphishingIdResultBody createCertificationscertificateIdRevokeBody createSectorpathsectorCodeAssignBody
import {
  createTrainingBody, updateTrainingBody,
  recordCompletionBody, createAssessmentBody as _createAssessmentBody, createCampaignsBody,
  createCampaignscampaignIdLaunchBody as createCampaignLaunchBody,
  createAssignmentsBody,
  createPhishingBody,
  createPhishingphishingIdLaunchBody as createPhishingLaunchBody,
  createPhishingphishingIdResultBody as createPhishingResultBody,
  createCertificationscertificateIdRevokeBody as revokeCertificationBody,
  createSectorpathsectorCodeAssignBody as assignSectorTrainingBody,
} from '../schemas/training.schemas';
import {
  getTrainingContent, createTrainingContent, updateTrainingContent,
  createCampaign, getCampaigns, launchCampaign,
  assignTraining, getAssignments, completeAssignment,
  getCertifications, revokeCertificate,
  createPhishingCampaign, getPhishingCampaigns, launchPhishingCampaign, recordPhishingResult,
  getTrainingComplianceSnapshot,
  checkOverdueAssignments, checkExpiringCertifications,
  getSectorTrainingPath, assignSectorTrainingToUser,
  getTrainingByFramework, getRegulatorTrainingStatus,
} from '../services/training-advanced.service';
import { emptyResult } from '../ports/database.port';

const createProgramsBody = createTrainingBody;
const updateProgramsBody = updateTrainingBody;
const createContentBody = createTrainingBody;
const completeAssignmentBody = recordCompletionBody;
const updateContentBody = updateTrainingBody;
import { asyncHandler, auditMiddleware, setAuditData, enforceMandatoryFields, enforceStageGates, lifecycleGate as _lifecycleGate, requireOwnership, validate, moduleStack } from '../ports/middleware.port';
import { swallowDefault, EC , catchHandler } from '@dos/platform-core/resilience';

const router = Router();
router.use(moduleStack('training'));
router.use(auditMiddleware("training"));
router.use(enforceMandatoryFields("training"));
router.use(enforceStageGates("training"));

const emit = (req: Request, event: string, entityType: string, entityId: string, data?: any) =>
  emitEvent({
    event_type: `training.${entityType}.${event}`,
    tenantId: req.tenantId!,
    userId: req.user!.userId!,
    module: 'training',
    module_code: 'training',
    event,
    entityType,
    entity_type: entityType,
    entityId,
    entity_id: entityId,
    data,
    payload: data,
    source: 'module',
  }).catch(catchHandler(EC.EVENT_BUS, {}));

router.get("/programs", authenticate, requirePermission("training.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const content = await getTrainingContent(req.tenantId!, 'program');
  res.json({ programs: content || [], count: (content || []).length });
}));

router.post("/programs", authenticate, requirePermission("training.record.write"), validate({ body: createProgramsBody }), asyncHandler(async (req, res) => {
  const c = await createTrainingContent(req.tenantId!, { ...req.body, category: 'program', author_id: req.body.author_id || req.user?.userId });
  if (!c) { res.status(500).json({ error: "Failed to create program" }); return; }
  setAuditData(res as any, { action: "create", entityType: "training_content", entityId: c.content_id, afterState: c });
  emit(req, "program_created", "training_program", c.content_id, req.body);
  res.status(201).json(c);
}));

router.put("/programs/:id", authenticate, requirePermission("training.record.write"), requireOwnership('training_content'), validate({ body: updateProgramsBody }), asyncHandler(async (req, res) => {
  const { safeQuery, tenantSchema } = await import("../../../config/database.js");
  const schema = tenantSchema(req.tenantId!);
  const sets: string[] = ["updated_at = NOW()"];
  const params: unknown[] = [req.params.id];
  let idx = 2;
  for (const key of ["title_en", "title_ar", "program_type", "target_audience", "frequency", "owner", "description", "status"]) {
  if (req.body[key] !== undefined) { sets.push(`${key} = $${idx++}`); params.push(req.body[key]); }
  }
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
  `UPDATE "${schema}".training_content SET ${sets.join(", ")} WHERE content_id = $1 RETURNING *`, params
  ), { tenantId: req.tenantId!, operation: 'update training_content' });
  const program = getFirstRow(result)!;
  if (!program) { res.status(404).json({ error: "Program not found" }); return; }
  setAuditData(res as any, { action: "update", entityType: "training_content", entityId: req.params.id, afterState: program });
  emit(req, "program_updated", "training_program", req.params.id, req.body);
  res.json(program);
}));

router.delete("/programs/:id", authenticate, requirePermission("training.record.write"), requireOwnership('training_content'), validate({ body: genericPayloadSchema }), asyncHandler(async (req, res) => {
  const { safeQuery, tenantSchema } = await import("../../../config/database.js");
  const schema = tenantSchema(req.tenantId!);
  await safeQuery(`UPDATE "${schema}".training_content SET deleted_at = NOW() WHERE content_id = $1`, [req.params.id]);
  setAuditData(res as any, { action: "delete", entityType: "training_content", entityId: req.params.id });
  emit(req, "program_deleted", "training_program", req.params.id);
  res.json({ deleted: true });
}));

router.get("/content", authenticate, requirePermission("training.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  res.json(await getTrainingContent(req.tenantId!, req.query.category as string));
}));

router.post("/content", authenticate, requirePermission("training.record.write"), validate({ body: createContentBody }), asyncHandler(async (req, res) => {
  const c = await createTrainingContent(req.tenantId!, { ...req.body, author_id: req.body.author_id || req.user?.userId });
  if (!c) { res.status(500).json({ error: "Failed to create content" }); return; }
  setAuditData(res as any, { action: "create", entityType: "training_content", entityId: c.content_id, afterState: c });
  emit(req, "content_created", "training_content", c.content_id, req.body);
  res.status(201).json(c);
}));

router.post("/campaigns", authenticate, requirePermission("training.record.write"), validate({ body: createCampaignsBody }), asyncHandler(async (req, res) => {
  const camp = await createCampaign(req.tenantId!, { ...req.body, owner_id: req.body.owner_id || req.user?.userId });
  if (!camp) { res.status(500).json({ error: "Failed to create campaign" }); return; }
  setAuditData(res as any, { action: "create", entityType: "training_campaign", entityId: camp.campaign_id, afterState: camp });
  emit(req, "campaign_created", "training_campaign", camp.campaign_id, req.body);
  res.status(201).json(camp);
}));

router.get("/campaigns", authenticate, requirePermission("training.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  res.json(await getCampaigns(req.tenantId!, req.query.status as string));
}));

router.post("/campaigns/:campaignId/launch", authenticate, requirePermission("training.record.write"), requireOwnership('training_campaign'), validate({ body: createCampaignLaunchBody }), asyncHandler(async (req, res) => {
  const c = await launchCampaign(req.tenantId!, req.params.campaignId);
  setAuditData(res as any, { action: "update", entityType: "training_campaign", entityId: req.params.campaignId, afterState: c });
  emit(req, "campaign_launched", "training_campaign", req.params.campaignId);
  res.json(c);
}));

router.post("/assignments", authenticate, requirePermission("training.record.write"), validate({ body: createAssignmentsBody }), asyncHandler(async (req, res) => {
  const a = await assignTraining(req.tenantId!, { ...req.body, assigned_by: req.body.assigned_by || req.user?.userId });
  setAuditData(res as any, { action: "create", entityType: "training_assignment", entityId: a?.assignment_id || 'duplicate', afterState: a });
  emit(req, "assignment_created", "training_assignment", a?.assignment_id || 'duplicate', req.body);
  res.status(201).json(a);
}));

router.get("/assignments", authenticate, requirePermission("training.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  res.json(await getAssignments(req.tenantId!, req.query.user_id as string, req.query.status as string));
}));

router.post("/assignments/:assignmentId/complete", authenticate, requirePermission("training.record.write"), requireOwnership('training_assignment'), validate({ body: completeAssignmentBody }), asyncHandler(async (req, res) => {
  const result = await completeAssignment(req.tenantId!, req.params.assignmentId, req.body);
  if (!result) { res.status(404).json({ error: "Assignment not found" }); return; }
  setAuditData(res as any, { action: "update", entityType: "training_assignment", entityId: req.params.assignmentId, afterState: result });
  emit(req, "assignment_completed", "training_assignment", req.params.assignmentId, { score: req.body.score, passed: result.passed });
  res.json(result);
}));

router.get("/certifications", authenticate, requirePermission("training.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  res.json(await getCertifications(req.tenantId!, req.query.user_id as string));
}));

router.post("/phishing", authenticate, requirePermission("training.record.write"), validate({ body: createPhishingBody }), asyncHandler(async (req, res) => {
  const p = await createPhishingCampaign(req.tenantId!, req.body);
  if (!p) { res.status(500).json({ error: "Failed to create phishing campaign" }); return; }
  setAuditData(res as any, { action: "create", entityType: "phishing_campaign", entityId: p.phishing_id, afterState: p });
  emit(req, "phishing_campaign_created", "phishing_campaign", p.phishing_id, req.body);
  res.status(201).json(p);
}));

router.get("/phishing", authenticate, requirePermission("training.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  res.json(await getPhishingCampaigns(req.tenantId!));
}));

router.post("/phishing/:phishingId/launch", authenticate, requirePermission("training.record.write"), requireOwnership('phishing_campaign'), validate({ body: createPhishingLaunchBody }), asyncHandler(async (req, res) => {
  const p = await launchPhishingCampaign(req.tenantId!, req.params.phishingId);
  setAuditData(res as any, { action: "update", entityType: "phishing_campaign", entityId: req.params.phishingId, afterState: p });
  emit(req, "phishing_launched", "phishing_campaign", req.params.phishingId);
  res.json(p);
}));

router.post("/phishing/:phishingId/result", authenticate, requirePermission("training.record.write"), requireOwnership('phishing_campaign'), validate({ body: createPhishingResultBody }), asyncHandler(async (req, res) => {
  const r = await recordPhishingResult(req.tenantId!, req.params.phishingId, req.body);
  if (!r) { res.status(500).json({ error: "Failed to record phishing result" }); return; }
  setAuditData(res as any, { action: "create", entityType: "phishing_user_result", entityId: r.result_id, afterState: r });
  emit(req, "phishing_result_recorded", "phishing_campaign", req.params.phishingId, req.body);
  res.status(201).json(r);
}));

router.get("/compliance-snapshot", authenticate, requirePermission("training.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  res.json(await getTrainingComplianceSnapshot(req.tenantId!));
}));

router.get("/overdue", authenticate, requirePermission("training.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  res.json(await checkOverdueAssignments(req.tenantId!));
}));

router.get("/expiring-certs", authenticate, requirePermission("training.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  res.json(await checkExpiringCertifications(req.tenantId!));
}));

// C8: Revoke a certificate
router.post("/certifications/:certificateId/revoke", authenticate, requirePermission("training.record.write"), requireOwnership('training_assignment'), validate({ body: revokeCertificationBody }), asyncHandler(async (req, res) => {
  const r = await revokeCertificate(req.tenantId!, req.params.certificateId, req.body.reason || 'Revoked by admin');
  setAuditData(res as any, { action: "update", entityType: "training_certification", entityId: req.params.certificateId, afterState: r });
  emit(req, "certification_revoked", "training_certification", req.params.certificateId);
  res.json(r);
}));

// C12: Update training content
router.put("/content/:contentId", authenticate, requirePermission("training.record.write"), requireOwnership('training_content'), validate({ body: updateContentBody }), asyncHandler(async (req, res) => {
  const r = await updateTrainingContent(req.tenantId!, req.params.contentId, req.body);
  setAuditData(res as any, { action: "update", entityType: "training_content", entityId: req.params.contentId, afterState: r });
  emit(req, "content_updated", "training_content", req.params.contentId);
  res.json(r);
}));

// ── KSA Regulatory Training Endpoints ────────────────────────────────────────

// Get sector training path (ordered list of required + recommended courses)
router.get("/sector-path/:sectorCode", authenticate, requirePermission("training.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  res.json(await getSectorTrainingPath(req.tenantId!, req.params.sectorCode));
}));

// Auto-assign sector training path to a user
router.post("/sector-path/:sectorCode/assign", authenticate, requirePermission("training.record.write"), validate({ body: assignSectorTrainingBody }), asyncHandler(async (req, res) => {
  const { userId, userRole } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const count = await assignSectorTrainingToUser(req.tenantId!, userId, req.params.sectorCode, userRole);
  emit(req, "sector_training_assigned", "training_assignment", userId, { sectorCode: req.params.sectorCode, count });
  res.json({ assigned: count, sectorCode: req.params.sectorCode });
}));

// Training compliance by framework (control-to-training mapping coverage)
router.get("/by-framework", authenticate, requirePermission("training.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  res.json(await getTrainingByFramework(req.tenantId!));
}));

// Training status by KSA regulator (NCA, SAMA, SDAIA, CMA, etc.)
router.get("/by-regulator", authenticate, requirePermission("training.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  res.json(await getRegulatorTrainingStatus(req.tenantId!));
}));

// W5: /insights — serves <app-ai-insight-panel> module='training'
import { getAiRecommendations as trainingAiRecommendations } from '../services/training-ai.service';

router.get("/insights", authenticate, requirePermission("training.record.read"), asyncHandler(async (req: Request, res: Response) => {
  const recommendations = await trainingAiRecommendations(req.tenantId!, (req.query ?? {}) as Record<string, unknown>);
  res.json({ recommendations, module: 'training', generatedAt: new Date().toISOString() });
}));

export default router;
