import { Request, Response, Router } from 'express';
import { z } from "zod";

import { authenticate, requirePermission } from '../ports/auth.port';
import {
  requestException,
  approveException,
  rejectException,
  getExceptions,
  checkExpiring,
} from '../services/exception.service';

import { emitEvent, notifyDomainChange } from '../ports/events.port';
import { tryLifecycleTransition } from '../ports/platform.port';
import { requestExceptionBody, reviewExceptionBody, createIntakeBody, createEffectivenessBody, updateJustificationBody, createCompensatingControlsBody, createApprovalDecisionBody, createRenewalRequestBody, createRiskLinksBody, createRenewBody, createRevokeBody, createGracePeriodBody, bulkTransitionBody } from "../schemas/exception.schemas";
import { idParam } from "../../../schemas/common.schemas";

import { swallow, EC } from '@dos/platform-core/resilience';
import { requireOwnership, auditMiddleware, setAuditData, automationMiddleware, validate, enforceMandatoryFields, enforceStageGates, moduleStack, asyncHandler } from '../ports/middleware.port';
import { toErrorMessage, ok } from '@dos/module-sdk';
import * as exceptionQuery from '../repositories/exception-query.repo';
import { getExpiryCalendar, getAgingReport } from '../services/exception-reporting.service';
import { getExceptionTimeline, extendException, revokeException } from '../services/exception-lifecycle.service';
import { grantGracePeriod, runExpiryMonitor, getOverdueExceptions } from '../services/exception-expiry-monitor.service';
import { getRiskLinks as getExceptionRiskLinks, linkExceptionToRisk } from '../services/exception-risk-link.service';
import { intakeException } from '../services/exception-intake.service';
import { upsertJustification, getJustification, getJustificationHistory } from '../services/exception-justification.service';
import { linkCompensatingControl, unlinkCompensatingControl, updateEffectiveness, getCompensatingControls } from '../services/exception-compensating-control.service';
import { recordApprovalDecision, getApprovalHistory } from '../approvals/exception-approval.service';
import { submitRenewalRequest, getRenewalsByException } from '../renewals/exception-renewal-intake.service';
const router = Router();
router.use(moduleStack('exception'));
router.use(auditMiddleware("exception"));
router.use(automationMiddleware("exception"));
router.use(enforceMandatoryFields("exception"));
router.use(enforceStageGates("exception"));

// Hoisted: referenced by the DELETE /compensating-controls/:linkId
// validator. Previously declared at the end of the file, which produced
// a TDZ ReferenceError at module load under CommonJS. Kept module-scoped
// so every route registration sees the same singleton schema.
const genericPayloadSchema = z.record(z.unknown());

// POST / — Request a new exception
router.post("/", authenticate, requirePermission("exception.write"), validate({ body: requestExceptionBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const data = req.body;
    if (!data || !data.controlId || !data.justification) {
      res.status(400).json({ error: "controlId and justification are required" });
      return;
    }
    const result = await requestException(tenantId, { ...data, created_by: req.user?.userId });
    setAuditData(res as any, { action: "create", entityType: "exception", entityId: result.exceptionId, afterState: result });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'exception', event: 'created', entityType: 'exception', entityId: result.exceptionId, data: result } as any)), { tenantId: tenantId, operation: 'grcEvent:exception.exception.created' });
    notifyDomainChange(tenantId, 'exception', 'create', result.exceptionId);
    res.status(201).json(result);
  } catch (err: unknown) {
    const status = toErrorMessage(err).includes("Invalid exception request") ? 400 : 500;
    res.status(status).json({ error: toErrorMessage(err) });
  }
});

// POST /:id/approve — Approve an exception
router.post("/:id/approve", authenticate, requirePermission("exception.write"), requireOwnership('exception'), validate({ params: idParam }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { approverId } = req.body;
    if (!approverId) {
      res.status(400).json({ error: "approverId is required" });
      return;
    }
    const lifecycle = await tryLifecycleTransition(tenantId, {
      moduleCode: 'exception', entityId: id,
      fromStatus: 'submitted', toStatus: 'approved', actorUserId: approverId,
    });
    if (lifecycle.handled && lifecycle.denied) {
      res.status(403).json({ error: 'Transition denied', reason: lifecycle.result?.reason }); return;
    }

    const result = await approveException(tenantId, id, approverId);
    setAuditData(res as any, { action: "update", entityType: "exception", entityId: id, afterState: result });
    notifyDomainChange(tenantId, 'exception', 'update', id);
    res.status(200).json(result);
  } catch (err: unknown) {
    const status = toErrorMessage(err).includes("not found") ? 404
      : toErrorMessage(err).includes("Cannot approve") ? 409 : 500;
    res.status(status).json({ error: toErrorMessage(err) });
  }
});

// POST /:id/reject — Reject an exception
router.post("/:id/reject", authenticate, requirePermission("exception.write"), requireOwnership('exception'), validate({ params: idParam, body: reviewExceptionBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { approverId, reason } = req.body;
    if (!approverId || !reason) {
      res.status(400).json({ error: "approverId and reason are required" });
      return;
    }
    const lifecycle = await tryLifecycleTransition(tenantId, {
      moduleCode: 'exception', entityId: id,
      fromStatus: 'submitted', toStatus: 'rejected', actorUserId: approverId,
    });
    if (lifecycle.handled && lifecycle.denied) {
      res.status(403).json({ error: 'Transition denied', reason: lifecycle.result?.reason }); return;
    }

    const result = await rejectException(tenantId, id, approverId, reason);
    setAuditData(res as any, { action: "update", entityType: "exception", entityId: id, afterState: result });
    notifyDomainChange(tenantId, 'exception', 'update', id);
    res.status(200).json(result);
  } catch (err: unknown) {
    const status = toErrorMessage(err).includes("not found") ? 404
      : toErrorMessage(err).includes("Cannot reject") ? 409 : 500;
    res.status(status).json({ error: toErrorMessage(err) });
  }
});

// GET /expiring — Check exceptions approaching expiry
// NOTE: Must be defined BEFORE /:id to avoid route conflict
router.get("/expiring", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("exception.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const days = req.query.days ? parseInt(req.query.days as string, 10) : undefined;
  const exceptions = await checkExpiring(tenantId, days);
  res.json({ exceptions, count: exceptions.length });
});

// GET / — List exceptions with optional filters
router.get("/", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("exception.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const filters: Record<string, string> = {};
  if (req.query.status) filters.status = req.query.status as string;
  if (req.query.controlId) filters.controlId = req.query.controlId as string;
  const exceptions = await getExceptions(tenantId, filters);
  res.json({ exceptions, count: exceptions.length });
});

router.get("/search", authenticate, requirePermission("exception.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await exceptionQuery.searchEntities(req.tenantId!, {
    query: req.query.q as string,
    status: req.query.status as string,
    exceptionType: req.query.exceptionType as string,
    riskLevel: req.query.riskLevel as string,
    page: Number(req.query.page) || 1,
    pageSize: Number(req.query.pageSize) || 20,
    sortBy: req.query.sortBy as string,
    sortDir: req.query.sortDir as 'ASC' | 'DESC',
  });
  res.json(ok(result, req));
}));

router.get("/dashboard", authenticate, requirePermission("exception.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const [stats, kpis, typeBreakdown, riskBreakdown] = await Promise.all([
    exceptionQuery.getDashboardStats(req.tenantId!),
    exceptionQuery.getKpiMetrics(req.tenantId!),
    exceptionQuery.getTypeBreakdown(req.tenantId!),
    exceptionQuery.getRiskLevelBreakdown(req.tenantId!),
  ]);
  res.json(ok({ stats, kpis, typeBreakdown, riskBreakdown }, req));
}));

router.get("/trends", authenticate, requirePermission("exception.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const aging = await exceptionQuery.getAgingReport(req.tenantId!);
  const expiring = await exceptionQuery.getExpiringExceptions(req.tenantId!);
  res.json(ok({ aging, expiring }, req));
}));

router.get("/cross-module/:linkedModule", authenticate, requirePermission("exception.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const data = await exceptionQuery.getCrossModuleView(req.tenantId!, req.params.linkedModule);
  res.json(ok({ items: data, total: data.length }, req));
}));

router.get("/export", authenticate, requirePermission("exception.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const data = await exceptionQuery.getExportData(req.tenantId!, req.query as Record<string, string>);
  res.json(ok({ rows: data, total: data.length, exportedAt: new Date().toISOString() }, req));
}));

router.get("/reporting/dashboard", authenticate, requirePermission("exception.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const [stats, kpis, typeBreakdown, riskBreakdown] = await Promise.all([
    exceptionQuery.getDashboardStats(req.tenantId!),
    exceptionQuery.getKpiMetrics(req.tenantId!),
    exceptionQuery.getTypeBreakdown(req.tenantId!),
    exceptionQuery.getRiskLevelBreakdown(req.tenantId!),
  ]);
  res.json(ok({ stats, kpis, typeBreakdown, riskBreakdown }, req));
}));

router.get("/reporting/expiry-calendar", authenticate, requirePermission("exception.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const calendar = await getExpiryCalendar(req.tenantId!);
  res.json(ok({ calendar, total: calendar.length }, req));
}));

router.get("/reporting/aging", authenticate, requirePermission("exception.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const aging = await getAgingReport(req.tenantId!);
  res.json(ok({ aging }, req));
}));

router.post("/expiry-monitor/run", authenticate, requirePermission("exception.admin"), asyncHandler(async (req: Request, res: Response) => {
  const result = await runExpiryMonitor(req.tenantId!);
  res.json(ok(result, req));
}));

router.get("/overdue", authenticate, requirePermission("exception.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const overdue = await getOverdueExceptions(req.tenantId!);
  res.json(ok({ exceptions: overdue, count: overdue.length }, req));
}));

router.get("/:id", authenticate, requirePermission("exception.record.read"), validate({ params: idParam }), asyncHandler(async (req: Request, res: Response) => {
  const repo = new (await import('../repositories/exception.repository.js')).ExceptionRepository(req.tenantId!);
  const row = await repo.findById(req.params.id);
  if (!row) { res.status(404).json({ error: 'Exception not found' }); return; }
  res.json(ok(row, req));
}));

router.post("/intake", authenticate, requirePermission("exception.write"), validate({ body: createIntakeBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId!;
  const result = await intakeException(req.tenantId!, { ...req.body, requestedBy: userId });
  setAuditData(res as any, { action: "intake", entityType: "exception", entityId: result.exceptionId, afterState: result });
  notifyDomainChange(req.tenantId, 'exception', 'create', result.exceptionId);
  res.status(201).json(ok(result, req));
}));

router.post("/compensating-controls/:linkId/effectiveness", authenticate, requirePermission("exception.write"), validate({ body: createEffectivenessBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId!;
  const rating = req.body.rating;
  if (!rating || !['effective', 'partially_effective', 'ineffective', 'not_assessed'].includes(rating)) {
    res.status(400).json({ error: 'rating must be effective, partially_effective, ineffective, or not_assessed' }); return;
  }
  const result = await updateEffectiveness(req.tenantId!, req.params.linkId, rating, userId);
  setAuditData(res as any, { action: "update_effectiveness", entityType: "exception_compensating_control", entityId: req.params.linkId, afterState: { rating } });
  res.json(ok(result, req));
}));

router.delete("/compensating-controls/:linkId", authenticate, requirePermission("exception.write"), validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId!;
  await unlinkCompensatingControl(req.tenantId!, req.params.linkId, userId);
  setAuditData(res as any, { action: "unlink_compensating_control", entityType: "exception_compensating_control", entityId: req.params.linkId });
  res.json(ok({ removed: true }, req));
}));

router.get("/:id/justification", authenticate, requirePermission("exception.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await getJustification(req.tenantId!, req.params.id);
  res.json(ok({ justification: result }, req));
}));

router.put("/:id/justification", authenticate, requirePermission("exception.write"), validate({ body: updateJustificationBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId!;
  if (req.body.businessJustification && req.body.businessJustification.length > 10000) {
    res.status(400).json({ error: 'businessJustification must not exceed 10000 characters' }); return;
  }
  if (req.body.impactAnalysis && req.body.impactAnalysis.length > 10000) {
    res.status(400).json({ error: 'impactAnalysis must not exceed 10000 characters' }); return;
  }
  const result = await upsertJustification(req.tenantId!, { exceptionId: req.params.id, ...req.body, justifiedBy: userId });
  setAuditData(res as any, { action: "upsert_justification", entityType: "exception", entityId: req.params.id, afterState: result });
  notifyDomainChange(req.tenantId, 'exception', 'update', req.params.id);
  res.json(ok(result, req));
}));

router.get("/:id/justification/history", authenticate, requirePermission("exception.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 25;
  const result = await getJustificationHistory(req.tenantId!, req.params.id, page, pageSize);
  res.json(ok({ history: result.items, total: result.total, page, pageSize }, req));
}));

router.get("/:id/compensating-controls", authenticate, requirePermission("exception.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 25;
  const result = await getCompensatingControls(req.tenantId!, req.params.id, page, pageSize);
  res.json(ok({ controls: result.items, total: result.total, page, pageSize }, req));
}));

router.post("/:id/compensating-controls", authenticate, requirePermission("exception.write"), validate({ body: createCompensatingControlsBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId!;
  const result = await linkCompensatingControl(req.tenantId!, { exceptionId: req.params.id, ...req.body, linkedBy: userId });
  setAuditData(res as any, { action: "link_compensating_control", entityType: "exception", entityId: req.params.id });
  notifyDomainChange(req.tenantId, 'exception', 'update', req.params.id);
  res.status(201).json(ok(result, req));
}));

router.post("/:id/approval-decision", authenticate, requirePermission("exception.approve"), requireOwnership('exception'), validate({ body: createApprovalDecisionBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId!;
  const result = await recordApprovalDecision(req.tenantId!, { exceptionId: req.params.id, reviewerId: userId, decision: req.body.decision, comments: req.body.comments || '' });
  setAuditData(res as any, { action: "approval_decision", entityType: "exception", entityId: req.params.id, afterState: { decision: req.body.decision } });
  notifyDomainChange(req.tenantId, 'exception', 'update', req.params.id);
  res.json(ok(result, req));
}));

router.get("/:id/approval-history", authenticate, requirePermission("exception.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 25;
  const result = await getApprovalHistory(req.tenantId!, req.params.id, page, pageSize);
  res.json(ok({ history: result.items, total: result.total, page, pageSize }, req));
}));

router.post("/:id/renewal-request", authenticate, requirePermission("exception.approve"), requireOwnership('exception'), validate({ body: createRenewalRequestBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId!;
  const result = await submitRenewalRequest(req.tenantId!, { exceptionId: req.params.id, requestedBy: userId, additionalDays: req.body.additionalDays, justification: req.body.justification, updatedCompensatingControls: req.body.updatedCompensatingControls });
  setAuditData(res as any, { action: "renewal_request", entityType: "exception", entityId: req.params.id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId, module: 'exception', event: 'review_due', entityType: 'exception', entityId: req.params.id, data: result } as any)));
  notifyDomainChange(req.tenantId, 'exception', 'update', req.params.id);
  res.status(201).json(ok(result, req));
}));

router.get("/:id/renewals", authenticate, requirePermission("exception.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 25;
  const result = await getRenewalsByException(req.tenantId!, req.params.id, page, pageSize);
  res.json(ok({ renewals: result.items, total: result.total, page, pageSize }, req));
}));

router.get("/:id/timeline", authenticate, requirePermission("exception.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 50;
  const result = await getExceptionTimeline(req.tenantId!, req.params.id, page, pageSize);
  res.json(ok({ timeline: result.items, total: result.total, page, pageSize }, req));
}));

router.get("/:id/risk-links", authenticate, requirePermission("exception.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 25;
  const result = await getExceptionRiskLinks(req.tenantId!, req.params.id, page, pageSize);
  res.json(ok({ links: result.items, total: result.total, page, pageSize }, req));
}));

router.post("/:id/risk-links", authenticate, requirePermission("exception.write"), validate({ body: createRiskLinksBody }), asyncHandler(async (req: Request, res: Response) => {
  const _userId = req.user!.userId!;
  const link = await linkExceptionToRisk(req.tenantId!, { exceptionId: req.params.id, riskId: req.body.riskId || null, controlId: req.body.controlId || null, linkType: req.body.linkType || 'direct', impactDescription: req.body.impactDescription || '', residualRiskLevel: req.body.residualRiskLevel || 'medium', compensatingControlIds: req.body.compensatingControlIds || [], compensatingControlEffectiveness: req.body.compensatingControlEffectiveness || 'not_assessed' });
  setAuditData(res as any, { action: "link_risk", entityType: "exception", entityId: req.params.id });
  res.status(201).json(ok(link, req));
}));

router.post("/:id/renew", authenticate, requirePermission("exception.approve"), requireOwnership('exception'), validate({ body: createRenewBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId!;
  const result = await extendException(req.tenantId!, req.params.id, { additionalDays: req.body.additionalDays, justification: req.body.justification, requestedBy: userId });
  setAuditData(res as any, { action: "renew", entityType: "exception", entityId: req.params.id });
  notifyDomainChange(req.tenantId, 'exception', 'update', req.params.id);
  res.json(ok(result, req));
}));

router.post("/:id/revoke", authenticate, requirePermission("exception.approve"), requireOwnership('exception'), validate({ body: createRevokeBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId!;
  const result = await revokeException(req.tenantId!, req.params.id, { reason: req.body.reason, revokedBy: userId, effectiveImmediately: req.body.effectiveImmediately ?? true });
  setAuditData(res as any, { action: "revoke", entityType: "exception", entityId: req.params.id });
  notifyDomainChange(req.tenantId, 'exception', 'update', req.params.id);
  res.json(ok(result, req));
}));

router.post("/:id/grace-period", authenticate, requirePermission("exception.approve"), requireOwnership('exception'), validate({ body: createGracePeriodBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId!;
  const { graceDays, reason } = req.body;
  const result = await grantGracePeriod(req.tenantId!, req.params.id, graceDays, userId, reason);
  setAuditData(res as any, { action: "grant_grace_period", entityType: "exception", entityId: req.params.id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId, module: 'exception', event: 'extended', entityType: 'exception', entityId: req.params.id, data: result } as any)));
  notifyDomainChange(req.tenantId, 'exception', 'update', req.params.id);
  res.status(201).json(ok(result, req));
}));

router.post("/bulk/transition", authenticate, requirePermission("exception.bulk"), validate({ body: bulkTransitionBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId!;
  const ids: string[] = req.body.ids || [];
  const toStatus = req.body.status;
  const results: Array<{ id: string; success: boolean; error?: string }> = [];
  for (const id of ids) {
    try {
      // DAuth lifecycle gate — same pattern as single approve/reject
      const lifecycle = await tryLifecycleTransition(req.tenantId!, {
        moduleCode: 'exception', entityId: id,
        fromStatus: 'submitted', toStatus, actorUserId: userId,
      });
      if (lifecycle.handled && lifecycle.denied) {
        results.push({ id, success: false, error: `Transition denied: ${lifecycle.result?.reason || 'authorization failed'}` });
        continue;
      }

      if (toStatus === 'approved') await approveException(req.tenantId!, id, userId);
      else if (toStatus === 'rejected') await rejectException(req.tenantId!, id, userId, req.body.reason || 'Bulk rejection');
      results.push({ id, success: true });
    } catch (e: unknown) {
      results.push({ id, success: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  res.json(ok({ results, succeeded: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length }, req));
}));

export default router;
