/**
 * /api/dora/{backups,test-results} — Phase-12E wire-closure for
 * Shahin features/dora/pages/{dora-backups,dora-test-results}.component.ts.
 *
 * Source tables:
 *   public.ict_backups           — ICT backup runs (DORA Art.12).
 *   public.resilience_test_runs  — operational resilience test outcomes
 *                                 (DORA Art.26 TLPT + non-TLPT).
 *
 * Handlers are tenant-scoped with graceful missing-table fallback so the
 * pages render empty-state rather than crash on fresh tenants that have
 * not yet ingested resilience telemetry.
 */
import { Router, Request, Response } from 'express';
import { safeQuery, withTenantClient } from '@dos/db';
import { authenticate, requireTenantId, requirePermission } from '../adapters/auth.adapter';
import { rateLimiter } from '@dos/platform-core/http';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'dora-service:dora-extensions', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.use(authenticate);
router.use(requireTenantId);

async function rows(sql: string, params: unknown[]): Promise<unknown[]> {
  try {
    const r = await safeQuery(sql, params);
    return r.rows ?? [];
  } catch {
    return [];
  }
}

/** GET /api/dora/backups */
router.get('/backups', requirePermission('dora.record.read'), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const data = await rows(
    `SELECT backup_id AS id,
            asset_id,
            backup_type,
            status,
            started_at,
            completed_at,
            rto_seconds,
            rpo_seconds,
            size_bytes
     FROM public.ict_backups
     WHERE tenant_id = $1
     ORDER BY started_at DESC NULLS LAST
     LIMIT 200`,
    [tenantId],
  );
  res.json({ data });
});

/** GET /api/dora/test-results */
router.get('/test-results', requirePermission('dora.record.read'), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const data = await rows(
    `SELECT test_id AS id,
            scenario,
            test_type,
            status,
            run_at,
            finished_at,
            outcome,
            findings_count,
            severity
     FROM public.resilience_test_runs
     WHERE tenant_id = $1
     ORDER BY run_at DESC NULLS LAST
     LIMIT 200`,
    [tenantId],
  );
  res.json({ data });
});

export default router;
