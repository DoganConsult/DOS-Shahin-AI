import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
import { authenticate, requirePermission } from '../../../ports/auth.port';
import {
  syncFindingToRiskRegister,
  linkToComplianceViolation,
  getIntegrationStatus,
} from '../../../services/audit/operations/audit-cross-module.service';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';

// ── Zod Schemas ──────────────────────────────────────────────────────
const syncToRiskBody = z.object({
  findingId: z.string().min(1),
}).passthrough();

const linkComplianceBody = z.object({
  findingId: z.string().min(1),
  violationId: z.string().min(1),
}).passthrough();

import { validate, auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '../../../ports/resilience.port';

const router = Router();
router.use(moduleStack('audit'));
router.use(auditMiddleware("audit"));
router.use(automationMiddleware("audit"));

// POST /sync-to-risk - Sync audit finding to risk module
router.post("/sync-to-risk", authenticate, requirePermission("audit.record.manage"), validate({ body: syncToRiskBody }), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { findingId } = req.body;
  const result = await syncFindingToRiskRegister(tenantId, findingId);
  setAuditData(res as any, { action: "create", entityType: "cross_module_sync", afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'created', entityType: 'audit_cross_module', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_cross_module.created' });
  res.status(201).json(result);
});

// POST /link-compliance - Link audit finding to compliance violation
router.post("/link-compliance", authenticate, requirePermission("audit.record.manage"), validate({ body: linkComplianceBody }), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { findingId, violationId } = req.body;
  const result = await linkToComplianceViolation(tenantId, findingId, violationId);
  setAuditData(res as any, { action: "create", entityType: "cross_module_link", afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'created', entityType: 'audit_cross_module', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_cross_module.created' });
  res.status(201).json(result);
});

// GET /status - Get cross-module integration status
router.get("/status", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("audit.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const result = await getIntegrationStatus(tenantId);
  res.json(result);
});

export default router;

