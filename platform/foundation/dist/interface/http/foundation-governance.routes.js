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
exports.foundationGovernanceRouter = void 0;
const express_1 = require("express");
const auth_adapter_1 = require("../../infrastructure/auth.adapter");
const middleware_port_1 = require("../../ports/middleware.port");
const svc = __importStar(require("./governance-policies.service"));
const foundation_schemas_1 = require("./foundation.schemas");
const user_errors_1 = require("../../contracts/user-errors");
const rate_limiter_1 = require("./middleware/rate-limiter");
const router = (0, express_1.Router)();
exports.foundationGovernanceRouter = router;
router.use(auth_adapter_1.authenticate);
router.use(auth_adapter_1.requireTenantId);
router.use((0, middleware_port_1.auditMiddleware)('governance'));
router.get('/policies', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'compliance_admin', 'governance_read', 'member'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const page = parseInt(req.query.page || '1', 10);
    const pageSize = parseInt(req.query.pageSize || '25', 10);
    const result = await svc.listPolicies(req.tenantId, {
        page, pageSize, category: req.query.category,
    });
    res.json({ success: true, data: result.data, total: result.total, page, pageSize });
}));
router.get('/policies/:id', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'compliance_admin', 'governance_read', 'member'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.getPolicy(req.tenantId, req.params.id);
    if (!row)
        throw new user_errors_1.UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'governance_policy', id: req.params.id });
    res.json({ success: true, data: row });
}));
router.post('/policies', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'compliance_admin'), (0, middleware_port_1.validate)({ body: foundation_schemas_1.createPolicyBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.createPolicy(req.tenantId, req.body, req.user.userId);
    (0, middleware_port_1.setAuditData)(res, { entityId: row.policy_id, entityType: 'governance_policy', action: 'create' });
    res.status(201).json({ success: true, data: row });
}));
router.put('/policies/:id', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'compliance_admin'), (0, middleware_port_1.validate)({ body: foundation_schemas_1.updatePolicyBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.updatePolicy(req.tenantId, req.params.id, req.body);
    if (!row)
        throw new user_errors_1.UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'governance_policy', id: req.params.id });
    (0, middleware_port_1.setAuditData)(res, { entityId: req.params.id, entityType: 'governance_policy', action: 'update' });
    res.json({ success: true, data: row });
}));
// W4.F4.5 — explicit approve lifecycle (FE contract: POST /policies/:id/approve).
router.post('/policies/:id/approve', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'compliance_admin'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.approvePolicy(req.tenantId, req.params.id, req.user.userId);
    if (!row)
        throw new user_errors_1.UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'governance_policy', id: req.params.id });
    (0, middleware_port_1.setAuditData)(res, { entityId: req.params.id, entityType: 'governance_policy', action: 'approve' });
    res.json({ success: true, data: row });
}));
router.delete('/policies/:id', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'compliance_admin'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const ok = await svc.deletePolicy(req.tenantId, req.params.id);
    if (!ok)
        throw new user_errors_1.UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'governance_policy', id: req.params.id });
    (0, middleware_port_1.setAuditData)(res, { entityId: req.params.id, entityType: 'governance_policy', action: 'delete' });
    res.json({ success: true, message: 'Governance policy deleted' });
}));
// ── PDPL consent grant — records into public.privacy_consent_log when present;
// always emits an audit row so the FE consent button is non-fake.
router.post('/pdpl/consent', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'compliance_admin', 'privacy_admin', 'member'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const consentType = String((req.body?.consent_type ?? '') || '').trim();
    const granted = req.body?.granted !== false;
    if (!consentType) {
        res.status(400).json({ success: false, error: 'consent_type required' });
        return;
    }
    const userId = String(req.user?.userId ??
        req.user?.sub ??
        req.user?.id ??
        req.headers['x-user-sub'] ??
        '').trim();
    if (!userId) {
        res.status(401).json({ success: false, error: 'AUTH_REQUIRED' });
        return;
    }
    const row = await svc.recordPdplConsent(req.tenantId, userId, consentType, granted);
    (0, middleware_port_1.setAuditData)(res, { entityId: row?.id ?? `${userId}:${consentType}`, entityType: 'pdpl_consent', action: granted ? 'grant' : 'revoke' });
    res.status(201).json({ success: true, data: row });
}));
router.get('/dashboard', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'compliance_admin', 'governance_read'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    res.json({ success: true, data: await svc.getDashboard(req.tenantId) });
}));
//# sourceMappingURL=foundation-governance.routes.js.map