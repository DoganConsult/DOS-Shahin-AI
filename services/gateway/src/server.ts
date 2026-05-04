/**
 * DOS Platform — API Gateway (clean shell).
 *
 * Responsibilities (only):
 *   1. Receive /api/* from product-shell.
 *   2. Verify Keycloak access tokens (RS256, JWKS) for protected paths.
 *   3. Proxy /api/auth/*   → auth-service   (DAuth, port 4001)
 *      Proxy /api/tenants/*→ tenant-service (port 4002)
 *
 * No business modules are mounted. Module hosts are added back per-module
 * after each module is rebuilt against the canonical Foundation template.
 */
import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { WebSocketServer, WebSocket as WSClient } from 'ws';
import type { IncomingMessage } from 'node:http';
import { Pool as PgPool } from 'pg';
import {
  GATEWAY_ORIGIN_HEADER,
  signGatewayOrigin,
  stripInboundIdentityHeaders,
} from './middleware/gateway-origin';
import { initDecisionLedger, writeDecision } from './middleware/decision-ledger';
import { adminZoneMtlsAgent, adminZoneMtlsStatus } from './middleware/admin-zone-mtls';

const PORT = Number(process.env.PORT || 4000);
const AUTH_SERVICE_URL = required('AUTH_SERVICE_URL');
const TENANT_SERVICE_URL = required('TENANT_SERVICE_URL');
const USER_SERVICE_URL = process.env.USER_SERVICE_URL;
const INTEGRATIONS_SERVICE_URL = process.env.INTEGRATIONS_SERVICE_URL;
const AI_ENGINE_SERVICE_URL = process.env.AI_ENGINE_SERVICE_URL;
const AI_GOVERNANCE_SERVICE_URL = process.env.AI_GOVERNANCE_SERVICE_URL;
const AI_GATEWAY_SERVICE_URL = process.env.AI_GATEWAY_SERVICE_URL;
const DYNAMIC_UI_SERVICE_URL = process.env.DYNAMIC_UI_SERVICE_URL;
const UI_OS_SERVICE_URL = process.env.UI_OS_SERVICE_URL || 'http://127.0.0.1:4015';
const PRIVACY_SERVICE_URL = process.env.PRIVACY_SERVICE_URL;
const LANGFUSE_URL = process.env.LANGFUSE_URL;
const DASHBOARD_WIDGETS_SERVICE_URL = process.env.DASHBOARD_WIDGETS_SERVICE_URL;
const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL;
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL;
const WORKFLOW_SERVICE_URL = process.env.WORKFLOW_SERVICE_URL || 'http://127.0.0.1:4004';
// 4D platform pillars — port surfaces.
const DOS_SERVICE_URL  = process.env.DOS_SERVICE_URL  || 'http://127.0.0.1:4100';
const DSOC_SERVICE_URL = process.env.DSOC_SERVICE_URL || 'http://127.0.0.1:4101';
const DNOC_SERVICE_URL = process.env.DNOC_SERVICE_URL || 'http://127.0.0.1:4102';
// Platform Admin Workspace — unified surface fronting the 4D pillars.
const ADMIN_SERVICE_URL = process.env.ADMIN_SERVICE_URL || 'http://127.0.0.1:4080';

// Wave 5/6/7 (Phase 1 PM2 reconciliation, 2026-04-30) — additional service
// targets enrolled per ports.allocation.json. No-delete policy: every
// existing service has a distinct prefix; overlapping services use namespaced
// prefixes (e.g. /api/agrc-os-service vs /api/agrc-os which is served by ai-engine).
// WORKFLOW_SERVICE_URL declared above (line 44).
const AUDIT_SERVICE_URL                      = process.env.AUDIT_SERVICE_URL                      || 'http://127.0.0.1:4006';
const ONBOARDING_SERVICE_URL                 = process.env.ONBOARDING_SERVICE_URL                 || 'http://127.0.0.1:4010';
const NOTIFICATION_INBOX_SERVICE_URL         = process.env.NOTIFICATION_INBOX_SERVICE_URL         || 'http://127.0.0.1:4025';
const RISK_INCIDENT_SERVICE_URL              = process.env.RISK_INCIDENT_SERVICE_URL              || 'http://127.0.0.1:4030';
const GOVERNANCE_POLICY_SERVICE_URL          = process.env.GOVERNANCE_POLICY_SERVICE_URL          || 'http://127.0.0.1:4031';
const EVIDENCE_AUDIT_REPORTING_SERVICE_URL   = process.env.EVIDENCE_AUDIT_REPORTING_SERVICE_URL   || 'http://127.0.0.1:4032';
const EXECUTIVE_INTELLIGENCE_SERVICE_URL     = process.env.EXECUTIVE_INTELLIGENCE_SERVICE_URL     || 'http://127.0.0.1:4033';
const AGRC_OS_SERVICE_URL                    = process.env.AGRC_OS_SERVICE_URL                    || 'http://127.0.0.1:4035';
const RECORDS_SERVICE_URL                    = process.env.RECORDS_SERVICE_URL                    || 'http://127.0.0.1:4036';
const REMEDIATION_ACTION_SERVICE_URL         = process.env.REMEDIATION_ACTION_SERVICE_URL         || 'http://127.0.0.1:4037';
const PORTALS_SERVICE_URL                    = process.env.PORTALS_SERVICE_URL                    || 'http://127.0.0.1:4038';
const TRAINING_SERVICE_URL                   = process.env.TRAINING_SERVICE_URL                   || 'http://127.0.0.1:4039';
const DORA_SERVICE_URL                       = process.env.DORA_SERVICE_URL                       || 'http://127.0.0.1:4040';
const ASSET_SERVICE_URL                      = process.env.ASSET_SERVICE_URL                      || 'http://127.0.0.1:4041';
const ANALYTICS_REPORTING_SERVICE_URL        = process.env.ANALYTICS_REPORTING_SERVICE_URL        || 'http://127.0.0.1:4042';
const BCP_SERVICE_URL                        = process.env.BCP_SERVICE_URL                        || 'http://127.0.0.1:4043';
const VENDOR_SERVICE_URL                     = process.env.VENDOR_SERVICE_URL                     || 'http://127.0.0.1:4044';
const PLATFORM_CORE_SERVICE_URL              = process.env.PLATFORM_CORE_SERVICE_URL              || 'http://127.0.0.1:4045';
const PLATFORM_PRODUCT_SERVICE_URL           = process.env.PLATFORM_PRODUCT_SERVICE_URL           || 'http://127.0.0.1:4046';
const PLATFORM_APP_SHELL_URL                 = process.env.PLATFORM_APP_SHELL_URL                 || 'http://127.0.0.1:3010';
const MCP_GATEWAY_SERVICE_URL                = process.env.MCP_GATEWAY_SERVICE_URL                || 'http://127.0.0.1:3011';
const KC_ISSUER = required('KEYCLOAK_ISSUER');
const KC_AUDIENCE = required('KEYCLOAK_AUDIENCE');
const KC_JWKS_URL = required('KEYCLOAK_JWKS_URL');
// Wave 1 — gateway-origin trust contract. Required for downstream services
// to verify the request actually entered through this gateway. Any service
// that runs with LEGACY_HEADER_TRUST=false REQUIRES this to be set on the
// gateway side. We fail-closed at startup so a misconfigured deploy never
// leaves a service unprotected.
const GATEWAY_ORIGIN_HMAC_SECRET = required('GATEWAY_ORIGIN_HMAC_SECRET');
if (GATEWAY_ORIGIN_HMAC_SECRET.length < 32) {
  throw new Error('GATEWAY_ORIGIN_HMAC_SECRET must be at least 32 characters');
}
const GATEWAY_ORIGIN_TTL_SECONDS = Number(process.env.GATEWAY_ORIGIN_TTL_SECONDS || 60);

// Best-effort decision-ledger writer for gateway-owned decisions
// (WS upgrade allow/deny, session bootstrap). DATABASE_URL is optional —
// when absent the ledger is disabled (warning at boot, no DB writes).
initDecisionLedger(process.env.DATABASE_URL);

// ── Tenant resolver — DB-backed lookup for JWTs missing tenantId claim.
// Keycloak tokens carry no tenant claim today; without this the
// `x-tenant-id` header would be empty and downstream tenant-scoped
// endpoints (Foundation et al.) would 401 with TENANT_REQUIRED, which the
// SPA's auth-error interceptor turns into an auto-logout loop.
//
// Lookup order: dos.tenant_memberships (active) → dos.users.tenant_id.
// In-memory TTL cache keeps the hot path single-digit-ms.
const tenantPool: PgPool | null = process.env.DATABASE_URL
  ? new PgPool({ connectionString: process.env.DATABASE_URL, max: Number(process.env.DB_POOL_MAX || 5) })
  : null;
if (!tenantPool) {
  console.warn('[gateway] DATABASE_URL not set — JWT tenant enrichment disabled');
}
const TENANT_CACHE_TTL_MS = Number(process.env.GATEWAY_TENANT_CACHE_TTL_MS || 60_000);
const tenantCache = new Map<string, { tenantId: string | null; expiresAt: number }>();

async function resolveTenantId(sub: string, email: string): Promise<string | null> {
  if (!tenantPool || !sub) return null;
  const key = sub;
  const now = Date.now();
  const hit = tenantCache.get(key);
  if (hit && hit.expiresAt > now) return hit.tenantId;
  let tenantId: string | null = null;
  try {
    const r = await tenantPool.query(
      `SELECT tenant_id FROM dos.tenant_memberships
        WHERE user_id = $1 AND status = 'active'
        ORDER BY is_tenant_owner DESC, created_at ASC LIMIT 1`,
      [sub],
    );
    if (r.rows.length > 0) {
      tenantId = String(r.rows[0].tenant_id);
    } else if (email) {
      const r2 = await tenantPool.query(
        `SELECT u.tenant_id FROM dos.users u
          WHERE u.user_id = $1 OR u.email = $2
          ORDER BY (u.user_id = $1) DESC LIMIT 1`,
        [sub, email],
      );
      if (r2.rows.length > 0 && r2.rows[0].tenant_id) {
        tenantId = String(r2.rows[0].tenant_id);
      }
    }
  } catch (e) {
    console.warn('[gateway] tenant resolve failed', (e as Error).message);
  }
  tenantCache.set(key, { tenantId, expiresAt: now + TENANT_CACHE_TTL_MS });
  return tenantId;
}
const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Required environment variable ${name} is not set`);
  return v;
}

const jwks = createRemoteJWKSet(new URL(KC_JWKS_URL), {
  cooldownDuration: Number(process.env.KEYCLOAK_JWKS_CACHE_TTL_MS || 600_000),
});

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'same-site' },
}));
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    cb(null, ALLOWED_ORIGINS.includes(origin));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(morgan(process.env.LOG_FORMAT || 'combined'));

// Wave 1 trust-boundary contract — strip every identity header from the
// inbound request BEFORE any other middleware sees it. The gateway is the
// SOLE writer of `x-user-*` / `x-tenant-*` / `x-dos-gateway-token`, so any
// of those arriving from the public internet is a spoof attempt and must
// not survive into the auth chain or downstream services.
app.use((req: Request, _res: Response, next: NextFunction) => {
  stripInboundIdentityHeaders(req);
  next();
});

app.get('/health', (_req, res) => res.json({ ok: true, service: 'gateway' }));
app.get('/ready',  (_req, res) => res.json({ ok: true, service: 'gateway' }));
// SPA healthbar polls /api/health — alias to the same payload.
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'gateway' }));

// Public auth endpoints — no JWT required (login, callback, refresh, logout, health).
// CSRF stub removed — see Task 9. The OIDC flow is cookie+PKCE; no XSRF token is exchanged.
const PUBLIC_AUTH_PATHS = new Set<string>([
  '/api/auth/oidc/start',
  '/api/auth/oidc/callback',
  '/api/auth/oidc/refresh',
  '/api/auth/oidc/session',
  '/api/auth/oidc/logout',
  '/api/auth/logout',
  '/api/auth/health',
]);

async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: KC_ISSUER,
    audience: KC_AUDIENCE,
  });
  return payload;
}

function authGuard(req: Request, res: Response, next: NextFunction) {
  if (PUBLIC_AUTH_PATHS.has(req.path)) return next();

  const cookieToken = (req.cookies && req.cookies['dos_access_token']) as string | undefined;
  const headerToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || undefined;
  const token = cookieToken || headerToken;
  if (!token) return res.status(401).json({ error: 'UNAUTHENTICATED' });

  verifyToken(token)
    .then(async payload => {
      (req as any).user = payload;
      // Enrich JWT with tenantId from DB when the token has no tenant claim.
      // Keycloak access tokens currently carry no tenant claim; downstream
      // tenant-scoped endpoints (Foundation et al.) require x-tenant-id.
      const u: any = payload;
      const claimTenant = u?.tenantId || u?.tenant_id;
      if (!claimTenant) {
        const sub = u?.sub ? String(u.sub) : '';
        const email = u?.email ? String(u.email) : '';
        const resolved = await resolveTenantId(sub, email);
        if (resolved) (req as any).user.tenantId = resolved;
      }
      next();
    })
    .catch(() => res.status(401).json({ error: 'INVALID_TOKEN' }));
}

// /api/auth/* → auth-service (public + protected handled inside the service)
app.use('/api/auth', createProxyMiddleware({
  target: AUTH_SERVICE_URL,
  changeOrigin: true,
  xfwd: true,
}));

// Inject identity headers from verified JWT for downstream services.
//
// Wave 1: in addition to the legacy `x-user-*` / `x-tenant-id` headers
// (kept for back-compat during dual-mode rollout), we also issue a short-lived
// HMAC-signed `x-dos-gateway-token`. Once a downstream service runs with
// LEGACY_HEADER_TRUST=false it ignores the legacy headers and trusts ONLY the
// signed token. The token's payload is the truth; downstream services pin
// their `req.principal` from it and must not read the legacy headers.
// Phase 6 (Wave 6, 2026-04-30): originalUrl restorer used by every proxy
// whose upstream mounts its routers at /api/<prefix> (NOT bare paths).
// http-proxy-middleware v3 forwards req.url which Express has stripped of
// the mount prefix; restoring originalUrl preserves the canonical full path
// so app.use('/api/<prefix>', router) in the upstream matches.
function forwardOriginalUrl(req: Request, res: Response, next: NextFunction) {
  // Wave C (2026-04-30): http-proxy-middleware v3 silently bypasses
  // (calls next()) when express has stripped the entire mount path so
  // req.url === '/' or ''. Concretely, GET /api/risk against
  // app.use('/api/risk', proxy) causes the proxy to skip → falls through
  // to the /api 404 catch-all. Mitigation: 308-redirect bare-prefix
  // requests to the trailing-slash variant so the proxy fires.
  const u = (req as any).url;
  const orig = (req as any).originalUrl;
  if ((u === '' || u === '/') && orig && !String(orig).endsWith('/')) {
    res.redirect(308, String(orig) + '/');
    return;
  }
  if (orig) (req as any).url = orig;
  next();
}

function injectIdentityHeaders(req: Request, _res: Response, next: NextFunction) {
  const u = (req as any).user || {};
  const sub = u.sub ? String(u.sub) : '';
  const email = u.email ? String(u.email) : '';
  const name = u.name || u.preferred_username ? String(u.name || u.preferred_username) : '';
  const tenantId = u.tenantId || u.tenant_id ? String(u.tenantId || u.tenant_id) : '';
  // Roles: project realm + resource roles into a single normalized array.
  const realmRoles: string[] = Array.isArray(u?.realm_access?.roles) ? u.realm_access.roles : [];
  const resourceRoles: string[] = Object.values(u?.resource_access ?? {})
    .flatMap((entry: any) => (Array.isArray(entry?.roles) ? entry.roles : []));
  const directRoles: string[] = Array.isArray(u?.roles) ? u.roles : [];
  const roles = Array.from(new Set([...realmRoles, ...resourceRoles, ...directRoles]
    .filter((r): r is string => typeof r === 'string' && r.length > 0)));

  const PLATFORM_SUPER_ADMIN_ROLES = new Set(['platform-super-admin']);
  if (roles.some((r) => PLATFORM_SUPER_ADMIN_ROLES.has(r))) {
    req.headers['x-platform-super-admin'] = 'true';
  } else {
    delete req.headers['x-platform-super-admin'];
  }

  // Legacy headers (back-compat during dual-mode rollout).
  if (sub)      req.headers['x-user-sub']   = sub;
  if (email)    req.headers['x-user-email'] = email;
  if (name)     req.headers['x-user-name']  = name;
  if (tenantId) req.headers['x-tenant-id']  = tenantId;
  if (roles.length) req.headers['x-user-roles'] = roles.join(',');

  // Wave 1 — cryptographic origin proof. Required when sub+email are present
  // (i.e. authGuard succeeded). For routes that bypass authGuard (none today,
  // but defense in depth) we omit the token rather than sign empty values.
  if (sub && email) {
    try {
      const token = signGatewayOrigin(
        { sub, email, tenantId, roles, ttlSeconds: GATEWAY_ORIGIN_TTL_SECONDS },
        GATEWAY_ORIGIN_HMAC_SECRET,
      );
      req.headers[GATEWAY_ORIGIN_HEADER] = token;
    } catch (err) {
      console.error('[gateway] gateway-origin sign failed', (err as Error).message);
      // Do NOT propagate without a token when the secret is misconfigured —
      // fail closed. Downstream services will reject the unsigned request.
    }
  }
  next();
}

// More-specific /api/tenants/home alias FIRST — Express picks first matching mount.
// Without this ordering the broader /api/tenants proxy below strips '/api/tenants'
// and forwards '/home/overview' which tenant-service does not mount (it serves
// '/tenant-home/overview'), producing a 404. The pathRewrite here translates
// '/api/tenants/home/<rest>' → '/tenant-home/<rest>' so the canonical FE
// contract '/api/tenants/home/overview' resolves to the real handler.
app.use('/api/tenants/home', authGuard, injectIdentityHeaders, createProxyMiddleware({
  target: TENANT_SERVICE_URL,
  changeOrigin: true,
  xfwd: true,
  pathRewrite: (p) => `/tenant-home${p.startsWith('/') ? p : `/${p}`}`,
}));

// /api/tenants/* → tenant-service (protected)
app.use('/api/tenants', authGuard, injectIdentityHeaders, createProxyMiddleware({
  target: TENANT_SERVICE_URL,
  changeOrigin: true,
  xfwd: true,
}));

// Phase G T4 — /api/trials/* + /api/subscription/* → tenant-service.
// Tenant-service exposes /trials/current and /subscription/current; the
// gateway re-prepends /trials | /subscription via pathRewrite because
// express.use strips the mount prefix.
app.use('/api/trials', authGuard, injectIdentityHeaders, createProxyMiddleware({
  target: TENANT_SERVICE_URL,
  changeOrigin: true,
  xfwd: true,
  pathRewrite: (p) => `/trials${p.startsWith('/') ? p : `/${p}`}`,
}));
app.use('/api/subscription', authGuard, injectIdentityHeaders, createProxyMiddleware({
  target: TENANT_SERVICE_URL,
  changeOrigin: true,
  xfwd: true,
  pathRewrite: (p) => `/subscription${p.startsWith('/') ? p : `/${p}`}`,
}));

if (INTEGRATIONS_SERVICE_URL) {
  app.use('/api/integrations', authGuard, injectIdentityHeaders, createProxyMiddleware({
    target: INTEGRATIONS_SERVICE_URL,
    changeOrigin: true,
    xfwd: true,
  }));
  // FE calls /api/connector-health directly — real DB handler in integrations module
  // queries {tenant_schema}.connectors + connector_configs, returns merged health view.
  app.use('/api/connector-health', authGuard, injectIdentityHeaders, createProxyMiddleware({
    target: INTEGRATIONS_SERVICE_URL,
    changeOrigin: true,
    xfwd: true,
    pathRewrite: (path) => `/api/integrations/integrations/connector-health${path}`,
  }));
}

// Phase 8 (Wave 8, 2026-04-30): every AI upstream mounts its routers at
// /api/<prefix> (NOT bare paths). Express strips the mount prefix before
// http-proxy-middleware sees req.url, so without forwardOriginalUrl the
// upstream's app.use('/api/ai-engine', ...) etc. would 404. Same root-cause
// fix as Phase 6/7 — restore originalUrl before proxying.
if (AI_ENGINE_SERVICE_URL) {
  app.use('/api/ai-engine', authGuard, injectIdentityHeaders, forwardOriginalUrl, createProxyMiddleware({
    target: AI_ENGINE_SERVICE_URL,
    changeOrigin: true,
    xfwd: true,
  }));
  app.use('/api/ai-enhanced', authGuard, injectIdentityHeaders, forwardOriginalUrl, createProxyMiddleware({
    target: AI_ENGINE_SERVICE_URL,
    changeOrigin: true,
    xfwd: true,
  }));
  app.use('/api/ai-os', authGuard, injectIdentityHeaders, forwardOriginalUrl, createProxyMiddleware({
    target: AI_ENGINE_SERVICE_URL,
    changeOrigin: true,
    xfwd: true,
  }));
  app.use('/api/nudges', authGuard, injectIdentityHeaders, forwardOriginalUrl, createProxyMiddleware({
    target: AI_ENGINE_SERVICE_URL,
    changeOrigin: true,
    xfwd: true,
  }));
  // Public landing-copilot surface (A13) — no auth, rate-limited inside service.
  // pathRewrite kept here intentionally: explicit absolute upstream path so
  // the public unauthenticated mount is unambiguous.
  app.use('/api/copilot/public-chat', createProxyMiddleware({
    target: AI_ENGINE_SERVICE_URL,
    changeOrigin: true,
    xfwd: true,
    pathRewrite: () => '/api/copilot/public-chat',
  }));
  app.use('/api/copilot/public-agents', createProxyMiddleware({
    target: AI_ENGINE_SERVICE_URL,
    changeOrigin: true,
    xfwd: true,
    pathRewrite: () => '/api/copilot/public-agents',
  }));
  app.use('/api/copilot', authGuard, injectIdentityHeaders, forwardOriginalUrl, createProxyMiddleware({
    target: AI_ENGINE_SERVICE_URL,
    changeOrigin: true,
    xfwd: true,
  }));
  app.use('/api/agrc-os', authGuard, injectIdentityHeaders, forwardOriginalUrl, createProxyMiddleware({
    target: AI_ENGINE_SERVICE_URL,
    changeOrigin: true,
    xfwd: true,
  }));
  app.use('/api/security/quantum', authGuard, injectIdentityHeaders, forwardOriginalUrl, createProxyMiddleware({
    target: AI_ENGINE_SERVICE_URL,
    changeOrigin: true,
    xfwd: true,
  }));
  // Runtime health AI pulse — real DB handler queries dos.audit_trail for AI
  // actions in last 24h, computes health heuristic per module.
  app.use('/api/runtime-health', authGuard, injectIdentityHeaders, forwardOriginalUrl, createProxyMiddleware({
    target: AI_ENGINE_SERVICE_URL,
    changeOrigin: true,
    xfwd: true,
  }));
  // Phase 8 deeper (2026-04-30): top-level FE-contract AI prefixes lifted
  // from /api/ai-engine/* to their own canonical /api/<prefix>. Backing
  // routers (ai-explainability, ai-compliance-framework, ai-dpia-enhanced,
  // ai-model-risk, ai-agent-performance) are mounted by ai-engine main.ts
  // via aiTopLevelMounts. Same forwardOriginalUrl + authGuard pattern.
  app.use([
    '/api/ai-explainability',
    '/api/ai-compliance-framework',
    '/api/ai-dpia',
    '/api/ai-model-risk',
    '/api/ai-agent-performance',
  ], authGuard, injectIdentityHeaders, forwardOriginalUrl, createProxyMiddleware({
    target: AI_ENGINE_SERVICE_URL,
    changeOrigin: true,
    xfwd: true,
  }));
}

if (AI_GOVERNANCE_SERVICE_URL) {
  app.use('/api/ai-governance', authGuard, injectIdentityHeaders, forwardOriginalUrl, createProxyMiddleware({
    target: AI_GOVERNANCE_SERVICE_URL,
    changeOrigin: true,
    xfwd: true,
  }));
}

if (AI_GATEWAY_SERVICE_URL) {
  // ai-gateway-service mounts /api/ai, /api/ai/agents, /api/ai/registry,
  // /api/ai-gateway, /api/runtime-health.
  app.use('/api/ai', authGuard, injectIdentityHeaders, forwardOriginalUrl, createProxyMiddleware({
    target: AI_GATEWAY_SERVICE_URL,
    changeOrigin: true,
    xfwd: true,
  }));
  app.use('/api/ai-gateway', authGuard, injectIdentityHeaders, forwardOriginalUrl, createProxyMiddleware({
    target: AI_GATEWAY_SERVICE_URL,
    changeOrigin: true,
    xfwd: true,
  }));
}

// Phase M3 — PUBLIC marketing surface (no auth, no tenant). Anonymous
// visitors must reach /api/ui-os/{brand,marketing/*,agentic/*}. These paths
// MUST be matched BEFORE the authGuard'd /api/ui-os proxy below, otherwise
// authGuard returns 401. ui-os-service mounts the same prefixes ahead of
// requireGatewayOrigin (see services/ui-os-service/src/server.ts §M3).
if (UI_OS_SERVICE_URL) {
  const publicUiOsPrefixes = [
    '/api/ui-os/brand',
    '/api/ui-os/marketing/config',
    '/api/ui-os/marketing/assets',
    '/api/ui-os/marketing/downloads',
    '/api/ui-os/agentic/registry',
    '/api/ui-os/agentic/strip',
  ];
  // Phase M3.1 — anonymous template-binding for the 7 marketing-landing routes.
  // ui-os-service mirrors this allowlist (publicMarketingTemplateRoutes) so the
  // bypass is symmetrical: only `GET /api/ui-os/template-binding?route=<one>`
  // skips authGuard. Any other route still requires JWT.
  const publicMarketingRoutes = new Set<string>([
    '/', '/pricing', '/trust', '/security', '/contact', '/about', '/legal',
  ]);
  const publicUiOsProxy = createProxyMiddleware({
    target: UI_OS_SERVICE_URL,
    changeOrigin: true,
    xfwd: true,
    onError: (_err: unknown, _req: any, res: any) => {
      if (!res.headersSent) {
        res.status(503).type('application/json').send(JSON.stringify({
          ok: false,
          blocked: 'UI_OS_SERVICE_OFFLINE',
        }));
      }
    },
  } as any);
  app.use((req, res, next) => {
    const full = req.originalUrl.split('?')[0];
    if (publicUiOsPrefixes.some((p) => full === p || full.startsWith(p + '/'))) {
      return (publicUiOsProxy as any)(req, res, next);
    }
    if (req.method === 'GET' && full === '/api/ui-os/template-binding') {
      const qs = req.originalUrl.includes('?') ? req.originalUrl.split('?')[1] : '';
      const params = new URLSearchParams(qs);
      const route = params.get('route') ?? '';
      if (publicMarketingRoutes.has(route)) {
        return (publicUiOsProxy as any)(req, res, next);
      }
    }
    return next();
  });
}

// Wave 10a — canonical UI-OS service proxy. Single source / one path / one
// way: all UI-OS runtime, personalization, dashboards, widgets, grids,
// branding, theme, i18n, tours, help, search, commands, and admin
// publishing endpoints flow through /api/ui-os/* → ui-os-service:4015.
// Replaces the disabled dynamic-ui-service per the canonicalization decree.
if (UI_OS_SERVICE_URL) {
  app.use(
    '/api/ui-os',
    authGuard,
    injectIdentityHeaders,
    forwardOriginalUrl,
    createProxyMiddleware({
      target: UI_OS_SERVICE_URL,
      changeOrigin: true,
      xfwd: true,
      pathRewrite: { '^/api/ui-os': '/api/ui-os' },
      onError: (_err: unknown, _req: any, res: any) => {
        if (!res.headersSent) {
          res.status(503).type('application/json').send(JSON.stringify({
            ok: false,
            blocked: 'UI_OS_SERVICE_OFFLINE',
          }));
        }
      },
    } as any),
  );
}

// W8 — canonical Dynamic-UI contract surface (spec §10) is now served by
// ui-os-service alongside its existing /api/ui-os/* routes. Route the
// canonical /api/dynamic-ui/* path to ui-os-service so the spec-required
// endpoints (/contract/{moduleCode}, /route-catalog) resolve through the
// gateway. Legacy DYNAMIC_UI_SERVICE_URL fallback retained below for
// callers that still target the retired service.
if (UI_OS_SERVICE_URL) {
  app.use(
    '/api/dynamic-ui',
    authGuard,
    injectIdentityHeaders,
    forwardOriginalUrl,
    createProxyMiddleware({
      target: UI_OS_SERVICE_URL,
      changeOrigin: true,
      xfwd: true,
      pathRewrite: { '^/api/dynamic-ui': '/api/dynamic-ui' },
      onError: (_err: unknown, _req: any, res: any) => {
        if (!res.headersSent) {
          res.status(503).type('application/json').send(JSON.stringify({
            ok: false,
            blocked: 'UI_OS_SERVICE_OFFLINE',
            nav: [], groups: [], items: [], widgets: [], routes: [],
          }));
        }
      },
    } as any),
  );
} else if (DYNAMIC_UI_SERVICE_URL) {
  app.use(
    '/api/dynamic-ui',
    authGuard,
    injectIdentityHeaders,
    createProxyMiddleware({
      target: DYNAMIC_UI_SERVICE_URL,
      changeOrigin: true,
      xfwd: true,
      pathRewrite: { '^/api/dynamic-ui': '' },
      onError: (err: unknown, req: any, res: any) => {
        if (!res.headersSent) {
          res.status(503).type('application/json').send(JSON.stringify({
            ok: false,
            blocked: 'DYNAMIC_UI_SERVICE_OFFLINE',
            nav: [], groups: [], items: [], widgets: [], routes: [],
          }));
        }
      },
    } as any),
  );
} else {
  app.use('/api/dynamic-ui', authGuard, (_req, res) => {
    res.status(503).json({
      ok: false,
      blocked: 'DYNAMIC_UI_SERVICE_NOT_CONFIGURED',
      nav: [], groups: [], items: [], widgets: [], routes: [],
    });
  });
}

// Per-pillar health stubs. SPA's PlatformReadinessService probes each
// of these on boot; when the upstream service isn't running yet (or
// the gateway has no proxy for it), we return a structured "down"
// response so the SPA console shows "backend-offline" rather than 404
// noise. Foundation has its own real proxy mounted earlier.
const PILLAR_HEALTH_STUBS = ['/api/health/dauth', '/api/health/ai',
                              '/api/health/dnoc', '/api/health/dsoc',
                              '/api/health/dos'];
for (const pillarPath of PILLAR_HEALTH_STUBS) {
  app.get(pillarPath, (_req, res) => {
    // 200 with explicit `status: 'unknown'` so the SPA's readiness
    // resolver treats this as "service not yet probed" rather than
    // dead. When each pillar's actual /health proxy is wired below,
    // its more-specific Express route will win the dispatch.
    res.status(200).json({
      ok: true,
      module: pillarPath.split('/').pop(),
      status: 'unknown',
      reason: 'health-proxy-not-configured',
      ts: new Date().toISOString(),
    });
  });
}

// Self-hosted Langfuse — LLM observability UI for platform admins.
// Single-domain rollout: nginx mounts shahin-ai.com/admin/langfuse → here.
// Langfuse is built with NEXT_PUBLIC_BASE_PATH=/admin/langfuse, so URLs
// already include the prefix — DO NOT path-rewrite. Auth is Keycloak-only
// (Langfuse credentials provider disabled via AUTH_DISABLE_USERNAME_PASSWORD).
//
// Note: this proxy intentionally does NOT use authGuard. Langfuse handles
// its own Keycloak OIDC dance via NextAuth (one-source-of-tokens). A platform
// JWT in front would force two logins; we want one — Keycloak. The redirect
// flow lands on /admin/langfuse/api/auth/callback/keycloak which the
// Keycloak client `langfuse` accepts.
if (LANGFUSE_URL) {
  // Langfuse is built with NEXT_PUBLIC_BASE_PATH=/admin/langfuse so its router
  // expects URLs that start with /admin/langfuse. Express strips the mount
  // path before the proxy sees it, so we re-prepend via pathRewrite.
  const langfuseProxy = createProxyMiddleware({
    target: LANGFUSE_URL,
    changeOrigin: true,
    xfwd: true,
    ws: true,
    pathRewrite: { '^/': '/admin/langfuse/' },
  });
  app.use('/admin/langfuse', langfuseProxy);
}

// PM2 Fleet Dashboard — admin-service mounts a self-contained HTML+JSON
// surface at /admin/pm2 (HTTP Basic auth via PM2_DASHBOARD_USER/PASS).
// Same single-domain pattern as Langfuse: nginx -> gateway -> admin-service.
// Intentionally NO authGuard so the board stays reachable during a KC/DAuth
// outage (the scenario where operators need it most). admin-service does its
// own Basic auth on this surface.
app.use(
  '/admin/pm2',
  createProxyMiddleware({
    target: ADMIN_SERVICE_URL,
    changeOrigin: true,
    xfwd: true,
    pathRewrite: (p) => `/admin/pm2${p.startsWith('/') ? p : `/${p}`}`,
  }),
);

// Wave 5 — DNOC AI Operations + DSOC AI Security read-only aggregator.
// Routes live in ai-engine-service today; gateway path-rewrites so the public
// surface stays under /api/dnoc/ai and /api/dsoc/ai. When dnoc-service /
// dsoc-service grow native AI subdomains, change the targets here without
// touching upstream callers.
if (AI_ENGINE_SERVICE_URL) {
  app.use(
    '/api/dnoc/ai',
    authGuard,
    injectIdentityHeaders,
    createProxyMiddleware({
      target: AI_ENGINE_SERVICE_URL,
      changeOrigin: true,
      xfwd: true,
      pathRewrite: { '^/api/dnoc/ai': '/api/dnoc-ai' },
    }),
  );
  app.use(
    '/api/dsoc/ai',
    authGuard,
    injectIdentityHeaders,
    createProxyMiddleware({
      target: AI_ENGINE_SERVICE_URL,
      changeOrigin: true,
      xfwd: true,
      pathRewrite: { '^/api/dsoc/ai': '/api/dsoc-ai' },
    }),
  );
  // AI Employees Phase 1 — HR org chart routes live in ai-engine for now.
  // Public surface: /api/ai-hr/* — same auth path as the other AI sub-modules.
  app.use(
    '/api/ai-hr',
    authGuard,
    injectIdentityHeaders,
    forwardOriginalUrl,
    createProxyMiddleware({
      target: AI_ENGINE_SERVICE_URL,
      changeOrigin: true,
      xfwd: true,
    }),
  );
  // Sales Copilot Leads — captures from A13 public-chat into copilot_leads,
  // RBAC ai.copilot.read for list/get + ai.copilot.write for transitions.
  app.use(
    '/api/sales/copilot-leads',
    authGuard,
    injectIdentityHeaders,
    forwardOriginalUrl,
    createProxyMiddleware({
      target: AI_ENGINE_SERVICE_URL,
      changeOrigin: true,
      xfwd: true,
    }),
  );
}

// 4D platform pillars — public port surfaces. These mounts come AFTER the
// /api/dnoc/ai and /api/dsoc/ai mounts above so the more-specific AI prefixes
// continue to win express path resolution.
//   DOS  → /api/dos                (health + DOSPort REST at /port/v1)
//   DSOC → /api/dsoc/port/v1       (audit-events, alerts read surface)
//   DNOC → /api/dnoc/port/v1       (metrics, traces, routes, health)
app.use('/api/dsoc/port', authGuard, injectIdentityHeaders, createProxyMiddleware({
  target: DSOC_SERVICE_URL,
  changeOrigin: true,
  xfwd: true,
  pathRewrite: (p) => `/api/dsoc/port${p.startsWith('/') ? p : `/${p}`}`,
}));
app.use('/api/dnoc/port', authGuard, injectIdentityHeaders, createProxyMiddleware({
  target: DNOC_SERVICE_URL,
  changeOrigin: true,
  xfwd: true,
  pathRewrite: (p) => `/api/dnoc/port${p.startsWith('/') ? p : `/${p}`}`,
}));
app.use('/api/dos', authGuard, injectIdentityHeaders, createProxyMiddleware({
  target: DOS_SERVICE_URL,
  changeOrigin: true,
  xfwd: true,
  pathRewrite: (p) => `/api/dos${p.startsWith('/') ? p : `/${p}`}`,
}));
// DNOC + DSOC root surfaces (health/ready and any future non-port subpaths).
// Registered AFTER /api/dnoc/ai, /api/dnoc/port and /api/dsoc/ai, /api/dsoc/port
// so the more-specific prefixes still win express path resolution.
app.use('/api/dnoc', authGuard, injectIdentityHeaders, createProxyMiddleware({
  target: DNOC_SERVICE_URL,
  changeOrigin: true,
  xfwd: true,
  pathRewrite: (p) => `/api/dnoc${p.startsWith('/') ? p : `/${p}`}`,
}));
app.use('/api/dsoc', authGuard, injectIdentityHeaders, createProxyMiddleware({
  target: DSOC_SERVICE_URL,
  changeOrigin: true,
  xfwd: true,
  pathRewrite: (p) => `/api/dsoc${p.startsWith('/') ? p : `/${p}`}`,
}));

// ── DOS Master M11 — admin-console-bff (platform-admin trust zone) ──────
// /api/admin/console/* routes to admin-console-bff:4013. Trust zone is
// SEPARATE from the tenant Keycloak realm (Doctrine Article 4): auth uses
// a JWE-shaped opaque session token issued by the BFF itself
// (provision-temp-admin.mjs / future platform-ops realm), bound to a row
// in platform_admin.platform_admin_session. The KC-derived authGuard MUST
// NOT gate this prefix; the BFF runs its own requireAdmin middleware on
// every protected route and exempts /auth/email-login + /auth/whoami.
//
// Mounted BEFORE the broader /api/admin → admin-service proxy so it wins
// path-prefix matching for /api/admin/console/*.
const ADMIN_CONSOLE_BFF_URL = process.env.ADMIN_CONSOLE_BFF_URL || 'http://127.0.0.1:4013';
// M15 D1 (C) — admin-zone mTLS hook. agent === null when MTLS_ENFORCE=0
// or materials missing; proxy then falls through to plain HTTP loopback.
// L29 (Phase 3 D2): Only attach the mTLS HttpsAgent when EVERY admin-zone
// upstream target URL is https://. Mixed http+https admin upstreams would
// break the proxy. When upstreams are still plain HTTP the agent is
// dropped to null and a warning is logged so the half-flip is visible
// (Article 5 — no fake-green). Once admin services expose HTTPS listeners
// the URLs flip to https:// and the agent activates automatically.
const _adminZoneAgentRaw = adminZoneMtlsAgent();
const _adminUpstreamsAllHttps = (
  (process.env.ADMIN_CONSOLE_BFF_URL || 'http://127.0.0.1:4013').startsWith('https:') &&
  (process.env.DOS_WORKFLOW_SERVICE_URL || 'http://127.0.0.1:4018').startsWith('https:')
);
const adminZoneAgent = (_adminZoneAgentRaw && _adminUpstreamsAllHttps) ? _adminZoneAgentRaw : null;
console.log(`[gateway] admin-zone mTLS: ${adminZoneMtlsStatus()}${_adminZoneAgentRaw && !_adminUpstreamsAllHttps ? ' (agent staged, awaiting https:// upstreams)' : ''}`);
app.use('/api/admin/console', createProxyMiddleware({
  target: ADMIN_CONSOLE_BFF_URL,
  changeOrigin: true,
  xfwd: true,
  pathRewrite: (p) => `/api/admin/console${p.startsWith('/') ? p : `/${p}`}`,
  ...(adminZoneAgent ? { agent: adminZoneAgent } : {}),
}));

// ── DOS Master Phase 2 L13 — workflow-service (admin trust zone) ────────
// /api/admin/workflow/* routes to workflow-service:4018. Mounted BEFORE
// the broader /api/admin → admin-service proxy so it wins path matching.
const DOS_WORKFLOW_SERVICE_URL = process.env.DOS_WORKFLOW_SERVICE_URL || 'http://127.0.0.1:4018';
app.use('/api/admin/workflow', createProxyMiddleware({
  target: DOS_WORKFLOW_SERVICE_URL,
  changeOrigin: true,
  xfwd: true,
  pathRewrite: (p) => `/api/admin/workflow${p.startsWith('/') ? p : `/${p}`}`,
  ...(adminZoneAgent ? { agent: adminZoneAgent } : {}),
}));

// ── DOS Master Phase 2 L14..L27 — 14 Phase-2 OS services (admin trust zone)
// Each proxy mounts BEFORE the broader /api/admin → admin-service so it wins.
const PHASE2_OS = [
  ['ai-os',                4019],
  ['notification-os',      4020],
  ['integration-os',       4021],
  ['data-governance-os',   4022],
  ['billing-os',           4023],
  ['feature-flag-os',      4024],
  ['security-secrets-os',  4025],
  ['telemetry-os',         4026],
  ['schema-authoring-os',  4027],
  ['deployment-os',        4028],
  ['release-os',           4029],
  ['vendor-risk-os',       4034],
  ['marketplace-os',       4031],
  ['dr-os',                4032],
] as const;
for (const [code, port] of PHASE2_OS) {
  const envKey = `DOS_${code.toUpperCase().replace(/-/g, '_')}_SERVICE_URL`;
  const target = (process.env as Record<string, string | undefined>)[envKey] || `http://127.0.0.1:${port}`;
  app.use(`/api/admin/${code}`, createProxyMiddleware({
    target,
    changeOrigin: true,
    xfwd: true,
    pathRewrite: (p) => `/api/admin/${code}${p.startsWith('/') ? p : `/${p}`}`,
    ...(adminZoneAgent ? { agent: adminZoneAgent } : {}),
  }));
}

// ── Platform Admin Workspace — proxied to admin-service ─────────────────
// /api/admin/{dos,dauth,dsoc,dnoc,whoami,overview,info} routes to the
// unified admin surface. admin-service does its own auth+permission check
// (requirePlatformAdmin) but the gateway still attaches authGuard +
// identity headers so the same KC token semantics apply as elsewhere.
app.use('/api/admin', authGuard, injectIdentityHeaders, createProxyMiddleware({
  target: ADMIN_SERVICE_URL,
  changeOrigin: true,
  xfwd: true,
  pathRewrite: (p) => `/api/admin${p.startsWith('/') ? p : `/${p}`}`,
}));

// Bootstrap session probe (used by the SPA before workspace renders).
// Enriched in a single round-trip: the gateway calls tenant-service /me
// internally so the SPA gets {user, tenant} without a second request.
app.get('/api/session/bootstrap', authGuard, async (req, res) => {
  const u = (req as any).user || {};
  const baseUser = {
    sub: u.sub,
    email: u.email,
    name: u.name || u.preferred_username,
    tenantId: u.tenantId || u.tenant_id || null,
  };
  try {
    const headers: Record<string, string> = {};
    if (u.sub)               headers['x-user-sub']   = String(u.sub);
    if (u.email)             headers['x-user-email'] = String(u.email);
    if (u.name || u.preferred_username) {
      headers['x-user-name'] = String(u.name || u.preferred_username);
    }
    const r = await fetch(`${TENANT_SERVICE_URL}/me`, { headers });
    if (r.ok) {
      const me = await r.json() as { user?: any; tenant?: any };
      return res.json({
        authenticated: true,
        user: { ...baseUser, id: me.user?.id, name: me.user?.name || baseUser.name, tenantId: me.tenant?.id || baseUser.tenantId },
        tenant: me.tenant || null,
      });
    }
  } catch (e) {
    console.warn('[gateway] bootstrap tenant enrich failed', (e as Error).message);
  }
  res.json({ authenticated: true, user: baseUser, tenant: null });
});

// Real DB-backed platform bootstrap / entitlements / permissions — proxied
// to tenant-service. Stubs were removed (Tasks 6/7/8); fail-closed semantics
// (NO_USER / NO_MEMBERSHIP / TENANT_NOT_ACTIVE) are emitted by tenant-service.
app.use('/api/platform/bootstrap', authGuard, injectIdentityHeaders, createProxyMiddleware({
  target: TENANT_SERVICE_URL,
  changeOrigin: true,
  xfwd: true,
  pathRewrite: () => '/bootstrap',
}));
app.use('/api/entitlements', authGuard, injectIdentityHeaders, createProxyMiddleware({
  target: TENANT_SERVICE_URL,
  changeOrigin: true,
  xfwd: true,
  pathRewrite: () => '/entitlements',
}));
// Fail-soft on transient tenant-service outage for /permissions: deny-by-default
// (empty roles/permissions) is safer than 502/500 — SPA hides gated UI but renders.
const myPermissionsProxyError = (req: any, res: any) => {
  if (req.method !== 'GET' || res.headersSent) {
    if (!res.headersSent) res.status(502).json({ error: 'TENANT_UPSTREAM_UNAVAILABLE' });
    return;
  }
  return res.json({ tenantId: null, roles: [], permissions: [], modules: [] });
};
app.use('/api/access/my-permissions', authGuard, injectIdentityHeaders, createProxyMiddleware({
  target: TENANT_SERVICE_URL,
  changeOrigin: true,
  xfwd: true,
  pathRewrite: () => '/permissions',
  onError: myPermissionsProxyError,
} as any));

// ── Platform-wide module-config proxy ────────────────────────────────────
// FE callers may resolve runtime config via the platform-wide path
// `/api/module-config/<moduleCode>/{list|detail|form|views|filters}/...`.
// Tenant-service owns the proxy — it resolves the owning service and
// forwards to that module's canonical `/api/<moduleCode>/module-config/*`
// source. Each module remains the source of truth; only the resolution is
// centralized here.
app.use('/api/module-config', authGuard, injectIdentityHeaders, createProxyMiddleware({
  target: TENANT_SERVICE_URL,
  changeOrigin: true,
  xfwd: true,
}));

// Foundation Settings page — read-only tenant configuration aggregator.
app.use('/api/tenant-config', authGuard, injectIdentityHeaders, createProxyMiddleware({
  target: TENANT_SERVICE_URL,
  changeOrigin: true,
  xfwd: true,
  pathRewrite: () => '/tenant-config',
}));

// Foundation Data Processing (RoPA) — proxied to privacy-service when configured.
if (PRIVACY_SERVICE_URL) {
  app.use('/api/privacy-ops', authGuard, injectIdentityHeaders, createProxyMiddleware({
    target: PRIVACY_SERVICE_URL,
    changeOrigin: true,
    xfwd: true,
  }));
  // Phase 7 deeper (2026-04-30): privacy-api.service.ts (FE) calls /api/privacy
  // directly — privacy-service mounts privacyExtensionsRouter + routes both at
  // /api/privacy. forwardOriginalUrl preserves the canonical mount path.
  app.use('/api/privacy', authGuard, injectIdentityHeaders, forwardOriginalUrl, createProxyMiddleware({
    target: PRIVACY_SERVICE_URL,
    changeOrigin: true,
    xfwd: true,
  }));
  // Phase 7 deeper (2026-04-30): executive-report.component.ts hits /api/dpia
  // directly. Upstream privacy-extensions handler lives at /api/privacy/dpias.
  // Rewrite the public surface to the canonical upstream path so the FE
  // contract (/api/dpia) stays stable while reusing the existing handler.
  app.use('/api/dpia', authGuard, injectIdentityHeaders, createProxyMiddleware({
    target: PRIVACY_SERVICE_URL,
    changeOrigin: true,
    xfwd: true,
    pathRewrite: (p) => `/api/privacy/dpias${p === '/' ? '' : p}`,
  }));
}

// Workspace-home overview/activity — proxied to tenant-service.
// Fail-soft: empty-but-valid envelope on transient outage keeps the home page
// renderable instead of showing a 5xx error. Matches the shape produced by
// tenant-service /tenant-home/overview enough for the SPA to hydrate.
const tenantHomeProxyError = (req: any, res: any) => {
  if (req.method !== 'GET' || res.headersSent) {
    if (!res.headersSent) res.status(502).json({ error: 'TENANT_UPSTREAM_UNAVAILABLE' });
    return;
  }
  return res.json({
    summary: { tenantId: null, workspaceId: null, tenantName: '', moduleCount: 0, memberCount: 0, setupPending: true },
    quickStats: [],
    context: { tenantId: null, workspaceId: null, modules: [], setup: { status: 'unavailable' }, defaultHomeRoute: '/workspace-home' },
    kpis: { users: { total: 0 }, departments: { total: 0 }, teams: { total: 0 }, vacancies: 0, complianceRate: 0, ownership: { gaps: 0, total: 0 } },
    vacancies: 0,
    complianceRate: 0,
    ownership: { gaps: 0, total: 0 },
    kpiTrends: {},
    actionCenter: { items: [], overdue: [], upcoming: [] },
    programHealth: { coverage: [], alerts: [] },
    lifecycle: { phase: 'setup' },
    activity: { items: [], total: 0 },
    degraded: true,
  });
};
app.use('/api/tenant-home', authGuard, injectIdentityHeaders, createProxyMiddleware({
  target: TENANT_SERVICE_URL,
  changeOrigin: true,
  xfwd: true,
  pathRewrite: (p: string) => `/tenant-home${p.startsWith('/') ? p : `/${p}`}`,
  onError: tenantHomeProxyError,
} as any));

// Soft fallback so the SPA Nudges widget renders an empty list instead
// of a 404 when ai-engine-service is down or the upstream lacks /active.
// Registered after the proxy mount so the proxy takes precedence when
// AI_ENGINE_SERVICE_URL is set; if no upstream answers, this responds.
app.get('/api/nudges/active', authGuard, (_req, res) => {
  res.json({ items: [], total: 0 });
});

// ── Foundation module surface — proxied to user-service ─────────────────
// User-service hosts the canonical Foundation module routers + the host-owned
// identity routers (users/teams/roles/departments). See
// services/user-service/src/server.ts and src/domain/foundation/index.ts.
if (USER_SERVICE_URL) {
  const FOUNDATION_PREFIXES = [
    '/api/foundation',
    '/api/users',
    '/api/teams',
    '/api/roles',
    '/api/departments',
    '/api/organizations',
    '/api/business-units',
    '/api/positions',
    '/api/locations',
    '/api/org-hierarchy',
    '/api/committees',
    '/api/ownership-mappings',
    '/api/ownership-mapping',
    '/api/sod',
    // Phase 3 (Wave 3, 2026-04-30): /api/governance was a catch-all here
    // which masked governance-policy-service. user-service only owns the
    // foundation-governance subpaths (/delegations, /committees, plus the
    // foundation-governance router mounted at /api/governance bare path
    // INSIDE user-service). Keep the specific subpaths here so they win
    // over the Wave 6 broad /api/governance → governance-policy-service.
    '/api/governance/delegations',
    '/api/governance/committees',
    '/api/user-lifecycle',
    '/api/bulk-invite',
    '/api/access-reviews',
    '/api/access-review',
    '/api/delegations',
    '/api/invitations',
    '/api/audit-trail',
    '/api/profiles',
    '/api/privacy-ops',
  ];
  for (const prefix of FOUNDATION_PREFIXES) {
    app.use(prefix, authGuard, injectIdentityHeaders, (req, _res, next) => {
      // http-proxy-middleware v3 forwards req.url which express has stripped
      // of the mount prefix. Restore originalUrl so downstream user-service
      // (which mounts at /api/foundation, /api/users, etc.) sees the canonical
      // path. Without this, /api/foundation/users → /users → 404.
      if ((req as any).originalUrl) (req as any).url = (req as any).originalUrl;
      next();
    }, createProxyMiddleware({
      target: USER_SERVICE_URL,
      changeOrigin: true,
      xfwd: true,
    }));
  }
}

// ── Foundation DNA health — public probe consumed by PlatformReadinessService.
// No auth required (matches user-service /api/health/foundation router).
// Mount AFTER FOUNDATION_PREFIXES so /api/health/foundation isn't accidentally
// captured by /api/foundation prefix matching.
if (USER_SERVICE_URL) {
  app.use('/api/health/foundation', createProxyMiddleware({
    target: USER_SERVICE_URL,
    changeOrigin: true,
    xfwd: true,
    pathRewrite: () => '/api/health/foundation',
  }));
}

// ── Tenant config alias — preserve existing FE contract ──────────────────
// FE calls GET /api/config/products-modules; tenant-service exposes it under
// /config-center/products-modules. Alias rewritten path so the SPA contract
// continues to work without touching many UI files.
app.use('/api/config/products-modules', authGuard, injectIdentityHeaders, createProxyMiddleware({
  target: TENANT_SERVICE_URL,
  changeOrigin: true,
  xfwd: true,
  pathRewrite: () => '/config-center/products-modules',
}));
// Also expose the canonical /api/config-center/* prefix so newer callers can
// hit it directly.
app.use('/api/config-center', authGuard, injectIdentityHeaders, createProxyMiddleware({
  target: TENANT_SERVICE_URL,
  changeOrigin: true,
  xfwd: true,
}));
// Platform-admin Config Center surface — same target, separate prefix.
// Backend enforces platform_admin/dos_admin role via callerRoles().
app.use('/api/platform-config', authGuard, injectIdentityHeaders, createProxyMiddleware({
  target: TENANT_SERVICE_URL,
  changeOrigin: true,
  xfwd: true,
}));

// ── Navigation route-catalog adapter ─────────────────────────────────────
// FE NavigationStore.routeRegistry calls GET /api/navigation/route-catalog
// expecting { navigation: { primary: [...], secondary: [...] }, ... }.
// Tenant-service exposes /navigation/tree which returns
// { entries: dos.navigation_registry rows, count }. Adapt the tree into the
// shape NavigationStore.apiItemToNavItem expects so the SPA never falls back
// to a legacy hardcoded primary nav.
app.get('/api/navigation/route-catalog', authGuard, injectIdentityHeaders, async (req, res) => {
  try {
    const headers: Record<string, string> = { accept: 'application/json' };
    for (const h of ['x-user-sub','x-user-email','x-user-name','x-tenant-id']) {
      const v = req.headers[h];
      if (typeof v === 'string') headers[h] = v;
    }
    const r = await fetch(`${TENANT_SERVICE_URL}/navigation/tree`, { headers });
    if (!r.ok) {
      return res.status(r.status).json({ navigation: { primary: [], secondary: [] }, source: 'unavailable' });
    }
    const body = await r.json() as { entries?: Array<Record<string, unknown>> };
    const rows = Array.isArray(body.entries) ? body.entries : [];

    // Group by parent_code into a primary tree. Items without a parent are
    // top-level; items with parent_code reference their parent's `code`.
    type NavRow = {
      code: string; nav_item_code?: string; label_en?: string; label_ar?: string; icon?: string;
      route?: string; module_code?: string; parent_code?: string | null; sort_order?: number;
    };
    const byCode = new Map<string, any>();
    const top: any[] = [];
    const items = rows
      .map((r: any) => {
        const id = String(r.nav_item_code ?? r.code ?? '');
        const node = {
          id,
          navKey: id,
          labelEn: r.label_en ?? '',
          labelAr: r.label_ar ?? '',
          route: r.route ?? undefined,
          icon: r.icon ?? undefined,
          moduleCode: r.module_code ?? undefined,
          parentCode: r.parent_code ?? null,
          sortOrder: r.sort_order ?? 0,
          children: [] as any[],
        };
        byCode.set(id, node);
        return node;
      })
      .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    for (const node of items) {
      if (node.parentCode && byCode.has(node.parentCode)) {
        byCode.get(node.parentCode).children.push(node);
      } else {
        top.push(node);
      }
    }
    res.json({
      navigation: { primary: top, secondary: [] },
      source: 'tenant-service.navigation.tree',
      count: items.length,
    });
  } catch (err: any) {
    console.warn('[gateway] /api/navigation/route-catalog adapter failed', err?.message ?? err);
    res.status(200).json({ navigation: { primary: [], secondary: [] }, source: 'error', error: String(err?.message ?? err) });
  }
});
// Pass-through for the rest of /api/navigation/* (tree, items, commands).
app.use('/api/navigation', authGuard, injectIdentityHeaders, createProxyMiddleware({
  target: TENANT_SERVICE_URL,
  changeOrigin: true,
  xfwd: true,
}));

// ── Dashboard / Widgets / Shell Config — dashboard-widgets-service ──────
// Shell config routes: GET /api/shell/config/:moduleCode reads dos.shell_config
// with 4-scope merge (platform→tenant→role→user), auth + permission (shell.ui.read).
// Dashboard/widgets routes: full CRUD for dashboard configuration.
if (DASHBOARD_WIDGETS_SERVICE_URL) {
  app.use('/api/shell', authGuard, injectIdentityHeaders, createProxyMiddleware({
    target: DASHBOARD_WIDGETS_SERVICE_URL,
    changeOrigin: true,
    xfwd: true,
  }));
  app.use('/api/dashboard', authGuard, injectIdentityHeaders, createProxyMiddleware({
    target: DASHBOARD_WIDGETS_SERVICE_URL,
    changeOrigin: true,
    xfwd: true,
  }));
  app.use('/api/dashboard-editor', authGuard, injectIdentityHeaders, createProxyMiddleware({
    target: DASHBOARD_WIDGETS_SERVICE_URL,
    changeOrigin: true,
    xfwd: true,
  }));
  app.use('/api/widgets', authGuard, injectIdentityHeaders, createProxyMiddleware({
    target: DASHBOARD_WIDGETS_SERVICE_URL,
    changeOrigin: true,
    xfwd: true,
  }));
}

// ── Analytics / KPI — analytics-service ─────────────────────────────────
// KPI card indicators: real DB handler queries {tenant_schema}.audit_trail
// per module, returns aggregated mini-timelines for all 8 dashboard cards.
if (ANALYTICS_SERVICE_URL) {
  // FE calls /api/kpi/card-indicators — rewrite to analytics-service internal mount
  app.use('/api/kpi', authGuard, injectIdentityHeaders, createProxyMiddleware({
    target: ANALYTICS_SERVICE_URL,
    changeOrigin: true,
    xfwd: true,
    pathRewrite: (path) => `/api/analytics/analytics/kpi-detail${path}`,
  }));
  app.use('/api/analytics', authGuard, injectIdentityHeaders, createProxyMiddleware({
    target: ANALYTICS_SERVICE_URL,
    changeOrigin: true,
    xfwd: true,
  }));
  app.use('/api/grc-query', authGuard, injectIdentityHeaders, createProxyMiddleware({
    target: ANALYTICS_SERVICE_URL,
    changeOrigin: true,
    xfwd: true,
  }));
}

// ── Module kickstart status — proxied to tenant-service ─────────────────
// Real DB handler: reads dos.tenant_product_activation + dos.module_registry
// to return per-module provisioning status for the workspace.
app.use('/api/module-kickstart-status', authGuard, injectIdentityHeaders, createProxyMiddleware({
  target: TENANT_SERVICE_URL,
  changeOrigin: true,
  xfwd: true,
  pathRewrite: () => '/module-kickstart-status',
}));

// ── Notifications — proxied to notification-service (real DB-backed) ────
// Inbox list, unread-count, mark-read all flow through the canonical
// notification-service which owns public.notifications + WS/SSE fanout.
if (NOTIFICATION_SERVICE_URL) {
  // Fail-soft on transient upstream outage: an empty inbox is preferable to
  // 502/504/404 spam in the SPA bell. Same shape as the no-URL fallback below.
  const notificationsProxyError = (req: any, res: any) => {
    if (req.method !== 'GET' || res.headersSent) {
      if (!res.headersSent) res.status(502).json({ error: 'NOTIFICATION_UPSTREAM_UNAVAILABLE' });
      return;
    }
    if (req.path === '/unread-count' || req.originalUrl?.endsWith('/unread-count')) {
      return res.json({ count: 0 });
    }
    return res.json({ items: [], total: 0, unread: 0 });
  };
  app.use('/api/notifications', authGuard, injectIdentityHeaders, createProxyMiddleware({
    target: NOTIFICATION_SERVICE_URL,
    changeOrigin: true,
    xfwd: true,
    onError: notificationsProxyError,
  } as any));
  app.use('/api/notification', authGuard, injectIdentityHeaders, createProxyMiddleware({
    target: NOTIFICATION_SERVICE_URL,
    changeOrigin: true,
    xfwd: true,
    onError: notificationsProxyError,
  } as any));
} else {
  // Fail-soft only when notification-service is not configured. Logged
  // at boot above. SPA bell renders empty rather than 404-flooding.
  app.get('/api/notifications', authGuard, (_req, res) => {
    res.json({ items: [], total: 0, unread: 0 });
  });
  app.get('/api/notifications/unread-count', authGuard, (_req, res) => {
    res.json({ count: 0 });
  });
}

// ── Workspaces — list memberships as workspaces ─────────────────────────
// AGENTS Foundation Endpoint: /api/workspaces. Proxied to tenant-service
// /workspaces which reads dos.tenant_memberships joined to dos.tenants.
app.use('/api/workspaces', authGuard, injectIdentityHeaders, createProxyMiddleware({
  target: TENANT_SERVICE_URL,
  changeOrigin: true,
  xfwd: true,
  pathRewrite: (p) => `/workspaces${p.startsWith('/') ? p : `/${p}`}`,
}));

// (Tenants/home alias is registered earlier — BEFORE the broader /api/tenants
// proxy — so Express resolves it correctly. Duplicate mount removed.)
// Client-side error sink. SPA POSTs runtime errors here; accept and discard
// until a real telemetry pipeline is wired.
app.post('/api/platform/client-errors', authGuard, (_req, res) => {
  res.status(204).end();
});

// ── Workflow / Tasks / Approvals — workflow-service ─────────────────────
// Core vertical Phase 2: handles all work-item lifecycle, approval routing,
// and state transitions.
const WORKFLOW_PREFIXES = [
  '/api/workflow',
  '/api/work-items',
  '/api/autonomous',
  '/api/playbooks',
  '/api/workflows',
  '/api/bulk-tasks',
  '/api/task-board',
  '/api/review-cycle',
  '/api/process-tasks',
  '/api/journey',
  '/api/approval-requests',
  '/api/approval-routing',
  '/api/module-workflow',
  '/api/module-ai-orchestrator',
  '/api/cooperative-workflows',
  '/api/workflow-chains',
  '/api/approvals',
];
for (const prefix of WORKFLOW_PREFIXES) {
  app.use(prefix, authGuard, injectIdentityHeaders, forwardOriginalUrl, createProxyMiddleware({
    target: WORKFLOW_SERVICE_URL,
    changeOrigin: true,
    xfwd: true,
  }));
}

// ─────────────────────────────────────────────────────────────────────────
// Wave 5/6/7 (Phase 1 PM2 reconciliation, 2026-04-30) — proxy enrolment for
// every long-running service declared in ops/ports.allocation.json that did
// not previously have a gateway prefix. Mounted before the /api 404 sink so
// they take precedence. All routes go through authGuard + injectIdentityHeaders
// for parity with existing proxies.
// ─────────────────────────────────────────────────────────────────────────

// Wave 5 — Privacy / MCP / AGRC-OS sidecar.
// Privacy-ops already proxied above when PRIVACY_SERVICE_URL is set; here we
// add MCP and a namespaced AGRC-OS-service surface (the legacy /api/agrc-os
// is intentionally kept on ai-engine to preserve frontend contracts).
app.use('/api/mcp', authGuard, injectIdentityHeaders, createProxyMiddleware({
  target: MCP_GATEWAY_SERVICE_URL, changeOrigin: true, xfwd: true, pathRewrite: { '^/api/mcp': '' },
}));
app.use('/api/agrc-os-service', authGuard, injectIdentityHeaders, createProxyMiddleware({
  target: AGRC_OS_SERVICE_URL, changeOrigin: true, xfwd: true, pathRewrite: { '^/api/agrc-os-service': '' },
}));

// Wave 6 — Domain GRC fleet.
// Phase 6 (Wave 6, 2026-04-30): every wave-6 upstream mounts its routers at
// /api/<prefix> (NOT bare paths). Express strips the mount prefix from req.url
// before http-proxy-middleware sees it, so the previous pathRewrite rules of
// `'^/api/X': ''` were no-ops AND the upstream then 404'd on the bare path.
// The fix is the same originalUrl-restorer pattern used by the foundation
// proxy block (see FOUNDATION_PREFIXES above): restore req.url to req.originalUrl
// before proxying, so the upstream service sees the canonical /api/<prefix>/...
// path that its own app.use('/api/<prefix>', router) expects. The helper is
// defined at module scope (forwardOriginalUrl, declared near injectIdentityHeaders).
app.use(['/api/audit', '/api/activity-feed'], authGuard, injectIdentityHeaders, forwardOriginalUrl, createProxyMiddleware({
  target: AUDIT_SERVICE_URL, changeOrigin: true, xfwd: true,
}));
app.use('/api/onboarding', authGuard, injectIdentityHeaders, forwardOriginalUrl, createProxyMiddleware({
  target: ONBOARDING_SERVICE_URL, changeOrigin: true, xfwd: true,
}));
// Phase 4 (Wave 4, 2026-04-30): risk-incident-service mounts every prefix
// listed below in src/server.ts. Express path-prefix matching needs each
// distinct top-level prefix declared explicitly because '/api/risk' alone
// will NOT match '/api/risk-ws' (different path segment).
app.use([
  '/api/risk',
  '/api/incidents',
  '/api/incident',
  '/api/risk-incident',
  '/api/risk-ws',
  '/api/risk-smart',
  '/api/risk-metrics',
  '/api/risk-scoring',
  '/api/risk-trends',
  '/api/risk-quantification',
  '/api/monte-carlo',
  '/api/risk-peer-review',
  // Phase 4 deeper (2026-04-30): top-level FE prefixes also mounted at upstream.
  '/api/issues',
  '/api/fitch',
], authGuard, injectIdentityHeaders, forwardOriginalUrl, createProxyMiddleware({
  target: RISK_INCIDENT_SERVICE_URL, changeOrigin: true, xfwd: true,
}));
// Phase 5 (Wave 5, 2026-04-30): /api/compliance, /api/controls, /api/frameworks,
// /api/compliance-attestation are co-hosted on governance-policy-service via
// @dos/module-compliance.registerCompliance(). See server.ts (compliance block).
// Phase 3 deeper (2026-04-30): governance-policy-service aggregator surfaces
// 22 distinct top-level prefixes via routes/index.ts mounted at /api. Each
// must be declared explicitly because Express path-prefix matching is exact
// per segment. Verified against governance-policy-service/src/routes/index.ts
// (`routes.use('/<prefix>', ...)`).
app.use([
  '/api/governance',
  '/api/governance-ai',
  '/api/governance-os',
  '/api/governance-policy',
  '/api/proactive-leadership',
  '/api/policy',
  '/api/policies',
  '/api/policy-admin',
  '/api/policy-analysis',
  '/api/policy-attestation',
  '/api/policy-code',
  '/api/policy-coverage',
  '/api/policy-diagnostics',
  '/api/policy-exception',
  '/api/policy-exceptions',
  '/api/policy-impact',
  '/api/policy-lifecycle',
  '/api/policy-overview',
  '/api/policy-publication',
  '/api/policy-publications',
  '/api/policy-reports',
  '/api/policy-template',
  '/api/compliance',
  '/api/compliance-ws',
  '/api/control',
  '/api/controls',
  '/api/frameworks',
  '/api/compliance-attestation',
  '/api/attestation',
], authGuard, injectIdentityHeaders, forwardOriginalUrl, createProxyMiddleware({
  target: GOVERNANCE_POLICY_SERVICE_URL, changeOrigin: true, xfwd: true,
}));
// Phase 6 (Wave 6, 2026-04-30): evidence-audit-reporting-service mounts
// /api/evidence, /api/finding, /api/export, /api/reports, /api/reporting,
// and /api/evidence-audit-reporting. Each top-level prefix must be declared
// at the gateway. /api/reporting collides with analytics-reporting-service —
// kept on analytics-reporting (existing FE contract); evidence's /api/reporting
// is reachable internally via /api/evidence-audit-reporting/reporting/* path.
app.use([
  '/api/evidence',
  // Phase 6 deeper (2026-04-30): FE evidence-api.service.ts.getTasks
  // calls /api/evidence-tasks at the top level (lifted from the nested
  // aggregator path /api/evidence-audit-reporting/evidence/evidence-tasks).
  '/api/evidence-tasks',
  '/api/finding',
  '/api/export',
  '/api/reports',
  '/api/evidence-audit-reporting',
], authGuard, injectIdentityHeaders, forwardOriginalUrl, createProxyMiddleware({
  target: EVIDENCE_AUDIT_REPORTING_SERVICE_URL, changeOrigin: true, xfwd: true,
}));
app.use('/api/executive', authGuard, injectIdentityHeaders, forwardOriginalUrl, createProxyMiddleware({
  target: EXECUTIVE_INTELLIGENCE_SERVICE_URL, changeOrigin: true, xfwd: true,
}));
// records-service mounts BOTH /api/records (plural) and /api/record (singular).
app.use(['/api/records', '/api/record'], authGuard, injectIdentityHeaders, forwardOriginalUrl, createProxyMiddleware({
  target: RECORDS_SERVICE_URL, changeOrigin: true, xfwd: true,
}));
// remediation-action-service mounts /api/remediation, /api/action, /api/remediation-action.
app.use(['/api/remediation', '/api/action', '/api/remediation-action'], authGuard, injectIdentityHeaders, forwardOriginalUrl, createProxyMiddleware({
  target: REMEDIATION_ACTION_SERVICE_URL, changeOrigin: true, xfwd: true,
}));
// portals-service mounts /api/portals AND /api/portal.
app.use(['/api/portals', '/api/portal'], authGuard, injectIdentityHeaders, forwardOriginalUrl, createProxyMiddleware({
  target: PORTALS_SERVICE_URL, changeOrigin: true, xfwd: true,
}));
app.use('/api/training', authGuard, injectIdentityHeaders, forwardOriginalUrl, createProxyMiddleware({
  target: TRAINING_SERVICE_URL, changeOrigin: true, xfwd: true,
}));
app.use('/api/dora', authGuard, injectIdentityHeaders, forwardOriginalUrl, createProxyMiddleware({
  target: DORA_SERVICE_URL, changeOrigin: true, xfwd: true,
}));
// asset-service mounts /api/asset (singular), /api/assets (plural), /api/asset-service,
// plus 12 hyphen-form top-level routers (asset-applications, asset-services,
// asset-service-map, asset-dependencies, asset-criticality, asset-linkage,
// asset-classification, asset-ownership, asset-lifecycle, asset-reports,
// asset-admin, asset-home) — see services/asset-service/src/routes/index.ts
// `assetTopLevelMounts`. Phase 7 deeper (2026-04-30): all 12 declared at gateway.
app.use([
  '/api/assets', '/api/asset', '/api/asset-service',
  '/api/asset-applications', '/api/asset-services', '/api/asset-service-map',
  '/api/asset-dependencies', '/api/asset-criticality', '/api/asset-linkage',
  '/api/asset-classification', '/api/asset-ownership', '/api/asset-lifecycle',
  '/api/asset-reports', '/api/asset-admin', '/api/asset-home',
], authGuard, injectIdentityHeaders, forwardOriginalUrl, createProxyMiddleware({
  target: ASSET_SERVICE_URL, changeOrigin: true, xfwd: true,
}));
app.use('/api/reporting', authGuard, injectIdentityHeaders, forwardOriginalUrl, createProxyMiddleware({
  target: ANALYTICS_REPORTING_SERVICE_URL, changeOrigin: true, xfwd: true,
}));
// Phase 2 vertical-slice (2026-04-30): the WORKFLOW_PREFIXES block above
// already mounts /api/workflow with forwardOriginalUrl. The previous
// duplicate fallback here lacked forwardOriginalUrl which would have caused
// the workflow upstream (mounts at /api/workflow, NOT bare /) to 404.
// Removed to eliminate dead-code drift; the canonical path is the array.

// Wave 7 — Overlap services (no-delete policy → distinct namespaced prefixes).
// Phase 7 (Wave 7, 2026-04-30): same gateway-prefix↔upstream-mount-path
// reconciliation as Phase 6. Each upstream mounts at /api/<prefix>; we use
// forwardOriginalUrl to preserve the canonical path. Each upstream's actual
// mount list is verified against src/server.ts.
// bcp-service mounts /api/bcp + /api/bcp-service.
app.use(['/api/bcp', '/api/bcp-service'], authGuard, injectIdentityHeaders, forwardOriginalUrl, createProxyMiddleware({
  target: BCP_SERVICE_URL, changeOrigin: true, xfwd: true,
}));
// vendor-service mounts /api/vendor (singular!) + /api/vendor-service +
// (Phase 7 deeper, 2026-04-30) /api/vendor-risk top-level lifted from the
// /api/vendor-service/vendor/vendor-risk-ext aggregator path so FE callers
// (grc-risk.service.ts, vendor-risk-dashboard.component.ts) resolve.
// Gateway also exposes /api/vendors (plural) for FE callers that expect REST plural.
app.use(['/api/vendor', '/api/vendors', '/api/vendor-service', '/api/vendor-risk'], authGuard, injectIdentityHeaders, forwardOriginalUrl, createProxyMiddleware({
  target: VENDOR_SERVICE_URL, changeOrigin: true, xfwd: true,
}));
// platform-core-service mounts /api/mobile only. Keep /api/platform-core
// gateway prefix per no-delete policy (in case future routes are added) but
// also expose /api/mobile so the existing handler is reachable.
app.use(['/api/platform-core', '/api/mobile'], authGuard, injectIdentityHeaders, forwardOriginalUrl, createProxyMiddleware({
  target: PLATFORM_CORE_SERVICE_URL, changeOrigin: true, xfwd: true,
}));
// platform-product-service mounts /api/product, /api/knowledge,
// /api/operating-cockpit, /api/platform-stats. Keep /api/platform-product
// per no-delete policy but expose all four real prefixes.
app.use(['/api/platform-product', '/api/product', '/api/knowledge', '/api/operating-cockpit', '/api/platform-stats'],
  authGuard, injectIdentityHeaders, forwardOriginalUrl, createProxyMiddleware({
  target: PLATFORM_PRODUCT_SERVICE_URL, changeOrigin: true, xfwd: true,
}));
// NOTE (Phase 7, 2026-04-30): platform-app-shell is an Angular SPA host whose
// /api/* handler proxies BACK to this gateway. Routing /api/platform-shell here
// would create a redirect loop. The PM2 entry stays (no-delete), but no gateway
// proxy is mounted; the shell is reached directly on its own port (3010).

// ── Public marketing / landing stubs (no auth)
// Consumed by product shells (e.g. shahin-ai) until platform-product publishes
// real CMS-backed routes. Registered before the catch-all /api → 404.
app.get(['/api/public/landing-content', '/api/public/landing/content'], (_req, res) => {
  res.json({
    agents: [],
    painPoints: [],
    chartData: {},
    capabilities: [],
  });
});
app.get('/api/public/agents', (_req, res) => {
  res.json({ agents: [] });
});
app.get('/api/public/stats', (_req, res) => {
  res.json({
    tenants: 0,
    users: 0,
    controls: 0,
    risks: 0,
    uptime: 0,
  });
});

// Anything else under /api/* → 404 (no modules wired).
app.use('/api', (_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[gateway] unhandled', err);
  res.status(500).json({ error: 'INTERNAL_ERROR' });
});

// ── WebSocket: cookie-authenticated /ws upgrade handler ───────────────────
// The SPA's WebSocketService opens wss://<host>/ws with the same-origin
// cookie. We validate `dos_access_token` server-side via Keycloak JWKS
// during the HTTP upgrade. No tokens are accepted from the query string.
// Until module producers publish on this channel, it acts as a heartbeat
// keepalive so the SPA "connected" state turns true and the reconnect
// loop stays idle.
function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const ix = part.indexOf('=');
    if (ix < 0) continue;
    const k = part.slice(0, ix).trim();
    const v = part.slice(ix + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

const wss = new WebSocketServer({ noServer: true });
const wsClients = new Set<WSClient>();

wss.on('connection', (ws: WSClient, _req: IncomingMessage, identity: { sub: string; tenantId?: string }) => {
  wsClients.add(ws);
  ws.send(JSON.stringify({
    type: 'connection_ready',
    data: { sub: identity.sub, tenantId: identity.tenantId ?? null },
    timestamp: new Date().toISOString(),
  }));
  const heartbeat = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: 'ping', data: {}, timestamp: new Date().toISOString() }));
    }
  }, 25_000);
  ws.on('close', () => { clearInterval(heartbeat); wsClients.delete(ws); });
  ws.on('error', () => { clearInterval(heartbeat); wsClients.delete(ws); });
});

// ── Startup warnings for missing service URLs ──────────────────────────
// Production-grade: make misconfigured env vars visible in boot logs so
// operators can immediately see why certain API surfaces return 404.
const CRITICAL_URLS: Record<string, string> = {
  USER_SERVICE_URL: 'Foundation CRUD (users/teams/locations/orgs/committees)',
  DASHBOARD_WIDGETS_SERVICE_URL: 'Shell config, dashboard, widgets',
  ANALYTICS_SERVICE_URL: 'KPI cards, analytics, chart data, grc-query',
  AI_ENGINE_SERVICE_URL: 'AI-OS, nudges, copilot, runtime-health, next-best-actions',
  INTEGRATIONS_SERVICE_URL: 'Connector health, integration hub',
};
for (const [envVar, surfaces] of Object.entries(CRITICAL_URLS)) {
  if (!process.env[envVar]) {
    console.warn(`[gateway] ⚠ ${envVar} not set — ${surfaces} will 404`);
  }
}

const httpServer = app.listen(PORT, '0.0.0.0', () => {
  console.info(`[gateway] listening on :${PORT}`);
  console.info(`[gateway] issuer=${KC_ISSUER}`);
});

// http-proxy-middleware v3 attaches a `close` listener on the underlying
// HTTP server for every createProxyMiddleware() call so it can drain pending
// sockets on shutdown. The gateway mounts ~100 proxies, blowing past the
// Node default `MaxListeners = 10` and emitting a noisy
// MaxListenersExceededWarning at boot. Raise the cap to the actual upper
// bound (proxy mounts + ws + sigterm + a small safety margin).
httpServer.setMaxListeners(200);

httpServer.on('upgrade', async (req: IncomingMessage, socket, head) => {
  // Wave 1 — every WS upgrade decision (allow OR deny) MUST emit a
  // decision-ledger row. Best-effort: a DB outage is logged but never
  // blocks the upgrade decision itself.
  const ipAddress = (req.socket.remoteAddress as string | undefined) ?? null;
  const userAgent = (req.headers['user-agent'] as string | undefined) ?? null;
  const requestPath = req.url || '';
  const writeLedger = (
    allowed: boolean,
    reasonCode: string,
    userId: string,
    tenantId: string,
    detail?: Record<string, unknown>,
  ) => {
    void writeDecision({
      action: 'gateway.ws.upgrade',
      allowed,
      reasonCode,
      userId,
      tenantId,
      requestPath,
      requestMethod: 'GET',
      ipAddress: ipAddress ?? undefined,
      userAgent: userAgent ?? undefined,
      detail,
    });
  };

  try {
    const url = req.url || '';
    if (!url.startsWith('/ws') && !url.startsWith('/api/ws')) {
      writeLedger(false, 'WRONG_PATH', 'anonymous', '');
      socket.destroy();
      return;
    }
    const cookies = parseCookies(req.headers['cookie']);
    const token = cookies['dos_access_token'];
    if (!token) {
      writeLedger(false, 'MISSING_COOKIE', 'anonymous', '');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    const { payload } = await jwtVerify(token, jwks, { issuer: KC_ISSUER, audience: KC_AUDIENCE });
    const identity = {
      sub: String(payload.sub || ''),
      tenantId: typeof payload['tenantId'] === 'string'
        ? (payload['tenantId'] as string)
        : (typeof payload['tenant_id'] === 'string' ? (payload['tenant_id'] as string) : ''),
    };
    if (!identity.sub) {
      writeLedger(false, 'NO_SUB_CLAIM', 'anonymous', identity.tenantId || '');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    writeLedger(true, 'OK', identity.sub, identity.tenantId || '');
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req, identity);
    });
  } catch (err) {
    writeLedger(false, 'INVALID_TOKEN', 'anonymous', '', { err: (err as Error).message });
    try {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    } catch { /* ignore */ }
    socket.destroy();
  }
});
