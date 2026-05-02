import { Request, Response, Router } from 'express';
import { z } from "zod";

/**
 * Reporting Diagnostics & Dashboard Routes
 * @owner reporting
 * @module reporting
 * @since 2026-03-31
 */

import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port';
import { runDiagnostics } from '../diagnostics/reporting-diagnostics.service';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('reporting'));
router.use(auditMiddleware('reporting'));

router.get('/diagnostics', authenticate, requirePermission('reporting.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await runDiagnostics(req.tenantId!);
  res.json({ success: true, data: result });
}));

export default router;
