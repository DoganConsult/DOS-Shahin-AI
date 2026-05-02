import { Request, Response, Router } from 'express';
import { z } from "zod";

/**
 * Issues Diagnostics Routes
 * @owner issues
 * @module issues
 * @since 2026-03-31
 */

import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port';
import { IssuesDiagnosticsService } from '../diagnostics/issues-diagnostics.service';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('issues'));
router.use(auditMiddleware('issues'));

const diagnostics = new IssuesDiagnosticsService();

router.get('/diagnostics', authenticate, requirePermission('issues.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await diagnostics.runDiagnostics(req.tenantId!);
  res.json({ success: true, data: result });
}));

export default router;
