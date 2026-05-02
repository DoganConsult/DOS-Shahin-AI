"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_port_1 = require("../ports/auth.port");
const events_port_1 = require("../ports/events.port");
const business_services_service_1 = require("../services/business-services.service");
const middleware_port_1 = require("../ports/middleware.port");
const resilient_catch_1 = require("@dos/platform-core/resilience");
const bcp_schemas_1 = require("../schemas/bcp.schemas");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.moduleStack)('bcp'));
router.use((0, middleware_port_1.auditMiddleware)("bcp"));
const emit = (req, event, entityType, entityId, data) => (0, resilient_catch_1.swallow)(resilient_catch_1.EC.EVENT_BUS, (0, events_port_1.emitEvent)({ tenantId: req.tenantId, userId: req.user.userId, module: 'bcp', event, entityType, entityId, data }), { tenantId: req.tenantId, operation: `grcEvent:bcp.${entityType}.${event}` });
router.get("/", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const services = await (0, business_services_service_1.getBusinessServices)(req.tenantId, {
        category: req.query.category,
        criticality: req.query.criticality,
        status: req.query.status,
    });
    res.json({ services, count: services.length });
}));
router.get("/:serviceId", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const service = await (0, business_services_service_1.getServiceById)(req.tenantId, req.params.serviceId);
    if (!service) {
        res.status(404).json({ error: "Business service not found" });
        return;
    }
    res.json(service);
}));
router.post("/", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.write"), (0, middleware_port_1.validate)({ body: bcp_schemas_1.createServiceBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const service = await (0, business_services_service_1.createBusinessService)(req.tenantId, req.body);
    (0, middleware_port_1.setAuditData)(res, { action: "create", entityType: "business_service", entityId: service.service_id, afterState: service });
    emit(req, "created", "business_service", service.service_id, req.body);
    res.status(201).json(service);
}));
router.put("/:serviceId", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.write"), (0, middleware_port_1.validate)({ body: bcp_schemas_1.updateServiceBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const before = await (0, business_services_service_1.getServiceById)(req.tenantId, req.params.serviceId);
    const service = await (0, business_services_service_1.updateBusinessService)(req.tenantId, req.params.serviceId, req.body);
    if (!service) {
        res.status(404).json({ error: "Business service not found" });
        return;
    }
    (0, middleware_port_1.setAuditData)(res, { action: "update", entityType: "business_service", entityId: req.params.serviceId, beforeState: before, afterState: service });
    emit(req, "updated", "business_service", req.params.serviceId, req.body);
    res.json(service);
}));
router.get("/:serviceId/dependencies", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const graph = await (0, business_services_service_1.getServiceDependencyGraph)(req.tenantId, req.params.serviceId);
    if (!graph.service) {
        res.status(404).json({ error: "Business service not found" });
        return;
    }
    res.json(graph);
}));
router.post("/:serviceId/link-bia", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.write"), (0, middleware_port_1.validate)({ body: bcp_schemas_1.linkBiaBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const service = await (0, business_services_service_1.linkServiceToBIA)(req.tenantId, req.params.serviceId, req.body.bia_id);
    if (!service) {
        res.status(404).json({ error: "Business service not found" });
        return;
    }
    (0, middleware_port_1.setAuditData)(res, { action: "update", entityType: "business_service", entityId: req.params.serviceId, afterState: service });
    res.json(service);
}));
router.get("/:serviceId/impact-summary", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const summary = await (0, business_services_service_1.getServiceImpactSummary)(req.tenantId, req.params.serviceId);
    if (!summary.service) {
        res.status(404).json({ error: "Business service not found" });
        return;
    }
    res.json(summary);
}));
exports.default = router;
let genericPayloadSchema = zod_1.z.record(zod_1.z.unknown());
//# sourceMappingURL=business-services.routes.js.map