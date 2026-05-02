"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * DOS Product Shell — Shahin-AI (clean shell).
 *
 * Port 3000. Two responsibilities only:
 *   1. Serve the Angular SPA from $SPA_DIR with index.html fallback for client-side routing.
 *   2. Proxy /api/* to the platform gateway at $GATEWAY_URL.
 *
 * No platform/core imports, no module wiring, no product registration.
 */
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const compression_1 = __importDefault(require("compression"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const http_proxy_middleware_1 = require("http-proxy-middleware");
const SERVICE = 'product-shell';
const PORT = Number(process.env.PORT || 3000);
const GATEWAY_URL = required('GATEWAY_URL');
// SPA directory resolution (precedence — first hit wins):
//   1. PRODUCT_SHELL_SPA_DIR   ← canonical (recommended; absolute path)
//   2. SPA_DIR                 ← legacy alias; logs a deprecation warning
//   3. computed fallback       ← anchored from __dirname, no literal
//                                 "DOS Platform/..." string in code
//
// The fallback assumes the in-platform layout (post Phase-0 consolidation —
// services live at the top level):
//   <repo-root>/services/product-shell/dist/server.js  (this file)
//   <repo-root>/products/shahin-ai/app/dist/shahin-ai/browser
//
// __dirname → <repo-root>/services/product-shell/dist
// 3 ups = repo-root.
const PLATFORM_ROOT = path_1.default.resolve(__dirname, '..', '..', '..');
const SPA_DIR_DEFAULT = path_1.default.join(PLATFORM_ROOT, 'products', 'shahin-ai', 'app', 'dist', 'shahin-ai', 'browser');
let SPA_DIR_SOURCE = 'fallback';
let SPA_DIR;
if (process.env.PRODUCT_SHELL_SPA_DIR && process.env.PRODUCT_SHELL_SPA_DIR.length > 0) {
    SPA_DIR = process.env.PRODUCT_SHELL_SPA_DIR;
    SPA_DIR_SOURCE = 'PRODUCT_SHELL_SPA_DIR';
}
else if (process.env.SPA_DIR && process.env.SPA_DIR.length > 0) {
    SPA_DIR = process.env.SPA_DIR;
    SPA_DIR_SOURCE = 'SPA_DIR';
    console.warn(`[${SERVICE}] SPA_DIR is deprecated; rename the env var to PRODUCT_SHELL_SPA_DIR.`);
}
else {
    SPA_DIR = SPA_DIR_DEFAULT;
    SPA_DIR_SOURCE = 'fallback';
}
const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',').map(s => s.trim()).filter(Boolean);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
// Service-worker / manifest filenames that must NEVER be long-cached.
// A stale entry here is what keeps the legacy ngsw-worker.js alive in
// browsers across deploys and Cloudflare edges.
const NO_STORE_FILES = new Set([
    'sw.js',
    'ngsw-worker.js',
    'safety-worker.js',
    'ngsw.json',
    'manifest.webmanifest',
    'manifest.json',
    'index.html',
]);
const NO_STORE_CACHE_CONTROL = 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0';
function applyNoStoreHeaders(res) {
    res.setHeader('Cache-Control', NO_STORE_CACHE_CONTROL);
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
}
function required(name) {
    const v = process.env[name];
    if (!v)
        throw new Error(`Required environment variable ${name} is not set`);
    return v;
}
const app = (0, express_1.default)();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false, // CSP is owned by nginx (frontend.conf).
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: { maxAge: 31_536_000, includeSubDomains: true, preload: true },
}));
app.use((0, compression_1.default)());
if (IS_PRODUCTION && ALLOWED_ORIGINS.length === 0) {
    console.warn(`[${SERVICE}] CORS_ALLOWED_ORIGINS is empty in production — failing closed for cross-origin requests.`);
}
app.use((0, cors_1.default)({
    origin: (origin, cb) => {
        if (!origin)
            return cb(null, true);
        if (ALLOWED_ORIGINS.length === 0) {
            // Fail closed in production; permissive only outside production.
            return cb(null, !IS_PRODUCTION);
        }
        cb(null, ALLOWED_ORIGINS.includes(origin));
    },
    credentials: true,
}));
app.use((0, morgan_1.default)(process.env.LOG_FORMAT || 'combined'));
app.get('/health', (_req, res) => res.json({ ok: true, service: SERVICE }));
app.get('/ready', (_req, res) => res.json({ ok: true, service: SERVICE }));
// Defense-in-depth: auth entry routes MUST never serve the SPA shell, even
// if nginx-level redirects are bypassed or a stale service worker tries to
// intercept navigation. These run before express.static and the SPA catch-all.
app.get(['/login', '/register'], (req, res) => {
    const mode = req.path === '/register' ? 'register' : 'login';
    applyNoStoreHeaders(res);
    res.setHeader('X-DOS-Route', `product-shell-auth-${mode}-redirect`);
    res.redirect(302, `/api/auth/oidc/start?mode=${mode}`);
});
// /api/* → gateway. Express strips the mount path, so re-prepend it via
// pathRewrite — the gateway mounts everything under /api/*.
app.use('/api', (0, http_proxy_middleware_1.createProxyMiddleware)({
    target: GATEWAY_URL,
    changeOrigin: true,
    xfwd: true,
    proxyTimeout: 60_000,
    timeout: 60_000,
    pathRewrite: (path) => `/api${path.startsWith('/') ? path : `/${path}`}`,
}));
// Static SPA assets (hashed bundles). index.html is served by the catch-all.
app.use(express_1.default.static(SPA_DIR, {
    maxAge: '1y',
    immutable: true,
    etag: true,
    index: false,
    setHeaders: (res, filePath) => {
        // Service-worker + manifest must NEVER be long-cached, otherwise the
        // legacy ngsw-worker.js stays alive in browsers with the old CSP.
        if (NO_STORE_FILES.has(path_1.default.basename(filePath))) {
            applyNoStoreHeaders(res);
        }
    },
}));
// Controlled 404 for absent kill-switch / SW manifest files. Without this,
// the SPA catch-all below would return text/html for /ngsw.json and let a
// stale Angular service worker keep itself alive in the browser.
const SAFETY_WORKER_EXISTS = fs_1.default.existsSync(path_1.default.join(SPA_DIR, 'safety-worker.js'));
const CONTROLLED_404_PATHS = ['/ngsw.json'];
if (!SAFETY_WORKER_EXISTS)
    CONTROLLED_404_PATHS.push('/safety-worker.js');
app.get(CONTROLLED_404_PATHS, (_req, res) => {
    applyNoStoreHeaders(res);
    res.status(404).type('text/plain').send('not found');
});
// Resolve index.html once at boot; avoids a syscall per SPA navigation.
const INDEX_PATH = path_1.default.join(SPA_DIR, 'index.html');
const INDEX_EXISTS = fs_1.default.existsSync(INDEX_PATH);
// Stale hashed-asset requests (old bundle hashes after a deploy) MUST NOT
// be answered with index.html — browsers would try to execute HTML as JS
// and silently replay the old SPA shell on top of the new one. 404 them.
const ASSET_EXT = /\.(?:js|css|map|woff2?|ttf|otf|eot|png|jpe?g|gif|svg|ico|webp|wasm)$/i;
app.get('*', (req, res) => {
    if (ASSET_EXT.test(req.path)) {
        applyNoStoreHeaders(res);
        res.status(404).type('text/plain').send('not found');
        return;
    }
    if (!INDEX_EXISTS) {
        res.status(503).type('text/plain').send('SPA build missing. Run pnpm --filter @shahin/spa build.');
        return;
    }
    applyNoStoreHeaders(res);
    res.sendFile(INDEX_PATH);
});
app.use((err, _req, res, _next) => {
    console.error(`[${SERVICE}] unhandled`, err);
    if (!res.headersSent)
        res.status(500).json({ error: 'INTERNAL_ERROR' });
});
app.listen(PORT, '0.0.0.0', () => {
    console.info(`[${SERVICE}] listening on :${PORT}`);
    console.info(`[${SERVICE}] SPA_DIR=${SPA_DIR} (source=${SPA_DIR_SOURCE})`);
    console.info(`[${SERVICE}] PLATFORM_ROOT=${PLATFORM_ROOT}`);
    console.info(`[${SERVICE}] GATEWAY_URL=${GATEWAY_URL}`);
});
//# sourceMappingURL=server.js.map