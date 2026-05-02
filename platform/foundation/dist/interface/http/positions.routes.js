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
exports.positionsRouter = void 0;
const express_1 = require("express");
const auth_adapter_1 = require("../../infrastructure/auth.adapter");
const middleware_port_1 = require("../../ports/middleware.port");
const svc = __importStar(require("./positions.service"));
const foundation_schemas_1 = require("./foundation.schemas");
const user_errors_1 = require("../../contracts/user-errors");
const rate_limiter_1 = require("./middleware/rate-limiter");
const csv_util_1 = require("./csv.util");
const router = (0, express_1.Router)();
exports.positionsRouter = router;
router.use(auth_adapter_1.authenticate);
router.use(auth_adapter_1.requireTenantId);
router.use((0, middleware_port_1.auditMiddleware)('position'));
router.get('/', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'hr_admin', 'position_read', 'member'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const page = parseInt(req.query.page || '1', 10);
    const pageSize = parseInt(req.query.pageSize || '25', 10);
    const result = await svc.listPositions(req.tenantId, {
        page, pageSize,
        bu_id: req.query.bu_id,
        search: req.query.search,
    });
    res.json({ success: true, data: result.data, total: result.total, page, pageSize });
}));
// W6.F6.4 — CSV export of filtered positions.
router.get('/export', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'hr_admin', 'position_read'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const result = await svc.listPositions(req.tenantId, {
        page: 1, pageSize: 50000,
        bu_id: req.query.bu_id,
        search: req.query.search,
    });
    (0, csv_util_1.sendCsv)(res, 'positions', ['position_id', 'title', 'title_ar', 'bu_id', 'reports_to', 'status', 'created_at'], result.data);
}));
// W3.F3.3 — reporting tree endpoint expected by FE contract.
// Returns flat list of positions with reports_to, FE composes the tree.
router.get('/reporting-tree', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'hr_admin', 'position_read', 'member'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const tree = await svc.getReportingTree(req.tenantId);
    res.json({ success: true, data: tree });
}));
router.get('/:id', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'hr_admin', 'position_read', 'member'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.getPosition(req.tenantId, req.params.id);
    if (!row)
        throw new user_errors_1.UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'position', id: req.params.id });
    res.json({ success: true, data: row });
}));
router.get('/:id/holders', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'hr_admin', 'position_read'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    res.json({ success: true, data: await svc.getPositionHolders(req.tenantId, req.params.id) });
}));
router.post('/', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'hr_admin'), (0, middleware_port_1.validate)({ body: foundation_schemas_1.createPositionBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.createPosition(req.tenantId, req.body, req.user.userId);
    (0, middleware_port_1.setAuditData)(res, { entityId: row.position_id, entityType: 'position', action: 'create' });
    res.status(201).json({ success: true, data: row });
}));
router.put('/:id', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'hr_admin'), (0, middleware_port_1.validate)({ body: foundation_schemas_1.updatePositionBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.updatePosition(req.tenantId, req.params.id, req.body);
    if (!row)
        throw new user_errors_1.UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'position', id: req.params.id });
    (0, middleware_port_1.setAuditData)(res, { entityId: req.params.id, entityType: 'position', action: 'update' });
    res.json({ success: true, data: row });
}));
router.delete('/:id', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'hr_admin'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const ok = await svc.deletePosition(req.tenantId, req.params.id);
    if (!ok)
        throw new user_errors_1.UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'position', id: req.params.id });
    (0, middleware_port_1.setAuditData)(res, { entityId: req.params.id, entityType: 'position', action: 'delete' });
    res.json({ success: true, message: 'Position deleted' });
}));
//# sourceMappingURL=positions.routes.js.map