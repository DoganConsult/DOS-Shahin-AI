/**
 * Dogan-AI OS Platform App Shell
 *
 * Port 3010 — serves the platform/app Angular SPA and proxies /api + /events
 * to the platform gateway (:4000).
 *
 * Hosts (resolved at edge by nginx + Cloudflare):
 *   - dogan-ai.com / www.dogan-ai.com   → public landing (route '/')
 *   - admin.dogan-ai.com                → workspace      (route '/workspace')
 *
 * This shell is product-neutral. It does NOT register a product manifest
 * (the platform app is the kernel surface, not a product). It does NOT
 * import any Shahin-specific package.
 */
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import http from 'http';
import { createRateLimiter } from '@dos/platform-core/http';
import { allAuthOrigins } from '@dos/platform-core/auth-host-policy';
import {
  metricsMiddleware,
  getMetricsText,
  getContentType,
  initTracing,
  tracingMiddleware,
  OTLPExporter,
  ConsoleExporter,
  getActiveSpan,
  injectTraceHeaders,
} from '@dos/platform-core/observability';

const SERVICE_CODE = 'platform-app-shell';
const PORT = parseInt(process.env.PORT || '3010', 10);
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://127.0.0.1:4000';
const SPA_DIR = process.env.SPA_DIR
  || path.resolve(__dirname, '../../../platform/app/dist/dogan-os-platform/browser');

const tracingExporter = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  ? new OTLPExporter(process.env.OTEL_EXPORTER_OTLP_ENDPOINT)
  : process.env.OTEL_TRACING_ENABLED === 'true'
    ? new ConsoleExporter()
    : undefined;

initTracing({
  serviceName: SERVICE_CODE,
  exporter: tracingExporter,
  enabled: process.env.OTEL_TRACING_ENABLED === 'true',
  samplingRate: parseFloat(process.env.OTEL_SAMPLING_RATE || '1.0'),
  errorSamplingRate: parseFloat(process.env.OTEL_ERROR_SAMPLING_RATE || '1.0'),
  successSamplingRate: parseFloat(process.env.OTEL_SUCCESS_SAMPLING_RATE || '0.1'),
});

const app = express();
app.set('trust proxy', 1);

const publicEndpointRateLimiter = createRateLimiter({
  namespace: SERVICE_CODE,
  maxRequests: parseInt(process.env.PLATFORM_APP_SHELL_RATE_LIMIT_MAX || '300', 10),
  windowMs: parseInt(process.env.PLATFORM_APP_SHELL_RATE_LIMIT_WINDOW_MS || '60000', 10),
});

const _assetHashes = new Map<string, string>();
function computeAssetHash(filePath: string): string {
  const cached = _assetHashes.get(filePath);
  if (cached) return cached;
  try {
    const buf = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(buf).digest('base64');
    _assetHashes.set(filePath, hash);
    return hash;
  } catch { return ''; }
}

// Build helmet ONCE — see product-shell rationale (hot-path CSP rebuild).
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcElem: ["'self'", "'unsafe-inline'"],
      // Angular component styles inline; allow + keep self for hashed bundles.
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: [
        "'self'",
        // auth.dogan-ai.com + admin.dogan-ai.com + product hosts (top-level
        // navigation to KC IdP is NOT in connect-src — only fetch targets).
        ...allAuthOrigins(['https', 'wss']),
        "wss:",
        "ws:",
      ],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
});
app.use(helmetMiddleware);
app.use(compression());

const corsOrigins: string[] | boolean = (() => {
  if (process.env.NODE_ENV !== 'production') return true;
  const origins = new Set<string>();
  origins.add('https://shahin-ai.com');
  origins.add('https://www.shahin-ai.com');
  const extra = process.env.CORS_ALLOWED_ORIGINS;
  if (extra) extra.split(',').map(o => o.trim()).filter(Boolean).forEach(o => origins.add(o));
  return [...origins];
})();
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(tracingMiddleware());
app.use(metricsMiddleware());

// ── Health & readiness ────────────────────────────────────────────
app.get('/health', publicEndpointRateLimiter, async (_req: Request, res: Response) => {
  let gatewayOk = false;
  try {
    const r = await fetch(`${GATEWAY_URL}/health`, { signal: AbortSignal.timeout(3000) });
    gatewayOk = r.ok;
  } catch { /* gateway unreachable */ }

  res.status(gatewayOk ? 200 : 503).json({
    status: gatewayOk ? 'ok' : 'degraded',
    service: SERVICE_CODE,
    checks: {
      spa: fs.existsSync(path.join(SPA_DIR, 'index.html')) ? 'ok' : 'missing',
      gateway: gatewayOk ? 'ok' : 'unreachable',
    },
    uptime: process.uptime(),
    version: process.env.APP_VERSION || process.env.npm_package_version || 'unknown',
    gitSha: process.env.GIT_SHA || 'unknown',
    lastDeploy: process.env.LAST_DEPLOY || 'unknown',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', publicEndpointRateLimiter, (_req: Request, res: Response) => {
  res.json({ status: 'ready', service: SERVICE_CODE });
});

app.get('/metrics', publicEndpointRateLimiter, async (_req: Request, res: Response) => {
  try {
    const text = await getMetricsText();
    res.setHeader('Content-Type', getContentType());
    res.send(text);
  } catch {
    res.setHeader('Content-Type', 'text/plain');
    res.status(500).send('# metrics unavailable\n');
  }
});

// ── /events SSE proxy (no buffering, indefinite stream) ───────────
const FORWARDED_HEADERS = ['authorization', 'x-tenant-id', 'x-correlation-id', 'content-type', 'accept', 'cookie', 'x-requested-with', 'x-xsrf-token', 'x-user-id', 'x-form-elapsed-ms', 'last-event-id'];
const gwUrl = new URL(GATEWAY_URL);

app.get('/events', (req: Request, res: Response) => {
  const headers: Record<string, string> = {};
  for (const h of [...FORWARDED_HEADERS, 'traceparent', 'tracestate']) {
    const val = req.headers[h];
    if (val) headers[h] = Array.isArray(val) ? val[0] : val;
  }
  headers['accept'] = 'text/event-stream';
  headers['x-forwarded-for'] = req.ip || req.socket.remoteAddress || '';
  headers['x-forwarded-host'] = req.hostname;
  headers['x-forwarded-proto'] = req.protocol;

  const proxyReq = http.request({
    hostname: gwUrl.hostname,
    port: parseInt(gwUrl.port) || 4000,
    path: req.originalUrl,
    method: 'GET',
    headers,
    timeout: 0,
  }, (proxyRes) => {
    res.status(proxyRes.statusCode || 502);
    const skip = new Set(['transfer-encoding', 'connection', 'keep-alive', 'content-length']);
    for (const [key, val] of Object.entries(proxyRes.headers)) {
      if (!skip.has(key.toLowerCase()) && val) res.setHeader(key, val);
    }
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error(`[${SERVICE_CODE}] /events proxy error:`, err.message);
    if (!res.headersSent) res.status(502).end('event: error\ndata: gateway_unavailable\n\n');
    else res.end();
  });
  req.on('close', () => { proxyReq.destroy(); });
  proxyReq.end();
});

// ── /api proxy to gateway ─────────────────────────────────────────
app.use('/api', publicEndpointRateLimiter, express.json({ limit: '10mb' }), (req: Request, res: Response) => {
  const headers: Record<string, string> = {};
  for (const h of [...FORWARDED_HEADERS, 'traceparent', 'tracestate']) {
    const val = req.headers[h];
    if (val) headers[h] = Array.isArray(val) ? val[0] : val;
  }
  const activeSpan = getActiveSpan(req);
  if (activeSpan) Object.assign(headers, injectTraceHeaders(activeSpan));
  headers['x-forwarded-for'] = req.ip || req.socket.remoteAddress || '';
  headers['x-forwarded-host'] = req.hostname;
  headers['x-forwarded-proto'] = req.protocol;

  const hasBody = !['GET', 'HEAD', 'DELETE'].includes(req.method);
  const bodyData = hasBody && req.body ? JSON.stringify(req.body) : undefined;
  if (bodyData) headers['content-length'] = Buffer.byteLength(bodyData).toString();

  const proxyReq = http.request({
    hostname: gwUrl.hostname,
    port: parseInt(gwUrl.port) || 4000,
    path: req.originalUrl,
    method: req.method,
    headers,
    timeout: 60_000,
  }, (proxyRes) => {
    const skip = new Set(['transfer-encoding', 'connection', 'keep-alive']);
    for (const [key, val] of Object.entries(proxyRes.headers)) {
      if (!skip.has(key.toLowerCase()) && val) res.setHeader(key, val);
    }
    res.status(proxyRes.statusCode || 502);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error(`[${SERVICE_CODE}] API proxy error:`, err.message);
    if (!res.headersSent) res.status(502).json({ error: 'Platform gateway unavailable', path: req.originalUrl });
  });
  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    if (!res.headersSent) res.status(504).json({ error: 'Gateway timeout', path: req.originalUrl });
  });

  if (bodyData) proxyReq.write(bodyData);
  proxyReq.end();
});

// ── Build integrity ───────────────────────────────────────────────
let _buildManifest: Record<string, unknown> | null = null;
app.get('/build-info', publicEndpointRateLimiter, (_req: Request, res: Response) => {
  if (!_buildManifest) {
    try {
      const indexPath = path.join(SPA_DIR, 'index.html');
      const indexHtml = fs.readFileSync(indexPath, 'utf-8');
      const scripts = [...indexHtml.matchAll(/src="([^"]+\.js)"/g)].map(m => m[1]);
      const styles = [...indexHtml.matchAll(/href="([^"]+\.css)"/g)].map(m => m[1]);
      const assets: Array<{ file: string; hash: string; sizeKB: number }> = [];
      for (const asset of [...scripts, ...styles]) {
        const fullPath = path.join(SPA_DIR, asset);
        const hash = computeAssetHash(fullPath);
        try {
          const stat = fs.statSync(fullPath);
          assets.push({ file: asset, hash: `sha256-${hash}`, sizeKB: Math.round(stat.size / 1024) });
        } catch { /* skip */ }
      }
      _buildManifest = {
        service: SERVICE_CODE,
        spaDir: SPA_DIR,
        assets,
        totalSizeKB: assets.reduce((s, a) => s + a.sizeKB, 0),
        totalAssets: assets.length,
        indexHashExists: fs.existsSync(indexPath),
        timestamp: new Date().toISOString(),
      };
    } catch {
      _buildManifest = { service: SERVICE_CODE, error: 'SPA build not found', spaDir: SPA_DIR };
    }
  }
  res.json(_buildManifest);
});

// ── Static SPA assets (hashed; SW + manifest no-cache) ────────────
app.use(express.static(SPA_DIR, {
  maxAge: '1y',
  immutable: true,
  etag: true,
  index: false,
  setHeaders: (res, filePath) => {
    const basename = path.basename(filePath);
    if (basename === 'ngsw-worker.js' || basename === 'ngsw.json' || basename === 'manifest.webmanifest' || basename === 'safety-worker.js') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    if (/\.(woff2?|ttf|eot)$/.test(filePath)) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    if (/\.(js|css)$/.test(filePath)) {
      const hash = computeAssetHash(filePath);
      if (hash) res.setHeader('X-Content-Hash', `sha256-${hash}`);
    }
  },
}));

// ── SPA fallback. Edge rewrites admin.dogan-ai.com root → /workspace ──
app.get('*', (req: Request, res: Response) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/events') || req.path.startsWith('/health') || req.path.startsWith('/ready') || req.path.startsWith('/build-info') || req.path.startsWith('/metrics')) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const indexPath = path.join(SPA_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) {
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.status(503).send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta http-equiv="refresh" content="15"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dogan-AI OS — Starting Up</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0f1117;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}.card{text-align:center;padding:48px 40px;max-width:480px}.logo{font-size:2rem;font-weight:700;background:linear-gradient(135deg,#4338CA,#F59E0B);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px}.sub{color:#94a3b8;font-size:.9rem;margin-bottom:32px}.spinner{width:40px;height:40px;border:3px solid #1e293b;border-top-color:#4338CA;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 24px}@keyframes spin{to{transform:rotate(360deg)}}.msg{color:#64748b;font-size:.85rem}</style></head><body><div class="card"><div class="logo">Dogan-AI OS</div><div class="sub">Platform Operating System</div><div class="spinner"></div><p style="color:#cbd5e1;margin-bottom:12px">Platform is initializing...</p><p class="msg">This page will refresh automatically. Please wait.</p></div></body></html>`);
    return;
  }
  try {
    const html = fs.readFileSync(indexPath, 'utf-8');
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(html);
  } catch {
    res.sendFile(indexPath);
  }
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(`[${SERVICE_CODE}] Unhandled error:`, err);
  res.status(500).json({ error: 'Internal server error', service: SERVICE_CODE });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[${SERVICE_CODE}] Dogan-AI OS platform shell listening on 0.0.0.0:${PORT}`);
  console.log(`[${SERVICE_CODE}] SPA directory: ${SPA_DIR}`);
  console.log(`[${SERVICE_CODE}] API/Events proxy target: ${GATEWAY_URL}`);
  if (process.send) process.send('ready');
});

function shutdown(sig: string) {
  console.log(`[${SERVICE_CODE}] received ${sig}, closing...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
