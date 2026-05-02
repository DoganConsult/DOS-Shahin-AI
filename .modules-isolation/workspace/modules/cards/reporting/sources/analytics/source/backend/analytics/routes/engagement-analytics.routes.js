"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
// ============================================
// Shahin GRC — Engagement Analytics Routes
// 5 endpoints for engagement analytics data.
// Internal auth (authenticate + tenantGuard).
//
// GET /vendor-scores
// GET /questionnaire-stats
// GET /regulator-requests
// GET /consultant-portfolio
// GET /sla-breaches
//
// Requirements: 19.1, 21.1
// ============================================
const auth_port_1 = require("../ports/auth.port");
const engagement_analytics_service_1 = require("../services/engagement/engagement-analytics.service");
const middleware_port_1 = require("../ports/middleware.port");
const middleware_port_2 = require("../ports/middleware.port");
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.moduleStack)('analytics'));
// All routes require internal auth + tenant guard
router.use(auth_port_1.authenticate);
router.use(middleware_port_1.tenantGuard);
// GET /vendor-scores — vendor engagement score summaries
router.get('/vendor-scores', (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const scores = await (0, engagement_analytics_service_1.getVendorScores)(req.tenantId);
    res.json(scores);
}));
// GET /questionnaire-stats — questionnaire counts by status + avg completion time
router.get('/questionnaire-stats', (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const stats = await (0, engagement_analytics_service_1.getQuestionnaireStats)(req.tenantId);
    res.json(stats);
}));
// GET /regulator-requests — request summary by status and response time
router.get('/regulator-requests', (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const requests = await (0, engagement_analytics_service_1.getRegulatorRequests)(req.tenantId);
    res.json(requests);
}));
// GET /consultant-portfolio — portfolio health metrics for the current user
router.get('/consultant-portfolio', (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const consultantId = req.user?.userId;
    if (!consultantId) {
        res.status(401).json({ error: 'User ID required' });
        return;
    }
    const portfolio = await (0, engagement_analytics_service_1.getConsultantPortfolio)(consultantId);
    res.json(portfolio);
}));
// GET /sla-breaches — breach counts by time period and vendor risk tier
router.get('/sla-breaches', (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const breaches = await (0, engagement_analytics_service_1.getSLABreaches)(req.tenantId);
    res.json(breaches);
}));
exports.default = router;
//# sourceMappingURL=engagement-analytics.routes.js.map