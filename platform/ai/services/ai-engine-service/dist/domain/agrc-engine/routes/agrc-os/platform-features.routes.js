import { logger } from '../../ports/logger.port.js';
import { emptyResult } from '../../ports/database.port.js';
// AGRC-OS — Integration, Platform Mode, Pending Actions, Agent Orchestration,
// Shadow Agents, Hyper-Role, Autonomy, Memory, Delegation, Consent, Workflow Versions
import { Router } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port.js';
import { validate, auditMiddleware, asyncHandler, setAuditData } from '../../ports/middleware.port.js';
import { errMsg } from '../../../../i18n/error-messages.js';
import { emitEvent } from '../../ports/events.port.js';
import { writeLimiter, heavyOpLimiter } from './shared.js';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import { swallowEmpty, swallowDefault, EC, catchHandler } from '@dos/platform-core/resilience/resilient-catch';
import { createRunBody, createSeedTargetsBody, updateReviewBody, createAskBody, createApproveBody, createRejectBody, updateShadowAgentsBody, createCheckBody, createRetrieveBody, createCommitBody, createStoreBody, updateDelegationRulesBody, createGrantBody, createRevokeBody, createForgetBody } from '../../schemas/agrc-engine.schemas.js';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());
const router = Router();
router.use(auditMiddleware('agrc-engine'));
// ── AGRC-OS Integration (Gaps 1–6) ───────────────────────────────────────
// GET /api/agrc-os/integration/status — Diagnostics: current integration state
router.get('/integration/status', authenticate, requirePermission('tenant.config.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const { tenantSchema, safeQuery } = await import('@dos/db');
    const schema = tenantSchema(tenantId);
    const [shadows, rules, handoffs, targets, feedback] = await Promise.all([
        swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, enabled: 0 }]), safeQuery(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE enabled = TRUE)::int AS enabled FROM "${schema}".member_agent_shadows`), { tenantId: tenantId, operation: 'query member_agent_shadows' }),
        swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, enabled: 0, total_triggers: 0 }]), safeQuery(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE enabled = TRUE)::int AS enabled, SUM(trigger_count)::int AS total_triggers FROM "${schema}".agent_activation_rules`), { tenantId: tenantId, operation: 'query member_agent_shadows' }),
        swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, pending: 0, completed: 0 }]), safeQuery(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'pending')::int AS pending, COUNT(*) FILTER (WHERE status = 'completed')::int AS completed FROM "${schema}".agent_handoffs`), { tenantId: tenantId, operation: 'query agent_activation_rules' }),
        swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0 }]), safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".agent_monitoring_targets WHERE enabled = TRUE`), { tenantId: tenantId, operation: 'query agent_activation_rules' }),
        swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT agent_id, acceptance_rate, total_accepted, total_rejected, priority_boost FROM "${schema}".agent_priority_weights ORDER BY agent_id`), { tenantId: tenantId, operation: 'query agent_handoffs' }),
    ]);
    res.json({
        agentShadows: getFirstRow(shadows),
        activationRules: getFirstRow(rules),
        persistentHandoffs: getFirstRow(handoffs),
        monitoringTargets: { enabled: getFirstRow(targets)?.total || 0 },
        agentFeedback: feedback.rows,
        gaps: {
            gap1_activationRules: (getFirstRow(rules)?.enabled || 0) > 0 ? 'active' : 'no_rules',
            gap2_eventDrivenTriggers: 'active',
            gap3_persistentCooperation: 'active',
            gap4_workloadDelegation: (getFirstRow(shadows)?.enabled || 0) > 0 ? 'active' : 'no_shadows',
            gap5_onboardingTargets: (getFirstRow(targets)?.total || 0) > 0 ? 'seeded' : 'pending',
            gap6_feedbackLoop: 'active',
        },
    });
}));
// POST /api/agrc-os/integration/run — Manually trigger integration cycle
router.post('/integration/run', authenticate, requirePermission('tenant.config.manage'), heavyOpLimiter, validate({ body: createRunBody }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const { runAgrcOsIntegrationCycle } = await import('../../services/agrc-os-integration.service.js');
    const result = await runAgrcOsIntegrationCycle(tenantId);
    setAuditData(res, { action: 'create', entityType: 'integration_cycle', entityId: 'manual' });
    emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' }).catch(catchHandler(EC.AGENT_ACTION, {}));
    res.json(result);
}));
// POST /api/agrc-os/integration/seed-targets — Re-seed agent monitoring targets from profile
router.post('/integration/seed-targets', authenticate, requirePermission('tenant.config.manage'), writeLimiter, validate({ body: createSeedTargetsBody }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const { seedAgentTargetsFromProfile } = await import('../../services/agrc-os-integration.service.js');
    const result = await seedAgentTargetsFromProfile(tenantId);
    setAuditData(res, { action: 'create', entityType: 'agent_monitoring_targets', entityId: 'seed' });
    emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' }).catch(catchHandler(EC.AGENT_ACTION, {}));
    res.json(result);
}));
// GET /api/agrc-os/integration/monitoring-targets — List agent monitoring targets
router.get('/integration/monitoring-targets', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const { tenantSchema, safeQuery } = await import('@dos/db');
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT * FROM "${schema}".agent_monitoring_targets WHERE enabled = TRUE ORDER BY agent_id, priority`);
    res.json({ targets: result.rows });
}));
// GET /api/agrc-os/integration/monitored-controls — Controls in scope from agent monitoring targets (framework_focus, etc.)
router.get('/integration/monitored-controls', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const { tenantSchema, safeQuery } = await import('@dos/db');
    const { getControls } = await import('../../../compliance/services/misc/ucf.service.js');
    const schema = tenantSchema(tenantId);
    const limit = Math.min(parseInt(String(req.query.limit || '100'), 10), 500);
    const targetsRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT agent_id, target_type, target_config FROM "${schema}".agent_monitoring_targets WHERE enabled = TRUE AND target_type = 'framework_focus'`), { tenantId: tenantId, operation: 'query agent_monitoring_targets' });
    const frameworkIds = [];
    for (const row of targetsRes.rows) {
        const config = row.target_config || {};
        const fws = config.frameworks || config.framework_ids || (Array.isArray(config) ? config : []);
        if (Array.isArray(fws))
            fws.forEach((f) => f && !frameworkIds.includes(f) && frameworkIds.push(f));
        else if (typeof fws === 'string' && !frameworkIds.includes(fws))
            frameworkIds.push(fws);
    }
    const controlsByFramework = {};
    let allControls = [];
    for (const fwId of frameworkIds.slice(0, 5)) {
        try {
            const list = await getControls(tenantId, { framework: fwId });
            controlsByFramework[fwId] = list;
            allControls = allControls.concat(list);
        }
        catch (_) {
            controlsByFramework[fwId] = [];
        }
    }
    const unique = Array.from(new Map(allControls.map((c) => [c.controlId || c.control_id || c.id || c.code, c]).entries()).values()).slice(0, limit);
    res.json({ controls: unique, byFramework: controlsByFramework, frameworkIds });
}));
// GET /api/agrc-os/integration/feedback — Agent feedback/priority weights
router.get('/integration/feedback', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const { tenantSchema, safeQuery } = await import('@dos/db');
    const schema = tenantSchema(tenantId);
    const [weights, recentFeedback] = await Promise.all([
        swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT * FROM "${schema}".agent_priority_weights ORDER BY agent_id`), { tenantId: tenantId, operation: 'query agent_priority_weights' }),
        swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT * FROM "${schema}".agent_feedback_log ORDER BY created_at DESC LIMIT 50`), { tenantId: tenantId, operation: 'query agent_priority_weights' }),
    ]);
    res.json({ weights: weights.rows, recentFeedback: recentFeedback.rows });
}));
// GET /api/agrc-os/integration/handoffs — Persistent handoff queue
router.get('/integration/handoffs', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const { tenantSchema, safeQuery } = await import('@dos/db');
    const schema = tenantSchema(tenantId);
    const status = req.query.status || 'pending';
    const result = await safeQuery(`SELECT * FROM "${schema}".agent_handoffs WHERE status = $1 ORDER BY created_at DESC LIMIT 100`, [status]);
    res.json({ handoffs: result.rows, count: result.rows.length });
}));
// GET /api/agrc-os/integration/mesh — Agent Mesh aggregate: participants + handoffs + monitoring targets + pending actions
router.get('/integration/mesh', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const { listParticipants } = await import('../../runtime/ai/services/squad/unified-squad-registry.service.js');
    const { getPendingActions } = await import('@dos/platform-core/settings/platform-mode-gate.service');
    const { tenantSchema, safeQuery } = await import('@dos/db');
    const schema = tenantSchema(tenantId);
    const [participants, handoffsRows, targetsRows, pendingActions] = await Promise.all([
        swallowEmpty(EC.FALLBACK_QUERY, listParticipants(tenantId), { tenantId: tenantId, operation: 'fallback query' }),
        swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT * FROM "${schema}".agent_handoffs WHERE status = 'pending' ORDER BY created_at DESC LIMIT 50`), { tenantId: tenantId, operation: 'query agent_handoffs' }),
        swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT * FROM "${schema}".agent_monitoring_targets WHERE enabled = TRUE ORDER BY agent_id, priority`), { tenantId: tenantId, operation: 'query agent_handoffs' }),
        getPendingActions(tenantId, { status: 'awaiting_approval', limit: 50 }),
    ]);
    const byAgent = {};
    for (const t of targetsRows.rows) {
        const id = t.agent_id || 'any';
        byAgent[id] = (byAgent[id] || 0) + 1;
    }
    const handoffCount = handoffsRows.rows.length;
    res.json({
        participants: Array.isArray(participants) ? participants : [],
        handoffs: { summary: { pending: handoffCount }, items: handoffsRows.rows },
        monitoringTargets: { total: targetsRows.rows.length, targets: targetsRows.rows, byAgent },
        pendingActions: { count: pendingActions.length, items: pendingActions },
    });
}));
// ── Platform Mode & Pending Actions ────────────────────────────────────────
// GET /api/agrc-os/platform-mode — Current tenant platform mode
router.get('/platform-mode', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getTenantPlatformMode } = await import('@dos/platform-core/settings/platform-mode-gate.service');
    const mode = await getTenantPlatformMode(req.tenantId);
    res.json({ mode });
}));
// GET /api/agrc-os/agent-roles — Agent RBAC map (which agent represents which GRC role)
router.get('/agent-roles', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getAgentRbacEntries } = await import('@dos/platform-core/settings/platform-mode-gate.service');
    res.json({ agents: getAgentRbacEntries() });
}));
// GET /api/agrc-os/pending-actions — List pending agent actions awaiting approval
router.get('/pending-actions', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getPendingActions } = await import('@dos/platform-core/settings/platform-mode-gate.service');
    const agentId = req.query.agentId;
    const status = req.query.status;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    const actions = await getPendingActions(req.tenantId, { agentId, status, limit });
    res.json({ actions, count: actions.length });
}));
// GET /api/agrc-os/pending-actions/count — Count of pending actions (for badge)
router.get('/pending-actions/count', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getPendingActions } = await import('@dos/platform-core/settings/platform-mode-gate.service');
    const actions = await getPendingActions(req.tenantId, { status: 'awaiting_approval' });
    res.json({ count: actions.length });
}));
// PUT /api/agrc-os/pending-actions/:id/review — Approve or reject a pending action
router.put('/pending-actions/:id/review', authenticate, requirePermission('platform.agent.write'), writeLimiter, validate({ body: updateReviewBody }), asyncHandler(async (req, res) => {
    const { reviewPendingAction } = await import('@dos/platform-core/settings/platform-mode-gate.service');
    const { executeAction } = await import('../../runtime/ai/services/agents/core/agent-runner.service.js');
    const tenantId = req.tenantId;
    const userId = req.user?.userId;
    const { approved, reviewNote } = req.body;
    if (typeof approved !== 'boolean') {
        res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
        return;
    }
    const result = await reviewPendingAction(tenantId, req.params.id, userId, approved, reviewNote);
    if (!result.success) {
        res.status(404).json({ error: errMsg('NOT_FOUND', req) });
        return;
    }
    if (approved && result.action) {
        const payload = typeof result.action.proposed_payload === 'string'
            ? JSON.parse(result.action.proposed_payload)
            : result.action.proposed_payload || {};
        try {
            await executeAction(tenantId, result.action.agent_id, {
                type: result.action.action_type,
                title: payload.title || result.action.action_type,
                description: payload.description || '',
                priority: payload.priority || 'medium',
                entityType: result.action.entity_type,
                entityId: result.action.entity_id,
                payload,
            });
        }
        catch (execErr) {
            logger.warn(`[PendingActions] Approved action execution failed: ${toErrorMessage(execErr)}`);
        }
    }
    setAuditData(res, {
        action: approved ? 'update' : 'delete',
        entityType: 'agent_pending_action',
        entityId: req.params.id,
        afterState: { approved, reviewNote },
    });
    emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'updated', entityType: 'agrc_os', entityId: req.params.id || '' }).catch(catchHandler(EC.AGENT_ACTION, {}));
    res.json({ success: true, status: approved ? 'approved' : 'rejected' });
}));
// GET /api/agrc-os/mode-operation-log — Audit log of mode-gated operations
router.get('/mode-operation-log', authenticate, requirePermission('event.log.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { tenantSchema, safeQuery } = await import('@dos/db');
    const schema = tenantSchema(req.tenantId);
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    const agentId = req.query.agentId;
    let where = '';
    const params = [];
    if (agentId) {
        where = 'WHERE agent_id = $1';
        params.push(agentId);
    }
    const result = await safeQuery(`SELECT * FROM "${schema}".mode_operation_log ${where} ORDER BY created_at DESC LIMIT $${params.length + 1}`, [...params, limit]);
    res.json({ log: result.rows, count: result.rows.length });
}));
// ════════════════════════════════════════════════════════════════
// Agent Orchestration — Runs, Graph, Proposals, Shadow Agents
// ════════════════════════════════════════════════════════════════
// GET /api/agrc-os/agent-runs — List agent runs
router.get('/agent-runs', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { listAgentRuns } = await import('../../runtime/ai/services/orchestration/agent-orchestration.service.js');
    const runs = await listAgentRuns(req.tenantId, {
        status: req.query.status,
        agentId: req.query.agentId,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : 50,
    });
    res.json({ runs, count: runs.length });
}));
// GET /api/agrc-os/agent-runs/:runId — Get single run state
router.get('/agent-runs/:runId', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getAgentRun } = await import('../../runtime/ai/services/orchestration/agent-orchestration.service.js');
    const run = await getAgentRun(req.tenantId, req.params.runId);
    if (!run) {
        res.status(404).json({ error: errMsg('NOT_FOUND', req) });
        return;
    }
    res.json(run);
}));
// GET /api/agrc-os/agent-runs/:runId/graph — Get run graph (nodes + edges + state)
router.get('/agent-runs/:runId/graph', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getRunGraph } = await import('../../runtime/ai/services/orchestration/agent-orchestration.service.js');
    const graph = await getRunGraph(req.tenantId, req.params.runId);
    res.json(graph);
}));
// POST /api/agrc-os/agent-runs/:runId/node/:nodeId/ask — Talk to Node
router.post('/agent-runs/:runId/node/:nodeId/ask', authenticate, requirePermission('platform.agent.read'), validate({ body: createAskBody }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const { runId, nodeId } = req.params;
    const { question, mode } = req.body;
    if (!question) {
        res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
        return;
    }
    const { getRunGraph, getAgentRun, recordAgentEvent } = await import('../../runtime/ai/services/orchestration/agent-orchestration.service.js');
    const { claudeChat } = await import('../../../../config/claude-client.js');
    const run = await getAgentRun(tenantId, runId);
    if (!run) {
        res.status(404).json({ error: errMsg('NOT_FOUND', req) });
        return;
    }
    const graph = await getRunGraph(tenantId, runId);
    const node = graph.nodes.find(n => n.id === nodeId);
    const nodeState = graph.state[nodeId];
    const contextPrompt = `You are an AI agent assistant for the Shahin-Ai Platform.
A manager is asking about a specific workflow node in an agent run.

Run ID: ${runId}
Node ID: ${nodeId}
Node Label: ${node?.label || nodeId}

Node Status: ${nodeState?.status || 'any'}

Node Owner: ${nodeState?.owner || 'unassigned'}

Node SLA Hours: ${nodeState?.slaHours || 'none'}

Started: ${nodeState?.startedAt || 'not started'}

Ended: ${nodeState?.endedAt || 'not ended'}
Agent: ${run.agent_id || 'orchestrator'}
Platform Mode: ${run.platform_mode}
Run Status: ${run.status}

Full graph state:
${JSON.stringify(graph.state, null, 2)}

Answer the question helpfully. If you can suggest actions to unblock or improve the situation, include them as a JSON array in your response under "actions".
Respond with JSON: { "answer": "...", "actions": [{ "type": "...", "payload": {...}, "requires_approval": true/false }] }`;
    let answer;
    let actions = [];
    try {
        const resp = await claudeChat(contextPrompt, [{ role: 'user', content: question }], { maxTokens: 1024, temperature: 0.3 });
        try {
            const parsed = JSON.parse(resp);
            answer = parsed.answer || resp;
            actions = parsed.actions || [];
        }
        catch {
            answer = resp;
        }
    }
    catch {
        answer = `Node "${node?.label || nodeId}" is currently ${nodeState?.status || 'any'}. ${nodeState?.status === 'awaiting_approval' ? 'It requires human approval to proceed.' : nodeState?.status === 'done' ? 'This step has been completed.' : 'Unable to provide detailed analysis at this time.'}`;
    }
    await recordAgentEvent(tenantId, {
        runId, agentId: run.agent_id || undefined, eventType: 'node.asked',
        nodeId, data: { question, answer: answer.slice(0, 500), mode: mode || 'manager' },
    }).catch(catchHandler(EC.AGENT_ACTION, {}));
    emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' }).catch(catchHandler(EC.AGENT_ACTION, {}));
    res.json({ answer, actions });
}));
// GET /api/agrc-os/agent-runs/:runId/events — Get run events (for playback)
router.get('/agent-runs/:runId/events', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getRunEvents } = await import('../../runtime/ai/services/orchestration/agent-orchestration.service.js');
    const events = await getRunEvents(req.tenantId, req.params.runId, req.query.limit ? parseInt(req.query.limit, 10) : 100);
    res.json({ events, count: events.length });
}));
// GET /api/agrc-os/agent-run-stats — Dashboard stats
router.get('/agent-run-stats', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getAgentRunStats } = await import('../../runtime/ai/services/orchestration/agent-orchestration.service.js');
    const stats = await getAgentRunStats(req.tenantId);
    res.json(stats);
}));
// ── Proposals ──────────────────────────────────────────────────
// GET /api/agrc-os/proposals — List proposals
router.get('/proposals', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { listProposals } = await import('../../runtime/ai/services/orchestration/agent-orchestration.service.js');
    const proposals = await listProposals(req.tenantId, {
        status: req.query.status,
        agentId: req.query.agentId,
        runId: req.query.runId,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : 50,
    });
    res.json({ proposals, count: proposals.length });
}));
// POST /api/agrc-os/proposals/:id/approve
router.post('/proposals/:id/approve', authenticate, requirePermission('platform.agent.write'), writeLimiter, validate({ body: createApproveBody }), asyncHandler(async (req, res) => {
    const { approveProposal } = await import('../../runtime/ai/services/orchestration/agent-orchestration.service.js');
    const { executeAction } = await import('../../runtime/ai/services/agents/core/agent-runner.service.js');
    const tenantId = req.tenantId;
    const userId = req.user?.userId;
    const result = await approveProposal(tenantId, req.params.id, userId, req.body.comment);
    if (!result.success) {
        res.status(404).json({ error: errMsg('NOT_FOUND', req) });
        return;
    }
    if (result.proposal?.auto_executable && result.proposal?.payload_json) {
        const payload = typeof result.proposal.payload_json === 'string'
            ? JSON.parse(result.proposal.payload_json) : result.proposal.payload_json;
        try {
            await executeAction(tenantId, result.proposal.agent_id, {
                type: (result.proposal.type || '').toLowerCase(),
                title: payload.title || result.proposal.type,
                description: payload.description || result.proposal.reason || '',
                priority: payload.priority || 'medium',
                entityType: payload.entityType,
                entityId: payload.entityId,
                payload,
            });
        }
        catch (execErr) {
            logger.warn(`[Proposals] Auto-execution after approval failed: ${toErrorMessage(execErr)}`);
        }
    }
    setAuditData(res, {
        action: 'update', entityType: 'agent_proposal', entityId: req.params.id,
        afterState: { decision: 'approved', comment: req.body.comment },
    });
    emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' }).catch(catchHandler(EC.AGENT_ACTION, {}));
    res.json({ success: true, status: 'approved' });
}));
// POST /api/agrc-os/proposals/:id/reject
router.post('/proposals/:id/reject', authenticate, requirePermission('platform.agent.write'), writeLimiter, validate({ body: createRejectBody }), asyncHandler(async (req, res) => {
    const { rejectProposal } = await import('../../runtime/ai/services/orchestration/agent-orchestration.service.js');
    const userId = req.user?.userId;
    const result = await rejectProposal(req.tenantId, req.params.id, userId, req.body.comment);
    if (!result.success) {
        res.status(404).json({ error: errMsg('NOT_FOUND', req) });
        return;
    }
    setAuditData(res, {
        action: 'delete', entityType: 'agent_proposal', entityId: req.params.id,
        afterState: { decision: 'rejected', comment: req.body.comment },
    });
    emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' }).catch(catchHandler(EC.AGENT_ACTION, {}));
    res.json({ success: true, status: 'rejected' });
}));
// ── Shadow Agent Config ────────────────────────────────────────
// GET /api/agrc-os/shadow-agents — List all shadow agent configs
router.get('/shadow-agents', authenticate, requirePermission('delegation.chain.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { listShadowAgents } = await import('../../runtime/ai/services/orchestration/agent-orchestration.service.js');
    const configs = await listShadowAgents(req.tenantId, {
        enabledOnly: req.query.enabledOnly === 'true',
    });
    res.json({ shadowAgents: configs, count: configs.length });
}));
// GET /api/agrc-os/shadow-agents/:userId — Get shadow agent config for user
router.get('/shadow-agents/:userId', authenticate, requirePermission('delegation.chain.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getShadowAgentConfig } = await import('../../runtime/ai/services/orchestration/agent-orchestration.service.js');
    const config = await getShadowAgentConfig(req.tenantId, req.params.userId);
    res.json({ config: config || null });
}));
// PUT /api/agrc-os/shadow-agents/:userId — Create/update shadow agent config
router.put('/shadow-agents/:userId', authenticate, requirePermission('delegation.chain.manage'), writeLimiter, validate({ body: updateShadowAgentsBody }), asyncHandler(async (req, res) => {
    const { upsertShadowAgentConfig } = await import('../../runtime/ai/services/orchestration/agent-orchestration.service.js');
    const config = await upsertShadowAgentConfig(req.tenantId, req.params.userId, req.body);
    setAuditData(res, {
        action: 'update', entityType: 'shadow_agent_config', entityId: req.params.userId,
        afterState: config,
    });
    emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'updated', entityType: 'agrc_os', entityId: req.params.id || '' }).catch(catchHandler(EC.AGENT_ACTION, {}));
    res.json({ config });
}));
// ── Hyper-Role check ───────────────────────────────────────────
// POST /api/agrc-os/hyper-role/check — Check if action is allowed by Hyper-Role
router.post('/hyper-role/check', authenticate, requirePermission('platform.agent.read'), validate({ body: createCheckBody }), asyncHandler(async (req, res) => {
    const { computeHyperRole, mapModeToAutonomy } = await import('../../runtime/ai/services/orchestration/agent-orchestration.service.js');
    const { getTenantPlatformMode } = await import('@dos/platform-core/settings/platform-mode-gate.service');
    const tenantId = req.tenantId;
    const { agentId, actionType, userPermissions, autonomyLevel } = req.body;
    if (!agentId || !actionType) {
        res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
        return;
    }
    const mode = await getTenantPlatformMode(tenantId);
    const effectivePerms = userPermissions || [];
    const level = autonomyLevel || mapModeToAutonomy(mode);
    const result = computeHyperRole(effectivePerms, agentId, actionType, level, mode);
    emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' }).catch(catchHandler(EC.AGENT_ACTION, {}));
    res.json({ ...result, tenantMode: mode, requestedAutonomy: level });
}));
// ── Autonomy policy lookup ─────────────────────────────────────
// GET /api/agrc-os/autonomy-policy — Get autonomy policy for an action type
router.get('/autonomy-policy', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getAutonomyPolicy } = await import('../../runtime/ai/services/orchestration/agent-orchestration.service.js');
    const actionType = req.query.actionType;
    if (!actionType) {
        res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
        return;
    }
    const policy = await getAutonomyPolicy(req.tenantId, actionType);
    res.json(policy);
}));
// ════════════════════════════════════════════════════════════════
// Agent Memory — Store, Retrieve, Commit, Forget, Stats
// ════════════════════════════════════════════════════════════════
// POST /api/agrc-os/memory/retrieve — Semantic search over agent memories
router.post('/memory/retrieve', authenticate, requirePermission('platform.agent.read'), validate({ body: createRetrieveBody }), asyncHandler(async (req, res) => {
    const { retrieveMemories } = await import('../../runtime/ai/services/memory/memory-store.service.js');
    const tenantId = req.tenantId;
    const { query, types, agentId, userId, topK } = req.body;
    if (!query) {
        res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
        return;
    }
    const memories = await retrieveMemories({
        tenantId, query, types, agentId, userId, topK,
    });
    emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' }).catch(catchHandler(EC.AGENT_ACTION, {}));
    res.json({ memories, count: memories.length });
}));
// POST /api/agrc-os/memory/commit — Write memories after agent run
router.post('/memory/commit', authenticate, requirePermission('platform.agent.write'), writeLimiter, validate({ body: createCommitBody }), asyncHandler(async (req, res) => {
    const { commitMemories } = await import('../../runtime/ai/services/memory/memory-store.service.js');
    const tenantId = req.tenantId;
    const { facts, summary, agentId, userId, runId } = req.body;
    if (!facts || !Array.isArray(facts) || facts.length === 0) {
        res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
        return;
    }
    const ids = await commitMemories({ tenantId, facts, summary, agentId, userId, runId });
    setAuditData(res, {
        action: 'create', entityType: 'agent_memory', entityId: ids[0] || 'batch',
        afterState: { count: ids.length, agentId },
    });
    emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' }).catch(catchHandler(EC.AGENT_ACTION, {}));
    res.json({ memoryIds: ids, count: ids.length });
}));
// POST /api/agrc-os/memory/store — Store single memory entry
router.post('/memory/store', authenticate, requirePermission('platform.agent.write'), writeLimiter, validate({ body: createStoreBody }), asyncHandler(async (req, res) => {
    const { storeMemory } = await import('../../runtime/ai/services/memory/memory-store.service.js');
    const tenantId = req.tenantId;
    const { content, memoryType, agentId, userId, summary, metadata, importanceScore, expiresInDays } = req.body;
    if (!content) {
        res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
        return;
    }
    const id = await storeMemory({
        tenantId, content, memoryType: memoryType || 'task',
        agentId, userId, summary, metadata, importanceScore, expiresInDays,
    });
    setAuditData(res, { action: 'create', entityType: 'agent_memory', entityId: id || '' });
    emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' }).catch(catchHandler(EC.AGENT_ACTION, {}));
    res.json({ memoryId: id });
}));
// GET /api/agrc-os/memory/search — List/search memories
router.get('/memory/search', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { searchMemories } = await import('../../runtime/ai/services/memory/memory-store.service.js');
    const tenantId = req.tenantId;
    const memories = await searchMemories(tenantId, {
        query: req.query.query,
        userId: req.query.userId,
        agentId: req.query.agentId,
        type: req.query.type,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
    });
    res.json({ memories, count: memories.length });
}));
// DELETE /api/agrc-os/memory/forget — Soft-delete memories (right to forget)
router.delete('/memory/forget', authenticate, requirePermission('platform.agent.write'), writeLimiter, validate({ body: genericPayloadSchema }), asyncHandler(async (req, res) => {
    const { forgetMemories } = await import('../../runtime/ai/services/memory/memory-store.service.js');
    const tenantId = req.tenantId;
    const { userId, agentId, memoryIds, namespace } = req.body;
    const count = await forgetMemories(tenantId, { userId, agentId, memoryIds, namespace });
    setAuditData(res, { action: 'delete', entityType: 'agent_memory', entityId: 'batch', afterState: { count } });
    emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'deleted', entityType: 'agrc_os', entityId: req.params.id || '' }).catch(catchHandler(EC.AGENT_ACTION, {}));
    res.json({ deletedCount: count });
}));
// GET /api/agrc-os/memory/stats — Memory usage stats
router.get('/memory/stats', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getMemoryStats } = await import('../../runtime/ai/services/memory/memory-store.service.js');
    const stats = await getMemoryStats(req.tenantId);
    res.json(stats);
}));
// ════════════════════════════════════════════════════════════════
// Delegation Rules — per-user per-agent action control
// ════════════════════════════════════════════════════════════════
router.get('/delegation-rules/:userId', authenticate, requirePermission('delegation.chain.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getDelegationRules } = await import('../../../governance/services/misc/delegation-rules.service.js');
    const rules = await getDelegationRules(req.tenantId, req.params.userId);
    res.json({ rules, count: rules.length });
}));
router.put('/delegation-rules/:userId', authenticate, requirePermission('delegation.chain.manage'), writeLimiter, validate({ body: updateDelegationRulesBody }), asyncHandler(async (req, res) => {
    const { upsertDelegationRule } = await import('../../../governance/services/misc/delegation-rules.service.js');
    const ruleId = await upsertDelegationRule(req.tenantId, req.params.userId, req.body);
    setAuditData(res, { action: 'update', entityType: 'delegation_rule', entityId: ruleId || '' });
    emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'updated', entityType: 'agrc_os', entityId: req.params.id || '' }).catch(catchHandler(EC.AGENT_ACTION, {}));
    res.json({ ruleId });
}));
router.delete('/delegation-rules/:userId/:ruleId', authenticate, requirePermission('delegation.chain.manage'), writeLimiter, validate({ body: genericPayloadSchema }), asyncHandler(async (req, res) => {
    const { deleteDelegationRule } = await import('../../../governance/services/misc/delegation-rules.service.js');
    const deleted = await deleteDelegationRule(req.tenantId, req.params.ruleId);
    emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'deleted', entityType: 'agrc_os', entityId: req.params.id || '' }).catch(catchHandler(EC.AGENT_ACTION, {}));
    res.json({ deleted });
}));
// ════════════════════════════════════════════════════════════════
// PDPL Consent — grant, revoke, right-to-forget
// ════════════════════════════════════════════════════════════════
router.get('/consent/:userId', authenticate, requirePermission('delegation.chain.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getConsentStatus } = await import('@dos/platform-core/security/services/pdpl-consent.service');
    const status = await getConsentStatus(req.tenantId, req.params.userId);
    res.json(status);
}));
router.post('/consent/:userId/grant', authenticate, requirePermission('delegation.chain.manage'), writeLimiter, validate({ body: createGrantBody }), asyncHandler(async (req, res) => {
    const { grantConsent } = await import('@dos/platform-core/security/services/pdpl-consent.service');
    const purpose = req.body.purpose || 'GRC agent assistance and memory-based learning';
    const ok = await grantConsent(req.tenantId, req.params.userId, purpose, req.user.userId);
    setAuditData(res, { action: 'update', entityType: 'consent', entityId: req.params.userId, afterState: { granted: true, purpose } });
    emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' }).catch(catchHandler(EC.AGENT_ACTION, {}));
    res.json({ granted: ok });
}));
router.post('/consent/:userId/revoke', authenticate, requirePermission('delegation.chain.manage'), writeLimiter, validate({ body: createRevokeBody }), asyncHandler(async (req, res) => {
    const { revokeConsent } = await import('@dos/platform-core/security/services/pdpl-consent.service');
    const ok = await revokeConsent(req.tenantId, req.params.userId, req.user.userId);
    setAuditData(res, { action: 'update', entityType: 'consent', entityId: req.params.userId, afterState: { granted: false } });
    emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' }).catch(catchHandler(EC.AGENT_ACTION, {}));
    res.json({ revoked: ok });
}));
router.post('/consent/:userId/forget', authenticate, requirePermission('delegation.chain.manage'), writeLimiter, validate({ body: createForgetBody }), asyncHandler(async (req, res) => {
    const { rightToForget } = await import('@dos/platform-core/security/services/pdpl-consent.service');
    const result = await rightToForget(req.tenantId, req.params.userId, req.user.userId);
    setAuditData(res, { action: 'delete', entityType: 'user_memory', entityId: req.params.userId, afterState: result });
    emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' }).catch(catchHandler(EC.AGENT_ACTION, {}));
    res.json(result);
}));
router.get('/consent/:userId/log', authenticate, requirePermission('delegation.chain.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getConsentLog } = await import('@dos/platform-core/security/services/pdpl-consent.service');
    const log = await getConsentLog(req.tenantId, req.params.userId);
    res.json({ log, count: log.length });
}));
// ════════════════════════════════════════════════════════════════
// Workflow Graph Versioning
// ════════════════════════════════════════════════════════════════
router.get('/workflow-versions/:runId', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getGraphVersions } = await import('../../../workflow/services/templates/workflow-versioning.service.js');
    const versions = await getGraphVersions(req.tenantId, req.params.runId);
    res.json({ versions, count: versions.length });
}));
router.get('/workflow-versions/:runId/diff', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { diffGraphVersions } = await import('../../../workflow/services/templates/workflow-versioning.service.js');
    const { versionA, versionB } = req.query;
    if (!versionA || !versionB) {
        res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
        return;
    }
    const diff = await diffGraphVersions(req.tenantId, versionA, versionB);
    res.json(diff);
}));
export default router;
//# sourceMappingURL=platform-features.routes.js.map