"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const http_1 = require("@dos/platform-core/http");
const session_middleware_1 = require("../middleware/session.middleware");
const frontend_access_contract_service_1 = require("../frontend-contracts/frontend-access-contract.service");
const access_snapshot_service_1 = require("../access/access-snapshot.service");
const router = (0, express_1.Router)();
router.get('/full', session_middleware_1.authenticate, (0, http_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const tenantId = req.user.tenantId || req.tenantId;
    if (!tenantId) {
        res.status(400).json({ error: 'Tenant context required', code: 'NO_TENANT' });
        return;
    }
    const contract = await (0, frontend_access_contract_service_1.buildFrontendAccessContract)(userId, tenantId);
    res.json({ data: contract });
}));
router.get('/minimal', session_middleware_1.authenticate, (0, http_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const tenantId = req.user.tenantId || req.tenantId;
    if (!tenantId) {
        res.status(400).json({ error: 'Tenant context required', code: 'NO_TENANT' });
        return;
    }
    const contract = await (0, frontend_access_contract_service_1.getMinimalAccessContract)(userId, tenantId);
    res.json({ data: contract });
}));
router.get('/navigation', session_middleware_1.authenticate, (0, http_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const tenantId = req.user.tenantId || req.tenantId;
    if (!tenantId) {
        res.status(400).json({ error: 'Tenant context required', code: 'NO_TENANT' });
        return;
    }
    const contract = await (0, frontend_access_contract_service_1.getNavigationContract)(userId, tenantId);
    res.json({ data: contract });
}));
// /api/authz/permissions — returns AuthzData flat shape consumed by frontend AuthzClientService
// Expected shape: { accessProfiles, permissions, scopes, functionalRoles }
router.get('/permissions', session_middleware_1.authenticate, (0, http_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const tenantId = req.user.tenantId || req.tenantId;
    if (!tenantId) {
        res.status(400).json({ error: 'Tenant context required', code: 'NO_TENANT' });
        return;
    }
    const snapshot = await (0, access_snapshot_service_1.getAccessSnapshot)(tenantId, userId);
    // Return flat AuthzData shape as expected by frontend AuthzClientService (no { data: } wrapper)
    res.json({
        accessProfiles: snapshot.accessProfiles ?? [],
        permissions: snapshot.effectivePermissions ?? [],
        scopes: snapshot.scopeBindings?.map(s => `${s.scopeType}:${s.scopeId}`) ?? [],
        functionalRoles: snapshot.functionalRoles ?? [],
    });
}));
// /api/authz/contract/permissions — internal: returns PermissionContract in { data: } wrapper
router.get('/contract/permissions', session_middleware_1.authenticate, (0, http_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const tenantId = req.user.tenantId || req.tenantId;
    if (!tenantId) {
        res.status(400).json({ error: 'Tenant context required', code: 'NO_TENANT' });
        return;
    }
    const contract = await (0, frontend_access_contract_service_1.getPermissionContract)(userId, tenantId);
    res.json({ data: contract });
}));
router.get('/version', session_middleware_1.authenticate, (0, http_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const tenantId = req.user.tenantId || req.tenantId;
    if (!tenantId) {
        res.status(400).json({ error: 'Tenant context required', code: 'NO_TENANT' });
        return;
    }
    const version = await (0, frontend_access_contract_service_1.getContractVersion)(userId, tenantId);
    res.json({ data: { version } });
}));
exports.default = router;
//# sourceMappingURL=access-contract.routes.js.map