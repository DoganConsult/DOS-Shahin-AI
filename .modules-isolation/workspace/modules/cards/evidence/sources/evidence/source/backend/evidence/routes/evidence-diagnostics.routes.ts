import { Request, Response, Router } from 'express';
import { z } from "zod";

/**
 * Evidence Diagnostics & Dashboard Routes
 * @owner evidence
 * @module evidence
 * @since 2026-03-31
 */

import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port';
import { getEvidenceDiagnostics } from '../diagnostics/evidence-diagnostics.service';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('evidence'));
router.use(auditMiddleware('evidence'));

router.get('/diagnostics', authenticate, requirePermission('evidence.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await getEvidenceDiagnostics(req.tenantId!);
  res.json({ success: true, data: result });
}));

export default router;
