import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack } from '../../ports/middleware.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFoundationDiagnostics } from '../diagnostics/foundation-diagnostics.service';

const router = Router();
router.use(moduleStack('foundation'));
router.use(auditMiddleware('foundation'));

router.get('/settings', authenticate, requirePermission('foundation.manage'),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = tenantSchema(req.tenantId);
    const { rows } = await safeQuery(
      `SELECT key, value FROM "${schema}".module_settings WHERE module_code = $1`, ['foundation']
    ).catch(() => ({ rows: [] as any[] }));
    res.json({ success: true, data: rows });
  }));

router.get('/health', authenticate, requirePermission('foundation.manage'),
  asyncHandler(async (req: Request, res: Response) => {
    const diagnostics = await getFoundationDiagnostics(req.tenantId);
    res.json({ success: true, data: diagnostics });
  }));

export default router;
