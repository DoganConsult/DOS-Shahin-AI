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
exports.authoritySodRouter = void 0;
/**
 * Foundation — Authority + SoD routes (G2).
 * Mounted at /api/foundation/authority and /api/foundation/sod.
 *
 * Authority endpoints:
 *   GET    /authority/kinds                    Catalog of authority kinds
 *   GET    /authority/matrix                   Whole authority matrix (per position)
 *   GET    /authority/positions/:id            Authority limits for a position
 *   POST   /authority/positions/:id            Set/update authority for a position
 *
 * SoD endpoints:
 *   GET    /sod/rules                          Active SoD rules (platform + tenant overrides)
 *   POST   /sod/check                          Pre-flight check before role/action assignment
 *   GET    /sod/violations                     Open violations (with filters)
 *   POST   /sod/violations/:id/resolve         Resolve a violation
 */
const express_1 = require("express");
const zod_1 = require("zod");
const auth_adapter_1 = require("../../infrastructure/auth.adapter");
const middleware_port_1 = require("../../ports/middleware.port");
const svc = __importStar(require("./authority-sod.service"));
const rate_limiter_1 = require("./middleware/rate-limiter");
const setAuthorityBody = zod_1.z.object({
    authority_kind: zod_1.z.string().min(1).max(64),
    monetary_limit: zod_1.z.number().nonnegative().optional().nullable(),
    monetary_unit: zod_1.z.string().max(8).optional().nullable(),
    qualifications: zod_1.z.array(zod_1.z.string().max(64)).max(50).optional(),
    conditions: zod_1.z.record(zod_1.z.unknown()).optional(),
    effective_from: zod_1.z.string().optional().nullable(),
    effective_to: zod_1.z.string().optional().nullable(),
});
const sodCheckBody = zod_1.z.object({
    userId: zod_1.z.string().min(1).max(255),
    proposedRoles: zod_1.z.array(zod_1.z.string().max(64)).max(50).optional(),
    attemptedAction: zod_1.z.object({
        authority_kind: zod_1.z.string().max(64),
        initiator_id: zod_1.z.string().max(255).optional(),
        amount: zod_1.z.number().optional(),
    }).optional(),
    recentDelegations: zod_1.z.array(zod_1.z.object({
        granted_at: zod_1.z.string(),
        authority_kind: zod_1.z.string().max(64),
    })).max(100).optional(),
});
const resolveViolationBody = zod_1.z.object({
    resolution: zod_1.z.enum(['accepted_risk', 'remediated', 'false_positive', 'expired']),
    note: zod_1.z.string().max(2000).optional(),
});
const router = (0, express_1.Router)();
exports.authoritySodRouter = router;
router.use(auth_adapter_1.authenticate, auth_adapter_1.requireTenantId, (0, middleware_port_1.auditMiddleware)('foundation_authority_sod'));
const READ = ['admin', 'foundation_admin', 'hr_manager', 'line_manager', 'auditor', 'foundation.record.read'];
const WRITE = ['admin', 'foundation_admin'];
const SOD_RESOLVE = ['admin', 'foundation_admin', 'auditor'];
// ─── Authority ──────────────────────────────────────────────────────────────
router.get('/authority/kinds', (0, auth_adapter_1.requireAnyPermission)(...READ), (0, middleware_port_1.asyncHandler)(async (_req, res) => {
    const data = await svc.listAuthorityKinds();
    res.json({ success: true, data });
}));
router.get('/authority/matrix', (0, auth_adapter_1.requireAnyPermission)(...READ), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const data = await svc.listAuthorityMatrix(req.tenantId);
    res.json({ success: true, data });
}));
router.get('/authority/positions/:id', (0, auth_adapter_1.requireAnyPermission)(...READ), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const data = await svc.listPositionAuthority(req.tenantId, req.params.id);
    res.json({ success: true, data });
}));
router.post('/authority/positions/:id', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)(...WRITE), (0, middleware_port_1.validate)({ body: setAuthorityBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.setPositionAuthority(req.tenantId, {
        position_id: req.params.id,
        ...req.body,
    }, req.user.userId);
    (0, middleware_port_1.setAuditData)(res, { entityId: req.params.id, entityType: 'position_authority', action: 'set' });
    res.json({ success: true, data: row });
}));
// ─── SoD ────────────────────────────────────────────────────────────────────
router.get('/sod/rules', (0, auth_adapter_1.requireAnyPermission)(...READ), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const data = await svc.listRules(req.tenantId);
    res.json({ success: true, data });
}));
router.post('/sod/check', (0, auth_adapter_1.requireAnyPermission)(...READ), (0, middleware_port_1.validate)({ body: sodCheckBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const result = await svc.check(req.tenantId, req.body);
    res.json({ success: true, data: result });
}));
router.get('/sod/violations', (0, auth_adapter_1.requireAnyPermission)(...READ), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const data = await svc.listViolations(req.tenantId, {
        resolution: req.query.resolution,
        severity: req.query.severity,
        userId: req.query.userId,
    });
    res.json({ success: true, data });
}));
router.post('/sod/violations/:id/resolve', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)(...SOD_RESOLVE), (0, middleware_port_1.validate)({ body: resolveViolationBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.resolveViolation(req.tenantId, req.params.id, req.body.resolution, req.body.note, req.user.userId);
    if (!row) {
        res.status(404).json({ success: false, error: 'not_found_or_already_resolved' });
        return;
    }
    (0, middleware_port_1.setAuditData)(res, { entityId: req.params.id, entityType: 'sod_violation', action: `resolve:${req.body.resolution}` });
    res.json({ success: true, data: row });
}));
//# sourceMappingURL=authority-sod.routes.js.map