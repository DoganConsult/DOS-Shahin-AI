"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_port_1 = require("../ports/auth.port");
const events_port_1 = require("../ports/events.port");
const crisis_management_service_1 = require("../services/crisis-management.service");
const middleware_port_1 = require("../ports/middleware.port");
const resilient_catch_1 = require("@dos/platform-core/resilience");
const bcp_schemas_1 = require("../schemas/bcp.schemas");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.moduleStack)('bcp'));
router.use((0, middleware_port_1.auditMiddleware)("bcp"));
const emit = (req, event, entityType, entityId, data) => (0, resilient_catch_1.swallow)(resilient_catch_1.EC.EVENT_BUS, (0, events_port_1.emitEvent)({ tenantId: req.tenantId, userId: req.user.userId, module: 'bcp', event, entityType, entityId, data }), { tenantId: req.tenantId, operation: `grcEvent:bcp.${entityType}.${event}` });
// ── Dashboard & Lists (before parameterized routes) ────────────────────────
router.get("/active", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const crises = await (0, crisis_management_service_1.getActiveCrises)(req.tenantId);
    res.json({ crises, count: crises.length });
}));
router.get("/dashboard", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const dashboard = await (0, crisis_management_service_1.getCrisisDashboard)(req.tenantId);
    res.json(dashboard);
}));
router.get("/", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const events = await (0, crisis_management_service_1.getCrisisEvents)(req.tenantId, {
        status: req.query.status,
        severity: req.query.severity,
        crisis_type: req.query.crisis_type,
    });
    res.json({ events, count: events.length });
}));
// ── CRUD ────────────────────────────────────────────────────────────────────
router.post("/", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.write"), (0, middleware_port_1.validate)({ body: bcp_schemas_1.declareCrisisBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const crisis = await (0, crisis_management_service_1.declareCrisis)(req.tenantId, { ...req.body, declared_by: req.user.userId });
    (0, middleware_port_1.setAuditData)(res, { action: "create", entityType: "crisis_event", entityId: crisis.event_id, afterState: crisis });
    emit(req, "crisis_declared", "crisis_event", crisis.event_id, req.body);
    res.status(201).json(crisis);
}));
router.get("/:eventId", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const crisis = await (0, crisis_management_service_1.getCrisisById)(req.tenantId, req.params.eventId);
    if (!crisis) {
        res.status(404).json({ error: "Crisis event not found" });
        return;
    }
    res.json(crisis);
}));
router.put("/:eventId", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.write"), (0, middleware_port_1.validate)({ body: bcp_schemas_1.updateStatusBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const crisis = await (0, crisis_management_service_1.updateCrisisStatus)(req.tenantId, req.params.eventId, req.body.status, {
        message: req.body.message, updated_by: req.user?.userId,
    });
    if (!crisis) {
        res.status(404).json({ error: "Crisis event not found" });
        return;
    }
    (0, middleware_port_1.setAuditData)(res, { action: "update", entityType: "crisis_event", entityId: req.params.eventId, afterState: crisis });
    emit(req, "crisis_status_changed", "crisis_event", req.params.eventId, req.body);
    res.json(crisis);
}));
router.post("/:eventId/timeline", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.write"), (0, middleware_port_1.validate)({ body: bcp_schemas_1.timelineEntryBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const crisis = await (0, crisis_management_service_1.addTimelineEntry)(req.tenantId, req.params.eventId, {
        ...req.body, by: req.user?.userId,
    });
    if (!crisis) {
        res.status(404).json({ error: "Crisis event not found" });
        return;
    }
    (0, middleware_port_1.setAuditData)(res, { action: "update", entityType: "crisis_event", entityId: req.params.eventId, afterState: crisis });
    res.json(crisis);
}));
router.post("/:eventId/resolve", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.write"), (0, middleware_port_1.validate)({ body: bcp_schemas_1.resolveCrisisBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const crisis = await (0, crisis_management_service_1.resolveCrisis)(req.tenantId, req.params.eventId, req.user.userId, req.body.post_crisis_review);
    if (!crisis) {
        res.status(404).json({ error: "Crisis event not found" });
        return;
    }
    (0, middleware_port_1.setAuditData)(res, { action: "update", entityType: "crisis_event", entityId: req.params.eventId, afterState: crisis });
    emit(req, "crisis_resolved", "crisis_event", req.params.eventId, req.body);
    res.json(crisis);
}));
exports.default = router;
let genericPayloadSchema = zod_1.z.record(zod_1.z.unknown());
//# sourceMappingURL=bcm-crisis.routes.js.map