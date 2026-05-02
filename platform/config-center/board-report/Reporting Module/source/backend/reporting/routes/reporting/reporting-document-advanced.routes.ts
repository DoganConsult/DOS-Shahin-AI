import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

import { authenticate, requirePermission } from '../../ports/auth.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';

import { asyncHandler, moduleStack, validate } from '../../ports/middleware.port';
const router = Router();
router.use(moduleStack('reporting'));

router.get('/report-documents/recent', authenticate, requirePermission('report.document.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(`SELECT id, title, format, created_at FROM "${schema}".generated_reports ORDER BY created_at DESC LIMIT 20`);
  res.json(result.rows);
}));

export default router;
