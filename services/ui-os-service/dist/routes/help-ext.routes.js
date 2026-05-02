import { Router } from 'express';
import { UiOsHelpExtManager } from '../managers/ui-os-help-ext.manager.js';
import { HelpArticleSchema, HelpCollectionSchema, HelpCollectionArticleSchema, ContextualHelpLinkSchema, EmptyStateSchema, ChecklistSchema, ChecklistStepSchema, StepStatusSchema, ReleaseNoteSchema, } from '../schemas/help-ext.schemas.js';
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
export function createHelpExtRouter(pool) {
    const router = Router();
    const m = new UiOsHelpExtManager(pool);
    const fgaViewer = requireFga({ build: (req) => req.principal?.sub && req.principal?.tenantId
            ? { user: `user:${req.principal.sub}`, relation: 'viewer', object: `ui_os_tenant:${req.principal.tenantId}` } : null });
    const fgaEditor = requireFga({ build: (req) => req.principal?.sub && req.principal?.tenantId
            ? { user: `user:${req.principal.sub}`, relation: 'editor', object: `ui_os_tenant:${req.principal.tenantId}` } : null });
    // Articles
    router.get('/help/articles', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ articles: await m.listArticles(c.tenantId, {
                    locale: req.query.locale ?? null,
                    moduleCode: req.query.moduleCode ?? null,
                }) });
        }
        catch (e) {
            fail(res, 'articles_list_failed', e);
        }
    });
    router.get('/help/articles/:slug', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const locale = req.query.locale ?? 'en';
        try {
            const a = await m.getArticle(c.tenantId, req.params.slug, locale);
            if (!a) {
                res.status(404).json({ error: 'article_not_found' });
                return;
            }
            res.json(a);
        }
        catch (e) {
            fail(res, 'article_get_failed', e);
        }
    });
    router.put('/help/articles', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = HelpArticleSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertArticle(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'article_upsert_failed', e);
        }
    });
    router.delete('/help/articles/:articleId', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.articleId)) {
            res.status(400).json({ error: 'invalid_article_id' });
            return;
        }
        try {
            const ok = await m.deleteArticle(c.tenantId, req.params.articleId);
            if (!ok) {
                res.status(404).json({ error: 'article_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'article_delete_failed', e);
        }
    });
    // Collections
    router.get('/help/collections', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ collections: await m.listCollections(c.tenantId) });
        }
        catch (e) {
            fail(res, 'collections_list_failed', e);
        }
    });
    router.put('/help/collections', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = HelpCollectionSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertCollection(c.tenantId, p.data));
        }
        catch (e) {
            fail(res, 'collection_upsert_failed', e);
        }
    });
    router.delete('/help/collections/:collectionId', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.collectionId)) {
            res.status(400).json({ error: 'invalid_collection_id' });
            return;
        }
        try {
            const ok = await m.deleteCollection(c.tenantId, req.params.collectionId);
            if (!ok) {
                res.status(404).json({ error: 'collection_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'collection_delete_failed', e);
        }
    });
    router.get('/help/collections/:collectionId/articles', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.collectionId)) {
            res.status(400).json({ error: 'invalid_collection_id' });
            return;
        }
        try {
            res.json({ articles: await m.listCollectionArticles(c.tenantId, req.params.collectionId) });
        }
        catch (e) {
            fail(res, 'collection_articles_list_failed', e);
        }
    });
    router.post('/help/collections/:collectionId/articles', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.collectionId)) {
            res.status(400).json({ error: 'invalid_collection_id' });
            return;
        }
        const p = HelpCollectionArticleSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.addCollectionArticle(c.tenantId, req.params.collectionId, p.data));
        }
        catch (e) {
            fail(res, 'collection_article_add_failed', e);
        }
    });
    router.delete('/help/collection-articles/:bindingId', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.bindingId)) {
            res.status(400).json({ error: 'invalid_binding_id' });
            return;
        }
        try {
            const ok = await m.removeCollectionArticle(c.tenantId, req.params.bindingId);
            if (!ok) {
                res.status(404).json({ error: 'binding_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'collection_article_remove_failed', e);
        }
    });
    // Contextual help links
    router.get('/help/contextual-links', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ links: await m.listContextualLinks(c.tenantId, req.query.surfaceKey ?? null) });
        }
        catch (e) {
            fail(res, 'links_list_failed', e);
        }
    });
    router.put('/help/contextual-links', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = ContextualHelpLinkSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertContextualLink(c.tenantId, p.data));
        }
        catch (e) {
            fail(res, 'link_upsert_failed', e);
        }
    });
    router.delete('/help/contextual-links/:linkId', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.linkId)) {
            res.status(400).json({ error: 'invalid_link_id' });
            return;
        }
        try {
            const ok = await m.deleteContextualLink(c.tenantId, req.params.linkId);
            if (!ok) {
                res.status(404).json({ error: 'link_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'link_delete_failed', e);
        }
    });
    // Empty-state content
    router.get('/empty-states', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ empty_states: await m.listEmptyStates(c.tenantId) });
        }
        catch (e) {
            fail(res, 'empty_states_list_failed', e);
        }
    });
    router.put('/empty-states', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = EmptyStateSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertEmptyState(c.tenantId, p.data));
        }
        catch (e) {
            fail(res, 'empty_state_upsert_failed', e);
        }
    });
    // Checklists
    router.get('/checklists', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ checklists: await m.listChecklists(c.tenantId, req.query.audience ?? null) });
        }
        catch (e) {
            fail(res, 'checklists_list_failed', e);
        }
    });
    router.put('/checklists', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = ChecklistSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertChecklist(c.tenantId, p.data));
        }
        catch (e) {
            fail(res, 'checklist_upsert_failed', e);
        }
    });
    router.delete('/checklists/:checklistId', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.checklistId)) {
            res.status(400).json({ error: 'invalid_checklist_id' });
            return;
        }
        try {
            const ok = await m.deleteChecklist(c.tenantId, req.params.checklistId);
            if (!ok) {
                res.status(404).json({ error: 'checklist_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'checklist_delete_failed', e);
        }
    });
    router.get('/checklists/:checklistId/steps', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.checklistId)) {
            res.status(400).json({ error: 'invalid_checklist_id' });
            return;
        }
        try {
            res.json({ steps: await m.listSteps(c.tenantId, req.params.checklistId) });
        }
        catch (e) {
            fail(res, 'steps_list_failed', e);
        }
    });
    router.put('/checklists/:checklistId/steps', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.checklistId)) {
            res.status(400).json({ error: 'invalid_checklist_id' });
            return;
        }
        const p = ChecklistStepSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertStep(c.tenantId, req.params.checklistId, p.data));
        }
        catch (e) {
            fail(res, 'step_upsert_failed', e);
        }
    });
    router.delete('/checklist-steps/:stepId', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.stepId)) {
            res.status(400).json({ error: 'invalid_step_id' });
            return;
        }
        try {
            const ok = await m.deleteStep(c.tenantId, req.params.stepId);
            if (!ok) {
                res.status(404).json({ error: 'step_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'step_delete_failed', e);
        }
    });
    // User progress
    router.get('/checklists/:checklistId/progress', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.checklistId)) {
            res.status(400).json({ error: 'invalid_checklist_id' });
            return;
        }
        try {
            res.json({ progress: await m.getProgress(c.tenantId, c.userId, req.params.checklistId) });
        }
        catch (e) {
            fail(res, 'progress_get_failed', e);
        }
    });
    router.put('/checklists/:checklistId/steps/:stepId/status', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.checklistId) || !UUID.test(req.params.stepId)) {
            res.status(400).json({ error: 'invalid_id' });
            return;
        }
        const p = StepStatusSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.setStepStatus(c.tenantId, c.userId, req.params.checklistId, req.params.stepId, p.data.status));
        }
        catch (e) {
            fail(res, 'progress_set_failed', e);
        }
    });
    // Release notes
    router.get('/release-notes', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ notes: await m.listReleaseNotes(c.tenantId, req.query.locale ?? null, parseInt(String(req.query.limit ?? 50), 10)) });
        }
        catch (e) {
            fail(res, 'notes_list_failed', e);
        }
    });
    router.get('/release-notes/:version', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const locale = req.query.locale ?? 'en';
        try {
            const n = await m.getReleaseNote(c.tenantId, req.params.version, locale);
            if (!n) {
                res.status(404).json({ error: 'note_not_found' });
                return;
            }
            res.json(n);
        }
        catch (e) {
            fail(res, 'note_get_failed', e);
        }
    });
    router.put('/release-notes', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = ReleaseNoteSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertReleaseNote(c.tenantId, p.data));
        }
        catch (e) {
            fail(res, 'note_upsert_failed', e);
        }
    });
    router.post('/release-notes/:noteId/read', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.noteId)) {
            res.status(400).json({ error: 'invalid_note_id' });
            return;
        }
        try {
            res.json(await m.markReleaseNoteRead(c.tenantId, c.userId, req.params.noteId));
        }
        catch (e) {
            fail(res, 'note_mark_read_failed', e);
        }
    });
    router.get('/release-notes/unread/list', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const locale = req.query.locale ?? 'en';
        try {
            res.json({ notes: await m.listUnreadReleaseNotes(c.tenantId, c.userId, locale) });
        }
        catch (e) {
            fail(res, 'unread_notes_failed', e);
        }
    });
    return router;
}
//# sourceMappingURL=help-ext.routes.js.map