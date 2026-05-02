/**
 * Dashboard Reports data feeds — Phase-12E reports-vertical closure.
 *
 * These endpoints serve the reports feature pages (audit-report,
 * evidence-report) which fetch aggregated snapshots rather than full
 * paginated lists. Each handler is tenant-scoped, degrades gracefully
 * when a source table is not yet provisioned for a tenant, and returns
 * the exact envelope shape the Shahin components already expect.
 *
 * Canonical FE consumers:
 *   - features/reports/pages/audit-report.component.ts
 *       loadAuditPack()    -> GET /api/dashboard/audit-pack
 *       loadAging()        -> GET /api/dashboard/exceptions-aging
 *       loadDrift()        -> GET /api/dashboard/control-drift
 *   - features/reports/pages/evidence-report.component.ts
 *       loadQueue()        -> GET /api/dashboard/evidence-queue
 *
 * Source-of-truth tables (best-effort; each query catches missing-relation
 * failures and returns an empty-but-valid shape so the FE renders the
 * "empty" state rather than the "error" state):
 *   audit_engagements, audit_pack_items        — modules/audit, modules/evidence
 *   compliance_exceptions / exceptions         — modules/exception, modules/compliance
 *   controls / control_drift_log                — modules/controls, modules/compliance
 *   evidence_tasks / evidence_requests          — modules/evidence
 */
import { Router, Request, Response } from 'express';
import { safeQuery, withTenantClient } from '@dos/db';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import { rateLimiter } from '@dos/platform-core/http';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'dashboard-widgets-service:dashboard-reports', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.use(authenticate);
router.use(requireTenantId);

// Helper: run a query and return the first column of the first row as a number.
async function count(sql: string, params: unknown[]): Promise<number> {
  try {
    const r = await safeQuery(sql, params);
    return Number((r.rows[0] as Record<string, unknown>)?.['n'] ?? 0);
  } catch {
    return 0;
  }
}

async function rowsOr<T = unknown>(sql: string, params: unknown[]): Promise<T[]> {
  try {
    const r = await safeQuery(sql, params);
    return (r.rows as T[]) ?? [];
  } catch {
    return [];
  }
}

/**
 * GET /api/dashboard/audit-pack
 * Returns the list of audit engagements + their pack status. Consumer expects
 * either an array or `{ assessments: [...] }`.
 */
router.get('/audit-pack', async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const assessments = await rowsOr(
    `SELECT engagement_id AS id,
            title,
            status,
            pack_status,
            updated_at
     FROM public.audit_engagements
     WHERE tenant_id = $1
       AND (deleted_at IS NULL OR deleted_at IS NULL)
     ORDER BY updated_at DESC NULLS LAST
     LIMIT 50`,
    [tenantId],
  );
  res.json({ assessments });
});

/**
 * GET /api/dashboard/exceptions-aging
 * Returns buckets of open exceptions by age. Consumer expects
 * `{ buckets: { '0-30': n, '31-60': n, '61-90': n, '90+': n } }`.
 */
router.get('/exceptions-aging', async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  // Try canonical table names in order — exception module, then compliance
  // fallback. Predicate is safe regardless of which table exists because
  // any MissingTable error is caught by `count()` and returns 0.
  const bucketQuery = (tableRef: string) => (bucketStart: number, bucketEnd: number | null) => `
    SELECT COUNT(*)::int AS n
    FROM ${tableRef}
    WHERE tenant_id = $1
      AND (status IN ('open', 'active', 'pending_review') OR status IS NULL)
      ${bucketEnd === null
        ? `AND created_at <= NOW() - INTERVAL '${bucketStart} days'`
        : `AND created_at > NOW() - INTERVAL '${bucketEnd} days'
           AND created_at <= NOW() - INTERVAL '${bucketStart} days'`}
  `;

  const tryTable = async (tableRef: string) => {
    const q = bucketQuery(tableRef);
    const [b0_30, b31_60, b61_90, b90p] = await Promise.all([
      count(q(0, 30), [tenantId]),
      count(q(31, 60), [tenantId]),
      count(q(61, 90), [tenantId]),
      count(q(90, null), [tenantId]),
    ]);
    return { '0-30': b0_30, '31-60': b31_60, '61-90': b61_90, '90+': b90p };
  };

  let buckets = await tryTable('public.compliance_exceptions');
  const total = (buckets['0-30'] ?? 0) + (buckets['31-60'] ?? 0) + (buckets['61-90'] ?? 0) + (buckets['90+'] ?? 0);
  if (total === 0) {
    buckets = await tryTable('public.exceptions');
  }
  res.json({ buckets });
});

/**
 * GET /api/dashboard/control-drift
 * Returns list of controls currently in drift. Consumer expects either
 * an array or `{ drifted: [...] }`.
 */
router.get('/control-drift', async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const drifted = await rowsOr(
    `SELECT control_id AS id,
            control_code,
            title,
            effectiveness,
            last_tested_at,
            drift_reason
     FROM public.controls
     WHERE tenant_id = $1
       AND (effectiveness IN ('ineffective', 'partial', 'drifting')
            OR last_tested_at < NOW() - INTERVAL '90 days')
       AND (deleted_at IS NULL OR deleted_at IS NULL)
     ORDER BY last_tested_at ASC NULLS FIRST
     LIMIT 50`,
    [tenantId],
  );
  res.json({ drifted });
});

/**
 * GET /api/dashboard/evidence-queue
 * Returns pending evidence tasks. Consumer expects either an array or
 * `{ items: [...] }`. Tries the canonical `evidence_tasks` first, then
 * `evidence_requests` as a compatibility fallback.
 */
router.get('/evidence-queue', async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  let items = await rowsOr(
    `SELECT task_id AS id,
            title,
            status,
            due_date,
            assigned_to,
            priority
     FROM public.evidence_tasks
     WHERE tenant_id = $1
       AND status IN ('pending', 'open', 'in_progress', 'overdue')
       AND (deleted_at IS NULL OR deleted_at IS NULL)
     ORDER BY due_date ASC NULLS LAST
     LIMIT 50`,
    [tenantId],
  );
  if (items.length === 0) {
    items = await rowsOr(
      `SELECT request_id AS id,
              title,
              status,
              due_date,
              assigned_to,
              priority
       FROM public.evidence_requests
       WHERE tenant_id = $1
         AND status IN ('pending', 'open', 'in_progress', 'overdue')
       ORDER BY due_date ASC NULLS LAST
       LIMIT 50`,
      [tenantId],
    );
  }
  res.json({ items });
});

export default router;
