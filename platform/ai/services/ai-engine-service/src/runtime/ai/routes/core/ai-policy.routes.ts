// @ts-nocheck
import { Request as _Request, Response as _Response, Router } from 'express';
import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience/resilient-catch';
import { z as _z } from 'zod';

import { authenticate, requirePermission } from '../../ports/auth.port';
import { listPolicyRules, createPolicyRule, deletePolicyRule, togglePolicyRule } from '../../services/governance/ai-policy-rule.service';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';

// ── Zod Schemas ──────────────────────────────────────────────────────────
import { auditMiddleware, validate, asyncHandler, moduleStack, mutationEventHook } from '../../ports/middleware.port';
import { rulesPostBody, rulesRuleIdTogglePatchBody } from "../../schemas/ai.schemas";
import { z } from "zod";

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
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
