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
exports.accessReviewRouter = void 0;
const express_1 = require("express");
const auth_adapter_1 = require("../../infrastructure/auth.adapter");
const dauth_shared_1 = require("@dos/dauth-shared");
const middleware_port_1 = require("../../ports/middleware.port");
const database_port_1 = require("../../ports/database.port");
const svc = __importStar(require("./access-review.service"));
const foundation_schemas_1 = require("./foundation.schemas");
const user_errors_1 = require("../../contracts/user-errors");
const rate_limiter_1 = require("./middleware/rate-limiter");
const router = (0, express_1.Router)();
exports.accessReviewRouter = router;
router.use(auth_adapter_1.authenticate);
router.use(auth_adapter_1.requireTenantId);
router.use((0, middleware_port_1.auditMiddleware)('access_review'));
router.get('/', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'compliance_admin', 'access_review_admin'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const page = parseInt(req.query.page || '1', 10);
    const pageSize = parseInt(req.query.pageSize || '25', 10);
    const result = await svc.listReviews(req.tenantId, {
        page, pageSize, status: req.query.status,
    });
    res.json({ success: true, data: result.data, total: result.total, page, pageSize });
}));
// ─────────────────────────────────────────────────────────────────────
// FE-alias routes — the shahin product calls "/campaigns" for the same
// resource. Must be registered BEFORE `/:id` so Express doesn't match
// the literal "campaigns" as a campaign id. Non-uuid `:id` values would
// reach svc.getReview and crash the Postgres query with 22P02.
// ─────────────────────────────────────────────────────────────────────
router.get('/campaigns', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'compliance_admin', 'access_review_admin'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const page = parseInt(req.query.page || '1', 10);
    const pageSize = parseInt(req.query.pageSize || '25', 10);
    const result = await svc.listReviews(req.tenantId, {
        page, pageSize, status: req.query.status,
    });
    res.json({ campaigns: result.data, total: result.total, page, pageSize });
}));
router.get('/campaigns/:id/items', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'compliance_admin', 'access_review_admin'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    res.json({ items: await svc.listItems(req.tenantId, req.params.id) });
}));
router.get('/campaigns/:id', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'compliance_admin', 'access_review_admin'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.getReview(req.tenantId, req.params.id);
    if (!row)
        throw new user_errors_1.UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'access_review', id: req.params.id });
    res.json({ success: true, data: row });
}));
router.post('/campaigns', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'compliance_admin', 'access_review_admin'), (0, middleware_port_1.validate)({ body: foundation_schemas_1.createAccessReviewBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.createReview(req.tenantId, req.body, req.user.userId);
    (0, middleware_port_1.setAuditData)(res, { entityId: row.review_id, entityType: 'access_review', action: 'create' });
    res.status(201).json({ success: true, data: row });
}));
router.put('/campaigns/:id', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'compliance_admin', 'access_review_admin'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.updateReview(req.tenantId, req.params.id, req.body ?? {});
    if (!row)
        throw new user_errors_1.UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'access_review', id: req.params.id });
    (0, middleware_port_1.setAuditData)(res, { entityId: req.params.id, entityType: 'access_review', action: 'update' });
    res.json({ success: true, data: row });
}));
router.delete('/campaigns/:id', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'compliance_admin', 'access_review_admin'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const ok = await svc.deleteReview(req.tenantId, req.params.id);
    if (!ok)
        throw new user_errors_1.UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'access_review', id: req.params.id });
    (0, middleware_port_1.setAuditData)(res, { entityId: req.params.id, entityType: 'access_review', action: 'delete' });
    res.json({ success: true, message: 'Campaign cancelled' });
}));
router.put('/campaigns/:id/start', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'compliance_admin', 'access_review_admin'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.startReview(req.tenantId, req.params.id);
    if (!row)
        throw new user_errors_1.UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'access_review', id: req.params.id });
    (0, middleware_port_1.setAuditData)(res, { entityId: req.params.id, entityType: 'access_review', action: 'start' });
    res.json({ success: true, data: row });
}));
router.put('/items/:itemId/decision', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'compliance_admin', 'access_review_admin'), (0, middleware_port_1.validate)({ body: foundation_schemas_1.decideAccessReviewItemBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const { rows: found } = await (0, database_port_1.safeQuery)(`SELECT review_id FROM dos.access_review_items WHERE item_id = $1 AND tenant_id = $2 LIMIT 1`, [req.params.itemId, req.tenantId]).catch(() => ({ rows: [] }));
    if (found.length === 0)
        throw new user_errors_1.UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'access_review_item', id: req.params.itemId });
    const row = await svc.decideItem(req.tenantId, found[0].review_id, req.params.itemId, req.body.decision, req.body.comment ?? null, req.user.userId);
    if (!row)
        throw new user_errors_1.UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'access_review_item', id: req.params.itemId });
    (0, middleware_port_1.setAuditData)(res, { entityId: req.params.itemId, entityType: 'access_review_item', action: 'decide', afterState: { decision: req.body.decision } });
    res.json({ success: true, data: row });
}));
router.get('/:id', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'compliance_admin', 'access_review_admin'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.getReview(req.tenantId, req.params.id);
    if (!row)
        throw new user_errors_1.UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'access_review', id: req.params.id });
    res.json({ success: true, data: row });
}));
router.get('/:id/items', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'compliance_admin', 'access_review_admin'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    res.json({ success: true, data: await svc.listItems(req.tenantId, req.params.id) });
}));
router.post('/', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'compliance_admin', 'access_review_admin'), (0, middleware_port_1.validate)({ body: foundation_schemas_1.createAccessReviewBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.createReview(req.tenantId, req.body, req.user.userId);
    (0, middleware_port_1.setAuditData)(res, { entityId: row.review_id, entityType: 'access_review', action: 'create' });
    res.status(201).json({ success: true, data: row });
}));
router.put('/:id/items/:itemId/decide', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'compliance_admin', 'access_review_admin'), (0, middleware_port_1.validate)({ body: foundation_schemas_1.decideAccessReviewItemBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.decideItem(req.tenantId, req.params.id, req.params.itemId, req.body.decision, req.body.comment ?? null, req.user.userId);
    if (!row)
        throw new user_errors_1.UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'access_review_item', id: req.params.itemId });
    (0, middleware_port_1.setAuditData)(res, { entityId: req.params.itemId, entityType: 'access_review_item', action: 'decide', afterState: { decision: req.body.decision } });
    res.json({ success: true, data: row });
}));
router.post('/:id/close', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'compliance_admin', 'access_review_admin'), (0, dauth_shared_1.requireSodClearance)({ moduleCode: 'access-review', action: 'close' }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.closeReview(req.tenantId, req.params.id);
    if (!row)
        throw new user_errors_1.UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'access_review', id: req.params.id });
    (0, middleware_port_1.setAuditData)(res, { entityId: req.params.id, entityType: 'access_review', action: 'close' });
    res.json({ success: true, data: row, message: 'Access review closed' });
}));
//# sourceMappingURL=access-review.routes.js.map