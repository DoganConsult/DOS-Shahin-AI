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
exports.teamsRouter = void 0;
const express_1 = require("express");
const auth_adapter_1 = require("../../infrastructure/auth.adapter");
const middleware_port_1 = require("../../ports/middleware.port");
const rate_limiter_1 = require("./middleware/rate-limiter");
const ownership_1 = require("./middleware/ownership");
const user_errors_1 = require("../../contracts/user-errors");
const svc = __importStar(require("./teams.service"));
const zod_1 = require("zod");
const listTeamsQuery = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(200).default(25),
    status: zod_1.z.string().max(50).optional(),
});
const createTeamBody = zod_1.z.object({
    name_en: zod_1.z.string().min(1).max(255),
    code: zod_1.z.string().max(100).optional().nullable(),
    description: zod_1.z.string().max(2000).optional().nullable(),
    department_id: zod_1.z.string().uuid().optional().nullable(),
    bu_id: zod_1.z.string().uuid().optional().nullable(),
    owner_user_id: zod_1.z.string().max(64).optional().nullable(),
});
const updateTeamBody = zod_1.z.object({
    name_en: zod_1.z.string().min(1).max(255).optional(),
    code: zod_1.z.string().max(100).optional().nullable(),
    description: zod_1.z.string().max(2000).optional().nullable(),
    department_id: zod_1.z.string().uuid().optional().nullable(),
    bu_id: zod_1.z.string().uuid().optional().nullable(),
    status: zod_1.z.string().max(50).optional(),
    owner_user_id: zod_1.z.string().max(64).optional().nullable(),
});
const addMemberBody = zod_1.z.object({
    userId: zod_1.z.string().max(64),
    roleInTeam: zod_1.z.string().min(1).max(100).optional(),
});
const router = (0, express_1.Router)();
exports.teamsRouter = router;
router.use(auth_adapter_1.authenticate);
router.use(auth_adapter_1.requireTenantId);
router.use((0, middleware_port_1.auditMiddleware)('team'));
router.get('/', (0, middleware_port_1.validate)({ query: listTeamsQuery }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const page = parseInt(req.query.page || '1', 10);
    const pageSize = parseInt(req.query.pageSize || '25', 10);
    const status = req.query.status;
    const result = await svc.listTeams(req.tenantId, { page, pageSize, status });
    res.json({ success: true, data: result.data, total: result.total, page, pageSize });
}));
router.post('/', rate_limiter_1.writeRateLimiter, (0, ownership_1.requireAdmin)(), (0, middleware_port_1.validate)({ body: createTeamBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.createTeam(req.tenantId, req.body);
    (0, middleware_port_1.setAuditData)(res, { action: 'team.create', entityType: 'team', entityId: row.team_id, afterState: row });
    res.status(201).json({ success: true, data: row });
}));
router.get('/:id', (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.getTeamById(req.tenantId, req.params.id);
    if (!row)
        throw new user_errors_1.UserServiceError('TEAM_NOT_FOUND', undefined, { teamId: req.params.id });
    res.json({ success: true, data: row });
}));
router.put('/:id', rate_limiter_1.writeRateLimiter, (0, ownership_1.requireAdmin)(), (0, middleware_port_1.validate)({ body: updateTeamBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.updateTeam(req.tenantId, req.params.id, req.body);
    if (!row)
        throw new user_errors_1.UserServiceError('TEAM_NOT_FOUND', undefined, { teamId: req.params.id });
    (0, middleware_port_1.setAuditData)(res, { action: 'team.update', entityType: 'team', entityId: row.team_id, afterState: row });
    res.json({ success: true, data: row });
}));
router.delete('/:id', rate_limiter_1.writeRateLimiter, (0, ownership_1.requireAdmin)(), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const ok = await svc.deleteTeam(req.tenantId, req.params.id);
    if (!ok)
        throw new user_errors_1.UserServiceError('TEAM_NOT_FOUND', undefined, { teamId: req.params.id });
    (0, middleware_port_1.setAuditData)(res, { action: 'team.delete', entityType: 'team', entityId: req.params.id });
    res.json({ success: true, message: 'Team deleted' });
}));
router.get('/:id/members', (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const members = await svc.listMembers(req.tenantId, req.params.id);
    res.json({ success: true, data: members });
}));
router.post('/:id/members', rate_limiter_1.writeRateLimiter, (0, ownership_1.requireAdmin)(), (0, middleware_port_1.validate)({ body: addMemberBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const member = await svc.addMember(req.tenantId, req.params.id, req.body.userId, req.body.roleInTeam || 'member');
    (0, middleware_port_1.setAuditData)(res, {
        action: 'team.member.add',
        entityType: 'team_member',
        entityId: `${req.params.id}:${req.body.userId}`,
        afterState: member,
    });
    res.status(201).json({ success: true, data: member });
}));
router.delete('/:id/members/:userId', rate_limiter_1.writeRateLimiter, (0, ownership_1.requireAdmin)(), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const ok = await svc.removeMember(req.tenantId, req.params.id, req.params.userId);
    if (!ok)
        throw new user_errors_1.UserServiceError('TEAM_MEMBER_NOT_FOUND', undefined, { teamId: req.params.id, userId: req.params.userId });
    (0, middleware_port_1.setAuditData)(res, {
        action: 'team.member.remove',
        entityType: 'team_member',
        entityId: `${req.params.id}:${req.params.userId}`,
    });
    res.json({ success: true, message: 'Member removed' });
}));
//# sourceMappingURL=teams.routes.js.map