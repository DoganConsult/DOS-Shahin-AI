import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

import { authenticate } from '../../../ports/auth.port';
import { query as _query, safeQuery, tenantSchema } from '../../../ports/database.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';

import { asyncHandler, moduleStack, validate } from '../../../ports/middleware.port';
import { requirePermission } from "@dos/module-auth";
const router = Router();
router.use(moduleStack('compliance'));

router.get("/", authenticate, requirePermission('compliance.program.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(
  `SELECT r.regulator_id, r.name_en as regulator, r.acronym,
  COALESCE(AVG(a.score), 0) as score,
  COUNT(DISTINCT i.instrument_id) as framework_count
  FROM regulators r
  LEFT JOIN instruments i ON i.regulator_id = r.regulator_id
  LEFT JOIN "${schema}".assessments a ON a.framework_id = i.instrument_id
  WHERE r.active = TRUE
  GROUP BY r.regulator_id, r.name_en, r.acronym
  ORDER BY score DESC`
  );
  res.json({ heatmap: result.rows });
}));

export default router;
