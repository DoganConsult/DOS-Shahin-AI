import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import { asyncHandler, validate, auditMiddleware, setAuditData } from '@dos/platform-core/http';
import * as userService from '../domain/user.service';
import * as roleAssignmentService from '../domain/role-assignment.service';
import { publishUserCreated, publishUserUpdated, publishUserDeactivated } from '../events/user.publishers';
import {
  createUserBody,
  updateUserBody,
  listQuerySchema,
  assignFunctionalRoleBody,
} from '../schemas/user.schemas';
import { UserServiceError } from '../domain/contracts/user-errors';
import { writeRateLimiter } from '../middleware/rate-limiter';
import { requireAdmin, requireSelfOrAdmin } from '../middleware/ownership';

export const userRouter = Router();

userRouter.use(authenticate);
userRouter.use(requireTenantId);
userRouter.use(auditMiddleware('user'));

userRouter.get(
  '/',
  validate({ query: listQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const page = parseInt((req.query.page as string) || '1', 10);
    const pageSize = parseInt((req.query.pageSize as string) || '25', 10);
    const status = req.query.status as string | undefined;
    const role = req.query.role as string | undefined;
    const result = await userService.listUsers(tenantId, { page, pageSize, status, role });
    res.json({ success: true, data: result.data, total: result.total, page, pageSize });
  }),
);

userRouter.post(
  '/',
  writeRateLimiter,
  requireAdmin(),
  validate({ body: createUserBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { email, name, display_name, role, department_id } = req.body;
    const user = await userService.createUser(tenantId, {
      email,
      name: name || display_name,
      role,
      department_id,
    });
    publishUserCreated(tenantId, user.user_id, { email: user.email });
    setAuditData(res, { action: 'user.create', entityType: 'user', entityId: user.user_id });
    res.status(201).json({ success: true, data: user });
  }),
);

// W6.F6.4 — CSV export of users for the current filtered list.
userRouter.get('/export', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const status = req.query.status as string | undefined;
  const role = req.query.role as string | undefined;
  const result = await userService.listUsers(tenantId, { page: 1, pageSize: 50000, status, role });
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'string' ? v : (typeof v === 'object' ? JSON.stringify(v) : String(v));
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const cols = ['user_id', 'email', 'name', 'display_name', 'status', 'department_id', 'created_at'];
  const header = cols.join(',') + '\n';
  const body = (result.data as any[]).map(r => cols.map(c => escape(r[c])).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="users-${Date.now()}.csv"`);
  res.send(header + body + '\n');
}));

userRouter.get('/me', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId;
  const user = await userService.getUserById(tenantId, userId);
  if (!user) throw new UserServiceError('USER_NOT_FOUND');
  res.json({ success: true, data: user });
}));

userRouter.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getUserById(req.tenantId!, req.params.id);
  if (!user) throw new UserServiceError('USER_NOT_FOUND', undefined, { userId: req.params.id });
  res.json({ success: true, data: user });
}));

userRouter.put(
  '/:id',
  writeRateLimiter,
  requireSelfOrAdmin('id'),
  validate({ body: updateUserBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const { name, display_name, status, role, department_id } = req.body;
    const updated = await userService.updateUser(tenantId, req.params.id, {
      name: name || display_name,
      status,
      role,
      department_id,
    });
    if (!updated) throw new UserServiceError('USER_NOT_FOUND', undefined, { userId: req.params.id });
    publishUserUpdated(tenantId, updated.user_id, { updatedBy: actorId, changes: req.body });
    setAuditData(res, { action: 'user.update', entityType: 'user', entityId: updated.user_id });
    res.json({ success: true, data: updated });
  }),
);

userRouter.delete(
  '/:id',
  writeRateLimiter,
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const deactivated = await userService.deactivateUser(tenantId, req.params.id);
    if (!deactivated) throw new UserServiceError('USER_NOT_FOUND', undefined, { userId: req.params.id });
    publishUserDeactivated(tenantId, deactivated.user_id, { deactivatedBy: actorId });
    setAuditData(res, { action: 'user.deactivate', entityType: 'user', entityId: deactivated.user_id });
    res.json({ success: true, data: deactivated });
  }),
);

userRouter.get('/:id/roles', asyncHandler(async (req: Request, res: Response) => {
  const assignments = await roleAssignmentService.listRoleAssignments(req.tenantId!, req.params.id);
  res.json({ success: true, data: assignments });
}));

userRouter.get('/:id/teams', asyncHandler(async (req: Request, res: Response) => {
  const teams = await userService.listUserTeams(req.tenantId!, req.params.id);
  res.json({ teams });
}));

userRouter.get('/:id/tasks', asyncHandler(async (req: Request, res: Response) => {
  const tasks = await userService.listUserTasks(req.tenantId!, req.params.id);
  res.json({ tasks });
}));

userRouter.post(
  '/:id/roles',
  writeRateLimiter,
  requireAdmin(),
  validate({ body: assignFunctionalRoleBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const { functionalRoleCode } = req.body;
    const assignment = await roleAssignmentService.assignRole(tenantId, req.params.id, functionalRoleCode, actorId);
    setAuditData(res, { action: 'role.assign', entityType: 'role_assignment', entityId: assignment.assignment_id });
    res.status(201).json({ success: true, data: assignment });
  }),
);

userRouter.delete(
  '/:id/roles/:roleId',
  writeRateLimiter,
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const revoked = await roleAssignmentService.revokeRoleAssignment(req.tenantId!, req.params.id, req.params.roleId);
    if (!revoked) throw new UserServiceError('ROLE_ASSIGNMENT_NOT_FOUND');
    setAuditData(res, { action: 'role.revoke', entityType: 'role_assignment', entityId: req.params.roleId });
    res.json({ success: true, message: 'Role revoked' });
  }),
);

// W1.F1.5 — Bulk actions: assign-role, deactivate, assign-department.
// Each operation is per-user transactional (idempotent on the tenant scope)
// and returns per-user success/failure so the FE can render partial-success
// progress without forcing a single-failure-fails-all transaction.
function asUserIdList(body: any): string[] {
  const raw = (body?.userIds ?? body?.user_ids ?? body?.ids ?? []) as unknown;
  return Array.isArray(raw) ? raw.map((x) => String(x)).filter((x) => !!x.trim()) : [];
}

userRouter.post(
  '/bulk/assign-role',
  writeRateLimiter,
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const userIds = asUserIdList(req.body);
    const roleCode = String(req.body?.functionalRoleCode ?? req.body?.roleCode ?? req.body?.role ?? '').trim();
    if (!userIds.length || !roleCode) {
      res.status(400).json({ success: false, error: 'userIds and functionalRoleCode required' });
      return;
    }
    const results: Array<{ userId: string; ok: boolean; error?: string }> = [];
    for (const userId of userIds) {
      try {
        await roleAssignmentService.assignRole(tenantId, userId, roleCode, actorId);
        results.push({ userId, ok: true });
      } catch (e: any) {
        results.push({ userId, ok: false, error: e?.message ?? String(e) });
      }
    }
    setAuditData(res, { action: 'user.bulk.assign_role', entityType: 'user', entityId: roleCode });
    res.json({ success: true, data: { results, total: results.length, succeeded: results.filter((r) => r.ok).length } });
  }),
);

userRouter.post(
  '/bulk/deactivate',
  writeRateLimiter,
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const userIds = asUserIdList(req.body);
    if (!userIds.length) {
      res.status(400).json({ success: false, error: 'userIds required' });
      return;
    }
    const results: Array<{ userId: string; ok: boolean; error?: string }> = [];
    for (const userId of userIds) {
      try {
        const u = await userService.deactivateUser(tenantId, userId);
        if (u) {
          publishUserDeactivated(tenantId, u.user_id, { deactivatedBy: actorId });
          results.push({ userId, ok: true });
        } else {
          results.push({ userId, ok: false, error: 'USER_NOT_FOUND' });
        }
      } catch (e: any) {
        results.push({ userId, ok: false, error: e?.message ?? String(e) });
      }
    }
    setAuditData(res, { action: 'user.bulk.deactivate', entityType: 'user', entityId: 'bulk' });
    res.json({ success: true, data: { results, total: results.length, succeeded: results.filter((r) => r.ok).length } });
  }),
);

userRouter.post(
  '/bulk/assign-department',
  writeRateLimiter,
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const userIds = asUserIdList(req.body);
    const departmentId = String(req.body?.department_id ?? req.body?.departmentId ?? '').trim();
    if (!userIds.length || !departmentId) {
      res.status(400).json({ success: false, error: 'userIds and department_id required' });
      return;
    }
    const results: Array<{ userId: string; ok: boolean; error?: string }> = [];
    for (const userId of userIds) {
      try {
        const u = await userService.updateUser(tenantId, userId, { department_id: departmentId });
        if (u) {
          publishUserUpdated(tenantId, u.user_id, { updatedBy: actorId, changes: { department_id: departmentId } });
          results.push({ userId, ok: true });
        } else {
          results.push({ userId, ok: false, error: 'USER_NOT_FOUND' });
        }
      } catch (e: any) {
        results.push({ userId, ok: false, error: e?.message ?? String(e) });
      }
    }
    setAuditData(res, { action: 'user.bulk.assign_department', entityType: 'user', entityId: departmentId });
    res.json({ success: true, data: { results, total: results.length, succeeded: results.filter((r) => r.ok).length } });
  }),
);
