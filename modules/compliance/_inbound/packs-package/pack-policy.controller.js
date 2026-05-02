"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pack_policy_service_1 = require("./pack-policy.service");
const auth_port_1 = require("./ports/auth.port");
const middleware_port_1 = require("./ports/middleware.port");
const router = (0, express_1.Router)();
const service = new pack_policy_service_1.PackPolicyService();
router.use((0, middleware_port_1.moduleStack)('packs'));
router.use((0, middleware_port_1.auditMiddleware)('packs'));
router.post('/policies/evaluate', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('packs.policy.manage'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const userId = req.user?.userId || req.user?.id;
    const sessionId = req.body?.sessionId;
    if (!sessionId) {
        res.status(400).json({ message: 'sessionId is required' });
        return;
    }
    const result = await service.evaluate({
        sessionId: String(sessionId),
        tenantId: String(tenantId),
        userId: String(userId),
    });
    res.json(result);
}));
router.get('/policies/decisions/:sessionId', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('packs.policy.read'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const result = await service.listDecisions(String(tenantId), String(req.params.sessionId));
    res.json(result);
}));
exports.default = router;
//# sourceMappingURL=pack-policy.controller.js.map