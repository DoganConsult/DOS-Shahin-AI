import { Request, Response, Router } from 'express';
import { z } from "zod";

/**
 * Qiyas Diagnostics Routes
 * @owner qiyas
 * @module qiyas
 * @since 2026-03-31
 */

import { authenticate, requirePermission } from '../../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack } from '../../ports/middleware.port';
import { runDiagnostics } from '../diagnostics/qiyas-diagnostics.service';
import { validate } from "../../ports/middleware.port";
const router = Router();
router.use(moduleStack('qiyas'));
router.use(auditMiddleware('qiyas'));

router.get('/diagnostics', authenticate, requirePermission('qiyas.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await runDiagnostics(req.tenantId!);
  res.json({ success: true, data: result });
}));

export default router;
