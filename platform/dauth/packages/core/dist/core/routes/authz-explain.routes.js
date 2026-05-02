"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Authz Explain Routes — returns the current user's effective permissions
 * via DAuth's canonical AccessSnapshot service.
 *
 * Law 2: Permission resolution belongs to DAuth.
 * Law 4: No frontend-invented truth — backend is source of permission truth.
 */
const express_1 = require("express");
const http_1 = require("@dos/platform-core/http");
const __1 = require("..");
const errors_1 = require("@dos/types/errors");
const access_snapshot_service_1 = require("../access/access-snapshot.service");
const router = (0, express_1.Router)();
router.get('/check', __1.authenticate, (0, http_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId || req.user?.tenantId;
    const userId = req.user?.userId || req.user?.id;
    if (!tenantId || !userId) {
        res.status(400).json({ error: 'Missing tenantId or userId in auth context' });
        return;
    }
    try {
        const snapshot = await access_snapshot_service_1.accessSnapshotService.getUserAuthzPayload(tenantId, userId);
        res.json({
            userId,
            tenantId,
            permissions: snapshot?.effectivePermissions ?? [],
            roles: snapshot?.functionalRoles ?? [],
            accessProfiles: snapshot?.accessProfiles ?? [],
            decisionAuthorities: snapshot?.decisionAuthorities ?? [],
            allowedModules: snapshot?.allowedModules ?? [],
        });
    }
    catch (err) {
        res.status(500).json({ error: (0, errors_1.toErrorMessage)(err) });
    }
}));
exports.default = router;
//# sourceMappingURL=authz-explain.routes.js.map