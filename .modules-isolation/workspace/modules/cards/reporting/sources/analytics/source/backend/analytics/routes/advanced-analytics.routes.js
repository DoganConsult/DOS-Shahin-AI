"use strict";
// ============================================
// Shahin GRC — Advanced Analytics API Routes
// Real DB-driven analytics with drill-through
// ============================================
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
const express_1 = require("express");
const zod_1 = require("zod");
const auth_port_1 = require("../ports/auth.port");
const middleware_port_1 = require("../ports/middleware.port");
const advanced_analytics_service_1 = require("../services/advanced/advanced-analytics.service");
const context_aware_dashboard_service_1 = require("../services/misc/context-aware-dashboard.service");
const db_1 = require("@dos/db");
const middleware_port_2 = require("../ports/middleware.port");
const router = (0, express_1.Router)();
// GET /api/analytics/advanced/risk — Advanced risk analytics with drill-through
router.get('/risk', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('analytics.report.read'), (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const roleCode = req.user?.role || 'viewer';
    const moduleCode = req.query.moduleCode;
    const scenario = req.query.scenario;
    const orgStatus = req.query.orgStatus;
    // Get org status from tenant if not provided
    let resolvedOrgStatus = orgStatus;
    if (!resolvedOrgStatus) {
        const { safeQuery } = await Promise.resolve().then(() => __importStar(require('../../../config/database.js')));
        const tenantResult = await safeQuery(`SELECT status FROM tenants WHERE tenant_id = $1`, [tenantId]);
        resolvedOrgStatus = tenantResult.rows[0]?.status || 'active';
    }
    const ctx = {
        tenantId,
        roleCode,
        moduleCode,
        scenario,
        orgStatus: resolvedOrgStatus,
        filters: req.query,
    };
    const result = await (0, advanced_analytics_service_1.getAdvancedRiskAnalytics)(ctx);
    res.json(result);
}));
// GET /api/analytics/advanced/compliance — Advanced compliance analytics
router.get('/compliance', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('analytics.report.read'), (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const roleCode = req.user?.role || 'viewer';
    const moduleCode = req.query.moduleCode;
    const scenario = req.query.scenario;
    const orgStatus = req.query.orgStatus;
    let resolvedOrgStatus = orgStatus;
    if (!resolvedOrgStatus) {
        const { safeQuery } = await Promise.resolve().then(() => __importStar(require('../../../config/database.js')));
        const tenantResult = await safeQuery(`SELECT status FROM tenants WHERE tenant_id = $1`, [tenantId]);
        resolvedOrgStatus = tenantResult.rows[0]?.status || 'active';
    }
    const ctx = {
        tenantId,
        roleCode,
        moduleCode,
        scenario,
        orgStatus: resolvedOrgStatus,
        filters: req.query,
    };
    const result = await (0, advanced_analytics_service_1.getAdvancedComplianceAnalytics)(ctx);
    res.json(result);
}));
// GET /api/analytics/advanced/evidence — Advanced evidence analytics
router.get('/evidence', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('analytics.report.read'), (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const roleCode = req.user?.role || 'viewer';
    const moduleCode = req.query.moduleCode;
    const scenario = req.query.scenario;
    const orgStatus = req.query.orgStatus;
    let resolvedOrgStatus = orgStatus;
    if (!resolvedOrgStatus) {
        const { safeQuery } = await Promise.resolve().then(() => __importStar(require('../../../config/database.js')));
        const tenantResult = await safeQuery(`SELECT status FROM tenants WHERE tenant_id = $1`, [tenantId]);
        resolvedOrgStatus = tenantResult.rows[0]?.status || 'active';
    }
    const ctx = {
        tenantId,
        roleCode,
        moduleCode,
        scenario,
        orgStatus: resolvedOrgStatus,
        filters: req.query,
    };
    const result = await (0, advanced_analytics_service_1.getAdvancedEvidenceAnalytics)(ctx);
    res.json(result);
}));
// GET /api/analytics/advanced/workflow — Advanced workflow analytics
router.get('/workflow', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('analytics.report.read'), (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const roleCode = req.user?.role || 'viewer';
    const moduleCode = req.query.moduleCode;
    const scenario = req.query.scenario;
    const orgStatus = req.query.orgStatus;
    let resolvedOrgStatus = orgStatus;
    if (!resolvedOrgStatus) {
        const { safeQuery } = await Promise.resolve().then(() => __importStar(require('../../../config/database.js')));
        const tenantResult = await safeQuery(`SELECT status FROM tenants WHERE tenant_id = $1`, [tenantId]);
        resolvedOrgStatus = tenantResult.rows[0]?.status || 'active';
    }
    const ctx = {
        tenantId,
        roleCode,
        moduleCode,
        scenario,
        orgStatus: resolvedOrgStatus,
        filters: req.query,
    };
    const result = await (0, advanced_analytics_service_1.getAdvancedWorkflowAnalytics)(ctx);
    res.json(result);
}));
// GET /api/analytics/advanced/dashboard — Context-aware dashboard builder
router.get('/dashboard', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('analytics.report.read'), (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const roleCode = req.user?.role || 'viewer';
    const moduleCode = req.query.moduleCode;
    const scenario = req.query.scenario;
    const orgStatus = req.query.orgStatus;
    const orgMaturity = req.query.orgMaturity;
    // Get org status from tenant if not provided
    let resolvedOrgStatus = orgStatus;
    if (!resolvedOrgStatus) {
        try {
            const { query: _query } = await Promise.resolve().then(() => __importStar(require('../../../config/database.js')));
            const schema = `tenant_${tenantId}`;
            const tenantResult = await (0, db_1.safeQuery)(`SELECT status FROM "${schema}".tenants WHERE tenant_id = $1`, [tenantId]);
            if (tenantResult.rows[0]) {
                resolvedOrgStatus = tenantResult.rows[0].status || 'active';
            }
        }
        catch (_err) {
            // Fallback to active if query fails
            resolvedOrgStatus = 'active';
        }
    }
    const ctx = {
        tenantId,
        roleCode,
        moduleCode,
        scenario,
        orgStatus: resolvedOrgStatus || 'active',
        orgMaturity,
    };
    const dashboard = await (0, context_aware_dashboard_service_1.buildContextualDashboard)(ctx);
    res.json(dashboard);
}));
exports.default = router;
//# sourceMappingURL=advanced-analytics.routes.js.map