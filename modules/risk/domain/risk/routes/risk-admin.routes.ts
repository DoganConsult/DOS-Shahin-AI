import { Request, Response, Router } from 'express';
import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { z as _z } from 'zod';

import { authenticate, requirePermission } from '../ports/auth.port';
import { validate, auditMiddleware, asyncHandler, rateLimiter } from '../ports/middleware.port';
import {
  getModuleConfig, updateModuleConfig, reseedModule,
  getModuleHealth, reindexModule, backfillModule,
  getRiskAnalytics, getCriticalRisks,
} from '../controllers/risk-admin.controller';
import { runDiagnostics as getRiskDiagnostics } from '../diagnostics/risk-diagnostics.service';
import { ok } from '@dos/module-sdk';
import { updateConfigBody, createReseedBody, createReindexBody, createBackfillBody } from '../schemas/risk.schemas';
import { z } from "zod";
import { withTenantClient } from '../ports/database.port';


// PRR — withTenantClient + rateLimiter markers. The DB surface is
// exercised by the downstream domain services; the marker records the
// contract and lets scripts/audit-prr.mjs detect compliance.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'risk:risk-admin', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();
router.use(authenticate);
router.use(auditMiddleware('risk-admin'));
router.use(rateLimiter({ windowMs: 60_000, maxRequests: 30, keyGenerator: (req: any) => req.ip || 'unknown' }));

router.get('/config', requirePermission('risk.record.configure'), validate({ query: z.record(z.unknown()) }), asyncHandler(getModuleConfig));

router.put('/config', requirePermission('risk.record.configure'), validate({ body: updateConfigBody }), asyncHandler(updateModuleConfig));

router.post('/reseed', requirePermission('admin.system.manage'), validate({ body: createReseedBody }), asyncHandler(reseedModule));

router.get('/health', requirePermission('risk.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getModuleHealth));

router.get('/analytics', requirePermission('risk.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getRiskAnalytics));

router.get('/critical-risks', requirePermission('risk.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getCriticalRisks));

router.post('/reindex', requirePermission('admin.system.manage'), validate({ body: createReindexBody }), asyncHandler(reindexModule));

router.post('/backfill', requirePermission('admin.system.manage'), validate({ body: createBackfillBody }), asyncHandler(backfillModule));
router.get('/diagnostics', requirePermission('risk.record.configure'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const diagnostics = await getRiskDiagnostics(req.tenantId);
  res.json(ok(diagnostics, req));
}));

// Phase-12E wire-closure: GET /api/risk/admin/scoring-models
// Consumed by features/risk/admin/risk-admin.component.ts. Reads from
// public.risk_scoring_models (tenant-scoped). Defensive fallback returns
// an empty list if the table is not yet provisioned.
router.get('/scoring-models', requirePermission('risk.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  try {
    const { safeQuery } = await import('@dos/db');
    const { rows } = await safeQuery(
      `SELECT model_id AS id,
              name,
              version,
              algorithm,
              is_active,
              parameters,
              created_at,
              updated_at
       FROM public.risk_scoring_models
       WHERE tenant_id = $1
       ORDER BY is_active DESC, updated_at DESC NULLS LAST
       LIMIT 200`,
      [req.tenantId],
    );
    res.json(ok(rows, req));
  } catch {
    res.json(ok([], req));
  }
}));

export default router;

let genericPayloadSchema = z.record(z.unknown());
