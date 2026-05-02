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
router.get('/monitoring', authenticate, requirePermission('ai.governance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const schema = tenantSchema(req.tenantId);
    const result = await safeQuery(`SELECT id, system_id, incident_type, severity, description, affected_persons_count, harm_type FROM "${schema}".ai_serious_incidents ORDER BY id DESC LIMIT 50`);
    res.json(result.rows);
}));
export default router;
//# sourceMappingURL=ai-post-market.routes.js.map