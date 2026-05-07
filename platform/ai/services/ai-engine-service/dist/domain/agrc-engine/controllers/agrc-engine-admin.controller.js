import { ok } from '@dos/module-sdk';
export async function getAgrcEngineAdminConfig(req, res) {
    const mod = await import('../admin/agrc-engine-admin.routes.js').catch(() => ({}));
    const config = (typeof mod.getConfig === 'function' ? await mod.getConfig(req.tenantId) : {}) ?? {};
    res.json(ok(config, req));
}
export async function updateAgrcEngineAdminConfig(req, res) {
    const mod = await import('../admin/agrc-engine-admin.routes.js').catch(() => ({}));
    const result = (typeof mod.updateConfig === 'function' ? await mod.updateConfig(req.tenantId, req.body) : {}) ?? {};
    res.json(ok(result, req));
}
//# sourceMappingURL=agrc-engine-admin.controller.js.map