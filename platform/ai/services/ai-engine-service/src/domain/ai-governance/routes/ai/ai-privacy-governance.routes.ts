import { Request as _Request, Response as _Response, Router } from 'express';

import { authenticate, requirePermission } from '../../ports/auth.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';

import { auditMiddleware, asyncHandler, automationMiddleware, moduleStack } from '../../ports/middleware.port';
import { validate } from "../ports/middleware.port";
import { z } from "zod";

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(moduleStack('ai-governance'));
router.use(auditMiddleware("ai-governance"));
router.use(automationMiddleware("ai-governance"));

router.get('/assessments', authenticate, requirePermission('ai.governance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const result = await safeQuery(`SELECT id, system_id, privacy_risk_level, data_types_processed, processing_purpose, legal_basis, dpia_required, dpia_completed FROM "${schema}".ai_privacy_impact_register ORDER BY id DESC`);
  res.json(result.rows);
}));

export default router;
