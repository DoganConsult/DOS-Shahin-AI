// ============================================
// Audit Module — Entities Service Bridge
// Delegates to AuditEntitiesRepository and
// emits domain events for write operations.
// ============================================

import { AuditEntitiesRepository } from '../repositories/audit-entities.repo';
import { emitEvent } from '../ports/events.port';
import { safeQuery } from "@dos/db";

const MOD = 'audit';
type D = Record<string, unknown>;
type PO = { page?: number; pageSize?: number };

function repo(t: string) { return new AuditEntitiesRepository(t); }
async function ev(t: string, u: string, et: string, r: D | null, event = 'created') {
  if (r) await emitEvent(({ tenantId: t, userId: u, module: MOD, event, entityType: et, entityId: (r.id ?? r.finding_id) as string, data: r } as any));
}

// ── audit_findings ───────────��───────────────────────

export async function listFindings(tenantId: string, opts: PO = {}): Promise<unknown> { return repo(tenantId).findAllFindings(opts); }
export async function getFindingById(tenantId: string, id: string): Promise<unknown> { return repo(tenantId).findFindingById(id); }
export async function createFinding(tenantId: string, userId: string, data: D): Promise<unknown> { const r = await repo(tenantId).createFinding(data); await ev(tenantId, userId, 'finding', r); return r; }

// ── audit_plans ──────────────────────────────────────

export async function listPlans(tenantId: string, opts: PO = {}): Promise<unknown> { return repo(tenantId).findAllPlans(opts); }
export async function getPlanById(tenantId: string, id: string): Promise<unknown> { return repo(tenantId).findPlanById(id); }
export async function createPlan(tenantId: string, userId: string, data: D): Promise<unknown> { const r = await repo(tenantId).createPlan(data); await ev(tenantId, userId, 'plan', r); return r; }

// ── audit_schedules ────��─────────────────────────────

export async function listSchedules(tenantId: string, opts: PO = {}): Promise<unknown> { return repo(tenantId).findAllSchedules(opts); }
export async function getScheduleById(tenantId: string, id: string): Promise<unknown> { return repo(tenantId).findScheduleById(id); }
export async function createSchedule(tenantId: string, userId: string, data: D): Promise<unknown> { const r = await repo(tenantId).createSchedule(data); await ev(tenantId, userId, 'schedule', r); return r; }

// ── audit_scopes ─────────────────────────────────────

export async function listScopes(tenantId: string, opts: PO = {}): Promise<unknown> { return repo(tenantId).findAllScopes(opts); }
export async function getScopeById(tenantId: string, id: string): Promise<unknown> { return repo(tenantId).findScopeById(id); }
export async function createScope(tenantId: string, userId: string, data: D): Promise<unknown> { const r = await repo(tenantId).createScope(data); await ev(tenantId, userId, 'scope', r); return r; }

// ── audit_templates ──────────────────────────────────

export async function listTemplates(tenantId: string, opts: PO = {}): Promise<unknown> { return repo(tenantId).findAllTemplates(opts); }
export async function getTemplateById(tenantId: string, id: string): Promise<unknown> { return repo(tenantId).findTemplateById(id); }
export async function createTemplate(tenantId: string, userId: string, data: D): Promise<unknown> { const r = await repo(tenantId).createTemplate(data); await ev(tenantId, userId, 'template', r); return r; }

// ── audit_working_papers ─────────────────────────────

export async function listWorkingPapers(tenantId: string, opts: PO & { auditId?: string } = {}): Promise<unknown> { return repo(tenantId).findAllWorkingPapers(opts); }
export async function getWorkingPaperById(tenantId: string, id: string): Promise<unknown> { return repo(tenantId).findWorkingPaperById(id); }
export async function createWorkingPaper(tenantId: string, userId: string, data: D): Promise<unknown> { const r = await repo(tenantId).createWorkingPaper(data); await ev(tenantId, userId, 'working_paper', r); return r; }

// ── audit_engagements ────────────────────────────────

export async function listEngagements(tenantId: string, opts: PO = {}): Promise<unknown> { return repo(tenantId).findAllEngagements(opts); }
export async function getEngagementById(tenantId: string, id: string): Promise<unknown> { return repo(tenantId).findEngagementById(id); }
export async function createEngagement(tenantId: string, userId: string, data: D): Promise<unknown> { const r = await repo(tenantId).createEngagement(data); await ev(tenantId, userId, 'engagement', r); return r; }

// ── audit_packages ──────���────────────────────────────

export async function listPackages(tenantId: string, opts: PO = {}): Promise<unknown> { return repo(tenantId).findAllPackages(opts); }
export async function getPackageById(tenantId: string, id: string): Promise<unknown> { return repo(tenantId).findPackageById(id); }
export async function createPackage(tenantId: string, userId: string, data: D): Promise<unknown> { const r = await repo(tenantId).createPackage(data); await ev(tenantId, userId, 'package', r); return r; }

// ── audit_charters ───────────────────────────────────

export async function listCharters(tenantId: string, opts: PO = {}): Promise<unknown> { return repo(tenantId).findAllCharters(opts); }
export async function getCharterById(tenantId: string, id: string): Promise<unknown> { return repo(tenantId).findCharterById(id); }
export async function createCharter(tenantId: string, userId: string, data: D): Promise<unknown> { const r = await repo(tenantId).createCharter(data); await ev(tenantId, userId, 'charter', r); return r; }

// ── audit_universe ───────────────────────────────────

export async function listUniverse(tenantId: string, opts: PO = {}): Promise<unknown> { return repo(tenantId).findAllUniverse(opts); }
export async function getUniverseById(tenantId: string, id: string): Promise<unknown> { return repo(tenantId).findUniverseById(id); }
export async function createUniverseEntry(tenantId: string, userId: string, data: D): Promise<unknown> { const r = await repo(tenantId).createUniverseEntry(data); await ev(tenantId, userId, 'universe_entry', r); return r; }

// ── audit_team_members ───────────────────────────────

export async function listTeamMembers(tenantId: string, opts: PO & { auditId?: string } = {}): Promise<unknown> { return repo(tenantId).findAllTeamMembers(opts); }
export async function createTeamMember(tenantId: string, userId: string, data: D): Promise<unknown> { const r = await repo(tenantId).createTeamMember(data); await ev(tenantId, userId, 'team_member', r); return r; }

// ── audit_requests ────��──────────────────────────────

export async function listRequests(tenantId: string, opts: PO = {}): Promise<unknown> { return repo(tenantId).findAllRequests(opts); }
export async function getRequestById(tenantId: string, id: string): Promise<unknown> { return repo(tenantId).findRequestById(id); }
export async function createRequest(tenantId: string, userId: string, data: D): Promise<unknown> { const r = await repo(tenantId).createRequest(data); await ev(tenantId, userId, 'request', r); return r; }

// ── audit_request_items ──────────────────────────────

export async function listRequestItems(tenantId: string, opts: PO & { requestId?: string } = {}): Promise<unknown> { return repo(tenantId).findAllRequestItems(opts); }
export async function createRequestItem(tenantId: string, userId: string, data: D): Promise<unknown> { const r = await repo(tenantId).createRequestItem(data); await ev(tenantId, userId, 'request_item', r); return r; }

// ── audit_test_plans ─────────────────────────────────

export async function listTestPlans(tenantId: string, opts: PO = {}): Promise<unknown> { return repo(tenantId).findAllTestPlans(opts); }
export async function getTestPlanById(tenantId: string, id: string): Promise<unknown> { return repo(tenantId).findTestPlanById(id); }
export async function createTestPlan(tenantId: string, userId: string, data: D): Promise<unknown> { const r = await repo(tenantId).createTestPlan(data); await ev(tenantId, userId, 'test_plan', r); return r; }

// ── audit_ratings ────────────────────────────────────

export async function listRatings(tenantId: string, opts: PO = {}): Promise<unknown> { return repo(tenantId).findAllRatings(opts); }
export async function getRatingById(tenantId: string, id: string): Promise<unknown> { return repo(tenantId).findRatingById(id); }
export async function createRating(tenantId: string, userId: string, data: D): Promise<unknown> { const r = await repo(tenantId).createRating(data); await ev(tenantId, userId, 'rating', r); return r; }

// ── audit_risk_scores ────────────────────────────────

export async function listRiskScores(tenantId: string, opts: PO = {}): Promise<unknown> { return repo(tenantId).findAllRiskScores(opts); }
export async function getRiskScoreById(tenantId: string, id: string): Promise<unknown> { return repo(tenantId).findRiskScoreById(id); }
export async function createRiskScore(tenantId: string, userId: string, data: D): Promise<unknown> { const r = await repo(tenantId).createRiskScore(data); await ev(tenantId, userId, 'risk_score', r); return r; }

// ── audit_qa_reviews ─────────────────────────────────

export async function listQaReviews(tenantId: string, opts: PO = {}): Promise<unknown> { return repo(tenantId).findAllQaReviews(opts); }
export async function getQaReviewById(tenantId: string, id: string): Promise<unknown> { return repo(tenantId).findQaReviewById(id); }
export async function createQaReview(tenantId: string, userId: string, data: D): Promise<unknown> { const r = await repo(tenantId).createQaReview(data); await ev(tenantId, userId, 'qa_review', r); return r; }

// ── audit_anomalies ─────────��────────────────────────

export async function listAnomalies(tenantId: string, opts: PO = {}): Promise<unknown> { return repo(tenantId).findAllAnomalies(opts); }
export async function getAnomalyById(tenantId: string, id: string): Promise<unknown> { return repo(tenantId).findAnomalyById(id); }
export async function createAnomaly(tenantId: string, userId: string, data: D): Promise<unknown> { const r = await repo(tenantId).createAnomaly(data); await ev(tenantId, userId, 'anomaly', r); return r; }

// ── audit_finding_slas ────��──────────────────────────

export async function listFindingSlas(tenantId: string, opts: PO = {}): Promise<unknown> { return repo(tenantId).findAllFindingSlas(opts); }
export async function getFindingSlaById(tenantId: string, id: string): Promise<unknown> { return repo(tenantId).findFindingSlaById(id); }
export async function createFindingSla(tenantId: string, userId: string, data: D): Promise<unknown> { const r = await repo(tenantId).createFindingSla(data); await ev(tenantId, userId, 'finding_sla', r); return r; }

// ── external_audits ──���───────────────────────────────

export async function listExternalAudits(tenantId: string, opts: PO = {}): Promise<unknown> { return repo(tenantId).findAllExternalAudits(opts); }
export async function getExternalAuditById(tenantId: string, id: string): Promise<unknown> { return repo(tenantId).findExternalAuditById(id); }
export async function createExternalAudit(tenantId: string, userId: string, data: D): Promise<unknown> { const r = await repo(tenantId).createExternalAudit(data); await ev(tenantId, userId, 'external_audit', r); return r; }

// ── audit_finding_impacts ────────────────────────────

export async function listFindingImpacts(tenantId: string, opts: PO & { findingId?: string } = {}): Promise<unknown> { return repo(tenantId).findAllFindingImpacts(opts); }
export async function createFindingImpact(tenantId: string, userId: string, data: D): Promise<unknown> { const r = await repo(tenantId).createFindingImpact(data); await ev(tenantId, userId, 'finding_impact', r); return r; }

// ── audit_finding_root_causes ────────────────────────

export async function listFindingRootCauses(tenantId: string, opts: PO & { findingId?: string } = {}): Promise<unknown> { return repo(tenantId).findAllFindingRootCauses(opts); }
export async function createFindingRootCause(tenantId: string, userId: string, data: D): Promise<unknown> { const r = await repo(tenantId).createFindingRootCause(data); await ev(tenantId, userId, 'finding_root_cause', r); return r; }

// ── audit_prep_checklists ────────────────────────────

export async function listPrepChecklists(tenantId: string, opts: PO = {}): Promise<unknown> { return repo(tenantId).findAllPrepChecklists(opts); }
export async function getPrepChecklistById(tenantId: string, id: string): Promise<unknown> { return repo(tenantId).findPrepChecklistById(id); }
export async function createPrepChecklist(tenantId: string, userId: string, data: D): Promise<unknown> { const r = await repo(tenantId).createPrepChecklist(data); await ev(tenantId, userId, 'prep_checklist', r); return r; }

// ── Log / audit tables (insert + list) ───────────────

export async function listTimeEntries(tenantId: string, opts: PO & { auditId?: string } = {}): Promise<unknown> { return repo(tenantId).listTimeEntries(opts); }
export async function insertTimeEntry(tenantId: string, userId: string, data: D): Promise<unknown> { const r = await repo(tenantId).insertTimeEntry(data); await ev(tenantId, userId, 'time_entry', r, 'recorded'); return r; }

export async function listTrailEntries(tenantId: string, opts: PO & { entityId?: string } = {}): Promise<unknown> { return repo(tenantId).listTrailEntries(opts); }
export async function insertTrailEntry(tenantId: string, userId: string, data: D): Promise<unknown> { const r = await repo(tenantId).insertTrailEntry(data); await ev(tenantId, userId, 'trail_entry', r, 'recorded'); return r; }

export async function listTrailArchive(tenantId: string, opts: PO = {}): Promise<unknown> { return repo(tenantId).listTrailArchive(opts); }
export async function insertTrailArchive(tenantId: string, userId: string, data: D): Promise<unknown> { const r = await repo(tenantId).insertTrailArchive(data); await ev(tenantId, userId, 'trail_archive', r, 'recorded'); return r; }
