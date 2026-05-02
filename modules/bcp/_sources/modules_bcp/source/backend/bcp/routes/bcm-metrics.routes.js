"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_port_1 = require("../ports/auth.port");
const recovery_metrics_service_1 = require("../services/recovery-metrics.service");
const middleware_port_1 = require("../ports/middleware.port");
const middleware_port_2 = require("../ports/middleware.port");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.moduleStack)('bcp'));
router.use((0, middleware_port_1.auditMiddleware)("bcp"));
router.get("/recovery", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const metrics = await (0, recovery_metrics_service_1.getRecoveryMetrics)(req.tenantId);
    res.json(metrics);
}));
router.get("/rto-rpo-trend", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const months = req.query.months ? Number(req.query.months) : 12;
    const trend = await (0, recovery_metrics_service_1.getRtoRpoTrend)(req.tenantId, months);
    res.json(trend);
}));
router.get("/exercise-effectiveness", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const effectiveness = await (0, recovery_metrics_service_1.getExerciseEffectiveness)(req.tenantId);
    res.json(effectiveness);
}));
router.get("/service-resilience", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const scores = await (0, recovery_metrics_service_1.getServiceResilienceScores)(req.tenantId);
    res.json(scores);
}));
router.get("/benchmarks", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("bcp.plan.read"), (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const benchmarks = await (0, recovery_metrics_service_1.getRecoveryBenchmarks)(req.tenantId);
    res.json(benchmarks);
}));
exports.default = router;
//# sourceMappingURL=bcm-metrics.routes.js.map