import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — Regulatory Delta Routes
// Regulatory framework change detection
// ============================================


import { authenticate, requirePermission } from '../../../../ports/auth.port';
import {
  scanAllInstruments,
  getDeltaHistory,
  getTenantDeltaImpacts,
  markImpactResolved,
} from '../../../services/regulatory-delta.service';
import { emitEvent } from '../../../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
/** Zod schemas for regulatory-delta route validation */
const resolveImpactBody = z.object({}).passthrough();

import { auditMiddleware, setAuditData, automationMiddleware, validate, moduleStack } from '../../../../ports/middleware.port';
import { swallow, EC } from '../../../../ports/resilience.port';

import { createScanBody } from '../../../../schemas/compliance.schemas';

const router = Router();
router.use(moduleStack('compliance'));
router.use(auditMiddleware("compliance"));
router.use(automationMiddleware("compliance"));

// POST /scan — Scan all instruments for regulatory changes
router.post("/scan", authenticate, requirePermission("framework.record.write"), validate({ body: createScanBody }), async (req: Request, res: Response) => {
  const result = await scanAllInstruments();
  setAuditData(res as any, { action: "create", entityType: "regulatory_delta_scan", entityId: "scan", afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId! || req.user?.tenantId || '', userId: req.user!.userId!, module: 'compliance', event: 'created', entityType: 'regulatory_delta_scan', entityId: 'scan' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:compliance.regulatory_delta_scan.created' });
  res.json(result);
});

// GET /history — Get delta history, optionally filtered by instrumentId
router.get("/history", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const instrumentId = req.query.instrumentId as string | undefined;
  const limit = parseInt(req.query.limit as string) || 50;
  const history = await getDeltaHistory(instrumentId, limit);
  res.json({ deltas: history, count: history.length });
});

// GET /impacts — Get regulatory delta impacts for the current tenant
router.get("/impacts", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const limit = parseInt(req.query.limit as string) || 50;
  const impacts = await getTenantDeltaImpacts(tenantId, limit);
  res.json({ impacts, count: impacts.length });
});

// PATCH /impacts/:id/resolve — Mark a delta impact as resolved
router.patch("/impacts/:id/resolve", authenticate, requirePermission("framework.record.write"), validate({ body: resolveImpactBody }), async (req: Request, res: Response) => {
  const resolved = await markImpactResolved(req.params.id);
  if (!resolved) {
    res.status(404).json({ error: "Impact not found" });
    return;
  }
  setAuditData(res as any, { action: "update", entityType: "regulatory_delta_impact", entityId: req.params.id, afterState: resolved });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId! || req.user?.tenantId || '', userId: req.user!.userId!, module: 'compliance', event: 'updated', entityType: 'regulatory_delta_impact', entityId: req.params.id } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:compliance.regulatory_delta_impact.updated' });
  res.json(resolved);
});

export default router;

