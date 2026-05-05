import { Router } from 'express';
/**
 * Ai-governance Diagnostics & Dashboard Routes
 * @owner ai-governance
 * @module ai-governance
 * @since 2026-03-31
 */
import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port';
import { getAiGovernanceDiagnostics } from '../diagnostics/ai-governance-diagnostics.service';
import { validate } from "../ports/middleware.port";
import { z } from "zod";
const router = Router();
router.use(moduleStack('ai-governance'));
router.use(auditMiddleware('ai-governance'));
router.get('/diagnostics', authenticate, requirePermission('ai-governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const result = await getAiGovernanceDiagnostics(req.tenantId);
    res.json({ success: true, data: result });
}));
export default router;
//# sourceMappingURL=ai-governance-diagnostics.routes.js.map