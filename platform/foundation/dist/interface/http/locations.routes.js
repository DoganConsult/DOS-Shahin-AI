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
exports.locationsRouter = void 0;
const express_1 = require("express");
const auth_adapter_1 = require("../../infrastructure/auth.adapter");
const middleware_port_1 = require("../../ports/middleware.port");
const svc = __importStar(require("./locations.service"));
const foundation_schemas_1 = require("./foundation.schemas");
const user_errors_1 = require("../../contracts/user-errors");
const rate_limiter_1 = require("./middleware/rate-limiter");
const csv_util_1 = require("./csv.util");
const router = (0, express_1.Router)();
exports.locationsRouter = router;
router.use(auth_adapter_1.authenticate);
router.use(auth_adapter_1.requireTenantId);
router.use((0, middleware_port_1.auditMiddleware)('location'));
router.get('/', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'location_read', 'member'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const page = parseInt(req.query.page || '1', 10);
    const pageSize = parseInt(req.query.pageSize || '25', 10);
    const result = await svc.listLocations(req.tenantId, {
        page, pageSize,
        location_type: req.query.location_type,
        country: req.query.country,
        parent_id: req.query.parent_id,
        search: req.query.search,
    });
    res.json({ success: true, data: result.data, total: result.total, page, pageSize });
}));
// W6.F6.4 — CSV export of the current filtered location list. Hard cap at 50k rows.
router.get('/export', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'location_read'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const result = await svc.listLocations(req.tenantId, {
        page: 1, pageSize: 50000,
        location_type: req.query.location_type,
        country: req.query.country,
        parent_id: req.query.parent_id,
        search: req.query.search,
    });
    (0, csv_util_1.sendCsv)(res, 'locations', ['location_id', 'name', 'name_ar', 'location_type', 'country', 'city', 'parent_id', 'status', 'created_at'], result.data);
}));
router.get('/:id', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'location_read', 'member'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.getLocation(req.tenantId, req.params.id);
    if (!row)
        throw new user_errors_1.UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'location', id: req.params.id });
    res.json({ success: true, data: row });
}));
router.get('/:id/children', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'location_read', 'member'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    res.json({ success: true, data: await svc.listChildLocations(req.tenantId, req.params.id) });
}));
router.get('/:id/business-units', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'location_read'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    res.json({ success: true, data: await svc.listLocationBUs(req.tenantId, req.params.id) });
}));
router.post('/', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin'), (0, middleware_port_1.validate)({ body: foundation_schemas_1.createLocationBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.createLocation(req.tenantId, req.body, req.user.userId);
    (0, middleware_port_1.setAuditData)(res, { entityId: row.location_id, entityType: 'location', action: 'create' });
    res.status(201).json({ success: true, data: row });
}));
router.put('/:id', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin'), (0, middleware_port_1.validate)({ body: foundation_schemas_1.updateLocationBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.updateLocation(req.tenantId, req.params.id, req.body);
    if (!row)
        throw new user_errors_1.UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'location', id: req.params.id });
    (0, middleware_port_1.setAuditData)(res, { entityId: req.params.id, entityType: 'location', action: 'update' });
    res.json({ success: true, data: row });
}));
router.delete('/:id', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const ok = await svc.deleteLocation(req.tenantId, req.params.id);
    if (!ok)
        throw new user_errors_1.UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'location', id: req.params.id });
    (0, middleware_port_1.setAuditData)(res, { entityId: req.params.id, entityType: 'location', action: 'delete' });
    res.json({ success: true, message: 'Location deleted' });
}));
router.post('/:id/business-units', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin'), (0, middleware_port_1.validate)({ body: foundation_schemas_1.assignLocationBuBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    await svc.assignBuToLocation(req.tenantId, req.params.id, req.body.bu_id);
    (0, middleware_port_1.setAuditData)(res, { entityId: `${req.params.id}:${req.body.bu_id}`, entityType: 'location_bu', action: 'assign' });
    res.status(201).json({ success: true, message: 'Business unit assigned to location' });
}));
router.delete('/:id/business-units/:buId', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    await svc.removeBuFromLocation(req.tenantId, req.params.id, req.params.buId);
    (0, middleware_port_1.setAuditData)(res, { entityId: `${req.params.id}:${req.params.buId}`, entityType: 'location_bu', action: 'remove' });
    res.json({ success: true, message: 'Business unit removed from location' });
}));
//# sourceMappingURL=locations.routes.js.map