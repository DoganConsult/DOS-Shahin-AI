"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const genericPayloadSchema = zod_1.z.record(zod_1.z.unknown());
const auth_port_1 = require("../ports/auth.port");
const analytics_service_1 = require("../services/analytics/analytics.service");
const platform_port_1 = require("../ports/platform.port");
const events_port_1 = require("../ports/events.port");
// ── Zod Validation Schemas ──
const middleware_port_1 = require("../ports/middleware.port");
const resilience_1 = require("@dos/platform-core/resilience");
const analytics_schemas_1 = require("../schemas/analytics.schemas");
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.moduleStack)('analytics'));
router.use((0, middleware_port_1.auditMiddleware)("analytics"));
router.use((0, middleware_port_1.automationMiddleware)("analytics"));
router.use((0, middleware_port_1.fieldRbacFilter)("analytics"));
/**
 * @swagger
 * /analytics/kpis:
 *   get:
 *     summary: Compute and return current GRC KPIs for the tenant
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: KPI dashboard data including compliance score, risk exposure, remediation rate
 */
router.get("/kpis", (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)("analytics.report.read"), async (req, res) => {
    const tenantId = req.user.tenantId;
    const kpis = await (0, analytics_service_1.computeKPIs)(tenantId);
    res.json(kpis);
});
// GET /api/analytics/trends — Get KPI trend data for a date range
/**
 * @swagger
 * /analytics/trends:
 *   get:
 *     summary: Get historical trend data for GRC metrics
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Time-series trend data for risks, controls, compliance
 */
router.get("/trends", (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)("analytics.report.read"), async (req, res) => {
    const tenantId = req.user.tenantId;
    const { startDate, endDate } = req.query;
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setDate(defaultStart.getDate() - 30);
    const start = startDate ? new Date(startDate) : defaultStart;
    const end = endDate ? new Date(endDate) : now;
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({ error: "Invalid date format for startDate or endDate" });
        return;
    }
    const trends = await (0, analytics_service_1.getKPITrends)(tenantId, start, end);
    res.json(trends);
});
// GET /api/analytics/dashboard-config — Get dashboard config for the user
router.get("/dashboard-config", (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)("analytics.report.read"), async (req, res) => {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    const config = await (0, analytics_service_1.getDashboardConfig)(tenantId, userId);
    res.json({ config });
});
// PUT /api/analytics/dashboard-config — Save dashboard config for the user
router.put("/dashboard-config", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("analytics.report.write"), (0, middleware_port_1.validate)({ body: analytics_schemas_1.updateDashboardconfigBody }), async (req, res) => {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    const config = req.body;
    if (!config || !config.widgets || !config.layout) {
        res.status(400).json({ error: "config must include widgets and layout" });
        return;
    }
    await (0, analytics_service_1.saveDashboardConfig)(tenantId, userId, config);
    (0, resilience_1.swallow)(resilience_1.EC.EVENT_BUS, (0, events_port_1.emitEvent)({ tenantId: req.user.tenantId, userId: req.user.userId, module: 'governance', event: 'updated', entityType: 'analytics', entityId: '' }), { tenantId: req.user.tenantId, operation: 'grcEvent:governance.analytics.updated' });
    res.json({ message: "Dashboard configuration saved" });
});
// POST /api/analytics/benchmark — Get benchmark data for the tenant
router.post("/benchmark", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("analytics.report.read"), (0, middleware_port_1.validate)({ body: analytics_schemas_1.createBenchmarkBody }), async (req, res) => {
    const tenantId = req.user.tenantId;
    const benchmark = await (0, analytics_service_1.getBenchmarkData)(tenantId);
    (0, resilience_1.swallow)(resilience_1.EC.EVENT_BUS, (0, events_port_1.emitEvent)({ tenantId: req.user.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'analytics', entityId: req.params.id || '' }), { tenantId: req.user.tenantId, operation: 'grcEvent:governance.analytics.created' });
    res.json(benchmark);
});
// GET /api/analytics/predictions — Project KPI values 30 days ahead using linear regression on last 90 days
/**
 * @swagger
 * /analytics/predictions:
 *   get:
 *     summary: Get AI-powered predictive analytics for GRC trends
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Predicted compliance, risk, and evidence trends
 */
router.get("/predictions", (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)("analytics.report.read"), async (req, res) => {
    const tenantId = req.user.tenantId;
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 90);
    const trends = await (0, analytics_service_1.getKPITrends)(tenantId, startDate, now);
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + 30);
    const complianceSnapshots = trends.map(t => ({ date: t.snapshotDate, value: t.complianceScore }));
    const riskSnapshots = trends.map(t => ({ date: t.snapshotDate, value: t.riskScore }));
    const evidenceSnapshots = trends.map(t => ({ date: t.snapshotDate, value: t.evidenceCoverage }));
    const remediationSnapshots = trends.map(t => ({ date: t.snapshotDate, value: t.remediationClosureRate }));
    res.json({
        targetDate: targetDate.toISOString(),
        dataPoints: trends.length,
        predictions: {
            complianceScore: (0, analytics_service_1.projectKPI)(complianceSnapshots, targetDate),
            riskScore: (0, analytics_service_1.projectKPI)(riskSnapshots, targetDate),
            evidenceCoverage: (0, analytics_service_1.projectKPI)(evidenceSnapshots, targetDate),
            remediationClosureRate: (0, analytics_service_1.projectKPI)(remediationSnapshots, targetDate),
        },
    });
});
// GET /api/analytics/maturity — Compute current maturity level from tenant KPIs
router.get("/maturity", (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)("analytics.report.read"), async (req, res) => {
    const tenantId = req.user.tenantId;
    const kpis = await (0, analytics_service_1.computeKPIs)(tenantId);
    const criteria = {
        complianceScore: kpis.complianceScore,
        riskScore: kpis.riskScore,
        evidenceCoverage: kpis.evidenceCoverage,
        processMaturity: kpis.remediationClosureRate,
    };
    const level = (0, platform_port_1.computeMaturityLevel)(criteria);
    const invertedRisk = 100 - criteria.riskScore;
    const aggregate = (criteria.complianceScore + invertedRisk + criteria.evidenceCoverage + criteria.processMaturity) / 4;
    res.json({ level, aggregate, criteria });
});
// POST /api/analytics/maturity/assess — Record a maturity assessment with custom criteria
router.post("/maturity/assess", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("analytics.report.write"), (0, middleware_port_1.validate)({ body: analytics_schemas_1.createMaturityAssessBody }), async (req, res) => {
    const tenantId = req.user.tenantId;
    const { complianceScore, riskScore, evidenceCoverage, processMaturity } = req.body;
    if (complianceScore === undefined ||
        riskScore === undefined ||
        evidenceCoverage === undefined ||
        processMaturity === undefined) {
        res.status(400).json({ error: "complianceScore, riskScore, evidenceCoverage, and processMaturity are required" });
        return;
    }
    const criteria = { complianceScore, riskScore, evidenceCoverage, processMaturity };
    const result = await (0, platform_port_1.recordMaturityAssessment)(tenantId, criteria);
    (0, resilience_1.swallow)(resilience_1.EC.EVENT_BUS, (0, events_port_1.emitEvent)({ tenantId: req.user.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'analytics', entityId: req.params.id || '' }), { tenantId: req.user.tenantId, operation: 'grcEvent:governance.analytics.created' });
    res.json(result);
});
// GET /api/analytics/health-score — Compute tenant health score (composite platform metric)
/**
 * @swagger
 * /analytics/health-score:
 *   get:
 *     summary: Get overall GRC program health score (0-100)
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Composite health score with contributing factor breakdown
 */
router.get("/health-score", (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)("analytics.report.read"), async (req, res) => {
    const tenantId = req.user.tenantId;
    const healthScore = await (0, analytics_service_1.computeTenantHealthScore)(tenantId);
    res.json(healthScore);
});
exports.default = router;
//# sourceMappingURL=analytics.routes.js.map