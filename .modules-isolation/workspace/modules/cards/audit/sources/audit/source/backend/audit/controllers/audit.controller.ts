// ============================================
// Audit Module — Controller Layer
// Thin HTTP orchestrator: extracts request data,
// calls services, formats responses, sets audit context.
// ============================================

import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, paginated, action } from '@dos/module-sdk';
import { NotFoundError } from '../../../errors/index';
import { setAuditData } from '../ports/middleware.port';

// --- Service imports: core audit ---
import {
  getAuditOverview, getEngagements, getEngagementById,
  createEngagement, updateEngagement, updateEngagementStatus,
  deleteEngagement, getAuditPlans, getAuditPlanById,
  createAuditPlan, updateAuditPlanStatus, updateAuditPlan, deleteAuditPlan,
  getFindings, getFindingById, createFinding, updateFinding, deleteFinding,
  getRootCauses, addRootCause, getImpacts, addImpact,
  getCapaPlans, getCapaPlanById, createCapaPlan, updateCapaPlan,
  linkCapaToRiskTreatment, getAvailableRiskTreatments,
  getClosureReviews, createClosureReview,
  collectEvidence, generateReport,
} from '../services/audit/core/audit.service';

// --- Service imports: universe ---
import {
  listUniverse, getUniverseEntityById, createUniverseEntity,
  updateUniverseEntity, deleteUniverseEntity,
  listUniverseWithFoundation, getFoundationEntities,
  linkUniverseToFoundation,
} from '../services/audit/planning/audit-universe.service';

// --- Service imports: schedules ---
import {
  listSchedules, createSchedule, updateSchedule,
  deleteSchedule, toggleSchedule, getDueSchedules,
  triggerEvidenceForSchedule,
} from '../services/audit/planning/audit-schedules.service';

// --- Service imports: audit trail ---
import {
  queryAuditTrail, getAuditTrailTotal,
  getDistinctModules, exportAuditLog, verifyAuditChain,
} from '../services/audit/core/audit-trail.service';

// --- Service imports: prep ---
import {
  generateChecklist, addHumanItem, markItemReady,
  updateChecklistStatus, getChecklist, listChecklists,
} from '../services/audit/planning/audit-prep.service';

// --- Service imports: working papers ---
import {
  listPapers, createPaper, updatePaper,
  submitForReview as submitPaperForReview, approvePaper,
} from '../services/audit/execution/audit-working-papers.service';

// --- Service imports: finding trends ---
import {
  getTrends, getAgingAnalysis, getSeverityDistribution, getTopRecurring,
} from '../services/audit/findings/audit-finding-trends.service';

// --- Service imports: ratings ---
import { getRating, setRating, getRatingsSummary } from '../services/audit/reporting/audit-ratings.service';

// --- Service imports: team ---
import {
  getTeam, assignMember, removeMember,
  updateHours, getWorkloadSummary,
} from '../services/audit/planning/audit-team.service';

// --- Service imports: templates ---
import {
  listTemplates, createTemplate, updateTemplate,
  deleteTemplate, getTemplateById, applyTemplate,
} from '../services/audit/planning/audit-templates.service';

// --- Service imports: test plans ---
import {
  listTestPlans, createTestPlan, updateTestResult, getControlCoverage,
} from '../services/audit/execution/audit-test-plans.service';

// --- Service imports: finding SLAs ---
import {
  getSlaConfig, upsertSla, getBreachedFindings, getSlaCompliance,
} from '../services/audit/findings/audit-finding-slas.service';

// --- Service imports: committee reporting ---
import {
  generateExecutiveSummary, getCommitteeMetrics, getBoardDashboard,
} from '../services/audit/reporting/audit-committee-reporting.service';

// --- Service imports: repeat findings ---
import {
  listRepeatFindings, linkRepeatFinding, getRepeatHistory,
} from '../services/audit/findings/audit-repeat-findings.service';

// --- Service imports: risk scoring ---
import {
  getScoresForEntity, upsertScore, computeWeightedScore,
  getRiskRankedList,
} from '../services/audit/operations/audit-risk-scoring.service';

// --- Service imports: time tracking ---
import {
  listEntries as listTimeEntries, logTime, getEfficiencyMetrics, getUtilization,
} from '../services/audit/execution/audit-time-tracking.service';

// --- Service imports: QA reviews ---
import {
  listReviews as listQAReviews, createReview as createQAReview,
  approveReview as approveQAReview, rejectReview as rejectQAReview,
  getPendingReviews,
} from '../services/audit/reporting/audit-qa-reviews.service';

// --- Service imports: package exporter ---
import { generateAuditPackage } from '../services/audit/reporting/audit-package-exporter.service';

// ── OVERVIEW ─────────────────────────────────────────

export async function overview(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getAuditOverview(req.tenantId!);
  res.json(ok(result, req));
}

// ── ENGAGEMENTS ──────────────────────────────────────

export async function listEngagements(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;
  const result = await getEngagements(
    req.tenantId!,
    user ? { userId: user.userId, role: user.role } : undefined,
  );
  res.json(ok(result, req));
}

export async function getEngagementByIdHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getEngagementById(req.tenantId!, req.params.id);
  if (!result) throw new NotFoundError('engagement', req.params.id);
  res.json(ok(result, req));
}

export async function createEngagementHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createEngagement(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'audit_engagement', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function updateEngagementHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const before = await getEngagementById(req.tenantId!, req.params.id);
  if (!before) throw new NotFoundError('engagement', req.params.id);
  const result = await updateEngagement(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'audit_engagement', entityId: req.params.id, beforeState: before, afterState: result });
  res.json(ok(result, req));
}

export async function updateEngagementStatusHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateEngagementStatus(req.tenantId!, req.params.id, req.body.status);
  setAuditData(res as any, { action: 'update', entityType: 'audit_engagement', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function deleteEngagementHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  await deleteEngagement(req.tenantId!, req.params.id);
  setAuditData(res as any, { action: 'delete', entityType: 'audit_engagement', entityId: req.params.id });
  res.json(action('Engagement deleted', req));
}

// ── AUDIT PLANS ──────────────────────────────────────

export async function listPlans(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getAuditPlans(req.tenantId!);
  res.json(ok(result, req));
}

export async function getPlan(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getAuditPlanById(req.tenantId!, req.params.id);
  if (!result) throw new NotFoundError('audit_plan', req.params.id);
  res.json(ok(result, req));
}

export async function createPlan(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createAuditPlan(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'audit_plan', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function updatePlan(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateAuditPlan(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'audit_plan', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function updatePlanStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateAuditPlanStatus(req.tenantId!, req.params.id, req.body.status);
  setAuditData(res as any, { action: 'update', entityType: 'audit_plan', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function deletePlan(req: AuthenticatedRequest, res: Response): Promise<void> {
  await deleteAuditPlan(req.tenantId!, req.params.id);
  setAuditData(res as any, { action: 'delete', entityType: 'audit_plan', entityId: req.params.id });
  res.json(action('Audit plan deleted', req));
}

// ── FINDINGS ─────────────────────────────────────────

export async function listFindings(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getFindings(req.tenantId!, req.query.auditId as string | undefined);
  res.json(ok(result, req));
}

export async function getFinding(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getFindingById(req.tenantId!, req.params.id);
  if (!result) throw new NotFoundError('audit_finding', req.params.id);
  res.json(ok(result, req));
}

export async function createFindingHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createFinding(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'audit_finding', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function updateFindingHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateFinding(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'audit_finding', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function deleteFindingHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  await deleteFinding(req.tenantId!, req.params.id);
  setAuditData(res as any, { action: 'delete', entityType: 'audit_finding', entityId: req.params.id });
  res.json(action('Finding deleted', req));
}

export async function listRootCauses(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getRootCauses(req.tenantId!, req.params.findingId);
  res.json(ok(result, req));
}

export async function addRootCauseHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await addRootCause(req.tenantId!, req.params.findingId, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'root_cause', entityId: req.params.findingId });
  res.status(201).json(ok(result, req));
}

export async function listImpacts(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getImpacts(req.tenantId!, req.params.findingId);
  res.json(ok(result, req));
}

export async function addImpactHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await addImpact(req.tenantId!, req.params.findingId, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'finding_impact', entityId: req.params.findingId });
  res.status(201).json(ok(result, req));
}

// ── CAPA ─────────────────────────────────────────────

export async function listCapas(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getCapaPlans(req.tenantId!);
  res.json(ok(result, req));
}

export async function getCapa(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getCapaPlanById(req.tenantId!, req.params.id);
  if (!result) throw new NotFoundError('capa_plan', req.params.id);
  res.json(ok(result, req));
}

export async function createCapa(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createCapaPlan(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'capa_plan', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function updateCapa(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateCapaPlan(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'capa_plan', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function linkCapaToTreatment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await linkCapaToRiskTreatment(req.tenantId!, req.params.id, req.body.treatmentId);
  setAuditData(res as any, { action: 'create', entityType: 'capa_treatment_link', entityId: req.params.id });
  res.status(201).json(ok(result, req));
}

export async function availableRiskTreatments(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getAvailableRiskTreatments(req.tenantId!);
  res.json(ok(result, req));
}

export async function listClosureReviews(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getClosureReviews(req.tenantId!);
  res.json(ok(result, req));
}

export async function createClosureReviewHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createClosureReview(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'closure_review', afterState: result });
  res.status(201).json(ok(result, req));
}

// ── EVIDENCE & REPORT ────────────────────────────────

export async function collectEvidenceHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await collectEvidence(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'audit_evidence' });
  res.status(201).json(ok(result, req));
}

export async function generateReportHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await generateReport(req.tenantId!, req.params.auditId);
  res.json(ok(result, req));
}

// ── UNIVERSE ─────────────────────────────────────────

export async function listUniverseHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await listUniverse(req.tenantId!);
  res.json(ok(result, req));
}

export async function getUniverseEntity(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getUniverseEntityById(req.tenantId!, req.params.id);
  if (!result) throw new NotFoundError('universe_entity', req.params.id);
  res.json(ok(result, req));
}

export async function createUniverseEntityHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createUniverseEntity(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'audit_universe', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function updateUniverseEntityHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateUniverseEntity(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'audit_universe', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function deleteUniverseEntityHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  await deleteUniverseEntity(req.tenantId!, req.params.id);
  setAuditData(res as any, { action: 'delete', entityType: 'audit_universe', entityId: req.params.id });
  res.json(action('Universe entity deleted', req));
}

export async function universeWithFoundation(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await listUniverseWithFoundation(req.tenantId!);
  res.json(ok(result, req));
}

export async function foundationEntities(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getFoundationEntities(req.tenantId!);
  res.json(ok(result, req));
}

export async function linkToFoundation(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await linkUniverseToFoundation(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'universe_foundation_link', entityId: req.params.id });
  res.status(201).json(ok(result, req));
}

// ── SCHEDULES ────────────────────────────────────────

export async function listSchedulesHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await listSchedules(req.tenantId!);
  res.json(ok(result, req));
}

export async function createScheduleHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createSchedule(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'audit_schedule', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function updateScheduleHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateSchedule(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'audit_schedule', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function deleteScheduleHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  await deleteSchedule(req.tenantId!, req.params.id);
  setAuditData(res as any, { action: 'delete', entityType: 'audit_schedule', entityId: req.params.id });
  res.json(action('Schedule deleted', req));
}

export async function toggleScheduleHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await toggleSchedule(req.tenantId!, req.params.id);
  setAuditData(res as any, { action: 'update', entityType: 'audit_schedule', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function dueSchedules(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getDueSchedules(req.tenantId!);
  res.json(ok(result, req));
}

export async function triggerSchedule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await triggerEvidenceForSchedule(req.tenantId!, req.params.scheduleId);
  setAuditData(res as any, { action: 'create', entityType: 'schedule_trigger', entityId: req.params.scheduleId });
  res.json(ok(result, req));
}

// ── AUDIT TRAIL ──────────────────────────────────────

export async function queryTrail(req: AuthenticatedRequest, res: Response): Promise<void> {
  const filters = req.query as Record<string, string>;
  const page = parseInt(filters.page || '1', 10);
  const pageSize = parseInt(filters.pageSize || '50', 10);
  const [data, total] = await Promise.all([
    queryAuditTrail(req.tenantId!, filters),
    getAuditTrailTotal(req.tenantId!, filters),
  ]);
  res.json(paginated(data as unknown[], total, page, pageSize, req));
}

export async function distinctModules(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getDistinctModules(req.tenantId!);
  res.json(ok(result, req));
}

export async function exportTrail(req: AuthenticatedRequest, res: Response): Promise<void> {
  const q = req.query as Record<string, string>;
  const format = (q.format === 'json' ? 'json' : 'csv') as 'csv' | 'json';
  const result = await exportAuditLog(req.tenantId!, q as any, format);
  res.setHeader('Content-Type', format === 'json' ? 'application/json' : 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="audit-trail.${format}"`);
  res.send(result);
}

export async function verifyChain(req: AuthenticatedRequest, res: Response): Promise<void> {
  const q = req.query as Record<string, string>;
  const result = await verifyAuditChain(req.tenantId!, q.startDate, q.endDate);
  res.json(ok(result, req));
}

// ── PREP CHECKLISTS ──────────────────────────────────

export async function generateChecklistHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await generateChecklist(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'audit_checklist' });
  res.status(201).json(ok(result, req));
}

export async function addChecklistItem(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await addHumanItem(req.tenantId!, req.params.checklistId, req.body);
  res.status(201).json(ok(result, req));
}

export async function markChecklistItemReady(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await markItemReady(req.tenantId!, req.params.checklistId, req.params.itemId, userId);
  res.json(ok(result, req));
}

export async function updateChecklistStatusHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await updateChecklistStatus(req.tenantId!, req.params.checklistId, req.body.status, userId);
  setAuditData(res as any, { action: 'update', entityType: 'audit_checklist', entityId: req.params.checklistId });
  res.json(ok(result, req));
}

export async function getChecklistHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getChecklist(req.tenantId!, req.params.checklistId);
  res.json(ok(result, req));
}

export async function listChecklistsHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await listChecklists(req.tenantId!);
  res.json(ok(result, req));
}

// ── WORKING PAPERS ───────────────────────────────────

export async function listPapersHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await listPapers(req.tenantId!, req.params.auditId);
  res.json(ok(result, req));
}

export async function createPaperHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createPaper(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'working_paper', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function updatePaperHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updatePaper(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'working_paper', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function submitPaper(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await submitPaperForReview(req.tenantId!, req.params.id, req.body.reviewerId);
  setAuditData(res as any, { action: 'update', entityType: 'working_paper', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function approvePaperHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await approvePaper(req.tenantId!, req.params.id);
  setAuditData(res as any, { action: 'update', entityType: 'working_paper', entityId: req.params.id });
  res.json(ok(result, req));
}

// ── FINDING TRENDS ───────────────────────────────────

export async function findingTrends(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { startDate, endDate } = req.query as { startDate: string; endDate: string };
  const result = await getTrends(req.tenantId!, startDate, endDate);
  res.json(ok(result, req));
}

export async function agingAnalysis(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getAgingAnalysis(req.tenantId!);
  res.json(ok(result, req));
}

export async function severityDistribution(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getSeverityDistribution(req.tenantId!);
  res.json(ok(result, req));
}

export async function topRecurring(req: AuthenticatedRequest, res: Response): Promise<void> {
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const result = await getTopRecurring(req.tenantId!, limit);
  res.json(ok(result, req));
}

// ── RATINGS ──────────────────────────────────────────

export async function getRatingHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getRating(req.tenantId!, req.params.auditId);
  res.json(ok(result, req));
}

export async function setRatingHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await setRating(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'audit_rating' });
  res.status(201).json(ok(result, req));
}

export async function ratingsSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getRatingsSummary(req.tenantId!);
  res.json(ok(result, req));
}

// ── TEAM ─────────────────────────────────────────────

export async function getTeamHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getTeam(req.tenantId!, req.params.auditId);
  res.json(ok(result, req));
}

export async function assignMemberHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await assignMember(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'audit_team_member' });
  res.status(201).json(ok(result, req));
}

export async function removeMemberHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  await removeMember(req.tenantId!, req.params.id);
  setAuditData(res as any, { action: 'delete', entityType: 'audit_team_member', entityId: req.params.id });
  res.json(action('Team member removed', req));
}

export async function updateHoursHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateHours(req.tenantId!, req.params.id, req.body.hoursActual);
  res.json(ok(result, req));
}

export async function workloadSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getWorkloadSummary(req.tenantId!);
  res.json(ok(result, req));
}

// ── TEMPLATES ────────────────────────────────────────

export async function listTemplatesHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await listTemplates(req.tenantId!);
  res.json(ok(result, req));
}

export async function getTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getTemplateById(req.tenantId!, req.params.id);
  if (!result) throw new NotFoundError('audit_template', req.params.id);
  res.json(ok(result, req));
}

export async function createTemplateHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createTemplate(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'audit_template', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function updateTemplateHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateTemplate(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'audit_template', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function deleteTemplateHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  await deleteTemplate(req.tenantId!, req.params.id);
  setAuditData(res as any, { action: 'delete', entityType: 'audit_template', entityId: req.params.id });
  res.json(action('Template deleted', req));
}

export async function applyTemplateHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await applyTemplate(req.tenantId!, req.params.templateId, req.params.auditId);
  setAuditData(res as any, { action: 'create', entityType: 'template_application', entityId: req.params.templateId });
  res.json(ok(result, req));
}

// ── TEST PLANS ───────────────────────────────────────

export async function listTestPlansHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await listTestPlans(req.tenantId!, req.params.auditId);
  res.json(ok(result, req));
}

export async function createTestPlanHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createTestPlan(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'test_plan', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function updateTestResultHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { status, resultNotes, testedBy } = req.body;
  const result = await updateTestResult(req.tenantId!, req.params.testId, status, resultNotes, testedBy);
  setAuditData(res as any, { action: 'update', entityType: 'test_result', entityId: req.params.testId });
  res.json(ok(result, req));
}

export async function controlCoverage(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getControlCoverage(req.tenantId!, req.params.auditId);
  res.json(ok(result, req));
}

// ── FINDING SLAs ─────────────────────────────────────

export async function slaConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getSlaConfig(req.tenantId!);
  res.json(ok(result, req));
}

export async function upsertSlaHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { severity, resolutionDays, warningPct, escalationTo } = req.body;
  const result = await upsertSla(req.tenantId!, severity, resolutionDays, warningPct, escalationTo);
  setAuditData(res as any, { action: 'update', entityType: 'finding_sla' });
  res.json(ok(result, req));
}

export async function breachedFindings(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getBreachedFindings(req.tenantId!);
  res.json(ok(result, req));
}

export async function slaCompliance(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getSlaCompliance(req.tenantId!);
  res.json(ok(result, req));
}

// ── COMMITTEE REPORTING ──────────────────────────────

export async function executiveSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await generateExecutiveSummary(req.tenantId!);
  res.json(ok(result, req));
}

export async function committeeMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getCommitteeMetrics(req.tenantId!);
  res.json(ok(result, req));
}

export async function boardDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getBoardDashboard(req.tenantId!);
  res.json(ok(result, req));
}

// ── REPEAT FINDINGS ──────────────────────────────────

export async function repeatFindings(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await listRepeatFindings(req.tenantId!);
  res.json(ok(result, req));
}

export async function linkRepeat(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { findingId, originalFindingId, notes } = req.body;
  const result = await linkRepeatFinding(req.tenantId!, findingId, originalFindingId, notes);
  setAuditData(res as any, { action: 'create', entityType: 'repeat_finding_link' });
  res.status(201).json(ok(result, req));
}

export async function repeatHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getRepeatHistory(req.tenantId!, req.params.findingId);
  res.json(ok(result, req));
}

// ── RISK SCORING ─────────────────────────────────────

export async function entityScores(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getScoresForEntity(req.tenantId!, req.params.universeId);
  res.json(ok(result, req));
}

export async function upsertScoreHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { universeId, riskFactor, score, weight, assessedBy } = req.body;
  const result = await upsertScore(req.tenantId!, universeId, riskFactor, score, weight, assessedBy);
  setAuditData(res as any, { action: 'update', entityType: 'risk_score' });
  res.json(ok(result, req));
}

export async function weightedScore(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await computeWeightedScore(req.tenantId!, req.params.universeId);
  res.json(ok(result, req));
}

export async function riskRankedList(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getRiskRankedList(req.tenantId!);
  res.json(ok(result, req));
}

// ── TIME TRACKING ────────────────────────────────────

export async function timeEntries(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await listTimeEntries(req.tenantId!, req.params.auditId);
  res.json(ok(result, req));
}

export async function logTimeHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await logTime(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'time_entry' });
  res.status(201).json(ok(result, req));
}

export async function efficiencyMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getEfficiencyMetrics(req.tenantId!);
  res.json(ok(result, req));
}

export async function utilization(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getUtilization(req.tenantId!);
  res.json(ok(result, req));
}

// ── QA REVIEWS ───────────────────────────────────────

export async function listQAReviewsHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await listQAReviews(req.tenantId!, req.params.auditId);
  res.json(ok(result, req));
}

export async function createQAReviewHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createQAReview(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'qa_review', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function approveQAReviewHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await approveQAReview(req.tenantId!, req.params.id);
  setAuditData(res as any, { action: 'update', entityType: 'qa_review', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function rejectQAReviewHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await rejectQAReview(req.tenantId!, req.params.id, req.body.comments);
  setAuditData(res as any, { action: 'update', entityType: 'qa_review', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function pendingReviews(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getPendingReviews(req.tenantId!);
  res.json(ok(result, req));
}

// ── PACKAGE EXPORTER ─────────────────────────────────

export async function generatePackage(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await generateAuditPackage(req.tenantId!, req.body);
  res.json(ok(result, req));
}
