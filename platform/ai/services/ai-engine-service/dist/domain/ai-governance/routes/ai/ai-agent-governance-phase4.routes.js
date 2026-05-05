import { Router } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { auditMiddleware, asyncHandler, automationMiddleware, moduleStack } from '../../ports/middleware.port';
import { validate } from "../ports/middleware.port";
import { z } from "zod";
const router = Router();
router.use(moduleStack('ai-governance'));
router.use(auditMiddleware("ai-governance"));
router.use(automationMiddleware("ai-governance"));
router.get('/agents', authenticate, requirePermission('ai.governance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const schema = tenantSchema(req.tenantId);
    const result = await safeQuery(`SELECT agent_id, status, trust_score, total_runs, last_run_at FROM "${schema}".agent_runtime_config ORDER BY agent_id`);
    res.json(result.rows);
}));
router.get('/audit-trail', authenticate, requirePermission('ai.governance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const schema = tenantSchema(req.tenantId);
    const result = await safeQuery(`SELECT id, agent_id, action_type, summary, created_at FROM "${schema}".decision_record ORDER BY created_at DESC LIMIT 50`);
    res.json(result.rows);
}));
export default router;
//# sourceMappingURL=ai-agent-governance-phase4.routes.js.map