import { Router } from 'express';
import { UiOsGridStateManager, } from '../managers/ui-os-grid-state.manager.js';
import { UiOsSavedViewManager, } from '../managers/ui-os-saved-view.manager.js';
import { GridStatePatchSchema, GridViewCreateSchema, SavedViewCreateSchema, SavedViewPatchSchema, } from '../schemas/grid.schemas.js';
function context(req, res) {
    const tenantId = (req.header('x-dos-tenant-id') ?? req.query.tenantId);
    const userId = (req.header('x-dos-user-id') ?? req.query.userId);
    if (!tenantId || !userId) {
        res.status(400).json({ error: 'missing_identity' });
        return null;
    }
    return { tenantId, userId };
}
export function createGridsRouter(pool) {
    const router = Router();
    const grid = new UiOsGridStateManager(pool);
    const sv = new UiOsSavedViewManager(pool);
    router.get('/grid-state/:gridKey', async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        try {
            res.json(await grid.get(ctx.tenantId, ctx.userId, req.params.gridKey));
        }
        catch (e) {
            res.status(500).json({ error: 'grid_get_failed', message: e.message });
        }
    });
    router.put('/grid-state/:gridKey', async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        const parsed = GridStatePatchSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
            return;
        }
        try {
            res.json(await grid.upsert(ctx.tenantId, ctx.userId, req.params.gridKey, parsed.data));
        }
        catch (e) {
            res.status(500).json({ error: 'grid_put_failed', message: e.message });
        }
    });
    router.post('/grid-state/:gridKey/reset', async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        try {
            res.json(await grid.reset(ctx.tenantId, ctx.userId, req.params.gridKey));
        }
        catch (e) {
            res.status(500).json({ error: 'grid_reset_failed', message: e.message });
        }
    });
    router.get('/grid-views/:gridKey', async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        try {
            res.json({ views: await grid.listViews(ctx.tenantId, ctx.userId, req.params.gridKey) });
        }
        catch (e) {
            res.status(500).json({ error: 'grid_views_failed', message: e.message });
        }
    });
    router.post('/grid-views/:gridKey', async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        const parsed = GridViewCreateSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await grid.createView(ctx.tenantId, ctx.userId, req.params.gridKey, parsed.data));
        }
        catch (e) {
            const msg = e.message;
            if (msg.includes('duplicate key')) {
                res.status(409).json({ error: 'view_exists' });
                return;
            }
            res.status(500).json({ error: 'grid_view_create_failed', message: msg });
        }
    });
    router.get('/saved-views', async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        try {
            res.json({ views: await sv.list(ctx.tenantId, ctx.userId, req.query.moduleCode ?? null) });
        }
        catch (e) {
            res.status(500).json({ error: 'saved_views_failed', message: e.message });
        }
    });
    router.post('/saved-views', async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        const parsed = SavedViewCreateSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await sv.create(ctx.tenantId, ctx.userId, parsed.data));
        }
        catch (e) {
            const msg = e.message;
            if (msg.includes('duplicate key')) {
                res.status(409).json({ error: 'view_exists' });
                return;
            }
            res.status(500).json({ error: 'saved_view_create_failed', message: msg });
        }
    });
    router.put('/saved-views/:viewId', async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        if (!/^[0-9a-fA-F-]{36}$/.test(req.params.viewId)) {
            res.status(400).json({ error: 'invalid_view_id' });
            return;
        }
        const parsed = SavedViewPatchSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
            return;
        }
        try {
            const r = await sv.update(ctx.tenantId, req.params.viewId, parsed.data);
            if (!r) {
                res.status(404).json({ error: 'view_not_found' });
                return;
            }
            res.json(r);
        }
        catch (e) {
            res.status(500).json({ error: 'saved_view_update_failed', message: e.message });
        }
    });
    router.delete('/saved-views/:viewId', async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        if (!/^[0-9a-fA-F-]{36}$/.test(req.params.viewId)) {
            res.status(400).json({ error: 'invalid_view_id' });
            return;
        }
        try {
            const ok = await sv.remove(ctx.tenantId, req.params.viewId);
            if (!ok) {
                res.status(404).json({ error: 'view_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            res.status(500).json({ error: 'saved_view_delete_failed', message: e.message });
        }
    });
    return router;
}
//# sourceMappingURL=grids.routes.js.map