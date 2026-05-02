import { Router } from 'express';
import { UiOsSearchManager } from '../managers/ui-os-search.manager.js';
import { SearchProviderSchema, SearchIndexSchema, SearchScopeSchema, SearchScopeIndexSchema, SearchHistorySchema, SearchSavedQuerySchema, CommandLogSchema, } from '../schemas/search.schemas.js';
import { requireFga } from '../middleware/openfga.js';
const UUID = /^[0-9a-fA-F-]{36}$/;
function ctx(req, res) {
    const tenantId = (req.header('x-dos-tenant-id') ?? req.query.tenantId);
    const userId = (req.header('x-dos-user-id') ?? req.query.userId);
    if (!tenantId || !userId) {
        res.status(400).json({ error: 'missing_identity' });
        return null;
    }
    return { tenantId, userId };
}
function fail(res, code, e) {
    const m = e.message;
    if (m.includes('duplicate key')) {
        res.status(409).json({ error: 'conflict' });
        return;
    }
    if (m.includes('violates foreign key')) {
        res.status(400).json({ error: 'fk_violation', message: m });
        return;
    }
    res.status(500).json({ error: code, message: m });
}
export function createSearchRouter(pool) {
    const router = Router();
    const m = new UiOsSearchManager(pool);
    const fgaViewer = requireFga({ build: (req) => req.principal?.sub && req.principal?.tenantId
            ? { user: `user:${req.principal.sub}`, relation: 'viewer', object: `ui_os_tenant:${req.principal.tenantId}` } : null });
    const fgaEditor = requireFga({ build: (req) => req.principal?.sub && req.principal?.tenantId
            ? { user: `user:${req.principal.sub}`, relation: 'editor', object: `ui_os_tenant:${req.principal.tenantId}` } : null });
    // Providers
    router.get('/search/providers', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ providers: await m.listProviders(c.tenantId) });
        }
        catch (e) {
            fail(res, 'providers_list_failed', e);
        }
    });
    router.put('/search/providers', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = SearchProviderSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertProvider(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'provider_upsert_failed', e);
        }
    });
    router.delete('/search/providers/:providerId', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.providerId)) {
            res.status(400).json({ error: 'invalid_provider_id' });
            return;
        }
        try {
            const ok = await m.deleteProvider(c.tenantId, req.params.providerId);
            if (!ok) {
                res.status(404).json({ error: 'provider_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'provider_delete_failed', e);
        }
    });
    // Indexes
    router.get('/search/indexes', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ indexes: await m.listIndexes(c.tenantId, req.query.providerId ?? null) });
        }
        catch (e) {
            fail(res, 'indexes_list_failed', e);
        }
    });
    router.put('/search/indexes', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = SearchIndexSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertIndex(c.tenantId, p.data));
        }
        catch (e) {
            fail(res, 'index_upsert_failed', e);
        }
    });
    router.delete('/search/indexes/:indexId', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.indexId)) {
            res.status(400).json({ error: 'invalid_index_id' });
            return;
        }
        try {
            const ok = await m.deleteIndex(c.tenantId, req.params.indexId);
            if (!ok) {
                res.status(404).json({ error: 'index_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'index_delete_failed', e);
        }
    });
    // Scopes
    router.get('/search/scopes', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ scopes: await m.listScopes(c.tenantId) });
        }
        catch (e) {
            fail(res, 'scopes_list_failed', e);
        }
    });
    router.put('/search/scopes', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = SearchScopeSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertScope(c.tenantId, p.data));
        }
        catch (e) {
            fail(res, 'scope_upsert_failed', e);
        }
    });
    router.delete('/search/scopes/:scopeId', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.scopeId)) {
            res.status(400).json({ error: 'invalid_scope_id' });
            return;
        }
        try {
            const ok = await m.deleteScope(c.tenantId, req.params.scopeId);
            if (!ok) {
                res.status(404).json({ error: 'scope_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'scope_delete_failed', e);
        }
    });
    // Scope-index bindings
    router.get('/search/scopes/:scopeId/indexes', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.scopeId)) {
            res.status(400).json({ error: 'invalid_scope_id' });
            return;
        }
        try {
            res.json({ bindings: await m.listScopeIndexes(c.tenantId, req.params.scopeId) });
        }
        catch (e) {
            fail(res, 'bindings_list_failed', e);
        }
    });
    router.post('/search/scopes/:scopeId/indexes', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.scopeId)) {
            res.status(400).json({ error: 'invalid_scope_id' });
            return;
        }
        const p = SearchScopeIndexSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.bindScopeIndex(c.tenantId, req.params.scopeId, p.data));
        }
        catch (e) {
            fail(res, 'binding_create_failed', e);
        }
    });
    router.delete('/search/scope-indexes/:bindingId', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.bindingId)) {
            res.status(400).json({ error: 'invalid_binding_id' });
            return;
        }
        try {
            const ok = await m.unbindScopeIndex(c.tenantId, req.params.bindingId);
            if (!ok) {
                res.status(404).json({ error: 'binding_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'binding_delete_failed', e);
        }
    });
    // History
    router.get('/search/history', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ history: await m.listHistory(c.tenantId, c.userId, parseInt(String(req.query.limit ?? 100), 10)) });
        }
        catch (e) {
            fail(res, 'history_list_failed', e);
        }
    });
    router.post('/search/history', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = SearchHistorySchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.recordHistory(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'history_record_failed', e);
        }
    });
    // Saved queries
    router.get('/search/saved-queries', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ queries: await m.listSavedQueries(c.tenantId, c.userId) });
        }
        catch (e) {
            fail(res, 'queries_list_failed', e);
        }
    });
    router.put('/search/saved-queries', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = SearchSavedQuerySchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertSavedQuery(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'query_upsert_failed', e);
        }
    });
    router.delete('/search/saved-queries/:queryId', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.queryId)) {
            res.status(400).json({ error: 'invalid_query_id' });
            return;
        }
        try {
            const ok = await m.deleteSavedQuery(c.tenantId, c.userId, req.params.queryId);
            if (!ok) {
                res.status(404).json({ error: 'query_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'query_delete_failed', e);
        }
    });
    // Command execution log
    router.get('/commands/execution-log', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ log: await m.listCommandLog(c.tenantId, {
                    userId: req.query.userId ?? null,
                    commandKey: req.query.commandKey ?? null,
                }, parseInt(String(req.query.limit ?? 100), 10)) });
        }
        catch (e) {
            fail(res, 'log_list_failed', e);
        }
    });
    router.post('/commands/execution-log', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = CommandLogSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.recordCommand(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'log_record_failed', e);
        }
    });
    return router;
}
//# sourceMappingURL=search.routes.js.map