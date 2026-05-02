"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_port_1 = require("../ports/auth.port");
const middleware_port_1 = require("../ports/middleware.port");
const asset_reports_service_1 = require("../services/asset-reports.service");
const middleware_port_2 = require("../ports/middleware.port");
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.moduleStack)('asset'));
router.use((0, middleware_port_1.auditMiddleware)('asset'));
router.use((0, middleware_port_1.fieldRbacFilter)('asset'));
router.get('/coverage', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const report = await (0, asset_reports_service_1.getCoverageReport)(req.tenantId);
    res.json({ data: report });
}));
router.get('/aging', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const report = await (0, asset_reports_service_1.getAgingReport)(req.tenantId);
    res.json({ data: report });
}));
router.get('/orphans', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const report = await (0, asset_reports_service_1.getOrphanReport)(req.tenantId);
    res.json(report);
}));
router.get('/classification', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const report = await (0, asset_reports_service_1.getClassificationReport)(req.tenantId);
    res.json({ data: report });
}));
exports.default = router;
//# sourceMappingURL=asset-reports.routes.js.map