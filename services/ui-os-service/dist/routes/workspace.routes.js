import { Router } from 'express';
import { UiOsWorkspaceStateManager } from '../managers/ui-os-workspace-state.manager.js';
import { WorkspacePatchSchema, SnapshotCreateSchema } from '../schemas/workspace.schemas.js';
function context(req, res) {
    const tenantId = (req.header('x-dos-tenant-id') ?? req.query.tenantId);
    const userId = (req.header('x-dos-user-id') ?? req.query.userId);
    if (!tenantId || !userId) {
        res.status(400).json({ error: 'missing_identity', message: 'x-dos-tenant-id and x-dos-user-id headers are required' });
        return null;
    }
    return { tenantId, userId };
}
function workspaceKey(req) {
    const wk = (req.query.workspaceKey ?? req.header('x-dos-workspace-key'));
    return wk ?? 'default';
}
export function createWorkspaceRouter(pool) {
    const router = Router();
    const manager = new UiOsWorkspaceStateManager(pool);
    router.get('/workspace-state', async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        try {
            const state = await manager.get(ctx.tenantId, ctx.userId, workspaceKey(req));
            res.json(state);
        }
        catch (err) {
            res.status(500).json({ error: 'workspace_get_failed', message: err.message });
        }
    });
    router.put('/workspace-state', async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        const parsed = WorkspacePatchSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
            return;
        }
        try {
            const wk = parsed.data.workspace_key ?? workspaceKey(req);
            const state = await manager.upsert(ctx.tenantId, ctx.userId, wk, parsed.data);
            res.json(state);
        }
        catch (err) {
            res.status(500).json({ error: 'workspace_put_failed', message: err.message });
        }
    });
    router.post('/workspace-state/reset', async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        try {
            const state = await manager.reset(ctx.tenantId, ctx.userId, workspaceKey(req));
            res.json(state);
        }
        catch (err) {
            res.status(500).json({ error: 'workspace_reset_failed', message: err.message });
        }
    });
    router.post('/workspace-state/snapshot', async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        const parsed = SnapshotCreateSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
            return;
        }
        try {
            const wk = parsed.data.workspace_key ?? workspaceKey(req);
            const snap = await manager.snapshot(ctx.tenantId, ctx.userId, wk, parsed.data.snapshot_key);
            res.status(201).json(snap);
        }
        catch (err) {
            res.status(500).json({ error: 'workspace_snapshot_failed', message: err.message });
        }
    });
    router.post('/workspace-state/restore/:snapshotId', async (req, res) => {
        const ctx = context(req, res);
        if (!ctx)
            return;
        const snapshotId = req.params.snapshotId;
        if (!snapshotId || !/^[0-9a-fA-F-]{36}$/.test(snapshotId)) {
            res.status(400).json({ error: 'invalid_snapshot_id' });
            return;
        }
        try {
            const state = await manager.restore(ctx.tenantId, ctx.userId, snapshotId);
            res.json(state);
        }
        catch (err) {
            const msg = err.message;
            if (msg === 'snapshot_not_found') {
                res.status(404).json({ error: 'snapshot_not_found' });
                return;
            }
            res.status(500).json({ error: 'workspace_restore_failed', message: msg });
        }
    });
    return router;
}
//# sourceMappingURL=workspace.routes.js.map