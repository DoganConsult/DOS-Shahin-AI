import { Router } from 'express';
/**
 * Ai Diagnostics & Dashboard Routes
 * @owner ai
 * @module ai
 * @since 2026-03-31
 */
import { authenticate, requirePermission } from '../ports/auth.port.js';
import { auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port.js';
import { getAiDiagnosticsSnapshot } from '../diagnostics/ai-diagnostics.service.js';
import { validate } from "../ports/middleware.port.js";
import { z } from "zod";
const router = Router();
router.use(moduleStack('ai'));
router.use(auditMiddleware('ai'));
router.get('/diagnostics', authenticate, requirePermission('ai.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const result = await getAiDiagnosticsSnapshot(req.tenantId);
    res.json({ success: true, data: result });
}));
export default router;
//# sourceMappingURL=ai-diagnostics.routes.js.map