// ============================================
// BCP Module — Controller Layer
// Thin HTTP orchestrator: extracts request data,
// calls services, formats responses, sets audit context.
// ============================================

import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action as _action } from '@dos/module-sdk';
import { NotFoundError } from '../../../errors/index';
import { setAuditData } from '../ports/middleware.port';

// --- Service imports ---
import {
  createBCP, getBCPPlans, getBCPById, updateBCP,
  scheduleDRTest, documentRecovery,
  getBCPLeadingIndicators, getBCPReadinessScore, runBCPHealthCheck,
} from '../services/bcp.service';
import {
  createBIA, getBIAs, getBIAById, calculateBIACriticality,
  createBCPExercise, getBCPExercises, recordExerciseResult, getExerciseGaps,
  createCrisisCommPlan, getCrisisCommPlans, getNotificationTree, activateCrisisComm,
  createRecoveryStrategy, getRecoveryStrategies, linkStrategyToBIA,
  activateBCPlan, getBCPActivations, updateRecoveryStep, deactivateBCPlan,
  createDependencyMap, getDependencyChain,
  runBCMMaturityAssessment, getBCMMaturityHistory,
  autoScheduleNextExercise, detectSinglePointsOfFailure,
  analyzeIncidentForBCPLearning, assessBusinessChangeImpact,
} from '../services/bcm-advanced.service';
import {
  createFinding, getFindings, getFindingById, updateFinding,
  verifyFinding, closeFinding, getFindingsSummary,
  autoCreateFindingsFromExercise, autoCreateFindingsFromActivation,
} from '../services/bcm-findings.service';
import {
  declareCrisis, getCrisisEvents, getCrisisById, getActiveCrises,
  updateCrisisStatus, addTimelineEntry, resolveCrisis, getCrisisDashboard,
} from '../services/crisis-management.service';
import {
  createBusinessService, getBusinessServices, getServiceById,
  updateBusinessService, getServiceDependencyGraph,
  linkServiceToBIA, getServiceImpactSummary,
} from '../services/business-services.service';
import {
  getRecoveryMetrics, getRtoRpoTrend, getExerciseEffectiveness,
  getServiceResilienceScores, getRecoveryBenchmarks,
} from '../services/recovery-metrics.service';
import {
  forecastBCPReadiness, predictRecoveryGap, estimateNextIncidentImpact,
} from '../../analytics/services/misc/predictive-analytics.service';

// ── BCP PLAN CRUD ──────────────────────────────────────

export async function listPlans(req: AuthenticatedRequest, res: Response): Promise<void> {
  const plans = await getBCPPlans(req.tenantId!, req.query.type as string | undefined);
  res.json(ok(plans, req));
}

export async function getPlanById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const plan = await getBCPById(req.tenantId!, req.params.id);
  if (!plan) throw new NotFoundError('bcp_plan', req.params.id);
  res.json(ok(plan, req));
}

export async function createPlan(req: AuthenticatedRequest, res: Response): Promise<void> {
  const _userId = req.user!.userId!;
  const plan = await createBCP(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'bcp_plan', entityId: plan?.plan_id, afterState: plan });
  res.status(201).json(ok(plan, req));
}

export async function updatePlan(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const _userId = req.user!.userId!;
  const before = await getBCPById(req.tenantId!, id);
  if (!before) throw new NotFoundError('bcp_plan', id);
  const updated = await updateBCP(req.tenantId!, id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'bcp_plan', entityId: id, beforeState: before, afterState: updated });
  res.json(ok(updated, req));
}

export async function scheduleDrTest(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await scheduleDRTest(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'bcp_dr_test', entityId: req.params.id });
  res.status(201).json(ok(result, req));
}

export async function documentRecoveryProcedure(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await documentRecovery(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'bcp_recovery', entityId: req.params.id });
  res.status(201).json(ok(result, req));
}

export async function leadingIndicators(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getBCPLeadingIndicators(req.tenantId!);
  res.json(ok(result, req));
}

export async function readinessScore(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getBCPReadinessScore(req.tenantId!);
  res.json(ok(result, req));
}

export async function healthCheck(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await runBCPHealthCheck(req.tenantId!);
  res.json(ok(result, req));
}

// ── BIA ────────────────────────────────────────────────

export async function createBIAEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
  const bia = await createBIA(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'bia', entityId: bia?.bia_id, afterState: bia });
  res.status(201).json(ok(bia, req));
}

export async function listBIAs(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getBIAs(req.tenantId!, req.query.status as string | undefined);
  res.json(ok(result, req));
}

export async function getBIA(req: AuthenticatedRequest, res: Response): Promise<void> {
  const bia = await getBIAById(req.tenantId!, req.params.id);
  if (!bia) throw new NotFoundError('bia', req.params.id);
  res.json(ok(bia, req));
}

export async function biaCalculateCriticality(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await calculateBIACriticality(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

// ── EXERCISES ──────────────────────────────────────────

export async function createExercise(req: AuthenticatedRequest, res: Response): Promise<void> {
  const exercise = await createBCPExercise(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'bcp_exercise', entityId: exercise?.exercise_id, afterState: exercise });
  res.status(201).json(ok(exercise, req));
}

export async function listExercises(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getBCPExercises(req.tenantId!, req.query.status as string | undefined);
  res.json(ok(result, req));
}

export async function recordExercise(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await recordExerciseResult(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'bcp_exercise', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function exerciseGaps(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getExerciseGaps(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function autoScheduleExercise(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await autoScheduleNextExercise(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

// ── CRISIS COMMUNICATION ───────────────────────────────

export async function createCommPlan(req: AuthenticatedRequest, res: Response): Promise<void> {
  const plan = await createCrisisCommPlan(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'crisis_comm_plan', entityId: plan?.comm_plan_id, afterState: plan });
  res.status(201).json(ok(plan, req));
}

export async function listCommPlans(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getCrisisCommPlans(req.tenantId!);
  res.json(ok(result, req));
}

export async function notificationTree(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getNotificationTree(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function activateComm(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await activateCrisisComm(req.tenantId!, req.params.id, userId, req.body.incidentId);
  setAuditData(res as any, { action: 'update', entityType: 'crisis_comm_plan', entityId: req.params.id });
  res.json(ok(result, req));
}

// ── RECOVERY STRATEGIES ────────────────────────────────

export async function createStrategy(req: AuthenticatedRequest, res: Response): Promise<void> {
  const strategy = await createRecoveryStrategy(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'recovery_strategy', entityId: strategy?.strategy_id, afterState: strategy });
  res.status(201).json(ok(strategy, req));
}

export async function listStrategies(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getRecoveryStrategies(req.tenantId!, req.query.biaId as string | undefined);
  res.json(ok(result, req));
}

export async function linkStrategy(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await linkStrategyToBIA(req.tenantId!, req.params.id, req.body.biaId);
  res.status(201).json(ok(result, req));
}

// ── BCP ACTIVATIONS ────────────────────────────────────

export async function activatePlan(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await activateBCPlan(req.tenantId!, req.params.id, userId, req.body.reason, req.body.incidentId);
  setAuditData(res as any, { action: 'create', entityType: 'bcp_activation', entityId: result?.activation_id });
  res.status(201).json(ok(result, req));
}

export async function listActivations(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getBCPActivations(req.tenantId!, req.query.status as string | undefined);
  res.json(ok(result, req));
}

export async function updateRecoveryStepEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateRecoveryStep(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'recovery_step', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function deactivate(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await deactivateBCPlan(req.tenantId!, req.params.id, userId);
  setAuditData(res as any, { action: 'update', entityType: 'bcp_activation', entityId: req.params.id });
  res.json(ok(result, req));
}

// ── DEPENDENCY MAP ─────────────────────────────────────

export async function createDepMap(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createDependencyMap(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'dependency_map', entityId: result?.map_id });
  res.status(201).json(ok(result, req));
}

export async function depChain(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getDependencyChain(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

// ── BCM MATURITY ───────────────────────────────────────

export async function runMaturityAssessment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await runBCMMaturityAssessment(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'bcm_maturity', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function maturityHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getBCMMaturityHistory(req.tenantId!);
  res.json(ok(result, req));
}

// ── FINDINGS ───────────────────────────────────────────

export async function createFindingEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
  const finding = await createFinding(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'bcm_finding', entityId: finding?.finding_id, afterState: finding });
  res.status(201).json(ok(finding, req));
}

export async function listFindings(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getFindings(req.tenantId!, req.query as Record<string, string>);
  res.json(ok(result, req));
}

export async function getFinding(req: AuthenticatedRequest, res: Response): Promise<void> {
  const finding = await getFindingById(req.tenantId!, req.params.id);
  if (!finding) throw new NotFoundError('bcm_finding', req.params.id);
  res.json(ok(finding, req));
}

export async function updateFindingEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateFinding(req.tenantId!, req.params.id, req.body);
  if (!result) throw new NotFoundError('bcm_finding', req.params.id);
  setAuditData(res as any, { action: 'update', entityType: 'bcm_finding', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function verifyFindingEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await verifyFinding(req.tenantId!, req.params.id, userId);
  if (!result) throw new NotFoundError('bcm_finding', req.params.id);
  setAuditData(res as any, { action: 'update', entityType: 'bcm_finding', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function closeFindingEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await closeFinding(req.tenantId!, req.params.id);
  if (!result) throw new NotFoundError('bcm_finding', req.params.id);
  setAuditData(res as any, { action: 'update', entityType: 'bcm_finding', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function findingsSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getFindingsSummary(req.tenantId!);
  res.json(ok(result, req));
}

export async function autoFindingsFromExercise(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await autoCreateFindingsFromExercise(req.tenantId!, req.params.id);
  res.status(201).json(ok(result, req));
}

export async function autoFindingsFromActivation(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await autoCreateFindingsFromActivation(req.tenantId!, req.params.id);
  res.status(201).json(ok(result, req));
}

// ── CRISIS MANAGEMENT ──────────────────────────────────

export async function declareCrisisEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const crisis = await declareCrisis(req.tenantId!, { ...req.body, declared_by: userId });
  setAuditData(res as any, { action: 'create', entityType: 'crisis_event', entityId: crisis?.event_id, afterState: crisis });
  res.status(201).json(ok(crisis, req));
}

export async function listCrisisEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getCrisisEvents(req.tenantId!, req.query as Record<string, string>);
  res.json(ok(result, req));
}

export async function getCrisis(req: AuthenticatedRequest, res: Response): Promise<void> {
  const crisis = await getCrisisById(req.tenantId!, req.params.id);
  if (!crisis) throw new NotFoundError('crisis_event', req.params.id);
  res.json(ok(crisis, req));
}

export async function listActiveCrises(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getActiveCrises(req.tenantId!);
  res.json(ok(result, req));
}

export async function updateCrisis(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateCrisisStatus(req.tenantId!, req.params.id, req.body.status, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'crisis_event', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function addTimeline(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await addTimelineEntry(req.tenantId!, req.params.id, req.body);
  res.status(201).json(ok(result, req));
}

export async function resolveCrisisEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await resolveCrisis(req.tenantId!, req.params.id, userId, req.body.postCrisisReview);
  setAuditData(res as any, { action: 'update', entityType: 'crisis_event', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function crisisDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getCrisisDashboard(req.tenantId!);
  res.json(ok(result, req));
}

// ── BUSINESS SERVICES ──────────────────────────────────

export async function createBizService(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc = await createBusinessService(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'business_service', entityId: svc?.service_id, afterState: svc });
  res.status(201).json(ok(svc, req));
}

export async function listBizServices(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getBusinessServices(req.tenantId!, req.query as Record<string, string>);
  res.json(ok(result, req));
}

export async function getBizService(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc = await getServiceById(req.tenantId!, req.params.id);
  if (!svc) throw new NotFoundError('business_service', req.params.id);
  res.json(ok(svc, req));
}

export async function updateBizService(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateBusinessService(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'business_service', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function serviceDependencyGraph(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getServiceDependencyGraph(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function linkServiceBIA(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await linkServiceToBIA(req.tenantId!, req.params.id, req.body.biaId);
  res.status(201).json(ok(result, req));
}

export async function serviceImpactSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getServiceImpactSummary(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

// ── RECOVERY METRICS ───────────────────────────────────

export async function recoveryMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getRecoveryMetrics(req.tenantId!);
  res.json(ok(result, req));
}

export async function rtoRpoTrend(req: AuthenticatedRequest, res: Response): Promise<void> {
  const months = parseInt(req.query.months as string, 10) || 12;
  const result = await getRtoRpoTrend(req.tenantId!, months);
  res.json(ok(result, req));
}

export async function exerciseEffectiveness(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getExerciseEffectiveness(req.tenantId!);
  res.json(ok(result, req));
}

export async function serviceResilienceScores(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getServiceResilienceScores(req.tenantId!);
  res.json(ok(result, req));
}

export async function recoveryBenchmarks(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getRecoveryBenchmarks(req.tenantId!);
  res.json(ok(result, req));
}

// ── PREDICTIVE ANALYTICS ───────────────────────────────

export async function forecastReadiness(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await forecastBCPReadiness(req.tenantId);
  res.json(ok(result, req));
}

export async function predictGap(req: AuthenticatedRequest, res: Response): Promise<void> {
  const _scenarioId = req.query.scenarioId as string | undefined;
  const result = await predictRecoveryGap(req.tenantId);
  res.json(ok(result, req));
}

export async function estimateIncidentImpact(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await estimateNextIncidentImpact(req.tenantId);
  res.json(ok(result, req));
}

// ── ADVANCED ANALYTICS ─────────────────────────────────

export async function singlePointsOfFailure(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await detectSinglePointsOfFailure(req.tenantId!);
  res.json(ok(result, req));
}

export async function incidentBCPLearning(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await analyzeIncidentForBCPLearning(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function businessChangeImpact(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await assessBusinessChangeImpact(req.tenantId!, req.body.changeType, req.body.changeData);
  res.json(ok(result, req));
}
