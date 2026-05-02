import type {} from '@dos/types/express';
import { Router, Request, Response, NextFunction as _NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/session.middleware';
import { requirePermission } from '../access/access.resolver';
import { auditMiddleware, setAuditData } from '@dos/platform-core/http';
import { automationMiddleware } from '@dos/platform-core/http';
import { validate } from '@dos/platform-core/http';
import { emitEvent } from '@dos/platform-core/events';
import { swallow, EC } from '@dos/platform-core/resilience';
import { toErrorMessage } from '@dos/types/errors';
import { safeQuery, tenantSchema } from '@dos/db';
import { asyncHandler, ok, paginated, action } from '@dos/platform-core/http';
import { assignPermissionBody as sharedAssignPermissionBody } from '../schemas/rbac.schemas';

const codeParam = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.-]+$/);

const router = Router();
router.use(authenticate);
router.use(auditMiddleware('dauth.rbac'));
router.use(automationMiddleware('dauth.rbac'));

const assignPermissionBody = sharedAssignPermissionBody.pick({ roleCode: true, permissionCode: true }).extend({
  moduleCode: z.string().min(1).max(50).regex(/^[a-z][a-z0-9-]*$/, 'module_code must be lowercase kebab-case'),
});

const bulkAssignBody = z.object({
  assignments: z.array(assignPermissionBody).min(1).max(100),
});

const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  roleCode: z.string().optional(),
  moduleCode: z.string().optional(),
});

router.get('/', requirePermission('dauth.rbac.read'), validate({ query: paginationQuery }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const schema = tenantSchema(tenantId);
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE b.is_active = true';
  const params: unknown[] = [];
  let paramIdx = 1;

  if (req.query.roleCode) { whereClause += ` AND b.role_code = $${paramIdx++}`; params.push(req.query.roleCode); }
  if (req.query.moduleCode) { whereClause += ` AND b.module_code = $${paramIdx++}`; params.push(req.query.moduleCode); }

  const [countResult, dataResult] = await Promise.all([
    safeQuery(`SELECT COUNT(*)::int as total FROM "${schema}".module_role_permission_bindings b ${whereClause}`, params),
    safeQuery(
      `SELECT b.id, b.module_code, b.role_code, b.permission_code, b.is_active, b.created_at
       FROM "${schema}".module_role_permission_bindings b
       ${whereClause}
       ORDER BY b.role_code, b.permission_code
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset],
    ),
  ]);

  const total = Number(countResult.rows[0]?.total ?? 0);
  paginated(res, dataResult.rows, total, page, limit);
}));

router.get('/:moduleCode/:roleCode/:permissionCode', requirePermission('dauth.rbac.read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const schema = tenantSchema(tenantId);
  const mc = codeParam.safeParse(req.params.moduleCode);
  const rc = codeParam.safeParse(req.params.roleCode);
  const pc = codeParam.safeParse(req.params.permissionCode);
  if (!mc.success || !rc.success || !pc.success) { res.status(400).json({ error: 'Invalid path parameters', code: 'INVALID_PARAM' }); return; }
  const { rows } = await safeQuery(
    `SELECT b.*, fr.name AS role_name
     FROM "${schema}".module_role_permission_bindings b
     LEFT JOIN "${schema}".functional_roles fr ON fr.code = b.role_code
     WHERE b.module_code = $1 AND b.role_code = $2 AND b.permission_code = $3 AND b.is_active = true`,
    [mc.data, rc.data, pc.data],
  );
  if (rows.length === 0) { res.status(404).json({ error: 'Assignment not found' }); return; }
  res.json(ok(rows[0], req));
}));

router.post('/', requirePermission('dauth.rbac.manage'), validate({ body: assignPermissionBody }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const userId = req.user?.userId;
  const schema = tenantSchema(tenantId);
  const { roleCode, permissionCode, moduleCode } = req.body;

  const roleCheck = await safeQuery(`SELECT code FROM "${schema}".functional_roles WHERE code = $1`, [roleCode]);
  if (roleCheck.rows.length === 0) { res.status(404).json({ error: `Role '${roleCode}' not found` }); return; }

  const sodCheck = await safeQuery(
    `SELECT sr.id, sr.description, sr.role_code_a, sr.role_code_b, sr.conflict_level
     FROM "${schema}".sod_rules sr
     WHERE sr.is_active = true AND (
       (sr.role_code_a = $1) OR (sr.role_code_b = $1)
     )`,
    [roleCode],
  );

  if (sodCheck.rows.length > 0) {
    const conflicts = sodCheck.rows.filter(( r: Record<string, any>) => r.conflict_level === 'block');
    if (conflicts.length > 0) {
      res.status(409).json({
        error: 'SoD conflict detected',
        conflicts: conflicts.map(( r: Record<string, any>) => ({ ruleId: r.id, description: r.description, roleA: r.role_code_a, roleB: r.role_code_b })),
      });
      return;
    }
  }

  const beforeState = await safeQuery(
    `SELECT * FROM "${schema}".module_role_permission_bindings WHERE role_code = $1 AND permission_code = $2 AND module_code = $3`,
    [roleCode, permissionCode, moduleCode],
  );

  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".module_role_permission_bindings (module_code, role_code, permission_code, is_active)
     VALUES ($1, $2, $3, true)
     ON CONFLICT (module_code, role_code, permission_code) DO UPDATE SET is_active = true
     RETURNING *`,
    [moduleCode, roleCode, permissionCode],
  );

  setAuditData(res as unknown as Parameters<typeof setAuditData>[0], {
    action: 'assign_permission',
    entityType: 'role_permission_binding',
    entityId: `${moduleCode}:${roleCode}:${permissionCode}`,
    beforeState: beforeState.rows[0] ?? null,
    afterState: rows[0],
  });
  swallow(EC.EVENT_BUS, emitEvent({
    tenantId, userId, module: 'dauth', event: 'assigned',
    entityType: 'role_permission_binding', entityId: `${moduleCode}:${roleCode}:${permissionCode}`,
  }), { tenantId, operation: 'grcEvent:dauth.role_permission.assigned' });

  res.status(201).json(ok(rows[0], req));
}));

router.post('/bulk', requirePermission('dauth.rbac.manage'), validate({ body: bulkAssignBody }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const userId = req.user?.userId;
  const schema = tenantSchema(tenantId);
  const { assignments } = req.body;
  const results: unknown[] = [];
  const errors: string[] = [];

  for (const a of assignments) {
    try {
      const sodCheck = await safeQuery(
        `SELECT sr.id, sr.conflict_level FROM "${schema}".sod_rules sr
         WHERE sr.is_active = true AND sr.conflict_level = 'block'
           AND (sr.role_code_a = $1 OR sr.role_code_b = $1)`,
        [a.roleCode],
      );

      if (sodCheck.rows.length > 0) {
        errors.push(`${a.roleCode}:${a.permissionCode} — SoD conflict (block)`);
        continue;
      }

      const { rows } = await safeQuery(
        `INSERT INTO "${schema}".module_role_permission_bindings (module_code, role_code, permission_code, is_active)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (module_code, role_code, permission_code) DO UPDATE SET is_active = true
         RETURNING *`,
        [a.moduleCode, a.roleCode, a.permissionCode],
      );
      results.push(rows[0]);
    } catch (err: unknown) {
      errors.push(`${a.roleCode}:${a.permissionCode} — ${toErrorMessage(err)}`);
    }
  }

  setAuditData(res as unknown as Parameters<typeof setAuditData>[0], { action: 'bulk_assign', entityType: 'role_permission_binding', afterState: { count: results.length, errors: errors.length } });
  swallow(EC.EVENT_BUS, emitEvent({
    tenantId, userId, module: 'dauth', event: 'bulk_assigned',
    entityType: 'role_permission_binding', entityId: 'bulk',
    data: { assigned: results.length, failed: errors.length },
  }), { tenantId, operation: 'grcEvent:dauth.role_permission.bulk_assigned' });

  ok(res, { assigned: results.length, errors });
}));

router.delete('/:moduleCode/:roleCode/:permissionCode', requirePermission('dauth.rbac.manage'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const userId = req.user?.userId;
  const schema = tenantSchema(tenantId);
  const mc = codeParam.safeParse(req.params.moduleCode);
  const rc = codeParam.safeParse(req.params.roleCode);
  const pc = codeParam.safeParse(req.params.permissionCode);
  if (!mc.success || !rc.success || !pc.success) { res.status(400).json({ error: 'Invalid path parameters', code: 'INVALID_PARAM' }); return; }
  const moduleCode = mc.data, roleCode = rc.data, permissionCode = pc.data;

  const before = await safeQuery(
    `SELECT * FROM "${schema}".module_role_permission_bindings WHERE module_code = $1 AND role_code = $2 AND permission_code = $3 AND is_active = true`,
    [moduleCode, roleCode, permissionCode],
  );
  if (before.rows.length === 0) {
    res.status(404).json({ error: 'Assignment not found or already revoked' }); return;
  }

  await safeQuery(
    `UPDATE "${schema}".module_role_permission_bindings SET is_active = false
     WHERE module_code = $1 AND role_code = $2 AND permission_code = $3`,
    [moduleCode, roleCode, permissionCode],
  );

  setAuditData(res as unknown as Parameters<typeof setAuditData>[0], {
    action: 'revoke_permission',
    entityType: 'role_permission_binding',
    entityId: `${moduleCode}:${roleCode}:${permissionCode}`,
    beforeState: before.rows[0],
    afterState: { is_active: false },
  });
  swallow(EC.EVENT_BUS, emitEvent({
    tenantId, userId, module: 'dauth', event: 'revoked',
    entityType: 'role_permission_binding', entityId: `${moduleCode}:${roleCode}:${permissionCode}`,
  }), { tenantId, operation: 'grcEvent:dauth.role_permission.revoked' });

  action(res, 'Permission revoked');
}));

export default router;
