import type {} from '@dos/types/express';
import { Router, Request, Response, NextFunction as _NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/session.middleware';
import { requirePermission } from '../access/access.resolver';
import { auditMiddleware } from '@dos/platform-core/http';
import { automationMiddleware } from '@dos/platform-core/http';
import { validate } from '@dos/platform-core/http';
import { safeQuery, tenantSchema } from '@dos/db';
import { asyncHandler } from '@dos/platform-core/http';

const router = Router();
router.use(authenticate);
router.use(auditMiddleware('dauth.role_matrix'));
router.use(automationMiddleware('dauth.role_matrix'));

const matrixQuery = z.object({
  moduleCode: z.string().optional(),
  roles: z.string().optional(),
});

router.get('/', requirePermission('dauth.role.read'), validate({ query: matrixQuery }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const schema = tenantSchema(tenantId);
  const { moduleCode, roles: rolesParam } = req.query as Record<string, string | undefined>;

  let where = '';
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (moduleCode) { conditions.push(`b.module_code = $${idx++}`); params.push(moduleCode); }
  if (rolesParam) {
    const roleCodes = rolesParam.split(',').map((s: string) => s.trim()).filter(Boolean);
    if (roleCodes.length > 0) { conditions.push(`b.role_code = ANY($${idx++})`); params.push(roleCodes); }
  }
  if (conditions.length > 0) { where = `WHERE ${conditions.join(' AND ')}`; }

  const { rows } = await safeQuery(
    `SELECT fr.code AS role_code, fr.name AS role_name, fr.module_code,
            array_agg(DISTINCT b.permission_code) FILTER (WHERE b.permission_code IS NOT NULL AND b.is_active = true) AS permissions,
            COUNT(DISTINCT b.permission_code) FILTER (WHERE b.permission_code IS NOT NULL AND b.is_active = true)::int AS permission_count
     FROM "${schema}".functional_roles fr
     LEFT JOIN "${schema}".module_role_permission_bindings b ON b.role_code = fr.code AND b.is_active = true
     ${where}
     GROUP BY fr.code, fr.name, fr.module_code
     ORDER BY fr.name`,
    params,
  );

  const matrix: Record<string, { roleName: string; moduleCode: string | null; permissions: string[]; count: number }> = {};
  for (const row of rows) {
    matrix[row.role_code] = {
      roleName: row.role_name,
      moduleCode: row.module_code,
      permissions: row.permissions ?? [],
      count: row.permission_count,
    };
  }

  res.json({ success: true, data: matrix, roleCount: rows.length });
}));

router.get('/compare', requirePermission('dauth.role.read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const schema = tenantSchema(tenantId);
  const roleCodeQ = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.-]+$/);
  const raParsed = roleCodeQ.safeParse(req.query.roleA);
  const rbParsed = roleCodeQ.safeParse(req.query.roleB);
  if (!raParsed.success || !rbParsed.success) { res.status(400).json({ error: 'roleA and roleB query params required', code: 'INVALID_PARAM' }); return; }
  const roleA = raParsed.data;
  const roleB = rbParsed.data;

  const [permsA, permsB] = await Promise.all([
    safeQuery(`SELECT permission_code FROM "${schema}".module_role_permission_bindings WHERE role_code = $1 AND is_active = true`, [roleA]),
    safeQuery(`SELECT permission_code FROM "${schema}".module_role_permission_bindings WHERE role_code = $1 AND is_active = true`, [roleB]),
  ]);

  const setA = new Set(permsA.rows.map(( r: Record<string, any>) => r.permission_code));
  const setB = new Set(permsB.rows.map(( r: Record<string, any>) => r.permission_code));
  const shared = [...setA].filter(p => setB.has(p));
  const onlyA = [...setA].filter(p => !setB.has(p));
  const onlyB = [...setB].filter(p => !setA.has(p));

  res.json({ success: true, data: { roleA, roleB, shared, onlyA, onlyB, overlapPercent: shared.length / Math.max(setA.size, setB.size, 1) * 100 } });
}));

export default router;
