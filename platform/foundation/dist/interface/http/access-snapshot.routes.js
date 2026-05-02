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
exports.accessSnapshotRouter = void 0;
/**
 * GET /api/foundation/access-snapshot
 * GET /api/foundation/access-snapshot/:userId  (admin-only override)
 *
 * Returns the unified access snapshot composed from Foundation
 * (org-scope, manager chain, current position, inheritance) and DAuth
 * (recent denials, pending approvals via authz_decision_log). FE consumers
 * read this once per session and on token refresh; the single guard
 * `accessSnapshotGuard` (Phase D) reads from this response.
 *
 * Plan: /root/.claude/plans/need-to-clean-the-swift-trinket.md (Phase B-1)
 */
const express_1 = require("express");
const auth_adapter_1 = require("../../infrastructure/auth.adapter");
const middleware_port_1 = require("../../ports/middleware.port");
const svc = __importStar(require("./access-snapshot.service"));
const router = (0, express_1.Router)();
exports.accessSnapshotRouter = router;
router.use(auth_adapter_1.authenticate);
router.use(auth_adapter_1.requireTenantId);
router.get('/', (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.userId;
    if (!userId) {
        res.status(400).json({ success: false, error: 'No userId on session' });
        return;
    }
    const correlationId = req.headers['x-correlation-id'] ??
        req.headers['x-request-id'];
    const snapshot = await svc.getAccessSnapshot(req.tenantId, userId, correlationId);
    // Cache hint: snapshots are recomputed at refresh time. FE consumers
    // should treat them as session-bound and revalidate on token refresh.
    res.set('Cache-Control', 'private, max-age=30');
    res.json({ success: true, data: snapshot });
}));
router.get('/:userId', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'hr_admin'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const correlationId = req.headers['x-correlation-id'] ??
        req.headers['x-request-id'];
    const snapshot = await svc.getAccessSnapshot(req.tenantId, req.params.userId, correlationId);
    res.json({ success: true, data: snapshot });
}));
//# sourceMappingURL=access-snapshot.routes.js.map