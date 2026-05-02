"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_port_1 = require("../ports/auth.port");
const predictive_analytics_service_1 = require("../services/misc/predictive-analytics.service");
const middleware_port_1 = require("../ports/middleware.port");
const middleware_port_2 = require("../ports/middleware.port");
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.moduleStack)('analytics'));
/**
 * @openapi
 * /predictive-analytics/dashboard:
 *   get:
 *     tags: [Analytics]
 *     summary: Full predictive analytics dashboard
 */
router.get('/dashboard', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('analytics.report.read'), (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const data = await (0, predictive_analytics_service_1.getAnalyticsDashboard)(tenantId);
    res.json(data);
}));
/**
 * @openapi
 * /predictive-analytics/compliance-forecast:
 *   get:
 *     tags: [Analytics]
 *     summary: Forecast compliance score trend using linear regression
 *     parameters:
 *       - name: daysAhead
 *         in: query
 *         schema: { type: integer, default: 90 }
 */
router.get('/compliance-forecast', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('analytics.report.read'), (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const daysAhead = Number(req.query.daysAhead) || 90;
    const data = await (0, predictive_analytics_service_1.forecastComplianceScore)(tenantId, daysAhead);
    res.json(data);
}));
/**
 * @openapi
 * /predictive-analytics/remediation-estimate:
 *   get:
 *     tags: [Analytics]
 *     summary: Estimate remediation time by severity based on historical data
 */
router.get('/remediation-estimate', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('analytics.report.read'), (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const { severity = 'high' } = req.query;
    const data = await (0, predictive_analytics_service_1.estimateRemediationTime)(tenantId, String(severity));
    res.json(data);
}));
/**
 * @openapi
 * /predictive-analytics/risk-escalation:
 *   get:
 *     tags: [Analytics]
 *     summary: Predict which open risks are likely to escalate
 */
router.get('/risk-escalation', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('analytics.report.read'), (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const data = await (0, predictive_analytics_service_1.predictRiskEscalation)(tenantId);
    res.json({ data });
}));
exports.default = router;
//# sourceMappingURL=predictive-analytics.routes.js.map