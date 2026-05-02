import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { NotFoundError as _NotFoundError } from '../../../errors/index';
import { setAuditData } from '../ports/middleware.port';

import { computeKPIs } from '../services/analytics/analytics-kpi.service';
import { runAggregationJob, getKPITrends } from '../services/analytics/analytics-trends.service';
import { computeTenantHealthScore } from '../services/analytics/analytics-health.service';
import { getBenchmarkData } from '../services/analytics/analytics-benchmarking.service';
import { getAdvancedRiskAnalytics } from '../services/analytics/analytics-risk.service';
import { recalculateCompliancePostureIncremental } from '../services/analytics/analytics-compliance.service';
import { getAdvancedEvidenceAnalytics, getAdvancedWorkflowAnalytics } from '../services/analytics/analytics-evidence-workflow.service';
import { saveDashboardConfig, getDashboardConfig } from '../services/analytics/analytics-dashboard.service';
import { buildContextualDashboard } from '../services/misc/context-aware-dashboard.service';
import {
  generateBoardPack, generateComplianceNarrative, generateRiskNarrative,
} from '../services/misc/executive-narrative.service';
import {
  getVendorScores, getQuestionnaireStats, getRegulatorRequests,
  getConsultantPortfolio, getSLABreaches,
} from '../services/engagement/engagement-analytics.service';
import { computeEngagementScore, getScoreHistory } from '../services/engagement/engagement-score.service';
import { runEngagementOSCycle } from '../services/engagement/engagement-os-orchestrator.service';
import {
  forecastUsage, getForecastSummary,
} from '../services/misc/usage-forecaster.service';
import {
  analyzeTrends, getTrendSummary,
} from '../services/misc/historical-trend-analyzer.service';
import { detectMetricAnomalies } from '../services/misc/metric-anomaly-detector.service';
import {
  forecastComplianceScore, estimateRemediationTime,
  predictRiskEscalation, forecastBCPReadiness,
  predictRecoveryGap, estimateNextIncidentImpact,
  getAnalyticsDashboard,
} from '../services/misc/predictive-analytics.service';
import {
  detectRegressions, getRegressionAlerts, acknowledgeRegression,
} from '../services/misc/performance-regression-detector.service';
import {

  ingestSignal, ingestSignals, getThreatProbability, getSignals,
} from '../services/misc/telemetry-aggregator.service';

export async function kpis(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await computeKPIs(req.tenantId!);
  res.json(ok(result, req));
}

export async function kpiTrends(req: AuthenticatedRequest, res: Response): Promise<void> {
  const periodStr = (req.query.period as string) || '6m';
  const months = parseInt(periodStr.replace(/[^0-9]/g, ''), 10) || 6;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  const result = await getKPITrends(req.tenantId!, startDate, endDate);
  res.json(ok(result, req));
}

export async function runAggregation(req: AuthenticatedRequest, res: Response): Promise<void> {
  await runAggregationJob(req.tenantId!);
  res.json(action('Aggregation job completed', req));
}

export async function tenantHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await computeTenantHealthScore(req.tenantId!);
  res.json(ok(result, req));
}

export async function benchmarks(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getBenchmarkData(req.tenantId!);
  res.json(ok(result, req));
}

export async function advancedRisk(req: AuthenticatedRequest, res: Response): Promise<void> {
  const ctx = { tenantId: req.tenantId!, roleCode: req.user?.role ?? 'viewer' };
  const result = await getAdvancedRiskAnalytics(ctx);
  res.json(ok(result, req));
}

export async function recalculateCompliance(req: AuthenticatedRequest, res: Response): Promise<void> {
  await recalculateCompliancePostureIncremental(req.tenantId);
  res.json(action('Compliance posture recalculated', req));
}

export async function evidenceAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const ctx = { tenantId: req.tenantId!, roleCode: req.user?.role ?? 'viewer' };
  const result = await getAdvancedEvidenceAnalytics(ctx);
  res.json(ok(result, req));
}

export async function workflowAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const ctx = { tenantId: req.tenantId!, roleCode: req.user?.role ?? 'viewer' };
  const result = await getAdvancedWorkflowAnalytics(ctx);
  res.json(ok(result, req));
}

export async function getDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.userId ?? '';
  const result = await getDashboardConfig(req.tenantId!, userId);
  res.json(ok(result, req));
}

export async function saveDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.userId ?? '';
  const result = await saveDashboardConfig(req.tenantId!, userId, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'dashboard_config', afterState: result });
  res.json(ok(result, req));
}

export async function contextualDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  const ctx = { tenantId: req.tenantId!,
    roleCode: req.user?.role ?? 'viewer',
    orgStatus: 'active' as const,
  };
  const result = await buildContextualDashboard(ctx);
  res.json(ok(result, req));
}

export async function analyticsDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getAnalyticsDashboard(req.tenantId!);
  res.json(ok(result, req));
}

export async function boardPack(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await generateBoardPack(req.tenantId!, req.body);
  res.json(ok(result, req));
}

export async function complianceNarrative(req: AuthenticatedRequest, res: Response): Promise<void> {
  const frameworkId = (req.query.frameworkId as string) || req.params.frameworkId || 'default';
  const result = await generateComplianceNarrative(req.tenantId!, frameworkId);
  res.json(ok(result, req));
}

export async function riskNarrative(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await generateRiskNarrative(req.tenantId!);
  res.json(ok(result, req));
}

export async function vendorScores(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getVendorScores(req.tenantId!);
  res.json(ok(result, req));
}

export async function questionnaireStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getQuestionnaireStats(req.tenantId!);
  res.json(ok(result, req));
}

export async function regulatorRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getRegulatorRequests(req.tenantId!);
  res.json(ok(result, req));
}

export async function consultantPortfolio(req: AuthenticatedRequest, res: Response): Promise<void> {
  const consultantId = req.params.consultantId || req.user?.userId || '';
  const result = await getConsultantPortfolio(consultantId);
  res.json(ok(result, req));
}

export async function slaBreaches(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getSLABreaches(req.tenantId!);
  res.json(ok(result, req));
}

export async function engagementScore(req: AuthenticatedRequest, res: Response): Promise<void> {
  const vendorId = (req.query.vendorId as string) || req.params.vendorId || '';
  const result = await computeEngagementScore(req.tenantId!, vendorId);
  res.json(ok(result, req));
}

export async function engagementScoreHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  const vendorId = (req.query.vendorId as string) || req.params.vendorId || '';
  const limit = parseInt(req.query.limit as string, 10) || 50;
  const result = await getScoreHistory(req.tenantId!, vendorId, limit);
  res.json(ok(result, req));
}

export async function runEngagementCycle(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await runEngagementOSCycle(req.tenantId!);
  res.json(ok(result, req));
}

export async function usageForecast(req: AuthenticatedRequest, res: Response): Promise<void> {
  const period = (req.query.period as 'daily' | 'weekly' | 'monthly') || 'monthly';
  const daysAhead = parseInt(req.query.daysAhead as string, 10) || 30;
  const result = await forecastUsage(req.tenantId, period, daysAhead);
  res.json(ok(result, req));
}

export async function forecastSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getForecastSummary(req.tenantId);
  res.json(ok(result, req));
}

export async function historicalTrends(req: AuthenticatedRequest, res: Response): Promise<void> {
  const metric = (req.query.metric as 'latency' | 'success_rate' | 'cost' | 'error_rate' | 'usage') || 'latency';
  const agentId = req.query.agentId as string | undefined;
  const result = await analyzeTrends(req.tenantId!, metric, agentId);
  res.json(ok(result, req));
}

export async function trendSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getTrendSummary(req.tenantId!);
  res.json(ok(result, req));
}

export async function metricAnomalies(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await detectMetricAnomalies(req.tenantId!);
  res.json(ok(result, req));
}

export async function complianceForecast(req: AuthenticatedRequest, res: Response): Promise<void> {
  const daysAhead = parseInt(req.query.daysAhead as string, 10) || 90;
  const result = await forecastComplianceScore(req.tenantId!, daysAhead);
  res.json(ok(result, req));
}

export async function remediationEstimate(req: AuthenticatedRequest, res: Response): Promise<void> {
  const severity = (req.query.severity as string) || 'high';
  const result = await estimateRemediationTime(req.tenantId!, severity);
  res.json(ok(result, req));
}

export async function riskEscalationPrediction(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await predictRiskEscalation(req.tenantId!);
  res.json(ok(result, req));
}

export async function bcpReadiness(req: AuthenticatedRequest, res: Response): Promise<void> {
  const daysAhead = parseInt(req.query.daysAhead as string, 10) || 90;
  const result = await forecastBCPReadiness(req.tenantId!, daysAhead);
  res.json(ok(result, req));
}

export async function recoveryGap(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await predictRecoveryGap(req.tenantId!);
  res.json(ok(result, req));
}

export async function incidentImpact(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await estimateNextIncidentImpact(req.tenantId!);
  res.json(ok(result, req));
}

export async function regressions(req: AuthenticatedRequest, res: Response): Promise<void> {
  const config = {
    metric: (req.query.metric as any) || 'latency',
    baselineWindowDays: parseInt(req.query.baselineWindowDays as string, 10) || 30,
    detectionWindowDays: parseInt(req.query.detectionWindowDays as string, 10) || 7,
    thresholdPct: parseInt(req.query.thresholdPct as string, 10) || 20,
    minSampleSize: parseInt(req.query.minSampleSize as string, 10) || 10,
    agentId: req.query.agentId as string | undefined,
  };
  const result = await detectRegressions(req.tenantId!, config);
  res.json(ok(result, req));
}

export async function regressionAlerts(req: AuthenticatedRequest, res: Response): Promise<void> {
  const agentId = req.query.agentId as string | undefined;
  const acknowledged = req.query.acknowledged === 'true' ? true : req.query.acknowledged === 'false' ? false : undefined;
  const result = await getRegressionAlerts(req.tenantId!, agentId, acknowledged);
  res.json(ok(result, req));
}

export async function acknowledgeRegressionHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  await acknowledgeRegression(req.tenantId!, req.params.id);
  setAuditData(res as any, { action: 'update', entityType: 'regression', entityId: req.params.id });
  res.json(action('Regression acknowledged', req));
}

export async function ingestTelemetrySignal(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await ingestSignal(req.tenantId, req.body);
  res.status(201).json(ok(result, req));
}

export async function ingestTelemetrySignals(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await ingestSignals(req.tenantId, req.body.signals);
  res.status(201).json(ok(result, req));
}

export async function threatProbability(req: AuthenticatedRequest, res: Response): Promise<void> {
  const subjectKey = (req.query.subjectKey as string) || '';
  const windowHours = parseInt(req.query.windowHours as string, 10) || 24;
  const result = await getThreatProbability(req.tenantId, subjectKey, windowHours);
  res.json(ok(result, req));
}

export async function telemetrySignals(req: AuthenticatedRequest, res: Response): Promise<void> {
  const opts = {
    subjectKey: req.query.subjectKey as string | undefined,
    signalType: req.query.signalType as string | undefined,
    limit: parseInt(req.query.limit as string, 10) || undefined,
  };
  const result = await getSignals(req.tenantId, (opts as any));
  res.json(ok(result, req));
}
