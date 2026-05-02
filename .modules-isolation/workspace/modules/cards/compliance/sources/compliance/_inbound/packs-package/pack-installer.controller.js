"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pack_installer_service_1 = require("./pack-installer.service");
const auth_port_1 = require("./ports/auth.port");
const middleware_port_1 = require("./ports/middleware.port");
const platform_port_1 = require("./ports/platform.port");
const router = (0, express_1.Router)();
const service = new pack_installer_service_1.PackInstallerService();
router.use((0, middleware_port_1.moduleStack)('packs'));
router.use((0, middleware_port_1.auditMiddleware)('packs'));
router.post('/install', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('packs.pack.manage'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const userId = req.user?.userId || req.user?.id;
    const result = await service.installPack(String(tenantId), {
        packCode: req.body?.packCode,
        appliesToRole: req.body?.appliesToRole ?? null,
        workspaceId: req.body?.workspaceId ?? null,
        installedBy: String(userId ?? platform_port_1.SYSTEM_JOB_ACTOR),
    });
    res.json(result);
}));
exports.default = router;
//# sourceMappingURL=pack-installer.controller.js.map