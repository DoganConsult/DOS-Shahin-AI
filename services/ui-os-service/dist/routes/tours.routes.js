import { Router } from 'express';
import { UiOsTourManager } from '../managers/ui-os-tour.manager.js';
import { UiOsCommandManager } from '../managers/ui-os-command.manager.js';
import { UiOsSearchManager } from '../managers/ui-os-search.manager.js';
import { UiOsHelpManager } from '../managers/ui-os-help.manager.js';
import { TourCompleteSchema, TourSkipSchema, SaveQuerySchema } from '../schemas/tour.schemas.js';
function context(req, res) {
    const tenantId = (req.header('x-dos-tenant-id') ?? req.query.tenantId);
    const userId = (req.header('x-dos-user-id') ?? req.query.userId);
    if (!tenantId || !userId) {
        res.status(400).json({ error: 'missing_identity' });
        return null;
    }
    return { tenantId, userId };
}
export function createToursRouter(pool) {
    const router = Router();
    const tour = new UiOsTourManager(pool);
    const cmd = new UiOsCommandManager(pool);
    const search = new UiOsSearchManager(pool);
    const help = new UiOsHelpManager(pool);
    router.get('/tours', async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        try {
            res.json({ tours: await tour.list(ctx.tenantId, ctx.userId, req.query.productCode ?? null, req.query.moduleCode ?? null) });
        }
        catch (e) {
            res.status(500).json({ error: 'tours_list_failed', message: e.message });
        }
    });
    router.get('/tours/:tourKey', async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        try {
            const t = await tour.getByKey(ctx.tenantId, ctx.userId, req.params.tourKey);
            if (!t) {
                res.status(404).json({ error: 'tour_not_found' });
                return;
            }
            res.json(t);
        }
        catch (e) {
            res.status(500).json({ error: 'tour_get_failed', message: e.message });
        }
    });
    router.post('/tours/:tourKey/complete', async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        const parsed = TourCompleteSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
            return;
        }
        try {
            res.json(await tour.mark(ctx.tenantId, ctx.userId, req.params.tourKey, 'completed', parsed.data.last_step_key));
        }
        catch (e) {
            res.status(500).json({ error: 'tour_complete_failed', message: e.message });
        }
    });
    router.post('/tours/:tourKey/skip', async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        const parsed = TourSkipSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
            return;
        }
        try {
            res.json(await tour.mark(ctx.tenantId, ctx.userId, req.params.tourKey, 'skipped', parsed.data.last_step_key));
        }
        catch (e) {
            res.status(500).json({ error: 'tour_skip_failed', message: e.message });
        }
    });
    router.get('/help/contextual', async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        try {
            res.json({ items: await help.contextual(ctx.tenantId, req.query.moduleCode ?? null, req.query.routeKey ?? null) });
        }
        catch (e) {
            res.status(500).json({ error: 'help_failed', message: e.message });
        }
    });
    router.get('/commands', async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        try {
            res.json({ commands: await cmd.list(ctx.tenantId, req.query.productCode ?? null, req.query.moduleCode ?? null) });
        }
        catch (e) {
            res.status(500).json({ error: 'commands_failed', message: e.message });
        }
    });
    router.post('/commands/:commandKey/execute', async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        try {
            const r = await cmd.execute(ctx.tenantId, req.params.commandKey);
            if (!r) {
                res.status(404).json({ error: 'command_not_found' });
                return;
            }
            res.json(r);
        }
        catch (e) {
            res.status(500).json({ error: 'command_execute_failed', message: e.message });
        }
    });
    router.get('/search', async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        const q = req.query.q ?? '';
        const limit = Math.min(parseInt(req.query.limit ?? '25', 10) || 25, 100);
        try {
            res.json({ query: q, hits: await search.search(ctx.tenantId, q, limit) });
        }
        catch (e) {
            res.status(500).json({ error: 'search_failed', message: e.message });
        }
    });
    router.get('/search/suggestions', async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        const q = req.query.q ?? '';
        try {
            res.json({ suggestions: await search.suggestions(ctx.tenantId, q) });
        }
        catch (e) {
            res.status(500).json({ error: 'suggestions_failed', message: e.message });
        }
    });
    router.post('/search/saved', async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        const parsed = SaveQuerySchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await search.saveQuery(ctx.tenantId, ctx.userId, parsed.data.query, parsed.data.name));
        }
        catch (e) {
            res.status(500).json({ error: 'search_save_failed', message: e.message });
        }
    });
    return router;
}
//# sourceMappingURL=tours.routes.js.map