"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModuleConfig = getModuleConfig;
exports.updateModuleConfig = updateModuleConfig;
exports.reseedModule = reseedModule;
exports.getModuleHealth = getModuleHealth;
exports.getDashboardAnalytics = getDashboardAnalytics;
exports.getWidgetHealth = getWidgetHealth;
exports.reindexModule = reindexModule;
exports.backfillModule = backfillModule;
const module_sdk_1 = require("@dos/module-sdk");
const middleware_port_1 = require("../ports/middleware.port");
const analytics_seed_1 = require("../data/analytics-seed");
const database_port_1 = require("../ports/database.port");
const analyticsQuery = __importStar(require("../repositories/analytics-query.repo"));
const analytics_constants_1 = require("../data/analytics-constants");
async function getModuleConfig(req, res) {
    const seedData = (0, analytics_seed_1.getAnalyticsSeedData)();
    res.json((0, module_sdk_1.ok)({ moduleCode: 'analytics', config: seedData.defaultConfigs }, req));
}
async function updateModuleConfig(req, res) {
    (0, middleware_port_1.setAuditData)(res, { action: 'update', entityType: 'analytics_config', entityId: 'analytics' });
    res.json((0, module_sdk_1.action)('Configuration updated', req));
}
async function reseedModule(req, res) {
    const tenantId = req.tenantId;
    const schema = req.tenantSchema || `tenant_${tenantId}`;
    await (0, analytics_seed_1.seedAnalyticsModule)(tenantId, schema);
    (0, middleware_port_1.setAuditData)(res, { action: 'reseed', entityType: 'analytics', entityId: tenantId });
    res.json((0, module_sdk_1.action)('Module reseeded', req));
}
async function getModuleHealth(req, res) {
    const tenantId = req.tenantId;
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const seedData = (0, analytics_seed_1.getAnalyticsSeedData)();
    const [statusStats, widgetStats, kpiStats] = await Promise.all([
        (0, database_port_1.safeQuery)(`SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE status = 'published')::int AS published,
         COUNT(*) FILTER (WHERE status = 'deprecated')::int AS deprecated,
         COUNT(*) FILTER (WHERE status = 'archived')::int AS archived,
         COUNT(*) FILTER (WHERE updated_at < NOW() - INTERVAL '${analytics_constants_1.ANALYTICS_BUSINESS_THRESHOLDS.STALE_REPORT_DAYS} days' AND status NOT IN ('archived', 'deprecated'))::int AS stale
       FROM "${schema}".analytics_dashboards WHERE deleted_at IS NULL`).catch(() => ({ rows: [{}] })),
        (0, database_port_1.safeQuery)(`SELECT
         COUNT(*)::int AS total_widgets,
         COUNT(*) FILTER (WHERE last_refreshed_at IS NOT NULL AND last_refreshed_at > NOW() - INTERVAL '${analytics_constants_1.ANALYTICS_TIMEOUTS.CACHE_TTL_MINUTES} minutes')::int AS fresh_widgets,
         COUNT(*) FILTER (WHERE last_refreshed_at IS NULL OR last_refreshed_at < NOW() - INTERVAL '${analytics_constants_1.ANALYTICS_BUSINESS_THRESHOLDS.REFRESH_WARNING_HOURS} hours')::int AS stale_widgets,
         COUNT(*) FILTER (WHERE refresh_failed = true)::int AS failed_widgets,
         COALESCE(AVG(refresh_interval_minutes)::int, 0) AS avg_refresh_minutes
       FROM "${schema}".analytics_widgets WHERE deleted_at IS NULL`).catch(() => ({ rows: [{}] })),
        (0, database_port_1.safeQuery)(`SELECT
         COUNT(DISTINCT metric_code)::int AS defined_kpis,
         COUNT(*) FILTER (WHERE computed_at > NOW() - INTERVAL '24 hours')::int AS kpis_refreshed_today,
         COUNT(*) FILTER (WHERE value IS NOT NULL)::int AS kpis_with_data
       FROM "${schema}".analytics_kpi_snapshots WHERE deleted_at IS NULL`).catch(() => ({ rows: [{}] })),
    ]);
    const ss = statusStats.rows[0] || {};
    const ws = widgetStats.rows[0] || {};
    const ks = kpiStats.rows[0] || {};
    const staleRatio = ss.total > 0 ? (ss.stale || 0) / ss.total : 0;
    const widgetFailRatio = ws.total_widgets > 0 ? (ws.failed_widgets || 0) / ws.total_widgets : 0;
    let healthStatus = 'healthy';
    if (widgetFailRatio > 0.2 || staleRatio > 0.5)
        healthStatus = 'critical';
    else if (widgetFailRatio > 0.05 || staleRatio > 0.2 || (ss.published || 0) === 0)
        healthStatus = 'degraded';
    res.json((0, module_sdk_1.ok)({
        moduleCode: 'analytics',
        status: healthStatus,
        lastCheck: new Date().toISOString(),
        permissions: seedData.permissions?.length,
        roles: seedData.roles?.length,
        actions: seedData.actions?.length,
        dashboards: {
            total: ss.total || 0,
            draft: ss.draft || 0,
            active: ss.active || 0,
            published: ss.published || 0,
            deprecated: ss.deprecated || 0,
            archived: ss.archived || 0,
            stale: ss.stale || 0,
        },
        widgets: {
            total: ws.total_widgets || 0,
            fresh: ws.fresh_widgets || 0,
            stale: ws.stale_widgets || 0,
            failed: ws.failed_widgets || 0,
            avgRefreshMinutes: ws.avg_refresh_minutes || 0,
        },
        kpis: {
            defined: ks.defined_kpis || 0,
            refreshedToday: ks.kpis_refreshed_today || 0,
            withData: ks.kpis_with_data || 0,
        },
        limits: analytics_constants_1.ANALYTICS_LIMITS,
        timeouts: analytics_constants_1.ANALYTICS_TIMEOUTS,
    }, req));
}
async function getDashboardAnalytics(req, res) {
    const tenantId = req.tenantId;
    const [kpis, typeBreakdown, dataSourceBreakdown, agingReport] = await Promise.all([
        analyticsQuery.getKpiMetrics(tenantId),
        analyticsQuery.getWidgetTypeBreakdown(tenantId),
        analyticsQuery.getDataSourceBreakdown(tenantId),
        analyticsQuery.getAgingReport(tenantId),
    ]);
    res.json((0, module_sdk_1.ok)({ kpis, typeBreakdown, dataSourceBreakdown, agingReport }, req));
}
async function getWidgetHealth(req, res) {
    const tenantId = req.tenantId;
    const staleWidgets = await analyticsQuery.getStaleWidgets(tenantId);
    res.json((0, module_sdk_1.ok)({ staleWidgets, total: staleWidgets.length }, req));
}
async function reindexModule(req, res) {
    (0, middleware_port_1.setAuditData)(res, { action: 'reindex', entityType: 'analytics', entityId: req.tenantId });
    res.json((0, module_sdk_1.action)('Reindex initiated', req));
}
async function backfillModule(req, res) {
    (0, middleware_port_1.setAuditData)(res, { action: 'backfill', entityType: 'analytics', entityId: req.tenantId });
    res.json((0, module_sdk_1.action)('Backfill initiated', req));
}
//# sourceMappingURL=analytics-admin.controller.js.map