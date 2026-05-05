// @ts-nocheck
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { getFirstRow } from '@dos/db';
import { SYSTEM_JOB_ACTOR } from '../../ports/platform.port';
export async function evaluatePolicies(tenantId, context) {
    // ── Deterministic pre-check (Platform Rule Engine) ──────────────────────────
    // Evaluate configured rules synchronously before hitting the database.
    // If a rule matches with confidence >= 0.95, we short-circuit and return immediately.
    try {
        const { evaluateRules } = await import('../../../../platform/rules/deterministic-rule-engine');
        const ruleContext = {
            scope: context.scope,
            targetId: context.targetId,
            agentId: context.agentId,
            actionType: context.actionType,
            ...(context.metadata || {}),
        };
        const ruleResult = await evaluateRules(ruleContext);
        if (ruleResult.matched && ruleResult.confidence >= 0.95) {
            // Deterministic block — skip DB round-trip entirely
            if (ruleResult.primaryAction === 'block') {
                eventBus.publish({
                    eventType: 'ai.guard.blocked', tenantId,
                    sourceService: 'deterministic-rule-engine', severity: 'warning',
                    payload: { rules: ruleResult.matchedRules.map(r => r.id), agentId: context.agentId, actionType: context.actionType },
                });
                return { allowed: false, blockedBy: null, warnings: [] };
            }
        }
    }
    catch { /* Rule engine unavailable — fall through to DB policy check */ }
    const schema = tenantSchema(tenantId);
    const warnings = [];
    try {
        const result = await safeQuery(`SELECT * FROM "${schema}".ai_policy_rule
       WHERE tenant_id = $1 AND enabled = TRUE
         AND (target_scope = 'all' OR target_scope = $2)
         AND (target_id IS NULL OR target_id = $3)
       ORDER BY severity DESC`, [tenantId, context.scope, context.targetId || '']);
        for (const rule of result.rows) {
            if (!matchesCondition(rule.condition_json, context))
                continue;
            if (rule.action_on_match === 'block') {
                eventBus.publish({
                    eventType: 'ai.guard.blocked', tenantId,
                    sourceService: 'ai-policy-rule', severity: 'warning',
                    payload: { ruleId: rule.rule_id, ruleName: rule.rule_name, agentId: context.agentId, actionType: context.actionType },
                });
                return { allowed: false, blockedBy: rule, warnings };
            }
            if (rule.action_on_match === 'warn') {
                warnings.push(rule);
            }
            if (rule.action_on_match === 'require_approval') {
                return { allowed: false, blockedBy: rule, warnings };
            }
        }
    }
    catch { }
    return { allowed: true, blockedBy: null, warnings };
}
function matchesCondition(condition, context) {
    if (!condition || Object.keys(condition).length === 0)
        return true;
    for (const [key, expected] of Object.entries(condition)) {
        const actual = context[key] ?? context.metadata?.[key];
        if (actual !== expected)
            return false;
    }
    return true;
}
export async function listPolicyRules(tenantId, ruleType) {
    const schema = tenantSchema(tenantId);
    const conditions = ['tenant_id = $1'];
    const params = [tenantId];
    if (ruleType) {
        conditions.push('rule_type = $2');
        params.push(ruleType);
    }
    const result = await safeQuery(`SELECT * FROM "${schema}".ai_policy_rule WHERE ${conditions.join(' AND ')} ORDER BY severity DESC, rule_name`, params);
    return result.rows;
}
export async function createPolicyRule(tenantId, input) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`INSERT INTO "${schema}".ai_policy_rule
       (tenant_id, rule_name, rule_type, target_scope, target_id, condition_json, action_on_match, severity, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`, [tenantId, input.ruleName, input.ruleType, input.targetScope || 'all', input.targetId || null, JSON.stringify(input.conditionJson || {}), input.actionOnMatch || 'block', input.severity || 'medium', input.createdBy || SYSTEM_JOB_ACTOR]);
    return getFirstRow(result) || null;
}
export async function deletePolicyRule(tenantId, ruleId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`DELETE FROM "${schema}".ai_policy_rule WHERE rule_id = $1 AND tenant_id = $2 RETURNING rule_id`, [ruleId, tenantId]);
    return (result.rows?.length || 0) > 0;
}
export async function togglePolicyRule(tenantId, ruleId, enabled) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`UPDATE "${schema}".ai_policy_rule SET enabled = $3, updated_at = NOW() WHERE rule_id = $1 AND tenant_id = $2 RETURNING rule_id`, [ruleId, tenantId, enabled]);
    return (result.rows?.length || 0) > 0;
}
export async function updatePolicyRule(tenantId, ruleId, updates) {
    const schema = tenantSchema(tenantId);
    const setClauses = [];
    const params = [];
    let idx = 1;
    if (updates.ruleName !== undefined) {
        setClauses.push(`rule_name = $${idx++}`);
        params.push(updates.ruleName);
    }
    if (updates.ruleType !== undefined) {
        setClauses.push(`rule_type = $${idx++}`);
        params.push(updates.ruleType);
    }
    if (updates.targetScope !== undefined) {
        setClauses.push(`target_scope = $${idx++}`);
        params.push(updates.targetScope);
    }
    if (updates.targetId !== undefined) {
        setClauses.push(`target_id = $${idx++}`);
        params.push(updates.targetId);
    }
    if (updates.conditionJson !== undefined) {
        setClauses.push(`condition_json = $${idx++}`);
        params.push(JSON.stringify(updates.conditionJson));
    }
    if (updates.actionOnMatch !== undefined) {
        setClauses.push(`action_on_match = $${idx++}`);
        params.push(updates.actionOnMatch);
    }
    if (updates.severity !== undefined) {
        setClauses.push(`severity = $${idx++}`);
        params.push(updates.severity);
    }
    if (setClauses.length === 0)
        return null;
    setClauses.push('updated_at = NOW()');
    params.push(ruleId, tenantId);
    const result = await safeQuery(`UPDATE "${schema}".ai_policy_rule SET ${setClauses.join(', ')} WHERE rule_id = $${idx++} AND tenant_id = $${idx} RETURNING *`, params);
    return getFirstRow(result) || null;
}
const _rateLimitCounters = new Map();
function enforceThrottle(ruleId, windowMs, maxCount) {
    const key = ruleId;
    const now = Date.now();
    const counter = _rateLimitCounters.get(key);
    if (!counter || now - counter.windowStart > windowMs) {
        _rateLimitCounters.set(key, { count: 1, windowStart: now });
        return true;
    }
    counter.count++;
    return counter.count <= maxCount;
}
export function evaluateRateLimitPolicy(rule, _context) {
    const windowMs = rule.condition_json?.windowMs ?? 60000;
    const maxCount = rule.condition_json?.maxCount ?? 10;
    const allowed = enforceThrottle(`${rule.tenant_id}:${rule.rule_id}`, windowMs, maxCount);
    return { allowed, reason: allowed ? 'OK' : `Rate limit exceeded: ${maxCount} per ${windowMs}ms window` };
}
export async function detectPolicyConflicts(tenantId) {
    const rules = await listPolicyRules(tenantId);
    const conflicts = [];
    for (let i = 0; i < rules.length; i++) {
        for (let j = i + 1; j < rules.length; j++) {
            const a = rules[i], b = rules[j];
            if (a.target_scope === b.target_scope && a.target_id === b.target_id && a.enabled && b.enabled) {
                if ((a.action_on_match === 'block' && b.action_on_match === 'log') || (a.action_on_match === 'log' && b.action_on_match === 'block')) {
                    conflicts.push({ ruleA: a.rule_name, ruleB: b.rule_name, conflict: 'Conflicting actions (block vs log) on same scope' });
                }
                if (a.rule_type === b.rule_type && a.action_on_match === b.action_on_match) {
                    conflicts.push({ ruleA: a.rule_name, ruleB: b.rule_name, conflict: 'Duplicate rule type and action on same scope' });
                }
            }
        }
    }
    return conflicts;
}
export async function getBlockedActionLog(tenantId, hours = 24) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT signal_code, signal_value, context_json, recorded_at
       FROM "${schema}".cockpit_signal
       WHERE tenant_id = $1 AND signal_code LIKE 'guard.blocked%' AND recorded_at > NOW() - ($2 || ' hours')::interval
       ORDER BY recorded_at DESC LIMIT 200`, [tenantId, hours]);
        return result.rows;
    }
    catch {
        return [];
    }
}
export async function getPolicyEvalStats(tenantId) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE enabled = TRUE)::int AS enabled_count,
         COUNT(*) FILTER (WHERE action_on_match = 'block')::int AS block_count,
         COUNT(*) FILTER (WHERE action_on_match = 'warn')::int AS warn_count
       FROM "${schema}".ai_policy_rule WHERE tenant_id = $1`, [tenantId]);
        const r = getFirstRow(result);
        return { totalRules: r?.total || 0, enabledRules: r?.enabled_count || 0, blockRules: r?.block_count || 0, warnRules: r?.warn_count || 0 };
    }
    catch {
        return { totalRules: 0, enabledRules: 0, blockRules: 0, warnRules: 0 };
    }
}
//# sourceMappingURL=ai-policy-rule.service.js.map