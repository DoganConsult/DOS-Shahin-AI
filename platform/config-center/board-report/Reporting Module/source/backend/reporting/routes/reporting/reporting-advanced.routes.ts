import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

import { authenticate, requirePermission } from '../../ports/auth.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';

import { asyncHandler, moduleStack, validate } from '../../ports/middleware.port';
const router = Router();
router.use(moduleStack('reporting'));

router.get('/templates', authenticate, requirePermission('report.document.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(`SELECT template_id, name, report_type, created_at FROM "${schema}".report_templates ORDER BY name`);
  res.json(result.rows);
}));

export default router;
