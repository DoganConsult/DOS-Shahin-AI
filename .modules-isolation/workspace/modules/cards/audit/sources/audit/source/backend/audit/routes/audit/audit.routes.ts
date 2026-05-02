import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

// ============================================
// Shahin-Ai — Audit Routes (standardized)
// Uses route-kit: asyncHandler, ok, action,
// NotFoundError, validate, Zod schemas
// ============================================
import { authenticate, requirePermission } from '../../ports/auth.port';
import {
  getAuditOverview,
  getEngagements, getEngagementById, createEngagement, updateEngagement,
  updateEngagementStatus, deleteEngagement,
  getAuditPlans, getAuditPlanById, createAuditPlan, updateAuditPlan,
  updateAuditPlanStatus, deleteAuditPlan,
  getFindings, getFindingById, createFinding, updateFinding, deleteFinding,
  getRootCauses, addRootCause,
  getImpacts, addImpact,
  getCapaPlans, getCapaPlanById, createCapaPlan, updateCapaPlan,
  getClosureReviews, createClosureReview,
  collectEvidence,
  generateReport,
  linkCapaToRiskTreatment, getAvailableRiskTreatments,
} from '../../services/audit/core/audit.service';
import { emitEvent } from '../../ports/events.port';
import { createProcessTask as _createProcessTask } from '../../ports/lifecycle.port';
import { validate, ok, action, NotFoundError } from "../../../../utils/route-kit";

import { asyncHandler, requireOwnership, auditMiddleware, setAuditData, automationMiddleware, enforceMandatoryFields, enforceStageGates, lifecycleGate, lifecycleStatusEndpoint, moduleStack } from '../../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { createPlanBody, idParam, createEngagementBody, statusBody, createFindingBody, createRootCauseBody, createImpactBody, createCapaBody, linkTreatmentBody, closureReviewBody, collectEvidenceBody } from '../../schemas/audit.schemas';

const router = Router();
router.use(moduleStack('audit'));
router.use(auditMiddleware("audit"));
router.use(automationMiddleware("audit"));
router.use(enforceMandatoryFields("audit"));
router.use(enforceStageGates("audit"));

// ── Zod Schemas ──────────────────────────────────────────────────────
// ── Overview KPIs ───────────────────────────────────────────────────

/**
 * @swagger
 * /audit/overview:
 *   get:
 *     summary: Get audit program KPIs and overview statistics
 *     tags: [Audit]
 *     responses:
 *       200:
 *         description: Audit overview with engagement counts, finding stats, plan coverage
 */
router.get("/overview", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  res.json(ok(await getAuditOverview(req.tenantId!), req));
}));

// ── Engagements ─────────────────────────────────────────────────────

/**
 * @swagger
 * /audit/engagements:
 *   get:
 *     summary: List all audit engagements
 *     tags: [Audit]
 *     responses:
 *       200:
 *         description: Audit engagement list
 */
router.get("/engagements", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const engagements = await getEngagements(req.tenantId!, user ? { userId: user.userId, role: user.role } : undefined);
  res.json(ok(engagements, req));
}));

router.get("/engagements/:id", authenticate, requirePermission("audit.record.read"), validate({ params: idParam }), asyncHandler(async (req: Request, res: Response) => {
  const engagement = await getEngagementById(req.tenantId!, req.params.id);
  if (!engagement) throw new NotFoundError('engagement', req.params.id);
  res.json(ok(engagement, req));
}));

/**
 * @swagger
 * /audit/engagements:
 *   post:
 *     summary: Create a new audit engagement
 *     tags: [Audit]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuditEngagement'
 *     responses:
 *       201:
 *         description: Engagement created
 */
router.post("/engagements", authenticate, requirePermission("audit.record.manage"), validate({ body: createEngagementBody }), asyncHandler(async (req: Request, res: Response) => {
  const engagement = await createEngagement(req.tenantId!, req.body);
  setAuditData(res as any, { action: "create", entityType: "audit", entityId: engagement.audit_id, afterState: engagement });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'created', entityType: 'audit', entityId: engagement.audit_id, data: engagement } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit.created' });
  res.status(201).json(ok(engagement, req));
}));

router.put("/engagements/:id", authenticate, requirePermission("audit.record.manage"), validate({ params: idParam }), lifecycleGate('audit'), asyncHandler(async (req: Request, res: Response) => {
  const engagement = await updateEngagement(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: "update", entityType: "audit", entityId: req.params.id, afterState: engagement });
  res.json(ok(engagement, req));
}));

router.put("/engagements/:id/status", authenticate, requirePermission("audit.record.manage"), validate({ params: idParam, body: statusBody }), lifecycleStatusEndpoint('audit'), asyncHandler(async (req: Request, res: Response) => {
  const engagement = await updateEngagementStatus(req.tenantId!, req.params.id, req.body.status);
  setAuditData(res as any, { action: "update", entityType: "audit", entityId: req.params.id, afterState: engagement });
  res.json(ok(engagement, req));
}));

router.delete("/engagements/:id", authenticate, requirePermission("audit.record.manage"), validate({ params: idParam }), asyncHandler(async (req: Request, res: Response) => {
  const deleted = await deleteEngagement(req.tenantId!, req.params.id);
  if (!deleted) throw new NotFoundError('engagement', req.params.id);
  setAuditData(res as any, { action: "delete", entityType: "audit", entityId: req.params.id });
  res.json(action('Engagement deleted', req));
}));

// ── Audit Plans ─────────────────────────────────────────────────────

router.get("/plans", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  res.json(ok(await getAuditPlans(req.tenantId!), req));
}));

router.get("/plans/:id", authenticate, requirePermission("audit.record.read"), validate({ params: idParam }), asyncHandler(async (req: Request, res: Response) => {
  const plan = await getAuditPlanById(req.tenantId!, req.params.id);
  if (!plan) throw new NotFoundError('audit_plan', req.params.id);
  res.json(ok(plan, req));
}));

router.post("/plans", authenticate, requirePermission("audit.record.manage"), validate({ body: createPlanBody }), asyncHandler(async (req: Request, res: Response) => {
  const plan = await createAuditPlan(req.tenantId!, { ...req.body, createdBy: req.user?.userId });
  setAuditData(res as any, { action: "create", entityType: "audit_plan", entityId: plan.audit_id, afterState: plan });
  res.status(201).json(ok(plan, req));
}));

router.put("/plans/:id", authenticate, requirePermission("audit.record.manage"), validate({ params: idParam }), asyncHandler(async (req: Request, res: Response) => {
  const plan = await updateAuditPlan(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: "update", entityType: "audit_plan", entityId: req.params.id, afterState: plan });
  res.json(ok(plan, req));
}));

router.put("/plans/:id/status", authenticate, requirePermission("audit.record.manage"), validate({ params: idParam, body: statusBody }), lifecycleStatusEndpoint('audit'), asyncHandler(async (req: Request, res: Response) => {
  const plan = await updateAuditPlanStatus(req.tenantId!, req.params.id, req.body.status);
  setAuditData(res as any, { action: "update", entityType: "audit_plan", entityId: req.params.id, afterState: plan });
  res.json(ok(plan, req));
}));

router.delete("/plans/:id", authenticate, requirePermission("audit.record.manage"), validate({ params: idParam }), asyncHandler(async (req: Request, res: Response) => {
  const deleted = await deleteAuditPlan(req.tenantId!, req.params.id);
  if (!deleted) throw new NotFoundError('audit_plan', req.params.id);
  setAuditData(res as any, { action: "delete", entityType: "audit_plan", entityId: req.params.id });
  res.json(action('Audit plan deleted', req));
}));

// ── Findings ────────────────────────────────────────────────────────

/**
 * @swagger
 * /audit/findings:
 *   get:
 *     summary: List all audit findings
 *     tags: [Audit]
 *     responses:
 *       200:
 *         description: Finding list with severity and status
 */
router.get("/findings", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const findings = await getFindings(req.tenantId!, req.query.auditId as string | undefined);
  res.json(ok(findings, req));
}));

router.get("/findings/:id", authenticate, requirePermission("audit.record.read"), validate({ params: idParam }), asyncHandler(async (req: Request, res: Response) => {
  const finding = await getFindingById(req.tenantId!, req.params.id);
  if (!finding) throw new NotFoundError('finding', req.params.id);
  res.json(ok(finding, req));
}));

router.post("/findings", authenticate, requirePermission("audit.record.manage"), validate({ body: createFindingBody }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  const finding = await createFinding(tenantId, req.body, req.user?.userId);
  setAuditData(res as any, { action: "create", entityType: "audit_finding", entityId: finding.finding_id, afterState: finding });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: 'audit', event: 'created', entityType: 'audit_finding', entityId: finding.finding_id, data: finding } as any)), { tenantId: tenantId, operation: 'grcEvent:audit.audit_finding.created' });

  // NOTE: Remediation task creation is handled by audit-hub cross-module subscriber
  // via the audit.finding_created event (risk + remediation + workflow + evidence cascade).
  // Do NOT duplicate here — see audit-hub.ts:registerAuditHub().

  res.status(201).json(ok(finding, req));
}));

// Backward compat: POST /plans/:id/findings
router.post("/plans/:id/findings", authenticate, requirePermission("audit.record.manage"), validate({ params: idParam, body: createFindingBody }), asyncHandler(async (req: Request, res: Response) => {
  const finding = await createFinding(req.tenantId!, { ...req.body, source_type: 'audit', source_id: req.params.id }, req.user?.userId);
  setAuditData(res as any, { action: "create", entityType: "audit_finding", entityId: finding.finding_id, afterState: finding });
  res.status(201).json(ok(finding, req));
}));

router.put("/findings/:id", authenticate, requirePermission("audit.record.manage"), validate({ params: idParam }), requireOwnership("finding"), lifecycleGate('audit'), asyncHandler(async (req: Request, res: Response) => {
  const finding = await updateFinding(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: "update", entityType: "audit_finding", entityId: req.params.id, afterState: finding });
  const findEvt = req.body.status === 'resolved' || req.body.status === 'closed' ? 'resolved' : 'updated';
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: findEvt, entityType: 'audit_finding', entityId: req.params.id, data: finding } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_finding.any' });
  res.json(ok(finding, req));
}));

router.delete("/findings/:id", authenticate, requirePermission("audit.record.manage"), validate({ params: idParam }), requireOwnership("finding"), asyncHandler(async (req: Request, res: Response) => {
  const deleted = await deleteFinding(req.tenantId!, req.params.id);
  if (!deleted) throw new NotFoundError('finding', req.params.id);
  setAuditData(res as any, { action: "delete", entityType: "audit_finding", entityId: req.params.id });
  res.json(action('Finding deleted', req));
}));

// ── Root Causes ─────────────────────────────────────────────────────

router.get("/findings/:id/root-causes", authenticate, requirePermission("audit.record.read"), validate({ params: idParam }), asyncHandler(async (req: Request, res: Response) => {
  res.json(ok(await getRootCauses(req.tenantId!, req.params.id), req));
}));

router.post("/findings/:id/root-causes", authenticate, requirePermission("audit.record.manage"), validate({ params: idParam, body: createRootCauseBody }), asyncHandler(async (req: Request, res: Response) => {
  const cause = await addRootCause(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: "create", entityType: "finding_root_cause", entityId: cause.root_cause_id, afterState: cause });
  res.status(201).json(ok(cause, req));
}));

// ── Impacts ─────────────────────────────────────────────────────────

router.get("/findings/:id/impacts", authenticate, requirePermission("audit.record.read"), validate({ params: idParam }), asyncHandler(async (req: Request, res: Response) => {
  res.json(ok(await getImpacts(req.tenantId!, req.params.id), req));
}));

router.post("/findings/:id/impacts", authenticate, requirePermission("audit.record.manage"), validate({ params: idParam, body: createImpactBody }), asyncHandler(async (req: Request, res: Response) => {
  const impact = await addImpact(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: "create", entityType: "finding_impact", entityId: impact.impact_id, afterState: impact });
  res.status(201).json(ok(impact, req));
}));

// ── CAPA ────────────────────────────────────────────────────────────

router.get("/capa", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  res.json(ok(await getCapaPlans(req.tenantId!), req));
}));

router.get("/capa/:id", authenticate, requirePermission("audit.record.read"), validate({ params: idParam }), asyncHandler(async (req: Request, res: Response) => {
  const plan = await getCapaPlanById(req.tenantId!, req.params.id);
  if (!plan) throw new NotFoundError('capa_plan', req.params.id);
  res.json(ok(plan, req));
}));

router.post("/capa", authenticate, requirePermission("audit.record.manage"), validate({ body: createCapaBody }), asyncHandler(async (req: Request, res: Response) => {
  const plan = await createCapaPlan(req.tenantId!, req.body);
  setAuditData(res as any, { action: "create", entityType: "remediation_plan", entityId: plan.plan_id, afterState: plan });
  res.status(201).json(ok(plan, req));
}));

router.put("/capa/:id", authenticate, requirePermission("audit.record.manage"), validate({ params: idParam }), asyncHandler(async (req: Request, res: Response) => {
  const plan = await updateCapaPlan(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: "update", entityType: "remediation_plan", entityId: req.params.id, afterState: plan });
  res.json(ok(plan, req));
}));

// ── CAPA ↔ Risk Treatments ──────────────────────────────────────────

router.post("/capa/:id/link-treatment", authenticate, requirePermission("audit.record.manage"), validate({ params: idParam, body: linkTreatmentBody }), asyncHandler(async (req: Request, res: Response) => {
  const result = await linkCapaToRiskTreatment(req.tenantId!, req.params.id, req.body.treatmentId);
  setAuditData(res as any, { action: "update", entityType: "remediation_plan", entityId: req.params.id, afterState: result });
  res.json(ok(result, req));
}));

router.get("/risk-treatments", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  res.json(ok(await getAvailableRiskTreatments(req.tenantId!), req));
}));

// ── Validation / Closure Reviews ────────────────────────────────────

router.get("/validation", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  res.json(ok(await getClosureReviews(req.tenantId!), req));
}));

router.post("/validation", authenticate, requirePermission("audit.record.manage"), validate({ body: closureReviewBody }), asyncHandler(async (req: Request, res: Response) => {
  const review = await createClosureReview(req.tenantId!, { ...req.body, reviewer_id: req.user?.userId });
  setAuditData(res as any, { action: "create", entityType: "closure_review", entityId: review.review_id, afterState: review });
  res.status(201).json(ok(review, req));
}));

// ── Evidence Collection (backward compat) ───────────────────────────

router.post("/evidence", authenticate, requirePermission("audit.record.manage"), validate({ body: collectEvidenceBody }), asyncHandler(async (req: Request, res: Response) => {
  const evidence = await collectEvidence(req.tenantId!, { ...req.body, submittedBy: req.user?.userId });
  setAuditData(res as any, { action: "create", entityType: "evidence", entityId: evidence.evidence_id, afterState: evidence });
  res.status(201).json(ok(evidence, req));
}));

// ── Report Generation ───────────────────────────────────────────────

router.get("/plans/:id/report", authenticate, requirePermission("audit.record.read"), validate({ params: idParam }), asyncHandler(async (req: Request, res: Response) => {
  const report = await generateReport(req.tenantId!, req.params.id);
  res.json(ok(report, req));
}));

export default router;

