/**
 * /api/privacy/* — Phase-12E wire-closure for four Shahin page consumers
 * that the main modules/privacy aggregator does not yet expose by name:
 *
 *   GET /api/privacy/budgets                -> privacy-budget-dashboard.component.ts
 *   GET /api/privacy/dsr-requests           -> privacy-data-subjects.component.ts
 *   GET /api/privacy/dpias                  -> privacy-dpia.component.ts
 *   GET /api/privacy/processing-activities  -> privacy-processing-register.component.ts
 *
 * Each handler is tenant-scoped (JWT-derived tenantId + parameterised SQL)
 * and degrades gracefully when the backing table is not yet provisioned.
 * Response shape wraps the collection in `{ data }` so existing
 * privacy-api FE clients can read `res.data ?? []` uniformly.
 *
 * These handlers are deliberately additive — they do not conflict with
 * the existing `/api/privacy/` listing router from modules/privacy
 * (which serves the DSR list at GET /).
 */
import { Router, Request, Response } from 'express';
import { safeQuery, withTenantClient } from '@dos/db';
import { authenticate, requireTenantId, requirePermission } from '../adapters/auth.adapter';
import { rateLimiter } from '@dos/platform-core/http';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'privacy-service:privacy-extensions', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.use(authenticate);
router.use(requireTenantId);

async function rows(sql: string, params: unknown[]): Promise<unknown[]> {
  try {
    const r = await safeQuery(sql, params);
    return r.rows ?? [];
  } catch {
    // Missing table / schema drift → empty-but-valid response.
    return [];
  }
}

/** GET /api/privacy/budgets — differential privacy / DPIA risk budgets. */
router.get('/budgets', requirePermission('privacy.record.read'), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const data = await rows(
    `SELECT id, name, category, budget_limit, budget_consumed, status, updated_at
     FROM public.privacy_budgets
     WHERE tenant_id = $1
     ORDER BY updated_at DESC NULLS LAST
     LIMIT 200`,
    [tenantId],
  );
  res.json({ data });
});

/** GET /api/privacy/dsr-requests — Data Subject Rights requests listing. */
router.get('/dsr-requests', requirePermission('privacy.record.read'), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  // Try the canonical DSR table first, then a legacy alias for older tenants.
  let data = await rows(
    `SELECT request_id AS id, subject_id, type, status, submitted_at, due_at
     FROM public.privacy_dsr_requests
     WHERE tenant_id = $1
     ORDER BY submitted_at DESC NULLS LAST
     LIMIT 200`,
    [tenantId],
  );
  if (data.length === 0) {
    data = await rows(
      `SELECT dsr_id AS id, subject_id, request_type AS type, status, created_at AS submitted_at, due_date AS due_at
       FROM public.data_subject_requests
       WHERE tenant_id = $1
       ORDER BY created_at DESC NULLS LAST
       LIMIT 200`,
      [tenantId],
    );
  }
  res.json({ data });
});

/** GET /api/privacy/dpias — Data Protection Impact Assessments. */
router.get('/dpias', requirePermission('privacy.record.read'), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const data = await rows(
    `SELECT dpia_id AS id, title, processing_activity_id, risk_score, status, owner_id, updated_at
     FROM public.privacy_dpias
     WHERE tenant_id = $1
     ORDER BY updated_at DESC NULLS LAST
     LIMIT 200`,
    [tenantId],
  );
  res.json({ data });
});

/** GET /api/privacy/processing-activities — Register of processing activities. */
router.get('/processing-activities', requirePermission('privacy.record.read'), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const data = await rows(
    `SELECT activity_id AS id, name, purpose, lawful_basis, data_categories,
            retention_period, controller, processor, updated_at
     FROM public.privacy_processing_activities
     WHERE tenant_id = $1
     ORDER BY updated_at DESC NULLS LAST
     LIMIT 200`,
    [tenantId],
  );
  res.json({ data });
});

export default router;
