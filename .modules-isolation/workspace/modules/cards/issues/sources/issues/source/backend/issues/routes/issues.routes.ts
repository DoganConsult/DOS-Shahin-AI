import { emitEvent as _emitEvent } from '../ports/events.port';
import { z } from "zod";
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { Router, Response } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { ok, action } from '@dos/module-sdk';
import { auditMiddleware, asyncHandler, requireOwnership, validate, setAuditData } from '../ports/middleware.port';
import type { AuthenticatedRequest } from '@dos/types';

const genericPayloadSchema = z.record(z.unknown());

import {
  listIssues, getIssueById, createIssue, updateIssue, deleteIssue,
} from '../controllers/issues.controller';
import * as issuesQuery from '../repositories/issues-query.repo';
import { transitionStatus, getIssueSla, getLifecycleHistory } from '../services/issues-lifecycle.service';
import { submitResolution, verifyResolution, reopenIssue, getRootCauseDistribution, getMeanTimeToResolution } from '../services/issues-resolution.service';
import { reassignIssue, getIssuesByAssignee } from '../services/issues-assignment.service';
import { getEscalationHistory, escalateIssue } from '../services/issues-escalation.service';
import { getIssuesDashboard, getIssueTrends, getSlaComplianceReport } from '../services/issues-reporting.service';
import { getIssueLinks, linkIssueToEntity, unlinkIssueFromEntity } from '../services/issues-risk-link.service';
import { emitIssuesEvent as _emitIssuesEvent } from '../services/issues-event.service';
import { createIssueBody, updateIssueBody, listIssuesQuery, resolveIssueBody as _resolveIssueBody, reassignIssueBody as _reassignIssueBody, createTransitionBody, createResolveBody, createVerifyBody, createReopenBody, createReassignBody, createEscalateBody, createRiskLinkBody, bulkTransitionBody } from '../schemas/issues.schemas';
const router = Router();
router.use(authenticate);
router.use(auditMiddleware('issues'));

router.get('/', requirePermission('issues.record.read'), validate({ query: listIssuesQuery }), asyncHandler(listIssues));

router.get('/search', requirePermission('issues.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await issuesQuery.searchEntities(req.tenantId!, {
    query: req.query.q as string,
    status: req.query.status as string,
    category: req.query.category as string,
    severity: req.query.severity as string,
    assignedTo: req.query.assignedTo as string,
    sourceModule: req.query.sourceModule as string,
    overdueOnly: req.query.overdueOnly === 'true',
    page: Number(req.query.page) || 1,
    pageSize: Number(req.query.pageSize) || 20,
    sortBy: req.query.sortBy as string,
    sortDir: req.query.sortDir as 'ASC' | 'DESC',
  });
  res.json(ok(result, req));
}));

router.get('/dashboard', requirePermission('issues.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const dashboard = await getIssuesDashboard(req.tenantId!);
  res.json(ok(dashboard, req));
}));

router.get('/trends', requirePermission('issues.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const days = Number(req.query.days) || 30;
  const granularity = (req.query.granularity as 'day' | 'week' | 'month') || 'day';
  const trends = await getIssueTrends(req.tenantId!, days, granularity);
  res.json(ok({ trends }, req));
}));

router.get('/sla-compliance', requirePermission('issues.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const report = await getSlaComplianceReport(req.tenantId!);
  res.json(ok({ report }, req));
}));

router.get('/root-cause-distribution', requirePermission('issues.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const dist = await getRootCauseDistribution(req.tenantId!);
  res.json(ok({ distribution: dist }, req));
}));

router.get('/mttr', requirePermission('issues.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const mttr = await getMeanTimeToResolution(req.tenantId!, {
    category: req.query.category as string,
    severity: req.query.severity as string,
  });
  res.json(ok(mttr, req));
}));

router.get('/my-issues', requirePermission('issues.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId || '';
  const issues = await getIssuesByAssignee(req.tenantId!, userId, req.query.status as string);
  res.json(ok({ issues, total: issues.length }, req));
}));

router.get('/:id', requirePermission('issues.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getIssueById));

router.post('/', requirePermission('issues.record.write'), validate({ body: createIssueBody }), asyncHandler(createIssue));

router.put('/:id', requirePermission('issues.record.write'), requireOwnership('issue'), validate({ body: updateIssueBody }), asyncHandler(updateIssue));

router.delete('/:id', requirePermission('issues.record.delete'), requireOwnership('issue'), validate({ body: genericPayloadSchema }), asyncHandler(deleteIssue));

router.get('/:id/sla', requirePermission('issues.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const sla = await getIssueSla(req.tenantId!, req.params.id);
  res.json(ok(sla, req));
}));

router.get('/:id/history', requirePermission('issues.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const history = await getLifecycleHistory(req.tenantId!, req.params.id);
  res.json(ok({ history }, req));
}));

router.get('/:id/escalation-history', requirePermission('issues.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const chain = await getEscalationHistory(req.tenantId!, req.params.id);
  res.json(ok({ chain }, req));
}));

router.get('/:id/risk-links', requirePermission('issues.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const links = await getIssueLinks(req.tenantId!, req.params.id);
  res.json(ok({ links, total: links.length }, req));
}));

router.post('/:id/transition', requirePermission('issues.record.approve'), validate({ body: createTransitionBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId!;
  const result = await transitionStatus(req.tenantId!, req.params.id, req.body.status, userId, req.body.reason);
  setAuditData(res as any, { action: 'transition', entityType: 'issue', entityId: req.params.id });
  res.json(ok(result, req));
}));

router.post('/:id/resolve', requirePermission('issues.record.write'), validate({ body: createResolveBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId!;
  const result = await submitResolution(req.tenantId!, req.params.id, req.body, userId);
  setAuditData(res as any, { action: 'resolve', entityType: 'issue', entityId: req.params.id });
  res.json(ok(result, req));
}));

router.post('/:id/verify', requirePermission('issues.record.approve'), validate({ body: createVerifyBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId!;
  await verifyResolution(req.tenantId!, req.params.id, userId, req.body.effectivenessNotes);
  setAuditData(res as any, { action: 'verify', entityType: 'issue', entityId: req.params.id });
  res.json(action('Resolution verified', req));
}));

router.post('/:id/reopen', requirePermission('issues.record.write'), validate({ body: createReopenBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId!;
  await reopenIssue(req.tenantId!, req.params.id, userId, req.body.reason);
  setAuditData(res as any, { action: 'reopen', entityType: 'issue', entityId: req.params.id });
  res.json(action('Issue reopened', req));
}));

router.post('/:id/reassign', requirePermission('issues.record.write'), validate({ body: createReassignBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId!;
  await reassignIssue(req.tenantId!, req.params.id, req.body.assignee, userId, req.body.reason);
  setAuditData(res as any, { action: 'reassign', entityType: 'issue', entityId: req.params.id });
  res.json(action('Issue reassigned', req));
}));

router.post('/:id/escalate', requirePermission('issues.record.approve'), validate({ body: createEscalateBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId!;
  const entry = await escalateIssue(req.tenantId!, req.params.id, req.body.level, req.body.assignee, req.body.reason, userId);
  setAuditData(res as any, { action: 'escalate', entityType: 'issue', entityId: req.params.id });
  res.json(ok(entry, req));
}));

router.post('/:id/risk-link', requirePermission('issues.record.write'), validate({ body: createRiskLinkBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId!;
  const link = await linkIssueToEntity(req.tenantId!, req.params.id, 'risk', req.body.riskId, userId, req.body.propagateImpact ?? false);
  setAuditData(res as any, { action: 'link_risk', entityType: 'issue', entityId: req.params.id });
  res.status(201).json(ok(link, req));
}));

router.delete('/:id/risk-link/:riskId', requirePermission('issues.record.write'), validate({ body: genericPayloadSchema }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId!;
  await unlinkIssueFromEntity(req.tenantId!, req.params.id, 'risk', req.params.riskId, userId);
  res.json(action('Risk link removed', req));
}));

router.get('/:id/links', requirePermission('issues.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const links = await getIssueLinks(req.tenantId!, req.params.id);
  res.json(ok({ links, total: links.length }, req));
}));

router.post('/bulk/transition', requirePermission('issues.record.bulk'), validate({ body: bulkTransitionBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId!;
  const ids: string[] = req.body.ids || [];
  const toStatus = req.body.status;
  const results: Array<{ id: string; success: boolean; error?: string }> = [];
  for (const id of ids) {
    try {
      await transitionStatus(req.tenantId!, id, toStatus, userId, req.body.reason);
      results.push({ id, success: true });
    } catch (e: unknown) {

      results.push({ id, success: false, error: e.message });
    }
  }
  res.json(ok({ results, succeeded: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length }, req));
}));

export default router;

