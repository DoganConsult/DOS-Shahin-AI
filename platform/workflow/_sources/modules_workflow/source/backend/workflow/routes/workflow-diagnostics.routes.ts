import { Request, Response, Router } from 'express';

/**
 * Workflow Diagnostics Routes
 * @owner workflow
 * @module workflow
 * @since 2026-03-31
 */

import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { validate } from "../ports/middleware.port";
import { z } from "zod";

const router = Router();
router.use(moduleStack('workflow'));
router.use(auditMiddleware('workflow'));

router.get('/diagnostics', authenticate, requirePermission('workflow.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const checks: { name: string; passed: boolean; detail?: string }[] = [];
  
  const { rows: tableRows } = await safeQuery(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name LIKE 'workflow%'`, [schema]
  ).catch(() => ({ rows: [] }));
  checks.push({ name: 'workflow_tables_exist', passed: tableRows.length > 0, detail: `${tableRows.length} tables found` });
  
  res.json({ success: true, data: { moduleCode: 'workflow', healthy: checks.every(c => c.passed), checks, checkedAt: new Date().toISOString() } });
}));

export default router;
