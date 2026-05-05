// @ts-nocheck
import { Router } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { listPolicyRules, createPolicyRule, deletePolicyRule, togglePolicyRule } from '../../services/governance/ai-policy-rule.service';
// ── Zod Schemas ──────────────────────────────────────────────────────────
import { auditMiddleware, validate, asyncHandler, moduleStack, mutationEventHook } from '../../ports/middleware.port';
import { rulesPostBody, rulesRuleIdTogglePatchBody } from "../../schemas/ai.schemas";
import { z } from "zod";
const router = Router();
router.use(moduleStack('ai'));
router.use(mutationEventHook('ai'));
router.use(auditMiddleware('ai'));
router.get('/rules', authenticate, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const result = await listPolicyRules(req.tenantId);
    res.json(result);
}));
router.post('/rules', authenticate, requirePermission('ai.agent.write'), validate({ body: rulesPostBody }), asyncHandler(async (req, res) => {
    const result = await createPolicyRule(req.tenantId, req.body);
    res.status(201).json(result);
}));
router.delete('/rules/:ruleId', authenticate, requirePermission('ai.agent.write'), validate({ body: genericPayloadSchema }), asyncHandler(async (req, res) => {
    await deletePolicyRule(req.tenantId, req.params.ruleId);
    res.json({ deleted: true });
}));
router.patch('/rules/:ruleId/toggle', authenticate, requirePermission('ai.agent.write'), validate({ body: rulesRuleIdTogglePatchBody }), asyncHandler(async (req, res) => {
    const result = await togglePolicyRule(req.tenantId, req.params.ruleId, req.body.enabled !== false);
    res.json(result);
}));
export default router;
let genericPayloadSchema = z.record(z.unknown());
//# sourceMappingURL=ai-policy.routes.js.map