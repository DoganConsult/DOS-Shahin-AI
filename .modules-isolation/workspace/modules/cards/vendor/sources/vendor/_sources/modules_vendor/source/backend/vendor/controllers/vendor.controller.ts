import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action as _action } from '@dos/module-sdk';
import { NotFoundError } from '../../../errors/index';
import { setAuditData } from '../ports/middleware.port';

import {
  assessVendor, getVendors, getVendorById as getVendorByIdService,
  updateVendor as updateVendorService, monitorSLA,
} from '../services/vendor/vendor.service';
import {
  initiateDueDiligence, getDueDiligenceStatus, updateDueDiligenceStep,
  addSubVendor, getSubVendors, getSubVendorRiskExposure,
  checkVendorSLABreaches, recordSLAMetric, getConcentrationRisk,
  assessConcentrationRisk, initiateOffboarding, getOffboardingChecklist,
  updateOffboardingStep, getVendorMonitoringSignals, recordMonitoringSignal,
  autoTierVendors,
} from '../services/vendor/vendor-advanced.service';
import { getDashboardKPIs, getWorkQueue, getRecentActivity } from '../services/vendor/vendor-dashboard.service';
import {
  getEngagements, getEngagementById, createEngagement,
  updateEngagement, addMilestone, updateMilestone, getExpiringEngagements,
} from '../services/vendor/vendor-engagements.service';
import {
  issueVendorPortalToken, submitVendorQuestionnaire,
  getVendorSubmissions, reviewVendorSubmission,
} from '../services/vendor/vendor-portal.service';
import { fetchCyberRating, bulkFetchCyberRatings } from '../services/vendor/vendor-cyber-rating.service';
import { computeVendorBenchmark } from '../services/vendor/vendor-risk-analytics.service';

export async function list(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;
  const scopeUser = user ? { userId: user.userId, role: user.role } : undefined;
  const result = await getVendors(req.tenantId!, scopeUser);
  res.json(ok(result, req));
}

export async function getById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const vendor = await getVendorByIdService(req.tenantId!, req.params.id);
  if (!vendor) throw new NotFoundError('vendor', req.params.id);
  res.json(ok(vendor, req));
}

export async function assess(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await assessVendor(req.tenantId!, { ...req.body, assessedBy: userId });

  setAuditData(res as any, { action: 'create', entityType: 'vendor', entityId: result?.vendorId, afterState: result });
  res.status(201).json(ok(result, req));
}

export async function update(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const before = await getVendorByIdService(req.tenantId!, id);
  if (!before) throw new NotFoundError('vendor', id);
  const userId = req.user!.userId!;
  const updated = await updateVendorService(req.tenantId!, id, { ...req.body, updatedBy: userId });
  setAuditData(res as any, { action: 'update', entityType: 'vendor', entityId: id, beforeState: before, afterState: updated });
  res.json(ok(updated, req));
}

export async function slaMonitor(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await monitorSLA(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function dueDiligenceStart(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await initiateDueDiligence(req.tenantId!, { ...req.body, initiatedBy: userId });
  setAuditData(res as any, { action: 'create', entityType: 'due_diligence', entityId: result?.dd_id });
  res.status(201).json(ok(result, req));
}

export async function dueDiligenceStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getDueDiligenceStatus(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function dueDiligenceStepUpdate(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateDueDiligenceStep(req.tenantId!, req.params.stepId, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'due_diligence_step', entityId: req.params.stepId });
  res.json(ok(result, req));
}

export async function addSubVendorHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await addSubVendor(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'sub_vendor' });
  res.status(201).json(ok(result, req));
}

export async function listSubVendors(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getSubVendors(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function subVendorRiskExposure(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getSubVendorRiskExposure(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function slaBreaches(req: AuthenticatedRequest, res: Response): Promise<void> {
  const vendorId = req.query.vendorId as string | undefined;
  const result = await checkVendorSLABreaches(req.tenantId!, vendorId);
  res.json(ok(result, req));
}

export async function recordSLA(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await recordSLAMetric(req.tenantId!, req.body);
  res.status(201).json(ok(result, req));
}

export async function concentrationRisk(req: AuthenticatedRequest, res: Response): Promise<void> {
  const dimension = req.query.dimension as string | undefined;
  const result = await getConcentrationRisk(req.tenantId!, dimension);
  res.json(ok(result, req));
}

export async function assessConcentration(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await assessConcentrationRisk(req.tenantId!);
  res.json(ok(result, req));
}

export async function offboardingStart(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await initiateOffboarding(req.tenantId!, { ...req.body, initiatedBy: userId });
  setAuditData(res as any, { action: 'create', entityType: 'vendor_offboarding' });
  res.status(201).json(ok(result, req));
}

export async function offboardingChecklist(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getOffboardingChecklist(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function offboardingStepUpdate(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateOffboardingStep(req.tenantId!, req.params.checklistId, req.body);
  res.json(ok(result, req));
}

export async function monitoringSignals(req: AuthenticatedRequest, res: Response): Promise<void> {
  const vendorId = req.query.vendorId as string | undefined;
  const unacknowledged = req.query.unacknowledgedOnly === 'true';
  const result = await getVendorMonitoringSignals(req.tenantId!, vendorId, unacknowledged);
  res.json(ok(result, req));
}

export async function recordSignal(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await recordMonitoringSignal(req.tenantId!, req.body);
  res.status(201).json(ok(result, req));
}

export async function autoTier(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await autoTierVendors(req.tenantId!);
  setAuditData(res as any, { action: 'update', entityType: 'vendor_tiering' });
  res.json(ok(result, req));
}

export async function dashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getDashboardKPIs(req.tenantId!);
  res.json(ok(result, req));
}

export async function workQueue(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await getWorkQueue(req.tenantId!, userId);
  res.json(ok(result, req));
}

export async function recentActivity(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getRecentActivity(req.tenantId!);
  res.json(ok(result, req));
}

export async function listEngagements(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getEngagements(req.tenantId!, req.query as Record<string, string>);
  res.json(ok(result, req));
}

export async function getEngagementByIdHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getEngagementById(req.tenantId!, req.params.id);
  if (!result) throw new NotFoundError('engagement', req.params.id);
  res.json(ok(result, req));
}

export async function createEngagementHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await createEngagement(req.tenantId!, { ...req.body, createdBy: userId });
  setAuditData(res as any, { action: 'create', entityType: 'vendor_engagement', entityId: result?.engagement_id });
  res.status(201).json(ok(result, req));
}

export async function updateEngagementHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateEngagement(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'vendor_engagement', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function addMilestoneHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await addMilestone(req.tenantId!, req.params.id, req.body);
  res.status(201).json(ok(result, req));
}

export async function updateMilestoneHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateMilestone(req.tenantId!, req.params.milestoneId, req.body);
  res.json(ok(result, req));
}

export async function expiringEngagements(req: AuthenticatedRequest, res: Response): Promise<void> {
  const days = parseInt(req.query.days as string, 10) || 90;
  const result = await getExpiringEngagements(req.tenantId!, days);
  res.json(ok(result, req));
}

export async function issuePortalToken(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await issueVendorPortalToken(req.tenantId!, req.body);
  res.status(201).json(ok(result, req));
}

export async function submitQuestionnaire(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await submitVendorQuestionnaire(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'vendor_questionnaire' });
  res.status(201).json(ok(result, req));
}

export async function vendorSubmissions(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getVendorSubmissions(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function reviewSubmission(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await reviewVendorSubmission(req.tenantId!, { ...req.body, reviewedBy: userId });
  setAuditData(res as any, { action: 'update', entityType: 'vendor_submission_review' });
  res.json(ok(result, req));
}

export async function cyberRating(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await fetchCyberRating(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function bulkCyberRatings(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await bulkFetchCyberRatings(req.tenantId!, req.body.vendorIds);
  res.json(ok(result, req));
}

export async function benchmark(req: AuthenticatedRequest, res: Response): Promise<void> {
  const vendorId = req.params.id || (req.query.vendorId as string);
  const result = await computeVendorBenchmark(req.tenantId!, vendorId);
  res.json(ok(result, req));
}
