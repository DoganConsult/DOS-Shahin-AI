import { Router, Request, Response } from 'express';
import { z } from "zod";
import { authenticate, requirePermission } from '../../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack } from '../../ports/middleware.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { validate } from "../../ports/middleware.port";
const router = Router();
router.use(moduleStack('qiyas'));
router.use(auditMiddleware('qiyas'));

router.get(
  '/settings',
  authenticate,
  requirePermission('qiyas.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const schema = tenantSchema(tenantId);
    // Return module-specific settings
    const { rows } = await safeQuery(
      `SELECT key, value FROM "${schema}".module_settings WHERE module_code = $1`,
      ['qiyas'],
    ).catch(() => ({ rows: [] }));
    res.json({ success: true, data: rows });
  }),
);

router.get(
  '/health',
  authenticate,
  requirePermission('qiyas.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const schema = tenantSchema(tenantId);
    // Check table existence for owned tables
    const { rows } = await safeQuery(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 LIMIT 50`,
      [schema],
    ).catch(() => ({ rows: [] }));
    res.json({ success: true, tableCount: rows.length });
  }),
);

export default router;
