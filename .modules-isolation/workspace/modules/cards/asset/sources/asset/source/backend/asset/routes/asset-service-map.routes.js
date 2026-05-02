"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_port_1 = require("../ports/auth.port");
const middleware_port_1 = require("../ports/middleware.port");
const service_map_service_1 = require("../services/service-map.service");
const middleware_port_2 = require("../ports/middleware.port");
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.moduleStack)('asset'));
router.use((0, middleware_port_1.auditMiddleware)('asset'));
router.use((0, middleware_port_1.fieldRbacFilter)('asset'));
// Full service map tree
router.get('/', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const map = await (0, service_map_service_1.getFullServiceMap)(req.tenantId);
    res.json({ data: map });
}));
// Stats overview
router.get('/stats', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const stats = await (0, service_map_service_1.getServiceMapStats)(req.tenantId);
    res.json(stats);
}));
// Impact analysis for a service
router.get('/:serviceId/impact', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const impact = await (0, service_map_service_1.getServiceImpact)(req.tenantId, req.params.serviceId);
    if (!impact) {
        res.status(404).json({ error: 'Service not found' });
        return;
    }
    res.json(impact);
}));
exports.default = router;
//# sourceMappingURL=asset-service-map.routes.js.map