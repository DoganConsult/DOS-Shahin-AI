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
exports.delegationRouter = void 0;
const express_1 = require("express");
const auth_adapter_1 = require("../../infrastructure/auth.adapter");
const middleware_port_1 = require("../../ports/middleware.port");
const svc = __importStar(require("./delegation.service"));
const foundation_schemas_1 = require("./foundation.schemas");
const user_errors_1 = require("../../contracts/user-errors");
const ownership_1 = require("./middleware/ownership");
const rate_limiter_1 = require("./middleware/rate-limiter");
const router = (0, express_1.Router)();
exports.delegationRouter = router;
router.use(auth_adapter_1.authenticate);
router.use(auth_adapter_1.requireTenantId);
router.use((0, middleware_port_1.auditMiddleware)('delegation'));
router.get('/', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'member'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const direction = req.query.direction || 'both';
    const rows = await svc.listDelegations(req.tenantId, {
        actorId: req.user.userId,
        isAdmin: (0, ownership_1.hasAdminRole)(req),
        direction,
    });
    res.json({ success: true, data: rows });
}));
router.get('/:id', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'member'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.getDelegation(req.tenantId, req.params.id);
    if (!row)
        throw new user_errors_1.UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'delegation', id: req.params.id });
    res.json({ success: true, data: row });
}));
router.post('/', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'member'), (0, middleware_port_1.validate)({ body: foundation_schemas_1.createDelegationBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const actorId = req.user.userId;
    const delegator = req.body.delegator_id ?? actorId;
    if (delegator === req.body.delegate_id) {
        res.status(400).json({ error: 'Cannot delegate to yourself', code: 'VALIDATION_FAILED' });
        return;
    }
    const row = await svc.createDelegation(req.tenantId, req.body, actorId);
    (0, middleware_port_1.setAuditData)(res, { entityId: row.delegation_id, entityType: 'delegation', action: 'create' });
    res.status(201).json({ success: true, data: row });
}));
router.delete('/:id', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'member'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const ok = await svc.revokeDelegation(req.tenantId, req.params.id);
    if (!ok)
        throw new user_errors_1.UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'delegation', id: req.params.id });
    (0, middleware_port_1.setAuditData)(res, { entityId: req.params.id, entityType: 'delegation', action: 'revoke' });
    res.json({ success: true, message: 'Delegation revoked' });
}));
// W4.F4.2 — explicit lifecycle endpoints (FE contract: POST /:id/approve|reject|revoke).
router.post('/:id/approve', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.approveDelegation(req.tenantId, req.params.id, req.user.userId);
    if (!row)
        throw new user_errors_1.UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'delegation', id: req.params.id });
    (0, middleware_port_1.setAuditData)(res, { entityId: req.params.id, entityType: 'delegation', action: 'approve' });
    res.json({ success: true, data: row });
}));
router.post('/:id/reject', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const reason = (req.body?.reason ?? '').toString().trim();
    if (!reason) {
        res.status(400).json({ success: false, error: 'reason required' });
        return;
    }
    const row = await svc.rejectDelegation(req.tenantId, req.params.id, req.user.userId, reason);
    if (!row)
        throw new user_errors_1.UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'delegation', id: req.params.id });
    (0, middleware_port_1.setAuditData)(res, { entityId: req.params.id, entityType: 'delegation', action: 'reject' });
    res.json({ success: true, data: row });
}));
router.post('/:id/revoke', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'member'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const ok = await svc.revokeDelegation(req.tenantId, req.params.id);
    if (!ok)
        throw new user_errors_1.UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'delegation', id: req.params.id });
    (0, middleware_port_1.setAuditData)(res, { entityId: req.params.id, entityType: 'delegation', action: 'revoke' });
    res.json({ success: true, message: 'Delegation revoked' });
}));
//# sourceMappingURL=delegation.routes.js.map