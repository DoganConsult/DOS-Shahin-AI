"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
/**
 * ClickHouse Analytics Routes
 *
 * Exposes ClickHouse analytics data via REST API:
 *   GET /api/analytics/clickhouse/health
 *   GET /api/analytics/clickhouse/audit-timeline
 *   GET /api/analytics/clickhouse/agent-performance
 *   GET /api/analytics/clickhouse/api-latency
 */
const auth_port_1 = require("../ports/auth.port");
const platform_port_1 = require("../ports/platform.port");
const clickhouse_analytics_service_1 = require("../services/misc/clickhouse-analytics.service");
const module_sdk_1 = require("@dos/module-sdk");
const middleware_port_1 = require("../ports/middleware.port");
const router = (0, express_1.Router)();
router.use(auth_port_1.authenticate);
/**
 * GET /api/analytics/clickhouse/health
 * Returns ClickHouse connection status and version info.
 */
router.get('/health', (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, auth_port_1.requirePermission)('analytics.report.read'), async (_req, res) => {
    try {
        const health = await (0, platform_port_1.checkClickHouseHealth)();
        res.json({ success: true, data: health });
    }
    catch (err) {
        res.status(500).json({ success: false, error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
/**
 * GET /api/analytics/clickhouse/audit-timeline
 * Query params: days (default 30), granularity (hour | day, default day)
 */
router.get('/audit-timeline', (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, auth_port_1.requirePermission)('analytics.report.read'), async (req, res) => {
    try {
        if (!(0, platform_port_1.isClickHouseEnabled)()) {
            return res.json({ success: true, data: [], message: 'ClickHouse is disabled' });
        }
        const tenantId = req.tenantId;
        const days = parseInt(req.query.days) || 30;
        const granularity = req.query.granularity || 'day';
        const timeline = await (0, clickhouse_analytics_service_1.getAuditTimeline)(tenantId, days, granularity);
        res.json({ success: true, data: timeline });
    }
    catch (err) {
        res.status(500).json({ success: false, error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
/**
 * GET /api/analytics/clickhouse/agent-performance
 * Query params: days (default 30)
 */
router.get('/agent-performance', (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, auth_port_1.requirePermission)('analytics.report.read'), async (req, res) => {
    try {
        if (!(0, platform_port_1.isClickHouseEnabled)()) {
            return res.json({ success: true, data: [], message: 'ClickHouse is disabled' });
        }
        const tenantId = req.tenantId;
        const days = parseInt(req.query.days) || 30;
        const performance = await (0, clickhouse_analytics_service_1.getAgentPerformanceAggregates)(tenantId, days);
        res.json({ success: true, data: performance });
    }
    catch (err) {
        res.status(500).json({ success: false, error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
/**
 * GET /api/analytics/clickhouse/api-latency
 * Query params: days (default 7)
 */
router.get('/api-latency', (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, auth_port_1.requirePermission)('analytics.report.read'), async (req, res) => {
    try {
        if (!(0, platform_port_1.isClickHouseEnabled)()) {
            return res.json({ success: true, data: [], message: 'ClickHouse is disabled' });
        }
        const tenantId = req.tenantId;
        const days = parseInt(req.query.days) || 7;
        const latency = await (0, clickhouse_analytics_service_1.getApiLatencyPercentiles)(tenantId, days);
        res.json({ success: true, data: latency });
    }
    catch (err) {
        res.status(500).json({ success: false, error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
exports.default = router;
//# sourceMappingURL=clickhouse-analytics.routes.js.map