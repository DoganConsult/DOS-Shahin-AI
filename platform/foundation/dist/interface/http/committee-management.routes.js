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
exports.committeeManagementRouter = void 0;
const express_1 = require("express");
const auth_adapter_1 = require("../../infrastructure/auth.adapter");
const middleware_port_1 = require("../../ports/middleware.port");
const svc = __importStar(require("./committees.service"));
const foundation_schemas_1 = require("./foundation.schemas");
const user_errors_1 = require("../../contracts/user-errors");
const rate_limiter_1 = require("./middleware/rate-limiter");
const csv_util_1 = require("./csv.util");
const router = (0, express_1.Router)();
exports.committeeManagementRouter = router;
router.use(auth_adapter_1.authenticate);
router.use(auth_adapter_1.requireTenantId);
router.use((0, middleware_port_1.auditMiddleware)('committee'));
router.get('/', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'committee_read', 'member'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const rows = await svc.listCommittees(req.tenantId, req.query.status);
    res.json({ success: true, data: rows });
}));
// W6.F6.4 — CSV export of committees list.
router.get('/export', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'committee_read'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const rows = await svc.listCommittees(req.tenantId, req.query.status);
    (0, csv_util_1.sendCsv)(res, 'committees', ['committee_id', 'name', 'name_ar', 'committee_type', 'status', 'chair_user_id', 'created_at'], rows);
}));
router.get('/:id', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'committee_read', 'member'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.getCommittee(req.tenantId, req.params.id);
    if (!row)
        throw new user_errors_1.UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'committee', id: req.params.id });
    res.json({ success: true, data: row });
}));
router.get('/:id/members', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'committee_read', 'member'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    res.json({ success: true, data: await svc.listMembers(req.tenantId, req.params.id) });
}));
router.post('/', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin'), (0, middleware_port_1.validate)({ body: foundation_schemas_1.createCommitteeBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.createCommittee(req.tenantId, req.body, req.user.userId);
    (0, middleware_port_1.setAuditData)(res, { entityId: row.committee_id, entityType: 'committee', action: 'create' });
    res.status(201).json({ success: true, data: row });
}));
router.post('/:id/members', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin'), (0, middleware_port_1.validate)({ body: foundation_schemas_1.addCommitteeMemberBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.addMember(req.tenantId, req.params.id, req.body.user_id, req.body.role_in_committee);
    (0, middleware_port_1.setAuditData)(res, { entityId: row.member_id, entityType: 'committee_member', action: 'add' });
    res.status(201).json({ success: true, data: row });
}));
router.delete('/:id/members/:memberId', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const ok = await svc.removeMember(req.tenantId, req.params.id, req.params.memberId);
    if (!ok)
        throw new user_errors_1.UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'committee_member', id: req.params.memberId });
    (0, middleware_port_1.setAuditData)(res, { entityId: req.params.memberId, entityType: 'committee_member', action: 'remove' });
    res.json({ success: true, message: 'Member removed from committee' });
}));
// W4.F4.1 — update / delete committee + meetings sub-resource.
router.put('/:id', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.updateCommittee(req.tenantId, req.params.id, req.body ?? {});
    if (!row)
        throw new user_errors_1.UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'committee', id: req.params.id });
    (0, middleware_port_1.setAuditData)(res, { entityId: req.params.id, entityType: 'committee', action: 'update' });
    res.json({ success: true, data: row });
}));
router.delete('/:id', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const ok = await svc.deleteCommittee(req.tenantId, req.params.id);
    if (!ok)
        throw new user_errors_1.UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'committee', id: req.params.id });
    (0, middleware_port_1.setAuditData)(res, { entityId: req.params.id, entityType: 'committee', action: 'delete' });
    res.json({ success: true, message: 'Committee deleted' });
}));
router.get('/:id/meetings', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'committee_read', 'member'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    res.json({ success: true, data: await svc.listMeetings(req.tenantId, req.params.id) });
}));
router.post('/:id/meetings', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const body = req.body ?? {};
    if (!body.title || !body.scheduled_at) {
        res.status(400).json({ success: false, error: 'title and scheduled_at required' });
        return;
    }
    const row = await svc.createMeeting(req.tenantId, req.params.id, body, req.user.userId);
    (0, middleware_port_1.setAuditData)(res, { entityId: row.meeting_id, entityType: 'committee_meeting', action: 'create' });
    res.status(201).json({ success: true, data: row });
}));
//# sourceMappingURL=committee-management.routes.js.map