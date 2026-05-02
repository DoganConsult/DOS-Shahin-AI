import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import { asyncHandler, validate, auditMiddleware, setAuditData } from '@dos/platform-core/http';
import { withTenantClient } from '@dos/db';
import * as roleService from '../domain/role.service';
import { publishRoleAssigned } from '../events/publisher';
import { assignFunctionalRoleBody } from '../schemas/user.schemas';
import { UserServiceError } from '../domain/contracts/user-errors';
import { writeRateLimiter } from '../middleware/rate-limiter';
import { requireAdmin } from '../middleware/ownership';

export const roleRouter = Router();

roleRouter.use(authenticate);
roleRouter.use(requireTenantId);
roleRouter.use(auditMiddleware('role'));

roleRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const roles = await roleService.listAvailableRoles(req.tenantId!);
  res.json({ success: true, data: roles });
}));

roleRouter.get('/users/:userId', asyncHandler(async (req: Request, res: Response) => {
  const assignments = await roleService.listUserRoles(req.tenantId!, req.params.userId);
  res.json({ success: true, data: assignments });
}));

roleRouter.post(
  '/users/:userId',
  writeRateLimiter,
  requireAdmin(),
  validate({ body: assignFunctionalRoleBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const { functionalRoleCode } = req.body;
    const assignment = await roleService.assignRole(tenantId, req.params.userId, functionalRoleCode, actorId);
    publishRoleAssigned(tenantId, req.params.userId, functionalRoleCode, actorId);
    setAuditData(res, { action: 'role.assign', entityType: 'role_assignment', entityId: assignment.assignment_id });
    res.status(201).json({ success: true, data: assignment });
  }),
);

roleRouter.delete(
  '/users/:userId/:roleCode',
  writeRateLimiter,
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const revoked = await roleService.revokeRole(req.tenantId!, req.params.userId, req.params.roleCode);
    if (!revoked) throw new UserServiceError('ROLE_ASSIGNMENT_NOT_FOUND', undefined, { userId: req.params.userId, roleCode: req.params.roleCode });
    setAuditData(res, { action: 'role.revoke', entityType: 'role_assignment', entityId: `${req.params.userId}:${req.params.roleCode}` });
    res.json({ success: true, message: 'Role revoked' });
  }),
);

// ── Role-detail endpoints used by /foundation/roles/:id and permission matrix ──
// Source of truth: platform_dauth.functional_roles + platform_dauth.user_role_assignments.
// All read-only; write paths remain on /users/:userId routes above.

roleRouter.get(
  '/:roleCode/detail',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const roleCode = req.params.roleCode;
    const detail = await withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT role_code, display_name, display_name_en, display_name_ar,
                description, description_en, description_ar, permissions
           FROM platform_dauth.functional_roles
          WHERE role_code = $1
          LIMIT 1`,
        [roleCode],
      );
      if (r.rows.length === 0) return null;
      const cnt = await c.query(
        `SELECT COUNT(*)::int AS active_users
           FROM platform_dauth.user_role_assignments
          WHERE tenant_id = $1 AND role_code = $2 AND is_active = TRUE`,
        [tenantId, roleCode],
      );
      return { ...r.rows[0], active_users: cnt.rows[0]?.active_users ?? 0 };
    });
    if (!detail) throw new UserServiceError('ROLE_NOT_FOUND', undefined, { roleCode });
    res.json({ success: true, data: detail, role: detail });
  }),
);

roleRouter.get(
  '/:roleCode/permissions',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const roleCode = req.params.roleCode;
    const permissions = await withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT permissions FROM platform_dauth.functional_roles WHERE role_code = $1 LIMIT 1`,
        [roleCode],
      );
      return (r.rows[0]?.permissions as string[] | null) ?? [];
    });
    res.json({ permissions });
  }),
);

// W2.F2.3 — Permission matrix delta save.
// Body accepts either:
//   { permissions: string[] }                 — replace
//   { add?: string[], remove?: string[] }     — delta
// Writes to platform_dauth.functional_roles.permissions (jsonb/text[]).
// Tenant-scoped admin only.
roleRouter.put(
  '/:roleCode/permissions',
  writeRateLimiter,
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const roleCode = req.params.roleCode;
    const body = req.body ?? {};
    const replace = Array.isArray(body.permissions) ? body.permissions.map(String) : null;
    const add = Array.isArray(body.add) ? body.add.map(String) : [];
    const remove = Array.isArray(body.remove) ? body.remove.map(String) : [];
    if (!replace && add.length === 0 && remove.length === 0) {
      res.status(400).json({ success: false, error: 'permissions[] or add[]/remove[] required' });
      return;
    }
    const updated = await withTenantClient(tenantId, async (c) => {
      const cur = await c.query(
        `SELECT permissions FROM platform_dauth.functional_roles WHERE role_code = $1 LIMIT 1`,
        [roleCode],
      );
      if (cur.rows.length === 0) return null;
      const existing: string[] = Array.isArray(cur.rows[0].permissions)
        ? (cur.rows[0].permissions as string[])
        : [];
      let next: string[];
      if (replace) {
        next = Array.from(new Set(replace));
      } else {
        const set = new Set(existing);
        for (const p of add) set.add(p);
        for (const p of remove) set.delete(p);
        next = Array.from(set);
      }
      const upd = await c.query(
        `UPDATE platform_dauth.functional_roles
            SET permissions = $2::jsonb, updated_at = NOW()
          WHERE role_code = $1
        RETURNING role_code, permissions, updated_at`,
        [roleCode, JSON.stringify(next)],
      );
      return upd.rows[0] ?? null;
    });
    if (!updated) throw new UserServiceError('ROLE_NOT_FOUND', undefined, { roleCode });
    setAuditData(res, {
      action: 'role.permissions.update',
      entityType: 'functional_role',
      entityId: roleCode,
      afterState: { permissions: updated.permissions, actorId },
    });
    res.json({ success: true, data: updated });
  }),
);

roleRouter.get(
  '/:roleCode/users',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const roleCode = req.params.roleCode;
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt((req.query.limit as string) || '25', 10)));
    const offset = (page - 1) * limit;
    const result = await withTenantClient(tenantId, async (c) => {
      const totalRow = await c.query(
        `SELECT COUNT(*)::int AS total
           FROM platform_dauth.user_role_assignments
          WHERE tenant_id = $1 AND role_code = $2 AND is_active = TRUE`,
        [tenantId, roleCode],
      );
      const r = await c.query(
        `SELECT ra.assignment_id, ra.user_id, ra.role_code, ra.granted_at, ra.expires_at,
                u.email, u.first_name, u.last_name, u.status
           FROM platform_dauth.user_role_assignments ra
           LEFT JOIN dos.users u ON u.user_id = ra.user_id AND u.tenant_id = ra.tenant_id
          WHERE ra.tenant_id = $1 AND ra.role_code = $2 AND ra.is_active = TRUE
          ORDER BY ra.granted_at DESC
          LIMIT $3 OFFSET $4`,
        [tenantId, roleCode, limit, offset],
      );
      return { users: r.rows, total: totalRow.rows[0]?.total ?? 0 };
    });
    res.json(result);
  }),
);

roleRouter.get(
  '/:roleCode/teams',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const roleCode = req.params.roleCode;
    const result = await withTenantClient(tenantId, async (c) => {
      // dos.team_raci_assignments has no role_code column. Pivot through
      // dos.user_role_assignments: find users currently holding this role,
      // then list their team-level RACI assignments and team membership.
      const raci = await c.query(
        `SELECT t.team_id, t.team_code, t.name,
                tra.user_id, tra.raci_role AS responsibility,
                tra.scope_type, tra.scope_id::text AS task_code
           FROM dos.team_raci_assignments tra
           JOIN dos.teams t ON t.team_id::text = tra.team_id::text
           JOIN dos.user_role_assignments ura ON ura.user_id::text = tra.user_id::text
          WHERE t.tenant_id = $1 AND ura.role_code = $2 AND ura.is_active = TRUE
            AND tra.revoked_at IS NULL`,
        [tenantId, roleCode],
      ).catch(() => ({ rows: [] }));
      const teamMappings = await c.query(
        `SELECT DISTINCT t.team_id, t.team_code, t.name, tm.user_id, tm.role AS team_role
           FROM dos.team_members tm
           JOIN dos.teams t ON t.team_id = tm.team_id
           JOIN dos.user_role_assignments ura ON ura.user_id::text = tm.user_id::text
          WHERE t.tenant_id = $1 AND ura.role_code = $2 AND ura.is_active = TRUE`,
        [tenantId, roleCode],
      ).catch(() => ({ rows: [] }));
      return { teamMappings: teamMappings.rows, raciEntries: raci.rows };
    });
    res.json(result);
  }),
);

roleRouter.get(
  '/:roleCode/dashboards',
  asyncHandler(async (_req: Request, res: Response) => {
    // Dashboards-by-role registry not yet wired; return empty array deterministically
    // so the FE renders an empty state instead of erroring.
    res.json({ dashboards: [] });
  }),
);

roleRouter.post(
  '/:roleCode/assign',
  writeRateLimiter,
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const { user_id: userId, team_id: teamId } = req.body ?? {};
    if (!userId) {
      res.status(400).json({ success: false, error: 'user_id required' });
      return;
    }
    const assignment = await roleService.assignRole(tenantId, userId, req.params.roleCode, actorId);
    publishRoleAssigned(tenantId, userId, req.params.roleCode, actorId);
    setAuditData(res, {
      action: 'role.assign',
      entityType: 'role_assignment',
      entityId: assignment.assignment_id,
    });
    res.status(201).json({ success: true, data: { ...assignment, team_id: teamId ?? null } });
  }),
);
