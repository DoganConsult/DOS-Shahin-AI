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
exports.managerChainRouter = void 0;
/**
 * GET /api/foundation/manager-chain/:userId
 *
 * Returns the manager chain for a user — the ordered list of positions from
 * the user's own primary position up to the top of the reporting line, with
 * the current active holder of each position attached. Foundation owns this
 * structure; DAuth, OpenFGA, and DOS orchestration consume it via this API.
 *
 * Plan: /root/.claude/plans/need-to-clean-the-swift-trinket.md (Phase B-1)
 */
const express_1 = require("express");
const auth_adapter_1 = require("../../infrastructure/auth.adapter");
const middleware_port_1 = require("../../ports/middleware.port");
const svc = __importStar(require("./org-hierarchy.service"));
const router = (0, express_1.Router)();
exports.managerChainRouter = router;
router.use(auth_adapter_1.authenticate);
router.use(auth_adapter_1.requireTenantId);
router.get('/:userId', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'hr_admin', 'member'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const chain = await svc.getManagerChain(req.tenantId, req.params.userId);
    res.json({ success: true, data: chain });
}));
// Convenience: caller's own chain (no userId argument). Useful for the
// access-snapshot composer and FE consumers that already have a session.
router.get('/', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'hr_admin', 'member'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.userId;
    if (!userId) {
        res.status(400).json({ success: false, error: 'No userId on session' });
        return;
    }
    const chain = await svc.getManagerChain(req.tenantId, userId);
    res.json({ success: true, data: chain });
}));
//# sourceMappingURL=manager-chain.routes.js.map