import { Request, Response, Router } from 'express';
import { z } from "zod";

/**
 * Remediation Diagnostics Routes
 * @owner remediation
 * @module remediation
 * @since 2026-03-31
 */

import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port';
import { RemediationDiagnosticsService } from '../diagnostics/remediation-diagnostics.service';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('remediation'));
router.use(auditMiddleware('remediation'));

const diagnostics = new RemediationDiagnosticsService();

router.get('/diagnostics', authenticate, requirePermission('remediation.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await diagnostics.runDiagnostics(req.tenantId!);
  res.json({ success: true, data: result });
}));

export default router;
