import { Router } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port.js';
import { getRuntimeHealthSummary } from '../../services/agents/core/ai-agent-runtime.service.js';
import { asyncHandler, moduleStack } from '../../ports/middleware.port.js';
import { validate } from "../ports/middleware.port.js";
import { z } from "zod";
const router = Router();
router.use(moduleStack('ai'));
router.get('/', authenticate, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const health = await getRuntimeHealthSummary(tenantId);
    res.json(health);
}));
export default router;
//# sourceMappingURL=ai-agent-health.routes.js.map