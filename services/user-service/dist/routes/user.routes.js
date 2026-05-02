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
exports.userRouter = void 0;
const express_1 = require("express");
const auth_adapter_1 = require("../adapters/auth.adapter");
const http_1 = require("@dos/platform-core/http");
const userService = __importStar(require("../domain/user.service"));
const roleAssignmentService = __importStar(require("../domain/role-assignment.service"));
const user_publishers_1 = require("../events/user.publishers");
const user_schemas_1 = require("../schemas/user.schemas");
const user_errors_1 = require("../domain/contracts/user-errors");
const rate_limiter_1 = require("../middleware/rate-limiter");
const ownership_1 = require("../middleware/ownership");
exports.userRouter = (0, express_1.Router)();
exports.userRouter.use(auth_adapter_1.authenticate);
exports.userRouter.use(auth_adapter_1.requireTenantId);
exports.userRouter.use((0, http_1.auditMiddleware)('user'));
exports.userRouter.get('/', (0, http_1.validate)({ query: user_schemas_1.listQuerySchema }), (0, http_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const page = parseInt(req.query.page || '1', 10);
    const pageSize = parseInt(req.query.pageSize || '25', 10);
    const status = req.query.status;
    const role = req.query.role;
    const result = await userService.listUsers(tenantId, { page, pageSize, status, role });
    res.json({ success: true, data: result.data, total: result.total, page, pageSize });
}));
exports.userRouter.post('/', rate_limiter_1.writeRateLimiter, (0, ownership_1.requireAdmin)(), (0, http_1.validate)({ body: user_schemas_1.createUserBody }), (0, http_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const { email, name, display_name, role, department_id } = req.body;
    const user = await userService.createUser(tenantId, {
        email,
        name: name || display_name,
        role,
        department_id,
    });
    (0, user_publishers_1.publishUserCreated)(tenantId, user.user_id, { email: user.email });
    (0, http_1.setAuditData)(res, { action: 'user.create', entityType: 'user', entityId: user.user_id });
    res.status(201).json({ success: true, data: user });
}));
// W6.F6.4 — CSV export of users for the current filtered list.
exports.userRouter.get('/export', (0, http_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const status = req.query.status;
    const role = req.query.role;
    const result = await userService.listUsers(tenantId, { page: 1, pageSize: 50000, status, role });
    const escape = (v) => {
        if (v === null || v === undefined)
            return '';
        const s = typeof v === 'string' ? v : (typeof v === 'object' ? JSON.stringify(v) : String(v));
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const cols = ['user_id', 'email', 'name', 'display_name', 'status', 'department_id', 'created_at'];
    const header = cols.join(',') + '\n';
    const body = result.data.map(r => cols.map(c => escape(r[c])).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="users-${Date.now()}.csv"`);
    res.send(header + body + '\n');
}));
exports.userRouter.get('/me', (0, http_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const userId = req.user.userId;
    const user = await userService.getUserById(tenantId, userId);
    if (!user)
        throw new user_errors_1.UserServiceError('USER_NOT_FOUND');
    res.json({ success: true, data: user });
}));
exports.userRouter.get('/:id', (0, http_1.asyncHandler)(async (req, res) => {
    const user = await userService.getUserById(req.tenantId, req.params.id);
    if (!user)
        throw new user_errors_1.UserServiceError('USER_NOT_FOUND', undefined, { userId: req.params.id });
    res.json({ success: true, data: user });
}));
exports.userRouter.put('/:id', rate_limiter_1.writeRateLimiter, (0, ownership_1.requireSelfOrAdmin)('id'), (0, http_1.validate)({ body: user_schemas_1.updateUserBody }), (0, http_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const actorId = req.user.userId;
    const { name, display_name, status, role, department_id } = req.body;
    const updated = await userService.updateUser(tenantId, req.params.id, {
        name: name || display_name,
        status,
        role,
        department_id,
    });
    if (!updated)
        throw new user_errors_1.UserServiceError('USER_NOT_FOUND', undefined, { userId: req.params.id });
    (0, user_publishers_1.publishUserUpdated)(tenantId, updated.user_id, { updatedBy: actorId, changes: req.body });
    (0, http_1.setAuditData)(res, { action: 'user.update', entityType: 'user', entityId: updated.user_id });
    res.json({ success: true, data: updated });
}));
exports.userRouter.delete('/:id', rate_limiter_1.writeRateLimiter, (0, ownership_1.requireAdmin)(), (0, http_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const actorId = req.user.userId;
    const deactivated = await userService.deactivateUser(tenantId, req.params.id);
    if (!deactivated)
        throw new user_errors_1.UserServiceError('USER_NOT_FOUND', undefined, { userId: req.params.id });
    (0, user_publishers_1.publishUserDeactivated)(tenantId, deactivated.user_id, { deactivatedBy: actorId });
    (0, http_1.setAuditData)(res, { action: 'user.deactivate', entityType: 'user', entityId: deactivated.user_id });
    res.json({ success: true, data: deactivated });
}));
exports.userRouter.get('/:id/roles', (0, http_1.asyncHandler)(async (req, res) => {
    const assignments = await roleAssignmentService.listRoleAssignments(req.tenantId, req.params.id);
    res.json({ success: true, data: assignments });
}));
exports.userRouter.get('/:id/teams', (0, http_1.asyncHandler)(async (req, res) => {
    const teams = await userService.listUserTeams(req.tenantId, req.params.id);
    res.json({ teams });
}));
exports.userRouter.get('/:id/tasks', (0, http_1.asyncHandler)(async (req, res) => {
    const tasks = await userService.listUserTasks(req.tenantId, req.params.id);
    res.json({ tasks });
}));
exports.userRouter.post('/:id/roles', rate_limiter_1.writeRateLimiter, (0, ownership_1.requireAdmin)(), (0, http_1.validate)({ body: user_schemas_1.assignFunctionalRoleBody }), (0, http_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const actorId = req.user.userId;
    const { functionalRoleCode } = req.body;
    const assignment = await roleAssignmentService.assignRole(tenantId, req.params.id, functionalRoleCode, actorId);
    (0, http_1.setAuditData)(res, { action: 'role.assign', entityType: 'role_assignment', entityId: assignment.assignment_id });
    res.status(201).json({ success: true, data: assignment });
}));
exports.userRouter.delete('/:id/roles/:roleId', rate_limiter_1.writeRateLimiter, (0, ownership_1.requireAdmin)(), (0, http_1.asyncHandler)(async (req, res) => {
    const revoked = await roleAssignmentService.revokeRoleAssignment(req.tenantId, req.params.id, req.params.roleId);
    if (!revoked)
        throw new user_errors_1.UserServiceError('ROLE_ASSIGNMENT_NOT_FOUND');
    (0, http_1.setAuditData)(res, { action: 'role.revoke', entityType: 'role_assignment', entityId: req.params.roleId });
    res.json({ success: true, message: 'Role revoked' });
}));
// W1.F1.5 — Bulk actions: assign-role, deactivate, assign-department.
// Each operation is per-user transactional (idempotent on the tenant scope)
// and returns per-user success/failure so the FE can render partial-success
// progress without forcing a single-failure-fails-all transaction.
function asUserIdList(body) {
    const raw = (body?.userIds ?? body?.user_ids ?? body?.ids ?? []);
    return Array.isArray(raw) ? raw.map((x) => String(x)).filter((x) => !!x.trim()) : [];
}
exports.userRouter.post('/bulk/assign-role', rate_limiter_1.writeRateLimiter, (0, ownership_1.requireAdmin)(), (0, http_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const actorId = req.user.userId;
    const userIds = asUserIdList(req.body);
    const roleCode = String(req.body?.functionalRoleCode ?? req.body?.roleCode ?? req.body?.role ?? '').trim();
    if (!userIds.length || !roleCode) {
        res.status(400).json({ success: false, error: 'userIds and functionalRoleCode required' });
        return;
    }
    const results = [];
    for (const userId of userIds) {
        try {
            await roleAssignmentService.assignRole(tenantId, userId, roleCode, actorId);
            results.push({ userId, ok: true });
        }
        catch (e) {
            results.push({ userId, ok: false, error: e?.message ?? String(e) });
        }
    }
    (0, http_1.setAuditData)(res, { action: 'user.bulk.assign_role', entityType: 'user', entityId: roleCode });
    res.json({ success: true, data: { results, total: results.length, succeeded: results.filter((r) => r.ok).length } });
}));
exports.userRouter.post('/bulk/deactivate', rate_limiter_1.writeRateLimiter, (0, ownership_1.requireAdmin)(), (0, http_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const actorId = req.user.userId;
    const userIds = asUserIdList(req.body);
    if (!userIds.length) {
        res.status(400).json({ success: false, error: 'userIds required' });
        return;
    }
    const results = [];
    for (const userId of userIds) {
        try {
            const u = await userService.deactivateUser(tenantId, userId);
            if (u) {
                (0, user_publishers_1.publishUserDeactivated)(tenantId, u.user_id, { deactivatedBy: actorId });
                results.push({ userId, ok: true });
            }
            else {
                results.push({ userId, ok: false, error: 'USER_NOT_FOUND' });
            }
        }
        catch (e) {
            results.push({ userId, ok: false, error: e?.message ?? String(e) });
        }
    }
    (0, http_1.setAuditData)(res, { action: 'user.bulk.deactivate', entityType: 'user', entityId: 'bulk' });
    res.json({ success: true, data: { results, total: results.length, succeeded: results.filter((r) => r.ok).length } });
}));
exports.userRouter.post('/bulk/assign-department', rate_limiter_1.writeRateLimiter, (0, ownership_1.requireAdmin)(), (0, http_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const actorId = req.user.userId;
    const userIds = asUserIdList(req.body);
    const departmentId = String(req.body?.department_id ?? req.body?.departmentId ?? '').trim();
    if (!userIds.length || !departmentId) {
        res.status(400).json({ success: false, error: 'userIds and department_id required' });
        return;
    }
    const results = [];
    for (const userId of userIds) {
        try {
            const u = await userService.updateUser(tenantId, userId, { department_id: departmentId });
            if (u) {
                (0, user_publishers_1.publishUserUpdated)(tenantId, u.user_id, { updatedBy: actorId, changes: { department_id: departmentId } });
                results.push({ userId, ok: true });
            }
            else {
                results.push({ userId, ok: false, error: 'USER_NOT_FOUND' });
            }
        }
        catch (e) {
            results.push({ userId, ok: false, error: e?.message ?? String(e) });
        }
    }
    (0, http_1.setAuditData)(res, { action: 'user.bulk.assign_department', entityType: 'user', entityId: departmentId });
    res.json({ success: true, data: { results, total: results.length, succeeded: results.filter((r) => r.ok).length } });
}));
//# sourceMappingURL=user.routes.js.map