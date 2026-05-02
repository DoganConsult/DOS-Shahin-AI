import { Request as _Request, Response as _Response, Router } from 'express';

import { authenticate, requirePermission } from '../../ports/auth.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';

import { asyncHandler, moduleStack } from '../../ports/middleware.port';
import { validate } from "../ports/middleware.port";
import { z } from "zod";

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(moduleStack('ai'));

router.get('/', authenticate, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const result = await safeQuery(`SELECT id, experiment_name, model_id, status, metrics, created_at FROM "${schema}".ai_model_experiments ORDER BY created_at DESC LIMIT 50`);
  res.json(result.rows);
}));

export default router;
