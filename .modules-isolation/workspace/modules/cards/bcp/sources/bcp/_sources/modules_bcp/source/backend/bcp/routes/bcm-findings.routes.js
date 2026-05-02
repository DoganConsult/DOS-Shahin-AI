"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_port_1 = require("../ports/auth.port");
const events_port_1 = require("../ports/events.port");
const bcm_findings_service_1 = require("../services/bcm-findings.service");
const middleware_port_1 = require("../ports/middleware.port");
const resilient_catch_1 = require("@dos/platform-core/resilience");
const bcp_schemas_1 = require("../schemas/bcp.schemas");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.moduleStack)('bcp'));
router.use((0, middleware_port_1.auditMiddleware)("bcp"));
const emit = (req, event, entityType, entityId, data) => (0, resilient_catch_1.swallow)(resilient_catch_1.EC.EVENT_BUS, (0, events_port_1.emitEvent)({ tenantId: req.tenantId, userId: req.user.userId, module: 'bcp', event, entityType, entityId, data }), { tenantId: req.tenantId, operation: `grcEvent:bcp.${entityType}.${event}` });
// ── Summary (before parameterized routes) ──────────────────────────────────
router.get("/summary", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const summary = await (0, bcm_findings_service_1.getFindingsSummary)(req.tenantId);
    res.json(summary);
}));
// ── CRUD ────────────────────────────────────────────────────────────────────
router.get("/", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const findings = await (0, bcm_findings_service_1.getFindings)(req.tenantId, {
        status: req.query.status,
        severity: req.query.severity,
        source_type: req.query.source_type,
        assigned_to: req.query.assigned_to,
    });
    res.json({ findings, count: findings.length });
}));
router.get("/:findingId", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const finding = await (0, bcm_findings_service_1.getFindingById)(req.tenantId, req.params.findingId);
    if (!finding) {
        res.status(404).json({ error: "Finding not found" });
        return;
    }
    res.json(finding);
}));
router.post("/", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.write"), (0, middleware_port_1.validate)({ body: bcp_schemas_1.createFindingBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const finding = await (0, bcm_findings_service_1.createFinding)(req.tenantId, req.body);
    (0, middleware_port_1.setAuditData)(res, { action: "create", entityType: "bcm_finding", entityId: finding.finding_id, afterState: finding });
    emit(req, "finding_created", "bcm_finding", finding.finding_id, req.body);
    res.status(201).json(finding);
}));
router.put("/:findingId", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.write"), (0, middleware_port_1.validate)({ body: bcp_schemas_1.updateFindingBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const before = await (0, bcm_findings_service_1.getFindingById)(req.tenantId, req.params.findingId);
    const finding = await (0, bcm_findings_service_1.updateFinding)(req.tenantId, req.params.findingId, req.body);
    if (!finding) {
        res.status(404).json({ error: "Finding not found" });
        return;
    }
    (0, middleware_port_1.setAuditData)(res, { action: "update", entityType: "bcm_finding", entityId: req.params.findingId, beforeState: before, afterState: finding });
    emit(req, "finding_updated", "bcm_finding", req.params.findingId, req.body);
    res.json(finding);
}));
router.post("/:findingId/verify", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.write"), (0, middleware_port_1.validate)({ body: bcp_schemas_1.createVerifyBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const finding = await (0, bcm_findings_service_1.verifyFinding)(req.tenantId, req.params.findingId, req.user.userId);
    if (!finding) {
        res.status(404).json({ error: "Finding not found" });
        return;
    }
    (0, middleware_port_1.setAuditData)(res, { action: "update", entityType: "bcm_finding", entityId: req.params.findingId, afterState: finding });
    emit(req, "finding_verified", "bcm_finding", req.params.findingId);
    res.json(finding);
}));
router.post("/:findingId/close", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.write"), (0, middleware_port_1.validate)({ body: bcp_schemas_1.createCloseBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const finding = await (0, bcm_findings_service_1.closeFinding)(req.tenantId, req.params.findingId);
    if (!finding) {
        res.status(404).json({ error: "Finding not found" });
        return;
    }
    (0, middleware_port_1.setAuditData)(res, { action: "update", entityType: "bcm_finding", entityId: req.params.findingId, afterState: finding });
    emit(req, "finding_closed", "bcm_finding", req.params.findingId);
    res.json(finding);
}));
exports.default = router;
let genericPayloadSchema = zod_1.z.record(zod_1.z.unknown());
//# sourceMappingURL=bcm-findings.routes.js.map