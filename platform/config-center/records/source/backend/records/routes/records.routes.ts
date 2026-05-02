import { emitEvent as _emitEvent } from '../ports/events.port';
import { z } from "zod";
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { Router, Response } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { asyncHandler, requireOwnership, validate, auditMiddleware, setAuditData } from '../ports/middleware.port';
import { ok, action as _action } from '@dos/module-sdk';
import type { AuthenticatedRequest } from '@dos/types';

const genericPayloadSchema = z.record(z.unknown());

import {
  listRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
} from '../controllers/records.controller';
import * as recordsQuery from '../repositories/records-query.repo';
import { transitionStatus, getLifecycleHistory } from '../services/records-lifecycle.service';
import { searchRecords, crossModuleDiscovery, saveSearch, runSavedSearch } from '../services/records-search.service';
import { placeHold, releaseHold, getActiveHolds, getHoldReport } from '../services/records-legal-hold.service';
import { requestDisposal, approveDisposal, rejectDisposal, executeDisposal, batchDisposal } from '../services/records-disposal.service';
import { checkCompliance, getRetentionScheduleReport, enforceRetentionPolicies, createRetentionPolicy, getApplicablePolicy as _getApplicablePolicy } from '../services/records-retention.service';
import { suggestClassification, applyClassification, applyTags, getClassificationAuditTrail, getSensitivityLabels, getClassificationRules, createClassificationRule } from '../services/records-classification.service';
import { emitRecordsEvent as _emitRecordsEvent } from '../services/records-event.service';
import { createRecordBody, updateRecordBody, listRecordsQuery, createPoliciesBody, createEnforceBody, createLegalHoldsBody, createReleaseBody, createRulesBody, createSavedSearchesBody, createRunBody, createTransitionBody, createClassifyBody, createTagsBody, createDisposalBody, createApproveBody, createRejectBody, createExecuteBody, bulkDisposalBody, bulkTransitionBody, bulkClassifyBody } from '../schemas/records.schemas';
const router = Router();
router.use(authenticate);
router.use(auditMiddleware('records'));

router.get('/', requirePermission('records.record.read'), validate({ query: listRecordsQuery }), asyncHandler(listRecords));

router.get('/search', requirePermission('records.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await recordsQuery.searchEntities(req.tenantId!, {
    query: req.query.q as string,
    status: req.query.status as string,
    recordType: req.query.recordType as string,
    classification: req.query.classification as string,
    legalHold: req.query.legalHold === 'true' ? true : req.query.legalHold === 'false' ? false : undefined,
    page: Number(req.query.page) || 1,
    pageSize: Number(req.query.pageSize) || 20,
    sortBy: req.query.sortBy as string,
    sortDir: req.query.sortDir as 'ASC' | 'DESC',
  });
  res.json(ok(result, req));
}));

router.get('/dashboard', requirePermission('records.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const [stats, kpis, classificationBreakdown, retentionCompliance] = await Promise.all([
    recordsQuery.getDashboardStats(req.tenantId!),
    recordsQuery.getKpiMetrics(req.tenantId!),
    recordsQuery.getClassificationBreakdown(req.tenantId!),
    recordsQuery.getRetentionCompliance(req.tenantId!),
  ]);
  res.json(ok({ stats, kpis, classificationBreakdown, retentionCompliance }, req));
}));

router.get('/trends', requirePermission('records.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const aging = await recordsQuery.getAgingReport(req.tenantId!);
  const disposalQueue = await recordsQuery.getDisposalQueue(req.tenantId!);
  res.json(ok({ aging, disposalQueue }, req));
}));

router.get('/cross-module/:linkedModule', requirePermission('records.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await recordsQuery.getCrossModuleView(req.tenantId!, req.params.linkedModule);
  res.json(ok({ items: data, total: data.length }, req));
}));

router.get('/export', requirePermission('records.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await recordsQuery.getExportData(req.tenantId!, req.query as Record<string, string>);
  res.json(ok({ rows: data, total: data.length, exportedAt: new Date().toISOString() }, req));
}));

router.get('/retention/schedule', requirePermission('records.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const report = await getRetentionScheduleReport(req.tenantId!);
  res.json(ok(report, req));
}));

router.get('/retention/compliance', requirePermission('records.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const recordId = req.query.recordId as string;
  if (recordId) {
    const result = await checkCompliance(req.tenantId!, recordId);
    res.json(ok(result, req));
  } else {
    const report = await getRetentionScheduleReport(req.tenantId!);
    res.json(ok(report, req));
  }
}));

router.post('/retention/policies', requirePermission('records.record.configure'), validate({ body: createPoliciesBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const policy = await createRetentionPolicy(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create_retention_policy', entityType: 'retention_policy', entityId: policy.policyId });
  res.status(201).json(ok(policy, req));
}));

router.post('/retention/enforce', requirePermission('records.record.configure'), validate({ body: createEnforceBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const count = await enforceRetentionPolicies(req.tenantId!);
  res.json(ok({ enforced: count }, req));
}));

router.get('/legal-holds', requirePermission('records.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const holds = await getActiveHolds(req.tenantId!);
  res.json(ok({ holds, total: holds.length }, req));
}));

router.get('/legal-holds/report', requirePermission('records.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const report = await getHoldReport(req.tenantId!);
  res.json(ok(report, req));
}));

router.post('/legal-holds', requirePermission('records.record.approve'), validate({ body: createLegalHoldsBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId!;
  const hold = await placeHold(req.tenantId!, { ...req.body, placedBy: userId });
  setAuditData(res as any, { action: 'place_legal_hold', entityType: 'legal_hold', entityId: hold.holdId });
  res.status(201).json(ok(hold, req));
}));

router.post('/legal-holds/:holdId/release', requirePermission('records.record.approve'), validate({ body: createReleaseBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId!;
  const hold = await releaseHold(req.tenantId!, req.params.holdId, userId, req.body.reason);
  setAuditData(res as any, { action: 'release_legal_hold', entityType: 'legal_hold', entityId: req.params.holdId });
  res.json(ok(hold, req));
}));

router.get('/classification/rules', requirePermission('records.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const rules = await getClassificationRules(req.tenantId!);
  res.json(ok({ rules, total: rules.length }, req));
}));

router.post('/classification/rules', requirePermission('records.record.configure'), validate({ body: createRulesBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const rule = await createClassificationRule(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create_classification_rule', entityType: 'classification_rule', entityId: rule.ruleId });
  res.status(201).json(ok(rule, req));
}));

router.get('/classification/labels', requirePermission('records.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const labels = await getSensitivityLabels(req.tenantId!);
  res.json(ok({ labels }, req));
}));

router.get('/disposal-queue', requirePermission('records.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const queue = await recordsQuery.getDisposalQueue(req.tenantId!);
  res.json(ok({ items: queue, total: queue.length }, req));
}));

router.get('/full-text-search', requirePermission('records.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const results = await searchRecords(req.tenantId!, {
    query: req.query.q as string,
    recordType: req.query.recordType as string,
    classification: req.query.classification as string,
    status: req.query.status as string,
    legalHold: req.query.legalHold === 'true',
  });
  res.json(ok(results, req));
}));

router.get('/cross-module-discover/:sourceModule', requirePermission('records.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const results = await crossModuleDiscovery(req.tenantId!, req.params.sourceModule);
  res.json(ok(results, req));
}));

router.post('/saved-searches', requirePermission('records.record.write'), validate({ body: createSavedSearchesBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId!;
  const search = await saveSearch(req.tenantId!, userId, req.body.name, req.body.filters);
  res.status(201).json(ok(search, req));
}));

router.post('/saved-searches/:searchId/run', requirePermission('records.record.read'), validate({ body: createRunBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId!;
  const results = await runSavedSearch(req.tenantId!, req.params.searchId, userId);
  res.json(ok(results, req));
}));

router.get('/:id', requirePermission('records.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getRecordById));

router.post('/', requirePermission('records.record.write'), validate({ body: createRecordBody }), asyncHandler(createRecord));

router.put('/:id', requirePermission('records.record.write'), requireOwnership('record'), validate({ body: updateRecordBody }), asyncHandler(updateRecord));

router.delete('/:id', requirePermission('records.record.delete'), requireOwnership('record'), validate({ body: genericPayloadSchema }), asyncHandler(deleteRecord));

router.get('/:id/history', requirePermission('records.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const history = await getLifecycleHistory(req.tenantId!, req.params.id);
  res.json(ok({ history }, req));
}));

router.get('/:id/classification/audit', requirePermission('records.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const trail = await getClassificationAuditTrail(req.tenantId!, req.params.id);
  res.json(ok({ trail }, req));
}));

router.post('/:id/transition', requirePermission('records.record.approve'), validate({ body: createTransitionBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId!;
  const result = await transitionStatus(req.tenantId!, req.params.id, req.body.status, userId, req.body.reason);
  setAuditData(res as any, { action: 'transition', entityType: 'record', entityId: req.params.id });
  res.json(ok(result, req));
}));

router.post('/:id/classify', requirePermission('records.record.write'), validate({ body: createClassifyBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId!;
  if (req.body.classification) {
    const result = await applyClassification(req.tenantId!, req.params.id, req.body.classification, userId, req.body.reason);
    setAuditData(res as any, { action: 'classify', entityType: 'record', entityId: req.params.id });
    res.json(ok(result, req));
  } else {
    const suggestion = await suggestClassification(req.tenantId!, req.body.title || '', req.body.description || '', req.body.recordType || '');
    res.json(ok(suggestion, req));
  }
}));

router.post('/:id/tags', requirePermission('records.record.write'), validate({ body: createTagsBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const _userId = req.user!.userId!;
  await applyTags(req.tenantId!, req.params.id, req.body.tags);
  res.json(ok({ tagged: true }, req));
}));

router.post('/:id/disposal', requirePermission('records.record.write'), validate({ body: createDisposalBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId!;
  const request = await requestDisposal(req.tenantId!, { recordId: req.params.id, ...req.body, requestedBy: userId });
  setAuditData(res as any, { action: 'request_disposal', entityType: 'disposal_request', entityId: request.requestId });
  res.status(201).json(ok(request, req));
}));

router.post('/:id/disposal/:requestId/approve', requirePermission('records.record.approve'), validate({ body: createApproveBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId!;
  const result = await approveDisposal(req.tenantId!, req.params.requestId, userId, req.body.comments);
  setAuditData(res as any, { action: 'approve_disposal', entityType: 'disposal_request', entityId: req.params.requestId });
  res.json(ok(result, req));
}));

router.post('/:id/disposal/:requestId/reject', requirePermission('records.record.approve'), validate({ body: createRejectBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId!;
  const result = await rejectDisposal(req.tenantId!, req.params.requestId, userId, req.body.reason);
  setAuditData(res as any, { action: 'reject_disposal', entityType: 'disposal_request', entityId: req.params.requestId });
  res.json(ok(result, req));
}));

router.post('/:id/disposal/:requestId/execute', requirePermission('records.record.approve'), validate({ body: createExecuteBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId!;
  const result = await executeDisposal(req.tenantId!, req.params.requestId, userId);
  setAuditData(res as any, { action: 'execute_disposal', entityType: 'disposal_request', entityId: req.params.requestId });
  res.json(ok(result, req));
}));

router.post('/bulk/disposal', requirePermission('records.record.bulk'), validate({ body: bulkDisposalBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId!;
  const result = await batchDisposal(req.tenantId!, req.body.recordIds, userId, req.body.disposalMethod);
  res.json(ok(result, req));
}));

router.post('/bulk/transition', requirePermission('records.record.bulk'), validate({ body: bulkTransitionBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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

router.post('/bulk/classify', requirePermission('records.record.bulk'), validate({ body: bulkClassifyBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId!;
  const ids: string[] = req.body.ids || [];
  const results: Array<{ id: string; success: boolean; error?: string }> = [];
  for (const id of ids) {
    try {
      await applyClassification(req.tenantId!, id, req.body.classification, userId, req.body.reason);
      results.push({ id, success: true });
    } catch (e: unknown) {

      results.push({ id, success: false, error: e.message });
    }
  }
  res.json(ok({ results, succeeded: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length }, req));
}));

export default router;

