// ============================================
// Training Module — Controller Layer
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
  getTrainingContent, createTrainingContent, updateTrainingContent,
  createCampaign, getCampaigns, launchCampaign,
  assignTraining, getAssignments, completeAssignment,
  getCertifications, revokeCertificate,
  createPhishingCampaign, getPhishingCampaigns, launchPhishingCampaign,
  recordPhishingResult, getTrainingComplianceSnapshot,
  checkOverdueAssignments, checkExpiringCertifications,
  getSectorTrainingPath, assignSectorTrainingToUser,
  getTrainingByFramework, getRegulatorTrainingStatus,
} from '../services/training-advanced.service';
import {
  createAssessmentCampaign, getAssessmentCampaigns,
  getCampaignCompletionStatus, delegateAssessmentSection,
  getAssessmentDelegations, compareAssessments,
  attachEvidenceToResponse,
  submitAnonymousReport, getAnonymousReports,
  getAnonymousReportByTrackingCode, updateAnonymousReport,
} from '../services/assessment-advanced.service';
import {
  getTrainingAuditReadiness, getTrainingCoverageByFramework,
  getCompetencyGapsAsRiskFactor,
} from '../services/training-hooks.service';
import {
  loadTrainingData, purgeTrainingData, hasTrainingData,
} from '../services/training-data.service';
import {
  generateQuestionnaire, distributeQuestionnaire,
  evaluateResponses, generateRemediationItems,
} from '../services/questionnaire-engine.service';
import { generateIntelligenceReport } from '../services/questionnaire-intelligence.service';
import { recommendFrameworks, getSectorFrameworkBreakdown } from '../services/questionnaire-framework-recommender.service';

// ── TRAINING CONTENT ───────────────────────────────────

export async function listContent(req: AuthenticatedRequest, res: Response): Promise<void> {
  const category = req.query.category as string | undefined;
  const result = await getTrainingContent(req.tenantId!, category);
  res.json(ok(result, req));
}

export async function createContent(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createTrainingContent(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'training_content', entityId: result?.content_id, afterState: result });
  res.status(201).json(ok(result, req));
}

export async function updateContent(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateTrainingContent(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'training_content', entityId: req.params.id });
  res.json(ok(result, req));
}

// ── CAMPAIGNS ──────────────────────────────────────────

export async function listCampaigns(req: AuthenticatedRequest, res: Response): Promise<void> {
  const status = req.query.status as string | undefined;
  const result = await getCampaigns(req.tenantId!, status);
  res.json(ok(result, req));
}

export async function createCampaignHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createCampaign(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'training_campaign', entityId: result?.campaign_id, afterState: result });
  res.status(201).json(ok(result, req));
}

export async function getCampaignById(req: AuthenticatedRequest, res: Response): Promise<void> {
  // Use getCampaigns + filter since no direct getById
  const all = await getCampaigns(req.tenantId!);
  const campaign = all.find((c: Record<string, unknown>) => c.campaign_id === req.params.id);
  if (!campaign) throw new NotFoundError('training_campaign', req.params.id);
  res.json(ok(campaign, req));
}

export async function launchCampaignHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await launchCampaign(req.tenantId!, req.params.id);
  if (!result) throw new NotFoundError('training_campaign', req.params.id);
  setAuditData(res as any, { action: 'update', entityType: 'training_campaign', entityId: req.params.id });
  res.json(ok(result, req));
}

// ── ASSIGNMENTS ────────────────────────────────────────

export async function listAssignments(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.query.userId as string | undefined;
  const status = req.query.status as string | undefined;
  const result = await getAssignments(req.tenantId!, userId, status);
  res.json(ok(result, req));
}

export async function assign(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await assignTraining(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'training_assignment', entityId: result?.assignment_id });
  res.status(201).json(ok(result, req));
}

export async function completeAssignmentHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await completeAssignment(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'training_assignment', entityId: req.params.id });
  res.json(ok(result, req));
}

// ── CERTIFICATIONS ─────────────────────────────────────

export async function listCertifications(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.query.userId as string | undefined;
  const result = await getCertifications(req.tenantId!, userId);
  res.json(ok(result, req));
}

export async function revokeCertificateHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await revokeCertificate(req.tenantId!, req.params.id, req.body.reason);
  if (!result) throw new NotFoundError('certificate', req.params.id);
  setAuditData(res as any, { action: 'update', entityType: 'certificate', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function expiringCertifications(req: AuthenticatedRequest, res: Response): Promise<void> {
  const daysAhead = parseInt(req.query.daysAhead as string, 10) || 30;
  const result = await checkExpiringCertifications(req.tenantId!, daysAhead);
  res.json(ok(result, req));
}

// ── PHISHING CAMPAIGNS ─────────────────────────────────

export async function listPhishingCampaigns(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getPhishingCampaigns(req.tenantId!);
  res.json(ok(result, req));
}

export async function createPhishing(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createPhishingCampaign(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'phishing_campaign', entityId: result?.phishing_id, afterState: result });
  res.status(201).json(ok(result, req));
}

export async function launchPhishing(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await launchPhishingCampaign(req.tenantId!, req.params.id);
  if (!result) throw new NotFoundError('phishing_campaign', req.params.id);
  setAuditData(res as any, { action: 'update', entityType: 'phishing_campaign', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function recordPhishing(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await recordPhishingResult(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'phishing_result', entityId: req.params.id });
  res.json(ok(result, req));
}

// ── COMPLIANCE SNAPSHOT ────────────────────────────────

export async function complianceSnapshot(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getTrainingComplianceSnapshot(req.tenantId!);
  res.json(ok(result, req));
}

export async function overdueAssignments(req: AuthenticatedRequest, res: Response): Promise<void> {
  const count = await checkOverdueAssignments(req.tenantId!);
  res.json(ok({ overdueCount: count }, req));
}

// ── SECTOR / FRAMEWORK TRAINING ────────────────────────

export async function sectorTrainingPath(req: AuthenticatedRequest, res: Response): Promise<void> {
  const sectorCode = req.params.sectorCode || (req.query.sectorCode as string);
  const result = await getSectorTrainingPath(req.tenantId!, sectorCode);
  res.json(ok(result, req));
}

export async function assignSectorTraining(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await assignSectorTrainingToUser(
    req.tenantId!, req.body.userId, req.body.sectorCode, req.body.assignedBy,
  );
  setAuditData(res as any, { action: 'create', entityType: 'sector_training_assignment' });
  res.status(201).json(ok(result, req));
}

export async function trainingByFramework(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getTrainingByFramework(req.tenantId!);
  res.json(ok(result, req));
}

export async function regulatorTrainingStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getRegulatorTrainingStatus(req.tenantId!);
  res.json(ok(result, req));
}

// ── ASSESSMENT CAMPAIGNS ───────────────────────────────

export async function listAssessmentCampaigns(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getAssessmentCampaigns(req.tenantId!);
  res.json(ok(result, req));
}

export async function createAssessment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await createAssessmentCampaign(req.tenantId!, { ...req.body, created_by: userId });
  setAuditData(res as any, { action: 'create', entityType: 'assessment_campaign', entityId: result?.campaign_id, afterState: result });
  res.status(201).json(ok(result, req));
}

export async function getAssessmentById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const all = await getAssessmentCampaigns(req.tenantId!);
  const assessment = all.find((a: Record<string, unknown>) => a.campaign_id === req.params.id);
  if (!assessment) throw new NotFoundError('assessment_campaign', req.params.id);
  res.json(ok(assessment, req));
}

export async function campaignCompletionStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getCampaignCompletionStatus(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function delegateSection(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await delegateAssessmentSection(
    req.tenantId!, req.params.id,
    { delegator: req.body.delegatedByUserId || req.user!.userId!, delegate: req.body.delegateToUserId, section_ids: req.body.sectionId ? [req.body.sectionId] : undefined },
  );
  setAuditData(res as any, { action: 'create', entityType: 'assessment_delegation', entityId: req.params.id });
  res.status(201).json(ok(result, req));
}

export async function assessmentDelegations(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getAssessmentDelegations(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function compareAssessmentsHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await compareAssessments(req.tenantId!, req.body.campaignIdA, req.body.campaignIdB);
  res.json(ok(result, req));
}

export async function attachEvidence(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await attachEvidenceToResponse(
    req.tenantId!, req.params.responseId, req.body.evidenceIds || [req.body.evidenceUrl].filter(Boolean),
  );
  setAuditData(res as any, { action: 'create', entityType: 'assessment_evidence', entityId: req.params.responseId });
  res.status(201).json(ok(result, req));
}

// ── ANONYMOUS REPORTS ──────────────────────────────────

export async function submitAnonymous(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await submitAnonymousReport(req.tenantId!, req.body);
  res.status(201).json(ok(result, req));
}

export async function listAnonymousReports(req: AuthenticatedRequest, res: Response): Promise<void> {
  const filters: { status?: string } = {};
  if (req.query.status) filters.status = req.query.status as string;
  const result = await getAnonymousReports(req.tenantId!, filters);
  res.json(ok(result, req));
}

export async function anonymousReportByTrackingCode(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getAnonymousReportByTrackingCode(req.tenantId!, req.params.trackingCode);
  if (!result) throw new NotFoundError('anonymous_report', req.params.trackingCode);
  res.json(ok(result, req));
}

export async function updateAnonymousReportHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateAnonymousReport(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'anonymous_report', entityId: req.params.id });
  res.json(ok(result, req));
}

// ── HOOKS / AUDIT READINESS ────────────────────────────

export async function auditReadiness(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getTrainingAuditReadiness(req.tenantId!);
  res.json(ok(result, req));
}

export async function coverageByFramework(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getTrainingCoverageByFramework(req.tenantId!);
  res.json(ok(result, req));
}

export async function competencyGaps(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getCompetencyGapsAsRiskFactor(req.tenantId!);
  res.json(ok(result, req));
}

// ── TRAINING DATA ──────────────────────────────────────

export async function loadData(req: AuthenticatedRequest, res: Response): Promise<void> {
  const volume = req.body.volume || 'small';
  const result = await loadTrainingData(req.tenantId!, volume);
  setAuditData(res as any, { action: 'create', entityType: 'training_data', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function purgeData(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await purgeTrainingData(req.tenantId!);
  setAuditData(res as any, { action: 'delete', entityType: 'training_data' });
  res.json(ok(result, req));
}

export async function hasData(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await hasTrainingData(req.tenantId!);
  res.json(ok({ hasData: result }, req));
}

// ── QUESTIONNAIRE ENGINE ───────────────────────────────

export async function generateQuestionnaireHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await generateQuestionnaire(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'questionnaire' });
  res.status(201).json(ok(result, req));
}

export async function distributeQuestionnaireHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await distributeQuestionnaire(req.tenantId!, req.body.questionnaireId);
  setAuditData(res as any, { action: 'create', entityType: 'questionnaire_distribution' });
  res.status(201).json(ok(result, req));
}

export async function evaluateResponsesHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await evaluateResponses(req.tenantId!, req.body.questionnaireId);
  res.json(ok(result, req));
}

export async function generateRemediationHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await generateRemediationItems(req.tenantId!, req.body.questionnaireId, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'questionnaire_remediation' });
  res.status(201).json(ok(result, req));
}

// ── QUESTIONNAIRE INTELLIGENCE ─────────────────────────

export async function intelligenceReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await generateIntelligenceReport(req.tenantId!, req.body);
  res.json(ok(result, req));
}

// ── FRAMEWORK RECOMMENDER ──────────────────────────────

export async function recommendFrameworksHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await recommendFrameworks(req.body.responses || [], req.body.categoryScores || []);
  res.json(ok(result, req));
}

export async function sectorFrameworkBreakdown(req: AuthenticatedRequest, res: Response): Promise<void> {
  const sectorId = req.params.sectorId || (req.query.sectorId as string);
  const result = await getSectorFrameworkBreakdown(sectorId);
  res.json(ok(result, req));
}
