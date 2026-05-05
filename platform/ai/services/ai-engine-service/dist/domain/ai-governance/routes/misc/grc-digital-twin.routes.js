import { Router } from 'express';
/**
 * GRC Digital Twin API Routes — Pillar 7b
 *
 * Endpoints for "what if" simulation scenarios:
 *   POST /simulate/framework    — Framework adoption impact analysis
 *   POST /simulate/org-change   — Organizational change impact analysis
 *   POST /simulate/monte-carlo  — Monte Carlo compliance timeline projection
 */
import { authenticate, requirePermission } from '../../ports/auth.port';
import { validate, auditMiddleware, asyncHandler, moduleStack, mutationEventHook } from '../../ports/middleware.port';
import { createFrameworkBody, createOrgChangeBody, createMonteCarloBody } from '../../schemas/ai-governance.schemas';
import { simulateFrameworkAdoption, simulateOrgChange, monteCarloComplianceProjection, } from '../../services/misc/grc-digital-twin.service';
import { z } from "zod";
const router = Router();
router.use(moduleStack('ai-governance'));
router.use(auditMiddleware('ai-governance'));
router.use(mutationEventHook('ai-governance'));
// All GRC Digital Twin endpoints require authentication and ai-governance:read
router.use(authenticate);
router.post('/simulate/framework', requirePermission('ai.governance.write'), validate({ body: createFrameworkBody }), asyncHandler(async (req, res) => {
    const { frameworkCode, frameworkName, controlCount, deadline } = req.body;
    if (!frameworkCode || !controlCount) {
        res.status(400).json({ error: 'frameworkCode and controlCount required' });
        return;
    }
    const result = await simulateFrameworkAdoption(req.tenantId, {
        frameworkCode,
        frameworkName: frameworkName || frameworkCode,
        controlCount: Number(controlCount),
        deadline,
    });
    res.json(result);
}));
router.post('/simulate/org-change', requirePermission('ai.governance.write'), validate({ body: createOrgChangeBody }), asyncHandler(async (req, res) => {
    const { changeType, description, additionalEmployees, additionalLocations, newSectors } = req.body;
    if (!changeType || !description) {
        res.status(400).json({ error: 'changeType and description required' });
        return;
    }
    const result = await simulateOrgChange(req.tenantId, {
        changeType,
        description,
        additionalEmployees,
        additionalLocations,
        newSectors,
    });
    res.json(result);
}));
router.post('/simulate/monte-carlo', requirePermission('ai.governance.read'), validate({ body: createMonteCarloBody }), asyncHandler(async (req, res) => {
    const { targetScore, iterations } = req.body;
    if (!targetScore) {
        res.status(400).json({ error: 'targetScore required' });
        return;
    }
    const result = await monteCarloComplianceProjection(req.tenantId, {
        targetScore: Number(targetScore),
        iterations: Number(iterations || 1000),
    });
    res.json(result);
}));
export default router;
let genericPayloadSchema = z.record(z.unknown());
//# sourceMappingURL=grc-digital-twin.routes.js.map