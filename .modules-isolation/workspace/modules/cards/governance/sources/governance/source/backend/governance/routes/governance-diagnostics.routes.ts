import { Request, Response, Router } from 'express';
import { z } from "zod";

/**
 * Governance Diagnostics & Dashboard Routes
 * @owner governance
 * @module governance
 * @since 2026-03-31
 */

import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port';
import { getGovernanceDiagnostics } from '../diagnostics/governance-diagnostics.service';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('governance'));
router.use(auditMiddleware('governance'));

router.get('/diagnostics', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await getGovernanceDiagnostics(req.tenantId);
  res.json({ success: true, data: result });
}));

export default router;
