// ============================================
// Reporting Module — Controller Layer
// Thin HTTP orchestrator: extracts request data,
// calls services, formats responses, sets audit context.
// ============================================

import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { NotFoundError } from '../../../errors/index';
import { setAuditData } from '../ports/middleware.port';

// --- Service imports ---
import {
  generateComplianceReport, generateExecutiveSnapshot,
  scheduleReportBasic as _scheduleReportLegacy, getScheduledReports,
} from '../services/report/report.service';
import {
  generateReport as generateReportExt, scheduleReport as scheduleReportExt,
  getMaturityScorecard, exportEvidencePack, getBoardView,
} from '../services/report/report-ext.service';
import {
  getReportCatalog, getExecutiveSummary, getFrameworkCards,
  getReportDetail, exportReportPDF, exportReportExcel,
  emailReportToAddresses,
} from '../services/report/report-hub.service';
import {
  executeAdHocQuery, saveQueryDefinition, getSavedQueries,
  createReportSchedule, getReportSchedules, updateReportSchedule,
  deleteReportSchedule, drillDown, createReportPackage,
  getReportPackages, assembleReportPackage, getBenchmarkData,
  exportEntityData,
} from '../services/reporting/reporting-advanced.service';
import { generateBoardPack } from '../services/misc/board-pack-generator.service';
import { generatePptxBoardPack } from '../services/misc/pptx-board-pack.service';
import { generateBoardReport } from '../services/misc/board-report-template.service';
import { generateExecutiveReport } from '../services/misc/executive-report.service';
import { generateNaturalReport, getNaturalReportHistory } from '../services/misc/natural-report-generator.service';
import {
  predictRiskBreaches, forecastCompliance,
  recommendResources, detectEarlyWarnings,
} from '../services/misc/predictive-grc.service';
import {
  shareReport, getSharesForReport, getReportsSharedWithUser, revokeShare,
} from '../services/report/report-sharing.service';
import { exportExcel } from '../services/misc/excel-export.service';
import { exportPDF } from '../services/misc/pdf-export.service';
import { getGrcCoreDashboard } from '../services/chart/chart-grc-core.service';
import { getExecutiveDashboard } from '../services/chart/chart-executive.service';
import { getAnalyticalDashboard } from '../services/chart/chart-analytical.service';
import { getDrillDownNode, navigateToPath } from '../services/report/report-drilldown.service';
import { generateAuditReadiness } from '../services/report/report-generator.service';

// ── REPORT CATALOG & HUB ─────────────────────────────

export async function listReportCatalog(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.userId ?? '';
  const result = await getReportCatalog(req.tenantId!, userId, req.query as Record<string, string | undefined>);
  res.json(ok(result, req));
}

export async function executiveSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getExecutiveSummary(req.tenantId!);
  res.json(ok(result, req));
}

export async function frameworkCards(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getFrameworkCards(req.tenantId!);
  res.json(ok(result, req));
}

export async function reportDetail(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getReportDetail(req.tenantId!, req.params.id);
  if (!result) throw new NotFoundError('report', req.params.id);
  res.json(ok(result, req));
}

export async function reportPDF(req: AuthenticatedRequest, res: Response): Promise<void> {
  const buffer = await exportReportPDF(req.tenantId!, req.params.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="report-${req.params.id}.pdf"`);
  res.send(buffer);
}

export async function reportExcel(req: AuthenticatedRequest, res: Response): Promise<void> {
  const buffer = await exportReportExcel(req.tenantId!, req.params.id);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="report-${req.params.id}.xlsx"`);
  res.send(buffer);
}

export async function emailReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  const _userId = req.user!.userId!;
  await emailReportToAddresses(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'email', entityType: 'report', entityId: req.params.id });
  res.json(action('Report emailed', req));
}

// ── COMPLIANCE & EXECUTIVE REPORTS ────────────────────

export async function complianceReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  const frameworkId = (req.query.frameworkId as string) || '';
  const result = await generateComplianceReport(req.tenantId!, frameworkId);
  res.json(ok(result, req));
}

export async function executiveSnapshot(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await generateExecutiveSnapshot(req.tenantId!);
  res.json(ok(result, req));
}

export async function executiveReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  const periodDays = req.body.periodDays ?? 30;
  const result = await generateExecutiveReport(req.tenantId!, periodDays);
  res.json(ok(result, req));
}

export async function auditReadiness(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await generateAuditReadiness(req.tenantId!, req.query as Record<string, unknown>);
  res.json(ok(result, req));
}

// ── GENERATE REPORTS ──────────────────────────────────

export async function generateReportHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await generateReportExt(req.tenantId!, req.body.templateId, req.body.filters || {}, userId);
  setAuditData(res as any, { action: 'create', entityType: 'report', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function maturityScorecard(req: AuthenticatedRequest, res: Response): Promise<void> {
  const frameworkId = req.query.frameworkId as string | undefined;
  const result = await getMaturityScorecard(req.tenantId!, frameworkId);
  res.json(ok(result, req));
}

export async function evidencePack(req: AuthenticatedRequest, res: Response): Promise<void> {
  const frameworkId = (req.query.frameworkId as string) || '';
  const controlIds = req.query.controlIds ? (req.query.controlIds as string).split(',') : undefined;
  const result = await exportEvidencePack(req.tenantId!, frameworkId, controlIds);
  res.json(ok(result, req));
}

export async function boardView(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getBoardView(req.tenantId!);
  res.json(ok(result, req));
}

// ── BOARD PACK ────────────────────────────────────────

export async function boardPack(req: AuthenticatedRequest, res: Response): Promise<void> {
  const _userId = req.user!.userId!;
  const result = await generateBoardPack(req.tenantId!, req.body.periodType, req.body.periodStart);
  setAuditData(res as any, { action: 'create', entityType: 'board_pack', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function boardPackPptx(req: AuthenticatedRequest, res: Response): Promise<void> {
  const buffer = await generatePptxBoardPack(req.tenantId!, req.body.templateCode, req.body.period);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  res.setHeader('Content-Disposition', 'attachment; filename="board-pack.pptx"');
  res.send(buffer);
}

export async function boardReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await generateBoardReport(req.tenantId!, req.body.templateCode, req.body.period);
  res.json(ok(result, req));
}

// ── NATURAL LANGUAGE REPORTS ──────────────────────────

export async function naturalReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await generateNaturalReport({ ...req.body, tenantId: req.tenantId!, userId });
  setAuditData(res as any, { action: 'create', entityType: 'natural_report', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function naturalReportHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.userId ?? '';
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const result = await getNaturalReportHistory(req.tenantId!, userId, limit);
  res.json(ok(result, req));
}

// ── SCHEDULES ─────────────────────────────────────────

export async function listScheduledReports(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getScheduledReports(req.tenantId!);
  res.json(ok(result, req));
}

export async function scheduleReportHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await scheduleReportExt(req.tenantId!, req.body.templateId, req.body.schedule, userId);
  setAuditData(res as any, { action: 'create', entityType: 'report_schedule', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function listReportSchedules(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getReportSchedules(req.tenantId!);
  res.json(ok(result, req));
}

export async function createSchedule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const _userId = req.user!.userId!;
  const result = await createReportSchedule(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'report_schedule', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function updateSchedule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const _userId = req.user!.userId!;
  const result = await updateReportSchedule(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'report_schedule', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function deleteSchedule(req: AuthenticatedRequest, res: Response): Promise<void> {
  await deleteReportSchedule(req.tenantId!, req.params.id);
  setAuditData(res as any, { action: 'delete', entityType: 'report_schedule', entityId: req.params.id });
  res.json(action('Schedule deleted', req));
}

// ── AD-HOC QUERIES ────────────────────────────────────

export async function adHocQuery(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await executeAdHocQuery(req.tenantId!, req.body);
  res.json(ok(result, req));
}

export async function saveQuery(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await saveQueryDefinition(req.tenantId!, req.body.name, req.body.queryDef, userId);
  setAuditData(res as any, { action: 'create', entityType: 'saved_query', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function listSavedQueries(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getSavedQueries(req.tenantId!);
  res.json(ok(result, req));
}

// ── DRILL DOWN ────────────────────────────────────────

export async function drillDownHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await drillDown(req.tenantId!, req.body.entityType, req.body.groupField, req.body.groupValue);
  res.json(ok(result, req));
}

export async function drillDownNode(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getDrillDownNode({ tenantId: req.tenantId!, nodeId: req.params.nodeId, ...(req.query as Record<string, unknown>) });
  res.json(ok(result, req));
}

export async function drillDownNavigate(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await navigateToPath(req.tenantId!, req.body.path);
  res.json(ok(result, req));
}

// ── REPORT PACKAGES ───────────────────────────────────

export async function createPackage(req: AuthenticatedRequest, res: Response): Promise<void> {
  const _userId = req.user!.userId!;
  const result = await createReportPackage(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'report_package', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function listPackages(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getReportPackages(req.tenantId!);
  res.json(ok(result, req));
}

export async function assemblePackage(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await assembleReportPackage(req.tenantId!, req.params.id as string);
  res.json(ok(result, req));
}

// ── BENCHMARK ─────────────────────────────────────────

export async function benchmarkData(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getBenchmarkData(req.tenantId!, (req.query.dimension as string) || 'risk_maturity');
  res.json(ok(result, req));
}

// ── ENTITY EXPORT ─────────────────────────────────────

export async function entityExport(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await exportEntityData(req.tenantId!, req.params.entity, (req.query.format as 'csv' | 'json') || 'json');
  res.json(ok(result, req));
}

// ── PREDICTIVE GRC ────────────────────────────────────

export async function riskPredictions(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await predictRiskBreaches(req.tenantId!);
  res.json(ok(result, req));
}

export async function complianceForecast(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await forecastCompliance(req.tenantId!);
  res.json(ok(result, req));
}

export async function resourceRecommendations(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await recommendResources(req.tenantId!);
  res.json(ok(result, req));
}

export async function earlyWarnings(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await detectEarlyWarnings(req.tenantId!);
  res.json(ok(result, req));
}

// ── SHARING ───────────────────────────────────────────

export async function shareReportHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await shareReport(req.tenantId!, { ...req.body, reportId: req.params.id, sharedBy: userId });
  setAuditData(res as any, { action: 'create', entityType: 'report_share', entityId: req.params.id });
  res.status(201).json(ok(result, req));
}

export async function reportShares(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getSharesForReport(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function sharedWithMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.userId ?? '';
  const result = await getReportsSharedWithUser(req.tenantId!, userId);
  res.json(ok(result, req));
}

export async function revokeShareHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  await revokeShare(req.tenantId!, req.params.shareId);
  setAuditData(res as any, { action: 'delete', entityType: 'report_share', entityId: req.params.shareId });
  res.json(action('Share revoked', req));
}

// ── EXPORT UTILITIES ──────────────────────────────────

export async function exportExcelHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const buffer = await exportExcel(req.body);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="export.xlsx"');
  res.send(buffer);
}

export async function exportPDFHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const buffer = await exportPDF(req.body);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="export.pdf"');
  res.send(buffer);
}

// ── CHART DASHBOARDS ──────────────────────────────────

export async function grcCoreDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getGrcCoreDashboard(req.tenantId!);
  res.json(ok(result, req));
}

export async function executiveDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getExecutiveDashboard(req.tenantId!);
  res.json(ok(result, req));
}

export async function analyticalDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getAnalyticalDashboard(req.tenantId!);
  res.json(ok(result, req));
}
