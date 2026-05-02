import { Request as _Request, Response as _Response, Router } from 'express';

import { authenticate, requirePermission } from '../../ports/auth.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';

import { asyncHandler, moduleStack } from '../../ports/middleware.port';
import { validate } from "../ports/middleware.port";
import { z } from "zod";

const router = Router();
router.use(moduleStack('workflow'));

router.get('/analytics', authenticate, requirePermission('workflow.instance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(`SELECT status, COUNT(*) as count FROM "${schema}".workflow_instances GROUP BY status`);
  res.json(result.rows);
}));

export default router;
