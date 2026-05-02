// ============================================
// Compliance Module — Controller Layer
// Thin HTTP orchestrator: extracts request data,
// calls services, formats responses, sets audit context.
// ============================================

import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, paginated as _paginated, action } from '@dos/module-sdk';
import { NotFoundError } from '../../../errors/index';
import { setAuditData } from '../../ports/middleware.port';

// --- Service imports: core compliance ---
import {
  mapFramework, mapControlToNodes, testControl,
  getGapAnalysis, createRemediation, getRemediations,
  updateRemediationStatus,
} from '../services/compliance/compliance.service';

// --- Service imports: attestation ---
import {
  createComplianceAttestationCampaign, activateCampaign,
  submitComplianceAttestation, reviewAttestationSubmission,
  getComplianceAttestationStatus, listComplianceAttestations,
  sendComplianceAttestationReminders,
} from '../services/compliance/compliance-attestation.service';

// --- Service imports: assessment & findings ---
import {
  assessFramework, getCoverageMatrix, getAssessmentHistory,
  createFinding, updateFinding, generateFindingRemediationSuggestions,
  getFindingWithAISuggestions, bulkUpdateFindingStatus, bulkAssignControls,
  assignReviewer, submitForReview, approveAssessment, rejectAssessment,
  getControlsRegister, getControlMonitoring, getFindingsRegister,
  getSavingsMetrics, getComplianceByOrgUnit,
} from '../services/compliance/compliance-assessment-findings.service';

// --- Service imports: gaps & roadmap ---
import {
  getGapsRegister, getGapDetail, updateGap,
  createGapRemediationTask, validateGap,
  getComplianceRoadmap, generateRoadmap, updateMilestone,
  updateRoadmapTask,
} from '../services/compliance/compliance-gaps-roadmap.service';

// --- Service imports: heatmap ---
import { computeComplianceHeatMap } from '../services/compliance/compliance-heatmap.service';

// --- Service imports: workspace overview ---
import {
  getComplianceOverview, getAuditReadiness, checkComplianceHealth,
} from '../services/compliance/compliance-workspace-overview.service';

// --- Service imports: settings ---
import { getComplianceSettings } from '../services/compliance/compliance-settings.service';

// --- Service imports: frameworks & obligations ---
import {
  getFrameworksRegister, getFrameworkDetail, getFrameworkComparison,
  updateFramework, getDomainsRegister, getDomainSummary, getDomainDetail,
  getObligationsRegister, getObligationDetail, mapControlToObligation,
  mapEvidenceToObligation, updateObligation as updateObligationFO, importObligations,
} from '../services/compliance/compliance-frameworks-obligations.service';

// --- Service imports: benchmark ---
import { getComplianceBenchmarks } from '../services/compliance/compliance-benchmark.service';

// --- Service imports: calendar ---
import { getComplianceCalendar } from '../services/compliance/compliance-calendar.service';

// --- Service imports: export ---
import { exportControls, exportFindings } from '../services/compliance/compliance-export-data.service';

// --- Service imports: drift detection ---
import {
  detectComplianceDrift, captureDriftBaseline,
  getDriftRegister,
} from '../services/compliance/compliance-drift-detection.service';

// --- Service imports: regulatory changes ---
import {
  getRegulatoryChanges, createRegulatoryChange,
  assessRegulatoryImpact, updateRegulatoryChangeStatus,
} from '../services/compliance/compliance-regulatory-changes.service';

// --- Service imports: advanced (CCM, filings, test plans) ---
import {
  getCrossFrameworkMap, getFilings, createFiling,
  updateFilingStatus,
} from '../services/compliance/compliance-advanced.service';

// --- Service imports: audit package ---
import {
  getAuditPackage, getAuditorDashboard, getTraceabilityMatrix,
} from '../services/compliance/compliance-audit-package.service';

// --- Service imports: workspace export ---
import { exportComplianceReport } from '../services/compliance/compliance-workspace.service';

// --- Service imports: scoring policy ---
import {
  createScoringPolicy, getScoringPolicies, getScoringPolicyById,
  updateScoringPolicy, deleteScoringPolicy, applyPolicy,
} from '../services/misc/scoring-policy.service';

// --- Service imports: controls advanced ---
import {
  scheduleControlTest, getScheduledTests, executeScheduledTest,
  reportDeficiency, getDeficiencies, updateDeficiencyStatus,
  assessControlEffectiveness, getEffectivenessAssessments,
} from '../services/misc/controls-advanced.service';

// ── FRAMEWORK MAPPING ────────────────────────────────

export async function mapFrameworkHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await mapFramework(req.tenantId!, req.params.frameworkId);
  res.json(ok(result, req));
}

export async function mapControlToNodesHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await mapControlToNodes(req.tenantId!, req.params.controlId, req.body.nodeIds);
  setAuditData(res as any, { action: 'update', entityType: 'control_mapping', entityId: req.params.controlId, afterState: result });
  res.json(ok(result, req));
}

export async function testControlHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await testControl(req.tenantId!, req.params.controlId, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'control_test', entityId: req.params.controlId });
  res.json(ok(result, req));
}

// ── GAP ANALYSIS & REMEDIATION ───────────────────────

export async function gapAnalysis(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getGapAnalysis(req.tenantId!, req.params.frameworkId);
  res.json(ok(result, req));
}

export async function createRemediationHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createRemediation(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'remediation', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function listRemediations(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getRemediations(req.tenantId!, req.query.frameworkId as string | undefined);
  res.json(ok(result, req));
}

export async function updateRemediationStatusHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateRemediationStatus(req.tenantId!, req.params.controlId, req.body.status);
  setAuditData(res as any, { action: 'update', entityType: 'remediation', entityId: req.params.controlId });
  res.json(ok(result, req));
}

// ── ATTESTATION ──────────────────────────────────────

export async function createAttestationCampaign(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createComplianceAttestationCampaign(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'attestation_campaign', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function activateAttestationCampaign(req: AuthenticatedRequest, res: Response): Promise<void> {
  await activateCampaign(req.tenantId!, req.params.campaignId);
  setAuditData(res as any, { action: 'update', entityType: 'attestation_campaign', entityId: req.params.campaignId });
  res.json(action('Campaign activated', req));
}

export async function submitAttestation(req: AuthenticatedRequest, res: Response): Promise<void> {
  await submitComplianceAttestation(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'attestation_submission' });
  res.status(201).json(action('Attestation submitted', req));
}

export async function reviewAttestation(req: AuthenticatedRequest, res: Response): Promise<void> {
  await reviewAttestationSubmission(req.tenantId!, req.params.campaignId, req.user!.userId!, req.body.decision);
  setAuditData(res as any, { action: 'update', entityType: 'attestation_review', entityId: req.params.campaignId });
  res.json(action('Attestation reviewed', req));
}

export async function getAttestationStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getComplianceAttestationStatus(req.tenantId!, req.params.campaignId);
  res.json(ok(result, req));
}

export async function listAttestations(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await listComplianceAttestations(req.tenantId!, req.query as Record<string, string>);
  res.json(ok(result, req));
}

export async function sendAttestationReminders(req: AuthenticatedRequest, res: Response): Promise<void> {
  const count = await sendComplianceAttestationReminders(req.tenantId!);
  res.json(ok({ remindersSent: count }, req));
}

// ── ASSESSMENT ───────────────────────────────────────

export async function assessFrameworkHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await assessFramework(req.tenantId!, req.params.frameworkCode, req.user?.userId);
  setAuditData(res as any, { action: 'create', entityType: 'assessment', afterState: result });
  res.json(ok(result, req));
}

export async function coverageMatrix(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getCoverageMatrix(req.tenantId!, req.params.frameworkId);
  res.json(ok(result, req));
}

export async function assessmentHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getAssessmentHistory(req.tenantId!);
  res.json(ok(result, req));
}

export async function assignAssessmentReviewer(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await assignReviewer(req.tenantId!, req.params.assessmentId, req.body.reviewerId);
  setAuditData(res as any, { action: 'update', entityType: 'assessment', entityId: req.params.assessmentId });
  res.json(ok(result, req));
}

export async function submitAssessmentForReview(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await submitForReview(req.tenantId!, req.params.assessmentId);
  setAuditData(res as any, { action: 'update', entityType: 'assessment', entityId: req.params.assessmentId });
  res.json(ok(result, req));
}

export async function approveAssessmentHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await approveAssessment(req.tenantId!, req.params.assessmentId, req.body.notes);
  setAuditData(res as any, { action: 'update', entityType: 'assessment', entityId: req.params.assessmentId });
  res.json(ok(result, req));
}

export async function rejectAssessmentHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await rejectAssessment(req.tenantId!, req.params.assessmentId, req.body.notes);
  setAuditData(res as any, { action: 'update', entityType: 'assessment', entityId: req.params.assessmentId });
  res.json(ok(result, req));
}

// ── FINDINGS ─────────────────────────────────────────

export async function createFindingHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createFinding(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'compliance_finding', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function updateFindingHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateFinding(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'compliance_finding', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function getFindingSuggestions(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await generateFindingRemediationSuggestions(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function getFindingWithAI(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getFindingWithAISuggestions(req.tenantId!, req.params.id);
  if (!result) throw new NotFoundError('finding', req.params.id);
  res.json(ok(result, req));
}

export async function bulkUpdateFindings(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await bulkUpdateFindingStatus(req.tenantId!, req.body.ids, req.body.status);
  res.json(ok(result, req));
}

export async function bulkAssignControlsHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await bulkAssignControls(req.tenantId!, req.body.controlIds, req.body.assigneeId);
  res.json(ok(result, req));
}

export async function listFindings(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getFindingsRegister(req.tenantId!, req.query.frameworkId as string | undefined, req.query.severity as string | undefined);
  res.json(ok(result, req));
}

// ── CONTROLS REGISTER ────────────────────────────────

export async function listControls(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getControlsRegister(req.tenantId!, req.query.frameworkId as string | undefined);
  res.json(ok(result, req));
}

export async function controlMonitoring(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getControlMonitoring(req.tenantId!, { frameworkId: req.query.frameworkId as string | undefined });
  res.json(ok(result, req));
}

// ── GAPS & ROADMAP ───────────────────────────────────

export async function listGaps(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getGapsRegister(req.tenantId!, req.query.frameworkId as string | undefined, req.query.severity as string | undefined);
  res.json(ok(result, req));
}

export async function getGap(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getGapDetail(req.tenantId!, req.params.id);
  if (!result) throw new NotFoundError('gap', req.params.id);
  res.json(ok(result, req));
}

export async function updateGapHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateGap(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'compliance_gap', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function createGapRemediation(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createGapRemediationTask(req.tenantId!, req.params.gapId, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'gap_remediation_task', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function validateGapHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await validateGap(req.tenantId!, req.params.gapId, req.body);
  res.json(ok(result, req));
}

export async function roadmap(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getComplianceRoadmap(req.tenantId!);
  res.json(ok(result, req));
}

export async function generateRoadmapHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await generateRoadmap(req.tenantId!);
  setAuditData(res as any, { action: 'create', entityType: 'compliance_roadmap' });
  res.status(201).json(ok(result, req));
}

export async function updateMilestoneHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateMilestone(req.tenantId!, req.params.milestoneId, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'roadmap_milestone', entityId: req.params.milestoneId });
  res.json(ok(result, req));
}

export async function updateRoadmapTaskHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateRoadmapTask(req.tenantId!, req.params.taskId, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'roadmap_task', entityId: req.params.taskId });
  res.json(ok(result, req));
}

// ── HEATMAP ──────────────────────────────────────────

export async function heatmap(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await computeComplianceHeatMap(req.tenantId!);
  res.json(ok(result, req));
}

// ── WORKSPACE OVERVIEW ───────────────────────────────

export async function overview(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getComplianceOverview(req.tenantId!, req.query as Record<string, string>);
  res.json(ok(result, req));
}

export async function auditReadiness(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getAuditReadiness(req.tenantId!, req.query as Record<string, string>);
  res.json(ok(result, req));
}

export async function healthCheck(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await checkComplianceHealth(req.tenantId!);
  res.json(ok(result, req));
}

export async function settings(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getComplianceSettings(req.tenantId!);
  res.json(ok(result, req));
}

export async function savingsMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getSavingsMetrics(req.tenantId!);
  res.json(ok(result, req));
}

export async function complianceByOrgUnit(req: AuthenticatedRequest, res: Response): Promise<void> {
  const groupBy = (req.query.groupBy as 'department' | 'business_unit') || 'department';
  const result = await getComplianceByOrgUnit(req.tenantId!, groupBy);
  res.json(ok(result, req));
}

// ── FRAMEWORKS & OBLIGATIONS ─────────────────────────

export async function listFrameworks(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getFrameworksRegister(req.tenantId!, req.query as Record<string, string>);
  res.json(ok(result, req));
}

export async function getFramework(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getFrameworkDetail(req.tenantId!, req.params.frameworkCode);
  if (!result) throw new NotFoundError('framework', req.params.frameworkCode);
  res.json(ok(result, req));
}

export async function compareFrameworks(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getFrameworkComparison(req.tenantId!);
  res.json(ok(result, req));
}

export async function updateFrameworkHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateFramework(req.tenantId!, req.params.frameworkCode, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'framework', entityId: req.params.frameworkCode });
  res.json(ok(result, req));
}

export async function listDomains(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getDomainsRegister(req.tenantId!, req.query.frameworkId as string | undefined);
  res.json(ok(result, req));
}

export async function getDomainSummaryHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getDomainSummary(req.tenantId!, req.params.domainId);
  if (!result) throw new NotFoundError('domain', req.params.domainId);
  res.json(ok(result, req));
}

export async function getDomainDetailHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getDomainDetail(req.tenantId!, req.params.nodeId);
  if (!result) throw new NotFoundError('domain_node', req.params.nodeId);
  res.json(ok(result, req));
}

export async function listObligations(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getObligationsRegister(req.tenantId!, req.query.frameworkId as string | undefined);
  res.json(ok(result, req));
}

export async function getObligation(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getObligationDetail(req.tenantId!, req.params.nodeId);
  if (!result) throw new NotFoundError('obligation', req.params.nodeId);
  res.json(ok(result, req));
}

export async function mapControlToObligationHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await mapControlToObligation(req.tenantId!, req.params.nodeId, req.body.controlId);
  setAuditData(res as any, { action: 'create', entityType: 'obligation_control_mapping', entityId: req.params.nodeId });
  res.status(201).json(ok(result, req));
}

export async function mapEvidenceToObligationHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await mapEvidenceToObligation(req.tenantId!, req.params.nodeId, req.body.evidenceId);
  setAuditData(res as any, { action: 'create', entityType: 'obligation_evidence_mapping', entityId: req.params.nodeId });
  res.status(201).json(ok(result, req));
}

export async function updateObligationHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateObligationFO(req.tenantId!, req.params.nodeId, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'obligation', entityId: req.params.nodeId });
  res.json(ok(result, req));
}

export async function importObligationsHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await importObligations(req.tenantId!, req.body.obligations);
  setAuditData(res as any, { action: 'create', entityType: 'obligations_import' });
  res.status(201).json(ok(result, req));
}

// ── BENCHMARKS ───────────────────────────────────────

export async function benchmarks(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getComplianceBenchmarks(req.tenantId!);
  res.json(ok(result, req));
}

// ── CALENDAR ─────────────────────────────────────────

export async function calendar(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { from, to } = req.query as { from: string; to: string };
  const result = await getComplianceCalendar(req.tenantId!, from, to);
  res.json(ok(result, req));
}

// ── EXPORT ───────────────────────────────────────────

export async function exportControlsHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const format = (req.query.format as 'csv' | 'xlsx') || 'csv';
  const result = await exportControls(req.tenantId!, format, req.query.frameworkId as string | undefined);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="controls-export.csv"');
  res.send(result);
}

export async function exportFindingsHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const format = (req.query.format as 'csv' | 'xlsx') || 'csv';
  const result = await exportFindings(req.tenantId!, format, req.query.frameworkId as string | undefined);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="findings-export.csv"');
  res.send(result);
}

export async function exportReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await exportComplianceReport(req.tenantId!);
  res.json(ok(result, req));
}

// ── DRIFT DETECTION ──────────────────────────────────

export async function detectDrift(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await detectComplianceDrift(req.tenantId!);
  res.json(ok(result, req));
}

export async function captureDriftBaselineHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await captureDriftBaseline(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'drift_baseline' });
  res.status(201).json(ok(result, req));
}

export async function listDrifts(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getDriftRegister(req.tenantId!, req.query as Record<string, string>);
  res.json(ok(result, req));
}

// ── REGULATORY CHANGES ───────────────────────────────

export async function listRegulatoryChanges(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getRegulatoryChanges(req.tenantId!, req.query.status as string | undefined);
  res.json(ok(result, req));
}

export async function createRegulatoryChangeHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createRegulatoryChange(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'regulatory_change', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function assessRegulatoryImpactHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await assessRegulatoryImpact(req.tenantId!, req.params.changeId, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'regulatory_impact', entityId: req.params.changeId });
  res.json(ok(result, req));
}

export async function updateRegulatoryChangeStatusHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateRegulatoryChangeStatus(req.tenantId!, req.params.changeId, req.body.status);
  setAuditData(res as any, { action: 'update', entityType: 'regulatory_change', entityId: req.params.changeId });
  res.json(ok(result, req));
}

// ── CROSS-FRAMEWORK / CCM / FILINGS ─────────────────

export async function crossFrameworkMap(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getCrossFrameworkMap(req.tenantId!);
  res.json(ok(result, req));
}

export async function listFilings(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getFilings(req.tenantId!, req.query as Record<string, string>);
  res.json(ok(result, req));
}

export async function createFilingHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createFiling(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'filing', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function updateFilingStatusHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateFilingStatus(req.tenantId!, req.params.filingId, req.body.status);
  setAuditData(res as any, { action: 'update', entityType: 'filing', entityId: req.params.filingId });
  res.json(ok(result, req));
}

export async function ccmDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getCrossFrameworkMap(req.tenantId!);
  res.json(ok(result, req));
}

// ── AUDIT PACKAGE ────────────────────────────────────

export async function auditPackage(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getAuditPackage(req.tenantId!, req.query as Record<string, string>);
  res.json(ok(result, req));
}

export async function auditorDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getAuditorDashboard(req.tenantId!);
  res.json(ok(result, req));
}

export async function traceabilityMatrix(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getTraceabilityMatrix(req.tenantId!, req.query as Record<string, string>);
  res.json(ok(result, req));
}

// ── SCORING POLICY ───────────────────────────────────

export async function listScoringPolicies(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getScoringPolicies(req.tenantId!);
  res.json(ok(result, req));
}

export async function getScoringPolicy(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getScoringPolicyById(req.tenantId!, req.params.id);
  if (!result) throw new NotFoundError('scoring_policy', req.params.id);
  res.json(ok(result, req));
}

export async function createScoringPolicyHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createScoringPolicy(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'scoring_policy', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function updateScoringPolicyHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateScoringPolicy(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'scoring_policy', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function deleteScoringPolicyHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  await deleteScoringPolicy(req.tenantId!, req.params.id);
  setAuditData(res as any, { action: 'delete', entityType: 'scoring_policy', entityId: req.params.id });
  res.json(action('Scoring policy deleted', req));
}

export async function applyScoringPolicy(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await applyPolicy(req.tenantId!, req.params.id, req.body);
  res.json(ok(result, req));
}

// ── CONTROL TESTING & DEFICIENCIES ───────────────────

export async function scheduleControlTestHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await scheduleControlTest(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'control_test_schedule', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function listScheduledTests(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getScheduledTests(req.tenantId!);
  res.json(ok(result, req));
}

export async function executeScheduledTestHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await executeScheduledTest(req.tenantId!, req.params.testId);
  setAuditData(res as any, { action: 'update', entityType: 'control_test', entityId: req.params.testId });
  res.json(ok(result, req));
}

export async function reportDeficiencyHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await reportDeficiency(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'deficiency', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function listDeficiencies(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getDeficiencies(req.tenantId!, { controlId: req.query.controlId as string | undefined, status: req.query.status as string | undefined, severity: req.query.severity as string | undefined });
  res.json(ok(result, req));
}

export async function updateDeficiencyStatusHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateDeficiencyStatus(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'deficiency', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function assessControlEffectivenessHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await assessControlEffectiveness(req.tenantId!, req.params.controlId, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'effectiveness_assessment', entityId: req.params.controlId });
  res.json(ok(result, req));
}

export async function listEffectivenessAssessments(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getEffectivenessAssessments(req.tenantId!, req.query.controlId as string | undefined);
  res.json(ok(result, req));
}
