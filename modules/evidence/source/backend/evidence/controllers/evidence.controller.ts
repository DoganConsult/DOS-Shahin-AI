// ============================================
// Evidence Module — Controller Layer
// Thin HTTP orchestrator: extracts request data,
// calls services, formats responses, sets audit context.
// ============================================

import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, paginated as _paginated, action } from '@dos/module-sdk';
import { NotFoundError } from '../../../errors/index';
import { setAuditData } from '../ports/middleware.port';

// --- Service imports: core evidence ---
import {
  transitionStatus,
} from '../services/core/evidence-lifecycle.service';

// --- Service imports: catalog & taxonomy ---
import {
  getCatalog, createCatalogEntry, checkCompleteness,
  searchCatalog, addTags, removeTag, getTags,
  getTaxonomy, getAdminSettings, updateAdminSettings,
  addTaxonomyEntry, updateTaxonomyEntry,
  getEvidenceById, updateEvidence as updateEvidenceRecord,
  softDeleteEvidence, archiveEvidence, restoreEvidence,
} from '../services/analysis/evidence-catalog.service';

// --- Service imports: requests ---
import {
  getEvidenceRequests, createEvidenceRequest,
  getEvidenceRequestById, updateEvidenceRequest,
} from '../services/workflow/evidence-request.service';

// --- Service imports: reviews ---
import {
  getEvidenceReviews, createEvidenceReview, createQualityAssessment,
  getReviewQueue, requestMoreInfo, getQualityAssessments, getReviewStats,
} from '../services/workflow/evidence-review.service';

// --- Service imports: schedules ---
import {
  createEvidenceSchedule, getEvidenceSchedules,
  updateEvidenceSchedule, deleteEvidenceSchedule,
} from '../services/collection/evidence-schedule.service';

// --- Service imports: dashboard ---
import {
  computeCommandCenterWidgets, computeWorkQueueItems,
  getSourceHealth, getRecentActivity, getEvidenceByStatus, getEvidenceBySource,
} from '../services/reporting/evidence-dashboard.service';

// --- Service imports: vault ---
import {
  uploadEvidence, getEvidence, listEvidenceVersions,
  placeLegalHold, removeLegalHold,
  verifyEvidenceIntegrity, getVaultStats,
} from '../services/collection/evidence-vault.service';

// --- Service imports: packages ---
import {
  listPackages, getPackageDetail, createPackage,
  updatePackage, deletePackage, addItemToPackage,
  removeItemFromPackage, finalizePackage,
  exportPackage, getPackageExports,
} from '../services/reporting/evidence-package.service';

// --- Service imports: reporting ---
import {
  generateAgingReport, generateBacklogReport,
  generateSourceCoverageReport, generateFreshnessReport,
  generateQualityReport, generateReuseReport,
  generateOverdueRequestsReport, generateReviewBacklogReport,
  generateStaleEvidenceReport, generateAuditReadinessReport,
} from '../services/reporting/evidence-reporting.service';

// --- Service imports: submission ---
import { submitEvidence, verifyHashChain } from '../services/workflow/evidence-submission.service';

// --- Service imports: freshness ---
import {
  getFreshnessOverview, getExpiringEvidenceByDays,
  getStaleEvidence, batchFreshnessCheck,
  getFreshnessHistory, bulkMarkAsStale,
  bulkExtendExpiration, bulkRefreshEvidence,
} from '../services/collection/evidence-freshness.service';

// --- Service imports: quality scoring ---
import {
  scoreEvidenceQuality, batchScoreEvidenceQuality,
  scoreControlEvidence, getControlEvidenceQualityAverage,
} from '../services/analysis/evidence-quality-scoring.service';

// --- Service imports: reuse ---
import {
  getEvidenceReuseMap, suggestReuse, detectOrphans,
  markAsReusable, unmarkReusable, linkToObject,
  unlinkFromObject, getEvidenceLinks, getDuplicateCandidates,
  resolveDuplicate, getReusableEvidence,
} from '../services/reporting/evidence-reuse.service';

// --- Service imports: AI ---
import {
  suggestEvidenceMetadata, suggestLinkages,
  detectDuplicates, getAiSuggestionStatus,
} from '../services/analysis/evidence-ai.service';

// --- Service imports: files ---
import {
  uploadEvidenceFile, downloadEvidenceFile, listEvidenceFiles,
} from '../services/core/evidence-files.service';

// --- Service imports: query ---
import {
  getAllEvidence, getOverviewStats, getEvidenceMappings,
  getExpiredEvidence, getEvidenceForControl,
} from '../services/core/evidence-query.service';

// --- Service imports: scoring ---
import {
  scoreEvidence, getEvidenceCoverageDashboard,
  getEvidenceFreshness, checkControlCompleteness as _scoringControlCompleteness,
  getComplianceGapReport,
} from '../services/analysis/evidence-scoring.service';

// --- Service imports: auto-collection ---
import {
  runAutoCollection, listCollectionRules,
  createCollectionRule, updateCollectionRule, deleteCollectionRule,
  listCollectionJobs,
} from '../services/collection/evidence-auto-collection.service';

// --- Service imports: health ---
import {
  getEvidenceHealthSnapshot, getEvidenceCompletenessPerControl,
} from '../services/core/evidence-health.service';

// ── EVIDENCE CATALOG & LIFECYCLE ─────────────────────

export async function listEvidences(req: AuthenticatedRequest, res: Response): Promise<void> {
  const controlId = (req.query.controlId as string) || '';
  const result = await getCatalog(req.tenantId!, controlId);
  res.json(ok(result, req));
}

export async function getEvidenceByIdHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getEvidenceById(req.tenantId!, req.params.id);
  if (!result) throw new NotFoundError('evidence', req.params.id);
  res.json(ok(result, req));
}

export async function createEvidence(req: AuthenticatedRequest, res: Response): Promise<void> {
  const _userId = req.user!.userId!;
  const result = await createCatalogEntry(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'evidence', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function updateEvidence(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await updateEvidenceRecord(req.tenantId!, req.params.id, req.body, userId);
  setAuditData(res as any, { action: 'update', entityType: 'evidence', entityId: req.params.id, afterState: result });
  res.json(ok(result, req));
}

export async function deleteEvidence(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await softDeleteEvidence(req.tenantId!, req.params.id, userId, req.body.reason);
  setAuditData(res as any, { action: 'delete', entityType: 'evidence', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function archiveEvidenceHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await archiveEvidence(req.tenantId!, req.params.id, userId);
  setAuditData(res as any, { action: 'update', entityType: 'evidence', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function restoreEvidenceHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await restoreEvidence(req.tenantId!, req.params.id, userId);
  setAuditData(res as any, { action: 'update', entityType: 'evidence', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function transitionStatusHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await transitionStatus(req.tenantId!, req.params.id, req.body.status, userId, req.body.reason);
  setAuditData(res as any, { action: 'update', entityType: 'evidence_status', entityId: req.params.id });
  res.json(ok(result, req));
}

// ── SEARCH & TAGS ────────────────────────────────────

export async function searchEvidence(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await searchCatalog(req.tenantId!, req.query as Record<string, string>);
  res.json(ok(result, req));
}

export async function addTagsHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await addTags(req.tenantId!, req.params.id, req.body.tags);
  setAuditData(res as any, { action: 'create', entityType: 'evidence_tag', entityId: req.params.id });
  res.status(201).json(ok(result, req));
}

export async function removeTagHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  await removeTag(req.tenantId!, req.params.id, req.params.tagId);
  res.json(action('Tag removed', req));
}

export async function getTagsHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getTags(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

// ── TAXONOMY & ADMIN ─────────────────────────────────

export async function taxonomy(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getTaxonomy(req.tenantId!);
  res.json(ok(result, req));
}

export async function adminSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getAdminSettings(req.tenantId!);
  res.json(ok(result, req));
}

export async function updateAdminSettingsHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await updateAdminSettings(req.tenantId!, req.body.key, req.body.value, userId);
  setAuditData(res as any, { action: 'update', entityType: 'evidence_admin_settings' });
  res.json(ok(result, req));
}

export async function addTaxonomyEntryHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await addTaxonomyEntry(req.tenantId!, req.params.type, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'evidence_taxonomy' });
  res.status(201).json(ok(result, req));
}

export async function updateTaxonomyEntryHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateTaxonomyEntry(req.tenantId!, req.params.type, req.params.entryId, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'evidence_taxonomy', entityId: req.params.entryId });
  res.json(ok(result, req));
}

// ── REQUESTS ─────────────────────────────────────────

export async function listRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getEvidenceRequests(req.tenantId!, req.query as Record<string, string>);
  res.json(ok(result, req));
}

export async function getRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getEvidenceRequestById(req.tenantId!, req.params.id);
  if (!result) throw new NotFoundError('evidence_request', req.params.id);
  res.json(ok(result, req));
}

export async function createRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createEvidenceRequest(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'evidence_request', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function updateRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateEvidenceRequest(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'evidence_request', entityId: req.params.id });
  res.json(ok(result, req));
}

// ── REVIEWS ──────────────────────────────────────────

export async function listReviews(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getEvidenceReviews(req.tenantId!, req.query as Record<string, string>);
  res.json(ok(result, req));
}

export async function createReview(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createEvidenceReview(req.tenantId!, req.params.evidenceId, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'evidence_review', entityId: req.params.evidenceId });
  res.status(201).json(ok(result, req));
}

export async function createQualityAssessmentHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createQualityAssessment(req.tenantId!, req.params.evidenceId, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'quality_assessment', entityId: req.params.evidenceId });
  res.status(201).json(ok(result, req));
}

export async function reviewQueue(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getReviewQueue(req.tenantId!, req.query as Record<string, string>);
  res.json(ok(result, req));
}

export async function requestMoreInfoHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const reviewerId = req.user!.userId!;
  const result = await requestMoreInfo(req.tenantId!, req.params.evidenceId, reviewerId, req.body.note);
  res.json(ok(result, req));
}

export async function qualityAssessments(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getQualityAssessments(req.tenantId!, req.params.evidenceId);
  res.json(ok(result, req));
}

export async function reviewStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getReviewStats(req.tenantId!);
  res.json(ok(result, req));
}

// ── SCHEDULES ────────────────────────────────────────

export async function listSchedules(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getEvidenceSchedules(req.tenantId!);
  res.json(ok(result, req));
}

export async function createSchedule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createEvidenceSchedule(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'evidence_schedule', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function updateSchedule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateEvidenceSchedule(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'evidence_schedule', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function deleteSchedule(req: AuthenticatedRequest, res: Response): Promise<void> {
  await deleteEvidenceSchedule(req.tenantId!, req.params.id);
  setAuditData(res as any, { action: 'delete', entityType: 'evidence_schedule', entityId: req.params.id });
  res.json(action('Schedule deleted', req));
}

// ── DASHBOARD ────────────────────────────────────────

export async function commandCenter(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await computeCommandCenterWidgets(req.tenantId!);
  res.json(ok(result, req));
}

export async function workQueue(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.userId ?? '';
  const result = await computeWorkQueueItems(req.tenantId!, userId);
  res.json(ok(result, req));
}

export async function sourceHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getSourceHealth(req.tenantId!);
  res.json(ok(result, req));
}

export async function recentActivity(req: AuthenticatedRequest, res: Response): Promise<void> {
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const result = await getRecentActivity(req.tenantId!, limit);
  res.json(ok(result, req));
}

export async function byStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getEvidenceByStatus(req.tenantId!);
  res.json(ok(result, req));
}

export async function bySource(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getEvidenceBySource(req.tenantId!);
  res.json(ok(result, req));
}

// ── VAULT ────────────────────────────────────────────

export async function upload(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await uploadEvidence(req.tenantId!, req.body.evidenceId, req.body.fileBuffer, req.body.metadata);
  setAuditData(res as any, { action: 'create', entityType: 'evidence_vault', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function getVaultEvidence(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getEvidence(req.tenantId!, req.params.id);
  if (!result) throw new NotFoundError('vault_evidence', req.params.id);
  res.json(ok(result, req));
}

export async function versions(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await listEvidenceVersions(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function legalHold(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await placeLegalHold(req.tenantId!, req.params.id, req.body.reason, userId);
  setAuditData(res as any, { action: 'update', entityType: 'legal_hold', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function removeLegalHoldHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await removeLegalHold(req.tenantId!, req.params.id, userId, req.body.reason);
  setAuditData(res as any, { action: 'update', entityType: 'legal_hold', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function verifyIntegrity(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await verifyEvidenceIntegrity(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function vaultStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getVaultStats(req.tenantId!);
  res.json(ok(result, req));
}

// ── PACKAGES ─────────────────────────────────────────

export async function listPackagesHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await listPackages(req.tenantId!, req.query as Record<string, string>);
  res.json(ok(result, req));
}

export async function getPackage(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getPackageDetail(req.tenantId!, req.params.id);
  if (!result) throw new NotFoundError('evidence_package', req.params.id);
  res.json(ok(result, req));
}

export async function createPackageHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createPackage(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'evidence_package', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function updatePackageHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updatePackage(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'evidence_package', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function deletePackageHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  await deletePackage(req.tenantId!, req.params.id);
  setAuditData(res as any, { action: 'delete', entityType: 'evidence_package', entityId: req.params.id });
  res.json(action('Package deleted', req));
}

export async function addItem(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await addItemToPackage(req.tenantId!, req.params.id, req.body.evidenceId, userId, req.body.notes);
  setAuditData(res as any, { action: 'create', entityType: 'package_item', entityId: req.params.id });
  res.status(201).json(ok(result, req));
}

export async function removeItem(req: AuthenticatedRequest, res: Response): Promise<void> {
  await removeItemFromPackage(req.tenantId!, req.params.id, req.params.itemId);
  res.json(action('Item removed from package', req));
}

export async function finalizePackageHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await finalizePackage(req.tenantId!, req.params.id, userId);
  setAuditData(res as any, { action: 'update', entityType: 'evidence_package', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function exportPackageHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const format = (req.query.format as string) || 'json';
  const result = await exportPackage(req.tenantId!, req.params.id, format, userId);
  res.json(ok(result, req));
}

export async function packageExports(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getPackageExports(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

// ── REPORTING ────────────────────────────────────────

export async function agingReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await generateAgingReport(req.tenantId!, req.query as Record<string, string>);
  res.json(ok(result, req));
}

export async function backlogReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await generateBacklogReport(req.tenantId!);
  res.json(ok(result, req));
}

export async function sourceCoverageReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await generateSourceCoverageReport(req.tenantId!);
  res.json(ok(result, req));
}

export async function freshnessReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await generateFreshnessReport(req.tenantId!);
  res.json(ok(result, req));
}

export async function qualityReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await generateQualityReport(req.tenantId!);
  res.json(ok(result, req));
}

export async function reuseReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await generateReuseReport(req.tenantId!);
  res.json(ok(result, req));
}

export async function overdueRequestsReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await generateOverdueRequestsReport(req.tenantId!);
  res.json(ok(result, req));
}

export async function reviewBacklogReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await generateReviewBacklogReport(req.tenantId!);
  res.json(ok(result, req));
}

export async function staleEvidenceReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await generateStaleEvidenceReport(req.tenantId!);
  res.json(ok(result, req));
}

export async function auditReadinessReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await generateAuditReadinessReport(req.tenantId!);
  res.json(ok(result, req));
}

// ── SUBMISSION & HASH CHAIN ──────────────────────────

export async function submitEvidenceHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await submitEvidence(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'evidence_submission', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function verifyHashChainHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await verifyHashChain(req.tenantId!, req.params.evidenceId);
  res.json(ok(result, req));
}

// ── FRESHNESS ────────────────────────────────────────

export async function freshnessOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getFreshnessOverview(req.tenantId!);
  res.json(ok(result, req));
}

export async function expiringByDays(req: AuthenticatedRequest, res: Response): Promise<void> {
  const days = parseInt(req.params.days || req.query.days as string, 10) || 30;
  const result = await getExpiringEvidenceByDays(req.tenantId!, days);
  res.json(ok(result, req));
}

export async function staleEvidence(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getStaleEvidence(req.tenantId!);
  res.json(ok(result, req));
}

export async function batchFreshness(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await batchFreshnessCheck(req.tenantId!);
  res.json(ok(result, req));
}

export async function freshnessHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getFreshnessHistory(req.tenantId!, req.params.evidenceId);
  res.json(ok(result, req));
}

export async function bulkMarkStale(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await bulkMarkAsStale(req.tenantId!, req.body.evidenceIds, userId);
  res.json(ok(result, req));
}

export async function bulkExtend(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await bulkExtendExpiration(req.tenantId!, req.body.evidenceIds, req.body.daysToAdd, userId);
  res.json(ok(result, req));
}

export async function bulkRefresh(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await bulkRefreshEvidence(req.tenantId!, req.body.evidenceIds, userId);
  res.json(ok(result, req));
}

// ── QUALITY SCORING ──────────────────────────────────

export async function scoreQuality(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await scoreEvidenceQuality(req.tenantId!, req.params.evidenceId);
  res.json(ok(result, req));
}

export async function batchScoreQuality(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await batchScoreEvidenceQuality(req.tenantId!, req.body);
  res.json(ok(result, req));
}

export async function controlQualityScore(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await scoreControlEvidence(req.tenantId!, req.params.controlId);
  res.json(ok(result, req));
}

export async function controlQualityAverage(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getControlEvidenceQualityAverage(req.tenantId!, req.params.controlId);
  res.json(ok(result, req));
}

// ── REUSE ────────────────────────────────────────────

export async function reuseMap(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getEvidenceReuseMap(req.tenantId!);
  res.json(ok(result, req));
}

export async function suggestReuseHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await suggestReuse(req.tenantId!, req.params.controlId);
  res.json(ok(result, req));
}

export async function orphans(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await detectOrphans(req.tenantId!);
  res.json(ok(result, req));
}

export async function markReusable(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await markAsReusable(req.tenantId!, req.params.id, userId);
  setAuditData(res as any, { action: 'update', entityType: 'evidence_reuse', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function unmarkReusableHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await unmarkReusable(req.tenantId!, req.params.id);
  setAuditData(res as any, { action: 'update', entityType: 'evidence_reuse', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function linkObject(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await linkToObject(req.tenantId!, req.params.id, req.body.objectType, req.body.objectId, req.body.linkType, userId);
  setAuditData(res as any, { action: 'create', entityType: 'evidence_link', entityId: req.params.id });
  res.status(201).json(ok(result, req));
}

export async function unlinkObject(req: AuthenticatedRequest, res: Response): Promise<void> {
  await unlinkFromObject(req.tenantId!, req.params.id, req.params.linkId);
  res.json(action('Link removed', req));
}

export async function evidenceLinks(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getEvidenceLinks(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function duplicateCandidates(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getDuplicateCandidates(req.tenantId!);
  res.json(ok(result, req));
}

export async function resolveDuplicateHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await resolveDuplicate(req.tenantId!, req.body.candidateId, req.body.resolution, userId);
  res.json(ok(result, req));
}

export async function reusableEvidence(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getReusableEvidence(req.tenantId!);
  res.json(ok(result, req));
}

// ── AI SUGGESTIONS ───────────────────────────────────

export async function suggestMetadata(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await suggestEvidenceMetadata(req.tenantId!, req.body.title, req.body.content);
  res.json(ok(result, req));
}

export async function suggestLinkagesHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await suggestLinkages(req.tenantId!, req.params.evidenceId);
  res.json(ok(result, req));
}

export async function detectDuplicatesHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await detectDuplicates(req.tenantId!, req.body.evidenceId);
  res.json(ok(result, req));
}

export async function aiSuggestionStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getAiSuggestionStatus(req.tenantId!);
  res.json(ok(result, req));
}

// ── FILES ────────────────────────────────────────────

export async function uploadFile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await uploadEvidenceFile(req.tenantId!, req.params.evidenceId, req.body.buffer, req.body.filename, userId, req.body.contentType);
  setAuditData(res as any, { action: 'create', entityType: 'evidence_file', entityId: req.params.evidenceId });
  res.status(201).json(ok(result, req));
}

export async function downloadFile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await downloadEvidenceFile(req.tenantId!, req.params.evidenceId);
  res.json(ok(result, req));
}

export async function listFiles(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await listEvidenceFiles(req.tenantId!, req.params.evidenceId);
  res.json(ok(result, req));
}

// ── QUERY & OVERVIEW ─────────────────────────────────

export async function allEvidence(req: AuthenticatedRequest, res: Response): Promise<void> {
  const scopeUser = req.user ? { userId: req.user.userId } : undefined;
  const result = await getAllEvidence(req.tenantId!, scopeUser, req.query as Record<string, string>);
  res.json(ok(result, req));
}

export async function overviewStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getOverviewStats(req.tenantId!, req.query as Record<string, string>);
  res.json(ok(result, req));
}

export async function mappings(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getEvidenceMappings(req.tenantId!, req.query as Record<string, string>);
  res.json(ok(result, req));
}

export async function expiredEvidence(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getExpiredEvidence(req.tenantId!);
  res.json(ok(result, req));
}

// ── SCORING ──────────────────────────────────────────

export async function scoreEvidenceHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await scoreEvidence(req.tenantId!, req.params.evidenceId);
  res.json(ok(result, req));
}

export async function coverageDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getEvidenceCoverageDashboard(req.tenantId!);
  res.json(ok(result, req));
}

export async function freshness(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getEvidenceFreshness(req.tenantId!);
  res.json(ok(result, req));
}

export async function completeness(req: AuthenticatedRequest, res: Response): Promise<void> {
  const controlId = (req.query.controlId as string) || '';
  const result = await checkCompleteness(req.tenantId!, controlId);
  res.json(ok(result, req));
}

export async function complianceGapReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  const frameworkCode = req.query.frameworkCode as string | undefined;
  const result = await getComplianceGapReport(req.tenantId!, frameworkCode);
  res.json(ok(result, req));
}

export async function evidenceForControl(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getEvidenceForControl(req.tenantId!, req.params.controlId);
  res.json(ok(result, req));
}

// ── AUTO-COLLECTION ──────────────────────────────────

export async function runAutoCollectionHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await runAutoCollection(req.tenantId!);
  res.json(ok(result, req));
}

export async function listRules(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await listCollectionRules(req.tenantId!);
  res.json(ok(result, req));
}

export async function createRule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await createCollectionRule(req.tenantId!, req.body, userId);
  setAuditData(res as any, { action: 'create', entityType: 'collection_rule', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function updateRule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateCollectionRule(req.tenantId!, req.params.ruleId, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'collection_rule', entityId: req.params.ruleId });
  res.json(ok(result, req));
}

export async function deleteRule(req: AuthenticatedRequest, res: Response): Promise<void> {
  await deleteCollectionRule(req.tenantId!, req.params.ruleId);
  setAuditData(res as any, { action: 'delete', entityType: 'collection_rule', entityId: req.params.ruleId });
  res.json(action('Collection rule deleted', req));
}

export async function collectionJobs(req: AuthenticatedRequest, res: Response): Promise<void> {
  const ruleId = req.query.ruleId as string | undefined;
  const result = await listCollectionJobs(req.tenantId!, ruleId);
  res.json(ok(result, req));
}

// ── HEALTH ───────────────────────────────────────────

export async function healthSnapshot(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getEvidenceHealthSnapshot(req.tenantId!);
  res.json(ok(result, req));
}

export async function completenessPerControl(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getEvidenceCompletenessPerControl(req.tenantId!);
  res.json(ok(result, req));
}
