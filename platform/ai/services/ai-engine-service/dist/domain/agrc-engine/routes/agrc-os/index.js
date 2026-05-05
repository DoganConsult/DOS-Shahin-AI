import { Router } from 'express';
import express from 'express';
import path from 'path';
import { correlationMiddleware } from '../middleware/correlation';
import { rateLimitMiddleware } from '../middleware/rate-limit';
import { csrfMiddleware } from '../middleware/csrf';
import { proxyRouter } from './proxy';
export const routes = Router();
// ---- Layer 1: Correlation & IP rate-limiting (stateless, no auth needed) ----
routes.use(correlationMiddleware);
routes.use(rateLimitMiddleware);
// ---- Layer 1.5: CSRF protection (double-submit cookie) ----
routes.use(csrfMiddleware);
routes.get('/info', (_req, res) => {
    res.json({ service: 'gateway', version: '0.1.0' });
});
routes.get('/metrics', async (_req, res) => {
    try {
        const obs = await import('@dos/platform-core/observability');
        res.setHeader('Content-Type', obs.getContentType());
        res.send(await obs.getMetricsText());
    }
    catch {
        res.status(503).send('# metrics not available\n');
    }
});
try {
    const { setupSwagger } = require('../domain/swagger');
    setupSwagger(routes);
}
catch { }
// ---- Layer 3: Tenant context (optional — extracts x-tenant-id if present, does NOT block) ----
// Platform-admin, config-center, provisioning, navigation are platform-level (no tenant required).
// Tenant-scoped routes (users, workflow, notifications) get tenant context from JWT or header.
routes.use((req, _res, next) => {
    const tenantId = req.headers['x-tenant-id'];
    if (tenantId) {
        req.tenantId = tenantId;
    }
    next();
});
// ---- Layer 4: Public content (no auth) ----
try {
    const publicContent = require('../../../../../../../platform/Shahin-AI Website/backend/public-content.routes');
    routes.use('/api/public', publicContent.default);
}
catch { }
// ---- Layer 5: Service proxy ----
routes.use(proxyRouter);
// ---- Layer 5: Platform Admin UI (static files) ----
const publicDir = path.resolve(__dirname, '../../public');
routes.use('/admin', express.static(publicDir));
routes.get('/admin', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});
routes.get('/', (_req, res) => {
    if (_req.headers.accept?.includes('text/html')) {
        res.redirect('/admin');
    }
    else {
        res.json({ service: 'gateway', version: '0.1.0', admin: '/admin' });
    }
});
//# sourceMappingURL=index.js.map