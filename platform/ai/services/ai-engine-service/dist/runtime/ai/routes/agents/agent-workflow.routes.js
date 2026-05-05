// @ts-nocheck
import { Router } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { validate, auditMiddleware } from '../../ports/middleware.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { toErrorMessage } from '@dos/module-sdk';
import { getAllAgentDefinitions, getAgentDefinition, buildDependencyGraph, triggerAgentsForWorkflowTransition } from '../../ports/platform.port';
import { updateAiBody, createTriggerBody, createCancelBody } from '../../schemas/ai.schemas';
import { z } from "zod";
const router = Router();
router.use(authenticate);
router.use(auditMiddleware('ai'));
router.get('/', validate({ query: z.record(z.unknown()) }), requirePermission('ai.agent.read'), async (req, res) => {
    try {
        const defs = getAllAgentDefinitions();
        const workflows = defs
            .filter(d => d.workflow)
            .map(d => ({
            agentCode: d.agentCode,
            name: d.name,
            workflow: d.workflow,
            executionMode: d.executionMode,
            state: d.defaultState,
        }));
        res.json({ success: true, data: workflows });
    }
    catch (err) {
        res.status(500).json({ success: false, error: toErrorMessage(err) });
    }
});
router.get('/executions', validate({ query: z.record(z.unknown()) }), requirePermission('ai.agent.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const schema = tenantSchema(tenantId);
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const offset = parseInt(req.query.offset) || 0;
        const status = req.query.status;
        let query = `SELECT run_id, agent_code, status, trigger_source, duration_ms, tokens_used, cost_usd, created_at, completed_at
                 FROM "${schema}".dos_agent_runs`;
        const params = [];
        if (status) {
            params.push(status);
            query += ` WHERE status = $${params.length}`;
        }
        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);
        const result = await safeQuery(query, params);
        res.json({ success: true, data: result.rows, pagination: { limit, offset } });
    }
    catch (err) {
        res.status(500).json({ success: false, error: toErrorMessage(err) });
    }
});
router.get('/waves', validate({ query: z.record(z.unknown()) }), requirePermission('ai.agent.read'), (_req, res) => {
    try {
        const graph = buildDependencyGraph();
        res.json({ success: true, data: graph.executionWaves });
    }
    catch (err) {
        res.status(500).json({ success: false, error: toErrorMessage(err) });
    }
});
router.get('/dependencies', validate({ query: z.record(z.unknown()) }), requirePermission('ai.agent.read'), (_req, res) => {
    try {
        const graph = buildDependencyGraph();
        res.json({ success: true, data: graph });
    }
    catch (err) {
        res.status(500).json({ success: false, error: toErrorMessage(err) });
    }
});
router.get('/executions/:runId', validate({ query: z.record(z.unknown()) }), requirePermission('ai.agent.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const schema = tenantSchema(tenantId);
        const { runId } = req.params;
        const result = await safeQuery(`SELECT * FROM "${schema}".dos_agent_runs WHERE run_id = $1 LIMIT 1`, [runId]);
        if (!result.rows[0]) {
            return res.status(404).json({ success: false, error: 'Run not found' });
        }
        res.json({ success: true, data: result.rows[0] });
    }
    catch (err) {
        res.status(500).json({ success: false, error: toErrorMessage(err) });
    }
});
router.get('/:agentId', validate({ query: z.record(z.unknown()) }), requirePermission('ai.agent.read'), (req, res) => {
    try {
        const { agentId } = req.params;
        const def = getAgentDefinition(agentId);
        if (!def) {
            return res.status(404).json({ success: false, error: `Agent ${agentId} not found` });
        }
        res.json({
            success: true,
            data: {
                agentCode: def.agentCode,
                name: def.name,
                workflow: def.workflow,
                dependencies: def.dependencies,
                executionMode: def.executionMode,
                allowedTriggerSources: def.allowedTriggerSources,
            },
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: toErrorMessage(err) });
    }
});
router.put('/:agentId', requirePermission('ai.agent.manage'), validate({ body: updateAiBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const schema = tenantSchema(tenantId);
        const { agentId } = req.params;
        const { maxConcurrentWorkflows, canStartWorkflows, canInterruptHuman } = req.body;
        await safeQuery(`INSERT INTO "${schema}".dos_agent_workflow_config (agent_code, max_concurrent, can_start, can_interrupt, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (agent_code) DO UPDATE SET max_concurrent = $2, can_start = $3, can_interrupt = $4, updated_at = NOW()`, [agentId, maxConcurrentWorkflows ?? 5, canStartWorkflows ?? true, canInterruptHuman ?? false]);
        res.json({ success: true, data: { agentId, updated: true } });
    }
    catch (err) {
        res.status(500).json({ success: false, error: toErrorMessage(err) });
    }
});
router.post('/:agentId/trigger', requirePermission('ai.agent.manage'), validate({ body: createTriggerBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { agentId } = req.params;
        const { workflowType, entityType, entityId, moduleCode, metadata } = req.body;
        const actorId = req.userId || 'system';
        const results = await triggerAgentsForWorkflowTransition({
            workflowType: workflowType || 'manual',
            workflowId: `manual-${Date.now()}`,
            transitionFrom: 'idle',
            transitionTo: 'running',
            entityType: entityType || 'agent',
            entityId: entityId || agentId,
            moduleCode: moduleCode || 'ai',
            tenantId,
            actorId,
            metadata,
        });
        res.json({ success: true, data: results });
    }
    catch (err) {
        res.status(500).json({ success: false, error: toErrorMessage(err) });
    }
});
router.post('/:agentId/cancel', requirePermission('ai.agent.manage'), validate({ body: createCancelBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const schema = tenantSchema(tenantId);
        const { agentId } = req.params;
        const { runId } = req.body;
        if (runId) {
            await safeQuery(`UPDATE "${schema}".dos_agent_runs SET status = 'cancelled', completed_at = NOW() WHERE run_id = $1 AND agent_code = $2 AND status IN ('queued', 'running')`, [runId, agentId]);
        }
        else {
            await safeQuery(`UPDATE "${schema}".dos_agent_runs SET status = 'cancelled', completed_at = NOW() WHERE agent_code = $1 AND status IN ('queued', 'running')`, [agentId]);
        }
        res.json({ success: true, data: { agentId, status: 'cancelled' } });
    }
    catch (err) {
        res.status(500).json({ success: false, error: toErrorMessage(err) });
    }
});
export const agentWorkflowRoutes = router;
let genericPayloadSchema = z.record(z.unknown());
//# sourceMappingURL=agent-workflow.routes.js.map