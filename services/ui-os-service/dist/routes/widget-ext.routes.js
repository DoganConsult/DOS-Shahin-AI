import { Router } from 'express';
import { UiOsWidgetExtManager } from '../managers/ui-os-widget-ext.manager.js';
import { WidgetExtInstanceCreateSchema, WidgetExtInstancePatchSchema, WidgetExtPermissionSchema, WidgetExtRoleGrantSchema, WidgetExtBindingSchema, WidgetExtRefreshPolicySchema, WidgetExtErrorStateSchema, WidgetExtVisibilityRuleSchema, WidgetExtPersonalizationSchema, WidgetExtCategorySchema, } from '../schemas/widget-ext.schemas.js';
import { requireFga } from '../middleware/openfga.js';
const UUID = /^[0-9a-fA-F-]{36}$/;
function context(req, res) {
    const tenantId = (req.header('x-dos-tenant-id') ?? req.query.tenantId);
    const userId = (req.header('x-dos-user-id') ?? req.query.userId);
    if (!tenantId || !userId) {
        res.status(400).json({ error: 'missing_identity' });
        return null;
    }
    return { tenantId, userId };
}
function fail(res, code, err, status = 500) {
    const msg = err.message;
    if (msg.includes('duplicate key')) {
        res.status(409).json({ error: 'conflict' });
        return;
    }
    res.status(status).json({ error: code, message: msg });
}
export function createWidgetExtRouter(pool) {
    const router = Router();
    const m = new UiOsWidgetExtManager(pool);
    // Wave 10b — OpenFGA gate: viewer for read, editor for write.
    const fgaViewer = requireFga({
        build: (req) => req.principal?.sub && req.principal?.tenantId
            ? { user: `user:${req.principal.sub}`, relation: 'viewer', object: `ui_os_tenant:${req.principal.tenantId}` }
            : null,
    });
    const fgaEditor = requireFga({
        build: (req) => req.principal?.sub && req.principal?.tenantId
            ? { user: `user:${req.principal.sub}`, relation: 'editor', object: `ui_os_tenant:${req.principal.tenantId}` }
            : null,
    });
    // ── Instances ───────────────────────────────────────────────
    router.get('/widgets/instances-ext', fgaViewer, async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        try {
            const items = await m.listInstances(ctx.tenantId, {
                dashboardId: req.query.dashboardId ?? null,
                pageLayoutId: req.query.pageLayoutId ?? null,
            });
            res.json({ instances: items });
        }
        catch (e) {
            fail(res, 'instances_list_failed', e);
        }
    });
    router.get('/widgets/instances-ext/:instanceKey', fgaViewer, async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        try {
            const inst = await m.getInstance(ctx.tenantId, req.params.instanceKey);
            if (!inst) {
                res.status(404).json({ error: 'instance_not_found' });
                return;
            }
            res.json(inst);
        }
        catch (e) {
            fail(res, 'instance_get_failed', e);
        }
    });
    router.post('/widgets/instances-ext', fgaEditor, async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        const parsed = WidgetExtInstanceCreateSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.createInstance(ctx.tenantId, ctx.userId, parsed.data));
        }
        catch (e) {
            fail(res, 'instance_create_failed', e);
        }
    });
    router.put('/widgets/instances-ext/:instanceKey', fgaEditor, async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        const parsed = WidgetExtInstancePatchSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
            return;
        }
        try {
            const inst = await m.updateInstance(ctx.tenantId, req.params.instanceKey, ctx.userId, parsed.data);
            if (!inst) {
                res.status(404).json({ error: 'instance_not_found' });
                return;
            }
            res.json(inst);
        }
        catch (e) {
            fail(res, 'instance_update_failed', e);
        }
    });
    router.delete('/widgets/instances-ext/:instanceKey', fgaEditor, async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        try {
            const ok = await m.deleteInstance(ctx.tenantId, req.params.instanceKey);
            if (!ok) {
                res.status(404).json({ error: 'instance_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'instance_delete_failed', e);
        }
    });
    // ── Permissions ─────────────────────────────────────────────
    router.get('/widgets/instances-ext/:instanceId/permissions', fgaViewer, async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        if (!UUID.test(req.params.instanceId)) {
            res.status(400).json({ error: 'invalid_instance_id' });
            return;
        }
        try {
            res.json({ permissions: await m.listPermissions(ctx.tenantId, req.params.instanceId) });
        }
        catch (e) {
            fail(res, 'permissions_list_failed', e);
        }
    });
    router.post('/widgets/instances-ext/:instanceId/permissions', fgaEditor, async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        if (!UUID.test(req.params.instanceId)) {
            res.status(400).json({ error: 'invalid_instance_id' });
            return;
        }
        const parsed = WidgetExtPermissionSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.upsertPermission(ctx.tenantId, ctx.userId, req.params.instanceId, parsed.data));
        }
        catch (e) {
            fail(res, 'permission_upsert_failed', e);
        }
    });
    router.delete('/widgets/instances-ext/:instanceId/permissions/:permissionId', fgaEditor, async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        if (!UUID.test(req.params.permissionId)) {
            res.status(400).json({ error: 'invalid_permission_id' });
            return;
        }
        try {
            const ok = await m.deletePermission(ctx.tenantId, req.params.permissionId);
            if (!ok) {
                res.status(404).json({ error: 'permission_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'permission_delete_failed', e);
        }
    });
    // ── Role grants ─────────────────────────────────────────────
    router.get('/widgets/instances-ext/:instanceId/roles', fgaViewer, async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        if (!UUID.test(req.params.instanceId)) {
            res.status(400).json({ error: 'invalid_instance_id' });
            return;
        }
        try {
            res.json({ roles: await m.listRoleGrants(ctx.tenantId, req.params.instanceId) });
        }
        catch (e) {
            fail(res, 'roles_list_failed', e);
        }
    });
    router.post('/widgets/instances-ext/:instanceId/roles', fgaEditor, async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        if (!UUID.test(req.params.instanceId)) {
            res.status(400).json({ error: 'invalid_instance_id' });
            return;
        }
        const parsed = WidgetExtRoleGrantSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.grantRole(ctx.tenantId, ctx.userId, req.params.instanceId, parsed.data.role_code));
        }
        catch (e) {
            fail(res, 'role_grant_failed', e);
        }
    });
    router.delete('/widgets/instances-ext/:instanceId/roles/:roleCode', fgaEditor, async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        if (!UUID.test(req.params.instanceId)) {
            res.status(400).json({ error: 'invalid_instance_id' });
            return;
        }
        try {
            const ok = await m.revokeRole(ctx.tenantId, req.params.instanceId, req.params.roleCode);
            if (!ok) {
                res.status(404).json({ error: 'role_grant_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'role_revoke_failed', e);
        }
    });
    // ── Data binding ────────────────────────────────────────────
    router.get('/widgets/instances-ext/:instanceId/binding', fgaViewer, async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        if (!UUID.test(req.params.instanceId)) {
            res.status(400).json({ error: 'invalid_instance_id' });
            return;
        }
        try {
            res.json(await m.getBinding(ctx.tenantId, req.params.instanceId) ?? null);
        }
        catch (e) {
            fail(res, 'binding_get_failed', e);
        }
    });
    router.put('/widgets/instances-ext/:instanceId/binding', fgaEditor, async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        if (!UUID.test(req.params.instanceId)) {
            res.status(400).json({ error: 'invalid_instance_id' });
            return;
        }
        const parsed = WidgetExtBindingSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertBinding(ctx.tenantId, ctx.userId, req.params.instanceId, parsed.data));
        }
        catch (e) {
            fail(res, 'binding_upsert_failed', e);
        }
    });
    // ── Refresh policy ──────────────────────────────────────────
    router.get('/widgets/instances-ext/:instanceId/refresh', fgaViewer, async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        if (!UUID.test(req.params.instanceId)) {
            res.status(400).json({ error: 'invalid_instance_id' });
            return;
        }
        try {
            res.json(await m.getRefreshPolicy(ctx.tenantId, req.params.instanceId) ?? null);
        }
        catch (e) {
            fail(res, 'refresh_get_failed', e);
        }
    });
    router.put('/widgets/instances-ext/:instanceId/refresh', fgaEditor, async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        if (!UUID.test(req.params.instanceId)) {
            res.status(400).json({ error: 'invalid_instance_id' });
            return;
        }
        const parsed = WidgetExtRefreshPolicySchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertRefreshPolicy(ctx.tenantId, ctx.userId, req.params.instanceId, parsed.data));
        }
        catch (e) {
            fail(res, 'refresh_upsert_failed', e);
        }
    });
    // ── Error states ────────────────────────────────────────────
    router.get('/widgets/instances-ext/:instanceId/errors', fgaViewer, async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        if (!UUID.test(req.params.instanceId)) {
            res.status(400).json({ error: 'invalid_instance_id' });
            return;
        }
        try {
            res.json({ errors: await m.listErrorStates(ctx.tenantId, req.params.instanceId) });
        }
        catch (e) {
            fail(res, 'errors_list_failed', e);
        }
    });
    router.put('/widgets/instances-ext/:instanceId/errors', fgaEditor, async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        if (!UUID.test(req.params.instanceId)) {
            res.status(400).json({ error: 'invalid_instance_id' });
            return;
        }
        const parsed = WidgetExtErrorStateSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertErrorState(ctx.tenantId, ctx.userId, req.params.instanceId, parsed.data));
        }
        catch (e) {
            fail(res, 'error_state_upsert_failed', e);
        }
    });
    // ── Visibility rules ────────────────────────────────────────
    router.get('/widgets/instances-ext/:instanceId/visibility', fgaViewer, async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        if (!UUID.test(req.params.instanceId)) {
            res.status(400).json({ error: 'invalid_instance_id' });
            return;
        }
        try {
            res.json({ rules: await m.listVisibilityRules(ctx.tenantId, req.params.instanceId) });
        }
        catch (e) {
            fail(res, 'visibility_list_failed', e);
        }
    });
    router.post('/widgets/instances-ext/:instanceId/visibility', fgaEditor, async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        if (!UUID.test(req.params.instanceId)) {
            res.status(400).json({ error: 'invalid_instance_id' });
            return;
        }
        const parsed = WidgetExtVisibilityRuleSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.createVisibilityRule(ctx.tenantId, ctx.userId, req.params.instanceId, parsed.data));
        }
        catch (e) {
            fail(res, 'visibility_create_failed', e);
        }
    });
    router.delete('/widgets/instances-ext/:instanceId/visibility/:ruleId', fgaEditor, async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        if (!UUID.test(req.params.ruleId)) {
            res.status(400).json({ error: 'invalid_rule_id' });
            return;
        }
        try {
            const ok = await m.deleteVisibilityRule(ctx.tenantId, req.params.ruleId);
            if (!ok) {
                res.status(404).json({ error: 'rule_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'visibility_delete_failed', e);
        }
    });
    // ── Personalization (per-user) ──────────────────────────────
    router.get('/widgets/instances-ext/:instanceId/personalization', fgaViewer, async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        if (!UUID.test(req.params.instanceId)) {
            res.status(400).json({ error: 'invalid_instance_id' });
            return;
        }
        try {
            res.json(await m.getPersonalization(ctx.tenantId, req.params.instanceId, ctx.userId) ?? null);
        }
        catch (e) {
            fail(res, 'personalization_get_failed', e);
        }
    });
    router.put('/widgets/instances-ext/:instanceId/personalization', fgaViewer, async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        if (!UUID.test(req.params.instanceId)) {
            res.status(400).json({ error: 'invalid_instance_id' });
            return;
        }
        const parsed = WidgetExtPersonalizationSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertPersonalization(ctx.tenantId, ctx.userId, req.params.instanceId, parsed.data));
        }
        catch (e) {
            fail(res, 'personalization_upsert_failed', e);
        }
    });
    // ── Catalog categories ──────────────────────────────────────
    router.get('/widgets/categories', fgaViewer, async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        try {
            res.json({ categories: await m.listCategories(ctx.tenantId) });
        }
        catch (e) {
            fail(res, 'categories_list_failed', e);
        }
    });
    router.put('/widgets/categories', fgaEditor, async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        const parsed = WidgetExtCategorySchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertCategory(ctx.tenantId, ctx.userId, parsed.data));
        }
        catch (e) {
            fail(res, 'category_upsert_failed', e);
        }
    });
    router.delete('/widgets/categories/:categoryCode', fgaEditor, async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        try {
            const ok = await m.deleteCategory(ctx.tenantId, req.params.categoryCode);
            if (!ok) {
                res.status(404).json({ error: 'category_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'category_delete_failed', e);
        }
    });
    return router;
}
//# sourceMappingURL=widget-ext.routes.js.map