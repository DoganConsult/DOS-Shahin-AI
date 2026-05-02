import { Request, Response, Router } from 'express';
import { z } from "zod";
import { catchHandler, EC } from '@dos/platform-core/resilience';

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — Remediation Routes
// CRUD for standalone remediation tasks
// and overdue detection
// ============================================


import { authenticate, requirePermission } from '../ports/auth.port';
import {
  createRemediationTask,
  getRemediationTasks,
  getRemediationTaskById,
  updateRemediationTask,
  deleteRemediationTask,
  checkOverdueTasks,
} from '../services/remediation.service';

import { emitEvent, notifyDomainChange } from '../ports/events.port';
// ── Zod Validation Schemas ──
import { requireOwnership, auditMiddleware, setAuditData, automationMiddleware, lifecycleGate, enforceMandatoryFields, enforceStageGates, validate, moduleStack, asyncHandler } from '../ports/middleware.port';
import { toErrorMessage, ok, action as _action } from '@dos/module-sdk';
import * as remediationQuery from '../repositories/remediation-query.repo';
import { getPlanDashboards, getOwnerSummaries, getSlaReport, getTrends, getCostSummary, getExecutiveSummary } from '../services/remediation-reporting.service';
import { getPlanProgress, reportBlocker, resolveBlocker, getBlockers, getBurndownMetrics } from '../services/remediation-tracking.service';
import { createVerificationWorkflow, getVerifications, submitEvidence } from '../services/remediation-verification.service';
import { createRootBody, updateIdBody, createCheckoverdueBody, createBlockersBody, createResolveBody, createVerificationsBody, createEvidenceBody } from "../schemas/remediation.schemas";
import { getAiRecommendations as remediationAiRecommendations } from "../services/remediation-ai.service";

const router = Router();
router.use(moduleStack('remediation'));
router.use(auditMiddleware("remediation"));
router.use(automationMiddleware("remediation"));
router.use(enforceMandatoryFields("remediation"));
router.use(enforceStageGates("remediation"));

// GET / — List all remediation tasks
router.get("/", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("remediation.task.read"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const user = req.user!;
  const tasks = await getRemediationTasks(tenantId, user ? { userId: user.userId, role: user.role } : undefined);
  res.json(tasks);
});

// GET /:id — Get a single remediation task
router.get("/:id", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("remediation.task.read"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const task = await getRemediationTaskById(tenantId, req.params.id as string);
  if (!task) {
    res.status(404).json({ error: "Remediation task not found" });
    return;
  }
  res.json(task);
});

// POST / — Create a new remediation task
router.post("/", authenticate, requirePermission("remediation.write"), validate({ body: createRootBody }), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const { title } = req.body;
  if (!title) {
    res.status(400).json({ error: "title is required" });
    return;
  }
  const task = await createRemediationTask(tenantId, { ...req.body, created_by: req.user!.userId! });

  setAuditData(res as any, { action: "create", entityType: "remediation_task", entityId: task.task_id, afterState: task });

  emitEvent(({ tenantId, userId: req.user.userId, module: 'remediation', event: 'created', entityType: 'remediation_task', entityId: task.task_id, data: task } as any)).catch(catchHandler(EC.EVENT_BUS, {}));

  notifyDomainChange(tenantId, 'remediation', 'create', task.task_id);
  res.status(201).json(task);
});

// PUT /:id — Update a remediation task
router.put("/:id", authenticate, requirePermission("remediation.write"), validate({ body: updateIdBody }), requireOwnership("remediation"), lifecycleGate('remediation'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const task = await updateRemediationTask(tenantId, req.params.id as string, req.body);
    setAuditData(res as any, { action: "update", entityType: "remediation_task", entityId: req.params.id as string, afterState: task });
    emitEvent(({ tenantId, userId: req.user!.userId!, module: 'remediation', event: 'updated', entityType: 'remediation_task', entityId: req.params.id as string, data: task } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
    notifyDomainChange(tenantId, 'remediation', 'update', req.params.id as string);
    res.json(task);
  } catch (err: unknown) {
    if (toErrorMessage(err) === "Remediation task not found") {
      res.status(404).json({ error: toErrorMessage(err) });
      return;
    }
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// DELETE /:id — Delete a remediation task
router.delete("/:id", validate({ body: genericPayloadSchema }), authenticate, requirePermission("remediation.delete"), requireOwnership("remediation"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const deleted = await deleteRemediationTask(tenantId, req.params.id as string);
  if (!deleted) {
    res.status(404).json({ error: "Remediation task not found" });
    return;
  }
  setAuditData(res as any, { action: "delete", entityType: "remediation_task", entityId: req.params.id as string });
  emitEvent(({ tenantId, userId: req.user!.userId!, module: 'remediation', event: 'deleted', entityType: 'remediation_task', entityId: req.params.id as string, data: {} } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  notifyDomainChange(tenantId, 'remediation', 'delete', req.params.id as string);
  res.json({ message: "Remediation task deleted" });
});

// POST /check-overdue — Mark overdue tasks
router.post("/check-overdue", authenticate, requirePermission("remediation.write"), validate({ body: createCheckoverdueBody }), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const count = await checkOverdueTasks(tenantId);
  setAuditData(res as any, { action: "update", entityType: "remediation_task", entityId: "bulk", afterState: { overdueCount: count } });
  if (count > 0) {
    emitEvent(({ tenantId, userId: req.user!.userId!, module: 'remediation', event: 'overdue_check', entityType: 'remediation_task', entityId: 'bulk', data: { overdueCount: count } } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  }
  res.json({ overdueCount: count });
});

router.get("/search", authenticate, requirePermission("remediation.task.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await remediationQuery.searchEntities(req.tenantId!, {
    query: req.query.q as string,
    status: req.query.status as string,
    priority: req.query.priority as string,
    sourceType: req.query.sourceType as string,
    remediationType: req.query.remediationType as string,
    page: Number(req.query.page) || 1,
    pageSize: Number(req.query.pageSize) || 20,
    sortBy: req.query.sortBy as string,
    sortDir: req.query.sortDir as 'ASC' | 'DESC',
  });
  res.json(ok(result, req));
}));

router.get("/dashboard", authenticate, requirePermission("remediation.task.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const [stats, kpis, sourceBreakdown, typeBreakdown, pendingVerification] = await Promise.all([
    remediationQuery.getDashboardStats(req.tenantId!),
    remediationQuery.getKpiMetrics(req.tenantId!),
    remediationQuery.getSourceBreakdown(req.tenantId!),
    remediationQuery.getTypeBreakdown(req.tenantId!),
    remediationQuery.getPendingVerification(req.tenantId!),
  ]);
  res.json(ok({ stats, kpis, sourceBreakdown, typeBreakdown, pendingVerification }, req));
}));

router.get("/trends", authenticate, requirePermission("remediation.task.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const aging = await remediationQuery.getAgingReport(req.tenantId!);
  const trends = await getTrends(req.tenantId!);
  res.json(ok({ aging, trends }, req));
}));

router.get("/cross-module/:linkedModule", authenticate, requirePermission("remediation.task.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const data = await remediationQuery.getCrossModuleView(req.tenantId!, req.params.linkedModule);
  res.json(ok({ items: data, total: data.length }, req));
}));

router.get("/export", authenticate, requirePermission("remediation.task.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const data = await remediationQuery.getExportData(req.tenantId!, req.query as Record<string, string>);
  res.json(ok({ rows: data, total: data.length, exportedAt: new Date().toISOString() }, req));
}));

router.get("/reporting/plans", authenticate, requirePermission("remediation.task.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const plans = await getPlanDashboards(req.tenantId!);
  res.json(ok({ plans }, req));
}));

router.get("/reporting/by-owner", authenticate, requirePermission("remediation.task.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const owners = await getOwnerSummaries(req.tenantId!);
  res.json(ok({ owners }, req));
}));

router.get("/reporting/sla", authenticate, requirePermission("remediation.task.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const report = await getSlaReport(req.tenantId!);
  res.json(ok(report, req));
}));

router.get("/reporting/cost", authenticate, requirePermission("remediation.task.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const cost = await getCostSummary(req.tenantId!);
  res.json(ok(cost, req));
}));

router.get("/reporting/executive", authenticate, requirePermission("remediation.task.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const summary = await getExecutiveSummary(req.tenantId!);
  res.json(ok(summary, req));
}));

router.get("/:id/progress", authenticate, requirePermission("remediation.task.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const progress = await getPlanProgress(req.tenantId!, req.params.id);
  res.json(ok(progress, req));
}));

router.get("/:id/burndown", authenticate, requirePermission("remediation.task.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const burndown = await getBurndownMetrics(req.tenantId!, req.params.id);
  res.json(ok(burndown, req));
}));

router.get("/:id/blockers", authenticate, requirePermission("remediation.task.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const blockers = await getBlockers(req.tenantId!, req.params.id);
  res.json(ok({ blockers, total: blockers.length }, req));
}));

router.get("/:id/verifications", authenticate, requirePermission("remediation.task.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const verifications = await getVerifications(req.tenantId!, { planId: req.params.id });
  res.json(ok({ verifications, total: verifications.length }, req));
}));

router.post("/:id/blockers", authenticate, requirePermission("remediation.write"), validate({ body: createBlockersBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId!;
  const blocker = await reportBlocker(req.tenantId!, { planId: req.params.id, title: req.body.title || 'Blocker', description: req.body.description, reportedBy: userId, severity: req.body.severity });
  setAuditData(res as any, { action: "report_blocker", entityType: "remediation_task", entityId: req.params.id });
  res.status(201).json(ok(blocker, req));
}));

router.post("/:id/blockers/:blockerId/resolve", authenticate, requirePermission("remediation.write"), validate({ body: createResolveBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId!;
  const result = await resolveBlocker(req.tenantId!, req.params.blockerId, userId);
  res.json(ok(result, req));
}));

router.post("/:id/verifications", authenticate, requirePermission("remediation.write"), validate({ body: createVerificationsBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId!;
  const workflow = await createVerificationWorkflow(req.tenantId!, { ...req.body, taskId: req.params.id, requestedBy: userId });
  setAuditData(res as any, { action: "create_verification", entityType: "verification_workflow", entityId: workflow.verificationId });
  res.status(201).json(ok(workflow, req));
}));

router.post("/:id/verifications/:verificationId/evidence", authenticate, requirePermission("remediation.write"), validate({ body: createEvidenceBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId!;
  const result = await submitEvidence(req.tenantId!, req.params.verificationId, userId);
  setAuditData(res as any, { action: "submit_evidence", entityType: "verification_workflow", entityId: req.params.verificationId });
  res.json(ok(result, req));
}));

// W5: /insights — serves <app-ai-insight-panel> module='remediation'
router.get("/insights", authenticate, requirePermission("remediation.task.read"), asyncHandler(async (req: Request, res: Response) => {
  const recommendations = await remediationAiRecommendations(req.user!.tenantId!, (req.query ?? {}) as Record<string, unknown>);
  res.json({ recommendations, module: 'remediation', generatedAt: new Date().toISOString() });
}));

export default router;

