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
const express_1 = require("express");
const auth_port_1 = require("../ports/auth.port");
const bcp_service_1 = require("../services/bcp.service");
const events_port_1 = require("../ports/events.port");
const error_messages_1 = require("../../../i18n/error-messages");
const bcp_schemas_1 = require("../schemas/bcp.schemas");
const common_schemas_1 = require("../../../schemas/common.schemas");
const middleware_port_1 = require("../ports/middleware.port");
const resilient_catch_1 = require("@dos/platform-core/resilience");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.moduleStack)('bcp'));
router.use((0, middleware_port_1.auditMiddleware)("bcp"));
router.use((0, middleware_port_1.automationMiddleware)("bcp"));
router.use((0, middleware_port_1.fieldRbacFilter)("bcp"));
router.use((0, middleware_port_1.enforceMandatoryFields)("bcp"));
router.use((0, middleware_port_1.enforceStageGates)("bcp"));
// ── Analytics endpoints (must be before /:id to avoid route collision) ────
router.get("/analytics/leading-indicators", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const data = await (0, bcp_service_1.getBCPLeadingIndicators)(req.tenantId);
    res.json(data);
}));
router.get("/analytics/readiness", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const data = await (0, bcp_service_1.getBCPReadinessScore)(req.tenantId);
    res.json(data);
}));
router.get("/analytics/predictive", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const { forecastBCPReadiness, predictRecoveryGap, estimateNextIncidentImpact } = await Promise.resolve().then(() => __importStar(require('../../analytics/services/misc/predictive-analytics.service.js')));
    const [forecast, recoveryGaps, incidentImpact] = await Promise.all([
        forecastBCPReadiness(req.tenantId),
        predictRecoveryGap(req.tenantId),
        estimateNextIncidentImpact(req.tenantId),
    ]);
    res.json({ forecast, recoveryGaps, incidentImpact });
}));
// ── CRUD endpoints ──────────────────────────────────────────────────────────
router.get("/", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const type = req.query.type;
    const plans = await (0, bcp_service_1.getBCPPlans)(req.tenantId, type);
    res.json({ plans, count: plans.length });
}));
router.get("/:id", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const id = req.params.id;
    const plan = await (0, bcp_service_1.getBCPById)(req.tenantId, id);
    if (!plan) {
        res.status(404).json({ error: (0, error_messages_1.errMsg)('NOT_FOUND', req) });
        return;
    }
    res.json(plan);
}));
router.post("/", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.write"), (0, middleware_port_1.validate)({ body: bcp_schemas_1.createBCPBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const { title, type, content } = req.body;
    if (!title || !type || !content) {
        res.status(400).json({ error: (0, error_messages_1.errMsg)('MISSING_FIELDS', req) });
        return;
    }
    const plan = await (0, bcp_service_1.createBCP)(req.tenantId, req.body);
    (0, middleware_port_1.setAuditData)(res, { action: "create", entityType: "bcp_plan", entityId: plan.plan_id, afterState: plan });
    (0, resilient_catch_1.swallow)(resilient_catch_1.EC.EVENT_BUS, (0, events_port_1.emitEvent)({ tenantId: req.tenantId, userId: req.user.userId, module: 'bcp', event: 'created', entityType: 'bcp_plan', entityId: plan.plan_id, data: plan }), { tenantId: req.tenantId, operation: 'grcEvent:bcp.bcp_plan.created' });
    res.status(201).json(plan);
}));
router.put("/:id", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.write"), (0, middleware_port_1.requireOwnership)('bcp'), (0, middleware_port_1.validate)({ params: common_schemas_1.idParam, body: bcp_schemas_1.updateBCPBody }), (0, middleware_port_1.lifecycleGate)('bcp'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const id = req.params.id;
    const before = await (0, bcp_service_1.getBCPById)(req.tenantId, id);
    const plan = await (0, bcp_service_1.updateBCP)(req.tenantId, id, req.body);
    (0, middleware_port_1.setAuditData)(res, { action: "update", entityType: "bcp_plan", entityId: id, beforeState: before, afterState: plan });
    (0, resilient_catch_1.swallow)(resilient_catch_1.EC.EVENT_BUS, (0, events_port_1.emitEvent)({ tenantId: req.tenantId, userId: req.user.userId, module: 'bcp', event: 'updated', entityType: 'bcp_plan', entityId: id, data: plan, previousData: before }), { tenantId: req.tenantId, operation: 'grcEvent:bcp.bcp_plan.updated' });
    res.json(plan);
}));
router.post("/:id/dr-test", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.write"), (0, middleware_port_1.requireOwnership)('bcp'), (0, middleware_port_1.validate)({ params: common_schemas_1.idParam, body: bcp_schemas_1.scheduleDRTestBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const id = req.params.id;
    const { testDate, testType } = req.body;
    if (!testDate || !testType) {
        res.status(400).json({ error: (0, error_messages_1.errMsg)('MISSING_FIELDS', req) });
        return;
    }
    const plan = await (0, bcp_service_1.scheduleDRTest)(req.tenantId, id, req.body);
    (0, middleware_port_1.setAuditData)(res, { action: "update", entityType: "bcp_dr_test", entityId: id, afterState: plan });
    (0, resilient_catch_1.swallow)(resilient_catch_1.EC.EVENT_BUS, (0, events_port_1.emitEvent)({ tenantId: req.tenantId, userId: req.user.userId, module: 'bcp', event: 'dr_test_scheduled', entityType: 'bcp_plan', entityId: id, data: plan }), { tenantId: req.tenantId, operation: 'grcEvent:bcp.bcp_plan.dr_test_scheduled' });
    res.json(plan);
}));
router.post("/:id/recovery", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.write"), (0, middleware_port_1.requireOwnership)('bcp'), (0, middleware_port_1.validate)({ params: common_schemas_1.idParam, body: bcp_schemas_1.documentRecoveryBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const id = req.params.id;
    const { testDate, result } = req.body;
    if (!testDate || !result) {
        res.status(400).json({ error: (0, error_messages_1.errMsg)('MISSING_FIELDS', req) });
        return;
    }
    const plan = await (0, bcp_service_1.documentRecovery)(req.tenantId, id, req.body);
    (0, middleware_port_1.setAuditData)(res, { action: "update", entityType: "bcp_recovery", entityId: id, afterState: plan });
    (0, resilient_catch_1.swallow)(resilient_catch_1.EC.EVENT_BUS, (0, events_port_1.emitEvent)({ tenantId: req.tenantId, userId: req.user.userId, module: 'bcp', event: 'recovery_documented', entityType: 'bcp_plan', entityId: id, data: plan }), { tenantId: req.tenantId, operation: 'grcEvent:bcp.bcp_plan.recovery_documented' });
    res.json(plan);
}));
// DELETE /:id — Soft-delete a BCP plan
router.delete("/:id", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.write"), (0, middleware_port_1.requireOwnership)('bcp'), (0, middleware_port_1.validate)({ body: genericPayloadSchema }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const id = req.params.id;
    const before = await (0, bcp_service_1.getBCPById)(req.tenantId, id);
    if (!before) {
        res.status(404).json({ error: (0, error_messages_1.errMsg)('NOT_FOUND', req) });
        return;
    }
    await (0, bcp_service_1.updateBCP)(req.tenantId, id, { status: 'archived' });
    (0, middleware_port_1.setAuditData)(res, { action: "delete", entityType: "bcp_plan", entityId: id, beforeState: before });
    (0, resilient_catch_1.swallow)(resilient_catch_1.EC.EVENT_BUS, (0, events_port_1.emitEvent)({ tenantId: req.tenantId, userId: req.user.userId, module: 'bcp', event: 'deleted', entityType: 'bcp_plan', entityId: id, previousData: before }), { tenantId: req.tenantId, operation: 'grcEvent:bcp.bcp_plan.deleted' });
    res.json({ message: "BCP plan deleted", plan_id: id });
}));
exports.default = router;
let genericPayloadSchema = zod_1.z.record(zod_1.z.unknown());
//# sourceMappingURL=bcp.routes.js.map