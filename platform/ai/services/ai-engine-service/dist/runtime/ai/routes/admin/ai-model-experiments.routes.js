import { Router } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port.js';
import { safeQuery, tenantSchema } from '../../ports/database.port.js';
import { asyncHandler, moduleStack } from '../../ports/middleware.port.js';
import { validate } from "../ports/middleware.port.js";
import { z } from "zod";
const router = Router();
router.use(moduleStack('ai'));
router.get('/', authenticate, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const schema = tenantSchema(req.tenantId);
    const result = await safeQuery(`SELECT id, experiment_name, model_id, status, metrics, created_at FROM "${schema}".ai_model_experiments ORDER BY created_at DESC LIMIT 50`);
    res.json(result.rows);
}));
export default router;
//# sourceMappingURL=ai-model-experiments.routes.js.map