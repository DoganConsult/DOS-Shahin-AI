import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { validate } from "../ports/middleware.port";
import { z } from "zod";

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(moduleStack('agrc-engine'));
router.use(auditMiddleware('agrc_engine'));

router.get(
  '/settings',
  authenticate,
  requirePermission('agrc_engine.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const schema = tenantSchema(tenantId);
    // Return module-specific settings
    const { rows } = await safeQuery(
      `SELECT key, value FROM "${schema}".module_settings WHERE module_code = $1`,
      ['agrc-engine'],
    ).catch(() => ({ rows: [] }));
    res.json({ success: true, data: rows });
  }),
);

router.get(
  '/health',
  authenticate,
  requirePermission('agrc_engine.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const schema = tenantSchema(tenantId);
    // Check table existence for owned tables
    const { rows } = await safeQuery(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 LIMIT 50`,
      [schema],
    ).catch(() => ({ rows: [] }));
    res.json({ success: true, tableCount: rows.length });
  }),
);

export async function getConfig(_tenantId: string): Promise<Record<string, unknown>> { return {}; }
export async function updateConfig(_tenantId: string, _body: Record<string, unknown>): Promise<Record<string, unknown>> { return {}; }

export default router;
