import { Request, Response, Router } from 'express';
import { z } from "zod";
// ============================================
// Shahin-Ai — Action Item Routes
// ============================================


import { authenticate, requirePermission } from '../ports/auth.port';

import { getActionItems, createActionItem, updateActionItem, getDailyDigest, getConsolidatedActionCenter } from '../services/action-item.service';
import { emitEvent } from '../ports/events.port';
import { errMsg } from "../../i18n/error-messages";
import { createActionBody, updateActionBody, createTransitionBody, createCancelBody, createReopenBody, createBlockersBody, createResolveBody, createDependenciesBody, createEvidenceBody, bulkTransitionBody } from '../schemas/action.schemas';

import { swallow, EC , catchHandler } from '@dos/platform-core/resilience';
import { auditMiddleware, setAuditData, automationMiddleware, lifecycleGate, enforceMandatoryFields, enforceStageGates, requireOwnership as _requireOwnership, validate, moduleStack, asyncHandler } from '../ports/middleware.port';
import { toErrorMessage, ok, action as _action } from '@dos/module-sdk';
import type { AuthenticatedRequest as _AuthenticatedRequest } from '@dos/types';
import * as actionQuery from '../repositories/action-query.repo';
import { transitionStatus as actionTransitionStatus, bulkTransitionStatus, getStatusHistory, cancelItem, reopenItem } from '../services/action-lifecycle.service';
import { getActionDashboard, getActionsBySource, getActionsByAssignee, getResolutionTimeStats, getAgingAnalysis as _getAgingAnalysis, getSlaComplianceReport } from '../services/action-reporting.service';
import { getActionProgress, reportBlocker, resolveBlocker, getBlockers, addDependency, getDependencyChain, addCompletionEvidence, getCompletionEvidence } from '../services/action-tracking.service';
const genericPayloadSchema = z.record(z.unknown());

const router = Router();
router.use(moduleStack('action'));
router.use(auditMiddleware("action"));
router.use(automationMiddleware("action"));
router.use(enforceMandatoryFields("action"));
router.use(enforceStageGates("action"));

// GET /api/action-items
router.get("/", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("action.item.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { assignedTo, status, sourceType } = req.query;
  const items = await getActionItems(tenantId, {
  assignedTo: assignedTo as string,
  status: status as string,
  sourceType: sourceType as string,
  });
  res.json(items);
});

// POST /api/action-items
router.post("/", authenticate, requirePermission("action.write"), validate({ body: createActionBody }), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { title, description, sourceType, sourceId, assignedTo, deadline } = req.body;
  if (!title || !sourceType || !sourceId || !assignedTo) {
  res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
  return;
  }
  try {
  const item = await createActionItem(tenantId, { title, description, sourceType, sourceId, assignedTo, deadline, createdBy: req.user!.userId! as string });
  setAuditData(res as any, { action: "create", entityType: "action_item", entityId: item.actionId, afterState: item });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'action', event: 'created', entityType: 'action_item', entityId: item.actionId, data: item } as any)), { tenantId: tenantId, operation: 'grcEvent:action.action_item.created' });
  res.status(201).json(item);
  } catch (_err: unknown) {
  res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// PUT /api/action-items/:id
router.put("/:id", authenticate, requirePermission("action.write"), validate({ body: updateActionBody }), lifecycleGate('action'), async (req: Request, res: Response) => {
  try {
  const tenantId = req.tenantId!;
  const item = await updateActionItem(tenantId, req.params.id, req.body);
  setAuditData(res as any, { action: "update", entityType: "action_item", entityId: req.params.id as string, afterState: item });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'action', event: 'updated', entityType: 'action_item', entityId: req.params.id, data: item } as any)), { tenantId: tenantId, operation: 'grcEvent:action.action_item.updated' });
  res.json(item);
  } catch (err: unknown) {
  if (toErrorMessage(err) === 'Action item not found') { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// DELETE /api/action-items/:id
router.delete("/:id", validate({ body: genericPayloadSchema }), authenticate, requirePermission("action.write"), async (req: Request, res: Response) => {
  try {
  const tenantId = req.tenantId!;
  const _item = await updateActionItem(tenantId, req.params.id, {} as any);
  setAuditData(res as any, { action: "delete", entityType: "action_item", entityId: req.params.id as string });
  emitEvent(({ tenantId, userId: req.user!.userId!, module: 'action', event: 'deleted', entityType: 'action_item', entityId: req.params.id, data: { status: 'deleted' } } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.json({ message: "Action item deleted", id: req.params.id });
  } catch (err: unknown) {
  if (toErrorMessage(err) === 'Action item not found') { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// GET /api/action-items/consolidated
router.get("/consolidated", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("action.item.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const userId = req.query.userId as string || req.user!.userId! as string;
  const items = await getConsolidatedActionCenter(tenantId, req.query.all === 'true' ? undefined : userId);
  res.json({ items, total: items.length });
});

// GET /api/action-items/digest
router.get("/digest", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("action.item.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId! as string;
  const digest = await getDailyDigest(tenantId, userId);
  res.json(digest);
});

router.get("/search", authenticate, requirePermission("action.item.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await actionQuery.searchEntities(req.tenantId!, {
    query: req.query.q as string,
    status: req.query.status as string,
    assignedTo: req.query.assignedTo as string,
    sourceType: req.query.sourceType as string,
    page: Number(req.query.page) || 1,
    pageSize: Number(req.query.pageSize) || 20,
    sortBy: req.query.sortBy as string,
    sortDir: req.query.sortDir as 'ASC' | 'DESC',
  });
  res.json(ok(result, req));
}));

router.get("/dashboard", authenticate, requirePermission("action.item.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const [stats, kpis, sourceBreakdown, priorityBreakdown, assigneeWorkload] = await Promise.all([
    actionQuery.getDashboardStats(req.tenantId!),
    actionQuery.getKpiMetrics(req.tenantId!),
    actionQuery.getSourceBreakdown(req.tenantId!),
    actionQuery.getPriorityBreakdown(req.tenantId!),
    actionQuery.getAssigneeWorkload(req.tenantId!),
  ]);
  res.json(ok({ stats, kpis, sourceBreakdown, priorityBreakdown, assigneeWorkload }, req));
}));

router.get("/trends", authenticate, requirePermission("action.item.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const aging = await actionQuery.getAgingReport(req.tenantId!);
  const resolutionTime = await getResolutionTimeStats(req.tenantId!);
  res.json(ok({ aging, resolutionTime }, req));
}));

router.get("/cross-module/:linkedModule", authenticate, requirePermission("action.item.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const data = await actionQuery.getCrossModuleView(req.tenantId!, req.params.linkedModule);
  res.json(ok({ items: data, total: data.length }, req));
}));

router.get("/export", authenticate, requirePermission("action.item.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const data = await actionQuery.getExportData(req.tenantId!, req.query as Record<string, string>);
  res.json(ok({ rows: data, total: data.length, exportedAt: new Date().toISOString() }, req));
}));

router.get("/reporting/full", authenticate, requirePermission("action.item.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const dashboard = await getActionDashboard(req.tenantId!);
  res.json(ok(dashboard, req));
}));

router.get("/reporting/by-source", authenticate, requirePermission("action.item.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const bySource = await getActionsBySource(req.tenantId!);
  res.json(ok({ bySource }, req));
}));

router.get("/reporting/by-assignee", authenticate, requirePermission("action.item.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const byAssignee = await getActionsByAssignee(req.tenantId!);
  res.json(ok({ byAssignee }, req));
}));

router.get("/reporting/sla", authenticate, requirePermission("action.item.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const report = await getSlaComplianceReport(req.tenantId!);
  res.json(ok(report, req));
}));

router.get("/:id/history", authenticate, requirePermission("action.item.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const history = await getStatusHistory(req.tenantId!, req.params.id);
  res.json(ok({ history }, req));
}));

router.get("/:id/progress", authenticate, requirePermission("action.item.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const progress = await getActionProgress(req.tenantId!, req.params.id);
  res.json(ok(progress, req));
}));

router.get("/:id/blockers", authenticate, requirePermission("action.item.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const blockers = await getBlockers(req.tenantId!, req.params.id);
  res.json(ok({ blockers, total: blockers.length }, req));
}));

router.get("/:id/dependencies", authenticate, requirePermission("action.item.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const chain = await getDependencyChain(req.tenantId!, req.params.id);
  res.json(ok({ dependencies: chain, total: chain.length }, req));
}));

router.get("/:id/evidence", authenticate, requirePermission("action.item.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const evidence = await getCompletionEvidence(req.tenantId!, req.params.id);
  res.json(ok({ evidence, total: evidence.length }, req));
}));

router.post("/:id/transition", authenticate, requirePermission("action.write"), validate({ body: createTransitionBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId!;
  const result = await actionTransitionStatus(req.tenantId!, req.params.id, req.body.status, userId, req.body.note);
  setAuditData(res as any, { action: "transition", entityType: "action_item", entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId, module: 'action', event: 'transitioned', entityType: 'action_item', entityId: req.params.id, data: result } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:action.action_item.transitioned' });
  res.json(ok(result, req));
}));

router.post("/:id/cancel", authenticate, requirePermission("action.write"), validate({ body: createCancelBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId!;
  const result = await cancelItem(req.tenantId!, req.params.id, userId, req.body.reason);
  setAuditData(res as any, { action: "cancel", entityType: "action_item", entityId: req.params.id });
  res.json(ok(result, req));
}));

router.post("/:id/reopen", authenticate, requirePermission("action.write"), validate({ body: createReopenBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId!;
  const result = await reopenItem(req.tenantId!, req.params.id, userId);
  setAuditData(res as any, { action: "reopen", entityType: "action_item", entityId: req.params.id });
  res.json(ok(result, req));
}));

router.post("/:id/blockers", authenticate, requirePermission("action.write"), validate({ body: createBlockersBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId!;
  const blocker = await reportBlocker(req.tenantId!, req.params.id, req.body.description, userId);
  res.status(201).json(ok(blocker, req));
}));

router.post("/:id/blockers/:blockerId/resolve", authenticate, requirePermission("action.write"), validate({ body: createResolveBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId!;
  const result = await resolveBlocker(req.tenantId!, req.params.blockerId, userId);
  res.json(ok(result, req));
}));

router.post("/:id/dependencies", authenticate, requirePermission("action.write"), validate({ body: createDependenciesBody }), asyncHandler(async (req: Request, res: Response) => {
  const dep = await addDependency(req.tenantId!, req.params.id, req.body.dependsOnId);
  res.status(201).json(ok(dep, req));
}));

router.post("/:id/evidence", authenticate, requirePermission("action.write"), validate({ body: createEvidenceBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId!;
  const evidence = await addCompletionEvidence(req.tenantId!, { itemId: req.params.id, description: req.body.description, fileReference: req.body.fileReference, submittedBy: userId });
  res.status(201).json(ok(evidence, req));
}));

router.post("/bulk/transition", authenticate, requirePermission("action.bulk"), validate({ body: bulkTransitionBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId!;
  const result = await bulkTransitionStatus(req.tenantId!, req.body.ids, req.body.status, userId);
  res.json(ok(result, req));
}));

export default router;
