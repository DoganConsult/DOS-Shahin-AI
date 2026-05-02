import { Request, Response, Router } from 'express';
import { catchHandler, EC } from '../../ports/resilience.port';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { asyncHandler, validate, auditMiddleware, moduleStack, scopeContext } from '../../ports/middleware.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { createFoundationBody } from '../../schemas/foundation.schemas';

const router = Router();
router.use(moduleStack('foundation'));
router.use(auditMiddleware('foundation'));
router.use(scopeContext);

router.get('/', authenticate, requirePermission('foundation.record.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = tenantSchema((req as any).tenantId);
    const { rows } = await safeQuery(
      `SELECT p.*, 
              COALESCE(array_agg(DISTINCT pp.permission_code) FILTER (WHERE pp.permission_code IS NOT NULL), '{}') AS permissions,
              COUNT(DISTINCT up.user_id)::int AS user_count
       FROM "${schema}".access_profiles p
       LEFT JOIN "${schema}".profile_permissions pp ON pp.profile_id = p.id
       LEFT JOIN "${schema}".user_profiles up ON up.profile_id = p.id
       WHERE p.deleted_at IS NULL
       GROUP BY p.id
       ORDER BY p.name_en ASC`,
    ).catch(() => ({ rows: [] as any[] }));
    res.json({ success: true, profiles: rows, total: rows.length });
  }));

router.get('/:id', authenticate, requirePermission('foundation.record.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = tenantSchema((req as any).tenantId);
    const { rows } = await safeQuery(
      `SELECT p.*,
              COALESCE(array_agg(DISTINCT pp.permission_code) FILTER (WHERE pp.permission_code IS NOT NULL), '{}') AS permissions
       FROM "${schema}".access_profiles p
       LEFT JOIN "${schema}".profile_permissions pp ON pp.profile_id = p.id
       WHERE p.id = $1 AND p.deleted_at IS NULL
       GROUP BY p.id`,
      [req.params.id],
    ).catch(() => ({ rows: [] as any[] }));
    if (!rows[0]) { res.status(404).json({ success: false, error: 'Role not found' }); return; }
    res.json({ success: true, data: rows[0] });
  }));

router.post('/', authenticate, requirePermission('foundation.system.manage'),
  validate({ body: createFoundationBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = tenantSchema((req as any).tenantId);
    const userId = req.user!.userId;
    const { nameEn, nameAr, code, description, permissions } = req.body;
    const { rows } = await safeQuery(
      `INSERT INTO "${schema}".access_profiles 
       (name_en, name_ar, code, description_en, is_system, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, false, $5, NOW(), NOW()) RETURNING *`,
      [nameEn, nameAr || null, code, description || null, userId],
    );
    const profile = rows[0];
    if (profile && Array.isArray(permissions)) {
      for (const perm of permissions) {
        await safeQuery(
          `INSERT INTO "${schema}".profile_permissions (profile_id, permission_code, created_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING`,
          [profile.id, perm],
        ).catch(catchHandler(EC.EVENT_BUS));
      }
    }
    res.status(201).json({ success: true, data: profile });
  }));

export default router;
