import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
import { authenticate, requirePermission } from '../../../ports/auth.port';
import {
  listTests,
  createTest,
  getEffectivenessRate,
} from '../../../services/audit/reporting/audit-capa-effectiveness.service';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';

// ── Zod Schemas ──────────────────────────────────────────────────────
const createCapaEffectivenessBody = z.object({
  capaId: z.string().min(1),
  testResult: z.string().min(1),
}).passthrough();

import { validate, auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '../../../ports/resilience.port';

const router = Router();
router.use(moduleStack('audit'));
router.use(auditMiddleware("audit"));
router.use(automationMiddleware("audit"));

// GET /capa/:capaId - Get CAPA effectiveness by CAPA ID
router.get("/capa/:capaId", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("audit.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { capaId } = req.params;
  const result = await listTests(tenantId, capaId);
  if (!result) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(result);
});

// POST / - Create CAPA effectiveness record
router.post("/", authenticate, requirePermission("audit.record.manage"), validate({ body: createCapaEffectivenessBody }), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const data = req.body;
  const result = await createTest(tenantId, data);
  setAuditData(res as any, { action: "create", entityType: "capa_effectiveness", entityId: result.id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'created', entityType: 'audit_capa_effectiveness', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_capa_effectiveness.created' });
  res.status(201).json(result);
});

// GET /rate - Get effectiveness ratings
router.get("/rate", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("audit.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const items = await getEffectivenessRate(tenantId);
  res.json({ items, count: items.length });
});

export default router;

