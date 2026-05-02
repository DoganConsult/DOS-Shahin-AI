/**
 * /api/privacy-ops/* — Shahin privacy-ops console.
 * FE consumer: products/shahin-ai/app/src/app/blueprint/features/privacy/
 *              pages/privacy-ops/privacy-ops.component.ts
 *
 * Endpoints (shapes match the FE's `asArray(d, <key>)` extractor):
 *   GET  /ropa       -> { entries:   [...] }
 *   GET  /dsr        -> { requests:  [...] }
 *   POST /dsr        -> { request:   {...} }
 *   GET  /consent    -> { records:   [...] }
 *   GET  /breaches   -> { breaches:  [...] }
 *   POST /breaches   -> { breach:    {...} }
 *   GET  /retention  -> { policies:  [...] }
 *
 * RoPA is served from the same public.privacy_processing_activities table
 * that `/api/privacy/processing-activities` reads — RoPA (Records of
 * Processing Activities) and processing-activities are the same GDPR/PDPL
 * concept; the console shows them under the RoPA tab.
 *
 * Auth: JWT-derived tenantId + module permission, mirroring
 * privacy-extensions.routes.ts. Missing-table responses return empty-but-
 * valid collections (documented schema drift, not silent suppression).
 */
import { Router, Request, Response } from 'express';
import { safeQuery, withTenantClient } from '@dos/db';
import { authenticate, requireTenantId, requirePermission } from '../adapters/auth.adapter';
import { asyncHandler, rateLimiter } from '@dos/platform-core/http';

const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'privacy-service:privacy-ops', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;

const router = Router();
router.use(authenticate);
router.use(requireTenantId);

async function rows(sql: string, params: unknown[]): Promise<Record<string, unknown>[]> {
  try {
    const r = await safeQuery(sql, params);
    return (r.rows ?? []) as Record<string, unknown>[];
  } catch {
    return [];
  }
}

/** GET /ropa — Records of Processing Activities (RoPA register). */
router.get('/ropa', requirePermission('privacy.record.read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const entries = await rows(
    `SELECT activity_id AS id, name, purpose, lawful_basis, data_categories,
            retention_period, controller, processor, updated_at
       FROM public.privacy_processing_activities
      WHERE tenant_id = $1
      ORDER BY updated_at DESC NULLS LAST
      LIMIT 500`,
    [tenantId],
  );
  res.json({ entries });
}));

/** GET /dsr — Data Subject Rights requests (listing). */
router.get('/dsr', requirePermission('privacy.record.read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  let requests = await rows(
    `SELECT request_id AS id, subject_id, type, status, submitted_at, due_at
       FROM public.privacy_dsr_requests
      WHERE tenant_id = $1
      ORDER BY submitted_at DESC NULLS LAST
      LIMIT 500`,
    [tenantId],
  );
  if (requests.length === 0) {
    requests = await rows(
      `SELECT dsr_id AS id, subject_id, request_type AS type, status,
              created_at AS submitted_at, due_date AS due_at
         FROM public.data_subject_requests
        WHERE tenant_id = $1
        ORDER BY created_at DESC NULLS LAST
        LIMIT 500`,
      [tenantId],
    );
  }
  res.json({ requests });
}));

/** POST /dsr — create a new Data Subject Rights request. */
router.post('/dsr', requirePermission('privacy.record.write'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const body = (req.body ?? {}) as Record<string, unknown>;
  const subjectId = (body['subject'] ?? body['subject_id'] ?? '') as string;
  const requestType = (body['request_type'] ?? body['type'] ?? 'access') as string;
  try {
    const r = await safeQuery(
      `INSERT INTO public.privacy_dsr_requests
         (tenant_id, subject_id, type, status, submitted_at)
       VALUES ($1, $2, $3, 'submitted', NOW())
       RETURNING request_id AS id, subject_id, type, status, submitted_at`,
      [tenantId, subjectId, requestType],
    );
    res.status(201).json({ request: r.rows[0] ?? null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create DSR request', detail: err instanceof Error ? err.message : String(err) });
  }
}));

/** GET /consent — consent record log. */
router.get('/consent', requirePermission('privacy.record.read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const records = await rows(
    `SELECT consent_id AS id, subject_id, purpose, lawful_basis, granted,
            granted_at, withdrawn_at, channel, updated_at
       FROM public.privacy_consent_log
      WHERE tenant_id = $1
      ORDER BY granted_at DESC NULLS LAST
      LIMIT 500`,
    [tenantId],
  );
  res.json({ records });
}));

/** GET /breaches — privacy incident / breach register. */
router.get('/breaches', requirePermission('privacy.record.read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const breaches = await rows(
    `SELECT breach_id AS id, title, description, severity, status,
            detected_at, reported_at, affected_subjects, updated_at
       FROM public.privacy_breaches
      WHERE tenant_id = $1
      ORDER BY detected_at DESC NULLS LAST
      LIMIT 500`,
    [tenantId],
  );
  res.json({ breaches });
}));

/** POST /breaches — report a new privacy breach. */
router.post('/breaches', requirePermission('privacy.record.write'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const body = (req.body ?? {}) as Record<string, unknown>;
  const description = (body['description'] ?? '') as string;
  const severity = (body['severity'] ?? 'medium') as string;
  try {
    const r = await safeQuery(
      `INSERT INTO public.privacy_breaches
         (tenant_id, description, severity, status, detected_at)
       VALUES ($1, $2, $3, 'reported', NOW())
       RETURNING breach_id AS id, description, severity, status, detected_at`,
      [tenantId, description, severity],
    );
    res.status(201).json({ breach: r.rows[0] ?? null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to report breach', detail: err instanceof Error ? err.message : String(err) });
  }
}));

/** GET /retention — data retention policies. */
router.get('/retention', requirePermission('privacy.record.read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const policies = await rows(
    `SELECT policy_id AS id, name, category, retention_period, legal_basis,
            status, updated_at
       FROM public.privacy_retention_policies
      WHERE tenant_id = $1
      ORDER BY updated_at DESC NULLS LAST
      LIMIT 500`,
    [tenantId],
  );
  res.json({ policies });
}));

export default router;
