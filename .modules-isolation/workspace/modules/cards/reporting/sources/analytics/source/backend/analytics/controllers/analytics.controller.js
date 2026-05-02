"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kpis = kpis;
exports.kpiTrends = kpiTrends;
exports.runAggregation = runAggregation;
exports.tenantHealth = tenantHealth;
exports.benchmarks = benchmarks;
exports.advancedRisk = advancedRisk;
exports.recalculateCompliance = recalculateCompliance;
exports.evidenceAnalytics = evidenceAnalytics;
exports.workflowAnalytics = workflowAnalytics;
exports.getDashboard = getDashboard;
exports.saveDashboard = saveDashboard;
exports.contextualDashboard = contextualDashboard;
exports.analyticsDashboard = analyticsDashboard;
exports.boardPack = boardPack;
exports.complianceNarrative = complianceNarrative;
exports.riskNarrative = riskNarrative;
exports.vendorScores = vendorScores;
exports.questionnaireStats = questionnaireStats;
exports.regulatorRequests = regulatorRequests;
exports.consultantPortfolio = consultantPortfolio;
exports.slaBreaches = slaBreaches;
exports.engagementScore = engagementScore;
exports.engagementScoreHistory = engagementScoreHistory;
exports.runEngagementCycle = runEngagementCycle;
exports.usageForecast = usageForecast;
exports.forecastSummary = forecastSummary;
exports.historicalTrends = historicalTrends;
exports.trendSummary = trendSummary;
exports.metricAnomalies = metricAnomalies;
exports.complianceForecast = complianceForecast;
exports.remediationEstimate = remediationEstimate;
exports.riskEscalationPrediction = riskEscalationPrediction;
exports.bcpReadiness = bcpReadiness;
exports.recoveryGap = recoveryGap;
exports.incidentImpact = incidentImpact;
exports.regressions = regressions;
exports.regressionAlerts = regressionAlerts;
exports.acknowledgeRegressionHandler = acknowledgeRegressionHandler;
exports.ingestTelemetrySignal = ingestTelemetrySignal;
exports.ingestTelemetrySignals = ingestTelemetrySignals;
exports.threatProbability = threatProbability;
exports.telemetrySignals = telemetrySignals;
const module_sdk_1 = require("@dos/module-sdk");
const middleware_port_1 = require("../ports/middleware.port");
const analytics_kpi_service_1 = require("../services/analytics/analytics-kpi.service");
const analytics_trends_service_1 = require("../services/analytics/analytics-trends.service");
const analytics_health_service_1 = require("../services/analytics/analytics-health.service");
const analytics_benchmarking_service_1 = require("../services/analytics/analytics-benchmarking.service");
const analytics_risk_service_1 = require("../services/analytics/analytics-risk.service");
const analytics_compliance_service_1 = require("../services/analytics/analytics-compliance.service");
const analytics_evidence_workflow_service_1 = require("../services/analytics/analytics-evidence-workflow.service");
const analytics_dashboard_service_1 = require("../services/analytics/analytics-dashboard.service");
const context_aware_dashboard_service_1 = require("../services/misc/context-aware-dashboard.service");
const executive_narrative_service_1 = require("../services/misc/executive-narrative.service");
const engagement_analytics_service_1 = require("../services/engagement/engagement-analytics.service");
const engagement_score_service_1 = require("../services/engagement/engagement-score.service");
const engagement_os_orchestrator_service_1 = require("../services/engagement/engagement-os-orchestrator.service");
const usage_forecaster_service_1 = require("../services/misc/usage-forecaster.service");
const historical_trend_analyzer_service_1 = require("../services/misc/historical-trend-analyzer.service");
const metric_anomaly_detector_service_1 = require("../services/misc/metric-anomaly-detector.service");
const predictive_analytics_service_1 = require("../services/misc/predictive-analytics.service");
const performance_regression_detector_service_1 = require("../services/misc/performance-regression-detector.service");
const telemetry_aggregator_service_1 = require("../services/misc/telemetry-aggregator.service");
async function kpis(req, res) {
    const result = await (0, analytics_kpi_service_1.computeKPIs)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function kpiTrends(req, res) {
    const periodStr = req.query.period || '6m';
    const months = parseInt(periodStr.replace(/[^0-9]/g, ''), 10) || 6;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    const result = await (0, analytics_trends_service_1.getKPITrends)(req.tenantId, startDate, endDate);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function runAggregation(req, res) {
    await (0, analytics_trends_service_1.runAggregationJob)(req.tenantId);
    res.json((0, module_sdk_1.action)('Aggregation job completed', req));
}
async function tenantHealth(req, res) {
    const result = await (0, analytics_health_service_1.computeTenantHealthScore)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function benchmarks(req, res) {
    const result = await (0, analytics_benchmarking_service_1.getBenchmarkData)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function advancedRisk(req, res) {
    const ctx = { tenantId: req.tenantId, roleCode: req.user?.role ?? 'viewer' };
    const result = await (0, analytics_risk_service_1.getAdvancedRiskAnalytics)(ctx);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function recalculateCompliance(req, res) {
    await (0, analytics_compliance_service_1.recalculateCompliancePostureIncremental)(req.tenantId);
    res.json((0, module_sdk_1.action)('Compliance posture recalculated', req));
}
async function evidenceAnalytics(req, res) {
    const ctx = { tenantId: req.tenantId, roleCode: req.user?.role ?? 'viewer' };
    const result = await (0, analytics_evidence_workflow_service_1.getAdvancedEvidenceAnalytics)(ctx);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function workflowAnalytics(req, res) {
    const ctx = { tenantId: req.tenantId, roleCode: req.user?.role ?? 'viewer' };
    const result = await (0, analytics_evidence_workflow_service_1.getAdvancedWorkflowAnalytics)(ctx);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function getDashboard(req, res) {
    const userId = req.user?.userId ?? '';
    const result = await (0, analytics_dashboard_service_1.getDashboardConfig)(req.tenantId, userId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function saveDashboard(req, res) {
    const userId = req.user?.userId ?? '';
    const result = await (0, analytics_dashboard_service_1.saveDashboardConfig)(req.tenantId, userId, req.body);
    (0, middleware_port_1.setAuditData)(res, { action: 'update', entityType: 'dashboard_config', afterState: result });
    res.json((0, module_sdk_1.ok)(result, req));
}
async function contextualDashboard(req, res) {
    const ctx = { tenantId: req.tenantId,
        roleCode: req.user?.role ?? 'viewer',
        orgStatus: 'active',
    };
    const result = await (0, context_aware_dashboard_service_1.buildContextualDashboard)(ctx);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function analyticsDashboard(req, res) {
    const result = await (0, predictive_analytics_service_1.getAnalyticsDashboard)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function boardPack(req, res) {
    const result = await (0, executive_narrative_service_1.generateBoardPack)(req.tenantId, req.body);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function complianceNarrative(req, res) {
    const frameworkId = req.query.frameworkId || req.params.frameworkId || 'default';
    const result = await (0, executive_narrative_service_1.generateComplianceNarrative)(req.tenantId, frameworkId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function riskNarrative(req, res) {
    const result = await (0, executive_narrative_service_1.generateRiskNarrative)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function vendorScores(req, res) {
    const result = await (0, engagement_analytics_service_1.getVendorScores)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function questionnaireStats(req, res) {
    const result = await (0, engagement_analytics_service_1.getQuestionnaireStats)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function regulatorRequests(req, res) {
    const result = await (0, engagement_analytics_service_1.getRegulatorRequests)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function consultantPortfolio(req, res) {
    const consultantId = req.params.consultantId || req.user?.userId || '';
    const result = await (0, engagement_analytics_service_1.getConsultantPortfolio)(consultantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function slaBreaches(req, res) {
    const result = await (0, engagement_analytics_service_1.getSLABreaches)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function engagementScore(req, res) {
    const vendorId = req.query.vendorId || req.params.vendorId || '';
    const result = await (0, engagement_score_service_1.computeEngagementScore)(req.tenantId, vendorId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function engagementScoreHistory(req, res) {
    const vendorId = req.query.vendorId || req.params.vendorId || '';
    const limit = parseInt(req.query.limit, 10) || 50;
    const result = await (0, engagement_score_service_1.getScoreHistory)(req.tenantId, vendorId, limit);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function runEngagementCycle(req, res) {
    const result = await (0, engagement_os_orchestrator_service_1.runEngagementOSCycle)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function usageForecast(req, res) {
    const period = req.query.period || 'monthly';
    const daysAhead = parseInt(req.query.daysAhead, 10) || 30;
    const result = await (0, usage_forecaster_service_1.forecastUsage)(req.tenantId, period, daysAhead);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function forecastSummary(req, res) {
    const result = await (0, usage_forecaster_service_1.getForecastSummary)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function historicalTrends(req, res) {
    const metric = req.query.metric || 'latency';
    const agentId = req.query.agentId;
    const result = await (0, historical_trend_analyzer_service_1.analyzeTrends)(req.tenantId, metric, agentId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function trendSummary(req, res) {
    const result = await (0, historical_trend_analyzer_service_1.getTrendSummary)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function metricAnomalies(req, res) {
    const result = await (0, metric_anomaly_detector_service_1.detectMetricAnomalies)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function complianceForecast(req, res) {
    const daysAhead = parseInt(req.query.daysAhead, 10) || 90;
    const result = await (0, predictive_analytics_service_1.forecastComplianceScore)(req.tenantId, daysAhead);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function remediationEstimate(req, res) {
    const severity = req.query.severity || 'high';
    const result = await (0, predictive_analytics_service_1.estimateRemediationTime)(req.tenantId, severity);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function riskEscalationPrediction(req, res) {
    const result = await (0, predictive_analytics_service_1.predictRiskEscalation)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function bcpReadiness(req, res) {
    const daysAhead = parseInt(req.query.daysAhead, 10) || 90;
    const result = await (0, predictive_analytics_service_1.forecastBCPReadiness)(req.tenantId, daysAhead);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function recoveryGap(req, res) {
    const result = await (0, predictive_analytics_service_1.predictRecoveryGap)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function incidentImpact(req, res) {
    const result = await (0, predictive_analytics_service_1.estimateNextIncidentImpact)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function regressions(req, res) {
    const config = {
        metric: req.query.metric || 'latency',
        baselineWindowDays: parseInt(req.query.baselineWindowDays, 10) || 30,
        detectionWindowDays: parseInt(req.query.detectionWindowDays, 10) || 7,
        thresholdPct: parseInt(req.query.thresholdPct, 10) || 20,
        minSampleSize: parseInt(req.query.minSampleSize, 10) || 10,
        agentId: req.query.agentId,
    };
    const result = await (0, performance_regression_detector_service_1.detectRegressions)(req.tenantId, config);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function regressionAlerts(req, res) {
    const agentId = req.query.agentId;
    const acknowledged = req.query.acknowledged === 'true' ? true : req.query.acknowledged === 'false' ? false : undefined;
    const result = await (0, performance_regression_detector_service_1.getRegressionAlerts)(req.tenantId, agentId, acknowledged);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function acknowledgeRegressionHandler(req, res) {
    await (0, performance_regression_detector_service_1.acknowledgeRegression)(req.tenantId, req.params.id);
    (0, middleware_port_1.setAuditData)(res, { action: 'update', entityType: 'regression', entityId: req.params.id });
    res.json((0, module_sdk_1.action)('Regression acknowledged', req));
}
async function ingestTelemetrySignal(req, res) {
    const result = await (0, telemetry_aggregator_service_1.ingestSignal)(req.tenantId, req.body);
    res.status(201).json((0, module_sdk_1.ok)(result, req));
}
async function ingestTelemetrySignals(req, res) {
    const result = await (0, telemetry_aggregator_service_1.ingestSignals)(req.tenantId, req.body.signals);
    res.status(201).json((0, module_sdk_1.ok)(result, req));
}
async function threatProbability(req, res) {
    const subjectKey = req.query.subjectKey || '';
    const windowHours = parseInt(req.query.windowHours, 10) || 24;
    const result = await (0, telemetry_aggregator_service_1.getThreatProbability)(req.tenantId, subjectKey, windowHours);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function telemetrySignals(req, res) {
    const opts = {
        subjectKey: req.query.subjectKey,
        signalType: req.query.signalType,
        limit: parseInt(req.query.limit, 10) || undefined,
    };
    const result = await (0, telemetry_aggregator_service_1.getSignals)(req.tenantId, opts);
    res.json((0, module_sdk_1.ok)(result, req));
}
//# sourceMappingURL=analytics.controller.js.map