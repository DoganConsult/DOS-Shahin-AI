import { ok } from '@dos/module-sdk';
export async function listAgrcEngine(req, res) {
    const result = await import('../services/agrc-engine.service.js').then((s) => s.list(req.tenantId, req.query));
    res.json(ok(result, req));
}
export async function getAgrcEngineById(req, res) {
    const result = await import('../services/agrc-engine.service.js').then((s) => s.getById(req.tenantId, req.params.id));
    res.json(ok(result, req));
}
export async function createAgrcEngine(req, res) {
    const result = await import('../services/agrc-engine.service.js').then((s) => s.create(req.tenantId, req.body, req.user?.userId));
    res.status(201).json(ok(result, req));
}
export async function updateAgrcEngine(req, res) {
    const result = await import('../services/agrc-engine.service.js').then((s) => s.update(req.tenantId, req.params.id, req.body, req.user?.userId));
    res.json(ok(result, req));
}
//# sourceMappingURL=agrc-engine.controller.js.map