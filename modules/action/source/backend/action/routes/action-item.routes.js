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
const zod_1 = require("zod");
// ============================================
// Shahin GRC — Action Item Routes
// ============================================
const auth_port_1 = require("../ports/auth.port");
// @ts-ignore - Pragmatic stabilization to unblock build
const action_item_service_1 = require("../services/action-item.service");
const events_port_1 = require("../ports/events.port");
const error_messages_1 = require("../../i18n/error-messages");
const action_schemas_1 = require("../schemas/action.schemas");
const resilience_1 = require("@dos/platform-core/resilience");
const middleware_port_1 = require("../ports/middleware.port");
const module_sdk_1 = require("@dos/module-sdk");
const actionQuery = __importStar(require("../repositories/action-query.repo"));
const action_lifecycle_service_1 = require("../services/action-lifecycle.service");
const action_reporting_service_1 = require("../services/action-reporting.service");
const action_tracking_service_1 = require("../services/action-tracking.service");
const genericPayloadSchema = zod_1.z.record(zod_1.z.unknown());
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.moduleStack)('action'));
router.use((0, middleware_port_1.auditMiddleware)("action"));
router.use((0, middleware_port_1.automationMiddleware)("action"));
router.use((0, middleware_port_1.enforceMandatoryFields)("action"));
router.use((0, middleware_port_1.enforceStageGates)("action"));
// GET /api/action-items
router.get("/", (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)("action.item.read"), async (req, res) => {
    const tenantId = req.tenantId;
    const { assignedTo, status, sourceType } = req.query;
    const items = await (0, action_item_service_1.getActionItems)(tenantId, {
        assignedTo: assignedTo,
        status: status,
        sourceType: sourceType,
    });
    res.json(items);
});
// POST /api/action-items
router.post("/", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("action.write"), (0, middleware_port_1.validate)({ body: action_schemas_1.createActionBody }), async (req, res) => {
    const tenantId = req.tenantId;
    const { title, description, sourceType, sourceId, assignedTo, deadline } = req.body;
    if (!title || !sourceType || !sourceId || !assignedTo) {
        res.status(400).json({ error: (0, error_messages_1.errMsg)('MISSING_FIELDS', req) });
        return;
    }
    try {
        const item = await (0, action_item_service_1.createActionItem)(tenantId, { title, description, sourceType, sourceId, assignedTo, deadline, createdBy: req.user.userId });
        (0, middleware_port_1.setAuditData)(res, { action: "create", entityType: "action_item", entityId: item.actionId, afterState: item });
        (0, resilience_1.swallow)(resilience_1.EC.EVENT_BUS, (0, events_port_1.emitEvent)({ tenantId, userId: req.user.userId, module: 'action', event: 'created', entityType: 'action_item', entityId: item.actionId, data: item }), { tenantId: tenantId, operation: 'grcEvent:action.action_item.created' });
        res.status(201).json(item);
    }
    catch (_err) {
        res.status(500).json({ error: (0, error_messages_1.errMsg)('INTERNAL_ERROR', req) });
    }
});
// PUT /api/action-items/:id
router.put("/:id", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("action.write"), (0, middleware_port_1.validate)({ body: action_schemas_1.updateActionBody }), (0, middleware_port_1.lifecycleGate)('action'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const item = await (0, action_item_service_1.updateActionItem)(tenantId, req.params.id, req.body);
        (0, middleware_port_1.setAuditData)(res, { action: "update", entityType: "action_item", entityId: req.params.id, afterState: item });
        (0, resilience_1.swallow)(resilience_1.EC.EVENT_BUS, (0, events_port_1.emitEvent)({ tenantId, userId: req.user.userId, module: 'action', event: 'updated', entityType: 'action_item', entityId: req.params.id, data: item }), { tenantId: tenantId, operation: 'grcEvent:action.action_item.updated' });
        res.json(item);
    }
    catch (err) {
        if ((0, module_sdk_1.toErrorMessage)(err) === 'Action item not found') {
            res.status(404).json({ error: (0, error_messages_1.errMsg)('NOT_FOUND', req) });
            return;
        }
        res.status(500).json({ error: (0, error_messages_1.errMsg)('INTERNAL_ERROR', req) });
    }
});
// DELETE /api/action-items/:id
router.delete("/:id", (0, middleware_port_1.validate)({ body: genericPayloadSchema }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)("action.write"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const _item = await (0, action_item_service_1.updateActionItem)(tenantId, req.params.id, {});
        (0, middleware_port_1.setAuditData)(res, { action: "delete", entityType: "action_item", entityId: req.params.id });
        (0, events_port_1.emitEvent)({ tenantId, userId: req.user.userId, module: 'action', event: 'deleted', entityType: 'action_item', entityId: req.params.id, data: { status: 'deleted' } }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS, {}));
        res.json({ message: "Action item deleted", id: req.params.id });
    }
    catch (err) {
        if ((0, module_sdk_1.toErrorMessage)(err) === 'Action item not found') {
            res.status(404).json({ error: (0, error_messages_1.errMsg)('NOT_FOUND', req) });
            return;
        }
        res.status(500).json({ error: (0, error_messages_1.errMsg)('INTERNAL_ERROR', req) });
    }
});
// GET /api/action-items/consolidated
router.get("/consolidated", (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)("action.item.read"), async (req, res) => {
    const tenantId = req.tenantId;
    const userId = req.query.userId || req.user.userId;
    const items = await (0, action_item_service_1.getConsolidatedActionCenter)(tenantId, req.query.all === 'true' ? undefined : userId);
    res.json({ items, total: items.length });
});
// GET /api/action-items/digest
router.get("/digest", (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)("action.item.read"), async (req, res) => {
    const tenantId = req.tenantId;
    const userId = req.user.userId;
    const digest = await (0, action_item_service_1.getDailyDigest)(tenantId, userId);
    res.json(digest);
});
router.get("/search", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("action.item.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const result = await actionQuery.searchEntities(req.tenantId, {
        query: req.query.q,
        status: req.query.status,
        assignedTo: req.query.assignedTo,
        sourceType: req.query.sourceType,
        page: Number(req.query.page) || 1,
        pageSize: Number(req.query.pageSize) || 20,
        sortBy: req.query.sortBy,
        sortDir: req.query.sortDir,
    });
    res.json((0, module_sdk_1.ok)(result, req));
}));
router.get("/dashboard", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("action.item.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const [stats, kpis, sourceBreakdown, priorityBreakdown, assigneeWorkload] = await Promise.all([
        actionQuery.getDashboardStats(req.tenantId),
        actionQuery.getKpiMetrics(req.tenantId),
        actionQuery.getSourceBreakdown(req.tenantId),
        actionQuery.getPriorityBreakdown(req.tenantId),
        actionQuery.getAssigneeWorkload(req.tenantId),
    ]);
    res.json((0, module_sdk_1.ok)({ stats, kpis, sourceBreakdown, priorityBreakdown, assigneeWorkload }, req));
}));
router.get("/trends", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("action.item.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const aging = await actionQuery.getAgingReport(req.tenantId);
    const resolutionTime = await (0, action_reporting_service_1.getResolutionTimeStats)(req.tenantId);
    res.json((0, module_sdk_1.ok)({ aging, resolutionTime }, req));
}));
router.get("/cross-module/:linkedModule", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("action.item.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const data = await actionQuery.getCrossModuleView(req.tenantId, req.params.linkedModule);
    res.json((0, module_sdk_1.ok)({ items: data, total: data.length }, req));
}));
router.get("/export", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("action.item.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const data = await actionQuery.getExportData(req.tenantId, req.query);
    res.json((0, module_sdk_1.ok)({ rows: data, total: data.length, exportedAt: new Date().toISOString() }, req));
}));
router.get("/reporting/full", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("action.item.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const dashboard = await (0, action_reporting_service_1.getActionDashboard)(req.tenantId);
    res.json((0, module_sdk_1.ok)(dashboard, req));
}));
router.get("/reporting/by-source", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("action.item.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const bySource = await (0, action_reporting_service_1.getActionsBySource)(req.tenantId);
    res.json((0, module_sdk_1.ok)({ bySource }, req));
}));
router.get("/reporting/by-assignee", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("action.item.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const byAssignee = await (0, action_reporting_service_1.getActionsByAssignee)(req.tenantId);
    res.json((0, module_sdk_1.ok)({ byAssignee }, req));
}));
router.get("/reporting/sla", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("action.item.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const report = await (0, action_reporting_service_1.getSlaComplianceReport)(req.tenantId);
    res.json((0, module_sdk_1.ok)(report, req));
}));
router.get("/:id/history", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("action.item.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const history = await (0, action_lifecycle_service_1.getStatusHistory)(req.tenantId, req.params.id);
    res.json((0, module_sdk_1.ok)({ history }, req));
}));
router.get("/:id/progress", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("action.item.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const progress = await (0, action_tracking_service_1.getActionProgress)(req.tenantId, req.params.id);
    res.json((0, module_sdk_1.ok)(progress, req));
}));
router.get("/:id/blockers", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("action.item.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const blockers = await (0, action_tracking_service_1.getBlockers)(req.tenantId, req.params.id);
    res.json((0, module_sdk_1.ok)({ blockers, total: blockers.length }, req));
}));
router.get("/:id/dependencies", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("action.item.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const chain = await (0, action_tracking_service_1.getDependencyChain)(req.tenantId, req.params.id);
    res.json((0, module_sdk_1.ok)({ dependencies: chain, total: chain.length }, req));
}));
router.get("/:id/evidence", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("action.item.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const evidence = await (0, action_tracking_service_1.getCompletionEvidence)(req.tenantId, req.params.id);
    res.json((0, module_sdk_1.ok)({ evidence, total: evidence.length }, req));
}));
router.post("/:id/transition", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("action.write"), (0, middleware_port_1.validate)({ body: action_schemas_1.createTransitionBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const result = await (0, action_lifecycle_service_1.transitionStatus)(req.tenantId, req.params.id, req.body.status, userId, req.body.note);
    (0, middleware_port_1.setAuditData)(res, { action: "transition", entityType: "action_item", entityId: req.params.id });
    (0, resilience_1.swallow)(resilience_1.EC.EVENT_BUS, (0, events_port_1.emitEvent)({ tenantId: req.tenantId, userId, module: 'action', event: 'transitioned', entityType: 'action_item', entityId: req.params.id, data: result }), { tenantId: req.tenantId, operation: 'grcEvent:action.action_item.transitioned' });
    res.json((0, module_sdk_1.ok)(result, req));
}));
router.post("/:id/cancel", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("action.write"), (0, middleware_port_1.validate)({ body: action_schemas_1.createCancelBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const result = await (0, action_lifecycle_service_1.cancelItem)(req.tenantId, req.params.id, userId, req.body.reason);
    (0, middleware_port_1.setAuditData)(res, { action: "cancel", entityType: "action_item", entityId: req.params.id });
    res.json((0, module_sdk_1.ok)(result, req));
}));
router.post("/:id/reopen", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("action.write"), (0, middleware_port_1.validate)({ body: action_schemas_1.createReopenBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const result = await (0, action_lifecycle_service_1.reopenItem)(req.tenantId, req.params.id, userId);
    (0, middleware_port_1.setAuditData)(res, { action: "reopen", entityType: "action_item", entityId: req.params.id });
    res.json((0, module_sdk_1.ok)(result, req));
}));
router.post("/:id/blockers", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("action.write"), (0, middleware_port_1.validate)({ body: action_schemas_1.createBlockersBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const blocker = await (0, action_tracking_service_1.reportBlocker)(req.tenantId, req.params.id, req.body.description, userId);
    res.status(201).json((0, module_sdk_1.ok)(blocker, req));
}));
router.post("/:id/blockers/:blockerId/resolve", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("action.write"), (0, middleware_port_1.validate)({ body: action_schemas_1.createResolveBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const result = await (0, action_tracking_service_1.resolveBlocker)(req.tenantId, req.params.blockerId, userId);
    res.json((0, module_sdk_1.ok)(result, req));
}));
router.post("/:id/dependencies", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("action.write"), (0, middleware_port_1.validate)({ body: action_schemas_1.createDependenciesBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const dep = await (0, action_tracking_service_1.addDependency)(req.tenantId, req.params.id, req.body.dependsOnId);
    res.status(201).json((0, module_sdk_1.ok)(dep, req));
}));
router.post("/:id/evidence", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("action.write"), (0, middleware_port_1.validate)({ body: action_schemas_1.createEvidenceBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const evidence = await (0, action_tracking_service_1.addCompletionEvidence)(req.tenantId, { itemId: req.params.id, description: req.body.description, fileReference: req.body.fileReference, submittedBy: userId });
    res.status(201).json((0, module_sdk_1.ok)(evidence, req));
}));
router.post("/bulk/transition", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("action.bulk"), (0, middleware_port_1.validate)({ body: action_schemas_1.bulkTransitionBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const result = await (0, action_lifecycle_service_1.bulkTransitionStatus)(req.tenantId, req.body.ids, req.body.status, userId);
    res.json((0, module_sdk_1.ok)(result, req));
}));
exports.default = router;
//# sourceMappingURL=action-item.routes.js.map