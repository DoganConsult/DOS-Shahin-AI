import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

import { authenticate, requirePermission } from '../../../ports/auth.port';
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';

import { asyncHandler, moduleStack } from '../../../ports/middleware.port';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('audit'));

router.get('/findings/summary', authenticate, requirePermission('audit.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(`SELECT severity, COUNT(*) as count FROM "${schema}".findings GROUP BY severity`);
  res.json(result.rows);
}));

router.get('/timeline', authenticate, requirePermission('audit.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(`SELECT finding_id, title, severity, status, created_at FROM "${schema}".findings ORDER BY created_at DESC LIMIT 50`);
  res.json(result.rows);
}));

export default router;
