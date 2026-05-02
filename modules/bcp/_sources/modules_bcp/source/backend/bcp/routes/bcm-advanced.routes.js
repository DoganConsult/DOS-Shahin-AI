"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_port_1 = require("../ports/auth.port");
const events_port_1 = require("../ports/events.port");
const module_sdk_1 = require("@dos/module-sdk");
const bcm_advanced_service_1 = require("../services/bcm-advanced.service");
// ── Zod Validation Schemas ──
const middleware_port_1 = require("../ports/middleware.port");
const resilient_catch_1 = require("@dos/platform-core/resilience");
const bcp_schemas_1 = require("../schemas/bcp.schemas");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.moduleStack)('bcp'));
router.use((0, middleware_port_1.auditMiddleware)("bcp"));
const emit = (req, event, entityType, entityId, data) => (0, resilient_catch_1.swallow)(resilient_catch_1.EC.EVENT_BUS, (0, events_port_1.emitEvent)({ tenantId: req.tenantId, userId: req.user.userId, module: 'bcp', event, entityType, entityId, data }), { tenantId: req.tenantId, operation: 'grcEvent:bcp.any.any' });
router.post("/bia", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.write"), (0, middleware_port_1.validate)({ body: bcp_schemas_1.createBiaBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const bia = await (0, bcm_advanced_service_1.createBIA)(req.tenantId, { ...req.body, assessor_id: req.body.assessor_id || req.user?.userId });
    (0, middleware_port_1.setAuditData)(res, { action: "create", entityType: "bia_assessment", entityId: bia.bia_id, afterState: bia });
    emit(req, "bia_created", "bia_assessment", bia.bia_id, req.body);
    res.status(201).json(bia);
}));
router.get("/bia", (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), async (req, res) => {
    try {
        res.json(await (0, bcm_advanced_service_1.getBIAs)(req.tenantId, req.query.status));
    }
    catch (e) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(e) });
    }
});
router.get("/bia/:biaId", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const bia = await (0, bcm_advanced_service_1.getBIAById)(req.tenantId, req.params.biaId);
    if (!bia) {
        res.status(404).json({ error: "BIA not found" });
        return;
    }
    res.json(bia);
}));
router.post("/bia/:biaId/calculate", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.write"), (0, middleware_port_1.validate)({ body: bcp_schemas_1.createBiabiaIdCalculateBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const result = await (0, bcm_advanced_service_1.calculateBIACriticality)(req.tenantId, req.params.biaId);
    (0, middleware_port_1.setAuditData)(res, { action: "update", entityType: "bia_assessment", entityId: req.params.biaId, afterState: result });
    emit(req, "bia_criticality_calculated", "bia_assessment", req.params.biaId, result);
    res.json(result);
}));
router.post("/exercises", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.write"), (0, middleware_port_1.validate)({ body: bcp_schemas_1.createExercisesBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const ex = await (0, bcm_advanced_service_1.createBCPExercise)(req.tenantId, req.body);
    (0, middleware_port_1.setAuditData)(res, { action: "create", entityType: "bcp_exercise", entityId: ex.exercise_id, afterState: ex });
    emit(req, "exercise_created", "bcp_exercise", ex.exercise_id, req.body);
    res.status(201).json(ex);
}));
router.get("/exercises", (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), async (req, res) => {
    try {
        res.json(await (0, bcm_advanced_service_1.getBCPExercises)(req.tenantId, req.query.status));
    }
    catch (e) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(e) });
    }
});
router.post("/exercises/:exerciseId/results", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.write"), (0, middleware_port_1.validate)({ body: bcp_schemas_1.createExercisesexerciseIdResultsBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const result = await (0, bcm_advanced_service_1.recordExerciseResult)(req.tenantId, req.params.exerciseId, req.body);
    (0, middleware_port_1.setAuditData)(res, { action: "create", entityType: "bcp_exercise_result", entityId: result.result_id, afterState: result });
    emit(req, "exercise_result_recorded", "bcp_exercise", req.params.exerciseId, req.body);
    res.status(201).json(result);
}));
router.get("/exercises/:exerciseId/gaps", (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), async (req, res) => {
    try {
        res.json(await (0, bcm_advanced_service_1.getExerciseGaps)(req.tenantId, req.params.exerciseId));
    }
    catch (e) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(e) });
    }
});
router.post("/crisis-comm", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.write"), (0, middleware_port_1.validate)({ body: bcp_schemas_1.createCrisiscommBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const plan = await (0, bcm_advanced_service_1.createCrisisCommPlan)(req.tenantId, req.body);
    (0, middleware_port_1.setAuditData)(res, { action: "create", entityType: "crisis_comm_plan", entityId: plan.plan_id, afterState: plan });
    emit(req, "crisis_comm_plan_created", "crisis_comm_plan", plan.plan_id, req.body);
    res.status(201).json(plan);
}));
router.get("/crisis-comm", (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), async (req, res) => {
    try {
        res.json(await (0, bcm_advanced_service_1.getCrisisCommPlans)(req.tenantId));
    }
    catch (e) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(e) });
    }
});
router.get("/crisis-comm/:planId/tree", (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), async (req, res) => {
    try {
        res.json(await (0, bcm_advanced_service_1.getNotificationTree)(req.tenantId, req.params.planId));
    }
    catch (e) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(e) });
    }
});
router.post("/crisis-comm/:planId/activate", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.write"), (0, middleware_port_1.validate)({ body: bcp_schemas_1.createCrisiscommplanIdActivateBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const activation = await (0, bcm_advanced_service_1.activateCrisisComm)(req.tenantId, req.params.planId, req.user.userId, req.body.incident_id);
    (0, middleware_port_1.setAuditData)(res, { action: "update", entityType: "crisis_comm_plan", entityId: req.params.planId, afterState: activation });
    emit(req, "crisis_comm_activated", "crisis_comm_plan", activation.activation_id, req.body);
    res.json(activation);
}));
router.post("/recovery-strategies", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.write"), (0, middleware_port_1.validate)({ body: bcp_schemas_1.createRecoverystrategiesBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const s = await (0, bcm_advanced_service_1.createRecoveryStrategy)(req.tenantId, req.body);
    (0, middleware_port_1.setAuditData)(res, { action: "create", entityType: "bcm_recovery_strategy", entityId: s.strategy_id, afterState: s });
    emit(req, "recovery_strategy_created", "bcm_recovery_strategy", s.strategy_id, req.body);
    res.status(201).json(s);
}));
router.get("/recovery-strategies", (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), async (req, res) => {
    try {
        res.json(await (0, bcm_advanced_service_1.getRecoveryStrategies)(req.tenantId, req.query.bia_id));
    }
    catch (e) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(e) });
    }
});
router.post("/recovery-strategies/:strategyId/link-bia", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.write"), (0, middleware_port_1.validate)({ body: bcp_schemas_1.createRecoverystrategiesstrategyIdLinkbiaBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const r = await (0, bcm_advanced_service_1.linkStrategyToBIA)(req.tenantId, req.params.strategyId, req.body.bia_id);
    (0, middleware_port_1.setAuditData)(res, { action: "update", entityType: "bcm_recovery_strategy", entityId: req.params.strategyId, afterState: r });
    res.json(r);
}));
router.post("/activate", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.write"), (0, middleware_port_1.validate)({ body: bcp_schemas_1.createActivateBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const a = await (0, bcm_advanced_service_1.activateBCPlan)(req.tenantId, req.body.plan_id, req.user.userId, req.body.reason, req.body.incident_id);
    (0, middleware_port_1.setAuditData)(res, { action: "create", entityType: "bcp_activation", entityId: a.activation_id, afterState: a });
    emit(req, "plan_activated", "bcp_activation", a.activation_id, req.body);
    res.json(a);
}));
router.get("/activations", (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), async (req, res) => {
    try {
        res.json(await (0, bcm_advanced_service_1.getBCPActivations)(req.tenantId, req.query.status));
    }
    catch (e) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(e) });
    }
});
router.put("/recovery-steps/:stepId", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.write"), (0, middleware_port_1.validate)({ body: bcp_schemas_1.updateRecoverystepsstepIdBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const step = await (0, bcm_advanced_service_1.updateRecoveryStep)(req.tenantId, req.params.stepId, req.body);
    (0, middleware_port_1.setAuditData)(res, { action: "update", entityType: "bcp_recovery_step", entityId: req.params.stepId, afterState: step });
    emit(req, "recovery_step_updated", "bcp_recovery_step", req.params.stepId, req.body);
    res.json(step);
}));
router.post("/deactivate/:activationId", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.write"), (0, middleware_port_1.validate)({ body: bcp_schemas_1.createDeactivateactivationIdBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const r = await (0, bcm_advanced_service_1.deactivateBCPlan)(req.tenantId, req.params.activationId, req.user.userId);
    (0, middleware_port_1.setAuditData)(res, { action: "update", entityType: "bcp_activation", entityId: req.params.activationId, afterState: r });
    emit(req, "plan_deactivated", "bcp_activation", req.params.activationId);
    res.json(r);
}));
router.post("/dependency-maps", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.write"), (0, middleware_port_1.validate)({ body: bcp_schemas_1.createDependencymapsBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const m = await (0, bcm_advanced_service_1.createDependencyMap)(req.tenantId, req.body);
    (0, middleware_port_1.setAuditData)(res, { action: "create", entityType: "bcm_dependency_map", entityId: m.map_id, afterState: m });
    res.status(201).json(m);
}));
router.get("/dependency-maps/:mapId", (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), async (req, res) => {
    try {
        res.json(await (0, bcm_advanced_service_1.getDependencyChain)(req.tenantId, req.params.mapId));
    }
    catch (e) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(e) });
    }
});
router.post("/maturity", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.write"), (0, middleware_port_1.validate)({ body: bcp_schemas_1.createMaturityBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const m = await (0, bcm_advanced_service_1.runBCMMaturityAssessment)(req.tenantId, req.body);
    (0, middleware_port_1.setAuditData)(res, { action: "create", entityType: "bcm_maturity_assessment", entityId: m.assessment_id, afterState: m });
    emit(req, "maturity_assessed", "bcm_maturity_assessment", m.assessment_id, { score: m.overall_score });
    res.status(201).json(m);
}));
router.get("/maturity/history", (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), async (req, res) => {
    try {
        res.json(await (0, bcm_advanced_service_1.getBCMMaturityHistory)(req.tenantId));
    }
    catch (e) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(e) });
    }
});
// ── Leading Capabilities ────────────────────────────────────────────────────
router.get("/spof", (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), async (req, res) => {
    try {
        res.json(await (0, bcm_advanced_service_1.detectSinglePointsOfFailure)(req.tenantId));
    }
    catch (e) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(e) });
    }
});
router.get("/incident-learning/:incidentId", (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), async (req, res) => {
    try {
        res.json(await (0, bcm_advanced_service_1.analyzeIncidentForBCPLearning)(req.tenantId, req.params.incidentId));
    }
    catch (e) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(e) });
    }
});
router.post("/business-change-impact", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.write"), (0, middleware_port_1.validate)({ body: bcp_schemas_1.createBusinesschangeimpactBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const { changeType, entityType, entityId, entityName, details } = req.body;
    if (!changeType || !entityName) {
        res.status(400).json({ error: 'changeType and entityName required' });
        return;
    }
    const impact = await (0, bcm_advanced_service_1.assessBusinessChangeImpact)(req.tenantId, changeType, { entityType, entityId, entityName, details });
    (0, middleware_port_1.setAuditData)(res, { action: "create", entityType: "bcp_change_impact", entityId: entityId || 'system', afterState: impact });
    res.json(impact);
}));
exports.default = router;
let genericPayloadSchema = zod_1.z.record(zod_1.z.unknown());
//# sourceMappingURL=bcm-advanced.routes.js.map