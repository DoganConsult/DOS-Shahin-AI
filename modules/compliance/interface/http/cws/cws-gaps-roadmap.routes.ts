import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
/**
 * Compliance Workspace — Gaps & Roadmap
 * Sub-router mounted at "/" relative to the compliance-workspace barrel.
 */
import {
  getGapsRegister,
  getGapDetail,
  updateGap,
  createGapRemediationTask,
  validateGap,
  getComplianceRoadmap,
  generateRoadmap,
  updateMilestone,
  updateRoadmapTask,
} from '../../services/compliance/compliance-workspace.service';
import { invalidateComplianceCache } from '../../../ports/platform.port';
import { logComplianceAccess } from '../../../application/compliance/reporting/compliance-observability.service';
import { errMsg } from "../../../../i18n/error-messages";
import { emitEvent } from '../../../ports/events.port';
import { auditMiddleware, asyncHandler, setAuditData, validate, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { updateGapBody, createGapRemediationBody, validateGapBody, updateMilestoneBody, updateRoadmapTaskBody, createGenerateBody } from "../../../schemas/compliance.schemas";
import { requirePermission, authenticate } from '../../../ports/auth.port';

const router = Router();
router.use(authenticate);
router.use(auditMiddleware('compliance'));
router.use(moduleStack('compliance'));

// ── GAPS ────────────────────────────────────────────────────────────

router.get("/gaps", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/gaps";
  try {
    const tenantId = req.tenantId!;
    const user = req.user!;
    const frameworkId = req.query.frameworkId as string | undefined;
    const severity = req.query.severity as string | undefined;
    const scope = (req.query.scope as string) === "my" ? "my" as const : undefined;
    const userId = scope === "my" ? user?.userId : undefined;
    const page = Math.max(1, parseInt(String(req.query.page || 1), 10) || 1);
    const pageSize = Math.max(1, Math.min(200, parseInt(String(req.query.pageSize || req.query.page_size || 50), 10) || 50));
    const limit = pageSize;
    const offset = (page - 1) * pageSize;
    const options: { scope?: 'my'; userId?: string; limit: number; offset: number } = { limit, offset };
    if (scope !== undefined && userId) {
      options.scope = scope;
      options.userId = userId;
    }
    const data = await getGapsRegister(tenantId, frameworkId, severity, options);
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(data);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

router.get("/gaps/:id", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/gaps/:id";
  try {
    const tenantId = req.tenantId!;
    const data = await getGapDetail(tenantId, req.params.id as string);
    if (!data) {
      logComplianceAccess(tenantId, path, Date.now() - start, false, 404);
      res.status(404).json({ error: errMsg('NOT_FOUND', req) });
      return;
    }
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(data);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

router.patch("/gaps/:id", authenticate, requirePermission("control.record.write"), validate({ body: updateGapBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const data = await updateGap(tenantId, req.params.id as string, req.body);
  if (!data) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  await invalidateComplianceCache(tenantId);
  setAuditData(res as any, { action: "update", entityType: "compliance_gap", entityId: req.params.id as string, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'compliance', event: 'updated', entityType: 'compliance_workspace', entityId: req.params.id || '' } as any)), { tenantId: tenantId, operation: 'grcEvent:compliance.compliance_workspace.updated' });
  res.json(data);
}));

router.post("/gaps/:id/remediation-task", authenticate, requirePermission("control.record.write"), validate({ body: createGapRemediationBody }), asyncHandler(async (req, res) => {
  const { title } = req.body;
  if (!title) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const tenantId = req.tenantId!;
  const data = await createGapRemediationTask(tenantId, req.params.id as string, req.body);
  await invalidateComplianceCache(tenantId);
  setAuditData(res as any, { action: "create", entityType: "remediation_task", entityId: data.task_id, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'compliance', event: 'created', entityType: 'compliance_workspace', entityId: req.params.id || '' } as any)), { tenantId: tenantId, operation: 'grcEvent:compliance.compliance_workspace.created' });
  res.status(201).json(data);
}));

router.post("/gaps/:id/validate", authenticate, requirePermission("control.record.write"), validate({ body: validateGapBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const body = { ...req.body, validatedBy: req.user?.userId || req.body.validatedBy };
  const data = await validateGap(tenantId, req.params.id as string, body);
  if (!data) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  await invalidateComplianceCache(tenantId);
  setAuditData(res as any, { action: "update", entityType: "compliance_gap", entityId: req.params.id as string, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'compliance', event: 'created', entityType: 'compliance_workspace', entityId: req.params.id || '' } as any)), { tenantId: tenantId, operation: 'grcEvent:compliance.compliance_workspace.created' });
  res.json(data);
}));

// ── ROADMAP ─────────────────────────────────────────────────────────

router.get("/roadmap", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/roadmap";
  try {
    const tenantId = req.tenantId!;
    const data = await getComplianceRoadmap(tenantId);
    if (!data) {
      logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
      res.json({ phases: [], tasks: [], totalTasks: 0, completedTasks: 0, completionPercent: 0 });
      return;
    }
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(data);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

router.post("/roadmap/generate", authenticate, requirePermission("framework.record.read"), validate({ body: createGenerateBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const data = await generateRoadmap(tenantId);
  await invalidateComplianceCache(tenantId);
  setAuditData(res as any, { action: "create", entityType: "roadmap", entityId: data.roadmapId, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'compliance', event: 'created', entityType: 'compliance_workspace', entityId: req.params.id || '' } as any)), { tenantId: tenantId, operation: 'grcEvent:compliance.compliance_workspace.created' });
  res.json(data);
}));

// ── MILESTONE UPDATE ────────────────────────────────────────────────

router.patch("/roadmap/:milestoneId", authenticate, requirePermission("framework.record.read"), validate({ body: updateMilestoneBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const data = await updateMilestone(tenantId, req.params.milestoneId as string, req.body);
  if (!data) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  await invalidateComplianceCache(tenantId);
  setAuditData(res as any, { action: "update", entityType: "roadmap_milestone", entityId: req.params.milestoneId as string, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'compliance', event: 'updated', entityType: 'compliance_workspace', entityId: req.params.id || '' } as any)), { tenantId: tenantId, operation: 'grcEvent:compliance.compliance_workspace.updated' });
  res.json(data);
}));

// ── ROADMAP TASK UPDATE ─────────────────────────────────────────────

router.patch("/roadmap/tasks/:taskId", authenticate, requirePermission("framework.record.write"), validate({ body: updateRoadmapTaskBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const data = await updateRoadmapTask(tenantId, req.params.taskId as string, req.body);
  if (!data) { res.status(400).json({ error: errMsg('NO_FIELDS_TO_UPDATE', req) }); return; }
  await invalidateComplianceCache(tenantId);
  setAuditData(res as any, { action: "update", entityType: "roadmap_task", entityId: req.params.taskId as string, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'compliance', event: 'updated', entityType: 'roadmap_task', entityId: req.params.taskId as string } as any)), { tenantId: tenantId, operation: 'grcEvent:compliance.roadmap_task.updated' });
  res.json(data);
}));

export default router;

