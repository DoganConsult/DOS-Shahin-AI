import { Router } from 'express';
// ============================================
// NL Query Routes — Natural Language Query API
//
// POST /api/ai/nl/query   — Execute a NL query
// GET  /api/ai/nl/query/types — List templates
// ============================================
import { authenticate, requirePermission } from '../../ports/auth.port';
import { executeNLQuery, getAvailableQueryTypes } from '../../services/reasoning/nl-query-engine.service';
import { validate, auditMiddleware, asyncHandler, moduleStack, mutationEventHook } from '../../ports/middleware.port';
import { createQueryBody } from '../../schemas/ai.schemas';
import { z } from "zod";
const router = Router();
router.use(auditMiddleware('ai'));
router.use(moduleStack('ai'));
router.use(mutationEventHook('ai'));
/**
 * POST /query — Execute a natural language query against the
 * tenant's GRC data. Requires ai:read permission.
 */
router.post('/query', authenticate, requirePermission('ai.agent.read'), validate({ body: createQueryBody }), asyncHandler(async (req, res) => {
    const { query } = req.body;
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        res.status(400).json({ error: 'Query is required' });
        return;
    }
    if (query.length > 500) {
        res.status(400).json({ error: 'Query must be 500 characters or fewer' });
        return;
    }
    const result = await executeNLQuery(req.tenantId, query.trim());
    res.json(result);
}));
/**
 * GET /query/types — Return available query templates for
 * UI autocomplete / suggestion chips.
 */
router.get('/query/types', authenticate, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (_req, res) => {
    res.json(getAvailableQueryTypes());
}));
export default router;
let genericPayloadSchema = z.record(z.unknown());
//# sourceMappingURL=nl-query.routes.js.map