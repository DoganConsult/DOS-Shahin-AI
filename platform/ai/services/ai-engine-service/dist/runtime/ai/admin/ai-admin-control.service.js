import { safeQuery, tenantSchema } from '../ports/database.port.js';
import { toErrorMessage } from '@dos/module-sdk';
import { swallowDefault, EC } from '@dos/platform-core/resilience/resilient-catch';
export async function getAgentRuntimeConfigs(tenantId) {
    const schema = tenantSchema(tenantId);
    const result = await swallowDefault(EC.FALLBACK_QUERY, { rows: [] }, safeQuery(`SELECT agent_id, enabled, max_concurrent_runs, token_budget_override, updated_at
       FROM "${schema}".agent_runtime_config
       ORDER BY agent_id`), { tenantId, operation: 'getAgentRuntimeConfigs' });
    return result.rows.map((r) => ({
        agentId: String(r.agent_id),
        enabled: r.enabled !== false,
        maxConcurrentRuns: Number(r.max_concurrent_runs) || 1,
        tokenBudgetOverride: r.token_budget_override != null ? Number(r.token_budget_override) : null,
        paused: false,
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
    }));
}
export async function setAgentEnabled(tenantId, agentId, enabled, _updatedBy) {
    const schema = tenantSchema(tenantId);
    try {
        const before = await safeQuery(`SELECT enabled FROM "${schema}".agent_runtime_config WHERE agent_id = $1`, [agentId]);
        const previousEnabled = before.rows[0]?.enabled !== false;
        await safeQuery(`UPDATE "${schema}".agent_runtime_config SET enabled = $1, updated_at = NOW() WHERE agent_id = $2`, [enabled, agentId]);
        return {
            success: true,
            agentId,
            previousState: { enabled: previousEnabled },
            newState: { enabled },
        };
    }
    catch (err) {
        return { success: false, agentId, reason: toErrorMessage(err) };
    }
}
export async function pauseStuckExecutions(tenantId, olderThanHours = 2) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`UPDATE "${schema}".agent_runs
       SET status = 'cancelled', updated_at = NOW()
       WHERE status = 'running'
         AND created_at < NOW() - INTERVAL '${olderThanHours} hours'
       RETURNING run_id`);
        const runIds = result.rows.map((r) => String(r.run_id));
        return { cancelled: runIds.length, runIds };
    }
    catch (_err) {
        return { cancelled: 0, runIds: [] };
    }
}
export async function getProviderPolicies(tenantId) {
    const schema = tenantSchema(tenantId);
    const result = await swallowDefault(EC.FALLBACK_QUERY, { rows: [] }, safeQuery(`SELECT policy_id, policy_name, primary_provider, fallback_provider,
              max_tokens_per_request, cost_cap_daily_usd, shadow_enabled, canary_enabled, enabled
       FROM "${schema}".ai_provider_policies
       ORDER BY policy_name`), { tenantId, operation: 'getProviderPolicies' });
    return result.rows.map((r) => ({
        policyId: String(r.policy_id),
        policyName: String(r.policy_name),
        primaryProvider: String(r.primary_provider || 'anthropic'),
        fallbackProvider: r.fallback_provider ? String(r.fallback_provider) : null,
        maxTokensPerRequest: Number(r.max_tokens_per_request) || 4096,
        costCapDailyUsd: r.cost_cap_daily_usd != null ? Number(r.cost_cap_daily_usd) : null,
        shadowEnabled: r.shadow_enabled === true,
        canaryEnabled: r.canary_enabled === true,
        enabled: r.enabled !== false,
    }));
}
export async function setTokenBudgetOverride(tenantId, agentId, tokenBudget, _updatedBy) {
    const schema = tenantSchema(tenantId);
    try {
        const before = await safeQuery(`SELECT token_budget_override FROM "${schema}".agent_runtime_config WHERE agent_id = $1`, [agentId]);
        const previous = before.rows[0]?.token_budget_override != null
            ? Number(before.rows[0].token_budget_override)
            : null;
        await safeQuery(`UPDATE "${schema}".agent_runtime_config
       SET token_budget_override = $1, updated_at = NOW()
       WHERE agent_id = $2`, [tokenBudget, agentId]);
        return {
            success: true,
            agentId,
            previousState: { tokenBudgetOverride: previous },
            newState: { tokenBudgetOverride: tokenBudget },
        };
    }
    catch (err) {
        return { success: false, agentId, reason: toErrorMessage(err) };
    }
}
export async function getAdminRunbook(_tenantId) {
    return {
        stuckRunProcedure: 'Use pauseStuckExecutions() to cancel runs older than 2h. Check agent_runs.error_message for root cause. Review circuit breaker state in agent_circuit_breaker.',
        circuitBreakerResetProcedure: 'Run UPDATE agent_circuit_breaker SET state=\'closed\', failure_count=0 WHERE agent_id=$1. Re-enable agent via setAgentEnabled(). Monitor error_rate for 15min.',
        quotaExceededProcedure: 'Check tenant_ai_config.monthly_token_budget. Increase budget or disable non-critical agents via setAgentEnabled(). Review cost attribution by agent in agent_runs.tokens_used.',
        approvalBottleneckProcedure: 'Query agent_approvals WHERE status=\'pending\' AND created_at < NOW() - INTERVAL \'24 hours\'. Escalate via DAuth delegation service. Contact approver chain owners.',
    };
}
//# sourceMappingURL=ai-admin-control.service.js.map