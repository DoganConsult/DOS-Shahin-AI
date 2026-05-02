import { Router } from 'express';
import { UiOsDashboardManager, } from '../managers/ui-os-dashboard.manager.js';
import { DashboardCreateSchema, DashboardPatchSchema, DashboardLayoutPatchSchema, } from '../schemas/dashboard.schemas.js';
function context(req, res) {
    const tenantId = (req.header('x-dos-tenant-id') ?? req.query.tenantId);
    const userId = (req.header('x-dos-user-id') ?? req.query.userId);
    if (!tenantId || !userId) {
        res.status(400).json({ error: 'missing_identity', message: 'x-dos-tenant-id and x-dos-user-id headers are required' });
        return null;
    }
    return { tenantId, userId };
}
export function createDashboardsRouter(pool) {
    const router = Router();
    const manager = new UiOsDashboardManager(pool);
    router.get('/dashboards', async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        try {
            const list = await manager.list(ctx.tenantId, req.query.productCode ?? null, req.query.moduleCode ?? null);
            res.json({ dashboards: list });
        }
        catch (err) {
            res.status(500).json({ error: 'dashboards_list_failed', message: err.message });
        }
    });
    router.get('/dashboards/:dashboardKey', async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        try {
            const found = await manager.getByKey(ctx.tenantId, req.params.dashboardKey);
            if (!found) {
                res.status(404).json({ error: 'dashboard_not_found' });
                return;
            }
            res.json(found);
        }
        catch (err) {
            res.status(500).json({ error: 'dashboard_get_failed', message: err.message });
        }
    });
    router.post('/dashboards', async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        const parsed = DashboardCreateSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
            return;
        }
        try {
            const dashboard = await manager.create(ctx.tenantId, ctx.userId, parsed.data);
            res.status(201).json(dashboard);
        }
        catch (err) {
            const msg = err.message;
            if (msg.includes('duplicate key')) {
                res.status(409).json({ error: 'dashboard_exists' });
                return;
            }
            res.status(500).json({ error: 'dashboard_create_failed', message: msg });
        }
    });
    router.put('/dashboards/:dashboardKey', async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        const parsed = DashboardPatchSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
            return;
        }
        try {
            const dashboard = await manager.update(ctx.tenantId, req.params.dashboardKey, parsed.data);
            if (!dashboard) {
                res.status(404).json({ error: 'dashboard_not_found' });
                return;
            }
            res.json(dashboard);
        }
        catch (err) {
            res.status(500).json({ error: 'dashboard_update_failed', message: err.message });
        }
    });
    router.put('/dashboards/:dashboardKey/layout', async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        const parsed = DashboardLayoutPatchSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
            return;
        }
        try {
            const result = await manager.setLayout(ctx.tenantId, req.params.dashboardKey, parsed.data);
            if (!result) {
                res.status(404).json({ error: 'dashboard_not_found' });
                return;
            }
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: 'dashboard_layout_failed', message: err.message });
        }
    });
    router.delete('/dashboards/:dashboardKey', async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        try {
            const ok = await manager.remove(ctx.tenantId, req.params.dashboardKey);
            if (!ok) {
                res.status(404).json({ error: 'dashboard_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (err) {
            res.status(500).json({ error: 'dashboard_delete_failed', message: err.message });
        }
    });
    return router;
}
//# sourceMappingURL=dashboards.routes.js.map