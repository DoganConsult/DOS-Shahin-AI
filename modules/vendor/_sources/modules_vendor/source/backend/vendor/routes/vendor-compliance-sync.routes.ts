import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — Vendor Compliance Sync Routes
// Trigger vendor SLA monitoring and gate validation
// ============================================


import { authenticate, requirePermission } from '../ports/auth.port';
import { runComplianceSync } from '../services/vendor/vendor-compliance-sync.service';
import { emitEvent } from '../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
// ── Zod Validation Schemas ──
import { auditMiddleware, setAuditData, validate, moduleStack } from '../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { createRunBody } from "../schemas/vendor.schemas";

const router = Router();
router.use(moduleStack('vendor'));
router.use(auditMiddleware("compliance"));

// POST /run — Run the vendor compliance sync cycle
router.post("/run", authenticate, requirePermission("vendor.record.manage"), validate({ body: createRunBody }), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const result = await runComplianceSync(tenantId);
  setAuditData(res as any, { action: "create", entityType: "vendor_compliance_sync", entityId: tenantId, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'compliance', event: 'created', entityType: 'vendor_compliance_sync', entityId: tenantId } as any)), { tenantId: tenantId, operation: 'grcEvent:compliance.vendor_compliance_sync.created' });
  res.json(result);
});

export default router;

