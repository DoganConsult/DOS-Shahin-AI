import type {} from '@dos/types/express';
import { Router, Request, Response, NextFunction as _NextFunction } from 'express';
import { authenticate } from '../middleware/session.middleware';
import { requirePermission } from '../access/access.resolver';
import { auditMiddleware } from '@dos/platform-core/http';
import { automationMiddleware } from '@dos/platform-core/http';
import { safeQuery, tenantSchema } from '@dos/db';
import { asyncHandler, ok } from '@dos/platform-core/http';
import { logger } from '@dos/platform-core/observability';
import { z } from 'zod';

const roleCodeParam = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.:-]+$/, 'Invalid role code format');

const router = Router();
router.use(authenticate);
router.use(auditMiddleware('dauth.role_detail'));
router.use(automationMiddleware('dauth.role_detail'));

router.get('/:roleCode', requirePermission('dauth.role.read'), asyncHandler(async (req: Request, res: Response) => {
  const parsed = roleCodeParam.safeParse(req.params.roleCode);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid role code', code: 'INVALID_PARAM' }); return; }
  const tenantId = req.tenantId;
  const schema = tenantSchema(tenantId);
  const roleCode = parsed.data;

  const { rows: roleRows } = await safeQuery(
    `SELECT * FROM "${schema}".functional_roles WHERE code = $1`,
    [roleCode],
  );
  if (roleRows.length === 0) { res.status(404).json({ error: 'Role not found' }); return; }

  const [permsRes, assigneesRes, delegationsRes, auditRes] = await Promise.all([
    safeQuery(
      `SELECT b.permission_code, b.module_code, b.is_active, b.created_at
       FROM "${schema}".module_role_permission_bindings b
       WHERE b.role_code = $1 AND b.is_active = true
       ORDER BY b.permission_code`,
      [roleCode],
    ),
    safeQuery(
      `SELECT a.user_id, a.created_at AS assigned_at, a.scope_type, a.scope_id, a.is_primary,
              u.email, u.full_name, u.job_title
       FROM "${schema}".enterprise_user_role_assignments a
       LEFT JOIN public.users u ON u.user_id = a.user_id
       WHERE a.functional_role_code = $1 AND a.is_active = true
       ORDER BY a.created_at DESC LIMIT 50`,
      [roleCode],
    ),
    safeQuery(
      `SELECT dc.id, dc.delegator_user_id, dc.delegate_user_id, dc.valid_from, dc.valid_to, dc.delegation_type, dc.is_active
       FROM "${schema}".delegation_chains dc
       WHERE dc.scope_codes @> ARRAY[$1]::text[] AND dc.is_active = true
       ORDER BY dc.valid_from DESC LIMIT 20`,
      [roleCode],
    ).catch((err: unknown) => { logger.warn(`[RoleDetail] delegation_chains query failed for role ${roleCode}: ${err instanceof Error ? err.message : String(err)}`); return { rows: [] }; }),
    safeQuery(
      `SELECT at.action, at."timestamp", at.user_id, at.details
       FROM "${schema}".audit_trail at
       WHERE at.entity_type = 'functional_role' AND at.entity_id = $1
       ORDER BY at."timestamp" DESC LIMIT 20`,
      [roleCode],
    ).catch((err: unknown) => { logger.warn(`[RoleDetail] audit_trail query failed for role ${roleCode}: ${err instanceof Error ? err.message : String(err)}`); return { rows: [] }; }),
  ]);

  res.json(ok({
    ...roleRows[0],
    permissions: permsRes.rows,
    assignees: assigneesRes.rows,
    delegations: delegationsRes.rows,
    recentAudit: auditRes.rows,
  }, req));
}));

export default router;
