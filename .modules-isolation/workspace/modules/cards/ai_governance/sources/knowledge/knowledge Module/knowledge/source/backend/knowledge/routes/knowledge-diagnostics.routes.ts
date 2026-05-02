import { Router } from 'express';
import { z } from "zod";

import { authenticate, requirePermission } from '../ports/auth.port';

import { asyncHandler } from '../ports/middleware.port';
import { runDiagnostics } from '../diagnostics/knowledge-diagnostics.service';
import { validate } from "../ports/middleware.port";
const router = Router();

router.get('/', authenticate, requirePermission('knowledge.category.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: any, res: any) => {
  const result = await runDiagnostics(req.tenantId);
  res.json(result);
}));

export default router;
