import { Request, Response, Router } from 'express';

/**
 * Ai Diagnostics & Dashboard Routes
 * @owner ai
 * @module ai
 * @since 2026-03-31
 */

import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port';
import { getAiDiagnosticsSnapshot } from '../diagnostics/ai-diagnostics.service';
import { validate } from "../ports/middleware.port";
import { z } from "zod";

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(moduleStack('ai'));
router.use(auditMiddleware('ai'));

router.get('/diagnostics', authenticate, requirePermission('ai.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await getAiDiagnosticsSnapshot(req.tenantId);
  res.json({ success: true, data: result });
}));

export default router;
