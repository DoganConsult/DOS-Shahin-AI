import { Request, Response, Router } from 'express';

import { authenticate, requirePermission } from '../../ports/auth.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';

import { asyncHandler, moduleStack } from '../../ports/middleware.port';
import { validate } from "../ports/middleware.port";
import { z } from "zod";

const router = Router();
router.use(moduleStack('workflow'));

router.get('/statuses', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'), async (_req: Request, res: Response) => {
  res.json(['draft', 'active', 'paused', 'completed', 'cancelled']);
});

router.get('/templates', authenticate, requirePermission('workflow.instance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(`SELECT id, name, description, status FROM "${schema}".workflow_templates ORDER BY name`);
  res.json(result.rows);
}));

export default router;
