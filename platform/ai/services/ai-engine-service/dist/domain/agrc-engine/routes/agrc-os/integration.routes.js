// @ts-nocheck
import { Router } from 'express';
// AGRC-OS — Integration routes (Gaps 1-6)
// Covers: integration status, run, seed targets, monitoring targets,
//         monitored controls, feedback, handoffs, mesh
import { authenticate, requirePermission } from '../../ports/auth.port.js';
import { validate, auditMiddleware, setAuditData } from '../../ports/middleware.port.js';
import { errMsg } from '../../../../i18n/error-messages.js';
import { emitEvent } from '../../ports/events.port.js';
import { writeLimiter, heavyOpLimiter } from './shared.js';
import { swallowEmpty, swallowDefault, EC, catchHandler } from '@dos/platform-core/resilience/resilient-catch';
import { emptyResult } from '../../ports/database.port.js';
import { createRunBody, createSeedTargetsBody } from '../../schemas/agrc-engine.schemas.js';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());
const router = Router();
router.use(auditMiddleware('agrc-engine'));
// ── AGRC-OS Integration (Gaps 1-6) ───────────────────────────────────────
// GET /api/agrc-os/integration/status — Diagnostics: current integration state
router.get('/integration/status', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('tenant.config.manage'), async (req, res) => {
    try {
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
            agentShadows: shadows.rows[0],
            activationRules: rules.rows[0],
            persistentHandoffs: handoffs.rows[0],
            monitoringTargets: { enabled: targets.rows[0]?.total || 0 },
            agentFeedback: feedback.rows,
            gaps: {
                gap1_activationRules: (rules.rows[0]?.enabled || 0) > 0 ? 'active' : 'no_rules',
                gap2_eventDrivenTriggers: 'active',
                gap3_persistentCooperation: 'active',
                gap4_workloadDelegation: (shadows.rows[0]?.enabled || 0) > 0 ? 'active' : 'no_shadows',
                gap5_onboardingTargets: (targets.rows[0]?.total || 0) > 0 ? 'seeded' : 'pending',
                gap6_feedbackLoop: 'active',
            },
        });
    }
    catch (_err) {
        res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
    }
});
// POST /api/agrc-os/integration/run — Manually trigger integration cycle
router.post('/integration/run', authenticate, requirePermission('tenant.config.manage'), heavyOpLimiter, validate({ body: createRunBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { runAgrcOsIntegrationCycle } = await import('../../services/agrc-os-integration.service.js');
        const result = await runAgrcOsIntegrationCycle(tenantId);
        setAuditData(res, { action: 'create', entityType: 'integration_cycle', entityId: 'manual' });
        emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' }).catch(catchHandler(EC.EVENT_BUS, {}));
        res.json(result);
    }
    catch (_err) {
        res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
    }
});
// POST /api/agrc-os/integration/seed-targets — Re-seed agent monitoring targets from profile
router.post('/integration/seed-targets', authenticate, requirePermission('tenant.config.manage'), writeLimiter, validate({ body: createSeedTargetsBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { seedAgentTargetsFromProfile } = await import('../../services/agrc-os-integration.service.js');
        const result = await seedAgentTargetsFromProfile(tenantId);
        setAuditData(res, { action: 'create', entityType: 'agent_monitoring_targets', entityId: 'seed' });
        emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' }).catch(catchHandler(EC.EVENT_BUS, {}));
        res.json(result);
    }
    catch (_err) {
        res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
    }
});
// GET /api/agrc-os/integration/monitoring-targets — List agent monitoring targets
router.get('/integration/monitoring-targets', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('platform.agent.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { tenantSchema, safeQuery } = await import('@dos/db');
        const schema = tenantSchema(tenantId);
        const result = await safeQuery(`SELECT * FROM "${schema}".agent_monitoring_targets WHERE enabled = TRUE ORDER BY agent_id, priority`);
        res.json({ targets: result.rows });
    }
    catch (_err) {
        res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
    }
});
// GET /api/agrc-os/integration/monitored-controls — Controls in scope from agent monitoring targets
router.get('/integration/monitored-controls', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('platform.agent.read'), async (req, res) => {
    try {
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
    }
    catch (_err) {
        res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
    }
});
// GET /api/agrc-os/integration/feedback — Agent feedback/priority weights
router.get('/integration/feedback', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('platform.agent.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { tenantSchema, safeQuery } = await import('@dos/db');
        const schema = tenantSchema(tenantId);
        const [weights, recentFeedback] = await Promise.all([
            swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT * FROM "${schema}".agent_priority_weights ORDER BY agent_id`), { tenantId: tenantId, operation: 'query agent_priority_weights' }),
            swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT * FROM "${schema}".agent_feedback_log ORDER BY created_at DESC LIMIT 50`), { tenantId: tenantId, operation: 'query agent_priority_weights' }),
        ]);
        res.json({ weights: weights.rows, recentFeedback: recentFeedback.rows });
    }
    catch (_err) {
        res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
    }
});
// GET /api/agrc-os/integration/handoffs — Persistent handoff queue
router.get('/integration/handoffs', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('platform.agent.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { tenantSchema, safeQuery } = await import('@dos/db');
        const schema = tenantSchema(tenantId);
        const status = req.query.status || 'pending';
        const result = await safeQuery(`SELECT * FROM "${schema}".agent_handoffs WHERE status = $1 ORDER BY created_at DESC LIMIT 100`, [status]);
        res.json({ handoffs: result.rows, count: result.rows.length });
    }
    catch (_err) {
        res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
    }
});
// GET /api/agrc-os/integration/mesh — Agent Mesh aggregate
router.get('/integration/mesh', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('platform.agent.read'), async (req, res) => {
    try {
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
    }
    catch (_err) {
        res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
    }
});
export default router;
//# sourceMappingURL=integration.routes.js.map