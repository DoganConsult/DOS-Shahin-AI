// Foundation Console gateway — single edge process for the SPA.
// Doctrine: zero hardcoded URLs/realms/clients. /config.json is built from env at request time.
// Reverse-proxies /api/ui-os/* to foundation-ui-os and serves the Angular dist.
import express, { type Request, type Response } from 'express';
import { createServer, type IncomingMessage } from 'node:http';
import { URL } from 'node:url';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, normalize } from 'node:path';
import { loadFcConfig } from '@fc/config';
import { createLogger } from '@fc/logger';
import type { FcRuntimeConfig } from '@fc/ui-contracts';
import { registerAuthRoutes, makeRequireSession } from './auth.js';

const cfg = loadFcConfig();
const log = createLogger({ service: 'foundation-gateway' });
const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

// ── Health / readiness ─────────────────────────────────────────────
app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', service: 'foundation-gateway', ts: new Date().toISOString() });
});
app.get('/readyz', (_req, res) => {
  res.json({ status: 'ready', service: 'foundation-gateway' });
});

// ── /config.json — runtime config consumed by Angular at bootstrap ─
app.get('/config.json', (_req, res) => {
  const runtime: FcRuntimeConfig = {
    productCode: 'foundation-console',
    gatewayUrl: cfg.gateway.url,
    oidc: {
      issuerUrl: cfg.oidc.issuerUrl,
      realm: cfg.oidc.realm,
      clientId: cfg.oidc.clientId,
      redirectUri: cfg.oidc.redirectUri,
    },
    endpoints: {
      workspaceRuntime: '/api/ui-os/workspace-runtime',
      pageRuntime: '/api/ui-os/page-runtime',
      nav: '/api/ui-os/workspace/nav',
      myPermissions: '/api/access/my-permissions',
    },
  };
  res.json(runtime);
});

// ── Reverse proxy: /api/ui-os/* → foundation-ui-os ─────────────────
// Tiny native proxy (no extra deps). Doctrine: shared services consumed only via gateway.
async function proxy(
  req: Request,
  res: Response,
  upstreamBase: string,
  upstreamPath: string,
): Promise<void> {
  const upstream = new URL(upstreamPath + (req.originalUrl.includes('?') ? '?' + req.originalUrl.split('?')[1] : ''), upstreamBase);
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (v == null) continue;
    const lk = k.toLowerCase();
    if (lk === 'host') continue;
    // F11: strip ALL client-supplied identity/permission headers. Gateway is the sole authority.
    if (lk === 'x-fc-user-id' || lk === 'x-fc-tenant-id' || lk === 'x-fc-perms' ||
        lk === 'x-fc-user-email' || lk === 'x-fc-user-name' || lk === 'cookie') continue;
    headers[k] = Array.isArray(v) ? v.join(',') : String(v);
  }
  // F11: inject sanitized session-derived identity. Tenant precedence: session > FC_PUBLIC_TENANT_ID.
  const sess = req.fcSession;
  headers['x-fc-product-code'] = 'foundation-console';
  headers['x-fc-tenant-id']    = (sess?.tenantId && sess.tenantId.length > 0) ? sess.tenantId : cfg.publicTenantId;
  headers['x-fc-user-id']      = sess?.sub ?? '';
  if (sess?.email) headers['x-fc-user-email'] = sess.email;
  if (sess?.name)  headers['x-fc-user-name']  = sess.name;
  headers['x-fc-perms']        = Array.isArray(sess?.perms) ? sess!.perms.join(',') : '';
  try {
    const init: RequestInit = { method: req.method, headers, redirect: 'manual' };
    if (!['GET', 'HEAD'].includes(req.method)) {
      const raw = (req as unknown as { rawBody?: Buffer }).rawBody;
      if (raw) init.body = raw;
    }
    const fetchRes = await fetch(upstream, init);
    res.status(fetchRes.status);
    fetchRes.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'content-encoding') return;
      res.setHeader(key, value);
    });
    const buf = Buffer.from(await fetchRes.arrayBuffer());
    res.end(buf);
  } catch (err) {
    log.error({ err: err instanceof Error ? err.message : String(err), upstream: upstream.toString() }, 'proxy failed');
    res.status(502).json({ error: 'upstream_unreachable' });
  }
}

// ── OIDC + cookie session (registered BEFORE proxy + SPA fallback) ─
registerAuthRoutes(app, cfg, log);

const requireSession = makeRequireSession(cfg);
app.all(/^\/api\/ui-os\/.*/, requireSession, (req, res) => {
  const upstreamPath = req.path.replace(/^\/api\/ui-os/, '');
  void proxy(req, res, cfg.uiOs.url, upstreamPath);
});

// ── Static Angular dist ────────────────────────────────────────────
const distDir =
  process.env['FC_APP_DIST_DIR'] ??
  join(process.cwd(), 'app', 'dist', 'foundation-console', 'browser');

function safeJoin(root: string, reqPath: string): string | null {
  const resolved = normalize(join(root, reqPath));
  return resolved.startsWith(root) ? resolved : null;
}

app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  if (req.path === '/config.json' || req.path === '/healthz' || req.path === '/readyz') return next();
  if (!existsSync(distDir)) {
    return res.status(503).type('text/plain').send('Foundation Console: app dist not built yet.');
  }
  const candidate = safeJoin(distDir, req.path);
  if (candidate && existsSync(candidate) && statSync(candidate).isFile()) {
    return res.sendFile(candidate);
  }
  // SPA HTML5 routing: serve index.html for unknown paths so Angular can route them.
  const indexPath = join(distDir, 'index.html');
  if (existsSync(indexPath)) return res.type('text/html').send(readFileSync(indexPath));
  return res.status(503).type('text/plain').send('Foundation Console: index.html missing.');
});

const server = createServer(app);
server.listen(cfg.gateway.port, () => {
  log.info({ port: cfg.gateway.port, distDir }, 'foundation-gateway listening');
});
