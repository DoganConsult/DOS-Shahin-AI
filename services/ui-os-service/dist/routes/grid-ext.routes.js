import { Router } from 'express';
import { UiOsGridExtManager } from '../managers/ui-os-grid-ext.manager.js';
import { GridColumnSchema, GridColumnPermissionSchema, GridSavedViewSchema, GridExportSchema, GridBulkJobSchema, GridInlineEditSessionSchema, GridValidationErrorSchema, } from '../schemas/grid-ext.schemas.js';
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
    res.status(500).json({ error: code, message: m });
}
export function createGridExtRouter(pool) {
    const router = Router();
    const m = new UiOsGridExtManager(pool);
    const fgaViewer = requireFga({ build: (req) => req.principal?.sub && req.principal?.tenantId
            ? { user: `user:${req.principal.sub}`, relation: 'viewer', object: `ui_os_tenant:${req.principal.tenantId}` } : null });
    const fgaEditor = requireFga({ build: (req) => req.principal?.sub && req.principal?.tenantId
            ? { user: `user:${req.principal.sub}`, relation: 'editor', object: `ui_os_tenant:${req.principal.tenantId}` } : null });
    // columns
    router.get('/grids/:gridKey/columns', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ columns: await m.listColumns(c.tenantId, req.params.gridKey) });
        }
        catch (e) {
            fail(res, 'columns_list_failed', e);
        }
    });
    router.put('/grids/columns', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = GridColumnSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertColumn(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'column_upsert_failed', e);
        }
    });
    router.delete('/grids/columns/:columnId', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.columnId)) {
            res.status(400).json({ error: 'invalid_column_id' });
            return;
        }
        try {
            const ok = await m.deleteColumn(c.tenantId, req.params.columnId);
            if (!ok) {
                res.status(404).json({ error: 'column_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'column_delete_failed', e);
        }
    });
    // column permissions
    router.get('/grids/columns/:columnId/permissions', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.columnId)) {
            res.status(400).json({ error: 'invalid_column_id' });
            return;
        }
        try {
            res.json({ permissions: await m.listColumnPermissions(c.tenantId, req.params.columnId) });
        }
        catch (e) {
            fail(res, 'col_perm_list_failed', e);
        }
    });
    router.put('/grids/columns/:columnId/permissions', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.columnId)) {
            res.status(400).json({ error: 'invalid_column_id' });
            return;
        }
        const p = GridColumnPermissionSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertColumnPermission(c.tenantId, c.userId, req.params.columnId, p.data));
        }
        catch (e) {
            fail(res, 'col_perm_upsert_failed', e);
        }
    });
    router.delete('/grids/column-permissions/:permissionId', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.permissionId)) {
            res.status(400).json({ error: 'invalid_permission_id' });
            return;
        }
        try {
            const ok = await m.deleteColumnPermission(c.tenantId, req.params.permissionId);
            if (!ok) {
                res.status(404).json({ error: 'permission_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'col_perm_delete_failed', e);
        }
    });
    // saved views (grid-scoped)
    router.get('/grids/:gridKey/saved-views', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ views: await m.listSavedViews(c.tenantId, req.params.gridKey, c.userId) });
        }
        catch (e) {
            fail(res, 'views_list_failed', e);
        }
    });
    router.put('/grids/saved-views', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = GridSavedViewSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertSavedView(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'view_upsert_failed', e);
        }
    });
    router.delete('/grids/saved-views/:viewId', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.viewId)) {
            res.status(400).json({ error: 'invalid_view_id' });
            return;
        }
        try {
            const ok = await m.deleteSavedView(c.tenantId, req.params.viewId);
            if (!ok) {
                res.status(404).json({ error: 'view_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'view_delete_failed', e);
        }
    });
    // exports
    router.get('/grids/exports', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ exports: await m.listExports(c.tenantId, c.userId) });
        }
        catch (e) {
            fail(res, 'exports_list_failed', e);
        }
    });
    router.post('/grids/exports', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = GridExportSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.createExport(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'export_create_failed', e);
        }
    });
    // bulk jobs
    router.get('/grids/bulk-jobs', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ jobs: await m.listBulkJobs(c.tenantId, c.userId) });
        }
        catch (e) {
            fail(res, 'jobs_list_failed', e);
        }
    });
    router.post('/grids/bulk-jobs', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = GridBulkJobSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.createBulkJob(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'job_create_failed', e);
        }
    });
    // inline edit sessions
    router.get('/grids/inline-edit/:sessionKey', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json(await m.getInlineEditSession(c.tenantId, req.params.sessionKey) ?? null);
        }
        catch (e) {
            fail(res, 'session_get_failed', e);
        }
    });
    router.put('/grids/inline-edit', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = GridInlineEditSessionSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertInlineEditSession(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'session_upsert_failed', e);
        }
    });
    // validation errors
    router.get('/grids/inline-edit/:sessionId/validation-errors', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.sessionId)) {
            res.status(400).json({ error: 'invalid_session_id' });
            return;
        }
        try {
            res.json({ errors: await m.listValidationErrors(c.tenantId, req.params.sessionId) });
        }
        catch (e) {
            fail(res, 'errors_list_failed', e);
        }
    });
    router.put('/grids/inline-edit/:sessionId/validation-errors', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.sessionId)) {
            res.status(400).json({ error: 'invalid_session_id' });
            return;
        }
        const p = GridValidationErrorSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertValidationError(c.tenantId, req.params.sessionId, p.data));
        }
        catch (e) {
            fail(res, 'error_upsert_failed', e);
        }
    });
    return router;
}
//# sourceMappingURL=grid-ext.routes.js.map