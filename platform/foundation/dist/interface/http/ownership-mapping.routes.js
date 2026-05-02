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
exports.ownershipMappingRouter = void 0;
const express_1 = require("express");
const auth_adapter_1 = require("../../infrastructure/auth.adapter");
const middleware_port_1 = require("../../ports/middleware.port");
const svc = __importStar(require("./ownership-mapping.service"));
const foundation_schemas_1 = require("./foundation.schemas");
const user_errors_1 = require("../../contracts/user-errors");
const rate_limiter_1 = require("./middleware/rate-limiter");
const router = (0, express_1.Router)();
exports.ownershipMappingRouter = router;
router.use(auth_adapter_1.authenticate);
router.use(auth_adapter_1.requireTenantId);
router.use((0, middleware_port_1.auditMiddleware)('ownership_mapping'));
router.get('/', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'risk_admin', 'compliance_admin', 'member'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const rows = await svc.listOwnership(req.tenantId, {
        entity_type: req.query.entity_type,
        owner_id: req.query.owner_id,
    });
    res.json({ success: true, data: rows });
}));
router.get('/entity/:entityType/:entityId', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'risk_admin', 'compliance_admin', 'member'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const rows = await svc.getOwnershipForEntity(req.tenantId, req.params.entityType, req.params.entityId);
    res.json({ success: true, data: rows });
}));
router.post('/', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'risk_admin'), (0, middleware_port_1.validate)({ body: foundation_schemas_1.createOwnershipMappingBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.createOwnership(req.tenantId, req.body, req.user.userId);
    (0, middleware_port_1.setAuditData)(res, { entityId: row.mapping_id, entityType: 'ownership_mapping', action: 'assign' });
    res.status(201).json({ success: true, data: row });
}));
router.delete('/:id', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'risk_admin'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const ok = await svc.revokeOwnership(req.tenantId, req.params.id);
    if (!ok)
        throw new user_errors_1.UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'ownership_mapping', id: req.params.id });
    (0, middleware_port_1.setAuditData)(res, { entityId: req.params.id, entityType: 'ownership_mapping', action: 'revoke' });
    res.json({ success: true, message: 'Ownership mapping revoked' });
}));
// ─────────────────────────────────────────────────────────────────────
// FE-facing domain-scoped routes. The shahin product calls
// `/api/ownership-mapping/:domain` where :domain is "organizations",
// "business-units", "departments", etc. These handlers forward to the
// canonical ones above but default the entity_type filter from the
// URL segment so the FE doesn't need to pass it as a query string.
// ─────────────────────────────────────────────────────────────────────
const DOMAIN_ENTITY_TYPE = {
    organizations: 'organization',
    'business-units': 'business_unit',
    departments: 'department',
    positions: 'position',
    locations: 'location',
    teams: 'team',
    committees: 'committee',
    roles: 'role',
    policies: 'policy',
    controls: 'control',
    risks: 'risk',
    assets: 'asset',
};
router.get('/:domain', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'risk_admin', 'compliance_admin', 'member'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const domain = req.params.domain;
    if (domain === 'entity') {
        res.status(400).json({ error: 'Missing entity type + id', code: 'BAD_DOMAIN' });
        return;
    }
    const entityType = DOMAIN_ENTITY_TYPE[domain] ?? domain.replace(/-/g, '_').replace(/s$/, '');
    const rows = await svc.listOwnership(req.tenantId, {
        entity_type: entityType,
        owner_id: req.query.owner_id,
    });
    res.json({ owners: rows, domain, entityType });
}));
router.post('/:domain', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'risk_admin'), (0, middleware_port_1.validate)({ body: foundation_schemas_1.createOwnershipMappingBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const domain = req.params.domain;
    const entityType = DOMAIN_ENTITY_TYPE[domain] ?? domain.replace(/-/g, '_').replace(/s$/, '');
    const body = { ...req.body, entity_type: req.body?.entity_type ?? entityType };
    const row = await svc.createOwnership(req.tenantId, body, req.user.userId);
    (0, middleware_port_1.setAuditData)(res, { entityId: row.mapping_id, entityType: 'ownership_mapping', action: 'assign' });
    res.status(201).json({ success: true, data: row });
}));
// W4.F4.3 — bulk reassign endpoint. FE may target either the canonical
// /api/ownership-mapping/bulk-reassign or domain-scoped /:domain/bulk-reassign.
router.post('/bulk-reassign', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'risk_admin'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const result = await svc.bulkReassignOwnership(req.tenantId, req.body, req.user.userId);
    (0, middleware_port_1.setAuditData)(res, { entityType: 'ownership_mapping', action: 'bulk_reassign', afterState: result });
    res.json({ success: true, data: result });
}));
router.post('/:domain/bulk-reassign', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'risk_admin'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const domain = req.params.domain;
    const entityType = DOMAIN_ENTITY_TYPE[domain] ?? domain.replace(/-/g, '_').replace(/s$/, '');
    const body = { ...req.body, entity_type: req.body?.entity_type ?? entityType };
    const result = await svc.bulkReassignOwnership(req.tenantId, body, req.user.userId);
    (0, middleware_port_1.setAuditData)(res, { entityType: 'ownership_mapping', action: 'bulk_reassign', afterState: { ...result, domain } });
    res.json({ success: true, data: result });
}));
router.delete('/:domain/:ownerId', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'risk_admin'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const ok = await svc.revokeOwnership(req.tenantId, req.params.ownerId);
    if (!ok)
        throw new user_errors_1.UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'ownership_mapping', id: req.params.ownerId });
    (0, middleware_port_1.setAuditData)(res, { entityId: req.params.ownerId, entityType: 'ownership_mapping', action: 'revoke' });
    res.json({ success: true, message: 'Ownership mapping revoked' });
}));
//# sourceMappingURL=ownership-mapping.routes.js.map