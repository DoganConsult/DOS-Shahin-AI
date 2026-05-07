/**
 * DOS Product Shell — Shahin-AI (clean shell).
 *
 * Port 3000. Two responsibilities only:
 *   1. Serve the Angular SPA from $SPA_DIR with index.html fallback for client-side routing.
 *   2. Proxy /api/* to the platform gateway at $GATEWAY_URL.
 *
 * No platform/core imports, no module wiring, no product registration.
 */
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { createProxyMiddleware } from 'http-proxy-middleware';

import { createHealthRouter, dbHealthCheck, redisHealthCheck, eventBusHealthCheck } from '@dos/service-bootstrap/health';

const SERVICE = 'product-shell';
const PORT = Number(process.env.PORT || 3000);
const GATEWAY_URL = required('GATEWAY_URL');

// SPA directory resolution (precedence — first hit wins):
//   1. PRODUCT_SHELL_SPA_DIR   ← canonical (recommended; absolute path)
//   2. SPA_DIR                 ← legacy alias; logs a deprecation warning
//   3. computed fallback       ← anchored from __dirname, no literal
//                                 "DOS Platform/..." string in code
//
// The fallback assumes the in-platform layout:
//   <repo-root>/services/product-shell/dist/server.js  (this file)
//   <repo-root>/platform/app/dist/platform-app/browser
//
// __dirname → <repo-root>/services/product-shell/dist
// 3 ups = repo-root.
const PLATFORM_ROOT = path.resolve(__dirname, '..', '..', '..');
const SPA_DIR_DEFAULT = path.join(
  PLATFORM_ROOT,
  'platform', 'app', 'dist', 'platform-app', 'browser',
);

let SPA_DIR_SOURCE: 'PRODUCT_SHELL_SPA_DIR' | 'SPA_DIR' | 'fallback' = 'fallback';
let SPA_DIR: string;
if (process.env.PRODUCT_SHELL_SPA_DIR && process.env.PRODUCT_SHELL_SPA_DIR.length > 0) {
  SPA_DIR = process.env.PRODUCT_SHELL_SPA_DIR;
  SPA_DIR_SOURCE = 'PRODUCT_SHELL_SPA_DIR';
} else if (process.env.SPA_DIR && process.env.SPA_DIR.length > 0) {
  SPA_DIR = process.env.SPA_DIR;
  SPA_DIR_SOURCE = 'SPA_DIR';
  console.warn(
    `[${SERVICE}] SPA_DIR is deprecated; rename the env var to PRODUCT_SHELL_SPA_DIR.`,
  );
} else {
  SPA_DIR = SPA_DIR_DEFAULT;
  SPA_DIR_SOURCE = 'fallback';
}

const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',').map(s => s.trim()).filter(Boolean);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Service-worker / manifest filenames that must NEVER be long-cached.
// A stale entry here is what keeps the legacy ngsw-worker.js alive in
// browsers across deploys and Cloudflare edges.
const NO_STORE_FILES = new Set<string>([
  'sw.js',
  'ngsw-worker.js',
  'safety-worker.js',
  'ngsw.json',
  'manifest.webmanifest',
  'manifest.json',
  'index.html',
]);
const NO_STORE_CACHE_CONTROL =
  'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0';

function applyNoStoreHeaders(res: Response): void {
  res.setHeader('Cache-Control', NO_STORE_CACHE_CONTROL);
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  // Strip validators so browsers/proxies cannot serve a 304 against the
  // previous bundle's index.html. Without this an ETag/Last-Modified hit
  // re-uses the old cached HTML which references the old hashed JS.
  res.removeHeader('ETag');
  res.removeHeader('Last-Modified');
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Required environment variable ${name} is not set`);
  return v;
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(createHealthRouter('product_shell', {
  db: dbHealthCheck,
  redis: redisHealthCheck,
  eventBus: eventBusHealthCheck,
}));

app.use(helmet({
  contentSecurityPolicy: false,           // CSP is owned by nginx (frontend.conf).
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: { maxAge: 31_536_000, includeSubDomains: true, preload: true },
}));
app.use(compression());
if (IS_PRODUCTION && ALLOWED_ORIGINS.length === 0) {
  console.warn(
    `[${SERVICE}] CORS_ALLOWED_ORIGINS is empty in production — failing closed for cross-origin requests.`,
  );
}
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.length === 0) {
      // Fail closed in production; permissive only outside production.
      return cb(null, !IS_PRODUCTION);
    }
    cb(null, ALLOWED_ORIGINS.includes(origin));
  },
  credentials: true,
}));
app.use(morgan(process.env.LOG_FORMAT || 'combined'));

// Health check handled by createHealthRouter
// Ready check handled by createHealthRouter

// Phase M1.6 — auth entry routes (/login, /register, /forgot-password,
// /mfa, /reset-password) are now owned by the SPA's Carbon Auth Pages
// Pack. The SPA's <app-auth-page-host> renders the Carbon login/register
// card and forwards submit/SSO events to /api/auth/oidc/start?mode=…,
// so the legacy hard 302 here is intentionally removed. These paths fall
// through to the SPA catch-all below.

// /api/* → gateway. Express strips the mount path, so re-prepend it via
// pathRewrite — the gateway mounts everything under /api/*.
app.use('/api', createProxyMiddleware({
  target: GATEWAY_URL,
  changeOrigin: true,
  xfwd: true,
  proxyTimeout: 60_000,
  timeout: 60_000,
  pathRewrite: (path) => `/api${path.startsWith('/') ? path : `/${path}`}`,
}));

// Static SPA assets (hashed bundles). index.html is served by the catch-all.
app.use(express.static(SPA_DIR, {
  maxAge: '1y',
  immutable: true,
  etag: true,
  index: false,
  setHeaders: (res, filePath) => {
    // Service-worker + manifest must NEVER be long-cached, otherwise the
    // legacy ngsw-worker.js stays alive in browsers with the old CSP.
    if (NO_STORE_FILES.has(path.basename(filePath))) {
      applyNoStoreHeaders(res);
    }
  },
}));

// Controlled 404 for absent kill-switch / SW manifest files. Without this,
// the SPA catch-all below would return text/html for /ngsw.json and let a
// stale Angular service worker keep itself alive in the browser.
const SAFETY_WORKER_EXISTS = fs.existsSync(path.join(SPA_DIR, 'safety-worker.js'));
const CONTROLLED_404_PATHS: string[] = ['/ngsw.json'];
if (!SAFETY_WORKER_EXISTS) CONTROLLED_404_PATHS.push('/safety-worker.js');
app.get(CONTROLLED_404_PATHS, (_req, res) => {
  applyNoStoreHeaders(res);
  res.status(404).type('text/plain').send('not found');
});

// Legacy PWA clients have /manifest.json cached as the manifest URL. Serve
// the canonical manifest.webmanifest contents (proper JSON, correct
// content-type) instead of letting the SPA catch-all return text/html and
// trigger "Manifest: Line 1 column 1 Syntax error" in the browser.
app.get('/manifest.json', (_req, res) => {
  const canonical = path.join(SPA_DIR, 'manifest.webmanifest');
  applyNoStoreHeaders(res);
  if (fs.existsSync(canonical)) {
    res.type('application/manifest+json')
       .sendFile(canonical, { etag: false, lastModified: false, cacheControl: false });
    return;
  }
  res.status(404).type('text/plain').send('not found');
});

// Wave 7: INDEX_PATH resolved once at boot (no syscall cost); existsSync
// is checked lazily per-request so a SPA build that finishes after server
// startup is picked up automatically without a manual pm2 restart.
const INDEX_PATH = path.join(SPA_DIR, 'index.html');

// Stale hashed-asset requests (old bundle hashes after a deploy) MUST NOT
// be answered with index.html — browsers would try to execute HTML as JS
// and silently replay the old SPA shell on top of the new one. 404 them.
const ASSET_EXT = /\.(?:js|css|map|woff2?|ttf|otf|eot|png|jpe?g|gif|svg|ico|webp|wasm)$/i;

// /auth/<page> → clean / <page> redirect (Phase WS-Auth follow-up,
// migration 20260508_0330). The DB binding shipped under /<page> so any
// stale tab, external link, or bookmark hitting the legacy /auth/<page>
// must 301 down to the canonical short path; the SPA router only knows
// about /<page>.
const LEGACY_AUTH_REDIRECTS: Record<string, string> = {
  '/auth/login': '/login',
  '/auth/register': '/register',
  '/auth/forgot-password': '/forgot-password',
  '/auth/mfa': '/mfa',
  '/auth/reset-password': '/reset-password',
};
app.get(Object.keys(LEGACY_AUTH_REDIRECTS), (req: Request, res: Response) => {
  const target = LEGACY_AUTH_REDIRECTS[req.path];
  if (!target) { res.status(404).type('text/plain').send('not found'); return; }
  const qs = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
  res.redirect(301, `${target}${qs}`);
});

app.get('*', (req: Request, res: Response) => {
  if (ASSET_EXT.test(req.path)) {
    applyNoStoreHeaders(res);
    res.status(404).type('text/plain').send('not found');
    return;
  }
  if (!fs.existsSync(INDEX_PATH)) {
    res.status(503).type('text/plain').send('SPA build missing. Run pnpm --filter @shahin/spa build.');
    return;
  }
  applyNoStoreHeaders(res);
  // etag:false / lastModified:false → never emit a 304 for index.html.
  // The catch-all *must* deliver fresh HTML (and therefore the freshest
  // hashed-bundle filenames) on every navigation.
  res.sendFile(INDEX_PATH, { etag: false, lastModified: false, cacheControl: false });
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(`[${SERVICE}] unhandled`, err);
  if (!res.headersSent) res.status(500).json({ error: 'INTERNAL_ERROR' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.info(`[${SERVICE}] listening on :${PORT}`);
  console.info(`[${SERVICE}] SPA_DIR=${SPA_DIR} (source=${SPA_DIR_SOURCE})`);
  console.info(`[${SERVICE}] PLATFORM_ROOT=${PLATFORM_ROOT}`);
  console.info(`[${SERVICE}] GATEWAY_URL=${GATEWAY_URL}`);
});
