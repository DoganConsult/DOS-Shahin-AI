import { Request, Response, Router } from 'express';
import { z } from "zod";

/**
 * Integrations Diagnostics & Dashboard Routes
 * @owner integrations
 * @module integrations
 * @since 2026-03-31
 */

import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port';
import { runDiagnostics } from '../diagnostics/integrations-diagnostics.service';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('integrations'));
router.use(auditMiddleware('integrations'));

router.get('/diagnostics', authenticate, requirePermission('integrations.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await runDiagnostics(req.tenantId!);
  res.json({ success: true, data: result });
}));

export default router;
