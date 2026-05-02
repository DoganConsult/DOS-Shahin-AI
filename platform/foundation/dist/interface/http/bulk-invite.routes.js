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
exports.bulkInviteRouter = void 0;
const express_1 = require("express");
const auth_adapter_1 = require("../../infrastructure/auth.adapter");
const middleware_port_1 = require("../../ports/middleware.port");
const svc = __importStar(require("./bulk-invite.service"));
const foundation_schemas_1 = require("./foundation.schemas");
const rate_limiter_1 = require("./middleware/rate-limiter");
const router = (0, express_1.Router)();
exports.bulkInviteRouter = router;
router.use(auth_adapter_1.authenticate);
router.use(auth_adapter_1.requireTenantId);
router.use((0, middleware_port_1.auditMiddleware)('bulk_invite'));
router.post('/', rate_limiter_1.bulkRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'hr_admin'), (0, middleware_port_1.validate)({ body: foundation_schemas_1.bulkInviteBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const outcome = await svc.runBulkInvite(req.tenantId, req.body.invites);
    (0, middleware_port_1.setAuditData)(res, {
        entityId: outcome.batch_id,
        entityType: 'bulk_invite',
        action: 'create',
        afterState: { invitedBy: req.user.userId, totalInvites: outcome.total },
    });
    res.status(201).json({ success: true, data: outcome });
}));
//# sourceMappingURL=bulk-invite.routes.js.map