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
  listDataSubjectRequests,
  getDataSubjectRequestById,
  createDataSubjectRequest,
  updateDataSubjectRequest,
  deleteDataSubjectRequest,
} from '../controllers/privacy.controller';
import * as privacyQuery from '../repositories/privacy-query.repo';
import { createDsr as _createDsr, getDsr as _getDsr, canTransitionDsr as _canTransitionDsr } from '../services/privacy-dsr-processor.service';
import { reportBreach, getBreach, updateBreachStatus, listBreaches, type BreachStatus, type BreachSeverity } from '../services/privacy-breach-handler.service';
import { grantConsent, withdrawConsent, getConsentsBySubject, expireOverdueConsents, getConsentAuditTrail } from '../services/privacy-consent-manager.service';
import { createTransferAssessment, approveTransferAssessment, listTransferAssessments, getTransfersByCountry } from '../services/privacy-cross-border.service';
import { createProcessingActivity, listProcessingActivities, generateRopa, getCrossBorderTransfers } from '../services/privacy-data-mapping.service';
import { getDsrDashboard, getBreachDashboard, getConsentDashboard } from '../services/privacy-reporting.service';
import { createDsrBody, updateDsrBody, listDsrQuery, createBreachesBody, createTransitionBody, createConsentsBody, createWithdrawBody, createExpireOverdueBody, createTransfersBody, createApproveBody, createDataMappingBody } from '../schemas/privacy.schemas';
import { emitPrivacyEvent as _emitPrivacyEvent } from '../services/privacy-event.service';
const router = Router();
router.use(authenticate);
router.use(auditMiddleware('privacy'));

router.get('/', requirePermission('privacy.record.read'), validate({ query: listDsrQuery }), asyncHandler(listDataSubjectRequests));

router.get('/search', requirePermission('privacy.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await privacyQuery.searchEntities(req.tenantId!, {
    query: req.query.q as string,
    status: req.query.status as string,
    requestType: req.query.requestType as string,
    regulation: req.query.regulation as string,
    urgency: req.query.urgency as string,
    page: Number(req.query.page) || 1,
    pageSize: Number(req.query.pageSize) || 20,
    sortBy: req.query.sortBy as string,
    sortDir: req.query.sortDir as 'ASC' | 'DESC',
  });
  res.json(ok(result, req));
}));

router.get('/dashboard', requirePermission('privacy.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const [stats, kpis, dsrTypes, regulations] = await Promise.all([
    privacyQuery.getDashboardStats(req.tenantId!),
    privacyQuery.getKpiMetrics(req.tenantId!),
    privacyQuery.getDsrTypeBreakdown(req.tenantId!),
    privacyQuery.getRegulationBreakdown(req.tenantId!),
  ]);
  res.json(ok({ stats, kpis, dsrTypes, regulations }, req));
}));

router.get('/trends', requirePermission('privacy.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const aging = await privacyQuery.getAgingReport(req.tenantId!);
  const consentExpiry = await privacyQuery.getConsentExpiryReport(req.tenantId!);
  res.json(ok({ aging, consentExpiry }, req));
}));

router.get('/cross-module/:linkedModule', requirePermission('privacy.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await privacyQuery.getCrossModuleView(req.tenantId!, req.params.linkedModule);
  res.json(ok({ items: data, total: data.length }, req));
}));

router.get('/export', requirePermission('privacy.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await privacyQuery.getExportData(req.tenantId!, req.query as Record<string, string>);
  res.json(ok({ rows: data, total: data.length, exportedAt: new Date().toISOString() }, req));
}));

router.get('/dsr/dashboard', requirePermission('privacy.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const dashboard = await getDsrDashboard(req.tenantId!);
  res.json(ok(dashboard, req));
}));

router.get('/breaches', requirePermission('privacy.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const breaches = await listBreaches(req.tenantId!, {
    status: req.query.status as BreachStatus | undefined,
    severity: req.query.severity as BreachSeverity | undefined,
  });
  res.json(ok({ breaches, total: breaches.length }, req));
}));

router.get('/breaches/dashboard', requirePermission('privacy.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const dashboard = await getBreachDashboard(req.tenantId!);
  res.json(ok(dashboard, req));
}));

router.get('/breaches/open', requirePermission('privacy.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const breaches = await privacyQuery.getOpenBreaches(req.tenantId!);
  res.json(ok({ breaches, total: breaches.length }, req));
}));

router.post('/breaches', requirePermission('privacy.record.write'), validate({ body: createBreachesBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId!;
  const breach = await reportBreach(req.tenantId!, { ...req.body, reportedBy: userId });
  setAuditData(res as any, { action: 'report_breach', entityType: 'breach', entityId: breach.id });
  res.status(201).json(ok(breach, req));
}));

router.get('/breaches/:id', requirePermission('privacy.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const breach = await getBreach(req.tenantId!, req.params.id);
  res.json(ok(breach, req));
}));

router.post('/breaches/:id/transition', requirePermission('privacy.record.approve'), validate({ body: createTransitionBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId!;
  const result = await updateBreachStatus(req.tenantId!, req.params.id, req.body.status, userId, req.body.notes);
  setAuditData(res as any, { action: 'transition_breach', entityType: 'breach', entityId: req.params.id });
  res.json(ok(result, req));
}));

router.get('/consents', requirePermission('privacy.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const dashboard = await getConsentDashboard(req.tenantId!);
  res.json(ok(dashboard, req));
}));

router.get('/consents/subject/:subjectId', requirePermission('privacy.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const consents = await getConsentsBySubject(req.tenantId!, req.params.subjectId);
  res.json(ok({ consents, total: consents.length }, req));
}));

router.get('/consents/:consentId/audit', requirePermission('privacy.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const trail = await getConsentAuditTrail(req.tenantId!, req.params.consentId);
  res.json(ok({ trail }, req));
}));

router.post('/consents', requirePermission('privacy.record.write'), validate({ body: createConsentsBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const consent = await grantConsent(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'grant_consent', entityType: 'consent', entityId: consent.id });
  res.status(201).json(ok(consent, req));
}));

router.post('/consents/:consentId/withdraw', requirePermission('privacy.record.write'), validate({ body: createWithdrawBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId!;
  const result = await withdrawConsent(req.tenantId!, req.params.consentId, userId, req.body.reason);
  setAuditData(res as any, { action: 'withdraw_consent', entityType: 'consent', entityId: req.params.consentId });
  res.json(ok(result, req));
}));

router.post('/consents/expire-overdue', requirePermission('privacy.record.configure'), validate({ body: createExpireOverdueBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const count = await expireOverdueConsents(req.tenantId!);
  res.json(ok({ expired: count }, req));
}));

router.get('/transfers', requirePermission('privacy.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const assessments = await listTransferAssessments(req.tenantId!);
  res.json(ok({ assessments, total: assessments.length }, req));
}));

router.get('/transfers/by-country', requirePermission('privacy.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const byCountry = await getTransfersByCountry(req.tenantId!);
  res.json(ok(byCountry, req));
}));

router.post('/transfers', requirePermission('privacy.record.write'), validate({ body: createTransfersBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId!;
  const assessment = await createTransferAssessment(req.tenantId!, { ...req.body, assessedBy: userId });
  setAuditData(res as any, { action: 'create_transfer_assessment', entityType: 'cross_border_transfer', entityId: assessment.id });
  res.status(201).json(ok(assessment, req));
}));

router.post('/transfers/:id/approve', requirePermission('privacy.record.approve'), validate({ body: createApproveBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId!;
  const result = await approveTransferAssessment(req.tenantId!, req.params.id, userId);
  setAuditData(res as any, { action: 'approve_transfer', entityType: 'cross_border_transfer', entityId: req.params.id });
  res.json(ok(result, req));
}));

router.get('/data-mapping', requirePermission('privacy.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const activities = await listProcessingActivities(req.tenantId!);
  res.json(ok({ activities, total: activities.length }, req));
}));

router.get('/data-mapping/cross-border', requirePermission('privacy.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const transfers = await getCrossBorderTransfers(req.tenantId!);
  res.json(ok({ transfers, total: transfers.length }, req));
}));

router.post('/data-mapping', requirePermission('privacy.record.write'), validate({ body: createDataMappingBody }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId!;
  const activity = await createProcessingActivity(req.tenantId!, { ...req.body, createdBy: userId });
  setAuditData(res as any, { action: 'create_processing_activity', entityType: 'processing_activity', entityId: activity.id });
  res.status(201).json(ok(activity, req));
}));

router.get('/ropa', requirePermission('privacy.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const ropa = await generateRopa(req.tenantId!);
  res.json(ok(ropa, req));
}));

router.get('/:id', requirePermission('privacy.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getDataSubjectRequestById));

router.post('/', requirePermission('privacy.record.write'), validate({ body: createDsrBody }), asyncHandler(createDataSubjectRequest));

router.put('/:id', requirePermission('privacy.record.write'), requireOwnership('data_subject_request'), validate({ body: updateDsrBody }), asyncHandler(updateDataSubjectRequest));

router.delete('/:id', requirePermission('privacy.record.delete'), requireOwnership('data_subject_request'), validate({ body: genericPayloadSchema }), asyncHandler(deleteDataSubjectRequest));

export default router;

