import { Router } from 'express';
import { UiOsWebOsManager } from '../managers/ui-os-webos.manager.js';
import { StartSessionSchema, WindowStateSchema, PanelStateSchema, TabStateSchema, SplitViewSchema, DragDropSchema, ClipboardItemSchema, RestorePointSchema, } from '../schemas/webos.schemas.js';
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
    if (m.includes('check constraint')) {
        res.status(400).json({ error: 'check_violation', message: m });
        return;
    }
    res.status(500).json({ error: code, message: m });
}
export function createWebOsRouter(pool) {
    const router = Router();
    const m = new UiOsWebOsManager(pool);
    const fgaViewer = requireFga({ build: (req) => req.principal?.sub && req.principal?.tenantId
            ? { user: `user:${req.principal.sub}`, relation: 'viewer', object: `ui_os_tenant:${req.principal.tenantId}` } : null });
    // Sessions
    router.get('/webos/sessions', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ sessions: await m.listSessions(c.tenantId, c.userId, req.query.includeEnded === 'true') });
        }
        catch (e) {
            fail(res, 'sessions_list_failed', e);
        }
    });
    router.post('/webos/sessions', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = StartSessionSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.startSession(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'session_start_failed', e);
        }
    });
    router.post('/webos/sessions/:sessionId/touch', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.sessionId)) {
            res.status(400).json({ error: 'invalid_session_id' });
            return;
        }
        try {
            const r = await m.touchSession(c.tenantId, c.userId, req.params.sessionId);
            if (!r) {
                res.status(404).json({ error: 'session_not_found' });
                return;
            }
            res.json(r);
        }
        catch (e) {
            fail(res, 'session_touch_failed', e);
        }
    });
    router.post('/webos/sessions/:sessionId/end', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.sessionId)) {
            res.status(400).json({ error: 'invalid_session_id' });
            return;
        }
        try {
            const ok = await m.endSession(c.tenantId, c.userId, req.params.sessionId);
            if (!ok) {
                res.status(404).json({ error: 'session_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'session_end_failed', e);
        }
    });
    // Windows
    router.get('/webos/sessions/:sessionId/windows', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.sessionId)) {
            res.status(400).json({ error: 'invalid_session_id' });
            return;
        }
        try {
            res.json({ windows: await m.listWindows(c.tenantId, req.params.sessionId) });
        }
        catch (e) {
            fail(res, 'windows_list_failed', e);
        }
    });
    router.put('/webos/sessions/:sessionId/windows', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.sessionId)) {
            res.status(400).json({ error: 'invalid_session_id' });
            return;
        }
        const p = WindowStateSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertWindow(c.tenantId, req.params.sessionId, p.data));
        }
        catch (e) {
            fail(res, 'window_upsert_failed', e);
        }
    });
    router.delete('/webos/windows/:windowId', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.windowId)) {
            res.status(400).json({ error: 'invalid_window_id' });
            return;
        }
        try {
            const ok = await m.deleteWindow(c.tenantId, req.params.windowId);
            if (!ok) {
                res.status(404).json({ error: 'window_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'window_delete_failed', e);
        }
    });
    // Panels
    router.get('/webos/sessions/:sessionId/panels', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.sessionId)) {
            res.status(400).json({ error: 'invalid_session_id' });
            return;
        }
        try {
            res.json({ panels: await m.listPanels(c.tenantId, req.params.sessionId) });
        }
        catch (e) {
            fail(res, 'panels_list_failed', e);
        }
    });
    router.put('/webos/sessions/:sessionId/panels', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.sessionId)) {
            res.status(400).json({ error: 'invalid_session_id' });
            return;
        }
        const p = PanelStateSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertPanel(c.tenantId, req.params.sessionId, p.data));
        }
        catch (e) {
            fail(res, 'panel_upsert_failed', e);
        }
    });
    // Tabs
    router.get('/webos/windows/:windowId/tabs', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.windowId)) {
            res.status(400).json({ error: 'invalid_window_id' });
            return;
        }
        try {
            res.json({ tabs: await m.listTabs(c.tenantId, req.params.windowId) });
        }
        catch (e) {
            fail(res, 'tabs_list_failed', e);
        }
    });
    router.put('/webos/windows/:windowId/tabs', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.windowId)) {
            res.status(400).json({ error: 'invalid_window_id' });
            return;
        }
        const p = TabStateSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertTab(c.tenantId, req.params.windowId, p.data));
        }
        catch (e) {
            fail(res, 'tab_upsert_failed', e);
        }
    });
    router.delete('/webos/tabs/:tabId', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.tabId)) {
            res.status(400).json({ error: 'invalid_tab_id' });
            return;
        }
        try {
            const ok = await m.deleteTab(c.tenantId, req.params.tabId);
            if (!ok) {
                res.status(404).json({ error: 'tab_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'tab_delete_failed', e);
        }
    });
    // Splits
    router.get('/webos/windows/:windowId/splits', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.windowId)) {
            res.status(400).json({ error: 'invalid_window_id' });
            return;
        }
        try {
            res.json({ splits: await m.listSplits(c.tenantId, req.params.windowId) });
        }
        catch (e) {
            fail(res, 'splits_list_failed', e);
        }
    });
    router.post('/webos/windows/:windowId/splits', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.windowId)) {
            res.status(400).json({ error: 'invalid_window_id' });
            return;
        }
        const p = SplitViewSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.upsertSplit(c.tenantId, req.params.windowId, p.data));
        }
        catch (e) {
            fail(res, 'split_upsert_failed', e);
        }
    });
    router.delete('/webos/splits/:splitId', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.splitId)) {
            res.status(400).json({ error: 'invalid_split_id' });
            return;
        }
        try {
            const ok = await m.deleteSplit(c.tenantId, req.params.splitId);
            if (!ok) {
                res.status(404).json({ error: 'split_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'split_delete_failed', e);
        }
    });
    // Drag/drop audit
    router.post('/webos/drag-drop', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = DragDropSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.recordDragDrop(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'drag_drop_record_failed', e);
        }
    });
    router.get('/webos/drag-drop', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ events: await m.listDragDrop(c.tenantId, c.userId, parseInt(String(req.query.limit ?? 100), 10)) });
        }
        catch (e) {
            fail(res, 'drag_drop_list_failed', e);
        }
    });
    // Clipboard
    router.get('/webos/clipboard', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ items: await m.listClipboard(c.tenantId, c.userId, parseInt(String(req.query.limit ?? 50), 10)) });
        }
        catch (e) {
            fail(res, 'clipboard_list_failed', e);
        }
    });
    router.post('/webos/clipboard', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = ClipboardItemSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.pushClipboard(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'clipboard_push_failed', e);
        }
    });
    router.delete('/webos/clipboard', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ deleted: await m.clearClipboard(c.tenantId, c.userId) });
        }
        catch (e) {
            fail(res, 'clipboard_clear_failed', e);
        }
    });
    // Restore points
    router.get('/webos/restore-points', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ points: await m.listRestorePoints(c.tenantId, c.userId, parseInt(String(req.query.limit ?? 50), 10)) });
        }
        catch (e) {
            fail(res, 'restore_points_list_failed', e);
        }
    });
    router.post('/webos/restore-points', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = RestorePointSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.createRestorePoint(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'restore_point_create_failed', e);
        }
    });
    router.get('/webos/restore-points/:pointId', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.pointId)) {
            res.status(400).json({ error: 'invalid_point_id' });
            return;
        }
        try {
            const r = await m.getRestorePoint(c.tenantId, c.userId, req.params.pointId);
            if (!r) {
                res.status(404).json({ error: 'point_not_found' });
                return;
            }
            res.json(r);
        }
        catch (e) {
            fail(res, 'restore_point_get_failed', e);
        }
    });
    router.delete('/webos/restore-points/:pointId', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.pointId)) {
            res.status(400).json({ error: 'invalid_point_id' });
            return;
        }
        try {
            const ok = await m.deleteRestorePoint(c.tenantId, c.userId, req.params.pointId);
            if (!ok) {
                res.status(404).json({ error: 'point_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'restore_point_delete_failed', e);
        }
    });
    return router;
}
//# sourceMappingURL=webos.routes.js.map