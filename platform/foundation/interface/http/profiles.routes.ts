import { Router, Request, Response } from 'express';
import { authenticate, requirePermission, requireTenantId } from '../../infrastructure/auth.adapter';
import { asyncHandler, auditMiddleware } from '../../ports/middleware.port';
import { query } from '../../ports/database.port';

// FE calls /api/profiles/roles — this is the canonical role catalogue
// (dos.functional_roles). Distinct from /api/roles which is the
// assignment-oriented surface (list/assign/revoke per user).
export const profilesRouter = Router();
profilesRouter.use(authenticate);
profilesRouter.use(requireTenantId);
profilesRouter.use(auditMiddleware('profile'));

profilesRouter.get('/roles',
  requirePermission('role.read'),
  asyncHandler(async (_req: Request, res: Response) => {
    const result = await query(
      `SELECT fr.role_id, fr.role_code, fr.display_name, fr.description,
              fr.permissions, fr.created_at
         FROM dos.functional_roles fr
        ORDER BY fr.role_code`,
    );
    res.json({ profiles: result.rows, roles: result.rows });
  }),
);
