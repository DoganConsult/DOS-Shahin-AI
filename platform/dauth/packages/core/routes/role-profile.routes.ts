import type {} from '@dos/types/express';
/**
 * Role profile routes — full CRUD for functional roles + user assignment management.
 * @owner DAuth
 */
import { Router, Request, Response, NextFunction as _NextFunction } from 'express';
import { safeQuery, tenantSchema } from '@dos/db';
import { asyncHandler } from '@dos/platform-core/http';
import { authenticate, requirePermission } from '../index';
import { auditMiddleware, setAuditData } from '@dos/platform-core/http';
import { automationMiddleware } from '@dos/platform-core/http';
import { validate } from '@dos/platform-core/http';
import { emitEvent } from '@dos/platform-core/events';
import { swallow, EC } from '@dos/platform-core/resilience';
import { ok, paginated, action } from '@dos/platform-core/http';
import { createRoleBody, updateRoleBody, assignRoleBody, revokeRoleAssignmentBody, rbacListQuery } from '../schemas/rbac.schemas';
import { z } from 'zod';

const roleCodeParam = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.-]+$/);

const router = Router();

router.use(authenticate);
router.use(auditMiddleware('dauth.role_profiles'));
router.use(automationMiddleware('dauth.role_profiles'));

router.get('/', requirePermission('dauth.role.read'), validate({ query: rbacListQuery }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId || req.user?.tenantId;
  const schema = tenantSchema(tenantId);
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = Math.min(parseInt(req.query.pageSize as string) || 50, 200);
  const moduleCode = req.query.moduleCode as string | undefined;
  const search = req.query.search as string | undefined;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (moduleCode) { conditions.push(`fr.module_code = $${idx++}`); params.push(moduleCode); }
  if (search) { conditions.push(`(fr.name ILIKE $${idx} OR fr.code ILIKE $${idx})`); params.push(`%${search}%`); idx++; }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await safeQuery(`SELECT COUNT(*) FROM "${schema}".functional_roles fr ${where}`, params);
  const total = parseInt(countResult.rows[0].count, 10);

  const { rows } = await safeQuery(
    `SELECT fr.id, fr.code, fr.module_code, fr.name, fr.description, fr.created_at, fr.updated_at,
            (SELECT COUNT(*) FROM "${schema}".enterprise_user_role_assignments eura
             WHERE eura.functional_role_code = fr.code AND eura.is_active = TRUE) AS active_assignments,
            COALESCE(
              array_agg(p.code) FILTER (WHERE p.code IS NOT NULL), '{}'
            ) AS permission_codes
     FROM "${schema}".functional_roles fr
     LEFT JOIN "${schema}".role_permissions rp ON rp.functional_role_id = fr.id
     LEFT JOIN "${schema}".permissions p ON p.id = rp.permission_id
     ${where}
     GROUP BY fr.id
     ORDER BY fr.module_code, fr.name
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, pageSize, offset],
  );

  paginated(res, rows, total, page, pageSize);
}));

router.get('/:roleCode', requirePermission('dauth.role.read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId || req.user?.tenantId;
  const schema = tenantSchema(tenantId);
  const rcParsed = roleCodeParam.safeParse(req.params.roleCode);
  if (!rcParsed.success) { res.status(400).json({ error: 'Invalid role code', code: 'INVALID_PARAM' }); return; }
  const roleCode = rcParsed.data;
  const { rows } = await safeQuery(
    `SELECT fr.id, fr.code, fr.module_code, fr.name, fr.description, fr.created_at, fr.updated_at,
            COALESCE(
              json_agg(json_build_object('code', p.code, 'module_code', p.module_code, 'resource_code', p.resource_code, 'action_code', p.action_code, 'description', p.description))
              FILTER (WHERE p.code IS NOT NULL), '[]'
            ) AS permissions
     FROM "${schema}".functional_roles fr
     LEFT JOIN "${schema}".role_permissions rp ON rp.functional_role_id = fr.id
     LEFT JOIN "${schema}".permissions p ON p.id = rp.permission_id
     WHERE fr.code = $1
     GROUP BY fr.id`,
    [roleCode],
  );
  if (rows.length === 0) { res.status(404).json({ success: false, error: 'Role not found' }); return; }
  res.json(ok(rows[0], req));
}));

router.post('/', requirePermission('dauth.role.manage'), validate({ body: createRoleBody }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId || req.user?.tenantId;
  const userId = req.user?.userId;
  const schema = tenantSchema(tenantId);
  const { code, moduleCode, name, description } = req.body;

  const existing = await safeQuery(`SELECT 1 FROM "${schema}".functional_roles WHERE code = $1 LIMIT 1`, [code]);
  if (existing.rows.length > 0) { res.status(409).json({ success: false, error: 'Role code already exists' }); return; }

  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".functional_roles (code, module_code, name, description)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [code, moduleCode, name, description || null],
  );

  setAuditData(res as unknown as Parameters<typeof setAuditData>[0], { action: 'create', entityType: 'functional_role', entityId: code, afterState: rows[0] });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId, userId, module: 'dauth', event: 'role.created', entityType: 'functional_role', entityId: code }), { tenantId, operation: 'grcEvent:dauth.role.created' });

  res.status(201).json(ok(rows[0], req));
}));

router.put('/:roleCode', requirePermission('dauth.role.manage'), validate({ body: updateRoleBody }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId || req.user?.tenantId;
  const userId = req.user?.userId;
  const schema = tenantSchema(tenantId);
  const rcParsed = roleCodeParam.safeParse(req.params.roleCode);
  if (!rcParsed.success) { res.status(400).json({ error: 'Invalid role code', code: 'INVALID_PARAM' }); return; }
  const roleCode = rcParsed.data;

  const before = await safeQuery(`SELECT * FROM "${schema}".functional_roles WHERE code = $1`, [roleCode]);
  if (before.rows.length === 0) { res.status(404).json({ success: false, error: 'Role not found' }); return; }

  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (req.body.name !== undefined) { sets.push(`name = $${idx++}`); params.push(req.body.name); }
  if (req.body.description !== undefined) { sets.push(`description = $${idx++}`); params.push(req.body.description); }
  sets.push(`updated_at = NOW()`);

  const { rows } = await safeQuery(
    `UPDATE "${schema}".functional_roles SET ${sets.join(', ')} WHERE code = $${idx} RETURNING *`,
    [...params, roleCode],
  );

  setAuditData(res as unknown as Parameters<typeof setAuditData>[0], { action: 'update', entityType: 'functional_role', entityId: roleCode, beforeState: before.rows[0], afterState: rows[0] });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId, userId, module: 'dauth', event: 'role.updated', entityType: 'functional_role', entityId: roleCode }), { tenantId, operation: 'grcEvent:dauth.role.updated' });

  res.json(ok(rows[0], req));
}));

router.post('/:roleCode/assign', requirePermission('dauth.role.manage'), validate({ body: assignRoleBody }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId || req.user?.tenantId;
  const actorUserId = req.user?.userId;
  const schema = tenantSchema(tenantId);
  const rcParsed = roleCodeParam.safeParse(req.params.roleCode);
  if (!rcParsed.success) { res.status(400).json({ error: 'Invalid role code', code: 'INVALID_PARAM' }); return; }
  const roleCode = rcParsed.data;
  const { userId, functionalRoleCode, moduleCode, scopeType, scopeId, authorityLevel, validFrom, validTo, isPrimary } = req.body;

  const targetRole = functionalRoleCode || roleCode;
  const roleExists = await safeQuery(`SELECT 1 FROM "${schema}".functional_roles WHERE code = $1 LIMIT 1`, [targetRole]);
  if (roleExists.rows.length === 0) { res.status(404).json({ success: false, error: 'Role not found' }); return; }

  const sodCheck = await safeQuery(
    `SELECT sr.rule_code, sr.severity, sr.enforcement_mode, sr.conflicting_roles
     FROM "${schema}".module_sod_rules sr
     WHERE sr.is_active = TRUE AND sr.module_code = $1
       AND sr.conflicting_roles @> $2::jsonb`,
    [moduleCode, JSON.stringify([targetRole])],
  );

  const existingRoles = await safeQuery(
    `SELECT functional_role_code FROM "${schema}".enterprise_user_role_assignments
     WHERE user_id = $1 AND module_code = $2 AND is_active = TRUE`,
    [userId, moduleCode],
  );
  const userRoleCodes = existingRoles.rows.map(( r: Record<string, any>) => r.functional_role_code);

  for (const rule of sodCheck.rows) {
    const conflicting: string[] = rule.conflicting_roles || [];
    const hasConflict = conflicting.some((cr: string) => userRoleCodes.includes(cr));
    if (hasConflict && rule.enforcement_mode === 'block') {
      res.status(409).json({ success: false, error: 'SoD violation', rule: rule.rule_code, severity: rule.severity });
      return;
    }
  }

  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".enterprise_user_role_assignments
     (user_id, functional_role_code, module_code, scope_type, scope_id, authority_level, valid_from, valid_to, is_primary, granted_by, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)
     ON CONFLICT DO NOTHING
     RETURNING *`,
    [userId, targetRole, moduleCode, scopeType || 'tenant', scopeId || null, authorityLevel || null, validFrom || null, validTo || null, isPrimary || false, actorUserId],
  );

  setAuditData(res as unknown as Parameters<typeof setAuditData>[0], { action: 'assign_role', entityType: 'user_role_assignment', entityId: `${userId}:${targetRole}`, afterState: rows[0] });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId, userId: actorUserId, module: 'dauth', event: 'role.assigned', entityType: 'user_role_assignment', entityId: `${userId}:${targetRole}` }), { tenantId, operation: 'grcEvent:dauth.role.assigned' });

  res.status(201).json(ok(rows[0] || { userId, roleCode: targetRole, status: 'already_assigned' }, req));
}));

router.post('/:roleCode/revoke', requirePermission('dauth.role.manage'), validate({ body: revokeRoleAssignmentBody }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId || req.user?.tenantId;
  const actorUserId = req.user?.userId;
  const schema = tenantSchema(tenantId);
  const { userId, functionalRoleCode, moduleCode } = req.body;

  const before = await safeQuery(
    `SELECT * FROM "${schema}".enterprise_user_role_assignments
     WHERE user_id = $1 AND functional_role_code = $2 AND module_code = $3 AND is_active = TRUE`,
    [userId, functionalRoleCode, moduleCode],
  );
  if (before.rows.length === 0) { res.status(404).json({ success: false, error: 'Active assignment not found' }); return; }

  await safeQuery(
    `UPDATE "${schema}".enterprise_user_role_assignments
     SET is_active = FALSE, updated_at = NOW()
     WHERE user_id = $1 AND functional_role_code = $2 AND module_code = $3 AND is_active = TRUE`,
    [userId, functionalRoleCode, moduleCode],
  );

  setAuditData(res as unknown as Parameters<typeof setAuditData>[0], { action: 'revoke_role', entityType: 'user_role_assignment', entityId: `${userId}:${functionalRoleCode}`, beforeState: before.rows[0] });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId, userId: actorUserId, module: 'dauth', event: 'role.revoked', entityType: 'user_role_assignment', entityId: `${userId}:${functionalRoleCode}` }), { tenantId, operation: 'grcEvent:dauth.role.revoked' });

  action(res, 'Role assignment revoked');
}));

export default router;
