/**
 * DOS Platform — Tenant service (clean shell, prod-reset).
 *
 * Active journey only: register → workspace, login → workspace, old-user
 * recovery → workspace.  Onboarding is quarantined and not part of this
 * service.  All endpoints are DB-backed; nothing returns fake success.
 *
 * Endpoints
 *   GET  /health, /ready
 *   POST /register      — registration (creates tenant + membership) idempotent
 *   GET  /me            — login lookup + email-fallback recovery (NEVER creates tenant)
 *   GET  /bootstrap     — real platform bootstrap (tenant status, workspace ready, version)
 *   GET  /entitlements  — real tenant entitlements (modules, default home, role-home map)
 *   GET  /permissions   — real DAuth permissions/roles for caller in their tenant
 */
import express, { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import crypto from 'node:crypto';
import { Pool } from 'pg';
import { requireGatewayOrigin } from './middleware/gateway-origin';
import { antiAbuse } from './middleware/anti-abuse';
import { createTrialBundle, getTrialSummary } from './domain/trial-bundle';
import {
  writeTuples as writeFgaTuples,
  buildRegistrationTuples,
  isOpenFgaConfigured,
  isOpenFgaEnforced,
} from './openfga';
import { startTrialLifecycleSweeper, runTrialLifecycleSweep } from './domain/trial-lifecycle';

const PORT = Number(process.env.PORT || 4002);
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('Required environment variable DATABASE_URL is not set');

const PLATFORM_VERSION = process.env.PLATFORM_VERSION || require('../package.json').version || '0.0.0';
const DEFAULT_HOME_FALLBACK = process.env.DEFAULT_HOME_ROUTE || '/workspace-home';
// Self-registration role policy (Patch 1):
// The self-registered user is the workspace ADMIN, not the owner. Owner
// is reserved for the legal representative / billing principal and is
// promoted later via a separate verified flow. Override with
// DEFAULT_REGISTRATION_ROLE; legacy DEFAULT_OWNER_ROLE still honored for
// backward compatibility.
const DEFAULT_REGISTRATION_ROLE = process.env.DEFAULT_REGISTRATION_ROLE
  || process.env.DEFAULT_OWNER_ROLE
  || 'tenant_admin';

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX || 10),
});

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '256kb' }));
app.use(morgan(process.env.LOG_FORMAT || 'combined'));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'tenant-service' }));
app.get('/ready',  async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true }); }
  catch (e) { res.status(503).json({ ok: false, error: String(e) }); }
});

// ── /metrics (Prometheus scrape) + tenant_migrations ledger refresher ──
// Self-contained so tenant-service has no @dos/platform-core dep cycle.
type _PromClient = typeof import('prom-client');
let _prom: _PromClient | null = null;
let _promRegister: import('prom-client').Registry | null = null;
let _failedGauge: import('prom-client').Gauge<string> | null = null;
let _byStatusGauge: import('prom-client').Gauge<string> | null = null;
try {
  _prom = require('prom-client') as _PromClient;
  _promRegister = new _prom.Registry();
  _prom.collectDefaultMetrics({ register: _promRegister, prefix: 'dos_tenant_svc_' });
  _failedGauge = new _prom.Gauge({
    name: 'dos_tenant_migrations_failed',
    help: 'Current failed-row count in dos.tenant_migrations, labeled by tenant_id. Should be 0.',
    labelNames: ['tenant_id'],
    registers: [_promRegister],
  });
  _byStatusGauge = new _prom.Gauge({
    name: 'dos_tenant_migrations_by_status',
    help: 'Total dos.tenant_migrations rows by status (canonical: applied, failed; legacy: verified-by-backfill, superseded-misclassified).',
    labelNames: ['status'],
    registers: [_promRegister],
  });
} catch { /* prom-client missing — /metrics will return 503 */ }

async function _refreshTenantMigrationsLedger(): Promise<void> {
  if (!_failedGauge || !_byStatusGauge) return;
  try {
    const failed = await pool.query(
      `SELECT tenant_id, count(*)::int AS n FROM dos.tenant_migrations WHERE status='failed' GROUP BY tenant_id`,
    );
    _failedGauge.reset();
    for (const r of failed.rows) _failedGauge.set({ tenant_id: String(r.tenant_id) }, Number(r.n));

    const byStatus = await pool.query(
      `SELECT status, count(*)::int AS n FROM dos.tenant_migrations GROUP BY status`,
    );
    _byStatusGauge.reset();
    for (const r of byStatus.rows) _byStatusGauge.set({ status: String(r.status) }, Number(r.n));
  } catch (err) {
    console.warn('[tenant-service] tenant_migrations refresh failed', (err as Error).message);
  }
}
setInterval(_refreshTenantMigrationsLedger, Number(process.env.TENANT_MIGRATIONS_LEDGER_REFRESH_MS || 30_000)).unref();
_refreshTenantMigrationsLedger();

app.get('/metrics', async (_req, res) => {
  if (!_promRegister) { res.status(503).type('text/plain').send('# prom-client unavailable\n'); return; }
  try {
    res.setHeader('Content-Type', _promRegister.contentType);
    res.send(await _promRegister.metrics());
  } catch {
    res.status(500).type('text/plain').send('# metrics unavailable\n');
  }
});

// ── Gateway-origin trust contract (Wave 1) ──────────────────────────────────
// Every route declared after this line is reachable ONLY when the verifier
// accepts the request as having entered through the API gateway. In dual
// mode (LEGACY_HEADER_TRUST=true, default during rollout) the verifier
// falls back to raw `x-user-*` / `x-tenant-id` headers when the signed
// token is missing. After per-service cutover the flag flips to false and
// only the signed gateway-origin token is accepted.
//
// `/health` and `/ready` are intentionally registered ABOVE this line so
// process probes (k8s liveness/readiness, load balancers) can reach them
// without authentication. They return no PII.
app.use(requireGatewayOrigin());

// ── Caller identity ─────────────────────────────────────────────────────────
//
// Wave 1 (gateway-origin trust contract): every protected route below is
// guarded by `requireGatewayOrigin` (mounted as a global middleware further
// down). That middleware verifies the HMAC-signed `x-dos-gateway-token`
// (or, in dual-mode rollout with LEGACY_HEADER_TRUST=true, falls back to
// raw `x-user-*` headers) and pins `req.principal`. After this point the
// principal is the source of truth — raw headers MUST NOT be read.
//
// `callerName` still pulls from `x-user-name` because gateway propagation
// includes it for back-compat (it's not part of the signed gateway-origin
// payload). When LEGACY_HEADER_TRUST=false this becomes optional UI data,
// not authority.
function callerName(req: Request):  string | undefined { return (req.headers['x-user-name']  as string) || undefined; }

function requireCaller(req: Request, res: Response): { sub: string; email: string; name?: string } | null {
  const p = req.principal;
  if (!p?.sub)   { res.status(401).json({ error: 'NO_CALLER' });      return null; }
  if (!p.email)  { res.status(401).json({ error: 'NO_EMAIL_CLAIM' }); return null; }
  return { sub: p.sub, email: p.email, name: callerName(req) };
}

// ── Helpers ─────────────────────────────────────────────────────────────
function newTenantId(): string {
  // 16-char varchar limit on dos.tenants.tenant_id — random 8 bytes hex.
  return crypto.randomBytes(8).toString('hex');
}
function suggestTenantCode(orgName: string | undefined, email: string): string {
  const seed = (orgName || email.split('@')[1] || email.split('@')[0] || 'tenant').toLowerCase();
  const slug = seed.replace(/[^a-z0-9]+/g, '').slice(0, 40) || 'tenant';
  return slug;
}

async function findUserBySub(sub: string) {
  const { rows } = await pool.query(
    `SELECT u.user_id, u.email, u.display_name, u.tenant_id, u.status, u.sso_provider,
            t.tenant_name, t.tenant_code, t.status AS tenant_status
       FROM dos.users u
       LEFT JOIN dos.tenants t ON t.tenant_id = u.tenant_id
      WHERE u.user_id = $1 AND u.deleted_at IS NULL
      LIMIT 1`, [sub]);
  return rows[0] || null;
}

async function findUsersByEmail(email: string) {
  const { rows } = await pool.query(
    `SELECT user_id, email, tenant_id, sso_provider
       FROM dos.users
      WHERE lower(email) = lower($1) AND deleted_at IS NULL`, [email]);
  return rows;
}

async function findActiveMembership(client: any, sub: string) {
  const { rows } = await client.query(
    `SELECT m.tenant_id, m.role_code, m.is_tenant_owner,
            t.tenant_name, t.tenant_code, t.status AS tenant_status
       FROM dos.tenant_memberships m
       JOIN dos.tenants t ON t.tenant_id = m.tenant_id
      WHERE m.user_id = $1 AND m.status = 'active'
      ORDER BY m.is_tenant_owner DESC, m.created_at ASC`, [sub]);
  return rows;
}

// ── POST /register — idempotent registration (creates tenant + membership +
//    Phase G T2 trial bundle). Phase G T7 anti-abuse middleware fires
//    BEFORE the handler: rate-limit (IP/email/domain), disposable-email
//    block, optional corporate-email gate, one-active-trial-per-domain.
app.post('/register', antiAbuse({ pool }), async (req: Request, res: Response) => {
  const c = requireCaller(req, res);
  if (!c) return;
  // Patch 1 — accept orgName from request body OR from the propagated
  // x-user-company / x-user-company-ar headers (set by auth-service from
  // the Keycloak companyNameEn/companyNameAr claims). Hard-fail when no
  // EN org name is available — silently coining a workspace from the
  // email domain (the previous behaviour) hid the broken claim chain
  // and produced names like "shahinaicom workspace" for every tenant.
  const orgName = (
    (req.body?.orgName as string | undefined)?.trim()
    || (req.headers['x-user-company'] as string | undefined)?.trim()
    || undefined
  );
  const orgNameAr = (
    (req.body?.orgNameAr as string | undefined)?.trim()
    || (req.headers['x-user-company-ar'] as string | undefined)?.trim()
    || undefined
  );
  // Toggle off via REQUIRE_ORG_NAME=false during the cutover sprint so a
  // partial KC rollout doesn't lock new tenants out of registration.
  const requireOrgName = String(process.env.REQUIRE_ORG_NAME || 'true').toLowerCase() === 'true';
  if (requireOrgName && !orgName) {
    return res.status(400).json({
      ok: false,
      error: 'ORG_NAME_REQUIRED',
      message: 'Organisation name is required. Re-register with companyNameEn collected by Keycloak, or POST /register with { orgName }.',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Resolve user by sub. If exists with active membership → return existing.
    const existingUser = await client.query(
      `SELECT user_id, tenant_id FROM dos.users WHERE user_id = $1 AND deleted_at IS NULL`,
      [c.sub],
    );
    if (existingUser.rows.length > 0) {
      const existingMems = await findActiveMembership(client, c.sub);
      if (existingMems.length > 0) {
        await client.query('COMMIT');
        const m = existingMems[0];
        return res.json({
          ok: true, idempotent: true,
          user:   { id: c.sub, email: c.email, name: c.name },
          tenant: { id: m.tenant_id, name: m.tenant_name, code: m.tenant_code, status: m.tenant_status },
          membership: { roleCode: m.role_code, isOwner: m.is_tenant_owner },
        });
      }
    }

    // 2. Create tenant.
    const tenantId   = newTenantId();
    const tenantCode = suggestTenantCode(orgName, c.email);
    // Patch 1 — when orgName is available (the new contract), use it
    // verbatim as the workspace display name. Only fall back to the legacy
    // composed name when REQUIRE_ORG_NAME=false (cutover bypass) AND no
    // orgName was supplied; this preserves backward compat without
    // generating false names like "shahinaicom workspace".
    const emailDomainRoot = ((c.email.split('@')[1] || '').split('.')[0] || '').trim();
    const tenantName = orgName
      || ((c.name || emailDomainRoot || c.email.split('@')[0]) + ' workspace');
    const schemaName = `tenant_${tenantId}`.slice(0, 60);

    await client.query(
      `INSERT INTO dos.tenants (tenant_id, tenant_code, tenant_name, schema_name, status)
         VALUES ($1, $2, $3, $4, 'active')
         ON CONFLICT (tenant_id) DO NOTHING`,
      [tenantId, tenantCode, tenantName, schemaName],
    );

    // 3. Upsert user row pinned to this tenant.
    await client.query(
      `INSERT INTO dos.users (user_id, email, display_name, full_name, tenant_id, status, email_verified, sso_provider)
         VALUES ($1, $2, $3, $3, $4, 'active', true, 'keycloak')
         ON CONFLICT (user_id) DO UPDATE
           SET email = EXCLUDED.email,
               tenant_id = COALESCE(dos.users.tenant_id, EXCLUDED.tenant_id)`,
      [c.sub, c.email, c.name || c.email, tenantId],
    );

    // 3b. Patch 1 — best-effort persist orgNameAr into the UI-OS tenant
    //     branding row so the workspace shell renders bilingual identity.
    //     Wrapped in a SAVEPOINT so a missing column / table cannot abort
    //     the registration transaction (the AR name is optional).
    if (orgNameAr) {
      try {
        await client.query('SAVEPOINT brand_ar');
        await client.query(
          `INSERT INTO dos.ui_tenant_branding (tenant_id, brand_name, is_active)
             VALUES ($1, $2, TRUE)
             ON CONFLICT (tenant_id) DO UPDATE SET brand_name = EXCLUDED.brand_name`,
          [tenantId, orgNameAr],
        );
        await client.query('RELEASE SAVEPOINT brand_ar');
      } catch (e) {
        await client.query('ROLLBACK TO SAVEPOINT brand_ar').catch(() => {});
        console.warn('[tenant-service] orgNameAr branding skipped:', (e as Error).message);
      }
    }

    // 4. Membership row — registrant is workspace ADMIN, not owner.
    //    Owner (legal rep / billing principal) is promoted later via a
    //    verified flow. is_tenant_owner stays FALSE so owner-only gates
    //    (trial conversion, billing actions) remain locked until a real
    //    owner is appointed.
    await client.query(
      `INSERT INTO dos.tenant_memberships (user_id, tenant_id, role_code, status, membership_type, is_tenant_owner)
         VALUES ($1, $2, $3, 'active', 'internal', false)
         ON CONFLICT DO NOTHING`,
      [c.sub, tenantId, DEFAULT_REGISTRATION_ROLE],
    );

    // 4b. 2026-05-05 — Bridge W2 forward-fix: write the canonical
    //     user_role_assignments row inside the SAME transaction. Pre-bridge,
    //     this row was only ever inserted by the post-callback
    //     `ensureUserRoleAssignment()` hook in oidc.routes.ts which runs
    //     after the SPA redirect — every cohort-B tenant therefore had
    //     active membership but is_active=true role assignment FALSE.
    //
    //     dos.user_role_assignments is an updatable VIEW over
    //     platform_dauth.user_role_assignments, which has the partial
    //     unique index ux_user_role_assignments_active on
    //     (tenant_id, user_id, role_code) WHERE is_active=true. The
    //     ON CONFLICT DO NOTHING path therefore collapses concurrent
    //     /register calls (same principal in two tabs) without spurious
    //     duplicate rows. Writing through the dos.* view keeps the
    //     tenant-service write surface in the dos.* contract.
    await client.query(
      `INSERT INTO dos.user_role_assignments
         (assignment_id, user_id, tenant_id, role_code, scope, granted_by, granted_at, is_active)
       VALUES ($1, $2, $3, $4, NULL, 'tenant-service:/register', now(), true)
       ON CONFLICT DO NOTHING`,
      [
        `asn_${tenantId}_${Date.now().toString(36)}`,
        c.sub, tenantId, DEFAULT_REGISTRATION_ROLE,
      ],
    );

    // 5. Activate the default product(s) so the workspace renders with a
    // populated module side-nav and KPI surface immediately. Without this,
    // /tenant-home/overview returns setupPending=true and the cockpit
    // shows an empty shell. Activation rows are idempotent.
    const defaultProducts = (process.env.DEFAULT_TENANT_PRODUCTS || 'shahin-ai,foundation')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    for (const productKey of defaultProducts) {
      await client.query(
        `INSERT INTO dos.tenant_product_activation (tenant_id, product_key, status)
           VALUES ($1, $2, 'active')
           ON CONFLICT DO NOTHING`,
        [tenantId, productKey],
      );
    }

    // 6. Phase G T2 — atomic trial bundle (trial + subscription +
    //    product entitlement + module entitlements + audit row).
    //    The trial product is the first non-foundation product in the
    //    default-products list (defaults to 'shahin-ai'). Foundation is
    //    platform DNA and gets its own informational module-entitlement row
    //    inside createTrialBundle but is never gated by entitlement.
    const TRIAL_PRODUCT_CODE = process.env.TRIAL_PRODUCT_CODE
      || defaultProducts.find((p) => p !== 'foundation')
      || 'shahin-ai';
    const signupDomain = (c.email.split('@')[1] || null)?.toLowerCase() || null;
    const bundle = await createTrialBundle(client, {
      tenantId,
      productCode: TRIAL_PRODUCT_CODE,
      ownerUserId: c.sub,
      signupDomain,
      source: 'self_registration',
      planCode: process.env.TRIAL_PLAN_CODE || 'trial',
    });

    await client.query('COMMIT');

    // 7. Patch 1 — seed canonical OpenFGA tuples for the new tenant.
    //    Done AFTER the DB commit so a temporary OpenFGA outage cannot
    //    roll back a successful registration. When OpenFGA is unconfigured
    //    in dev this is a no-op; when ENFORCE is on we surface a 503 so
    //    callers can retry instead of leaving an unauthorized tenant
    //    behind. The tuple set is bounded (6 writes) and idempotent —
    //    safe to retry from a cron sweeper if needed.
    let fgaWrite: Awaited<ReturnType<typeof writeFgaTuples>> | null = null;
    try {
      fgaWrite = await writeFgaTuples(buildRegistrationTuples({
        tenantId, userId: c.sub,
      }));
      if (fgaWrite.outcome === 'unavailable' || fgaWrite.outcome === 'error') {
        console.warn('[tenant-service] /register OpenFGA seed unavailable', fgaWrite);
        if (isOpenFgaEnforced()) {
          return res.status(503).json({
            ok: false,
            blocked: 'AUTHZ_BACKEND_DOWN',
            message: 'Tenant created but authorization seed failed; please retry.',
            tenant: { id: tenantId, name: tenantName, code: tenantCode },
          });
        }
      }
    } catch (e) {
      console.warn('[tenant-service] /register OpenFGA seed threw', (e as Error).message);
      if (isOpenFgaEnforced()) {
        return res.status(503).json({
          ok: false, blocked: 'AUTHZ_BACKEND_DOWN',
          message: 'Tenant created but authorization seed threw; please retry.',
        });
      }
    }

    return res.status(201).json({
      ok: true, idempotent: false,
      user:   { id: c.sub, email: c.email, name: c.name },
      tenant: { id: tenantId, name: tenantName, code: tenantCode, status: 'active' },
      membership: { roleCode: DEFAULT_REGISTRATION_ROLE, isOwner: false },
      authz: {
        provider: 'openfga',
        configured: isOpenFgaConfigured(),
        enforce: isOpenFgaEnforced(),
        seed: fgaWrite ?? { outcome: 'disabled', written: 0, skipped: 0, failed: 0 },
      },
      trial: {
        trialId: bundle.trialId,
        productCode: TRIAL_PRODUCT_CODE,
        status: 'trial_pending_verification',
        startsAt: bundle.trialStartsAt,
        endsAt: bundle.trialEndsAt,
        graceEndsAt: bundle.graceEndsAt,
        daysRemaining: bundle.daysRemaining,
        allowedModules: bundle.allowedModules,
      },
      subscription: {
        subscriptionId: bundle.subscriptionId,
        status: 'trialing',
        billingStatus: 'no_payment_required',
        providerMode: 'manual',
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[tenant-service] /register failed', err);
    return res.status(500).json({ error: 'REGISTRATION_FAILED' });
  } finally {
    client.release();
  }
});

// ── Phase G T4 (minimal) — trial + subscription read endpoints. ────────
// Both routes resolve the caller's active membership, then look up
// the latest trial/subscription rows for that tenant + product.
// Mounted under /trials/current and /subscription/current; the gateway
// proxies /api/trials/* and /api/subscription/* to tenant-service.
app.get('/trials/current', async (req: Request, res: Response) => {
  const c = requireCaller(req, res);
  if (!c) return;
  const client = await pool.connect();
  try {
    const mems = await findActiveMembership(client, c.sub);
    if (mems.length === 0) {
      return res.status(404).json({ error: 'NO_MEMBERSHIP' });
    }
    const tenantId = mems[0].tenant_id;
    const productCode = (req.query.productCode as string | undefined)
      || process.env.TRIAL_PRODUCT_CODE
      || 'shahin-ai';
    const summary = await getTrialSummary(client, tenantId, productCode);
    return res.json({ ok: true, productCode, ...summary });
  } catch (err) {
    console.error('[tenant-service] /trials/current failed', err);
    return res.status(500).json({ error: 'TRIAL_LOOKUP_FAILED' });
  } finally {
    client.release();
  }
});

// ── Phase G T8 — conversion path + cancellation. ────────────────────────
// `convert` swaps the trial entitlements for paid ones (same tenant_id,
// same users, same data). Subscription status flips trialing → active.
// `cancel` puts the trial in cancelled state and disables trial-source
// entitlements; Foundation (platform_dna) stays untouched.
app.post('/trials/convert', async (req: Request, res: Response) => {
  const c = requireCaller(req, res);
  if (!c) return;
  const productCode = (req.body?.productCode as string | undefined)
    || process.env.TRIAL_PRODUCT_CODE
    || 'shahin-ai';
  const planCode = (req.body?.planCode as string | undefined) || 'paid';
  const reason = (req.body?.reason as string | undefined) || null;

  const client = await pool.connect();
  try {
    const mems = await findActiveMembership(client, c.sub);
    if (mems.length === 0) {
      return res.status(404).json({ error: 'NO_MEMBERSHIP' });
    }
    const tenantId = mems[0].tenant_id;
    if (!mems[0].is_tenant_owner) {
      return res.status(403).json({ blocked: 'OWNER_REQUIRED' });
    }

    await client.query('BEGIN');
    try {
      // Find the active trial.
      const trialQ = await client.query<{ trial_id: string; status: string }>(
        `SELECT trial_id, status FROM dos.tenant_trials
          WHERE tenant_id=$1 AND product_code=$2
            AND status IN ('trial_pending_verification','trial_active','trial_expiring','trial_grace')
          ORDER BY created_at DESC LIMIT 1`,
        [tenantId, productCode]);
      if (trialQ.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ blocked: 'NO_ACTIVE_TRIAL' });
      }
      const trial = trialQ.rows[0];

      // Trial → converted, subscription → active, billing_status →
      // manually_approved (until Phase H wires a real provider).
      await client.query(
        `UPDATE dos.tenant_trials
            SET status='trial_converted', converted_at=now(), updated_at=now()
          WHERE trial_id=$1`, [trial.trial_id]);
      await client.query(
        `UPDATE dos.tenant_subscriptions
            SET status='converted', updated_at=now()
          WHERE trial_id=$1`, [trial.trial_id]);
      // Insert the post-conversion paid subscription so subsequent
      // /subscription/current reads return the active row.
      const subId = `sub_${require('node:crypto').randomBytes(12).toString('hex')}`;
      await client.query(
        `INSERT INTO dos.tenant_subscriptions
           (subscription_id, tenant_id, product_code, plan_code, status,
            billing_status, trial_id, current_period_start, current_period_end,
            provider_mode, metadata)
         VALUES ($1,$2,$3,$4,'active','manually_approved',$5,now(),NULL,'manual',$6)`,
        [subId, tenantId, productCode, planCode, trial.trial_id,
         JSON.stringify({ source: 'phase-g-t8-convert', reason })]);

      // Replace trial entitlements with paid (same rows updated in-place).
      // limits_json cleared because paid plans get full ceiling.
      await client.query(
        `UPDATE dos.tenant_module_entitlements
            SET source='paid', subscription_id=$1, limits_json='{}'::jsonb,
                ends_at=NULL, updated_at=now()
          WHERE trial_id=$2 AND source='trial' AND entitlement_status='active'`,
        [subId, trial.trial_id]);
      await client.query(
        `UPDATE dos.tenant_product_entitlements
            SET source='paid', subscription_id=$1, ends_at=NULL, updated_at=now()
          WHERE trial_id=$2 AND source='trial' AND entitlement_status='active'`,
        [subId, trial.trial_id]);
      // Foundation platform_dna entitlement is untouched.

      await client.query(
        `INSERT INTO dos.trial_audit_log
           (tenant_id, trial_id, user_id, product_code, action,
            old_status, new_status, reason, metadata_json)
         VALUES ($1,$2,$3,$4,'trial_converted',$5,'trial_converted',$6,$7)`,
        [tenantId, trial.trial_id, c.sub, productCode, trial.status, reason,
         JSON.stringify({ newSubscriptionId: subId, planCode })]);

      await client.query('COMMIT');
      return res.json({
        ok: true,
        trialId: trial.trial_id,
        newSubscriptionId: subId,
        productCode,
        planCode,
        status: 'active',
        billingStatus: 'manually_approved',
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error('[tenant-service] /trials/convert failed', err);
    return res.status(500).json({ error: 'CONVERT_FAILED' });
  } finally {
    client.release();
  }
});

app.post('/trials/cancel', async (req: Request, res: Response) => {
  const c = requireCaller(req, res);
  if (!c) return;
  const productCode = (req.body?.productCode as string | undefined)
    || process.env.TRIAL_PRODUCT_CODE
    || 'shahin-ai';
  const reason = (req.body?.reason as string | undefined) || null;

  const client = await pool.connect();
  try {
    const mems = await findActiveMembership(client, c.sub);
    if (mems.length === 0) {
      return res.status(404).json({ error: 'NO_MEMBERSHIP' });
    }
    const tenantId = mems[0].tenant_id;
    if (!mems[0].is_tenant_owner) {
      return res.status(403).json({ blocked: 'OWNER_REQUIRED' });
    }

    await client.query('BEGIN');
    try {
      const trialQ = await client.query<{ trial_id: string; status: string }>(
        `SELECT trial_id, status FROM dos.tenant_trials
          WHERE tenant_id=$1 AND product_code=$2
            AND status IN ('trial_pending_verification','trial_active','trial_expiring','trial_grace')
          ORDER BY created_at DESC LIMIT 1`, [tenantId, productCode]);
      if (trialQ.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ blocked: 'NO_ACTIVE_TRIAL' });
      }
      const trial = trialQ.rows[0];

      await client.query(
        `UPDATE dos.tenant_trials
            SET status='trial_cancelled', cancelled_at=now(), updated_at=now()
          WHERE trial_id=$1`, [trial.trial_id]);
      await client.query(
        `UPDATE dos.tenant_subscriptions
            SET status='cancelled', updated_at=now()
          WHERE trial_id=$1 AND status IN ('trialing','grace')`, [trial.trial_id]);
      await client.query(
        `UPDATE dos.tenant_module_entitlements
            SET entitlement_status='cancelled', updated_at=now()
          WHERE trial_id=$1 AND source='trial' AND entitlement_status='active'`,
        [trial.trial_id]);
      await client.query(
        `UPDATE dos.tenant_product_entitlements
            SET entitlement_status='cancelled', updated_at=now()
          WHERE trial_id=$1 AND source='trial' AND entitlement_status='active'`,
        [trial.trial_id]);
      await client.query(
        `INSERT INTO dos.trial_audit_log
           (tenant_id, trial_id, user_id, product_code, action,
            old_status, new_status, reason, metadata_json)
         VALUES ($1,$2,$3,$4,'trial_cancelled',$5,'trial_cancelled',$6,'{}'::jsonb)`,
        [tenantId, trial.trial_id, c.sub, productCode, trial.status, reason]);

      await client.query('COMMIT');
      return res.json({ ok: true, trialId: trial.trial_id, status: 'trial_cancelled' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error('[tenant-service] /trials/cancel failed', err);
    return res.status(500).json({ error: 'CANCEL_FAILED' });
  } finally {
    client.release();
  }
});

app.get('/subscription/current', async (req: Request, res: Response) => {
  const c = requireCaller(req, res);
  if (!c) return;
  const client = await pool.connect();
  try {
    const mems = await findActiveMembership(client, c.sub);
    if (mems.length === 0) {
      return res.status(404).json({ error: 'NO_MEMBERSHIP' });
    }
    const tenantId = mems[0].tenant_id;
    const productCode = (req.query.productCode as string | undefined)
      || process.env.TRIAL_PRODUCT_CODE
      || 'shahin-ai';
    const { rows } = await client.query(
      `SELECT subscription_id, tenant_id, product_code, plan_code, status,
              billing_status, trial_id, current_period_start, current_period_end,
              grace_ends_at, provider_mode, provider_ref, metadata,
              created_at, updated_at
         FROM dos.tenant_subscriptions
        WHERE tenant_id=$1 AND product_code=$2
        ORDER BY created_at DESC
        LIMIT 1`,
      [tenantId, productCode],
    );
    return res.json({ ok: true, productCode, subscription: rows[0] || null });
  } catch (err) {
    console.error('[tenant-service] /subscription/current failed', err);
    return res.status(500).json({ error: 'SUBSCRIPTION_LOOKUP_FAILED' });
  } finally {
    client.release();
  }
});

// ── GET /me — login lookup + email-fallback recovery (no tenant creation)
app.get('/me', async (req: Request, res: Response) => {
  const c = requireCaller(req, res);
  if (!c) return;

  const client = await pool.connect();
  try {
    // 1. Subject-first lookup.
    let user = await findUserBySub(c.sub);

    // 2. Old-user recovery: email-fallback link sub to existing DB user (one-shot).
    let recovered = false;
    if (!user) {
      const candidates = await findUsersByEmail(c.email);
      if (candidates.length > 1) {
        return res.status(409).json({ blocked: 'AMBIGUOUS_EMAIL', message: 'Multiple users share this email; admin recovery required.' });
      }
      if (candidates.length === 1) {
        const existing = candidates[0];
        // Link Keycloak subject to existing user_id by inserting a NEW row keyed on sub
        // referencing the same tenant. We do not change existing user_id (PK).
        // If the existing record's user_id is already a sub-shaped value, just reuse it.
        if (existing.user_id === c.sub) {
          user = await findUserBySub(c.sub);
        } else {
          // Insert a sub-keyed row that mirrors the legacy account.
          await client.query(
            `INSERT INTO dos.users (user_id, email, display_name, full_name, tenant_id, status, email_verified, sso_provider, sso_protocol)
               VALUES ($1, $2, $3, $3, $4, 'active', true, 'keycloak', 'oidc')
               ON CONFLICT (user_id) DO NOTHING`,
            [c.sub, c.email, c.name || c.email, existing.tenant_id],
          );
          // Move legacy memberships to sub-keyed user_id (idempotent).
          await client.query(
            `UPDATE dos.tenant_memberships SET user_id = $1
               WHERE user_id = $2 AND NOT EXISTS (
                 SELECT 1 FROM dos.tenant_memberships m2 WHERE m2.user_id = $1 AND m2.tenant_id = dos.tenant_memberships.tenant_id
               )`,
            [c.sub, existing.user_id],
          );
          recovered = true;
          user = await findUserBySub(c.sub);
        }
      }
    }

    if (!user) {
      // Authenticated at KC, but no DB account exists → blocked. Do NOT create a tenant.
      return res.status(409).json({ blocked: 'NO_USER', message: 'No workspace exists for this account. Please register or contact your administrator.' });
    }

    const memberships = await findActiveMembership(client, c.sub);
    if (memberships.length === 0) {
      return res.status(409).json({
        blocked: 'NO_MEMBERSHIP',
        message: 'Account exists but has no active workspace membership.',
        user: { id: user.user_id, email: user.email, name: user.display_name },
      });
    }

    const primary = memberships[0];
    return res.json({
      user:   { id: user.user_id, email: user.email, name: user.display_name },
      tenant: { id: primary.tenant_id, name: primary.tenant_name, code: primary.tenant_code, status: primary.tenant_status },
      membership: { roleCode: primary.role_code, isOwner: primary.is_tenant_owner },
      memberships: memberships.map((m: any) => ({ tenantId: m.tenant_id, name: m.tenant_name, code: m.tenant_code, roleCode: m.role_code, isOwner: m.is_tenant_owner })),
      recovered,
    });
  } catch (err) {
    console.error('[tenant-service] /me failed', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  } finally {
    client.release();
  }
});

// ── PATCH /me — admin-only inline rename of the active workspace ────────
//
// Patch 1 — display-only fields (`tenantName`, `tenantNameAr`). The slug
// (`tenantCode`) and owner promotion stay out of this surface because they
// have authorization blast-radius (URL space + OpenFGA scope + billing).
// The immutable join key `tenant_id` is never editable.
//
// AuthZ: caller must hold an active membership in the target tenant AND
// resolve to an admin role (tenant_admin / tenant_owner / *_admin) OR be
// the legal owner. Self-registered users land here as tenant_admin so they
// CAN rename their own workspace; non-admin members get 403.
app.patch('/me', async (req: Request, res: Response) => {
  const c = requireCaller(req, res);
  if (!c) return;

  const newName   = (req.body?.tenantName   as string | undefined)?.trim();
  const newNameAr = (req.body?.tenantNameAr as string | undefined)?.trim();
  if (!newName && !newNameAr) {
    return res.status(400).json({ error: 'NO_CHANGES', message: 'Provide tenantName and/or tenantNameAr.' });
  }
  if (newName && (newName.length < 2 || newName.length > 255)) {
    return res.status(400).json({ error: 'INVALID_TENANT_NAME', message: 'tenantName length must be 2..255.' });
  }
  if (newNameAr && (newNameAr.length < 2 || newNameAr.length > 255)) {
    return res.status(400).json({ error: 'INVALID_TENANT_NAME_AR', message: 'tenantNameAr length must be 2..255.' });
  }

  const client = await pool.connect();
  try {
    const memberships = await findActiveMembership(client, c.sub);
    if (memberships.length === 0) {
      return res.status(409).json({ blocked: 'NO_MEMBERSHIP' });
    }
    const primary = memberships[0];
    const role = String(primary.role_code || '').toLowerCase();
    const isAdmin = primary.is_tenant_owner === true
      || role === 'tenant_admin' || role === 'tenant_owner'
      || role.endsWith('_admin') || (role.includes('owner') && role.includes('tenant'));
    if (!isAdmin) {
      return res.status(403).json({ error: 'NOT_AUTHORIZED', code: 'TENANT_ADMIN_REQUIRED' });
    }

    await client.query('BEGIN');

    if (newName) {
      await client.query(
        `UPDATE dos.tenants SET tenant_name = $1 WHERE tenant_id = $2`,
        [newName, primary.tenant_id],
      );
    }

    if (newNameAr) {
      try {
        await client.query('SAVEPOINT brand_ar_patch');
        await client.query(
          `INSERT INTO dos.ui_tenant_branding (tenant_id, brand_name, is_active)
             VALUES ($1, $2, TRUE)
             ON CONFLICT (tenant_id) DO UPDATE SET brand_name = EXCLUDED.brand_name`,
          [primary.tenant_id, newNameAr],
        );
        await client.query('RELEASE SAVEPOINT brand_ar_patch');
      } catch (e) {
        await client.query('ROLLBACK TO SAVEPOINT brand_ar_patch').catch(() => {});
        console.warn('[tenant-service] PATCH /me orgNameAr persist skipped:', (e as Error).message);
      }
    }

    await client.query('COMMIT');
    return res.json({
      ok: true,
      tenant: { id: primary.tenant_id, name: newName || primary.tenant_name, code: primary.tenant_code },
      tenantNameAr: newNameAr || null,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[tenant-service] PATCH /me failed', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  } finally {
    client.release();
  }
});

// ── GET /bootstrap — real DB-backed platform bootstrap ──────────────────
app.get('/bootstrap', async (req: Request, res: Response) => {
  const c = requireCaller(req, res);
  if (!c) return;
  try {
    const user = await findUserBySub(c.sub);
    if (!user) return res.status(409).json({ blocked: 'NO_USER' });

    const { rows: memberships } = await pool.query(
      `SELECT m.tenant_id, t.tenant_name, t.tenant_code, t.status AS tenant_status, m.role_code, m.is_tenant_owner
         FROM dos.tenant_memberships m
         JOIN dos.tenants t ON t.tenant_id = m.tenant_id
        WHERE m.user_id = $1 AND m.status = 'active'
        ORDER BY m.is_tenant_owner DESC, m.created_at ASC LIMIT 1`,
      [c.sub],
    );
    if (memberships.length === 0) return res.status(409).json({ blocked: 'NO_MEMBERSHIP' });

    const m = memberships[0];
    if (m.tenant_status !== 'active') {
      return res.status(409).json({ blocked: 'TENANT_NOT_ACTIVE', tenantStatus: m.tenant_status });
    }

    // Real entitlement-derived home route.
    const { rows: settings } = await pool.query(
      `SELECT settings FROM dos.tenants WHERE tenant_id = $1 LIMIT 1`, [m.tenant_id],
    );
    const tenantSettings = settings[0]?.settings || {};
    const defaultHome =
      (tenantSettings.defaultHomeRoute as string | undefined) ||
      DEFAULT_HOME_FALLBACK;

    // Maintenance flag (feature flag of platform scope).
    const { rows: flags } = await pool.query(
      `SELECT enabled FROM dos.feature_flags WHERE flag_code = 'platform.maintenance' AND is_active = true LIMIT 1`,
    );
    const maintenance = !!(flags[0]?.enabled);

    res.json({
      authenticated: true,
      user: { id: user.user_id, email: user.email, name: user.display_name },
      tenant: { id: m.tenant_id, name: m.tenant_name, code: m.tenant_code, status: m.tenant_status },
      tenantStatus: m.tenant_status,
      workspaceReady: m.tenant_status === 'active',
      firstLoginCompleted: true, // membership exists ⇒ workspace was created at registration
      platformVersion: PLATFORM_VERSION,
      maintenance,
      defaultHomeRoute: defaultHome,
    });
  } catch (err) {
    console.error('[tenant-service] /bootstrap failed', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /entitlements — real tenant module/home entitlements ────────────
app.get('/entitlements', async (req: Request, res: Response) => {
  const c = requireCaller(req, res);
  if (!c) return;
  try {
    const { rows: mems } = await pool.query(
      `SELECT tenant_id FROM dos.tenant_memberships
        WHERE user_id = $1 AND status = 'active'
        ORDER BY is_tenant_owner DESC, created_at ASC LIMIT 1`,
      [c.sub],
    );
    if (mems.length === 0) return res.status(409).json({ blocked: 'NO_MEMBERSHIP' });
    const tenantId = mems[0].tenant_id;

    // Tenant-activated products → modules.
    const { rows: modules } = await pool.query(
      `SELECT m.module_code, m.product_key, m.display_name, m.status
         FROM dos.tenant_product_activation tpa
         JOIN dos.module_registry m ON m.product_key = tpa.product_key
        WHERE tpa.tenant_id = $1 AND tpa.status = 'active' AND m.status = 'active'
        ORDER BY m.module_code`,
      [tenantId],
    );

    const { rows: settings } = await pool.query(
      `SELECT settings FROM dos.tenants WHERE tenant_id = $1 LIMIT 1`, [tenantId],
    );
    const ts = settings[0]?.settings || {};
    const defaultHomeRoute  = ts.defaultHomeRoute  || DEFAULT_HOME_FALLBACK;
    const homeRouteByRole   = ts.homeRouteByRole   || {};

    // Feature flags for this tenant (overrides + platform defaults).
    const { rows: flagRows } = await pool.query(
      `SELECT flag_code, enabled FROM dos.feature_flags WHERE is_active = true`,
    );
    const features: Record<string, boolean> = {};
    for (const f of flagRows) features[f.flag_code] = !!f.enabled;

    res.json({
      tenantId,
      modules: modules.map(m => ({ code: m.module_code, productKey: m.product_key, displayName: m.display_name, status: m.status })),
      ui: { defaultHomeRoute, homeRouteByRole },
      features,
    });
  } catch (err) {
    console.error('[tenant-service] /entitlements failed', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /tenant-config — read-only tenant configuration surface ──────────
// Aggregates dos.tenants.settings + active feature flags + module counts so
// the Foundation Settings page renders real DB-backed data. Read-only.
app.get('/tenant-config', async (req: Request, res: Response) => {
  const c = requireCaller(req, res);
  if (!c) return;
  try {
    const { rows: mems } = await pool.query(
      `SELECT tenant_id FROM dos.tenant_memberships
        WHERE user_id = $1 AND status = 'active'
        ORDER BY is_tenant_owner DESC, created_at ASC LIMIT 1`,
      [c.sub],
    );
    if (mems.length === 0) return res.status(409).json({ blocked: 'NO_MEMBERSHIP' });
    const tenantId = mems[0].tenant_id;

    const { rows: tenantRows } = await pool.query(
      `SELECT tenant_id, tenant_name AS name, status, settings, created_at FROM dos.tenants WHERE tenant_id = $1 LIMIT 1`,
      [tenantId],
    );
    const t = tenantRows[0] ?? {};
    const settings = (t.settings as Record<string, unknown>) ?? {};

    const { rows: flagRows } = await pool.query(
      `SELECT flag_code, enabled FROM dos.feature_flags WHERE is_active = true ORDER BY flag_code`,
    );
    const featureFlags: Record<string, boolean> = {};
    for (const f of flagRows) featureFlags[f.flag_code] = !!f.enabled;

    const { rows: modRows } = await pool.query(
      `SELECT m.module_code FROM dos.tenant_product_activation tpa
         JOIN dos.module_registry m ON m.product_key = tpa.product_key
        WHERE tpa.tenant_id = $1 AND tpa.status = 'active' AND m.status = 'active'
        ORDER BY m.module_code`,
      [tenantId],
    );

    res.json({
      tenant: { id: t.tenant_id, name: t.name, status: t.status, createdAt: t.created_at },
      settings,
      featureFlags,
      activeModules: modRows.map(m => m.module_code),
    });
  } catch (err) {
    console.error('[tenant-service] /tenant-config failed', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /permissions — real DAuth permissions for caller in tenant ──────
app.get('/permissions', async (req: Request, res: Response) => {
  const c = requireCaller(req, res);
  if (!c) return;
  try {
    // Resolve canonical user_id: c.sub may be a Keycloak subject UUID, but
    // membership + role rows are keyed on the canonical platform user_id
    // (e.g. 'platform_admin'). iam_identities maps KC sub → canonical id.
    const { rows: idRows } = await pool.query(
      `SELECT user_id FROM public.iam_identities
        WHERE provider='keycloak' AND external_subject=$1 AND status='active' LIMIT 1`,
      [c.sub],
    );
    const canonicalUserId = idRows[0]?.user_id || c.sub;

    const { rows: mems } = await pool.query(
      `SELECT tenant_id, role_code, is_tenant_owner FROM dos.tenant_memberships
        WHERE user_id = ANY($1) AND status = 'active'
        ORDER BY is_tenant_owner DESC, created_at ASC LIMIT 1`,
      [[c.sub, canonicalUserId]],
    );
    if (mems.length === 0) return res.status(409).json({ blocked: 'NO_MEMBERSHIP' });
    const { tenant_id: tenantId, role_code: membershipRole } = mems[0];

    // Active role assignments for this user — include tenant-scoped rows
    // AND platform-level rows (tenant_id='platform' or NULL) so platform_admin
    // operators surface their role on every tenant they operate within.
    // Match either the KC subject or the canonical user_id, so role rows
    // keyed on either identifier are both surfaced.
    const { rows: assignments } = await pool.query(
      `SELECT role_code FROM platform_dauth.user_role_assignments
        WHERE user_id = ANY($2) AND is_active = true
          AND (tenant_id = $1 OR tenant_id = 'platform' OR tenant_id IS NULL)
          AND (expires_at IS NULL OR expires_at > NOW())
          AND revoked_at IS NULL`,
      [tenantId, [c.sub, canonicalUserId]],
    );
    const roleSet = new Set<string>([membershipRole, ...assignments.map(a => a.role_code)].filter(Boolean));
    const roles = Array.from(roleSet);

    // Resolve permission set from functional_roles.permissions (text[]).
    const permSet = new Set<string>();
    if (roles.length > 0) {
      const { rows: roleRows } = await pool.query(
        `SELECT role_code, permissions FROM platform_dauth.functional_roles WHERE role_code = ANY($1)`,
        [roles],
      );
      for (const r of roleRows) {
        for (const p of (r.permissions as string[] | null) || []) permSet.add(p);
      }
    }

    // Module list for this tenant. Phase G T2 introduced
    // dos.tenant_module_entitlements as the canonical entitlement source.
    // Pre-G tenants only have rows in dos.tenant_product_activation +
    // dos.module_registry, so we UNION both and de-duplicate by module_code.
    // Foundation is platform DNA — included unconditionally.
    const { rows: modules } = await pool.query(
      `SELECT module_code FROM (
         SELECT m.module_code AS module_code
           FROM dos.tenant_product_activation tpa
           JOIN dos.module_registry m ON m.product_key = tpa.product_key
          WHERE tpa.tenant_id = $1 AND tpa.status = 'active' AND m.status = 'active'
         UNION
         SELECT module_code
           FROM dos.tenant_module_entitlements
          WHERE tenant_id = $1 AND entitlement_status = 'active'
         UNION
         SELECT 'foundation' AS module_code
       ) merged
       ORDER BY module_code`,
      [tenantId],
    );

    res.json({
      tenantId,
      roles,
      permissions: Array.from(permSet),
      modules: modules.map(m => m.module_code),
    });
  } catch (err) {
    console.error('[tenant-service] /permissions failed', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /workspaces — list caller's tenant memberships as workspaces ────
// AGENTS Foundation Endpoint: /api/workspaces. One workspace per active
// tenant_membership. Read-only, no creation here.
app.get('/workspaces', async (req: Request, res: Response) => {
  const c = requireCaller(req, res);
  if (!c) return;
  try {
    const { rows } = await pool.query(
      `SELECT m.tenant_id, m.role_code, m.is_tenant_owner, m.created_at AS joined_at,
              t.tenant_name, t.tenant_code, t.status AS tenant_status
         FROM dos.tenant_memberships m
         JOIN dos.tenants t ON t.tenant_id = m.tenant_id
        WHERE m.user_id = $1 AND m.status = 'active'
        ORDER BY m.is_tenant_owner DESC, m.created_at ASC`,
      [c.sub],
    );
    const items = rows.map((r: any) => ({
      id: r.tenant_id,
      tenantId: r.tenant_id,
      name: r.tenant_name,
      code: r.tenant_code,
      status: r.tenant_status,
      roleCode: r.role_code,
      isOwner: r.is_tenant_owner,
      joinedAt: r.joined_at,
    }));
    res.json({ items, total: items.length });
  } catch (err) {
    console.error('[tenant-service] /workspaces failed', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /tenant-home/overview — workspace home overview (real DB-derived) ─
// Returns a controlled, DB-derived setup-pending payload shaped to match
// HomeOverviewDto. No fake KPIs, no fake module cards. For fresh tenants
// with no provisioned module tables, all slices degrade to typed empty
// defaults so the FE renders the workspace shell instead of an error state.
app.get('/tenant-home/overview', async (req: Request, res: Response) => {
  const c = requireCaller(req, res);
  if (!c) return;
  try {
    const { rows: mems } = await pool.query(
      `SELECT m.tenant_id, m.role_code, m.is_tenant_owner,
              t.tenant_name, t.tenant_code, t.status AS tenant_status, t.settings, t.created_at
         FROM dos.tenant_memberships m
         JOIN dos.tenants t ON t.tenant_id = m.tenant_id
        WHERE m.user_id = $1 AND m.status = 'active'
        ORDER BY m.is_tenant_owner DESC, m.created_at ASC LIMIT 1`,
      [c.sub],
    );
    if (mems.length === 0) return res.status(409).json({ blocked: 'NO_MEMBERSHIP' });
    const m = mems[0];
    if (m.tenant_status !== 'active') {
      return res.status(409).json({ blocked: 'TENANT_NOT_ACTIVE', tenantStatus: m.tenant_status });
    }
    const tenantId = m.tenant_id;
    const workspaceId = String(req.query.workspaceId || '') || tenantId;

    const { rows: moduleRows } = await pool.query(
      `SELECT m.module_code, m.product_key, m.display_name
         FROM dos.tenant_product_activation tpa
         JOIN dos.module_registry m ON m.product_key = tpa.product_key
        WHERE tpa.tenant_id = $1 AND tpa.status = 'active' AND m.status = 'active'
        ORDER BY m.module_code`,
      [tenantId],
    );
    const modules = moduleRows.map(r => ({
      code: r.module_code,
      productKey: r.product_key,
      displayName: r.display_name,
    }));

    const { rows: memberCountRows } = await pool.query(
      `SELECT count(*)::int AS count FROM dos.tenant_memberships
        WHERE tenant_id = $1 AND status = 'active'`,
      [tenantId],
    );
    const memberCount = memberCountRows[0]?.count || 0;
    const setupPending = modules.length === 0;

    // ── FIX E (spec §4.1, foundation-overview KPI contract) ───────────────
    // Compute the live KPI strip values from real DB sources. The FE reads
    // these top-level fields in `refreshKpiStrip()`:
    //   • vacancies     → positions with no active assignment
    //   • complianceRate→ % of governance_policies in published/active state
    //   • ownership     → count of org/dept/BU entities WITHOUT an
    //                     active ownership_mappings row (ownership gaps)
    //
    // We compute defensively because some tenants may not yet have all
    // foundation tables provisioned. Each query is isolated in its own
    // try/catch so a missing table degrades that single KPI to 0 instead
    // of dropping the whole response.
    const safeCount = async (sql: string, params: unknown[]): Promise<number> => {
      try {
        const { rows } = await pool.query(sql, params);
        const v = rows[0]?.count;
        return typeof v === 'number' ? v : Number(v ?? 0) || 0;
      } catch (e) {
        // Table missing or RLS-locked — degrade to 0 (typed empty), do not throw.
        return 0;
      }
    };

    const [vacancies, policiesTotal, policiesPublished, ownershipGaps] = await Promise.all([
      // Vacancies: active positions where there is no current (un-ended) assignment
      safeCount(
        `SELECT count(*)::int AS count
           FROM dos.positions p
          WHERE p.tenant_id = $1
            AND p.status = 'active'
            AND p.deleted_at IS NULL
            AND NOT EXISTS (
              SELECT 1 FROM dos.position_assignments pa
               WHERE pa.position_id = p.position_id
                 AND pa.tenant_id  = p.tenant_id
                 AND pa.ended_at IS NULL
            )`,
        [tenantId],
      ),
      safeCount(
        `SELECT count(*)::int AS count FROM dos.governance_policies
          WHERE tenant_id = $1::uuid AND deleted_at IS NULL`,
        [tenantId],
      ),
      safeCount(
        `SELECT count(*)::int AS count FROM dos.governance_policies
          WHERE tenant_id = $1::uuid AND deleted_at IS NULL
            AND status IN ('published','active','approved','effective')`,
        [tenantId],
      ),
      // Ownership gaps: organizations + business_units + departments that
      // have NO row in dos.ownership_mappings with a current valid window.
      safeCount(
        `WITH owned AS (
            SELECT entity_type, entity_id::text AS entity_id
              FROM dos.ownership_mappings
             WHERE tenant_id = $1
               AND (valid_to IS NULL OR valid_to > NOW())
         )
         SELECT (
            (SELECT count(*) FROM dos.organizations o
              WHERE o.tenant_id=$1 AND o.deleted_at IS NULL
                AND NOT EXISTS (SELECT 1 FROM owned w
                                 WHERE w.entity_type='organization'
                                   AND w.entity_id = o.organization_id::text))
          + (SELECT count(*) FROM dos.business_units b
              WHERE b.tenant_id=$1 AND b.deleted_at IS NULL
                AND NOT EXISTS (SELECT 1 FROM owned w
                                 WHERE w.entity_type='business_unit'
                                   AND w.entity_id = b.bu_id::text))
         )::int AS count`,
        [tenantId],
      ),
    ]);

    const complianceRate = policiesTotal > 0
      ? Math.round((policiesPublished / policiesTotal) * 100)
      : 0;

    const usersCount = await safeCount(
      `SELECT count(*)::int AS count FROM dos.tenant_memberships
        WHERE tenant_id = $1 AND status = 'active'`,
      [tenantId],
    );
    const departmentsCount = await safeCount(
      // Departments live in tenant schema; degrade safely if absent.
      `SELECT count(*)::int AS count FROM dos.tenant_memberships WHERE 1=0`,
      [],
    );
    const teamsCount = await safeCount(
      `SELECT count(*)::int AS count FROM dos.tenant_memberships WHERE 1=0`,
      [],
    );

    return res.json({
      summary: {
        tenantId,
        workspaceId,
        tenantName: m.tenant_name,
        tenantCode: m.tenant_code,
        tenantStatus: m.tenant_status,
        memberCount,
        moduleCount: modules.length,
        setupPending,
        createdAt: m.created_at,
      },
      quickStats: [
        { key: 'modules', value: modules.length },
        { key: 'members', value: memberCount },
        { key: 'frameworks', value: 0 },
        { key: 'risks', value: 0 },
        { key: 'controls', value: 0 },
        { key: 'tasks', value: 0 },
      ],
      context: {
        tenantId,
        workspaceId,
        workspaceName: m.tenant_name,
        tenantCode: m.tenant_code,
        tenantStatus: m.tenant_status,
        industry: (m.settings && m.settings.industry) || '',
        country: (m.settings && m.settings.country) || '',
        plan: (m.settings && m.settings.plan) || '',
        role: m.role_code,
        isTenantOwner: m.is_tenant_owner,
        orgName: m.tenant_name,
        frameworkCount: 0,
        modules,
        setup: setupPending
          ? { status: 'pending', message: 'Workspace is ready. No modules activated yet.' }
          : { status: 'active' },
        defaultHomeRoute: DEFAULT_HOME_FALLBACK,
      },
      // ── FIX E ──────────────────────────────────────────────────────────
      // Populate the spec-conformant `kpis` envelope. The FE
      // (foundation-overview.component.ts → refreshKpiStrip()) reads
      // `live.kpis.{vacancies,complianceRate,ownership}` first, falling
      // back to top-level for backwards compatibility — so we publish to
      // BOTH locations to keep older clients working during rollout.
      kpis: {
        users: { total: usersCount },
        departments: { total: departmentsCount },
        teams: { total: teamsCount },
        vacancies,
        complianceRate,
        ownership: { gaps: ownershipGaps, total: ownershipGaps },
      },
      // Top-level shortcuts (legacy/back-compat for FE prior to §kpis envelope)
      vacancies,
      complianceRate,
      ownership: { gaps: ownershipGaps, total: ownershipGaps },
      kpiTrends: {},
      actionCenter: { items: [], overdue: [], upcoming: [] },
      programHealth: { coverage: [], alerts: [] },
      lifecycle: { phase: setupPending ? 'setup' : 'operate' },
      activity: { items: [], total: 0 },
    });
  } catch (err) {
    console.error('[tenant-service] /tenant-home/overview failed', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /tenant-home/activity — recent activity (empty until audit_trail wired) ─
app.get('/tenant-home/activity', async (req: Request, res: Response) => {
  const c = requireCaller(req, res);
  if (!c) return;
  try {
    const { rows: mems } = await pool.query(
      `SELECT tenant_id FROM dos.tenant_memberships
        WHERE user_id = $1 AND status = 'active'
        ORDER BY is_tenant_owner DESC, created_at ASC LIMIT 1`,
      [c.sub],
    );
    if (mems.length === 0) return res.status(409).json({ blocked: 'NO_MEMBERSHIP' });
    return res.json({ activities: [], total: 0 });
  } catch (err) {
    console.error('[tenant-service] /tenant-home/activity failed', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /config-center/products-modules — tenant-scoped product/module taxonomy ─
// Frontend (ProductsModulesConfigService) calls /api/config/products-modules,
// which the gateway rewrites to this path. Returns ProductsModulesConfig.
app.get('/config-center/products-modules', async (req: Request, res: Response) => {
  const c = requireCaller(req, res);
  if (!c) return;
  try {
    const { rows: mems } = await pool.query(
      `SELECT tenant_id FROM dos.tenant_memberships
        WHERE user_id = $1 AND status = 'active'
        ORDER BY is_tenant_owner DESC, created_at ASC LIMIT 1`,
      [c.sub],
    );
    if (mems.length === 0) return res.status(409).json({ blocked: 'NO_MEMBERSHIP' });
    const tenantId = mems[0].tenant_id as string;

    const { rows: activatedProducts } = await pool.query(
      `SELECT product_key FROM dos.tenant_product_activation
        WHERE tenant_id = $1 AND status = 'active'`,
      [tenantId],
    );
    const productKeys = activatedProducts.map(r => r.product_key as string);

    const { rows: modules } = await pool.query(
      `SELECT module_code, product_key, display_name
         FROM dos.module_registry
        WHERE status = 'active'
          AND ($1::text[] = '{}'::text[] OR product_key = ANY($1::text[]))`,
      [productKeys],
    );

    const modulesByProduct: Record<string, string[]> = {};
    const internalKeyToBusinessLabel: Record<string, string> = {};
    const visibleModules: string[] = [];
    for (const m of modules) {
      const pk = (m.product_key ?? 'platform') as string;
      (modulesByProduct[pk] ||= []).push(m.module_code);
      visibleModules.push(m.module_code);
      if (m.display_name) internalKeyToBusinessLabel[m.module_code] = m.display_name as string;
    }

    return res.json({
      platform: { key: 'agrc-os', labelEn: 'AGRC-OS', labelAr: 'منصة AGRC-OS' },
      products: productKeys.map(k => ({ internalKey: k, businessLabel: internalKeyToBusinessLabel[k] ?? k })),
      modulesByProduct,
      visibleModules,
      sharedServices: [],
      internalKeyToBusinessLabel,
    });
  } catch (err) {
    console.error('[tenant-service] /config-center/products-modules failed', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /navigation/tree — flat list of nav rows the gateway adapter reshapes ─
app.get('/navigation/tree', async (req: Request, res: Response) => {
  const c = requireCaller(req, res);
  if (!c) return;
  try {
    const { rows: mems } = await pool.query(
      `SELECT tenant_id FROM dos.tenant_memberships
        WHERE user_id = $1 AND status = 'active'
        ORDER BY is_tenant_owner DESC, created_at ASC LIMIT 1`,
      [c.sub],
    );
    if (mems.length === 0) return res.status(409).json({ blocked: 'NO_MEMBERSHIP' });
    const tenantId = mems[0].tenant_id as string;

    // Phase G T2: navigation entries come from BOTH the legacy product activation
    // model (tenant_product_activation) AND the newer module entitlement model
    // (tenant_module_entitlements). Foundation is platform DNA — always included.
    // The UNION deduplicates by nav_item_code so overlapping entries don't double.
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (n.nav_item_code) n.id, n.module_code, n.nav_item_code, n.label_en, n.label_ar,
              n.icon, n.route, n.parent_code, n.sort_order
         FROM dos.navigation_registry n
         JOIN dos.module_registry m ON m.module_code = n.module_code
        WHERE m.status = 'active'
          AND (
            -- Legacy: module is part of an actively activated product
            EXISTS (
              SELECT 1 FROM dos.tenant_product_activation tpa
               WHERE tpa.product_key = m.product_key
                 AND tpa.tenant_id = $1 AND tpa.status = 'active'
            )
            OR
            -- Phase G: module is directly entitled via tenant_module_entitlements
            EXISTS (
              SELECT 1 FROM dos.tenant_module_entitlements tme
               WHERE tme.module_code = n.module_code
                 AND tme.tenant_id = $1 AND tme.entitlement_status = 'active'
            )
            OR
            -- Platform DNA: foundation is always visible
            n.module_code = 'foundation'
          )
        ORDER BY n.nav_item_code, n.sort_order ASC, n.id ASC`,
      [tenantId],
    );
    // Re-sort the deduped rows by sort_order for the final output.
    (rows as any[]).sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    return res.json({ entries: rows, count: rows.length });
  } catch (err) {
    console.error('[tenant-service] /navigation/tree failed', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /config-center/gateway/shell-override — tenant-scoped gateway override ─
// FE calls GET /api/config-center/gateway/shell-override to check if the tenant
// has any gateway-level shell configuration overrides. Reads from dos.tenants.settings
// → shellOverrides key. Returns {} if no overrides are configured.
app.get('/config-center/gateway/shell-override', async (req: Request, res: Response) => {
  const c = requireCaller(req, res);
  if (!c) return;
  try {
    const { rows: mems } = await pool.query(
      `SELECT tenant_id FROM dos.tenant_memberships
        WHERE user_id = $1 AND status = 'active'
        ORDER BY is_tenant_owner DESC, created_at ASC LIMIT 1`,
      [c.sub],
    );
    if (mems.length === 0) return res.status(409).json({ blocked: 'NO_MEMBERSHIP' });
    const tenantId = mems[0].tenant_id as string;

    const { rows } = await pool.query(
      `SELECT settings FROM dos.tenants WHERE tenant_id = $1 LIMIT 1`,
      [tenantId],
    );
    const settings = (rows[0]?.settings as Record<string, unknown>) ?? {};
    const shellOverrides = (settings.shellOverrides as Record<string, unknown>) ?? {};

    res.json(shellOverrides);
  } catch (err) {
    console.error('[tenant-service] /config-center/gateway/shell-override failed', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /module-kickstart-status — module provisioning status per tenant ─────
// FE ModuleKickstartService calls GET /api/module-kickstart-status expecting
// { modules: Record<string, ModuleKickstartState> }. Returns the provisioning
// status for each module activated in this tenant's product activation table.
app.get('/module-kickstart-status', async (req: Request, res: Response) => {
  const c = requireCaller(req, res);
  if (!c) return;
  try {
    const { rows: mems } = await pool.query(
      `SELECT tenant_id FROM dos.tenant_memberships
        WHERE user_id = $1 AND status = 'active'
        ORDER BY is_tenant_owner DESC, created_at ASC LIMIT 1`,
      [c.sub],
    );
    if (mems.length === 0) return res.status(409).json({ blocked: 'NO_MEMBERSHIP' });
    const tenantId = mems[0].tenant_id as string;

    // Module kickstart state = activated modules with their provisioning status
    const { rows: modules } = await pool.query(
      `SELECT m.module_code, tpa.status AS activation_status, tpa.created_at AS kicked_at
         FROM dos.tenant_product_activation tpa
         JOIN dos.module_registry m ON m.product_key = tpa.product_key
        WHERE tpa.tenant_id = $1 AND m.status = 'active'
        ORDER BY m.module_code`,
      [tenantId],
    );

    const modulesMap: Record<string, unknown> = {};
    for (const m of modules) {
      modulesMap[m.module_code as string] = {
        status: m.activation_status === 'active' ? 'completed' : 'pending',
        kickedAt: m.kicked_at,
        kickedBy: null,
        artifacts: {},
        errors: null,
      };
    }

    res.json({ modules: modulesMap });
  } catch (err) {
    console.error('[tenant-service] /module-kickstart-status failed', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── Config Center — inheritance resolver (platform → tenant → user) ─────
// Reads dos.config_definitions + dos.config_values. Effective value resolves
// in priority order: user-scope (if requested by callers own user_id) →
// tenant-scope (membership tenant) → platform-scope. allowed_scopes on the
// definition gates which scopes a value may be set at; is_overridable=false
// pins the platform default; is_lockable + dos.config_locks pin a tenant lock.
//
//   GET  /config-center/settings                   — list effective settings (i18n labels)
//   GET  /config-center/settings/:key              — single effective value with provenance
//   PUT  /config-center/settings/:key  (tenant)    — tenant-admin override (if allowed)
//   PUT  /platform-config/settings/:key (platform) — platform-admin write
//
// All writes require role from platform_dauth.user_role_assignments + audit.
async function callerRoles(sub: string, tenantId: string): Promise<Set<string>> {
  const { rows } = await pool.query(
    `SELECT DISTINCT role_code FROM platform_dauth.user_role_assignments
      WHERE user_id=$1 AND is_active=TRUE
        AND (tenant_id=$2 OR tenant_id='platform' OR tenant_id IS NULL)
        AND (expires_at IS NULL OR expires_at > NOW())
        AND revoked_at IS NULL`,
    [sub, tenantId],
  );
  return new Set(rows.map(r => r.role_code as string));
}
function isPlatformAdmin(roles: Set<string>): boolean {
  return roles.has('platform_admin') || roles.has('platform_owner') || roles.has('dos_admin');
}
function isTenantAdmin(roles: Set<string>): boolean {
  return roles.has('tenant_admin') || roles.has('tenant_owner');
}

async function callerTenantId(sub: string): Promise<string | null> {
  const { rows } = await pool.query(
    `SELECT tenant_id FROM dos.tenant_memberships
      WHERE user_id=$1 AND status='active'
      ORDER BY is_tenant_owner DESC, created_at ASC LIMIT 1`,
    [sub],
  );
  return rows[0]?.tenant_id ?? null;
}

// GET /config-center/settings?category=&module=&lang=
app.get('/config-center/settings', async (req: Request, res: Response) => {
  const c = requireCaller(req, res);
  if (!c) return;
  try {
    const tenantId = await callerTenantId(c.sub);
    if (!tenantId) return res.status(409).json({ blocked: 'NO_MEMBERSHIP' });
    const category = req.query.category as string | undefined;
    const moduleCode = req.query.module as string | undefined;
    const params: any[] = [tenantId, c.sub];
    let filter = '';
    if (category)  { params.push(category);   filter += ` AND d.category = $${params.length}`; }
    if (moduleCode){ params.push(moduleCode); filter += ` AND d.module_code = $${params.length}`; }

    // Effective resolution: user-scope (callers user_id) → tenant-scope (caller tenant)
    // → platform-scope. All filtered to is_active rows. Secrets are masked.
    const { rows } = await pool.query(
      `WITH defs AS (
         SELECT d.id, d.config_key, d.label, d.description, d.module_code, d.category,
                d.allowed_scopes, d.is_overridable, d.is_lockable, d.is_secret,
                d.default_value, d.data_type, d.enum_values, d.requires_restart,
                d.ui_exposable
           FROM dos.config_definitions d
          WHERE d.ui_exposable = TRUE ${filter}
       ),
       v_user AS (
         SELECT v.definition_id, v.value, v.updated_at, v.updated_by
           FROM dos.config_values v
          WHERE v.scope_type='user' AND v.scope_id=$2 AND v.is_active=TRUE
       ),
       v_tenant AS (
         SELECT v.definition_id, v.value, v.updated_at, v.updated_by
           FROM dos.config_values v
          WHERE v.scope_type='tenant' AND v.scope_id=$1 AND v.is_active=TRUE
       ),
       v_platform AS (
         SELECT v.definition_id, v.value, v.updated_at, v.updated_by
           FROM dos.config_values v
          WHERE v.scope_type='platform' AND v.scope_id='platform' AND v.is_active=TRUE
       ),
       lock_t AS (
         SELECT definition_id FROM dos.config_locks
          WHERE scope_type='tenant' AND scope_id=$1
       )
       SELECT d.config_key AS key, d.label, d.description, d.module_code AS module,
              d.category, d.data_type, d.enum_values, d.allowed_scopes,
              d.is_overridable, d.is_lockable, d.is_secret, d.requires_restart,
              d.default_value AS platform_default,
              vp.value AS platform_value, vt.value AS tenant_value, vu.value AS user_value,
              CASE
                WHEN vu.value IS NOT NULL THEN 'user'
                WHEN vt.value IS NOT NULL THEN 'tenant'
                WHEN vp.value IS NOT NULL THEN 'platform'
                ELSE 'default'
              END AS effective_source,
              COALESCE(vu.value, vt.value, vp.value, d.default_value) AS effective_value,
              (lt.definition_id IS NOT NULL) AS locked_at_tenant
         FROM defs d
         LEFT JOIN v_user     vu ON vu.definition_id = d.id
         LEFT JOIN v_tenant   vt ON vt.definition_id = d.id
         LEFT JOIN v_platform vp ON vp.definition_id = d.id
         LEFT JOIN lock_t      lt ON lt.definition_id = d.id
        ORDER BY d.category NULLS LAST, d.config_key`,
      params,
    );
    const items = rows.map(r => ({
      key: r.key,
      label: r.label,
      description: r.description,
      module: r.module,
      category: r.category,
      dataType: r.data_type,
      enumValues: r.enum_values || [],
      allowedScopes: r.allowed_scopes || [],
      isOverridable: r.is_overridable,
      isLockable: r.is_lockable,
      isSecret: r.is_secret,
      requiresRestart: r.requires_restart,
      lockedAtTenant: r.locked_at_tenant,
      platformDefault: r.platform_default,
      platformValue: r.is_secret ? null : r.platform_value,
      tenantValue: r.is_secret ? null : r.tenant_value,
      userValue: r.is_secret ? null : r.user_value,
      effectiveSource: r.effective_source,
      effectiveValue: r.is_secret ? '***' : r.effective_value,
    }));
    res.json({ tenantId, items, total: items.length });
  } catch (err) {
    console.error('[tenant-service] /config-center/settings failed', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// GET /config-center/settings/:key — single setting with full provenance
app.get('/config-center/settings/:key', async (req: Request, res: Response) => {
  const c = requireCaller(req, res);
  if (!c) return;
  try {
    const tenantId = await callerTenantId(c.sub);
    if (!tenantId) return res.status(409).json({ blocked: 'NO_MEMBERSHIP' });
    const key = req.params.key;
    const { rows } = await pool.query(
      `SELECT d.id, d.config_key, d.label, d.description, d.allowed_scopes,
              d.is_overridable, d.is_lockable, d.is_secret, d.default_value,
              d.data_type, d.enum_values, d.requires_restart,
              (SELECT value FROM dos.config_values WHERE definition_id=d.id AND scope_type='user'     AND scope_id=$2 AND is_active=TRUE LIMIT 1) AS user_value,
              (SELECT value FROM dos.config_values WHERE definition_id=d.id AND scope_type='tenant'   AND scope_id=$1 AND is_active=TRUE LIMIT 1) AS tenant_value,
              (SELECT value FROM dos.config_values WHERE definition_id=d.id AND scope_type='platform' AND scope_id='platform' AND is_active=TRUE LIMIT 1) AS platform_value
         FROM dos.config_definitions d WHERE d.config_key=$3 LIMIT 1`,
      [tenantId, c.sub, key],
    );
    if (rows.length === 0) return res.status(404).json({ error: 'UNKNOWN_KEY' });
    const r = rows[0];
    res.json({
      key: r.config_key,
      label: r.label,
      description: r.description,
      allowedScopes: r.allowed_scopes || [],
      isOverridable: r.is_overridable,
      isSecret: r.is_secret,
      dataType: r.data_type,
      enumValues: r.enum_values || [],
      requiresRestart: r.requires_restart,
      platform: r.is_secret ? null : (r.platform_value ?? r.default_value),
      tenant:   r.is_secret ? null : r.tenant_value,
      user:     r.is_secret ? null : r.user_value,
      effectiveSource: r.user_value !== null ? 'user' : (r.tenant_value !== null ? 'tenant' : (r.platform_value !== null ? 'platform' : 'default')),
      effectiveValue:  r.is_secret ? '***' : (r.user_value ?? r.tenant_value ?? r.platform_value ?? r.default_value),
    });
  } catch (err) {
    console.error('[tenant-service] /config-center/settings/:key failed', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

async function writeConfigValue(
  definitionId: number, configKey: string,
  scopeType: 'platform'|'tenant'|'user', scopeId: string,
  value: unknown, updatedBy: string, source: string,
): Promise<void> {
  // Deactivate existing active row, then insert a fresh active row.
  await pool.query(
    `UPDATE dos.config_values SET is_active=FALSE
      WHERE definition_id=$1 AND scope_type=$2 AND scope_id=$3 AND is_active=TRUE`,
    [definitionId, scopeType, scopeId],
  );
  await pool.query(
    `INSERT INTO dos.config_values
       (config_key, scope_type, scope_id, value, definition_id, is_active, source, updated_by, updated_at)
     VALUES ($1, $2, $3, $4::jsonb, $5, TRUE, $6, $7, NOW())`,
    [configKey, scopeType, scopeId, JSON.stringify(value ?? null), definitionId, source, updatedBy],
  );
  await pool.query(
    `INSERT INTO platform_dsoc.audit_log
       (tenant_id,category,severity,actor_type,actor_id,action,resource_type,resource_id,outcome,occurred_at,attributes)
     VALUES ($1,'config_change','info','user',$2,'config.set',$3,$4,'success',NOW(),$5::jsonb)
     ON CONFLICT DO NOTHING`,
    [scopeType==='tenant'?scopeId:'platform', updatedBy, 'config_value', `${configKey}@${scopeType}:${scopeId}`,
     JSON.stringify({ scopeType, scopeId, source })],
  ).catch(() => { /* audit best-effort */ });
}

// PUT /config-center/settings/:key  body { value }
//   Tenant-admin → writes scope_type='tenant', scope_id=callerTenant.
//   Self-user override allowed when allowed_scopes contains 'user'.
app.put('/config-center/settings/:key', async (req: Request, res: Response) => {
  const c = requireCaller(req, res);
  if (!c) return;
  try {
    const tenantId = await callerTenantId(c.sub);
    if (!tenantId) return res.status(409).json({ blocked: 'NO_MEMBERSHIP' });
    const key = req.params.key;
    const requestedScope = (req.query.scope as string) || 'tenant';
    if (!['tenant','user'].includes(requestedScope)) {
      return res.status(400).json({ error: 'INVALID_SCOPE', detail: 'use scope=tenant or scope=user' });
    }
    const { rows: defs } = await pool.query(
      `SELECT id, config_key, allowed_scopes, is_overridable, is_lockable
         FROM dos.config_definitions WHERE config_key=$1 LIMIT 1`,
      [key],
    );
    if (defs.length === 0) return res.status(404).json({ error: 'UNKNOWN_KEY' });
    const def = defs[0];
    const allowed: string[] = def.allowed_scopes || [];
    if (!allowed.includes(requestedScope)) {
      return res.status(403).json({ error: 'SCOPE_NOT_ALLOWED', allowedScopes: allowed });
    }
    if (requestedScope === 'tenant') {
      // tenant lock — if dos.config_locks pins this definition for tenant, block.
      const { rows: locks } = await pool.query(
        `SELECT 1 FROM dos.config_locks WHERE definition_id=$1 AND scope_type='tenant' AND scope_id=$2`,
        [def.id, tenantId],
      );
      if (locks.length > 0) return res.status(423).json({ error: 'CONFIG_LOCKED' });
      const roles = await callerRoles(c.sub, tenantId);
      if (!isTenantAdmin(roles) && !isPlatformAdmin(roles)) {
        return res.status(403).json({ error: 'TENANT_ADMIN_REQUIRED', yourRoles: Array.from(roles) });
      }
      if (def.is_overridable === false) {
        const roles2 = await callerRoles(c.sub, tenantId);
        if (!isPlatformAdmin(roles2)) return res.status(403).json({ error: 'NOT_OVERRIDABLE' });
      }
      await writeConfigValue(def.id, def.config_key, 'tenant', tenantId, req.body?.value, c.sub, 'tenant-admin');
      return res.json({ ok: true, scope: 'tenant', scopeId: tenantId });
    }
    // user-scope — caller writes their own preference.
    await writeConfigValue(def.id, def.config_key, 'user', c.sub, req.body?.value, c.sub, 'user-self');
    return res.json({ ok: true, scope: 'user', scopeId: c.sub });
  } catch (err) {
    console.error('[tenant-service] PUT /config-center/settings/:key failed', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// PUT /platform-config/settings/:key — platform-admin only
app.put('/platform-config/settings/:key', async (req: Request, res: Response) => {
  const c = requireCaller(req, res);
  if (!c) return;
  try {
    const tenantId = (await callerTenantId(c.sub)) || 'platform';
    const roles = await callerRoles(c.sub, tenantId);
    if (!isPlatformAdmin(roles)) {
      return res.status(403).json({ error: 'PLATFORM_ADMIN_REQUIRED', yourRoles: Array.from(roles) });
    }
    const key = req.params.key;
    const { rows: defs } = await pool.query(
      `SELECT id, config_key FROM dos.config_definitions WHERE config_key=$1 LIMIT 1`, [key],
    );
    if (defs.length === 0) return res.status(404).json({ error: 'UNKNOWN_KEY' });
    await writeConfigValue(defs[0].id, defs[0].config_key, 'platform', 'platform', req.body?.value, c.sub, 'platform-admin');
    res.json({ ok: true, scope: 'platform', scopeId: 'platform' });
  } catch (err) {
    console.error('[tenant-service] PUT /platform-config/settings/:key failed', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// GET /platform-config/settings — platform-admin view of all values across scopes.
app.get('/platform-config/settings', async (req: Request, res: Response) => {
  const c = requireCaller(req, res);
  if (!c) return;
  try {
    const tenantId = (await callerTenantId(c.sub)) || 'platform';
    const roles = await callerRoles(c.sub, tenantId);
    if (!isPlatformAdmin(roles)) {
      return res.status(403).json({ error: 'PLATFORM_ADMIN_REQUIRED' });
    }
    const { rows } = await pool.query(
      `SELECT d.config_key AS key, d.label, d.description, d.module_code AS module,
              d.category, d.data_type, d.enum_values, d.allowed_scopes,
              d.is_overridable, d.is_lockable, d.is_secret, d.default_value AS platform_default,
              (SELECT value FROM dos.config_values
                WHERE definition_id=d.id AND scope_type='platform' AND scope_id='platform' AND is_active=TRUE LIMIT 1) AS platform_value,
              (SELECT COUNT(*) FROM dos.config_values
                WHERE definition_id=d.id AND scope_type='tenant' AND is_active=TRUE) AS tenant_overrides,
              (SELECT COUNT(*) FROM dos.config_values
                WHERE definition_id=d.id AND scope_type='user'   AND is_active=TRUE) AS user_overrides
         FROM dos.config_definitions d
        ORDER BY d.category NULLS LAST, d.config_key`,
    );
    res.json({
      items: rows.map(r => ({
        key: r.key, label: r.label, description: r.description, module: r.module,
        category: r.category, dataType: r.data_type, enumValues: r.enum_values || [],
        allowedScopes: r.allowed_scopes || [], isOverridable: r.is_overridable,
        isLockable: r.is_lockable, isSecret: r.is_secret,
        platformDefault: r.platform_default,
        platformValue: r.is_secret ? null : r.platform_value,
        tenantOverrides: Number(r.tenant_overrides),
        userOverrides:   Number(r.user_overrides),
      })),
      total: rows.length,
    });
  } catch (err) {
    console.error('[tenant-service] /platform-config/settings failed', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// GET /config-center/permissions-catalog — i18n permissions catalog (en/ar)
app.get('/config-center/permissions-catalog', async (req: Request, res: Response) => {
  const c = requireCaller(req, res);
  if (!c) return;
  try {
    const moduleCode = req.query.module as string | undefined;
    const params: any[] = [];
    let where = '';
    if (moduleCode) { params.push(moduleCode); where = `WHERE module_code = $${params.length}`; }
    const { rows } = await pool.query(
      `SELECT permission_code AS code, module_code AS module, resource_type, action_type,
              label_en, label_ar, description_en, description_ar
         FROM platform_dauth.permissions ${where}
         ORDER BY module_code NULLS LAST, permission_code`,
      params,
    );
    res.json({ items: rows, total: rows.length });
  } catch (err) {
    console.error('[tenant-service] /config-center/permissions-catalog failed', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── /module-config/:moduleCode/* — platform-wide config proxy ──────────
// Per AGENTS.md: tenant-service owns the platform-wide /module-config proxy;
// each module owns its canonical source under /api/<module>/module-config/*.
// This proxy resolves the owning service via env (no DB call on hot path)
// and forwards verbatim. Identity headers (x-user-*/x-tenant-*) are passed
// through; gateway-origin signing is reused since tenant-service mounts
// `requireGatewayOrigin()` globally at the top, meaning callers already
// crossed the gateway trust boundary.
const MODULE_OWNER_SERVICE: Record<string, string | undefined> = {
  foundation: process.env.USER_SERVICE_URL,
};

const FORWARD_HEADERS = new Set<string>([
  'authorization',
  'cookie',
  'accept',
  'accept-language',
  'content-type',
  'x-user-sub',
  'x-user-email',
  'x-user-name',
  'x-user-roles',
  'x-tenant-id',
  'x-dos-gateway-token',
  'x-request-id',
]);

app.all('/module-config/:moduleCode/*', async (req: Request, res: Response) => {
  const moduleCode = String(req.params.moduleCode || '').toLowerCase();
  const ownerUrl = MODULE_OWNER_SERVICE[moduleCode];
  if (!ownerUrl) {
    res.status(404).json({
      success: false,
      error: 'UNKNOWN_MODULE',
      moduleCode,
      allowed: Object.keys(MODULE_OWNER_SERVICE).filter((k) => MODULE_OWNER_SERVICE[k]),
    });
    return;
  }
  // req.params[0] captures the wildcard tail.
  const tail = String((req.params as any)[0] || '');
  const upstream = `${ownerUrl.replace(/\/+$/, '')}/api/${moduleCode}/module-config/${tail}`;
  try {
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v !== 'string') continue;
      if (FORWARD_HEADERS.has(k.toLowerCase())) headers[k] = v;
    }
    const init: RequestInit = {
      method: req.method,
      headers,
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      init.body = JSON.stringify(req.body ?? {});
      headers['content-type'] = headers['content-type'] || 'application/json';
    }
    const url = req.url.includes('?')
      ? `${upstream}?${req.url.split('?').slice(1).join('?')}`
      : upstream;
    const r = await fetch(url, init);
    res.status(r.status);
    const ct = r.headers.get('content-type');
    if (ct) res.setHeader('content-type', ct);
    const buf = Buffer.from(await r.arrayBuffer());
    res.send(buf);
  } catch (err) {
    console.error('[tenant-service] /module-config proxy failed', { moduleCode, err: String(err) });
    res.status(502).json({ success: false, error: 'MODULE_CONFIG_UPSTREAM_UNAVAILABLE', moduleCode });
  }
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[tenant-service] unhandled', err);
  res.status(500).json({ error: 'INTERNAL_ERROR' });
});

app.listen(PORT, '127.0.0.1', () => {
  console.info(`[tenant-service] listening on :${PORT}`);
  // Phase G T3 — start the lifecycle sweeper. Cron-equivalent runs every
  // 60s by default; override via TRIAL_LIFECYCLE_INTERVAL_MS. Disable
  // entirely by setting TRIAL_LIFECYCLE_DISABLED=true (used in tests).
  if (process.env.TRIAL_LIFECYCLE_DISABLED !== 'true') {
    startTrialLifecycleSweeper(pool);
    console.info('[tenant-service] trial-lifecycle sweeper started');
  }
});

// Phase G T4 — manual sweep trigger (admin/test only). Useful when you
// want to fast-forward a trial by setting `ends_at` in the past then
// hitting this. Auth: requires gateway-origin (admin endpoints upstream).
app.post('/trials/sweep', async (req: Request, res: Response) => {
  try {
    const stats = await runTrialLifecycleSweep(pool);
    return res.json({ ok: true, stats });
  } catch (err) {
    console.error('[tenant-service] /trials/sweep failed', err);
    return res.status(500).json({ error: 'SWEEP_FAILED' });
  }
});
