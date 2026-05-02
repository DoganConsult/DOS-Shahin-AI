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
exports.teamRouter = void 0;
const express_1 = require("express");
const auth_adapter_1 = require("../adapters/auth.adapter");
const http_1 = require("@dos/platform-core/http");
const teamService = __importStar(require("../domain/team.service"));
const raciService = __importStar(require("../domain/raci.service"));
const publisher_1 = require("../events/publisher");
const user_schemas_1 = require("../schemas/user.schemas");
const user_errors_1 = require("../domain/contracts/user-errors");
const rate_limiter_1 = require("../middleware/rate-limiter");
const ownership_1 = require("../middleware/ownership");
exports.teamRouter = (0, express_1.Router)();
exports.teamRouter.use(auth_adapter_1.authenticate);
exports.teamRouter.use(auth_adapter_1.requireTenantId);
exports.teamRouter.use((0, http_1.auditMiddleware)('team'));
exports.teamRouter.get('/', (0, http_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const page = parseInt(req.query.page || '1', 10);
    const pageSize = parseInt(req.query.pageSize || '25', 10);
    const status = req.query.status;
    const result = await teamService.listTeams(tenantId, { page, pageSize, status });
    res.json({ success: true, data: result.data, total: result.total, page, pageSize });
}));
exports.teamRouter.post('/', rate_limiter_1.writeRateLimiter, (0, ownership_1.requireAdmin)(), (0, http_1.validate)({ body: user_schemas_1.createTeamBody }), (0, http_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const actorId = req.user.userId;
    const { name, code, description, department_id } = req.body;
    const team = await teamService.createTeam(tenantId, {
        name, code, description, department_id, createdBy: actorId,
    });
    (0, http_1.setAuditData)(res, { action: 'team.create', entityType: 'team', entityId: team.team_id, afterState: team });
    res.status(201).json({ success: true, data: team });
}));
exports.teamRouter.get('/:id', (0, http_1.asyncHandler)(async (req, res) => {
    const team = await teamService.getTeamById(req.tenantId, req.params.id);
    if (!team)
        throw new user_errors_1.UserServiceError('TEAM_NOT_FOUND', undefined, { teamId: req.params.id });
    res.json({ success: true, data: team });
}));
exports.teamRouter.put('/:id', rate_limiter_1.writeRateLimiter, (0, ownership_1.requireAdmin)(), (0, http_1.validate)({ body: user_schemas_1.updateTeamBody }), (0, http_1.asyncHandler)(async (req, res) => {
    const updated = await teamService.updateTeam(req.tenantId, req.params.id, req.body);
    if (!updated)
        throw new user_errors_1.UserServiceError('TEAM_NOT_FOUND', undefined, { teamId: req.params.id });
    (0, http_1.setAuditData)(res, { action: 'team.update', entityType: 'team', entityId: updated.team_id, afterState: updated });
    res.json({ success: true, data: updated });
}));
exports.teamRouter.delete('/:id', rate_limiter_1.writeRateLimiter, (0, ownership_1.requireAdmin)(), (0, http_1.asyncHandler)(async (req, res) => {
    const deleted = await teamService.deleteTeam(req.tenantId, req.params.id);
    if (!deleted)
        throw new user_errors_1.UserServiceError('TEAM_NOT_FOUND', undefined, { teamId: req.params.id });
    (0, http_1.setAuditData)(res, { action: 'team.delete', entityType: 'team', entityId: req.params.id });
    res.json({ success: true, message: 'Team deleted' });
}));
exports.teamRouter.get('/:id/members', (0, http_1.asyncHandler)(async (req, res) => {
    const members = await teamService.listMembers(req.tenantId, req.params.id);
    res.json({ success: true, data: members });
}));
exports.teamRouter.post('/:id/members', rate_limiter_1.writeRateLimiter, (0, ownership_1.requireAdmin)(), (0, http_1.validate)({ body: user_schemas_1.addTeamMemberBody }), (0, http_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const actorId = req.user.userId;
    const { userId, roleInTeam } = req.body;
    const member = await teamService.addMember(tenantId, req.params.id, userId, roleInTeam || 'member');
    (0, publisher_1.publishTeamMemberAdded)(tenantId, req.params.id, userId, actorId);
    (0, http_1.setAuditData)(res, { action: 'team.member.add', entityType: 'team_member', entityId: `${req.params.id}:${userId}` });
    res.status(201).json({ success: true, data: member });
}));
exports.teamRouter.delete('/:id/members/:userId', rate_limiter_1.writeRateLimiter, (0, ownership_1.requireAdmin)(), (0, http_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const actorId = req.user.userId;
    const removed = await teamService.removeMember(tenantId, req.params.id, req.params.userId);
    if (!removed)
        throw new user_errors_1.UserServiceError('TEAM_MEMBER_NOT_FOUND');
    (0, publisher_1.publishTeamMemberRemoved)(tenantId, req.params.id, req.params.userId, actorId);
    (0, http_1.setAuditData)(res, { action: 'team.member.remove', entityType: 'team_member', entityId: `${req.params.id}:${req.params.userId}` });
    res.json({ success: true, message: 'Member removed' });
}));
exports.teamRouter.get('/raci/by-user/:userId', (0, http_1.asyncHandler)(async (req, res) => {
    const result = await raciService.getRaciByUser(req.tenantId, req.params.userId);
    res.json({ success: true, ...result });
}));
exports.teamRouter.get('/:id/raci', (0, http_1.asyncHandler)(async (req, res) => {
    const assignments = await raciService.getRaciByTeam(req.tenantId, req.params.id);
    res.json({ success: true, data: assignments });
}));
exports.teamRouter.post('/:id/raci', rate_limiter_1.writeRateLimiter, (0, ownership_1.requireAdmin)(), (0, http_1.validate)({ body: user_schemas_1.assignRaciBody }), (0, http_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const actorId = req.user.userId;
    const { userId, scopeType, scopeId, raciRole } = req.body;
    const assignment = await raciService.assignRaci(tenantId, {
        teamId: req.params.id,
        userId,
        scopeType,
        scopeId,
        raciRole,
        assignedBy: actorId,
    });
    (0, http_1.setAuditData)(res, { action: 'raci.assign', entityType: 'raci_assignment', entityId: assignment.id });
    res.status(201).json({ success: true, data: assignment });
}));
exports.teamRouter.delete('/raci/:assignmentId', rate_limiter_1.writeRateLimiter, (0, ownership_1.requireAdmin)(), (0, http_1.asyncHandler)(async (req, res) => {
    const revoked = await raciService.revokeRaci(req.tenantId, req.params.assignmentId);
    if (!revoked)
        throw new user_errors_1.UserServiceError('ROLE_ASSIGNMENT_NOT_FOUND', undefined, { assignmentId: req.params.assignmentId });
    (0, http_1.setAuditData)(res, { action: 'raci.revoke', entityType: 'raci_assignment', entityId: req.params.assignmentId });
    res.json({ success: true, message: 'RACI assignment revoked' });
}));
//# sourceMappingURL=team.routes.js.map