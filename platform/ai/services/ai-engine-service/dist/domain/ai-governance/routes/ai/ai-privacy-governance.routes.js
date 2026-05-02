import { Router } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port.js';
import { safeQuery, tenantSchema } from '../../ports/database.port.js';
import { auditMiddleware, asyncHandler, automationMiddleware, moduleStack } from '../../ports/middleware.port.js';
import { validate } from "../ports/middleware.port.js";
import { z } from "zod";
const router = Router();
router.use(moduleStack('ai-governance'));
router.use(auditMiddleware("ai-governance"));
router.use(automationMiddleware("ai-governance"));
router.get('/assessments', authenticate, requirePermission('ai.governance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const schema = tenantSchema(req.tenantId);
    const result = await safeQuery(`SELECT id, system_id, privacy_risk_level, data_types_processed, processing_purpose, legal_basis, dpia_required, dpia_completed FROM "${schema}".ai_privacy_impact_register ORDER BY id DESC`);
    res.json(result.rows);
}));
export default router;
//# sourceMappingURL=ai-privacy-governance.routes.js.map