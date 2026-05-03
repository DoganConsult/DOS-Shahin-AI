import express from 'express';
import { createPool } from './db.js';
import { createUiOsRouter } from './routes/index.js';
import { createDynamicUiContractRouter } from './routes/dynamic-ui-contract.routes.js';
import { createBrandRouter } from './routes/brand.routes.js';
import { createAgenticRouter } from './routes/agentic.routes.js';
import { createMarketingDownloadsRouter } from './routes/marketing-downloads.routes.js';
import { createTemplateBindingRouter } from './routes/template-binding.routes.js';
import { requireGatewayOrigin } from './middleware/gateway-origin.js';
const PORT = Number(process.env.PORT || 4015);
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error('[ui-os-service] DATABASE_URL is required');
    process.exit(1);
}
const pool = createPool(DATABASE_URL);
const publicMarketingTemplateRoutes = new Set(['/', '/pricing', '/trust', '/security', '/contact', '/about', '/legal']);
const publicTemplateBindingRouter = createTemplateBindingRouter(pool);
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
// Wave 10b — DAuth gateway-origin verifier (HMAC-signed `x-dos-gateway-token`).
// Sole writer of req.principal. Honors LEGACY_HEADER_TRUST=true during
// rollout — flip to false in prod to fail-closed on missing tokens.
// /api/ui-os/health stays un-gated for liveness checks.
app.get('/api/ui-os/health', (_req, res) => {
    res.json({ service: 'ui-os-service', status: 'ok' });
});
// Phase M3 — PUBLIC, UNAUTHENTICATED marketing surface. These are the only
// /api/ui-os/* endpoints that bypass requireGatewayOrigin because the marketing
// landing must render for anonymous visitors (no tenant, no session). Mount
// BEFORE the auth gate so the catch-all gate never sees these paths.
//   - /api/ui-os/brand                 (brand resolver)
//   - /api/ui-os/marketing/config      (marketing config)
//   - /api/ui-os/marketing/assets      (download kit)
//   - /api/ui-os/marketing/downloads   (event sink, POST)
//   - /api/ui-os/agentic/registry      (agentic showcase)
//   - /api/ui-os/agentic/strip         (agent strip aggregate)
app.use('/api/ui-os', createBrandRouter(pool));
app.use('/api/ui-os', createAgenticRouter(pool));
app.use('/api/ui-os', createMarketingDownloadsRouter(pool));
app.use('/api/ui-os', (req, res, next) => {
    const route = String(req.query.route ?? '');
    if (req.method === 'GET' && req.path === '/template-binding' && publicMarketingTemplateRoutes.has(route)) {
        return publicTemplateBindingRouter(req, res, next);
    }
    next();
});
app.use('/api/ui-os', requireGatewayOrigin());
// Wave 10b — pin canonical x-dos-* identity headers from the verified
// principal. After this point all route handlers read identity from
// headers populated by trusted code only — never raw inbound headers.
app.use('/api/ui-os', (req, _res, next) => {
    const p = req.principal;
    if (p) {
        if (p.tenantId)
            req.headers['x-dos-tenant-id'] = p.tenantId;
        if (p.sub)
            req.headers['x-dos-user-id'] = p.sub;
    }
    else {
        const t = req.headers['x-dos-tenant-id'] ?? req.headers['x-tenant-id'];
        const u = req.headers['x-dos-user-id'] ?? req.headers['x-user-sub'];
        if (t && !req.headers['x-dos-tenant-id'])
            req.headers['x-dos-tenant-id'] = t;
        if (u && !req.headers['x-dos-user-id'])
            req.headers['x-dos-user-id'] = u;
    }
    next();
});
app.use('/api/ui-os', createUiOsRouter(pool));
// W8 — Spec §10: canonical /api/dynamic-ui/contract/{moduleCode} and
// /api/dynamic-ui/route-catalog must resolve through the gateway. We
// mount a narrow contract router (NOT the full ui-os router) under a
// second base path so legacy ui-os surfaces don't leak under
// /api/dynamic-ui.
app.get('/api/dynamic-ui/health', (_req, res) => {
    res.json({ service: 'ui-os-service', surface: 'dynamic-ui', status: 'ok' });
});
app.use('/api/dynamic-ui', requireGatewayOrigin());
app.use('/api/dynamic-ui', (req, _res, next) => {
    const p = req.principal;
    if (p) {
        if (p.tenantId)
            req.headers['x-dos-tenant-id'] = p.tenantId;
        if (p.sub)
            req.headers['x-dos-user-id'] = p.sub;
    }
    else {
        const t = req.headers['x-dos-tenant-id'] ?? req.headers['x-tenant-id'];
        const u = req.headers['x-dos-user-id'] ?? req.headers['x-user-sub'];
        if (t && !req.headers['x-dos-tenant-id'])
            req.headers['x-dos-tenant-id'] = t;
        if (u && !req.headers['x-dos-user-id'])
            req.headers['x-dos-user-id'] = u;
    }
    next();
});
app.use('/api/dynamic-ui', createDynamicUiContractRouter(pool));
const server = app.listen(PORT, () => {
    console.log(`[ui-os-service] listening on ${PORT}`);
    if (typeof process.send === 'function') {
        process.send('ready');
    }
});
const shutdown = (signal) => {
    console.log(`[ui-os-service] received ${signal}, shutting down`);
    server.close(() => {
        pool.end().finally(() => process.exit(0));
    });
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
//# sourceMappingURL=server.js.map