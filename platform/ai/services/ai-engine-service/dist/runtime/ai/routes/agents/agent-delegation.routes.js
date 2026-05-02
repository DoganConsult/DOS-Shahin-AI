// @ts-nocheck
import { Router } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port.js';
import { createDelegationGrant, revokeDelegationGrant, getActiveGrants, getDelegationHistory, } from '../../services/delegation/agent-delegation.service.js';
import { executeOnboardingAsAgent } from '../../services/agents/lifecycle/agent-onboarding-executor.service';
import { emitModuleEvent } from '../../services/emit-event.js';
import { toErrorMessage } from '@dos/module-sdk';
import { safeQuery, tenantSchema } from '../../ports/database.port.js';
/** Log delegation action to authz_decision_log (DAuth step 14). */
async function auditDelegation(tenantId, userId, data, action, ip) {
    const schema = tenantSchema(tenantId);
    await safeQuery(`INSERT INTO "${schema}".authz_decision_log
     (user_id, permission_code, module_code, decision, reason, record_context)
     VALUES ($1, $2, 'governance', 'allow', $3, $4)`, [userId, `delegation.${action}`, `Delegation ${action}: ${data.delegationId}`,
        JSON.stringify({ ...data, ip, action })]);
}
// ── Zod Schemas ──────────────────────────────────────────────────────────
import { validate, auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../ports/middleware.port.js';
import { swallow, EC, catchHandler } from '@dos/platform-core/resilience/resilient-catch';
import { grantPostBody, onboardPostBody } from "../../schemas/ai.schemas.js";
import { z } from "zod";
const router = Router();
router.use(moduleStack('ai'));
router.use(auditMiddleware("governance"));
router.use(automationMiddleware("governance"));
const VALID_SCOPES = [
    'onboarding', 'workspace_setup', 'policy_drafting', 'risk_seeding',
    'control_mapping', 'evidence_upload', 'assessment',
];
// POST /api/agent-delegation/grant — User grants an agent permission to act on their behalf
router.post('/grant', authenticate, requirePermission('admin.tenant.manage'), validate({ body: grantPostBody }), async (req, res) => {
    try {
        const { agentId, scopes, durationMinutes } = req.body;
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        if (!agentId || !scopes?.length) {
            res.status(400).json({ error: 'agentId and scopes[] required' });
            return;
        }
        // Validate scopes
        const invalidScopes = scopes.filter((s) => !VALID_SCOPES.includes(s));
        if (invalidScopes.length) {
            res.status(400).json({ error: `Invalid scopes: ${invalidScopes.join(', ')}`, validScopes: VALID_SCOPES });
            return;
        }
        const grant = await createDelegationGrant(tenantId, userId, agentId, scopes, durationMinutes || 60);
        // RBAC audit trail — record delegation grant
        auditDelegation(tenantId, userId, {
            delegationId: grant?.id || agentId,
            fromUserId: userId,
            toUserId: agentId,
            authorityId: scopes.join(','),
            delegatedAt: new Date().toISOString(),
            active: true,
        }, 'create', req.ip).catch(catchHandler(EC.EVENT_BUS, {}));
        setAuditData(res, { action: "create", entityType: "agent-delegation", entityId: grant?.id || agentId, afterState: grant });
        swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'agent_delegation', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.agent_delegation.created' });
        res.status(201).json(grant);
    }
    catch (err) {
        res.status(500).json({ error: toErrorMessage(err) });
    }
});
// DELETE /api/agent-delegation/grant/:grantId — Revoke a delegation
router.delete('/grant/:grantId', validate({ body: genericPayloadSchema }), authenticate, requirePermission('admin.tenant.manage'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        await revokeDelegationGrant(tenantId, req.params.grantId, userId);
        // RBAC audit trail — record delegation revocation
        auditDelegation(tenantId, userId, {
            delegationId: req.params.grantId,
            fromUserId: userId,
            toUserId: '',
            authorityId: '',
            active: false,
            delegatedAt: '',
        }, 'revoke', req.ip).catch(catchHandler(EC.EVENT_BUS, {}));
        setAuditData(res, { action: "delete", entityType: "agent-delegation", entityId: req.params.grantId });
        swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'deleted', entityType: 'agent_delegation', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.agent_delegation.deleted' });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: toErrorMessage(err) });
    }
});
// GET /api/agent-delegation/grants — List active grants for current user
router.get('/grants', validate({ query: z.record(z.unknown()) }), authenticate, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const grants = await getActiveGrants(tenantId, userId);
        res.json({ grants });
    }
    catch (err) {
        res.status(500).json({ error: toErrorMessage(err) });
    }
});
// GET /api/agent-delegation/history — Delegation action history
router.get('/history', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('delegation.chain.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { userId, agentId, limit } = req.query;
        const actions = await getDelegationHistory(tenantId, {
            userId: userId,
            agentId: agentId,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
        res.json({ actions });
    }
    catch (err) {
        res.status(500).json({ error: toErrorMessage(err) });
    }
});
// POST /api/agent-delegation/onboard — Agent executes full onboarding on behalf of user
router.post('/onboard', authenticate, requirePermission('admin.tenant.manage'), validate({ body: onboardPostBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { agentId, answers, autoInfer } = req.body;
        if (!agentId) {
            res.status(400).json({ error: 'agentId required' });
            return;
        }
        const result = await executeOnboardingAsAgent({
            tenantId,
            agentId,
            answers: answers || {},
            autoInfer: autoInfer !== false, // default true
        });
        if (!result.success) {
            res.status(result.errors.includes('No active delegation grant') ? 403 : 500)
                .json(result);
            return;
        }
        setAuditData(res, { action: "create", entityType: "agent-delegation", entityId: agentId, afterState: result });
        swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'agent_delegation', entityId: '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.agent_delegation.created' });
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: toErrorMessage(err) });
    }
});
export default router;
let genericPayloadSchema = z.record(z.unknown());
//# sourceMappingURL=agent-delegation.routes.js.map