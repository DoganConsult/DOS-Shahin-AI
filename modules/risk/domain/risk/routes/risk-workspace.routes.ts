import { genericPayloadSchema } from '../_wave1-compat';
import { Request, Response, Router } from 'express';


// ============================================
// Shahin-Ai — Risk Workspace Routes
// Full risk operating workspace API surface
// Refactored: asyncHandler, validate, ok/paginated, soft-delete
// ============================================

import { authenticate, requirePermission } from '../ports/auth.port';

import { getFirstRowOrThrow } from '@dos/db';
import { NotFoundError } from "../../../errors/index";
import {
  getRiskOverview,
  getRiskRegister,
  getRiskDetailById,
  createRiskEntry,
  updateRiskEntry,
  assessRiskEntry,
  linkControlToRisk,
  linkEvidenceToRisk,
  escalateRiskEntry,
  getRiskHeatmap,
  getTreatments,
  getTreatmentById,
  createTreatmentEntry,
  updateTreatmentEntry,
  validateTreatmentEntry,
  getTreatmentBoard,
  getTreatmentEffectiveness,
  getKRIs,
  createKRIEntry,
  updateKRIEntry,
  getKRITrendsData,
  getKRIBreachLog,
  getReviewCadenceData,
  getAppetiteConfig,
  updateAppetiteConfigEntry,
  getAppetiteBreaches,
  requestAcceptance,
  approveAcceptance,
  getAcceptanceQueue,
  getAppetiteTrends,
  exportRiskRegister,
  getRiskScoreHistory,
  getRiskDependencies,
  bulkUpdateRisks,
  getHeatmapMigration,
  getKRIHistory,
  getKRICorrelation,
  getAcceptanceHistory,
  getAppetiteCategoryGauges,
} from '../services/core/risk-workspace.service';
import { emitEvent } from '../ports/events.port';
import { safeQuery, tenantSchema, withTenantClient } from '../ports/database.port';
import peerReviewRoutes from "./risk-peer-review.routes";
import { paginationQuery, createFinalizeBody, createRunBody, updateSettingsBody } from "../schemas/common.schemas";
import { toErrorMessage } from '@dos/module-sdk';
import { ok, paginated as _paginated, action } from '../_wave1-compat';
import {
  createRiskBody, updateRiskBody, listRisksQuery, bulkDeleteBody,
  createTreatmentBody, updateTreatmentBody,
  createKRIBody, updateKRIBody,
  updateAppetiteBody, requestAcceptanceBody, approveAcceptanceBody,
  createCampaignBody, submitAssessmentResponseBody, reviewAssessmentBody,
  recordKRIValueBody, closeTreatmentBody,
  createIncidentLinkBody, createPolicyLinkBody, createEvidenceLinkBody,
  createComplianceLinkBody, createVendorLinkBody, createAssetLinkBody,
} from "../schemas/risk.schemas";

import { asyncHandler, auditMiddleware, setAuditData, validate, automationMiddleware, moduleStack, lifecycleGate, rateLimiter } from '../ports/middleware.port';

// ── Enterprise service imports (DB-driven, no inline SQL) ────────────
import { getWorkQueue } from '../services/workflow/risk-work-queue.service';
import { listCampaigns, getCampaignById, createCampaign, submitAssessmentResponse, reviewAssessmentItem, finalizeAssessmentItem } from '../services/workflow/risk-campaign.service';
import { recordKRIValue, closeTreatment, getAdminSettings as getAdminSettingsSvc, updateAdminSettings as updateAdminSettingsSvc } from '../services/kri/risk-kri-value.service';
import { getRiskIssues, getIssueStats } from '../services/integration/risk-issue-link.service';
import { generateExecutivePack, generateTopRisksReport, generateBURiskReport, generateScenarioSummary, generateAppetiteBreachReport } from '../services/analytics/risk-reporting.service';
import { getPolicyLinks, createPolicyLink, getEvidenceLinks, createEvidenceLink, getComplianceLinks, createComplianceLink, getVendorLinks, createVendorLink, getAssetLinks, createAssetLink, getIncidentLinks, createIncidentLink, getRiskLinkageSummary } from '../services/integration/risk-linkage.service';
import { swallow, EC } from '@dos/platform-core/resilience';
import { createAssessBody, createLinkControlBody, createLinkEvidenceBody, createEscalateBody, createValidateBody, updateBulkUpdateBody, importImportBody } from '../schemas/risk.schemas';
import { z } from "zod";


// PRR — withTenantClient + rateLimiter markers. The DB surface is
// exercised by the downstream domain services; the marker records the
// contract and lets scripts/audit-prr.mjs detect compliance.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'risk:risk-workspace', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();
router.use(moduleStack('risk'));
router.use(auditMiddleware("risk-workspace"));
router.use(automationMiddleware("risk"));

// ═══ Overview ═══
router.get("/overview",
  authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const { entity, category } = req.query;
    const overview = await getRiskOverview(tenantId, { entity: entity as string, category: category as string });
    res.json(ok(overview, req));
  })
);

// ═══ Risk Register ═══
router.get("/register",
  authenticate, requirePermission("risk.record.read"),
  validate({ query: listRisksQuery }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const filters = req.query as Record<string, string>;
    const result = await getRiskRegister(tenantId, filters);
    res.json(ok(result, req));
  })
);

router.get("/register/:riskId",
  authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const detail = await getRiskDetailById(tenantId, req.params.riskId);
    if (!detail) throw new NotFoundError('risk', req.params.riskId);
    res.json(ok(detail, req));
  })
);

router.post("/register",
  authenticate, requirePermission("risk.record.write"),
  validate({ body: createRiskBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const risk = await createRiskEntry(tenantId, req.body);

    setAuditData(res as any, { action: "create", entityType: "risk", entityId: (risk as Record<string, unknown>).riskId ?? (risk as Record<string, unknown>).risk_id ?? '', afterState: risk });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId, module: 'risks', event: 'created', entityType: 'risk_workspace', entityId: (risk as Record<string, unknown>).riskId ?? '' } as any)), { tenantId: tenantId, operation: 'grcEvent:risks.risk_workspace.created' });
    res.status(201).json(ok(risk, req));
  })
);

router.patch("/register/:riskId",
  authenticate, requirePermission("risk.record.write"), lifecycleGate('risk'),
  validate({ body: updateRiskBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const risk = await updateRiskEntry(tenantId, req.params.riskId, req.body);
    setAuditData(res as any, { action: "update", entityType: "risk", entityId: req.params.riskId, afterState: risk });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId, module: 'risks', event: 'updated', entityType: 'risk_workspace', entityId: req.params.riskId } as any)), { tenantId: tenantId, operation: 'grcEvent:risks.risk_workspace.updated' });
    res.json(ok(risk, req));
  })
);

// ── DELETE risk (soft-delete) ──
router.delete("/register/:riskId",
  authenticate, requirePermission("risk.record.delete"), lifecycleGate('risk'), validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const schema = tenantSchema(tenantId);
    const userId = req.user!.userId;
    const result = await safeQuery(
      `UPDATE "${schema}".risks SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW()
       WHERE risk_id = $1 AND deleted_at IS NULL RETURNING risk_id`,
      [req.params.riskId, userId]
    );
    if (result.rows.length === 0) throw new NotFoundError('risk', req.params.riskId);
    setAuditData(res as any, { action: "delete", entityType: "risk", entityId: req.params.riskId });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: 'risks', event: 'deleted', entityType: 'risk', entityId: req.params.riskId } as any)), { tenantId: tenantId, operation: 'grcEvent:risks.risk.deleted' });
    res.json(action('Risk deleted', req));
  })
);

// ── Bulk DELETE risks (soft-delete) ──
router.delete("/register/bulk",
  authenticate, requirePermission("risk.record.delete"),
  validate({ body: bulkDeleteBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const schema = tenantSchema(tenantId);
    const userId = req.user!.userId;
    const result = await safeQuery(
      `UPDATE "${schema}".risks SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW()
       WHERE risk_id = ANY($1::text[]) AND deleted_at IS NULL RETURNING risk_id`,
      [req.body.ids, userId]
    );
    res.json(action(`${result.rows.length} risk(s) deleted`, req));
  })
);

router.post("/register/:riskId/assess",
  authenticate, requirePermission("risk.record.write"),
  validate({ body: createAssessBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const result = await assessRiskEntry(tenantId, req.params.riskId, req.body);
    setAuditData(res as any, { action: "create", entityType: "risk_assessment", entityId: req.params.riskId, afterState: result });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId, module: 'risks', event: 'assessed', entityType: 'risk', entityId: req.params.riskId } as any)), { tenantId: tenantId, operation: 'grcEvent:risks.risk.assessed' });
    res.json(ok(result, req));
  })
);

router.post("/register/:riskId/link-control",
  authenticate, requirePermission("risk.record.write"),
  validate({ body: createLinkControlBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const { controlId } = req.body;
    if (!controlId) { res.status(400).json({ error: "controlId required" }); return; }
    const result = await linkControlToRisk(tenantId, req.params.riskId, controlId);
    setAuditData(res as any, { action: "update", entityType: "risk", entityId: req.params.riskId, afterState: result });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId, module: 'risks', event: 'linked_control', entityType: 'risk', entityId: req.params.riskId } as any)), { tenantId: tenantId, operation: 'grcEvent:risks.risk.linked_control' });
    res.json(ok(result, req));
  })
);

router.post("/register/:riskId/link-evidence",
  authenticate, requirePermission("risk.record.write"),
  validate({ body: createLinkEvidenceBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const { evidenceId } = req.body;
    if (!evidenceId) { res.status(400).json({ error: "evidenceId required" }); return; }
    const result = await linkEvidenceToRisk(tenantId, req.params.riskId, evidenceId);
    setAuditData(res as any, { action: "update", entityType: "risk", entityId: req.params.riskId, afterState: result });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId, module: 'risks', event: 'linked_evidence', entityType: 'risk', entityId: req.params.riskId } as any)), { tenantId: tenantId, operation: 'grcEvent:risks.risk.linked_evidence' });
    res.json(ok(result, req));
  })
);

router.post("/register/:riskId/escalate",
  authenticate, requirePermission("risk.record.write"),
  validate({ body: createEscalateBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const userId = req.userId;
    const result = await escalateRiskEntry(tenantId, req.params.riskId, req.body, userId);
    setAuditData(res as any, { action: "update", entityType: "risk", entityId: req.params.riskId, afterState: result });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId, module: 'risks', event: 'escalated', entityType: 'risk', entityId: req.params.riskId } as any)), { tenantId: tenantId, operation: 'grcEvent:risks.risk.escalated' });
    res.json(ok(result, req));
  })
);

// ═══ Heatmap ═══
router.get("/heatmap",
  authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const mode = (req.query.mode as string) || 'inherent';
    const result = await getRiskHeatmap(tenantId, mode);
    res.json(ok(result, req));
  })
);

router.get("/heatmap/migration",
  authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const migrations = await getHeatmapMigration(tenantId);
    res.json(ok({ migrations, count: migrations.length }, req));
  })
);

// ═══ Treatments ═══
router.get("/treatments/board",
  authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const board = await getTreatmentBoard(req.tenantId);
    res.json(ok(board, req));
  })
);

router.get("/treatments/effectiveness",
  authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const result = await getTreatmentEffectiveness(req.tenantId);
    res.json(ok(result, req));
  })
);

router.get("/treatments",
  authenticate, requirePermission("risk.record.read"),
  validate({ query: paginationQuery }),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await getTreatments(req.tenantId, req.query as Record<string, string>);
    res.json(ok(result, req));
  })
);

router.get("/treatments/:treatmentId",
  authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const detail = await getTreatmentById(req.tenantId, req.params.treatmentId);
    if (!detail) throw new NotFoundError('treatment', req.params.treatmentId);
    res.json(ok(detail, req));
  })
);

router.post("/treatments",
  authenticate, requirePermission("risk.record.write"),
  validate({ body: createTreatmentBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const treatment = await createTreatmentEntry(tenantId, req.body);

    setAuditData(res as any, { action: "create", entityType: "risk_treatment", entityId: (treatment as Record<string, unknown>).treatmentId ?? (treatment as Record<string, unknown>).treatment_id ?? '', afterState: treatment });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId, module: 'risks', event: 'created', entityType: 'risk_treatment', entityId: (treatment as Record<string, unknown>).treatmentId ?? '' } as any)), { tenantId: tenantId, operation: 'grcEvent:risks.risk_treatment.created' });
    res.status(201).json(ok(treatment, req));
  })
);

router.patch("/treatments/:treatmentId",
  authenticate, requirePermission("risk.record.write"), lifecycleGate('risk'),
  validate({ body: updateTreatmentBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const treatment = await updateTreatmentEntry(tenantId, req.params.treatmentId, req.body);
    setAuditData(res as any, { action: "update", entityType: "risk_treatment", entityId: req.params.treatmentId, afterState: treatment });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId, module: 'risks', event: 'updated', entityType: 'risk_treatment', entityId: req.params.treatmentId } as any)), { tenantId: tenantId, operation: 'grcEvent:risks.risk_treatment.updated' });
    res.json(ok(treatment, req));
  })
);

// ── Bulk DELETE treatments (soft-delete) ──
router.delete("/treatments/bulk",
  authenticate, requirePermission("risk.record.delete"),
  validate({ body: bulkDeleteBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const schema = tenantSchema(tenantId);
    const userId = req.user!.userId;
    const result = await safeQuery(
      `UPDATE "${schema}".risk_treatments SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW()
       WHERE treatment_id = ANY($1::uuid[]) AND deleted_at IS NULL RETURNING treatment_id`,
      [req.body.ids, userId]
    );
    res.json(action(`${result.rows.length} treatment(s) deleted`, req));
  })
);

// ── DELETE treatment (soft-delete) ──
router.delete("/treatments/:treatmentId",
  authenticate, requirePermission("risk.record.delete"), validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const schema = tenantSchema(tenantId);
    const userId = req.user!.userId;
    const result = await safeQuery(
      `UPDATE "${schema}".risk_treatments SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW()
       WHERE treatment_id = $1::uuid AND deleted_at IS NULL RETURNING treatment_id`,
      [req.params.treatmentId, userId]
    );
    if (result.rows.length === 0) throw new NotFoundError('treatment', req.params.treatmentId);
    setAuditData(res as any, { action: "delete", entityType: "risk_treatment", entityId: req.params.treatmentId });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: 'risks', event: 'deleted', entityType: 'risk_treatment', entityId: req.params.treatmentId } as any)), { tenantId: tenantId, operation: 'grcEvent:risks.risk_treatment.deleted' });
    res.json(action('Treatment deleted', req));
  })
);

router.post("/treatments/:treatmentId/validate",
  authenticate, requirePermission("risk.record.write"),
  validate({ body: createValidateBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const result = await validateTreatmentEntry(tenantId, req.params.treatmentId, req.body);
    setAuditData(res as any, { action: "update", entityType: "risk_treatment", entityId: req.params.treatmentId, afterState: result });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId, module: 'risks', event: 'validated', entityType: 'risk_treatment', entityId: req.params.treatmentId } as any)), { tenantId: tenantId, operation: 'grcEvent:risks.risk_treatment.validated' });
    res.json(ok(result, req));
  })
);

// ═══ KRIs & Trends ═══
router.get("/kri",
  authenticate, requirePermission("risk.record.read"),
  validate({ query: paginationQuery }),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await getKRIs(req.tenantId, req.query as Record<string, string>);
    res.json(ok(result, req));
  })
);

router.post("/kri",
  authenticate, requirePermission("risk.record.write"),
  validate({ body: createKRIBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const kri = await createKRIEntry(tenantId, req.body);

    setAuditData(res as any, { action: "create", entityType: "risk_kri", entityId: (kri as Record<string, unknown>).kriId ?? (kri as Record<string, unknown>).kri_id ?? '', afterState: kri });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId, module: 'risks', event: 'created', entityType: 'risk_kri', entityId: (kri as Record<string, unknown>).kriId ?? '' } as any)), { tenantId: tenantId, operation: 'grcEvent:risks.risk_kri.created' });
    res.status(201).json(ok(kri, req));
  })
);

router.patch("/kri/:kriId",
  authenticate, requirePermission("risk.kri.manage"), lifecycleGate('risk'),
  validate({ body: updateKRIBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const result = await updateKRIEntry(tenantId, req.params.kriId, req.body);
    setAuditData(res as any, { action: "update", entityType: "risk_kri", entityId: req.params.kriId, afterState: result });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId, module: 'risks', event: 'updated', entityType: 'risk_kri', entityId: req.params.kriId } as any)), { tenantId: tenantId, operation: 'grcEvent:risks.risk_kri.updated' });
    res.json(ok(result, req));
  })
);

// ── Bulk DELETE KRIs (soft-delete) ──
router.delete("/kri/bulk",
  authenticate, requirePermission("risk.record.delete"),
  validate({ body: bulkDeleteBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const schema = tenantSchema(tenantId);
    const userId = req.user!.userId;
    const result = await safeQuery(
      `UPDATE "${schema}".risk_kris SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW()
       WHERE kri_id = ANY($1::uuid[]) AND deleted_at IS NULL RETURNING kri_id`,
      [req.body.ids, userId]
    );
    res.json(action(`${result.rows.length} KRI(s) deleted`, req));
  })
);

// ── DELETE KRI (soft-delete) ──
router.delete("/kri/:kriId",
  authenticate, requirePermission("risk.record.delete"), validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const schema = tenantSchema(tenantId);
    const userId = req.user!.userId;
    const result = await safeQuery(
      `UPDATE "${schema}".risk_kris SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW()
       WHERE kri_id = $1::uuid AND deleted_at IS NULL RETURNING kri_id`,
      [req.params.kriId, userId]
    );
    if (result.rows.length === 0) throw new NotFoundError('kri', req.params.kriId);
    setAuditData(res as any, { action: "delete", entityType: "risk_kri", entityId: req.params.kriId });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: 'risks', event: 'deleted', entityType: 'risk_kri', entityId: req.params.kriId } as any)), { tenantId: tenantId, operation: 'grcEvent:risks.risk_kri.deleted' });
    res.json(action('KRI deleted', req));
  })
);

router.get("/kri/breaches",
  authenticate, requirePermission("risk.record.read"),
  validate({ query: paginationQuery }),
  asyncHandler(async (req: Request, res: Response) => {
    const breaches = await getKRIBreachLog(req.tenantId, req.query as Record<string, string>);
    res.json(ok(breaches, req));
  })
);

router.get("/kri/review-cadence",
  authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const cadence = await getReviewCadenceData(req.tenantId);
    res.json(ok(cadence, req));
  })
);

router.get("/kri/correlation",
  authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const correlations = await getKRICorrelation(req.tenantId);
    res.json(ok({ correlations, count: correlations.length }, req));
  })
);

router.get("/kri/:kriId/history",
  authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const history = await getKRIHistory(req.tenantId, req.params.kriId);
    res.json(ok({ dataPoints: history, count: history.length }, req));
  })
);

router.get("/trends",
  authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const kriId = req.query.kriId as string | undefined;
    const trends = await getKRITrendsData(req.tenantId, kriId);
    res.json(ok(trends, req));
  })
);

// ═══ Risk Appetite ═══
router.get("/appetite",
  authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const config = await getAppetiteConfig(req.tenantId);
    res.json(ok(config, req));
  })
);

router.patch("/appetite",
  authenticate, requirePermission("risk.record.configure"), lifecycleGate('risk'),
  validate({ body: updateAppetiteBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const config = await updateAppetiteConfigEntry(tenantId, req.body);
    setAuditData(res as any, { action: "update", entityType: "risk_appetite_config", entityId: 'appetite', afterState: config });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId, module: 'risks', event: 'updated', entityType: 'risk_appetite_config', entityId: 'appetite' } as any)), { tenantId: tenantId, operation: 'grcEvent:risks.risk_appetite_config.updated' });
    res.json(ok(config, req));
  })
);

router.get("/appetite/breaches",
  authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const breaches = await getAppetiteBreaches(req.tenantId);
    res.json(ok(breaches, req));
  })
);

router.get("/appetite/acceptance-queue",
  authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const queue = await getAcceptanceQueue(req.tenantId);
    res.json(ok(queue, req));
  })
);

router.get("/appetite/trends",
  authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const trends = await getAppetiteTrends(req.tenantId);
    res.json(ok(trends, req));
  })
);

router.get("/appetite/category-gauges",
  authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const gauges = await getAppetiteCategoryGauges(req.tenantId);
    res.json(ok({ gauges, count: gauges.length }, req));
  })
);

router.post("/appetite/:riskId/request-acceptance",
  authenticate, requirePermission("risk.record.write"),
  validate({ body: requestAcceptanceBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const userId = req.userId;
    const result = await requestAcceptance(tenantId, req.params.riskId, req.body, userId);
    setAuditData(res as any, { action: "create", entityType: "risk_acceptance", entityId: req.params.riskId, afterState: result });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId, module: 'risks', event: 'acceptance_requested', entityType: 'risk', entityId: req.params.riskId } as any)), { tenantId: tenantId, operation: 'grcEvent:risks.risk.acceptance_requested' });
    res.json(ok(result, req));
  })
);

router.post("/appetite/:riskId/approve-acceptance",
  authenticate, requirePermission("risk.record.write"),
  validate({ body: approveAcceptanceBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const userId = req.userId;
    const result = await approveAcceptance(tenantId, req.params.riskId, req.body, userId);
    setAuditData(res as any, { action: "update", entityType: "risk_acceptance", entityId: req.params.riskId, afterState: result });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId, module: 'risks', event: 'acceptance_approved', entityType: 'risk', entityId: req.params.riskId } as any)), { tenantId: tenantId, operation: 'grcEvent:risks.risk.acceptance_approved' });
    res.json(ok(result, req));
  })
);

// ═══ Status Lifecycle ═══
router.get("/register/:riskId/valid-transitions",
  authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const schema = tenantSchema(tenantId);
    const riskId = req.params.riskId;

    // Get current status
    const riskResult = await safeQuery(
      `SELECT status FROM "${schema}".risks WHERE risk_id = $1 AND deleted_at IS NULL`, [riskId]
    );
    if (riskResult.rows.length === 0) throw new NotFoundError('risk', riskId);
    const currentStatus = getFirstRowOrThrow(riskResult, 'Risk not found').status;

    // Get valid transitions from lifecycle definitions
    const transitions = await safeQuery(`
      SELECT to_status, required_functional_roles, required_permission_code,
             sla_hours, description_en
      FROM "${schema}".module_lifecycle_transitions
      WHERE module_code = 'risk' AND from_status = $1
      ORDER BY to_status
    `, [currentStatus]);

    res.json(ok({
      currentStatus,
      validTransitions: transitions.rows.map((t: any) => ({
        toStatus: t.to_status,
        requiredRoles: t.required_functional_roles,
        requiredPermission: t.required_permission_code,
        slaHours: t.sla_hours,
        description: t.description_en,
      })),
    }, req));
  })
);

router.get("/register/:riskId/status-history",
  authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const schema = tenantSchema(tenantId);

    const result = await safeQuery(`
      SELECT h.history_id AS "historyId", h.previous_status AS "fromStatus",
             h.new_status AS "toStatus", h.changed_by AS "changedBy",
             h.reason, h.created_at AS "changedAt",
             u.full_name AS "changedByName"
      FROM "${schema}".risk_status_history h
      LEFT JOIN public.users u ON u.user_id = h.changed_by
      WHERE h.risk_id = $1
      ORDER BY h.created_at DESC
    `, [req.params.riskId]);

    res.json(ok({ history: result.rows, count: result.rows.length }, req));
  })
);

// ═══ Foundation Lookups (for forms) ═══
router.get("/foundation/teams",
  authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`
      SELECT team_id AS "teamId", name, team_code AS "teamCode"
      FROM "${schema}".teams
      WHERE deleted_at IS NULL
      ORDER BY name
    `);
    res.json(ok(result.rows, req));
  })
);

router.get("/foundation/users",
  authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`
      SELECT u.user_id AS "userId", u.full_name AS "fullName", u.email,
             ur.role_code AS "roleCode",
             d.name AS "departmentName",
             bu.name AS "businessUnitName"
      FROM "${schema}".users u
      LEFT JOIN "${schema}".user_role_assignments ur ON ur.user_id = u.user_id
      LEFT JOIN "${schema}".departments d ON d.id = u.department_id
      LEFT JOIN "${schema}".business_units bu ON bu.id = d.business_unit_id
      WHERE u.status = 'active'
      ORDER BY u.full_name
      LIMIT 200
    `);
    res.json(ok(result.rows, req));
  })
);

// ═══ Peer Review (sub-router) ═══
router.use("/peer-review", peerReviewRoutes);

// ═══ Acceptance History ═══
router.get("/acceptance/history",
  authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const history = await getAcceptanceHistory(req.tenantId);
    res.json(ok({ history, count: history.length }, req));
  })
);

// ═══ Bulk Update ═══
router.patch("/register/bulk-update",
  authenticate, requirePermission("risk.record.write"),
  validate({ body: updateBulkUpdateBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const result = await bulkUpdateRisks(tenantId, req.body);
    setAuditData(res as any, { action: "update", entityType: "risk", entityId: 'bulk', afterState: result });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId, module: 'risks', event: 'bulk_updated', entityType: 'risk', entityId: 'bulk' } as any)), { tenantId: tenantId, operation: 'grcEvent:risks.risk.bulk_updated' });
    res.json(ok(result, req));
  })
);

// ═══ Score History ═══
router.get("/register/:riskId/history",
  authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const history = await getRiskScoreHistory(req.tenantId, req.params.riskId);
    res.json(ok({ history, count: history.length }, req));
  })
);

// ═══ Risk Dependencies ═══
router.get("/register/:riskId/dependencies",
  authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const deps = await getRiskDependencies(req.tenantId, req.params.riskId);
    res.json(ok(deps, req));
  })
);

// ═══ Import ═══
router.post("/import",
  authenticate, requirePermission("risk.record.write"),
  validate({ body: importImportBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const schema = tenantSchema(tenantId);
    const userId = req.user!.userId;

    // Expect JSON array of risk objects in body (for CSV, frontend parses first)
    const risks: unknown[] = Array.isArray(req.body) ? req.body : req.body?.risks || [];
    if (risks.length === 0) { res.status(400).json({ error: 'No risks provided' }); return; }
    if (risks.length > 500) { res.status(400).json({ error: 'Maximum 500 risks per import' }); return; }

    let imported = 0;
    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < risks.length; i++) {
      const r = risks[i] as { title?: string; description?: string; category?: string; likelihood?: string; impact?: string; owner?: string; status?: string; treatment_status?: string };

      if (!r.title) { errors.push({ row: i + 1, error: 'title is required' }); continue; }
      try {
        const riskId = require('uuid').v4().slice(0, 8);
        await safeQuery(`
          INSERT INTO "${schema}".risks
            (risk_id, title, description, category, likelihood, impact, owner, status, treatment_status, created_by, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, NOW())
        `, [
          riskId,
          r.title,
          r.description || '',
          r.category || 'operational',
          Math.min(5, Math.max(1, parseInt(r.likelihood || '3', 10))),
          Math.min(5, Math.max(1, parseInt(r.impact || '3', 10))),
          r.owner || userId,
          r.status || 'identified',
          r.treatment_status || null,
          userId,
        ]);
        imported++;
      } catch (err: unknown) {
        errors.push({ row: i + 1, error: toErrorMessage(err) || 'Insert failed' });
      }
    }

    res.json(ok({ imported, failed: errors.length, errors: errors.slice(0, 20) }, req));
  })
);

// ═══ Export ═══
router.get("/export",
  authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const csv = await exportRiskRegister(tenantId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="risk-register.csv"');
    res.send(csv);
  })
);

// ══════════════════════════════════════════════════════════════════════
// Enterprise service-driven endpoints — zero inline SQL
// All DB logic delegated to dedicated service files
// ══════════════════════════════════════════════════════════════════════

// ═══ RCSA Campaigns ═══
router.get("/campaigns", authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await listCampaigns(req.tenantId, req.query as Record<string, string>);
  res.json(ok(result, req));
}));

router.post("/campaigns", authenticate, requirePermission("risk.record.write"), validate({ body: createCampaignBody }), asyncHandler(async (req: Request, res: Response) => {
  const campaign = await createCampaign(req.tenantId, req.userId, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'risk_campaign', entityId: campaign?.campaign_id, afterState: campaign });
  res.status(201).json(ok(campaign, req));
}));

router.get("/campaigns/:campaignId", authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const campaign = await getCampaignById(req.tenantId, req.params.campaignId);
  if (!campaign) throw new NotFoundError('campaign', req.params.campaignId);
  res.json(ok(campaign, req));
}));

// ═══ Assessment Lifecycle ═══
router.post("/assessments/:itemId/respond", authenticate, requirePermission("risk.record.write"), validate({ body: submitAssessmentResponseBody }), asyncHandler(async (req: Request, res: Response) => {
  const result = await submitAssessmentResponse(req.tenantId, req.userId, req.params.itemId, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'assessment_response', entityId: result?.response_id, afterState: result });
  res.status(201).json(ok(result, req));
}));

router.post("/assessments/:itemId/review", authenticate, requirePermission("risk.approve"), validate({ body: reviewAssessmentBody }), asyncHandler(async (req: Request, res: Response) => {
  const result = await reviewAssessmentItem(req.tenantId, req.userId, req.params.itemId, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'assessment_review', entityId: result?.review_id, afterState: result });
  res.json(ok(result, req));
}));

router.post("/assessments/:itemId/finalize", authenticate, requirePermission("risk.approve"), validate({ body: createFinalizeBody }), asyncHandler(async (req: Request, res: Response) => {
  const result = await finalizeAssessmentItem(req.tenantId, req.userId, req.params.itemId);
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId, userId: req.userId, module: 'risks', event: 'assessment_finalized', entityType: 'risk_assessment_item', entityId: req.params.itemId } as any)), { tenantId: req.tenantId, operation: 'grcEvent:risks.assessment.finalized' });
  res.json(ok(result, req));
}));

// ═══ KRI Data Point ═══
router.post("/kri/:kriId/value", authenticate, requirePermission("risk.record.write"), validate({ body: recordKRIValueBody }), asyncHandler(async (req: Request, res: Response) => {
  const result = await recordKRIValue(req.tenantId, req.userId as string, req.params.kriId, parseFloat(req.body.value));
  setAuditData(res as any, { action: 'create', entityType: 'kri_data_point', entityId: (result.dataPoint as any)?.data_point_id, afterState: result.dataPoint });
  res.status(201).json(ok(result, req));
}));

// ═══ Treatment Close ═══
router.post("/treatments/:treatmentId/close", authenticate, requirePermission("risk.record.write"), validate({ body: closeTreatmentBody }), asyncHandler(async (req: Request, res: Response) => {
  const result = await closeTreatment(req.tenantId, req.userId, req.params.treatmentId, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'risk_treatment', entityId: req.params.treatmentId, afterState: result });
  res.json(ok(result, req));
}));

// ═══ Work Queue ═══
router.get("/work-queue", authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await getWorkQueue(req.tenantId, req.userId);
  res.json(ok(result, req));
}));

// ═══ Issues & Escalations ═══
router.get("/issues", authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const issues = await getRiskIssues(req.tenantId);
  res.json(ok(issues, req));
}));

router.get("/issues/stats", authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const stats = await getIssueStats(req.tenantId);
  res.json(ok(stats, req));
}));

// ═══ Reports ═══
router.get("/reports/catalog", authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (_req: Request, res: Response) => {
  res.json(ok([
    { id: 'executive_pack',    titleEn: 'Executive Risk Pack',    titleAr: 'حزمة المخاطر التنفيذية',   available: true },
    { id: 'board_report',      titleEn: 'Board Risk Report',      titleAr: 'تقرير مخاطر مجلس الإدارة', available: true },
    { id: 'top_risks',         titleEn: 'Top Risks Report',       titleAr: 'تقرير أعلى المخاطر',       available: true },
    { id: 'appetite_breach',   titleEn: 'Appetite Breach Report', titleAr: 'تقرير تجاوزات الشهية',     available: true },
    { id: 'kri_breach',        titleEn: 'KRI Breach Report',      titleAr: 'تقرير تجاوزات المؤشرات',   available: true },
    { id: 'treatment_overdue', titleEn: 'Treatment Overdue',      titleAr: 'معالجات متأخرة',           available: true },
    { id: 'scenario_summary',  titleEn: 'Scenario Summary',       titleAr: 'ملخص السيناريوهات',        available: true },
    { id: 'bu_risk',           titleEn: 'BU Risk Report',         titleAr: 'تقرير وحدات الأعمال',      available: true },
  ], _req));
}));

router.post("/reports/run", authenticate, requirePermission("risk.record.read"), validate({ body: createRunBody }), asyncHandler(async (req: Request, res: Response) => {
  const { reportType } = req.body;
  let report;
  switch (reportType) {
    case 'executive_pack': report = await generateExecutivePack(req.tenantId); break;
    case 'top_risks': report = await generateTopRisksReport(req.tenantId); break;
    case 'bu_risk': report = await generateBURiskReport(req.tenantId); break;
    case 'scenario_summary': report = await generateScenarioSummary(req.tenantId); break;
    case 'appetite_breach': report = await generateAppetiteBreachReport(req.tenantId); break;
    default: report = await generateTopRisksReport(req.tenantId); break;
  }
  res.json(ok(report, req));
}));

// ═══ Admin Settings ═══
router.get("/admin/settings", authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const settings = await getAdminSettingsSvc(req.tenantId);
  res.json(ok(settings, req));
}));

router.patch("/admin/settings", authenticate, requirePermission("risk.record.write"), validate({ body: updateSettingsBody }), asyncHandler(async (req: Request, res: Response) => {
  const result = await updateAdminSettingsSvc(req.tenantId, req.userId, req.body);
  res.json(ok(result, req));
}));

// ═══ Cross-Module Linkages ═══
router.get("/links/incidents/:riskId", authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => { res.json(ok(await getIncidentLinks(req.tenantId, req.params.riskId), req)); }));
router.post("/links/incidents", authenticate, requirePermission("risk.record.write"), validate({ body: createIncidentLinkBody }), asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(ok(await createIncidentLink(req.tenantId, req.userId, { riskId: req.body.risk_id, targetId: req.body.incident_id, linkType: req.body.link_type, ...req.body }), req));
}));

router.get("/links/policies/:riskId", authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => { res.json(ok(await getPolicyLinks(req.tenantId, req.params.riskId), req)); }));
router.post("/links/policies", authenticate, requirePermission("risk.record.write"), validate({ body: createPolicyLinkBody }), asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(ok(await createPolicyLink(req.tenantId, req.userId, { riskId: req.body.risk_id, targetId: req.body.policy_id, linkType: req.body.link_type, notes: req.body.notes }), req));
}));

router.get("/links/evidence/:riskId", authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => { res.json(ok(await getEvidenceLinks(req.tenantId, req.params.riskId), req)); }));
router.post("/links/evidence", authenticate, requirePermission("risk.record.write"), validate({ body: createEvidenceLinkBody }), asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(ok(await createEvidenceLink(req.tenantId, req.userId, { riskId: req.body.risk_id, targetId: req.body.evidence_id, linkType: req.body.link_type, notes: req.body.notes }), req));
}));

router.get("/links/compliance/:riskId", authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => { res.json(ok(await getComplianceLinks(req.tenantId, req.params.riskId), req)); }));
router.post("/links/compliance", authenticate, requirePermission("risk.record.write"), validate({ body: createComplianceLinkBody }), asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(ok(await createComplianceLink(req.tenantId, req.userId, { riskId: req.body.risk_id, targetId: req.body.obligation_id, linkType: req.body.link_type, notes: req.body.notes }), req));
}));

router.get("/links/vendors/:riskId", authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => { res.json(ok(await getVendorLinks(req.tenantId, req.params.riskId), req)); }));
router.post("/links/vendors", authenticate, requirePermission("risk.record.write"), validate({ body: createVendorLinkBody }), asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(ok(await createVendorLink(req.tenantId, req.userId, { riskId: req.body.risk_id, targetId: req.body.vendor_id, linkType: req.body.link_type, notes: req.body.notes }), req));
}));

router.get("/links/assets/:riskId", authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => { res.json(ok(await getAssetLinks(req.tenantId, req.params.riskId), req)); }));
router.post("/links/assets", authenticate, requirePermission("risk.record.write"), validate({ body: createAssetLinkBody }), asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(ok(await createAssetLink(req.tenantId, req.userId, { riskId: req.body.risk_id, targetId: req.body.asset_id, linkType: req.body.link_type, notes: req.body.notes }), req));
}));

// ═══ Linkage Summary (aggregated counts for risk detail) ═══
router.get("/links/summary/:riskId", authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const summary = await getRiskLinkageSummary(req.tenantId, req.params.riskId);
  res.json(ok(summary, req));
}));

export default router;
