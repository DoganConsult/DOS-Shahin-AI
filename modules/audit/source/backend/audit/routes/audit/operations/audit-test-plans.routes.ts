import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());


import { authenticate, requirePermission } from '../../../ports/auth.port';
import {
  listTestPlans,
  createTestPlan,
  updateTestResult,
  getControlCoverage,
} from '../../../services/audit/execution/audit-test-plans.service';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';

// ── Zod Schemas ──────────────────────────────────────────────────────
const createTestPlanBody = z.object({
  auditId: z.string().min(1),
  controlId: z.string().min(1),
  testProcedure: z.string().min(1),
}).passthrough();

const updateTestResultBody = z.object({
  status: z.string().min(1),
  resultNotes: z.string().optional(),
  testedBy: z.string().optional(),
}).passthrough();

const idParam = z.object({ id: z.string().min(1) });

import { validate, auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '../../../ports/resilience.port';

const router = Router();
router.use(moduleStack('audit'));
router.use(auditMiddleware("audit"));
router.use(automationMiddleware("audit"));

// GET /audit/:auditId - Get test plans by audit
router.get("/audit/:auditId", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("audit.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { auditId } = req.params;
  const items = await listTestPlans(tenantId, auditId);
  res.json({ items, count: items.length });
});

// POST / - Create test plan
router.post("/", authenticate, requirePermission("audit.record.manage"), validate({ body: createTestPlanBody }), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const data = req.body;
  const result = await createTestPlan(tenantId, data);
  setAuditData(res as any, { action: "create", entityType: "test_plan", entityId: result.id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'created', entityType: 'audit_test_plans', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_test_plans.created' });
  res.status(201).json(result);
});

// PUT /:id/result - Update test plan result
router.put("/:id/result", authenticate, requirePermission("audit.record.manage"), validate({ params: idParam, body: updateTestResultBody }), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { id } = req.params;
  const data = req.body;
  const result = await updateTestResult(tenantId, id, data.status, data.resultNotes, data.testedBy);
  if (!result) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  setAuditData(res as any, { action: "update", entityType: "test_plan", entityId: id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'updated', entityType: 'audit_test_plans', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_test_plans.updated' });
  res.json(result);
});

// GET /audit/:auditId/coverage - Get test plan coverage for an audit
router.get("/audit/:auditId/coverage", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("audit.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { auditId } = req.params;
  const result = await getControlCoverage(tenantId, auditId);
  res.json(result);
});

export default router;

