import { Router } from 'express';
import { UiOsThemeExtManager } from '../managers/ui-os-theme-ext.manager.js';
import { ThemeProfileSchema, ThemeTokenSchema, ThemeAssignmentSchema, BrandAssetSchema, LoginBrandingSchema, EmailBrandingSchema, ReportBrandingSchema, PrintTemplateSchema, } from '../schemas/theme-ext.schemas.js';
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
export function createThemeExtRouter(pool) {
    const router = Router();
    const m = new UiOsThemeExtManager(pool);
    const fgaViewer = requireFga({ build: (req) => req.principal?.sub && req.principal?.tenantId
            ? { user: `user:${req.principal.sub}`, relation: 'viewer', object: `ui_os_tenant:${req.principal.tenantId}` } : null });
    const fgaEditor = requireFga({ build: (req) => req.principal?.sub && req.principal?.tenantId
            ? { user: `user:${req.principal.sub}`, relation: 'editor', object: `ui_os_tenant:${req.principal.tenantId}` } : null });
    // Theme profiles
    router.get('/theme/profiles', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ profiles: await m.listProfiles(c.tenantId) });
        }
        catch (e) {
            fail(res, 'profiles_list_failed', e);
        }
    });
    router.put('/theme/profiles', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = ThemeProfileSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertProfile(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'profile_upsert_failed', e);
        }
    });
    router.delete('/theme/profiles/:profileId', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.profileId)) {
            res.status(400).json({ error: 'invalid_profile_id' });
            return;
        }
        try {
            const ok = await m.deleteProfile(c.tenantId, req.params.profileId);
            if (!ok) {
                res.status(404).json({ error: 'profile_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'profile_delete_failed', e);
        }
    });
    // Theme tokens
    router.get('/theme/profiles/:profileId/tokens', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.profileId)) {
            res.status(400).json({ error: 'invalid_profile_id' });
            return;
        }
        try {
            res.json({ tokens: await m.listTokens(c.tenantId, req.params.profileId) });
        }
        catch (e) {
            fail(res, 'tokens_list_failed', e);
        }
    });
    router.put('/theme/profiles/:profileId/tokens', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.profileId)) {
            res.status(400).json({ error: 'invalid_profile_id' });
            return;
        }
        const p = ThemeTokenSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertToken(c.tenantId, req.params.profileId, p.data));
        }
        catch (e) {
            fail(res, 'token_upsert_failed', e);
        }
    });
    router.delete('/theme/tokens/:tokenId', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.tokenId)) {
            res.status(400).json({ error: 'invalid_token_id' });
            return;
        }
        try {
            const ok = await m.deleteToken(c.tenantId, req.params.tokenId);
            if (!ok) {
                res.status(404).json({ error: 'token_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'token_delete_failed', e);
        }
    });
    // Theme assignments
    router.get('/theme/assignments', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ assignments: await m.listAssignments(c.tenantId, req.query.targetKind ?? null) });
        }
        catch (e) {
            fail(res, 'assignments_list_failed', e);
        }
    });
    router.put('/theme/assignments', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = ThemeAssignmentSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertAssignment(c.tenantId, p.data));
        }
        catch (e) {
            fail(res, 'assignment_upsert_failed', e);
        }
    });
    router.delete('/theme/assignments/:assignmentId', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.assignmentId)) {
            res.status(400).json({ error: 'invalid_assignment_id' });
            return;
        }
        try {
            const ok = await m.deleteAssignment(c.tenantId, req.params.assignmentId);
            if (!ok) {
                res.status(404).json({ error: 'assignment_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'assignment_delete_failed', e);
        }
    });
    // Brand assets
    router.get('/branding/assets', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ assets: await m.listAssets(c.tenantId, req.query.kind ?? null) });
        }
        catch (e) {
            fail(res, 'assets_list_failed', e);
        }
    });
    router.put('/branding/assets', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = BrandAssetSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertAsset(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'asset_upsert_failed', e);
        }
    });
    router.delete('/branding/assets/:assetId', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.assetId)) {
            res.status(400).json({ error: 'invalid_asset_id' });
            return;
        }
        try {
            const ok = await m.deleteAsset(c.tenantId, req.params.assetId);
            if (!ok) {
                res.status(404).json({ error: 'asset_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'asset_delete_failed', e);
        }
    });
    // Login branding
    router.get('/branding/login', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json(await m.getLoginBranding(c.tenantId) ?? {});
        }
        catch (e) {
            fail(res, 'login_branding_get_failed', e);
        }
    });
    router.put('/branding/login', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = LoginBrandingSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertLoginBranding(c.tenantId, p.data));
        }
        catch (e) {
            fail(res, 'login_branding_put_failed', e);
        }
    });
    // Email branding
    router.get('/branding/email', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json(await m.getEmailBranding(c.tenantId) ?? {});
        }
        catch (e) {
            fail(res, 'email_branding_get_failed', e);
        }
    });
    router.put('/branding/email', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = EmailBrandingSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertEmailBranding(c.tenantId, p.data));
        }
        catch (e) {
            fail(res, 'email_branding_put_failed', e);
        }
    });
    // Report branding
    router.get('/branding/report', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json(await m.getReportBranding(c.tenantId) ?? {});
        }
        catch (e) {
            fail(res, 'report_branding_get_failed', e);
        }
    });
    router.put('/branding/report', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = ReportBrandingSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertReportBranding(c.tenantId, p.data));
        }
        catch (e) {
            fail(res, 'report_branding_put_failed', e);
        }
    });
    // Print templates
    router.get('/print-templates', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ templates: await m.listPrintTemplates(c.tenantId) });
        }
        catch (e) {
            fail(res, 'print_templates_list_failed', e);
        }
    });
    router.get('/print-templates/:templateId', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.templateId)) {
            res.status(400).json({ error: 'invalid_template_id' });
            return;
        }
        try {
            const t = await m.getPrintTemplate(c.tenantId, req.params.templateId);
            if (!t) {
                res.status(404).json({ error: 'template_not_found' });
                return;
            }
            res.json(t);
        }
        catch (e) {
            fail(res, 'print_template_get_failed', e);
        }
    });
    router.put('/print-templates', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = PrintTemplateSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertPrintTemplate(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'print_template_upsert_failed', e);
        }
    });
    router.delete('/print-templates/:templateId', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.templateId)) {
            res.status(400).json({ error: 'invalid_template_id' });
            return;
        }
        try {
            const ok = await m.deletePrintTemplate(c.tenantId, req.params.templateId);
            if (!ok) {
                res.status(404).json({ error: 'template_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'print_template_delete_failed', e);
        }
    });
    return router;
}
//# sourceMappingURL=theme-ext.routes.js.map