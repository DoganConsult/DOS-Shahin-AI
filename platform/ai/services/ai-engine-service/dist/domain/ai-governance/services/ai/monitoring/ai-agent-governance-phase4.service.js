// @ts-nocheck
// ============================================
// AI Agent Governance Service — Phase 4, Step 4.2
// NIST AI 600-1, OWASP LLM Top 10, EU AI Act GPAI
// 10 methods per exit gate.
// ============================================
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { logPolicyDecision } from '../../../../packs/services/blueprint.service';
import { eventBus } from '../../../ports/events.port';
import { swallow, EC, catchHandler } from '@dos/platform-core/resilience/resilient-catch';
// PII detection patterns
const PII_PATTERNS = [
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, // email
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // phone
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b\d{10}\b/, // national ID
    /\b(?:\d[ -]*?){13,16}\b/, // credit card
];
// Prompt injection patterns
const INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /you\s+are\s+now\s+/i,
    /system\s*prompt/i,
    /forget\s+(everything|all|your\s+instructions)/i,
    /act\s+as\s+(?:if\s+)?you\s+(?:are|were)/i,
    /disregard\s+(?:all\s+)?(?:previous|prior|above)/i,
    /new\s+instructions?\s*:/i,
    /jailbreak/i,
    /DAN\s+mode/i,
];
// 1. createAgentScope
export async function createAgentScope(tenantId, scope) {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(`INSERT INTO "${schema}".ai_agent_authority_scopes
       (agent_id, system_id, module_code, scope_type,
        max_actions_per_session, max_cost_per_session, max_sub_agent_depth,
        requires_human_approval, confidence_threshold,
        transparency_notice, allowed_tools, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING id`, [
        scope.agent_id, scope.system_id ?? null, scope.module_code,
        scope.scope_type ?? 'read',
        scope.max_actions_per_session ?? 100, scope.max_cost_per_session ?? 100.00,
        scope.max_sub_agent_depth ?? 2,
        scope.requires_human_approval ?? false, scope.confidence_threshold ?? 0.85,
        scope.transparency_notice ?? null, scope.allowed_tools ?? [],
        scope.is_active ?? true,
    ]);
    return { id: rows[0].id };
}
// 2. startAgentSession
export async function startAgentSession(tenantId, agentId, scopeId) {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(`INSERT INTO "${schema}".ai_agent_session_governance
       (scope_id, agent_id, status)
     VALUES ($1, $2, 'active')
     RETURNING id`, [scopeId, agentId]);
    return { session_id: rows[0].id };
}
// 3. recordAgentAction
export async function recordAgentAction(tenantId, sessionId, action) {
    const schema = tenantSchema(tenantId);
    await safeQuery(`UPDATE "${schema}".ai_agent_session_governance
     SET actions_taken = actions_taken + 1,
         cost_incurred = cost_incurred + $1,
         tokens_used = tokens_used + $2,
         tool_calls = tool_calls + $3,
         reasoning_trace = reasoning_trace || $4::jsonb
     WHERE id = $5`, [
        action.cost ?? 0, action.tokens ?? 0, action.is_tool_call ? 1 : 0,
        JSON.stringify([{
                action: action.action_type ?? 'any',
                timestamp: new Date().toISOString(),
                detail: action.detail ?? null,
            }]),
        sessionId,
    ]);
}
// 4. checkAgentBudget
export async function checkAgentBudget(tenantId, sessionId) {
    const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return result?.rows || [];
}
// 5. endAgentSession
export async function endAgentSession(tenantId, sessionId, status = 'completed') {
    const schema = tenantSchema(tenantId);
    await safeQuery(`UPDATE "${schema}".ai_agent_session_governance
     SET status = $1, session_end = now()
     WHERE id = $2`, [status, sessionId]);
}
// 6. detectPromptInjection
export async function detectPromptInjection(tenantId, sessionId, input) {
    const matched = [];
    for (const pattern of INJECTION_PATTERNS) {
        if (pattern.test(input)) {
            matched.push(pattern.source);
        }
    }
    if (matched.length > 0) {
        const schema = tenantSchema(tenantId);
        await safeQuery(`UPDATE "${schema}".ai_agent_session_governance
       SET prompt_injection_detected = TRUE
       WHERE id = $1`, [sessionId]);
        await swallow(EC.EVENT_BUS, eventBus.publish({
            eventType: 'agent.prompt_injection.detected', tenantId, sourceService: 'ai-agent-governance', severity: 'critical',
            payload: { session_id: sessionId, patterns: matched.length },
        }), { tenantId, operation: 'eventBus:agent.prompt_injection.detected' });
    }
    return { detected: matched.length > 0, patterns_matched: matched };
}
// 7. scanOutputForPII
export async function scanOutputForPII(tenantId, sessionId, output) {
    const types = [];
    const labels = ['email', 'phone', 'ssn', 'national_id', 'credit_card'];
    for (let i = 0; i < PII_PATTERNS.length; i++) {
        if (PII_PATTERNS[i].test(output)) {
            types.push(labels[i]);
        }
    }
    if (types.length > 0) {
        const schema = tenantSchema(tenantId);
        await safeQuery(`UPDATE "${schema}".ai_agent_session_governance
       SET pii_exposure_detected = TRUE, output_validation_failures = output_validation_failures + 1
       WHERE id = $1`, [sessionId]);
    }
    return { pii_found: types.length > 0, types_detected: types };
}
// 8. approveSubAgentSpawn
export async function approveSubAgentSpawn(tenantId, parentSessionId, childConfig) {
    const schema = tenantSchema(tenantId);
    // Check current delegation depth
    const { rows: chain } = await safeQuery(`WITH RECURSIVE chain AS (
       SELECT id, 0 as depth FROM "${schema}".ai_agent_session_governance WHERE id = $1
       UNION ALL
       SELECT c.child_session_id, chain.depth + 1
       FROM "${schema}".ai_agent_chain_of_custody c
       JOIN chain ON c.parent_session_id = chain.id
     )
     SELECT max(depth) as max_depth FROM chain`, [parentSessionId]);
    const currentDepth = parseInt(chain[0]?.max_depth ?? '0');
    // Check max depth from scope
    const { rows: scope } = await safeQuery(`SELECT sc.max_sub_agent_depth
     FROM "${schema}".ai_agent_session_governance s
     JOIN "${schema}".ai_agent_authority_scopes sc ON s.scope_id = sc.id
     WHERE s.id = $1`, [parentSessionId]);
    const maxDepth = scope[0]?.max_sub_agent_depth ?? 2;
    if (currentDepth >= maxDepth) {
        return { approved: false, reason: `Max sub-agent depth (${maxDepth}) exceeded` };
    }
    // Create child session
    const { rows: childSession } = await safeQuery(`INSERT INTO "${schema}".ai_agent_session_governance
       (scope_id, agent_id, session_isolation, status)
     SELECT scope_id, $1, $2, 'active'
     FROM "${schema}".ai_agent_session_governance WHERE id = $3
     RETURNING id`, [childConfig.agent_id, childConfig.isolation ?? 'isolated', parentSessionId]);
    // Record chain of custody
    await safeQuery(`INSERT INTO "${schema}".ai_agent_chain_of_custody
       (parent_session_id, child_session_id, delegation_depth,
        delegated_scope, delegation_reason, approval_method, risk_at_delegation)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`, [
        parentSessionId, childSession[0].id, currentDepth + 1,
        JSON.stringify(childConfig.scope ?? {}), childConfig.reason ?? null,
        'policy', childConfig.risk_level ?? 'low',
    ]);
    return { approved: true, child_session_id: childSession[0].id, reason: 'Approved by policy' };
}
// 9. getAgentAuditTrail
export async function getAgentAuditTrail(tenantId, agentId) {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(`SELECT s.*, sc.module_code, sc.scope_type, sc.max_actions_per_session
     FROM "${schema}".ai_agent_session_governance s
     JOIN "${schema}".ai_agent_authority_scopes sc ON s.scope_id = sc.id
     WHERE s.agent_id = $1
     ORDER BY s.created_at DESC
     LIMIT 100`, [agentId]);
    return rows;
}
// 11. listAgentScopes
export async function listAgentScopes(tenantId, agentId) {
    const schema = tenantSchema(tenantId);
    const where = agentId ? 'WHERE agent_id = $1' : '';
    const params = agentId ? [agentId] : [];
    const { rows } = await safeQuery(`SELECT * FROM "${schema}".ai_agent_authority_scopes ${where} ORDER BY created_at DESC LIMIT 100`, params);
    return rows;
}
// 12. getAgentScopeById
export async function getAgentScopeById(tenantId, scopeId) {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(`SELECT * FROM "${schema}".ai_agent_authority_scopes WHERE id = $1`, [scopeId]);
    return rows[0] ?? null;
}
// 13. listAgentSessions
export async function listAgentSessions(tenantId, filters) {
    const schema = tenantSchema(tenantId);
    const conditions = [];
    const params = [];
    let idx = 1;
    if (filters?.agent_id) {
        conditions.push(`s.agent_id = $${idx++}`);
        params.push(filters.agent_id);
    }
    if (filters?.status) {
        conditions.push(`s.status = $${idx++}`);
        params.push(filters.status);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await safeQuery(`SELECT s.*, sc.module_code, sc.scope_type
     FROM "${schema}".ai_agent_session_governance s
     LEFT JOIN "${schema}".ai_agent_authority_scopes sc ON s.scope_id = sc.id
     ${where}
     ORDER BY s.created_at DESC LIMIT 100`, params);
    return rows;
}
// 14. getAgentSessionById
export async function getAgentSessionById(tenantId, sessionId) {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(`SELECT s.*, sc.module_code, sc.scope_type, sc.max_actions_per_session, sc.max_cost_per_session
     FROM "${schema}".ai_agent_session_governance s
     LEFT JOIN "${schema}".ai_agent_authority_scopes sc ON s.scope_id = sc.id
     WHERE s.id = $1`, [sessionId]);
    return rows[0] ?? null;
}
// 15. getDelegationChain
export async function getDelegationChain(tenantId, sessionId) {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(`SELECT c.*, ps.agent_id as parent_agent, cs.agent_id as child_agent
     FROM "${schema}".ai_agent_chain_of_custody c
     LEFT JOIN "${schema}".ai_agent_session_governance ps ON c.parent_session_id = ps.id
     LEFT JOIN "${schema}".ai_agent_session_governance cs ON c.child_session_id = cs.id
     WHERE c.parent_session_id = $1 OR c.child_session_id = $1
     ORDER BY c.created_at DESC`, [sessionId]);
    return rows;
}
// 10. escalateToHuman
export async function escalateToHuman(tenantId, sessionId, reason) {
    const schema = tenantSchema(tenantId);
    await safeQuery(`UPDATE "${schema}".ai_agent_session_governance
     SET status = 'escalated', escalations = escalations + 1, human_interventions = human_interventions + 1
     WHERE id = $1`, [sessionId]);
    await logPolicyDecision(tenantId, {
        decision_type: 'agent_escalation',
        input_context: { session_id: sessionId },
        decision: 'escalated_to_human',
        reason,
        policy_ref: 'ai-agent-governance-phase4.service/escalateToHuman',
    }).catch(catchHandler(EC.EVENT_BUS, {}));
    await swallow(EC.EVENT_BUS, eventBus.publish({
        eventType: 'agent.escalated_to_human', tenantId, sourceService: 'ai-agent-governance', severity: 'warning',
        payload: { session_id: sessionId, reason },
    }), { tenantId, operation: 'eventBus:agent.escalated_to_human' });
}
//# sourceMappingURL=ai-agent-governance-phase4.service.js.map