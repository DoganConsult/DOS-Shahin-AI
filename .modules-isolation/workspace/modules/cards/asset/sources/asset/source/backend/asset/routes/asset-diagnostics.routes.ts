import { Request, Response, Router } from 'express';
import { z } from "zod";

/**
 * Asset Diagnostics Routes
 * @owner asset
 * @module asset
 * @since 2026-03-31
 */

import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port';
import { AssetDiagnosticsService } from '../diagnostics/asset-diagnostics.service';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('asset'));
router.use(auditMiddleware('asset'));

const diagnostics = new AssetDiagnosticsService();

router.get('/diagnostics', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await diagnostics.runDiagnostics(req.tenantId!);
  res.json({ success: true, data: result });
}));

export default router;
