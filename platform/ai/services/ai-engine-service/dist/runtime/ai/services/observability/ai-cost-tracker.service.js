import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';
// ============================================
// AGRC-OS — AI Cost Tracker Service
// Tracks token usage and costs per tenant, agent,
// and operation. Integrates with the existing
// llm_usage_log and tenant_llm_budgets tables.
// Requirements: ai-os-8.2
// ============================================
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
/** Record a single LLM usage event with cost. */
export async function recordUsage(tenantId, agentId, inputTokens, outputTokens, model, costUsd) {
    const schema = tenantSchema(tenantId);
    const totalTokens = inputTokens + outputTokens;
    try {
        await safeQuery(`INSERT INTO "${schema}".llm_usage_log
         (tenant_id, agent_id, model, input_tokens, output_tokens, total_tokens,
          cost_usd, provider, latency_ms, cache_hit, endpoint_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'tracked',0,false,'cost-tracker')`, [tenantId, agentId, model, inputTokens, outputTokens, totalTokens, costUsd]);
        // Increment monthly budget counters
        await safeQuery(`UPDATE "${schema}".tenant_llm_budgets
       SET tokens_used_month = tokens_used_month + $1,
           cost_used_month   = cost_used_month + $2,
           updated_at = NOW()
       WHERE tenant_id = $3`, [totalTokens, costUsd, tenantId]).catch(catchHandler(EC.EVENT_BUS, {}));
    }
    catch { /* non-fatal — never block the caller */ }
}
/** Get aggregated usage for a tenant over the last N days. */
export async function getTenantUsage(tenantId, daysBack = 30) {
    const schema = tenantSchema(tenantId);
    try {
        const r = await safeQuery(`SELECT COUNT(*)::int AS calls,
              COALESCE(SUM(input_tokens),0)::int AS inp,
              COALESCE(SUM(output_tokens),0)::int AS out,
              COALESCE(SUM(cost_usd),0)::real AS cost
       FROM "${schema}".llm_usage_log
       WHERE tenant_id = $1 AND created_at > NOW() - make_interval(days => $2)`, [tenantId, daysBack]);
        const row = getFirstRow(r) || {};
        const calls = row.calls || 0;
        return {
            totalCalls: calls,
            totalInputTokens: row.inp || 0,
            totalOutputTokens: row.out || 0,
            totalCostUsd: Math.round((row.cost || 0) * 10000) / 10000,
            avgCostPerCall: calls > 0 ? Math.round(((row.cost || 0) / calls) * 10000) / 10000 : 0,
        };
    }
    catch {
        return { totalCalls: 0, totalInputTokens: 0, totalOutputTokens: 0, totalCostUsd: 0, avgCostPerCall: 0 };
    }
}
/** Get aggregated usage for a specific agent across all tenants (last N days). */
export async function getAgentUsage(agentId, daysBack = 30) {
    try {
        const schemas = await safeQuery(`SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'`);
        let totalCalls = 0, totalInp = 0, totalOut = 0, totalCost = 0;
        for (const { schema_name } of schemas.rows) {
            try {
                const r = await safeQuery(`SELECT COUNT(*)::int AS calls,
                  COALESCE(SUM(input_tokens),0)::int AS inp,
                  COALESCE(SUM(output_tokens),0)::int AS out,
                  COALESCE(SUM(cost_usd),0)::real AS cost
           FROM "${schema_name}".llm_usage_log
           WHERE agent_id = $1 AND created_at > NOW() - make_interval(days => $2)`, [agentId, daysBack]);
                const row = getFirstRow(r) || {};
                totalCalls += row.calls || 0;
                totalInp += row.inp || 0;
                totalOut += row.out || 0;
                totalCost += row.cost || 0;
            }
            catch { /* schema may lack table */ }
        }
        return {
            totalCalls,
            totalInputTokens: totalInp,
            totalOutputTokens: totalOut,
            totalCostUsd: Math.round(totalCost * 10000) / 10000,
            avgCostPerCall: totalCalls > 0 ? Math.round((totalCost / totalCalls) * 10000) / 10000 : 0,
        };
    }
    catch {
        return { totalCalls: 0, totalInputTokens: 0, totalOutputTokens: 0, totalCostUsd: 0, avgCostPerCall: 0 };
    }
}
/** Check remaining budget for a tenant. */
export async function checkBudget(tenantId) {
    const schema = tenantSchema(tenantId);
    try {
        const r = await safeQuery(`SELECT monthly_token_limit, monthly_cost_limit, tokens_used_month, cost_used_month
       FROM "${schema}".tenant_llm_budgets WHERE tenant_id = $1`, [tenantId]);
        if (r.rows.length === 0) {
            return { allowed: true, remainingTokens: Infinity, remainingCostUsd: Infinity, usagePct: 0 };
        }
        const b = getFirstRow(r);
        const remainingTokens = Math.max(0, (b.monthly_token_limit || 0) - (b.tokens_used_month || 0));
        const remainingCost = Math.max(0, (b.monthly_cost_limit || 0) - (b.cost_used_month || 0));
        const usagePct = b.monthly_cost_limit > 0
            ? Math.round(((b.cost_used_month || 0) / b.monthly_cost_limit) * 1000) / 10
            : 0;
        const allowed = remainingTokens > 0 && remainingCost > 0;
        return { allowed, remainingTokens, remainingCostUsd: Math.round(remainingCost * 100) / 100, usagePct };
    }
    catch {
        return { allowed: true, remainingTokens: Infinity, remainingCostUsd: Infinity, usagePct: 0 };
    }
}
//# sourceMappingURL=ai-cost-tracker.service.js.map