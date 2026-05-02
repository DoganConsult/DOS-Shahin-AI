import { Request, Response, Router } from 'express';
import { z } from "zod";

/**
 * Records Diagnostics & Dashboard Routes
 * @owner records
 * @module records
 * @since 2026-03-31
 */

import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port';
import { runDiagnostics as getRecordsDiagnostics } from '../diagnostics/records-diagnostics.service';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('records'));
router.use(auditMiddleware('records'));

router.get('/diagnostics', authenticate, requirePermission('records.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await getRecordsDiagnostics(req.tenantId!);
  res.json({ success: true, data: result });
}));

export default router;
