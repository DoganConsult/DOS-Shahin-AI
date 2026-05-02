import { Request as _Request, Response as _Response, Router } from 'express';

import { authenticate, requirePermission } from '../../ports/auth.port';
import { getRuntimeHealthSummary } from '../../services/agents/core/ai-agent-runtime.service';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';

import { asyncHandler, moduleStack } from '../../ports/middleware.port';
import { validate } from "../ports/middleware.port";
import { z } from "zod";

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(moduleStack('ai'));

router.get('/', authenticate, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const health = await getRuntimeHealthSummary(tenantId);
  res.json(health);
}));

export default router;
