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
exports.userLifecycleRouter = void 0;
const express_1 = require("express");
const auth_adapter_1 = require("../../infrastructure/auth.adapter");
const middleware_port_1 = require("../../ports/middleware.port");
const svc = __importStar(require("./user-lifecycle.service"));
const foundation_schemas_1 = require("./foundation.schemas");
const user_errors_1 = require("../../contracts/user-errors");
const rate_limiter_1 = require("./middleware/rate-limiter");
const router = (0, express_1.Router)();
exports.userLifecycleRouter = router;
router.use(auth_adapter_1.authenticate);
router.use(auth_adapter_1.requireTenantId);
router.use((0, middleware_port_1.auditMiddleware)('user_lifecycle'));
router.post('/:userId/onboard', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'hr_admin'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.onboard(req.tenantId, req.params.userId);
    if (!row)
        throw new user_errors_1.UserServiceError('USER_NOT_FOUND', undefined, { userId: req.params.userId });
    (0, middleware_port_1.setAuditData)(res, { entityId: req.params.userId, entityType: 'user', action: 'onboard' });
    res.json({ success: true, data: row, message: 'User onboarded successfully' });
}));
router.post('/:userId/offboard', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'hr_admin'), (0, middleware_port_1.validate)({ body: foundation_schemas_1.offboardBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.offboard(req.tenantId, req.params.userId);
    if (!row)
        throw new user_errors_1.UserServiceError('USER_NOT_FOUND', undefined, { userId: req.params.userId });
    (0, middleware_port_1.setAuditData)(res, {
        entityId: req.params.userId, entityType: 'user', action: 'offboard',
        afterState: { offboardedBy: req.user.userId, reason: req.body.reason },
    });
    res.json({ success: true, data: row, message: 'User offboarded successfully' });
}));
router.post('/:userId/suspend', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'hr_admin'), (0, middleware_port_1.validate)({ body: foundation_schemas_1.suspendBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.suspend(req.tenantId, req.params.userId);
    if (!row)
        throw new user_errors_1.UserServiceError('USER_NOT_FOUND', undefined, { userId: req.params.userId });
    (0, middleware_port_1.setAuditData)(res, {
        entityId: req.params.userId, entityType: 'user', action: 'suspend',
        afterState: { reason: req.body.reason },
    });
    res.json({ success: true, data: row, message: 'User suspended' });
}));
router.post('/:userId/reactivate', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'hr_admin'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.reactivate(req.tenantId, req.params.userId);
    if (!row)
        throw new user_errors_1.UserServiceError('USER_NOT_FOUND', undefined, { userId: req.params.userId });
    (0, middleware_port_1.setAuditData)(res, { entityId: req.params.userId, entityType: 'user', action: 'reactivate' });
    res.json({ success: true, data: row, message: 'User reactivated' });
}));
//# sourceMappingURL=user-lifecycle.routes.js.map