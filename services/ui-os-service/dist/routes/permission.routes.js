import { Router } from 'express';
import { UiOsPermissionManager } from '../managers/ui-os-permission.manager.js';
import { VisibilityRuleSchema, VisibilityRuleUpdateSchema, PermissionBindingSchema, PolicyEvaluationSchema, DeniedRenderSchema, RoleLayoutAssignmentSchema, RoleDashboardAssignmentSchema, RoleNavigationAssignmentSchema, } from '../schemas/permission.schemas.js';
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
export function createPermissionRouter(pool) {
    const router = Router();
    const m = new UiOsPermissionManager(pool);
    const fgaViewer = requireFga({ build: (req) => req.principal?.sub && req.principal?.tenantId
            ? { user: `user:${req.principal.sub}`, relation: 'viewer', object: `ui_os_tenant:${req.principal.tenantId}` } : null });
    const fgaAdmin = requireFga({ build: (req) => req.principal?.sub && req.principal?.tenantId
            ? { user: `user:${req.principal.sub}`, relation: 'admin', object: `ui_os_tenant:${req.principal.tenantId}` } : null });
    // Visibility rules
    router.get('/visibility-rules', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ rules: await m.listVisibilityRules(c.tenantId, {
                    targetKind: req.query.targetKind ?? null,
                    targetId: req.query.targetId ?? null,
                }) });
        }
        catch (e) {
            fail(res, 'visibility_rules_list_failed', e);
        }
    });
    router.post('/visibility-rules', fgaAdmin, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = VisibilityRuleSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.createVisibilityRule(c.tenantId, p.data));
        }
        catch (e) {
            fail(res, 'visibility_rule_create_failed', e);
        }
    });
    router.put('/visibility-rules/:ruleId', fgaAdmin, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.ruleId)) {
            res.status(400).json({ error: 'invalid_rule_id' });
            return;
        }
        const p = VisibilityRuleUpdateSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            const r = await m.updateVisibilityRule(c.tenantId, req.params.ruleId, p.data);
            if (!r) {
                res.status(404).json({ error: 'rule_not_found' });
                return;
            }
            res.json(r);
        }
        catch (e) {
            fail(res, 'visibility_rule_update_failed', e);
        }
    });
    router.delete('/visibility-rules/:ruleId', fgaAdmin, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.ruleId)) {
            res.status(400).json({ error: 'invalid_rule_id' });
            return;
        }
        try {
            const ok = await m.deleteVisibilityRule(c.tenantId, req.params.ruleId);
            if (!ok) {
                res.status(404).json({ error: 'rule_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'visibility_rule_delete_failed', e);
        }
    });
    // Permission bindings
    router.get('/permission-bindings', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ bindings: await m.listPermissionBindings(c.tenantId, {
                    targetKind: req.query.targetKind ?? null,
                    targetId: req.query.targetId ?? null,
                }) });
        }
        catch (e) {
            fail(res, 'permission_bindings_list_failed', e);
        }
    });
    router.put('/permission-bindings', fgaAdmin, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = PermissionBindingSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertPermissionBinding(c.tenantId, p.data));
        }
        catch (e) {
            fail(res, 'permission_binding_upsert_failed', e);
        }
    });
    router.delete('/permission-bindings/:bindingId', fgaAdmin, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.bindingId)) {
            res.status(400).json({ error: 'invalid_binding_id' });
            return;
        }
        try {
            const ok = await m.deletePermissionBinding(c.tenantId, req.params.bindingId);
            if (!ok) {
                res.status(404).json({ error: 'binding_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'permission_binding_delete_failed', e);
        }
    });
    // Policy evaluation log
    router.post('/policy-evaluations', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = PolicyEvaluationSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.logPolicyEvaluation(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'policy_eval_log_failed', e);
        }
    });
    router.get('/policy-evaluations', fgaAdmin, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ events: await m.listPolicyEvaluations(c.tenantId, {
                    userId: req.query.userId ?? null,
                    targetKind: req.query.targetKind ?? null,
                    targetId: req.query.targetId ?? null,
                    limit: parseInt(String(req.query.limit ?? 200), 10),
                }) });
        }
        catch (e) {
            fail(res, 'policy_eval_list_failed', e);
        }
    });
    // Denied render log
    router.post('/denied-renders', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = DeniedRenderSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.logDeniedRender(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'denied_render_log_failed', e);
        }
    });
    router.get('/denied-renders', fgaAdmin, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ events: await m.listDeniedRenders(c.tenantId, {
                    userId: req.query.userId ?? null,
                    limit: parseInt(String(req.query.limit ?? 200), 10),
                }) });
        }
        catch (e) {
            fail(res, 'denied_render_list_failed', e);
        }
    });
    // Role → layout
    router.get('/role-assignments/layouts', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ assignments: await m.listRoleLayoutAssignments(c.tenantId, req.query.roleCode ?? null) });
        }
        catch (e) {
            fail(res, 'role_layout_list_failed', e);
        }
    });
    router.put('/role-assignments/layouts', fgaAdmin, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = RoleLayoutAssignmentSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertRoleLayoutAssignment(c.tenantId, p.data));
        }
        catch (e) {
            fail(res, 'role_layout_upsert_failed', e);
        }
    });
    router.delete('/role-assignments/layouts/:assignmentId', fgaAdmin, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.assignmentId)) {
            res.status(400).json({ error: 'invalid_assignment_id' });
            return;
        }
        try {
            const ok = await m.deleteRoleLayoutAssignment(c.tenantId, req.params.assignmentId);
            if (!ok) {
                res.status(404).json({ error: 'assignment_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'role_layout_delete_failed', e);
        }
    });
    // Role → dashboard
    router.get('/role-assignments/dashboards', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ assignments: await m.listRoleDashboardAssignments(c.tenantId, req.query.roleCode ?? null) });
        }
        catch (e) {
            fail(res, 'role_dashboard_list_failed', e);
        }
    });
    router.put('/role-assignments/dashboards', fgaAdmin, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = RoleDashboardAssignmentSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertRoleDashboardAssignment(c.tenantId, p.data));
        }
        catch (e) {
            fail(res, 'role_dashboard_upsert_failed', e);
        }
    });
    router.delete('/role-assignments/dashboards/:assignmentId', fgaAdmin, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.assignmentId)) {
            res.status(400).json({ error: 'invalid_assignment_id' });
            return;
        }
        try {
            const ok = await m.deleteRoleDashboardAssignment(c.tenantId, req.params.assignmentId);
            if (!ok) {
                res.status(404).json({ error: 'assignment_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'role_dashboard_delete_failed', e);
        }
    });
    // Role → navigation
    router.get('/role-assignments/navigation', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ assignments: await m.listRoleNavigationAssignments(c.tenantId, req.query.roleCode ?? null) });
        }
        catch (e) {
            fail(res, 'role_nav_list_failed', e);
        }
    });
    router.put('/role-assignments/navigation', fgaAdmin, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = RoleNavigationAssignmentSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertRoleNavigationAssignment(c.tenantId, p.data));
        }
        catch (e) {
            fail(res, 'role_nav_upsert_failed', e);
        }
    });
    router.delete('/role-assignments/navigation/:assignmentId', fgaAdmin, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.assignmentId)) {
            res.status(400).json({ error: 'invalid_assignment_id' });
            return;
        }
        try {
            const ok = await m.deleteRoleNavigationAssignment(c.tenantId, req.params.assignmentId);
            if (!ok) {
                res.status(404).json({ error: 'assignment_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'role_nav_delete_failed', e);
        }
    });
    return router;
}
//# sourceMappingURL=permission.routes.js.map