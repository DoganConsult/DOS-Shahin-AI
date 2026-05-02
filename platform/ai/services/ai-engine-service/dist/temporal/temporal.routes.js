// REST surface for AI-OS Temporal workflows. Mounted at /api/ai-engine/temporal.
//
// Endpoints:
//   POST /workflows/agent-invocation    — start agentInvocationWorkflow
//   POST /workflows/agent-squad         — start agentSquadWorkflow
//   GET  /workflows/:workflowId         — describe a running workflow
//   POST /workflows/:workflowId/cancel  — cancel a running workflow
//   GET  /health                        — Temporal connection probe
import { Router } from 'express';
import { getTemporalClient, getTaskQueue } from './client.js';
const router = Router();
// Lazy auth guards: inherit canonical auth/permissions from runtime ports if
// available, otherwise fall back to header-bypass for service-to-service.
const lazyAuth = [];
let authResolved = false;
async function ensureAuth() {
    if (authResolved)
        return lazyAuth;
    authResolved = true;
    try {
        const mod = await import('../runtime/ai/ports/auth.port.js');
        if (typeof mod.authenticate === 'function')
            lazyAuth.push(mod.authenticate);
        if (typeof mod.requirePermission === 'function') {
            lazyAuth.push(mod.requirePermission('ai.temporal.invoke'));
        }
    }
    catch { /* dev/test mode */ }
    return lazyAuth;
}
const guard = async (req, res, next) => {
    const guards = await ensureAuth();
    if (guards.length === 0)
        return next();
    let i = 0;
    const run = (err) => {
        if (err)
            return next(err);
        if (i >= guards.length)
            return next();
        const g = guards[i++];
        try {
            g(req, res, run);
        }
        catch (e) {
            next(e);
        }
    };
    run();
};
router.get('/health', async (_req, res) => {
    try {
        const client = await getTemporalClient();
        const ns = client.options.namespace;
        res.json({ status: 'ok', service: 'ai-os-temporal', namespace: ns, taskQueue: getTaskQueue() });
    }
    catch (err) {
        res.status(503).json({ status: 'unreachable', error: err.message });
    }
});
router.post('/workflows/agent-invocation', guard, async (req, res) => {
    try {
        const { tenantId, agentCode, input, autonomyLevel, toolBudgetUsd } = req.body ?? {};
        if (!tenantId || !agentCode) {
            res.status(400).json({ error: 'tenantId and agentCode are required' });
            return;
        }
        const client = await getTemporalClient();
        const handle = await client.workflow.start('agentInvocationWorkflow', {
            args: [{ tenantId, agentCode, input: input ?? {}, autonomyLevel, toolBudgetUsd }],
            taskQueue: getTaskQueue(),
            workflowId: `ai-invoke-${tenantId}-${agentCode}-${Date.now()}`,
        });
        res.status(202).json({ workflowId: handle.workflowId, runId: handle.firstExecutionRunId });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/workflows/agent-squad', guard, async (req, res) => {
    try {
        const { tenantId, agentCodes, input, hitlOnFailure } = req.body ?? {};
        if (!tenantId || !Array.isArray(agentCodes) || agentCodes.length === 0) {
            res.status(400).json({ error: 'tenantId and non-empty agentCodes[] are required' });
            return;
        }
        const client = await getTemporalClient();
        const handle = await client.workflow.start('agentSquadWorkflow', {
            args: [{ tenantId, agentCodes, input: input ?? {}, hitlOnFailure: !!hitlOnFailure }],
            taskQueue: getTaskQueue(),
            workflowId: `ai-squad-${tenantId}-${Date.now()}`,
        });
        res.status(202).json({ workflowId: handle.workflowId, runId: handle.firstExecutionRunId });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/workflows/:workflowId', async (req, res) => {
    try {
        const client = await getTemporalClient();
        const handle = client.workflow.getHandle(req.params.workflowId);
        const desc = await handle.describe();
        res.json({
            workflowId: desc.workflowId,
            runId: desc.runId,
            status: desc.status.name,
            type: desc.type,
            taskQueue: desc.taskQueue,
            startTime: desc.startTime,
            closeTime: desc.closeTime,
        });
    }
    catch (err) {
        res.status(404).json({ error: err.message });
    }
});
router.post('/workflows/:workflowId/cancel', guard, async (req, res) => {
    try {
        const client = await getTemporalClient();
        const handle = client.workflow.getHandle(req.params.workflowId);
        await handle.cancel();
        res.json({ workflowId: req.params.workflowId, cancelled: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
export default router;
//# sourceMappingURL=temporal.routes.js.map