import { Router } from 'express';
import { BootstrapQuerySchema } from '../schemas/bootstrap.schemas.js';
import { UiOsBootstrapManager } from '../managers/ui-os-bootstrap.manager.js';
export function createBootstrapRouter(pool) {
    const router = Router();
    const manager = new UiOsBootstrapManager(pool);
    router.get('/bootstrap', async (req, res) => {
        const parsed = BootstrapQuerySchema.safeParse({
            tenantId: req.header('x-dos-tenant-id') ?? req.query.tenantId,
            userId: req.header('x-dos-user-id') ?? req.query.userId,
            productCode: req.query.productCode ?? req.header('x-dos-product-code') ?? null,
            workspaceKey: req.query.workspaceKey ?? 'default',
        });
        if (!parsed.success) {
            res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
            return;
        }
        try {
            const request = {
                tenantId: parsed.data.tenantId,
                userId: parsed.data.userId,
                productCode: parsed.data.productCode ?? null,
                workspaceKey: parsed.data.workspaceKey ?? 'default',
            };
            const manifest = await manager.load(request);
            res.json(manifest);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'unknown_error';
            res.status(500).json({ error: 'bootstrap_failed', message });
        }
    });
    router.get('/bootstrap/minimal', async (req, res) => {
        const tenantId = (req.header('x-dos-tenant-id') ?? req.query.tenantId);
        const userId = (req.header('x-dos-user-id') ?? req.query.userId);
        if (!tenantId || !userId) {
            res.status(400).json({ error: 'missing_identity' });
            return;
        }
        try {
            res.json(await manager.loadMinimal({
                tenantId, userId,
                productCode: req.query.productCode ?? null,
                workspaceKey: req.query.workspaceKey ?? 'default',
            }));
        }
        catch (err) {
            res.status(500).json({ error: 'bootstrap_minimal_failed', message: err.message });
        }
    });
    router.get('/bootstrap/module/:moduleCode', async (req, res) => {
        const tenantId = (req.header('x-dos-tenant-id') ?? req.query.tenantId);
        const userId = (req.header('x-dos-user-id') ?? req.query.userId);
        if (!tenantId || !userId) {
            res.status(400).json({ error: 'missing_identity' });
            return;
        }
        try {
            const r = await manager.loadModuleScope(tenantId, userId, req.params.moduleCode);
            if (!r.module) {
                res.status(404).json({ error: 'module_not_found' });
                return;
            }
            res.json(r);
        }
        catch (err) {
            res.status(500).json({ error: 'bootstrap_module_failed', message: err.message });
        }
    });
    router.get('/bootstrap/route/:routeKey', async (req, res) => {
        const tenantId = (req.header('x-dos-tenant-id') ?? req.query.tenantId);
        const userId = (req.header('x-dos-user-id') ?? req.query.userId);
        if (!tenantId || !userId) {
            res.status(400).json({ error: 'missing_identity' });
            return;
        }
        try {
            res.json(await manager.loadRouteScope(tenantId, userId, req.params.routeKey));
        }
        catch (err) {
            res.status(500).json({ error: 'bootstrap_route_failed', message: err.message });
        }
    });
    return router;
}
//# sourceMappingURL=bootstrap.routes.js.map