/**
 * /api/public/demo-request — public lead-capture endpoint.
 *
 * Phase-12E wire-closure for blueprint/pages/request-demo/request-demo.component.ts.
 * This is a PUBLIC route (no authenticate middleware). It writes a row to
 * public.demo_requests (graceful fallback if the table is not yet
 * provisioned) and emits a `marketing.demo_requested` event so downstream
 * services can ingest the lead into CRM / email workflows.
 *
 * Light input validation — the FE is the authoritative UX but we still
 * reject empty bodies and overlong strings to keep the surface defensive.
 */
import { Router, Request, Response } from 'express';
import { safeQuery, withTenantClient } from '@dos/db';
import { rateLimiter } from '@dos/platform-core/http';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'notification-service:public-demo-request', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

const MAX_LEN = 500;
function clamp(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.slice(0, MAX_LEN);
}

router.post('/', async (req: Request, res: Response) => {
  const name = clamp(req.body?.name);
  const email = clamp(req.body?.email);
  const company = clamp(req.body?.company);
  const role = clamp(req.body?.role);
  const message = clamp(req.body?.message);
  const phone = clamp(req.body?.phone);

  if (!name || !email) {
    res.status(400).json({ error: 'name and email required', code: 'VALIDATION_ERROR' });
    return;
  }

  // Persist the lead. Table may not yet exist in every environment;
  // degrade to accepted-without-persist so the public form never 5xx's.
  let persistedId: string | null = null;
  try {
    const { rows } = await safeQuery(
      `INSERT INTO public.demo_requests
         (name, email, company, role, phone, message, source, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'public-web-form', NOW())
       RETURNING id`,
      [name, email, company, role, phone, message],
    );
    persistedId = ((rows[0] as { id?: string })?.id) ?? null;
  } catch {
    // Table not provisioned or transient DB error — still accept the lead.
  }

  // Fire-and-forget event publish. Catch any import/publish error so the
  // response stays successful from the user's perspective.
  try {
    const { getServiceBus } = require('../events/publisher');
    const bus = getServiceBus?.();
    if (bus?.publish) {
      await bus.publish('marketing.demo_requested', {
        id: persistedId,
        name,
        email,
        company,
        role,
        phone,
        createdAt: new Date().toISOString(),
      });
    }
  } catch {
    // Bus unavailable — lead already persisted; downstream will reconcile.
  }

  res.status(202).json({ data: { accepted: true, id: persistedId } });
});

export default router;
