import { safeQuery, tenantSchema } from '../../ports/database.port';
import { logger } from '../../ports/logger.port';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import { SYSTEM_JOB_ACTOR } from '../../ports/platform.port';
export async function resolveRoute(tenantId, entityType, context) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT * FROM "${schema}".task_route_rule
       WHERE tenant_id = $1 AND enabled = TRUE
         AND (entity_type IS NULL OR entity_type = $2)
       ORDER BY priority ASC
       LIMIT 10`, [tenantId, entityType]);
        for (const rule of result.rows) {
            if (evaluateCondition(rule.condition_json, context)) {
                return { agentId: rule.target_agent_id, role: rule.target_role, rule };
            }
        }
    }
    catch (err) {
        logger.warn('[AITaskRouting] Failed to resolve route rule', {
            tenantId,
            entityType,
            error: toErrorMessage(err)
        });
    }
    return { agentId: null, role: null, rule: null };
}
function evaluateCondition(condition, context) {
    if (!condition || Object.keys(condition).length === 0)
        return true;
    for (const [key, expected] of Object.entries(condition)) {
        const actual = context[key];
        if (typeof expected === 'object' && expected !== null) {
            const op = expected;
            if (op.$gte !== undefined && (actual === undefined || actual < op.$gte))
                return false;
            if (op.$lte !== undefined && (actual === undefined || actual > op.$lte))
                return false;
            if (op.$eq !== undefined && actual !== op.$eq)
                return false;
            if (op.$in !== undefined && !op.$in.includes(actual))
                return false;
        }
        else if (actual !== expected) {
            return false;
        }
    }
    return true;
}
export async function listRouteRules(tenantId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT * FROM "${schema}".task_route_rule WHERE tenant_id = $1 ORDER BY priority ASC`, [tenantId]);
    return result.rows;
}
export async function createRouteRule(tenantId, input) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`INSERT INTO "${schema}".task_route_rule
       (tenant_id, rule_name, entity_type, condition_json, target_agent_id, target_role, priority, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`, [tenantId, input.ruleName, input.entityType || null, JSON.stringify(input.conditionJson || {}), input.targetAgentId || null, input.targetRole || null, input.priority || 100, input.createdBy || SYSTEM_JOB_ACTOR]);
    return getFirstRow(result) || null;
}
export async function deleteRouteRule(tenantId, ruleId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`DELETE FROM "${schema}".task_route_rule WHERE rule_id = $1 AND tenant_id = $2 RETURNING rule_id`, [ruleId, tenantId]);
    return (result.rows?.length || 0) > 0;
}
export async function toggleRouteRule(tenantId, ruleId, enabled) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`UPDATE "${schema}".task_route_rule SET enabled = $3 WHERE rule_id = $1 AND tenant_id = $2 RETURNING rule_id`, [ruleId, tenantId, enabled]);
    return (result.rows?.length || 0) > 0;
}
export async function resolveRouteWithFallback(tenantId, entityType, context, fallbackAgentId = 'A01') {
    const primary = await resolveRoute(tenantId, entityType, context);
    if (primary.agentId || primary.role)
        return { ...primary, usedFallback: false };
    return { agentId: fallbackAgentId, role: null, rule: null, usedFallback: true };
}
export async function updateRouteRule(tenantId, ruleId, updates) {
    const schema = tenantSchema(tenantId);
    const setClauses = [];
    const params = [];
    let idx = 1;
    if (updates.ruleName !== undefined) {
        setClauses.push(`rule_name = $${idx++}`);
        params.push(updates.ruleName);
    }
    if (updates.entityType !== undefined) {
        setClauses.push(`entity_type = $${idx++}`);
        params.push(updates.entityType);
    }
    if (updates.conditionJson !== undefined) {
        setClauses.push(`condition_json = $${idx++}`);
        params.push(JSON.stringify(updates.conditionJson));
    }
    if (updates.targetAgentId !== undefined) {
        setClauses.push(`target_agent_id = $${idx++}`);
        params.push(updates.targetAgentId);
    }
    if (updates.targetRole !== undefined) {
        setClauses.push(`target_role = $${idx++}`);
        params.push(updates.targetRole);
    }
    if (updates.priority !== undefined) {
        setClauses.push(`priority = $${idx++}`);
        params.push(updates.priority);
    }
    if (setClauses.length === 0)
        return null;
    params.push(ruleId, tenantId);
    const result = await safeQuery(`UPDATE "${schema}".task_route_rule SET ${setClauses.join(', ')} WHERE rule_id = $${idx++} AND tenant_id = $${idx} RETURNING *`, params);
    return getFirstRow(result) || null;
}
//# sourceMappingURL=ai-task-routing.service.js.map