import { Request, Response, Router } from 'express';
import { z } from "zod";

/**
 * Privacy Diagnostics Routes
 * @owner privacy
 * @module privacy
 * @since 2026-03-31
 */

import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port';
import { PrivacyDiagnosticsService } from '../diagnostics/privacy-diagnostics.service';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('privacy'));
router.use(auditMiddleware('privacy'));

const diagnostics = new PrivacyDiagnosticsService();

router.get('/diagnostics', authenticate, requirePermission('privacy.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await diagnostics.runDiagnostics(req.tenantId!);
  res.json({ success: true, data: result });
}));

export default router;
