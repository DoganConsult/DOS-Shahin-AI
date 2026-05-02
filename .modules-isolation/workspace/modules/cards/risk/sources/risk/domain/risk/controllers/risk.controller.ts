// ============================================
// Risk Module — Controller Layer
// Thin HTTP orchestrator: extracts request data,
// calls services, formats responses, sets audit context.
// ============================================

import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, paginated as _paginated, action } from '../_wave1-compat';
import { NotFoundError } from '../../../errors/index';
import { setAuditData } from '../ports/middleware.port';

// --- Service imports (Law 4: organized by sub-concern) ---
import {
  createRisk, updateRisk, getRisks, getRiskById, deleteRisk,
  bulkDeleteRisks, getRiskMatrix, getKRITrends as _getKRITrends, addKRIDataPoint,
} from '../services/core/risk.service';
import { getRiskRegister, getRiskDetailById, exportRiskRegister } from '../services/core/risk-register.service';
import { computeRiskKPIs, getRiskTrends } from '../services/analytics/risk-metrics.service';
import {
  assessRiskEntry, linkControlToRisk, linkEvidenceToRisk,
  escalateRiskEntry, getRiskScoreHistory, getRiskDependencies, bulkUpdateRisks,
} from '../services/scoring/risk-assessment.service';
import {
  getTreatments, getTreatmentById, createTreatmentEntry,
  updateTreatmentEntry, validateTreatmentEntry, getTreatmentBoard,
  getTreatmentEffectiveness,
} from '../services/treatments/risk-treatments.service';
import {
  getKRIs, createKRIEntry, updateKRIEntry, getKRITrendsData,
  getKRIBreachLog, getReviewCadenceData, getKRIHistory, getKRICorrelation,
} from '../services/kri/risk-kri.service';
import { getHeatmapMatrix, getHeatmapWithDetails } from '../services/analytics/risk-heatmap.service';

// ── RISK CRUD ────────────────────────────────────────

export async function listRisks(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId;
  const user = req.user;
  const result = await getRisks(
    tenantId,
    user ? { userId: user.userId, role: user.role } : undefined,
    req.query as Record<string, string>,
  );
  res.json(ok(result, req));
}

export async function getById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId;
  const { id } = req.params;
  const risk = await getRiskById(tenantId, id);
  if (!risk) throw new NotFoundError('risk', id);
  res.json(ok(risk, req));
}

export async function create(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId;
  const _userId = req.user!.userId;
  const risk = await createRisk(tenantId, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'risk', entityId: risk?.risk_id, afterState: risk });
  res.status(201).json(ok(risk, req));
}

export async function update(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId;
  const { id } = req.params;
  const userId = req.user!.userId;
  const before = await getRiskById(tenantId, id);
  if (!before) throw new NotFoundError('risk', id);
  const updated = await updateRisk(tenantId, id, req.body, userId);
  setAuditData(res as any, { action: 'update', entityType: 'risk', entityId: id, beforeState: before, afterState: updated });
  res.json(ok(updated, req));
}

export async function remove(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId;
  const { id } = req.params;
  const userId = req.user!.userId;
  const deleted = await deleteRisk(tenantId, id, userId);
  if (!deleted) throw new NotFoundError('risk', id);
  setAuditData(res as any, { action: 'delete', entityType: 'risk', entityId: id });
  res.json(action('Risk deleted', req));
}

export async function bulkRemove(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId;
  const userId = req.user!.userId;
  const count = await bulkDeleteRisks(tenantId, req.body.ids, userId);
  res.json(ok({ deletedCount: count }, req));
}

// ── RISK REGISTER ────────────────────────────────────

export async function listRegister(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getRiskRegister(req.tenantId, req.query as Record<string, string>);
  res.json(ok(result, req));
}

export async function getRegisterDetail(req: AuthenticatedRequest, res: Response): Promise<void> {
  const detail = await getRiskDetailById(req.tenantId, req.params.id);
  if (!detail) throw new NotFoundError('risk', req.params.id);
  res.json(ok(detail, req));
}

export async function exportRegister(req: AuthenticatedRequest, res: Response): Promise<void> {
  const csv = await exportRiskRegister(req.tenantId);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="risk-register.csv"');
  res.send(csv);
}

// ── RISK ASSESSMENT ──────────────────────────────────

export async function assess(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await assessRiskEntry(req.tenantId, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'risk_assessment', entityId: req.params.id, afterState: result });
  res.json(ok(result, req));
}

export async function linkControl(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await linkControlToRisk(req.tenantId, req.params.id, req.body.controlId);
  res.status(201).json(ok(result, req));
}

export async function linkEvidence(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await linkEvidenceToRisk(req.tenantId, req.params.id, req.body.evidenceId);
  res.status(201).json(ok(result, req));
}

export async function escalate(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await escalateRiskEntry(req.tenantId, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'risk_escalation', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function scoreHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getRiskScoreHistory(req.tenantId, req.params.id);
  res.json(ok(result, req));
}

export async function dependencies(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getRiskDependencies(req.tenantId, req.params.id);
  res.json(ok(result, req));
}

export async function bulkUpdate(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await bulkUpdateRisks(req.tenantId, req.body);
  res.json(ok(result, req));
}

// ── RISK MATRIX / HEATMAP ────────────────────────────

export async function matrix(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getRiskMatrix(req.tenantId);
  res.json(ok(result, req));
}

export async function heatmap(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getHeatmapMatrix(req.tenantId);
  res.json(ok(result, req));
}

export async function heatmapDetailed(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getHeatmapWithDetails(req.tenantId);
  res.json(ok(result, req));
}

// ── KRI ──────────────────────────────────────────────

export async function listKRIs(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getKRIs(req.tenantId, req.query as Record<string, string>);
  res.json(ok(result, req));
}

export async function createKRI(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createKRIEntry(req.tenantId, req.body);

  setAuditData(res as any, { action: 'create', entityType: 'kri', entityId: result?.kri_id });
  res.status(201).json(ok(result, req));
}

export async function updateKRI(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateKRIEntry(req.tenantId, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'kri', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function kriTrends(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getKRITrendsData(req.tenantId, req.params.id);
  res.json(ok(result, req));
}

export async function kriBreachLog(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getKRIBreachLog(req.tenantId, req.query as Record<string, string>);
  res.json(ok(result, req));
}

export async function kriReviewCadence(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getReviewCadenceData(req.tenantId);
  res.json(ok(result, req));
}

export async function kriHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getKRIHistory(req.tenantId, req.params.id);
  res.json(ok(result, req));
}

export async function kriCorrelation(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getKRICorrelation(req.tenantId);
  res.json(ok(result, req));
}

export async function addKRIData(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await addKRIDataPoint(req.tenantId, req.params.id, req.body);
  res.status(201).json(ok(result, req));
}

// ── TREATMENTS ───────────────────────────────────────

export async function listTreatments(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getTreatments(req.tenantId, req.query as Record<string, string>);
  res.json(ok(result, req));
}

export async function getTreatment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getTreatmentById(req.tenantId, req.params.id);
  if (!result) throw new NotFoundError('treatment', req.params.id);
  res.json(ok(result, req));
}

export async function createTreatment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createTreatmentEntry(req.tenantId, req.body);

  setAuditData(res as any, { action: 'create', entityType: 'treatment', entityId: result?.treatment_id });
  res.status(201).json(ok(result, req));
}

export async function updateTreatment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateTreatmentEntry(req.tenantId, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'treatment', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function validateTreatment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await validateTreatmentEntry(req.tenantId, req.params.id, req.body);
  res.json(ok(result, req));
}

export async function treatmentBoard(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getTreatmentBoard(req.tenantId);
  res.json(ok(result, req));
}

export async function treatmentEffectiveness(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getTreatmentEffectiveness(req.tenantId);
  res.json(ok(result, req));
}

// ── METRICS / KPI ────────────────────────────────────

export async function kpis(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await computeRiskKPIs(req.tenantId);
  res.json(ok(result, req));
}

export async function trends(req: AuthenticatedRequest, res: Response): Promise<void> {
  const periodStr = (req.query as Record<string, string>).period || '6m';
  const months = parseInt(periodStr.replace(/[^0-9]/g, ''), 10) || 6;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  const result = await getRiskTrends(req.tenantId, startDate, endDate);
  res.json(ok(result, req));
}
