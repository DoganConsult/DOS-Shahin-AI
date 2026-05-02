import { Router } from 'express';
import { UiOsAccessibilityManager } from '../managers/ui-os-accessibility.manager.js';
import { AccessibilitySchema, ReducedMotionSchema, ContrastSchema, FontScaleSchema, DevicePreferenceSchema, DeviceSessionSchema, ViewportProfileSchema, } from '../schemas/accessibility.schemas.js';
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
    if (m.includes('check constraint')) {
        res.status(400).json({ error: 'check_violation', message: m });
        return;
    }
    res.status(500).json({ error: code, message: m });
}
export function createAccessibilityRouter(pool) {
    const router = Router();
    const m = new UiOsAccessibilityManager(pool);
    const fgaViewer = requireFga({ build: (req) => req.principal?.sub && req.principal?.tenantId
            ? { user: `user:${req.principal.sub}`, relation: 'viewer', object: `ui_os_tenant:${req.principal.tenantId}` } : null });
    const fgaEditor = requireFga({ build: (req) => req.principal?.sub && req.principal?.tenantId
            ? { user: `user:${req.principal.sub}`, relation: 'editor', object: `ui_os_tenant:${req.principal.tenantId}` } : null });
    // a11y composite
    router.get('/accessibility/preferences', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json(await m.getAccessibility(c.tenantId, c.userId) ?? {});
        }
        catch (e) {
            fail(res, 'a11y_get_failed', e);
        }
    });
    router.put('/accessibility/preferences', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = AccessibilitySchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertAccessibility(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'a11y_put_failed', e);
        }
    });
    // reduced motion
    router.get('/accessibility/reduced-motion', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json(await m.getReducedMotion(c.tenantId, c.userId) ?? {});
        }
        catch (e) {
            fail(res, 'reduced_motion_get_failed', e);
        }
    });
    router.put('/accessibility/reduced-motion', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = ReducedMotionSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertReducedMotion(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'reduced_motion_put_failed', e);
        }
    });
    // contrast
    router.get('/accessibility/contrast', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json(await m.getContrast(c.tenantId, c.userId) ?? {});
        }
        catch (e) {
            fail(res, 'contrast_get_failed', e);
        }
    });
    router.put('/accessibility/contrast', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = ContrastSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertContrast(c.tenantId, c.userId, p.data.contrast_mode));
        }
        catch (e) {
            fail(res, 'contrast_put_failed', e);
        }
    });
    // font scale
    router.get('/accessibility/font-scale', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json(await m.getFontScale(c.tenantId, c.userId) ?? {});
        }
        catch (e) {
            fail(res, 'font_scale_get_failed', e);
        }
    });
    router.put('/accessibility/font-scale', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = FontScaleSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertFontScale(c.tenantId, c.userId, p.data.scale_percent));
        }
        catch (e) {
            fail(res, 'font_scale_put_failed', e);
        }
    });
    // device preferences
    router.get('/devices/preferences', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ preferences: await m.listDevicePreferences(c.tenantId, c.userId) });
        }
        catch (e) {
            fail(res, 'device_prefs_list_failed', e);
        }
    });
    router.put('/devices/preferences', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = DevicePreferenceSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertDevicePreference(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'device_pref_upsert_failed', e);
        }
    });
    // device sessions
    router.get('/devices/sessions', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ sessions: await m.listDeviceSessions(c.tenantId, c.userId) });
        }
        catch (e) {
            fail(res, 'device_sessions_list_failed', e);
        }
    });
    router.post('/devices/sessions/touch', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = DeviceSessionSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.touchDeviceSession(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'device_session_touch_failed', e);
        }
    });
    router.delete('/devices/sessions/:sessionId', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.sessionId)) {
            res.status(400).json({ error: 'invalid_session_id' });
            return;
        }
        try {
            const ok = await m.revokeDeviceSession(c.tenantId, c.userId, req.params.sessionId);
            if (!ok) {
                res.status(404).json({ error: 'session_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'device_session_revoke_failed', e);
        }
    });
    // viewport profiles
    router.get('/devices/viewport-profiles', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ profiles: await m.listViewportProfiles(c.tenantId) });
        }
        catch (e) {
            fail(res, 'viewport_profiles_list_failed', e);
        }
    });
    router.put('/devices/viewport-profiles', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = ViewportProfileSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertViewportProfile(c.tenantId, p.data));
        }
        catch (e) {
            fail(res, 'viewport_profile_upsert_failed', e);
        }
    });
    router.delete('/devices/viewport-profiles/:profileId', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.profileId)) {
            res.status(400).json({ error: 'invalid_profile_id' });
            return;
        }
        try {
            const ok = await m.deleteViewportProfile(c.tenantId, req.params.profileId);
            if (!ok) {
                res.status(404).json({ error: 'profile_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'viewport_profile_delete_failed', e);
        }
    });
    return router;
}
//# sourceMappingURL=accessibility.routes.js.map